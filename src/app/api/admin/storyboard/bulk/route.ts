import { verifyAdmin } from '@/utils/supabase/admin';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { processEpisodeStoryboard, getFfmpegBinary, getFfprobeBinary } from '@/utils/storyboardGenerator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/storyboard/bulk
 * Executes bulk storyboard generation with live Server-Sent Events (SSE) streaming progress.
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json().catch(() => ({}));
    const { onlyMissing = true, episodeIds } = body;
    const workerCount = Math.max(1, Math.min(Number(body.concurrency) || 1, 32));

    const catalog = await getLocalCatalog();
    let targets = catalog.episodes || [];

    if (Array.isArray(episodeIds) && episodeIds.length > 0) {
      const idSet = new Set(episodeIds);
      targets = targets.filter((ep: any) => idSet.has(ep.id));
    } else if (onlyMissing) {
      targets = targets.filter((ep: any) => ep.storyboard?.status !== 'completed');
    }

    // Filter to only episodes that have a video key
    targets = targets.filter((ep: any) => ep.video_key && ep.video_key.trim() !== '');

    const total = targets.length;
    const encoder = new TextEncoder();

    const activeFfmpeg = getFfmpegBinary();
    const activeFfprobe = getFfprobeBinary();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent('start', {
          total,
          concurrency: workerCount,
          message: `Starting bulk storyboard generation for ${total} episodes using ${workerCount} parallel worker(s) (Binary: ${activeFfmpeg})...`,
        });

        let nextIndex = 0;
        let completed = 0;
        let failed = 0;

        async function worker(workerId: number) {
          while (nextIndex < targets.length) {
            const i = nextIndex++;
            if (i >= targets.length) break;

            const ep = targets[i];
            const currentIndex = i + 1;

            sendEvent('progress', {
              workerId,
              currentIndex,
              total,
              episodeId: ep.id,
              title: ep.title || `Episode ${ep.episode_number}`,
              percent: Math.round((completed / total) * 100),
              status: 'processing',
              message: workerCount > 1 
                ? `[W${workerId}] [${currentIndex}/${total}] Probing & extracting "${ep.title || ep.id}"...`
                : `[${currentIndex}/${total}] Probing & extracting "${ep.title || ep.id}"...`,
            });

            try {
              const meta = await processEpisodeStoryboard(ep.id, undefined, (logMsg) => {
                sendEvent('log', {
                  workerId,
                  episodeId: ep.id,
                  message: workerCount > 1 ? `[W${workerId}] ${logMsg}` : logMsg,
                });
              });

              completed++;
              sendEvent('episode_completed', {
                workerId,
                currentIndex,
                total,
                episodeId: ep.id,
                title: ep.title,
                storyboard: meta,
                percent: Math.round((completed / total) * 100),
                message: workerCount > 1
                  ? `[W${workerId}] Done: "${ep.title}" (${meta.sheet_count} sheets, ${meta.size_kb} KB)`
                  : `[${currentIndex}/${total}] Done: "${ep.title}" (${meta.sheet_count} sheets, ${meta.size_kb} KB)`,
              });
            } catch (err: any) {
              failed++;
              console.error(`[BulkStoryboard] Error on episode ${ep.id}:`, err);
              sendEvent('episode_failed', {
                workerId,
                currentIndex,
                total,
                episodeId: ep.id,
                title: ep.title,
                error: err.message || 'Generation failed',
                message: workerCount > 1
                  ? `[W${workerId}] Failed: "${ep.title}" - ${err.message}`
                  : `[${currentIndex}/${total}] Failed: "${ep.title}" - ${err.message}`,
              });
            }
          }
        }

        const poolSize = Math.min(workerCount, Math.max(1, targets.length));
        await Promise.all(Array.from({ length: poolSize }, (_, idx) => worker(idx + 1)));

        sendEvent('finished', {
          total,
          completed,
          failed,
          message: `Bulk storyboard generation finished: ${completed} succeeded, ${failed} failed.`,
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
    console.error('[BulkStoryboardAPI] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unauthorized or Server Error' }), {
      status: err.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
