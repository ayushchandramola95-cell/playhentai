import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import { revalidateAllCatalogTags } from '@/utils/revalidateCatalog';
import { syncLocalCatalogWithSupabase } from '@/utils/localCatalogStore';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-series';
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'No series items provided' }, { status: 400 });
    }

    // Fetch existing slugs to avoid collisions
    const { data: existingSlugsData } = await adminSupabase
      .from('series')
      .select('slug');
    const existingSlugs = new Set((existingSlugsData || []).map((s: any) => s.slug));

    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rawTitle = (item.title || '').trim();
      if (!rawTitle) continue;

      let baseSlug = item.slug ? generateSlug(item.slug) : generateSlug(rawTitle);
      let candidateSlug = baseSlug;
      let counter = 1;
      while (existingSlugs.has(candidateSlug)) {
        candidateSlug = `${baseSlug}-${counter++}`;
      }
      existingSlugs.add(candidateSlug);

      const releaseYear = item.release_year ? parseInt(item.release_year, 10) || null : null;
      const studio = (item.studio || '').trim() || null;
      const tags = Array.isArray(item.tags) ? item.tags : [];

      try {
        const { data: createdSeries, error: seriesError } = await adminSupabase
          .from('series')
          .insert({
            title: rawTitle,
            slug: candidateSlug,
            description: item.description || `Watch ${rawTitle} anime series online in HD with English subtitles.`,
            poster_image_key: item.poster_image_key || null,
            cover_image_key: item.cover_image_key || null,
            banner_image_key: item.banner_image_key || null,
            tags: tags,
            studio: studio,
            release_year: releaseYear,
            is_published: false, // Default to DRAFT (hidden)
            created_at: new Date().toISOString(),
            status: 'ongoing',
            original_language: 'Japanese',
            runtime: 24,
            age_rating: '18+',
            content_rating: 'explicit',
            country: 'Japan',
          })
          .select()
          .single();

        if (seriesError) {
          errors.push({ title: rawTitle, error: seriesError.message });
          continue;
        }

        // Automatically create Season 1 for this series so episodes can be uploaded immediately
        await adminSupabase.from('seasons').insert({
          series_id: createdSeries.id,
          season_number: 1,
          title: 'Season 1',
          is_published: true,
          created_at: new Date().toISOString()
        });

        results.push(createdSeries);
      } catch (err: any) {
        errors.push({ title: rawTitle, error: err.message });
      }
    }

    if (results.length > 0) {
      syncLocalCatalogWithSupabase().catch((err) => console.error('Error syncing local catalog after bulk insert:', err));
      revalidateAllCatalogTags();
    }

    return NextResponse.json({
      success: true,
      createdCount: results.length,
      created: results,
      errors
    });
  } catch (err: any) {
    console.error('Error in bulk series creation:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No series updates provided' }, { status: 400 });
    }

    const updatedResults: any[] = [];
    const errors: any[] = [];

    // Whitelist allowed fields to prevent arbitrary injection
    const allowedFields = [
      'title', 'slug', 'description', 'studio', 'release_year', 'status',
      'is_published', 'tags', 'content_rating', 'age_rating', 'runtime',
      'first_air_date', 'last_air_date', 'original_language', 'original_source',
      'country', 'episode_count_override', 'meta_title', 'meta_description',
      'poster_image_key', 'cover_image_key', 'banner_image_key',
      'alt_title_japanese', 'alt_title_romaji', 'alt_title_english',
      'aliases', 'content_warnings', 'featured_type', 'about_text', 'about_data'
    ];

    for (const item of updates) {
      const seriesId = item.id;
      if (!seriesId) continue;
      const changes = item.changes || {};

      const sanitizedChanges: Record<string, any> = {};
      for (const key of Object.keys(changes)) {
        if (allowedFields.includes(key)) {
          sanitizedChanges[key] = changes[key];
        }
      }

      // Handle about sections if provided as individual fields
      if (changes.about_overview || changes.about_production || changes.about_themes || changes.about_recommended) {
        const overview = changes.about_overview || '';
        const production = changes.about_production || '';
        const themes = changes.about_themes || '';
        const recommended = changes.about_recommended || '';
        sanitizedChanges.about_data = {
          overview,
          production,
          themes,
          recommended
        };
        sanitizedChanges.about_text = [
          overview.trim() ? `## Overview\n${overview.trim()}` : '',
          production.trim() ? `## Production & Presentation\n${production.trim()}` : '',
          themes.trim() ? `## Themes & Style\n${themes.trim()}` : '',
          recommended.trim() ? `## Recommended For\n${recommended.trim()}` : ''
        ].filter(Boolean).join('\n\n') || null;
      }

      if (Object.keys(sanitizedChanges).length === 0) continue;

      sanitizedChanges.updated_at = new Date().toISOString();

      const { data, error } = await adminSupabase
        .from('series')
        .update(sanitizedChanges)
        .eq('id', seriesId)
        .select('id, title, slug')
        .single();

      if (error) {
        errors.push({ id: seriesId, error: error.message });
      } else {
        updatedResults.push(data);
      }
    }

    if (updatedResults.length > 0) {
      syncLocalCatalogWithSupabase().catch((err) => console.error('Error syncing local catalog after bulk update:', err));
      revalidateAllCatalogTags();
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedResults.length,
      updated: updatedResults,
      errors
    });
  } catch (err: any) {
    console.error('Error in bulk series edit:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

