import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Dynamically queries all episode view logs and aggregates them by series_id.
 * Returns a map of series_id -> total view count.
 */
export async function getSeriesViewsMap(): Promise<Record<string, number>> {
  const viewsMap: Record<string, number> = {};
  try {
    const adminSupabase = createAdminClient();
    const { data: viewsData, error } = await adminSupabase
      .from('episode_views')
      .select('episode_id, episodes(season_id, seasons(series_id))');

    if (error) {
      console.warn('Error fetching views map:', error);
      return {};
    }

    (viewsData || []).forEach((row: any) => {
      const seriesId = row.episodes?.seasons?.series_id;
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
