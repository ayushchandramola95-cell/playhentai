import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series_id');

    let query = adminSupabase.from('seasons').select('*, series(id, title, slug, poster_image_key, cover_image_key, is_published), episodes(id)');
    
    if (seriesId) {
      query = query.eq('series_id', seriesId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    const mapped = (data || []).map((s: any) => ({
      ...s,
      episode_count: Array.isArray(s.episodes) ? s.episodes.length : 0
    }));

    return NextResponse.json({ seasons: mapped });
  } catch (err: any) {
    console.error('Error fetching admin seasons:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    if (!payload.series_id || payload.season_number === undefined) {
      return NextResponse.json({ error: 'Missing series_id or season_number' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('seasons')
      .insert({
        series_id: payload.series_id,
        season_number: payload.season_number,
        title: payload.title || `Season ${payload.season_number}`,
        is_published: payload.is_published ?? false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, season: data });
  } catch (err: any) {
    console.error('Error creating season:', err);
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
      return NextResponse.json({ error: 'Missing season ID' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (payload.series_id !== undefined) updateData.series_id = payload.series_id;
    if (payload.season_number !== undefined) updateData.season_number = payload.season_number;
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.is_published !== undefined) updateData.is_published = payload.is_published;

    const { data, error } = await adminSupabase
      .from('seasons')
      .update(updateData)
      .eq('id', payload.id)
      .select('*, series(id, title, slug, poster_image_key, cover_image_key, is_published), episodes(id)')
      .single();

    if (error) throw error;
    
    const mapped = {
      ...data,
      episode_count: Array.isArray(data?.episodes) ? data.episodes.length : 0
    };

    return NextResponse.json({ success: true, season: mapped });
  } catch (err: any) {
    console.error('Error updating season:', err);
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
      return NextResponse.json({ error: 'Missing season ID' }, { status: 400 });
    }

    // 1. Get all episodes of this season
    const { data: episodes } = await adminSupabase
      .from('episodes')
      .select('id')
      .eq('season_id', id);

    const episodeIds = (episodes || []).map(e => e.id);

    if (episodeIds.length > 0) {
      // 2. Delete user logs / relations referencing these episodes
      await adminSupabase.from('watch_history').delete().in('episode_id', episodeIds);
      await adminSupabase.from('episode_views').delete().in('episode_id', episodeIds);
      await adminSupabase.from('comments').delete().in('episode_id', episodeIds);
      
      // 3. Delete episodes themselves
      await adminSupabase.from('episodes').delete().in('id', episodeIds);
    }

    // 4. Finally, delete the season record itself
    const { error } = await adminSupabase
      .from('seasons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting season:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
