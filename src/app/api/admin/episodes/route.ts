import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const seriesId = searchParams.get('series_id');

    if (seriesId) {
      const { data: seasons, error: seasonsError } = await adminSupabase
        .from('seasons')
        .select('id')
        .eq('series_id', seriesId);

      if (seasonsError) throw seasonsError;

      if (!seasons || seasons.length === 0) {
        return NextResponse.json({ episodes: [] });
      }

      const seasonIds = seasons.map((s: any) => s.id);
      const { data: episodes, error: episodesError } = await adminSupabase
        .from('episodes')
        .select('id, episode_number, title, duration_seconds, thumbnail_key, thumbnail_options')
        .in('season_id', seasonIds)
        .order('episode_number', { ascending: true });

      if (episodesError) throw episodesError;
      return NextResponse.json({ episodes });
    }

    let query = adminSupabase.from('episodes').select('*, seasons(title, series(title))');
    
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }
    
    const { data, error } = await query.order('episode_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ episodes: data });
  } catch (err: any) {
    console.error('Error fetching admin episodes:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

async function syncSeriesAverageRuntime(seasonId: string | null | undefined, supabase: any) {
  if (!seasonId) return;
  try {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('series_id')
      .eq('id', seasonId)
      .single();

    if (!seasonData || !seasonData.series_id) return;
    const seriesId = seasonData.series_id;

    const { data: seasons } = await supabase
      .from('seasons')
      .select('id')
      .eq('series_id', seriesId);

    if (!seasons || seasons.length === 0) return;
    const seasonIds = seasons.map((s: any) => s.id);

    const { data: eps } = await supabase
      .from('episodes')
      .select('duration_seconds')
      .in('season_id', seasonIds);

    if (eps && eps.length > 0) {
      const validEps = eps.filter((e: any) => e.duration_seconds && e.duration_seconds > 0);
      if (validEps.length > 0) {
        const totalSecs = validEps.reduce((sum: number, e: any) => sum + e.duration_seconds, 0);
        const avgMinutes = Math.ceil(totalSecs / validEps.length / 60);
        await supabase
          .from('series')
          .update({ runtime: avgMinutes })
          .eq('id', seriesId);
      }
    }
  } catch (syncErr) {
    console.error('Failed to auto-sync series average runtime:', syncErr);
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    if (!payload.season_id || payload.episode_number === undefined || !payload.title || !payload.video_key) {
      return NextResponse.json({ error: 'Missing required episode fields (season_id, episode_number, title, video_key)' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('episodes')
      .insert({
        season_id: payload.season_id,
        episode_number: payload.episode_number,
        title: payload.title,
        description: payload.description || '',
        video_key: payload.video_key,
        thumbnail_key: payload.thumbnail_key || '',
        thumbnail_options: payload.thumbnail_options || [],
        duration_seconds: payload.duration_seconds || 0,
        release_date: payload.release_date || new Date().toISOString(),
        is_published: payload.is_published ?? false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-sync series average runtime (rounded up to nearest minute)
    await syncSeriesAverageRuntime(payload.season_id, adminSupabase);

    return NextResponse.json({ success: true, episode: data });
  } catch (err: any) {
    console.error('Error creating episode:', err);
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
      return NextResponse.json({ error: 'Missing episode ID' }, { status: 400 });
    }

    const updateObj: Record<string, any> = {};
    if (payload.season_id !== undefined) updateObj.season_id = payload.season_id;
    if (payload.episode_number !== undefined) updateObj.episode_number = payload.episode_number;
    if (payload.title !== undefined) updateObj.title = payload.title;
    if (payload.description !== undefined) updateObj.description = payload.description;
    if (payload.video_key !== undefined) updateObj.video_key = payload.video_key;
    if (payload.thumbnail_key !== undefined) updateObj.thumbnail_key = payload.thumbnail_key;
    if (payload.thumbnail_options !== undefined) updateObj.thumbnail_options = payload.thumbnail_options;
    if (payload.duration_seconds !== undefined) updateObj.duration_seconds = payload.duration_seconds;
    if (payload.release_date !== undefined) updateObj.release_date = payload.release_date;
    if (payload.is_published !== undefined) updateObj.is_published = payload.is_published;

    const { data, error } = await adminSupabase
      .from('episodes')
      .update(updateObj)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;

    // Auto-sync series average runtime (rounded up to nearest minute)
    const targetSeasonId = payload.season_id || data?.season_id;
    if (targetSeasonId) {
      await syncSeriesAverageRuntime(targetSeasonId, adminSupabase);
    }

    return NextResponse.json({ success: true, episode: data });
  } catch (err: any) {
    console.error('Error updating episode:', err);
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
      return NextResponse.json({ error: 'Missing episode ID' }, { status: 400 });
    }

    // Get season_id first so we can sync runtime after deletion
    const { data: epData } = await adminSupabase
      .from('episodes')
      .select('season_id')
      .eq('id', id)
      .single();

    // 1. Delete user logs / relations referencing this episode
    await adminSupabase.from('watch_history').delete().eq('episode_id', id);
    await adminSupabase.from('episode_views').delete().eq('episode_id', id);
    await adminSupabase.from('comments').delete().eq('episode_id', id);

    // 2. Finally, delete the episode record itself
    const { error } = await adminSupabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Auto-sync series average runtime after deletion
    if (epData?.season_id) {
      await syncSeriesAverageRuntime(epData.season_id, adminSupabase);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting episode:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
