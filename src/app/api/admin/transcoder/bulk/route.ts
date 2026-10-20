import { verifyAdmin } from '@/utils/supabase/admin';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { transcodeEpisode } from '@/utils/videoTranscoder';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/transcoder/bulk
 * Executes bulk video transcoding with live Server-Sent Events (SSE) streaming progress.
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json().catch(() => ({}));
    const {
      only1080p = true,
      onlyMissing = true,
      episodeIds,
      concurrency = 1,
      generate720p = true,
      generate480p = true,
      threads = 4,
      crf720 = 22,
      crf480 = 24,
    } = body;

    const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, 4));

    const catalog = await getLocalCatalog();
    let targets = catalog.episodes || [];

    // Filter by specific episode IDs if provided
    if (Array.isArray(episodeIds) && episodeIds.length > 0) {
      const idSet = new Set(episodeIds);
      targets = targets.filter((ep: any) => idSet.has(ep.id));
    } else if (onlyMissing) {
      // Filter to only episodes that are not yet fully transcoded (missing either 720p or 480p)
      targets = targets.filter((ep: any) => {
        const q = ep.video_qualities || ep.raw_provider_payload?.video_qualities || {};
        const has720 = !!q['720p']?.key || !!q['720p']?.url;
        const has480 = !!q['480p']?.key || !!q['480p']?.url;
        return !(has720 && has480);
      });
    }

    // Filter to only episodes with valid video keys
    targets = targets.filter((ep: any) => ep.video_key && ep.video_key.trim() !== '');

    const total = targets.length;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent('start', {
          total,
          concurrency: workerCount,
          only1080p,
          message: `Starting bulk transcoding for ${total} episode(s) using ${workerCount} worker(s) (only1080p: ${only1080p ? 'ON' : 'OFF'}, ${threads} vCPUs per worker)...`,
        });

        let nextIndex = 0;
        let completed = 0;
        let skipped = 0;
        let failed = 0;

        async function worker(workerId: number) {
          while (nextIndex < targets.length) {
            const i = nextIndex++;
            if (i >= targets.length) break;

            const ep = targets[i];
            const currentIndex = i + 1;

            sendEvent('progress', {
              index: currentIndex,
              total,
              episodeId: ep.id,
              title: ep.title,
              workerId,
              message: `[Worker ${workerId}] Transcoding (${currentIndex}/${total}): "${ep.title}"`,
            });

            try {
              const qualities = await transcodeEpisode(ep.id, {
                only1080p,
                generate720p,
                generate480p,
                threads,
                crf720,
                crf480,
                onProgress: (msg: string) => {
                  sendEvent('progress', {
                    index: currentIndex,
                    total,
                    episodeId: ep.id,
                    title: ep.title,
                    workerId,
                    message: `[Worker ${workerId}] ${msg}`,
                  });
                }
              });

              completed++;
              sendEvent('episode_complete', {
                index: currentIndex,
                total,
                episodeId: ep.id,
                title: ep.title,
                qualities,
                message: `[Worker ${workerId}] Completed: "${ep.title}"`,
              });
            } catch (err: any) {
              const errMsg = err.message || 'Unknown transcode error';
              if (errMsg.includes('Skipped')) {
                skipped++;
                sendEvent('episode_skipped', {
                  index: currentIndex,
                  total,
                  episodeId: ep.id,
                  title: ep.title,
                  reason: errMsg,
                  message: `[Worker ${workerId}] Skipped: "${ep.title}" - ${errMsg}`,
                });
              } else {
                failed++;
                console.error(`[TranscodeWorker ${workerId}] Error on ${ep.id}:`, err);
                sendEvent('episode_error', {
                  index: currentIndex,
                  total,
                  episodeId: ep.id,
                  title: ep.title,
                  error: errMsg,
                  message: `[Worker ${workerId}] Failed: "${ep.title}" (${errMsg})`,
                });
              }
            }
          }
        }

        const workers = Array.from({ length: workerCount }, (_, i) => worker(i + 1));
        await Promise.all(workers);

        sendEvent('complete', {
          completed,
          skipped,
          failed,
          total,
          message: `Bulk transcoding finished. Total: ${total}, Completed: ${completed}, Skipped (e.g. non-1080p): ${skipped}, Failed: ${failed}.`,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[BulkTranscodeAPI] Root Error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return new Response(JSON.stringify({ error: err.message || 'Server Error' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
