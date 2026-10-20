import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import { getLocalCatalog, updateLocalEpisodeQualities } from '@/utils/localCatalogStore';
import { probeVideoDetailed } from '@/utils/videoProbe';
import { getR2Url } from '@/utils/r2';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/episodes/meta?id=<episodeId>&refresh=<true|false>
 * Returns comprehensive video stream telemetry: resolution, fps, bitrate, audio specs,
 * multi-quality renditions, and storyboard preview info.
 */
export async function GET(request: Request) {
  try {
    await verifyAdmin();
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('id');
    const refresh = searchParams.get('refresh') === 'true';

    if (!episodeId) {
      return NextResponse.json({ error: 'Missing episode ID parameter ("id").' }, { status: 400 });
    }

    // 1. Fetch episode from high-speed local store or Supabase
    const catalog = await getLocalCatalog();
    let episode = catalog.episodes?.find((e: any) => e.id === episodeId);

    if (!episode) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('episodes')
        .select('*, seasons(title, series(title, slug))')
        .eq('id', episodeId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: `Episode "${episodeId}" not found.` }, { status: 404 });
      }
      episode = data;
    }

    if (!episode.video_key || episode.video_key.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'No video stream key is currently assigned to this episode.',
        episode: {
          id: episode.id,
          title: episode.title,
          episode_number: episode.episode_number,
        }
      });
    }

    // Season & Series context
    const season = (catalog.seasons || []).find((s: any) => s.id === episode.season_id) || episode.seasons;
    const series = season ? (catalog.series || []).find((sr: any) => sr.id === season.series_id) || season.series : null;

    const videoUrl = getR2Url(episode.video_key, 'video');

    // 2. Check cached metadata if refresh is not explicitly requested
    const cachedMeta = episode.raw_provider_payload?.video_meta;
    if (!refresh && cachedMeta && cachedMeta.probedAt && cachedMeta.videoKey === episode.video_key) {
      return NextResponse.json({
        success: true,
        source: 'cached',
        meta: cachedMeta,
      });
    }

    // 3. Execute deep probe on the S3 video stream
    const probe = await probeVideoDetailed(videoUrl);

    // 4. Multi-Quality renditions status
    const qualities = episode.video_qualities || episode.raw_provider_payload?.video_qualities || {};
    const renditions = {
      '1080p': {
        key: episode.video_key,
        url: videoUrl,
        resolution: `${probe.width}x${probe.height}`,
        isReady: true,
        sizeMb: probe.sizeBytes ? Math.round((probe.sizeBytes / (1024 * 1024)) * 10) / 10 : undefined,
      },
      '720p': {
        key: qualities['720p']?.key || null,
        url: qualities['720p']?.key ? getR2Url(qualities['720p'].key, 'video') : null,
        resolution: '1280x720',
        isReady: !!qualities['720p']?.key,
        sizeMb: qualities['720p']?.size_mb || null,
        createdAt: qualities['720p']?.created_at || null,
      },
      '480p': {
        key: qualities['480p']?.key || null,
        url: qualities['480p']?.key ? getR2Url(qualities['480p'].key, 'video') : null,
        resolution: '854x480',
        isReady: !!qualities['480p']?.key,
        sizeMb: qualities['480p']?.size_mb || null,
        createdAt: qualities['480p']?.created_at || null,
      },
    };

    // 5. Storyboard preview status
    const sb = episode.storyboard || episode.raw_provider_payload?.storyboard;
    const storyboardInfo = {
      status: sb?.status || 'missing',
      sheetCount: sb?.sheet_count || 0,
      vttUrl: sb?.vtt_url || (sb?.vtt_key ? getR2Url(sb.vtt_key) : null),
      vttKey: sb?.vtt_key || null,
      intervalSeconds: sb?.frame_interval_seconds || 1,
      tileDimensions: `${sb?.tile_width || 160}x${sb?.tile_height || 90}`,
      grid: `${sb?.grid_columns || 10}x${sb?.grid_rows || 10} (100 tiles/sheet)`,
      generatedAt: sb?.generated_at || null,
    };

    // 5.5 Subtitle stream status
    const subtitleKey = episode.subtitle_key || episode.raw_provider_payload?.subtitle_key || null;
    const subtitlesInfo = {
      hasSeparateSubtitles: Boolean(subtitleKey || episode.subtitles || episode.raw_provider_payload?.subtitles),
      key: subtitleKey,
      url: subtitleKey ? getR2Url(subtitleKey) : null,
      format: subtitleKey ? (subtitleKey.endsWith('.vtt') ? 'WebVTT (.vtt)' : subtitleKey.endsWith('.srt') ? 'SubRip (.srt)' : 'External Subtitle') : 'Burned-in Hardsubs (In-Video)',
    };

    const assembledMeta = {
      ...probe,
      videoKey: episode.video_key,
      videoUrl,
      thumbnailKey: episode.thumbnail_key,
      thumbnailUrl: episode.thumbnail_key ? getR2Url(episode.thumbnail_key, 'thumbnail') : null,
      episode: {
        id: episode.id,
        title: episode.title,
        episode_number: episode.episode_number,
        duration_seconds: episode.duration_seconds,
        is_published: episode.is_published,
        season_title: season?.title || `Season ${season?.season_number || 1}`,
        series_title: series?.title || 'Unknown Series',
        series_slug: series?.slug || null,
      },
      renditions,
      storyboard: storyboardInfo,
      subtitles: subtitlesInfo,
    };

    // 6. Cache metadata into episode payload and local store in background
    (async () => {
      try {
        const updatedQualities = {
          ...qualities,
          source_width: probe.width,
          source_height: probe.height,
          source_fps: probe.fps,
          source_codec: probe.videoCodec,
          source_size_bytes: probe.sizeBytes,
          updated_at: new Date().toISOString(),
        };
        await updateLocalEpisodeQualities(episodeId, updatedQualities);

        const supabase = createAdminClient();
        const { data: epRow } = await supabase.from('episodes').select('raw_provider_payload').eq('id', episodeId).single();
        await supabase.from('episodes').update({
          raw_provider_payload: {
            ...(epRow?.raw_provider_payload || {}),
            video_meta: assembledMeta,
            video_qualities: updatedQualities,
          }
        }).eq('id', episodeId);
      } catch (saveErr: any) {
        console.warn(`[VideoMetaCache] Warning caching meta for ${episodeId}:`, saveErr.message);
      }
    })().catch(() => {});

    return NextResponse.json({
      success: true,
      source: 'live-probe',
      meta: assembledMeta,
    });
  } catch (err: any) {
    console.error('[VideoMetaAPI] Error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
