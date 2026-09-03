import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(request: Request) {
  try {
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Determine timestamp threshold based on range
    let daysCount = 7;
    if (range === '30d') daysCount = 30;
    else if (range === '90d') daysCount = 90;
    else if (range === 'all') daysCount = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    const startTime = startDate.getTime();

    // 1. Fetch tables in parallel safely without fragile joins or column-name assumptions
    const [
      { count: realViewsCount },
      viewsResult,
      seriesResult,
      seasonsResult,
      episodesResult
    ] = await Promise.all([
      adminSupabase.from('episode_views').select('*', { count: 'exact', head: true }),
      adminSupabase.from('episode_views').select('*').limit(25000),
      adminSupabase.from('series').select('*').order('created_at', { ascending: false }),
      adminSupabase.from('seasons').select('id, title, season_number, series_id'),
      adminSupabase.from('episodes').select('id, title, episode_number, thumbnail_key, season_id, created_at').order('created_at', { ascending: false })
    ]);

    const allViewLogs = viewsResult.data || [];
    const dbSeries = seriesResult.data || [];
    const dbSeasons = seasonsResult.data || [];
    const dbEpisodes = episodesResult.data || [];

    // Filter view logs in memory according to chosen time range
    const viewLogs = allViewLogs.filter((log: any) => {
      if (range === 'all') return true;
      const ts = log.viewed_at || log.created_at || log.timestamp;
      if (!ts) return true; // Include if untimestamped
      const logTime = new Date(ts).getTime();
      return logTime >= startTime;
    });

    // Build lookup maps in memory for 100% resilient relational mapping
    const seriesMap = new Map<string, any>();
    dbSeries.forEach((s: any) => seriesMap.set(s.id, s));

    const seasonMap = new Map<string, any>();
    dbSeasons.forEach((season: any) => {
      const parentSeries = seriesMap.get(season.series_id);
      seasonMap.set(season.id, {
        ...season,
        series: parentSeries || null
      });
    });

    const episodeMap = new Map<string, any>();
    dbEpisodes.forEach((ep: any) => {
      const parentSeason = seasonMap.get(ep.season_id);
      episodeMap.set(ep.id, {
        ...ep,
        season: parentSeason || null,
        series: parentSeason?.series || null
      });
    });

    // Build frequency maps
    const episodeViewCounts: Record<string, number> = {};
    const seriesViewCounts: Record<string, number> = {};
    const dailyViewsMap: Record<string, number> = {};

    // Initialize daily map for trajectory chart
    const daysToShow = Math.min(daysCount, 30);
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyViewsMap[key] = 0;
    }

    viewLogs.forEach((log: any) => {
      if (log.episode_id) {
        episodeViewCounts[log.episode_id] = (episodeViewCounts[log.episode_id] || 0) + 1;
        const epData = episodeMap.get(log.episode_id);
        const seriesId = epData?.series?.id;
        if (seriesId) {
          seriesViewCounts[seriesId] = (seriesViewCounts[seriesId] || 0) + 1;
        }
      }

      const logTimestamp = log.viewed_at || log.created_at || log.timestamp;
      if (logTimestamp) {
        const vDate = new Date(logTimestamp);
        const dateKey = vDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyViewsMap[dateKey] !== undefined) {
          dailyViewsMap[dateKey] += 1;
        }
      }
    });

    // Format all Episodes with joined series/season metadata and real view counts
    const formattedEpisodes = dbEpisodes.map((e: any) => {
      const epData = episodeMap.get(e.id);
      const realCount = episodeViewCounts[e.id] || 0;
      const series = epData?.series;
      const season = epData?.season;

      return {
        id: e.id,
        title: e.title || (e.episode_number ? `Episode ${e.episode_number}` : 'Episode 1'),
        episode_number: e.episode_number || 1,
        thumbnail_image_key: e.thumbnail_key || null,
        series_id: series?.id || null,
        series_title: series?.title || 'Catalog Series',
        series_slug: series?.slug || null,
        season_title: season?.title || (season?.season_number ? `Season ${season.season_number}` : 'Season 1'),
        viewsCount: realCount,
        realViews: realCount
      };
    }).sort((a, b) => b.viewsCount - a.viewsCount || a.episode_number - b.episode_number);

    // Format all Series with real view counts (incorporating series-level view seed or episode sum)
    const formattedSeries = dbSeries.map((s: any) => {
      // Find all episodes belonging to this series
      const seriesEpisodes = dbEpisodes.filter((e: any) => {
        const epData = episodeMap.get(e.id);
        return epData?.series?.id === s.id;
      });

      // Sum of episode views or series views log or fallback seed
      const episodeSum = seriesEpisodes.reduce((sum, ep) => sum + (episodeViewCounts[ep.id] || 0), 0);
      const realCount = Math.max(seriesViewCounts[s.id] || 0, episodeSum, (range === 'all' ? (s.views || 0) : 0));

      return {
        id: s.id,
        title: s.title,
        slug: s.slug,
        poster_image_key: s.poster_image_key || null,
        studio: s.studio || 'Independent',
        release_year: s.release_year || null,
        runtime: s.runtime || 24,
        tags: s.tags || [],
        episodeCount: seriesEpisodes.length,
        viewsCount: realCount,
        watchHours: Math.round((realCount * (s.runtime || 24)) / 60)
      };
    }).sort((a, b) => b.viewsCount - a.viewsCount);

    // Compute real Genre Distribution from database series
    const genreCounts: Record<string, number> = {};
    dbSeries.forEach((s: any) => {
      (s.tags || []).forEach((tag: string) => {
        const clean = tag.trim();
        if (clean && clean.toLowerCase() !== 'featured' && !clean.toLowerCase().startsWith('featured:')) {
          genreCounts[clean] = (genreCounts[clean] || 0) + 1;
        }
      });
    });

    const genreColors = ['#7c3aed', '#06b6d4', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#3b82f6', '#f43f5e', '#14b8a6', '#a855f7'];
    const genreDistribution = Object.entries(genreCounts)
      .map(([name, count], idx) => ({
        name,
        count,
        color: genreColors[idx % genreColors.length]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Compute Top Studios Performance (aggregating views from series)
    const studioMap = new Map<string, { count: number; views: number }>();
    formattedSeries.forEach((s: any) => {
      const studioName = s.studio?.trim() || 'Independent';
      if (!studioMap.has(studioName)) {
        studioMap.set(studioName, { count: 0, views: 0 });
      }
      const entry = studioMap.get(studioName)!;
      entry.count += 1;
      entry.views += s.viewsCount;
    });

    const topStudios = Array.from(studioMap.entries())
      .map(([name, data]) => ({
        name,
        seriesCount: data.count,
        viewsCount: data.views
      }))
      .sort((a, b) => b.viewsCount - a.viewsCount || b.seriesCount - a.seriesCount)
      .slice(0, 6);

    // Format View Trend Points
    const viewTrends = Object.entries(dailyViewsMap).map(([date, count]) => ({
      date,
      count
    }));

    // Calculate Estimated Watch Hours across all views
    const totalViewsCalculated = range === 'all' 
      ? (realViewsCount || allViewLogs.length || 0)
      : (viewLogs.length || 0);

    const totalWatchHours = Math.round((totalViewsCalculated * 24) / 60);

    return NextResponse.json({
      totalViews: totalViewsCalculated,
      realViewsCount: realViewsCount || 0,
      totalWatchHours,
      range,
      viewTrends,
      genreDistribution,
      topStudios,
      mostViewedSeries: formattedSeries.slice(0, 15),
      mostViewedEpisodes: formattedEpisodes.slice(0, 15),
      allSeriesAnalytics: formattedSeries,
      allEpisodesAnalytics: formattedEpisodes,
      totalSeriesCount: dbSeries.length,
      totalEpisodesCount: dbEpisodes.length
    });
  } catch (err: any) {
    console.error('Error fetching view metrics:', err);
    return NextResponse.json({
      totalViews: 0,
      realViewsCount: 0,
      totalWatchHours: 0,
      range: '7d',
      viewTrends: [],
      genreDistribution: [],
      topStudios: [],
      mostViewedSeries: [],
      mostViewedEpisodes: [],
      allSeriesAnalytics: [],
      allEpisodesAnalytics: [],
      totalSeriesCount: 0,
      totalEpisodesCount: 0
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

    // Insert view record into database using adminSupabase
    try {
      await adminSupabase
        .from('episode_views')
        .insert({
          episode_id,
          profile_id: user?.id || null,
          viewed_at: new Date().toISOString()
        });

      // Purge the homepage cache so users see updated view numbers
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
