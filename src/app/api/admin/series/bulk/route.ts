import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

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
