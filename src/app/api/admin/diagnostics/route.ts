import { NextResponse } from 'next/server';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { getR2Url } from '@/utils/r2';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for diagnostic probes

export interface DiagnosticIssue {
  id: string;
  type: 'episode' | 'series';
  severity: 'critical' | 'warning' | 'info';
  code: string;
  title: string;
  message: string;
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  episodeId?: string;
  episodeNumber?: number;
  videoKey?: string;
  thumbnailKey?: string;
  suggestedAction: string;
  editUrl: string;
  publicUrl?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deepCheck = searchParams.get('deepCheck') === 'true';

    const catalog = await getLocalCatalog();
    const publishedSeries = catalog.series.filter((s: any) => s.is_published !== false);
    const allEpisodes = catalog.episodes.filter((ep: any) => ep.is_published !== false);
    const allSeasons = catalog.seasons;

    // Series and Season lookup maps
    const seriesMap = new Map<string, any>();
    publishedSeries.forEach((s: any) => seriesMap.set(s.id, s));

    const seasonMap = new Map<string, any>();
    allSeasons.forEach((sn: any) => seasonMap.set(sn.id, sn));

    const seriesEpisodesCountMap = new Map<string, number>();

    const issues: DiagnosticIssue[] = [];
    let healthyEpisodes = 0;

    // 1. Episode-Level Diagnostics
    for (const ep of allEpisodes) {
      const seasonObj = seasonMap.get(ep.season_id);
      const seriesObj = seasonObj ? seriesMap.get(seasonObj.series_id) : null;

      const seriesTitle = seriesObj?.title || 'Unknown Series';
      const seriesSlug = seriesObj?.slug || '';
      const seriesId = seriesObj?.id || '';

      if (seriesId) {
        seriesEpisodesCountMap.set(seriesId, (seriesEpisodesCountMap.get(seriesId) || 0) + 1);
      }

      let isEpisodeHealthy = true;
      const rawVideo = (ep.video_key || '').trim();
      const rawThumb = (ep.thumbnail_key || '').trim();

      // Check 1: Video File
      if (!rawVideo) {
        isEpisodeHealthy = false;
        issues.push({
          id: `diag-vid-empty-${ep.id}`,
          type: 'episode',
          severity: 'critical',
          code: 'DEAD_VIDEO_EMPTY',
          title: `Dead Video: Missing video file`,
          message: `Episode ${ep.episode_number} has no streaming video key assigned.`,
          seriesId,
          seriesTitle,
          seriesSlug,
          episodeId: ep.id,
          episodeNumber: ep.episode_number,
          videoKey: '',
          thumbnailKey: rawThumb,
          suggestedAction: 'Assign MP4 video URL or R2 upload key',
          editUrl: `/admin/episodes?edit=${ep.id}`,
          publicUrl: seriesSlug ? `/watch/${seriesSlug}-episode-${ep.episode_number}` : undefined,
        });
      }

      // Check 2: Thumbnail Image
      if (!rawThumb) {
        isEpisodeHealthy = false;
        issues.push({
          id: `diag-thumb-empty-${ep.id}`,
          type: 'episode',
          severity: 'warning',
          code: 'MISSING_THUMBNAIL',
          title: `Missing Episode Thumbnail`,
          message: `Episode ${ep.episode_number} has no preview thumbnail image.`,
          seriesId,
          seriesTitle,
          seriesSlug,
          episodeId: ep.id,
          episodeNumber: ep.episode_number,
          videoKey: rawVideo,
          thumbnailKey: '',
          suggestedAction: 'Upload episode preview thumbnail or extract from video',
          editUrl: `/admin/episodes?edit=${ep.id}`,
          publicUrl: seriesSlug ? `/watch/${seriesSlug}-episode-${ep.episode_number}` : undefined,
        });
      }

      if (isEpisodeHealthy) {
        healthyEpisodes++;
      }
    }

