import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Dynamically queries all episode view logs and aggregates them by series_id.
 * Returns a map of series_id -> total view count.
 */
export async function getSeriesViewsMap(): Promise<Record<string, number>> {
  const viewsMap: Record<string, number> = {};
  try {
    const adminSupabase = createAdminClient();

    // Fetch view logs, episodes, and seasons in parallel without failing nested joins
    const [viewsResult, episodesResult, seasonsResult] = await Promise.all([
      adminSupabase.from('episode_views').select('episode_id'),
      adminSupabase.from('episodes').select('id, season_id'),
      adminSupabase.from('seasons').select('id, series_id')
    ]);

    const viewLogs = viewsResult.data || [];
    const episodes = episodesResult.data || [];
    const seasons = seasonsResult.data || [];

    const episodeToSeason = new Map<string, string>();
    episodes.forEach((ep: any) => {
      if (ep.id && ep.season_id) episodeToSeason.set(ep.id, ep.season_id);
    });

    const seasonToSeries = new Map<string, string>();
    seasons.forEach((sn: any) => {
      if (sn.id && sn.series_id) seasonToSeries.set(sn.id, sn.series_id);
    });

    viewLogs.forEach((row: any) => {
      if (!row.episode_id) return;
      const seasonId = episodeToSeason.get(row.episode_id);
      if (!seasonId) return;
      const seriesId = seasonToSeries.get(seasonId);
      if (seriesId) {
        viewsMap[seriesId] = (viewsMap[seriesId] || 0) + 1;
      }
    });
  } catch (err) {
    console.error('Error in getSeriesViewsMap:', err);
  }
  return viewsMap;
}

/**
 * Dynamically queries all episode view logs and aggregates them by episode_id.
 * Returns a map of episode_id -> view count.
 */
export async function getEpisodeViewsMap(): Promise<Record<string, number>> {
  const viewsMap: Record<string, number> = {};
  try {
    const adminSupabase = createAdminClient();
    const { data: viewsData, error } = await adminSupabase
      .from('episode_views')
      .select('episode_id');

    if (error) {
      console.warn('Error fetching episode views map:', error);
      return {};
    }

    (viewsData || []).forEach((row: any) => {
      const episodeId = row.episode_id;
      if (episodeId) {
        viewsMap[episodeId] = (viewsMap[episodeId] || 0) + 1;
      }
    });
  } catch (err) {
    console.error('Error in getEpisodeViewsMap:', err);
  }
  return viewsMap;
}
