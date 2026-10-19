import { verifyAdmin } from '@/utils/supabase/admin';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { processEpisodeStoryboard } from '@/utils/storyboardGenerator';

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

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent('start', {
          total,
          message: `Starting bulk storyboard generation for ${total} episodes...`,
        });

        let completed = 0;
        let failed = 0;

        for (let i = 0; i < targets.length; i++) {
          const ep = targets[i];
          const currentIndex = i + 1;

          sendEvent('progress', {
            currentIndex,
            total,
            episodeId: ep.id,
            title: ep.title || `Episode ${ep.episode_number}`,
            percent: Math.round(((currentIndex - 1) / total) * 100),
            status: 'processing',
            message: `[${currentIndex}/${total}] Probing & extracting frames for "${ep.title || ep.id}"...`,
          });

          try {
            const meta = await processEpisodeStoryboard(ep.id, undefined, (logMsg) => {
              sendEvent('log', {
                episodeId: ep.id,
                message: logMsg,
              });
            });

            completed++;
            sendEvent('episode_completed', {
              currentIndex,
              total,
              episodeId: ep.id,
              title: ep.title,
              storyboard: meta,
              percent: Math.round((currentIndex / total) * 100),
              message: `[${currentIndex}/${total}] Done: "${ep.title}" (${meta.sheet_count} sheets, ${meta.size_kb} KB)`,
            });
          } catch (err: any) {
            failed++;
            console.error(`[BulkStoryboard] Error on episode ${ep.id}:`, err);
            sendEvent('episode_failed', {
              currentIndex,
              total,
              episodeId: ep.id,
              title: ep.title,
              error: err.message || 'Generation failed',
              message: `[${currentIndex}/${total}] Failed: "${ep.title}" - ${err.message}`,
            });
          }
        }

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