    // 2. Series-Level Diagnostics
    for (const s of publishedSeries) {
      const epCount = seriesEpisodesCountMap.get(s.id) || 0;
      const hasPoster = Boolean((s.poster_image_key || '').trim() || (s.cover_image_key || '').trim());

      // Check 3: Missing Poster/Cover
      if (!hasPoster) {
        issues.push({
          id: `diag-poster-empty-${s.id}`,
          type: 'series',
          severity: 'info',
          code: 'MISSING_POSTER',
          title: `Missing Cover Art`,
          message: `"${s.title}" has no poster image or cover artwork uploaded.`,
          seriesId: s.id,
          seriesTitle: s.title,
          seriesSlug: s.slug,
          suggestedAction: 'Upload poster image or cover banner in series editor',
          editUrl: `/admin/series?edit=${s.id}`,
          publicUrl: `/series/${s.slug}`,
        });
      }

      // Check 4: Series With No Episodes
      if (epCount === 0) {
        issues.push({
          id: `diag-series-empty-${s.id}`,
          type: 'series',
          severity: 'warning',
          code: 'EMPTY_SERIES',
          title: `Empty Series: 0 Episodes`,
          message: `"${s.title}" is published on the site but contains 0 playable episodes.`,
          seriesId: s.id,
          seriesTitle: s.title,
          seriesSlug: s.slug,
          suggestedAction: 'Add seasons and episodes or unpublish series',
          editUrl: `/admin/series?edit=${s.id}`,
          publicUrl: `/series/${s.slug}`,
        });
      }
    }

    // 3. Optional Deep Network Probe (Tests HTTP availability on external/R2 endpoints)
    if (deepCheck) {
      // Pick up to 40 random or flagged episodes to probe in parallel
      const episodesToProbe = allEpisodes
        .filter((ep: any) => ep.video_key && ep.video_key.trim())
        .slice(0, 40);

      await Promise.allSettled(
        episodesToProbe.map(async (ep: any) => {
          const videoUrl = getR2Url(ep.video_key, 'video');
          const seasonObj = seasonMap.get(ep.season_id);
          const seriesObj = seasonObj ? seriesMap.get(seasonObj.series_id) : null;

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(videoUrl, {
              method: 'HEAD',
              signal: controller.signal,
              headers: { Range: 'bytes=0-0' },
            });
            clearTimeout(timeoutId);

            if (res.status === 404 || res.status === 403) {
              issues.push({
                id: `diag-http-fail-${ep.id}`,
                type: 'episode',
                severity: 'critical',
                code: `HTTP_${res.status}_DEAD_LINK`,
                title: `CDN 404/403: Dead Video Link`,
                message: `Episode ${ep.episode_number} video endpoint returned HTTP ${res.status} Not Found.`,
                seriesId: seriesObj?.id || '',
                seriesTitle: seriesObj?.title || 'Unknown',
                seriesSlug: seriesObj?.slug || '',
                episodeId: ep.id,
                episodeNumber: ep.episode_number,
                videoKey: ep.video_key,
                suggestedAction: 'Re-upload MP4 to R2 bucket or verify filename',
                editUrl: `/admin/episodes?edit=${ep.id}`,
                publicUrl: seriesObj?.slug ? `/watch/${seriesObj.slug}-episode-${ep.episode_number}` : undefined,
              });
            }
          } catch (err: any) {
            // Ignore timeouts on deep check to prevent false positives
          }
        })
      );
    }

    // Compute Summary Stats
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const infoCount = issues.filter((i) => i.severity === 'info').length;

    const totalEpisodes = allEpisodes.length;
    const totalSeries = publishedSeries.length;

    const healthScore = totalEpisodes > 0
      ? Math.max(0, Math.round(((totalEpisodes - criticalCount) / totalEpisodes) * 100))
      : 100;

    return NextResponse.json({
      success: true,
      scannedAt: new Date().toISOString(),
      deepCheckEnabled: deepCheck,
      summary: {
        totalEpisodes,
        totalSeries,
        healthyEpisodes,
        healthScore,
        criticalCount,
        warningCount,
        infoCount,
        totalIssues: issues.length,
      },
      issues: issues.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      }),
    });
  } catch (err: any) {
    console.error('Error running diagnostics scan:', err);
    return NextResponse.json(
      { success: false, error: 'Diagnostic scanner failure', details: err?.message },
      { status: 500 }
    );
  }
}
