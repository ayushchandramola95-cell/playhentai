import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    // 1. Query total real episode views from DB
    const { count: realViewsCount } = await adminSupabase
      .from('episode_views')
      .select('*', { count: 'exact', head: true });

    // 2. Query all views mapped to episodes and series
    const { data: viewLogs } = await adminSupabase
      .from('episode_views')
      .select('episode_id, episodes(season_id, seasons(series_id))');

    // Build real view frequency maps
    const episodeViewCounts: Record<string, number> = {};
    const seriesViewCounts: Record<string, number> = {};
    
    (viewLogs || []).forEach((log: any) => {
      if (log.episode_id) {
        episodeViewCounts[log.episode_id] = (episodeViewCounts[log.episode_id] || 0) + 1;
      }
      
      const seriesId = log.episodes?.seasons?.series_id;
      if (seriesId) {
        seriesViewCounts[seriesId] = (seriesViewCounts[seriesId] || 0) + 1;
      }
    });

    // 3. Query series list from DB
    const { data: dbSeries } = await adminSupabase
      .from('series')
      .select('id, title, slug')
      .order('created_at', { ascending: false });

    // 4. Query episodes list from DB
    const { data: dbEpisodes } = await adminSupabase
      .from('episodes')
      .select('id, title, episode_number, created_at')
      .order('created_at', { ascending: false });

    // Format metrics using real database counts only
    const formattedEpisodes = (dbEpisodes || []).map((e: any) => {
      const realCount = episodeViewCounts[e.id] || 0;
      return {
        id: e.id,
        title: e.title || `Episode ${e.episode_number}`,
        episode_number: e.episode_number,
        viewsCount: realCount,
        realViews: realCount
      };
    }).sort((a, b) => b.viewsCount - a.viewsCount);

    const formattedSeries = (dbSeries || []).map((s: any) => {
      const realCount = seriesViewCounts[s.id] || 0;
      return {
        id: s.id,
        title: s.title,
        slug: s.slug,
        viewsCount: realCount
      };
    }).sort((a, b) => b.viewsCount - a.viewsCount);

    return NextResponse.json({
      totalViews: realViewsCount || 0,
      realViewsCount: realViewsCount || 0,
      mostViewedSeries: formattedSeries.slice(0, 5),
      mostViewedEpisodes: formattedEpisodes.slice(0, 6)
    });
  } catch (err: any) {
    console.error('Error fetching view metrics:', err);
    return NextResponse.json({
      totalViews: 0,
      realViewsCount: 0,
      mostViewedSeries: [],
      mostViewedEpisodes: []
    });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Parse payload
    const { episode_id } = await request.json();
    if (!episode_id) {
      return NextResponse.json({ error: 'Missing episode_id' }, { status: 400 });
    }

    // Get optional user session (views can be registered by guests)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert view record into database using adminSupabase to bypass anonymous RLS insert restrictions
    try {
      await adminSupabase
        .from('episode_views')
        .insert({
          episode_id,
          profile_id: user?.id || null,
          viewed_at: new Date().toISOString()
        });

      // Purge the homepage cache instantly so users see updated view numbers on go-back
      revalidateTag('homepage_catalog', {});
    } catch (insertErr) {
      console.warn('Episode view log fallback:', insertErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Server error registering view:', err);
    return NextResponse.json({ success: true });
  }
}
