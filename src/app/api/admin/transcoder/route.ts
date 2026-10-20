import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { transcodeEpisode, probeEpisode, getStorageClient } from '@/utils/videoTranscoder';

export const dynamic = 'force-dynamic';

/**
 * GET: Returns summary statistics and a complete breakdown of series, seasons, and episodes
 * with their transcoding status, renditions (1080p, 720p, 480p), file sizes, and storyboard statuses.
 */
export async function GET() {
  try {
    await verifyAdmin();
    const catalog = await getLocalCatalog();

    const seriesList = catalog.series || [];
    const seasonsList = catalog.seasons || [];
    const episodesList = catalog.episodes || [];

    let totalEpisodes = episodesList.length;
    let has1080pCount = 0;
    let has720pCount = 0;
    let has480pCount = 0;
    let fullyTranscodedCount = 0;
    let missingVideoCount = 0;
    let storyboardReadyCount = 0;
    let totalTranscodedBytes = 0;

    // Series maps for rollups
    const seriesTotalEpMap: Record<string, number> = {};
    const seriesTranscodedEpMap: Record<string, number> = {};
    const seriesStoryboardEpMap: Record<string, number> = {};

    // Season to Series map
    const seasonToSeriesMap: Record<string, string> = {};
    seasonsList.forEach((s: any) => {
      seasonToSeriesMap[s.id] = s.series_id;
    });

    const enrichedEpisodes = episodesList.map((ep: any) => {
      const seriesId = seasonToSeriesMap[ep.season_id];
      if (seriesId) {
        seriesTotalEpMap[seriesId] = (seriesTotalEpMap[seriesId] || 0) + 1;
      }

      if (!ep.video_key || ep.video_key.trim() === '') {
        missingVideoCount++;
      } else {
        has1080pCount++;
      }

      const q = ep.video_qualities || ep.raw_provider_payload?.video_qualities || {};
      const sb = ep.storyboard || ep.raw_provider_payload?.storyboard;

      const has720 = !!q['720p']?.key || !!q['720p']?.url;
      const has480 = !!q['480p']?.key || !!q['480p']?.url;
      const isSbReady = sb?.status === 'completed';

      if (has720) {
        has720pCount++;
        totalTranscodedBytes += q['720p']?.size_bytes || (q['720p']?.size_mb ? q['720p'].size_mb * 1024 * 1024 : 0);
      }
      if (has480) {
        has480pCount++;
        totalTranscodedBytes += q['480p']?.size_bytes || (q['480p']?.size_mb ? q['480p'].size_mb * 1024 * 1024 : 0);
      }

      const isFullyTranscoded = has720 && has480;
      if (isFullyTranscoded) {
        fullyTranscodedCount++;
        if (seriesId) {
          seriesTranscodedEpMap[seriesId] = (seriesTranscodedEpMap[seriesId] || 0) + 1;
        }
      }

      if (isSbReady) {
        storyboardReadyCount++;
        if (seriesId) {
          seriesStoryboardEpMap[seriesId] = (seriesStoryboardEpMap[seriesId] || 0) + 1;
        }
      }

      return {
        id: ep.id,
        season_id: ep.season_id,
        episode_number: ep.episode_number,
        title: ep.title,
        video_key: ep.video_key,
        duration_seconds: ep.duration_seconds,
        is_published: ep.is_published,
        video_qualities: q,
        storyboard: sb || { status: 'missing' },
        has_720p: has720,
        has_480p: has480,
        is_fully_transcoded: isFullyTranscoded,
        is_storyboard_ready: isSbReady,
        source_height: q.source_height || 1080,
        source_width: q.source_width || 1920,
      };
    });

    // Group into Series -> Seasons -> Episodes
    const seriesTree = seriesList.map((series: any) => {
      const seriesSeasons = seasonsList
        .filter((sn: any) => sn.series_id === series.id)
        .sort((a: any, b: any) => (a.season_number || 1) - (b.season_number || 1))
        .map((sn: any) => {
          const seasonEpisodes = enrichedEpisodes
            .filter((ep: any) => ep.season_id === sn.id)
            .sort((a: any, b: any) => (a.episode_number || 1) - (b.episode_number || 1));

          return {
            id: sn.id,
            series_id: sn.series_id,
            season_number: sn.season_number,
            title: sn.title,
            episodes: seasonEpisodes,
          };
        });

      const totalEpsInSeries = seriesTotalEpMap[series.id] || 0;
      const transcodedEpsInSeries = seriesTranscodedEpMap[series.id] || 0;
      const storyboardEpsInSeries = seriesStoryboardEpMap[series.id] || 0;

      return {
        id: series.id,
        title: series.title,
        slug: series.slug,
        studio: series.studio,
        release_year: series.release_year,
        poster_image_key: series.poster_image_key || series.cover_image_key,
        is_published: series.is_published,
        seasons: seriesSeasons,
        stats: {
          total_episodes: totalEpsInSeries,
          transcoded_episodes: transcodedEpsInSeries,
          storyboard_episodes: storyboardEpsInSeries,
          is_all_transcoded: totalEpsInSeries > 0 && transcodedEpsInSeries === totalEpsInSeries,
          is_all_storyboard_ready: totalEpsInSeries > 0 && storyboardEpsInSeries === totalEpsInSeries,
        }
      };
    });

    const totalTranscodedGb = Math.round((totalTranscodedBytes / (1024 * 1024 * 1024)) * 100) / 100;

    return NextResponse.json({
      success: true,
      stats: {
        total_episodes: totalEpisodes,
        total_series: seriesList.length,
        has_1080p: has1080pCount,
        has_720p: has720pCount,
        has_480p: has480pCount,
        fully_transcoded: fullyTranscodedCount,
        missing_video: missingVideoCount,
        storyboard_ready: storyboardReadyCount,
        total_transcoded_gb: totalTranscodedGb,
        transcode_percentage: totalEpisodes > 0 ? Math.round((fullyTranscodedCount / totalEpisodes) * 100) : 0,
        storyboard_percentage: totalEpisodes > 0 ? Math.round((storyboardReadyCount / totalEpisodes) * 100) : 0,
      },
      series: seriesTree,
    });
  } catch (err: any) {
    console.error('[TranscoderAPI] GET Error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

/**
 * POST: Handles single episode transcode or resolution probing.
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const body = await request.json().catch(() => ({}));
    const { action = 'transcode_single', episodeId, options = {} } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'Missing episodeId parameter.' }, { status: 400 });
    }

    if (action === 'probe_single') {
      const probeInfo = await probeEpisode(episodeId);
      return NextResponse.json({
        success: true,
        episodeId,
        probe: probeInfo
      });
    }

    if (action === 'transcode_single') {
      const qualities = await transcodeEpisode(episodeId, {
        only1080p: options.only1080p !== false, // default true
        generate720p: options.generate720p !== false,
        generate480p: options.generate480p !== false,
        threads: options.threads || 4,
        crf720: options.crf720 || 22,
        crf480: options.crf480 || 24,
      });

      return NextResponse.json({
        success: true,
        episodeId,
        qualities,
      });
    }

    return NextResponse.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (err: any) {
    console.error('[TranscoderAPI] POST Error:', err);
    return NextResponse.json({ error: err.message || 'Transcode failed' }, { status: 500 });
  }
}
