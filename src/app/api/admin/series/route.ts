import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    
    const { data, error } = await adminSupabase
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ series: data });
  } catch (err: any) {
    console.error('Error fetching admin series:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    const { data, error } = await adminSupabase
      .from('series')
      .insert({
        title: payload.title,
        slug: payload.slug,
        description: payload.description,
        poster_image_key: payload.poster_image_key,
        cover_image_key: payload.cover_image_key,
        banner_image_key: payload.banner_image_key,
        tags: payload.tags || [],
        studio: payload.studio,
        release_year: payload.release_year,
        is_published: payload.is_published ?? false,
        created_at: new Date().toISOString(),
        alt_title_japanese: payload.alt_title_japanese || null,
        alt_title_romaji: payload.alt_title_romaji || null,
        alt_title_english: payload.alt_title_english || null,
        original_language: payload.original_language || 'Japanese',
        status: payload.status || 'ongoing',
        episode_count_override: payload.episode_count_override !== undefined ? payload.episode_count_override : null,
        runtime: payload.runtime !== undefined ? payload.runtime : 24,
        age_rating: payload.age_rating || '18+',
        content_rating: payload.content_rating || 'explicit',
        country: payload.country || 'Japan',
        aliases: payload.aliases || [],
        featured_type: payload.featured_type || 'none',
        meta_title: payload.meta_title || null,
        meta_description: payload.meta_description || null,
        first_air_date: payload.first_air_date || null,
        last_air_date: payload.last_air_date || null,
        image_library: payload.image_library || [],
        poster_position: payload.poster_position || '50% 50%',
        cover_position: payload.cover_position || '50% 50%',
        banner_position: payload.banner_position || '50% 50%',
        original_source: payload.original_source || null,
        content_warnings: payload.content_warnings || [],
        about_text: payload.about_text || null,
        about_data: payload.about_data || null,
        faq_override: payload.faq_override || []
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically create Season 1 for this new series
    try {
      await adminSupabase.from('seasons').insert({
        series_id: data.id,
        season_number: 1,
        title: 'Season 1',
        is_published: true,
        created_at: new Date().toISOString()
      });
    } catch (seasonErr) {
      console.error('Failed to auto-create Season 1 for series:', seasonErr);
    }

    await syncTagsToCategories(payload.tags || [], adminSupabase);
    await syncStudioToDatabase(payload.studio, adminSupabase);
    return NextResponse.json({ success: true, series: data });
  } catch (err: any) {
    console.error('Error creating series:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    if (!payload.id) {
      return NextResponse.json({ error: 'Missing series ID' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('series')
      .update({
        title: payload.title,
        slug: payload.slug,
        description: payload.description,
        poster_image_key: payload.poster_image_key,
        cover_image_key: payload.cover_image_key,
        banner_image_key: payload.banner_image_key,
        tags: payload.tags,
        studio: payload.studio,
        release_year: payload.release_year,
        is_published: payload.is_published,
        alt_title_japanese: payload.alt_title_japanese,
        alt_title_romaji: payload.alt_title_romaji,
        alt_title_english: payload.alt_title_english,
        original_language: payload.original_language,
        status: payload.status,
        episode_count_override: payload.episode_count_override,
        runtime: payload.runtime,
        age_rating: payload.age_rating,
        content_rating: payload.content_rating,
        country: payload.country,
        aliases: payload.aliases,
        featured_type: payload.featured_type,
        meta_title: payload.meta_title,
        meta_description: payload.meta_description,
        first_air_date: payload.first_air_date,
        last_air_date: payload.last_air_date,
        image_library: payload.image_library,
        poster_position: payload.poster_position,
        cover_position: payload.cover_position,
        banner_position: payload.banner_position,
        original_source: payload.original_source,
        content_warnings: payload.content_warnings,
        about_text: payload.about_text,
        about_data: payload.about_data,
        faq_override: payload.faq_override
      })
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;
    await syncTagsToCategories(payload.tags || [], adminSupabase);
    await syncStudioToDatabase(payload.studio, adminSupabase);
    return NextResponse.json({ success: true, series: data });
  } catch (err: any) {
    console.error('Error updating series:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing series ID' }, { status: 400 });
    }

    // 1. Get all seasons of this series
    const { data: seasons } = await adminSupabase
      .from('seasons')
      .select('id')
      .eq('series_id', id);

    const seasonIds = (seasons || []).map(s => s.id);

    if (seasonIds.length > 0) {
      // 2. Get all episodes of these seasons
      const { data: episodes } = await adminSupabase
        .from('episodes')
        .select('id')
        .in('season_id', seasonIds);

      const episodeIds = (episodes || []).map(e => e.id);

      if (episodeIds.length > 0) {
        // 3. Delete user logs / relations referencing these episodes
        await adminSupabase.from('watch_history').delete().in('episode_id', episodeIds);
        await adminSupabase.from('episode_views').delete().in('episode_id', episodeIds);
        await adminSupabase.from('comments').delete().in('episode_id', episodeIds);
        
        // 4. Delete episodes themselves
        await adminSupabase.from('episodes').delete().in('id', episodeIds);
      }

      // 5. Delete seasons themselves
      await adminSupabase.from('seasons').delete().in('id', seasonIds);
    }

    // 6. Delete associative categories relations
    await adminSupabase.from('series_categories').delete().eq('series_id', id);

    // 7. Delete watchlist associations
    await adminSupabase.from('watchlist').delete().eq('series_id', id);

    // 8. Finally, delete the series record itself
    const { error } = await adminSupabase
      .from('series')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting series:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

async function syncTagsToCategories(tags: string[], adminSupabase: any) {
  if (!tags || tags.length === 0) return;
  try {
    const { data: existingCats } = await adminSupabase
      .from('categories')
      .select('name');

    const existingNamesLower = new Set(
      (existingCats || []).map((c: any) => c.name.toLowerCase().trim())
    );

    const toInsert = [];
    for (const tag of tags) {
      const cleanTag = tag.trim();
      const lowerTag = cleanTag.toLowerCase();
      if (lowerTag === 'featured' || lowerTag.startsWith('featured:')) {
        continue;
      }
      if (!existingNamesLower.has(lowerTag)) {
        toInsert.push({
          name: cleanTag,
          slug: lowerTag.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          created_at: new Date().toISOString()
        });
        existingNamesLower.add(lowerTag);
      }
    }

    if (toInsert.length > 0) {
      await adminSupabase.from('categories').insert(toInsert);
    }
  } catch (err) {
    console.error('Failed to sync tags to categories:', err);
  }
}

async function syncStudioToDatabase(studioField: string | undefined | null, adminSupabase: any) {
  if (!studioField) return;
  try {
    const studios = studioField
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (studios.length === 0) return;

    const { data: existingStudios } = await adminSupabase
      .from('studios')
      .select('name');

    const existingNamesLower = new Set(
      (existingStudios || []).map((s: any) => s.name.toLowerCase().trim())
    );

    const toInsert = [];
    for (const name of studios) {
      const lowerName = name.toLowerCase();
      if (!existingNamesLower.has(lowerName)) {
        toInsert.push({
          name: name,
          slug: lowerName.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          created_at: new Date().toISOString()
        });
        existingNamesLower.add(lowerName);
      }
    }

    if (toInsert.length > 0) {
      await adminSupabase.from('studios').insert(toInsert);
    }
  } catch (err) {
    console.error('Failed to sync studios to database:', err);
  }
}
