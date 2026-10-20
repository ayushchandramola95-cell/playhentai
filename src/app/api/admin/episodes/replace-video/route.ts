import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import { getLocalCatalog, upsertLocalEpisode, resetLocalEpisodeQualities } from '@/utils/localCatalogStore';
import { deleteStorageObject, deleteStoragePrefix } from '@/utils/s3Storage';
import { probeEpisode } from '@/utils/videoTranscoder';
import { processEpisodeStoryboard } from '@/utils/storyboardGenerator';
import { revalidateAllCatalogTags } from '@/utils/revalidateCatalog';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/episodes/replace-video
 * Replaces or removes the video stream of an episode without deleting the episode box/metadata.
 * Purges old video, renditions (720p/480p), and storyboards from S3.
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const body = await request.json().catch(() => ({}));
    const { episodeId, newVideoKey, deleteOnly = false } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'Missing required "episodeId" parameter.' }, { status: 400 });
    }

    if (!deleteOnly && (!newVideoKey || newVideoKey.trim() === '')) {
      return NextResponse.json({ error: 'Missing "newVideoKey" for video replacement.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch current episode to get existing video_key
    const { data: episode, error: fetchErr } = await adminSupabase
      .from('episodes')
      .select('id, video_key, title, episode_number, season_id, raw_provider_payload')
      .eq('id', episodeId)
      .single();

    if (fetchErr || !episode) {
      return NextResponse.json({ error: `Episode "${episodeId}" not found.` }, { status: 404 });
    }

    const oldVideoKey = episode.video_key;

    // 2. Clean up previous S3 files if present
    if (oldVideoKey && oldVideoKey.trim() !== '') {
      // Delete old video file from S3
      deleteStorageObject(oldVideoKey).catch((err: any) => {
        console.warn(`[ReplaceVideo] Failed to delete old video ${oldVideoKey}:`, err?.message);
      });

      // Purge old transcoded renditions (720p, 480p) from S3
      deleteStoragePrefix(`videos/${episodeId}/`).catch((err: any) => {
        console.warn(`[ReplaceVideo] Failed to delete old renditions for ${episodeId}:`, err?.message);
      });

      // Purge old storyboard preview sheets from S3
      deleteStoragePrefix(`storyboards/${episodeId}/`).catch((err: any) => {
        console.warn(`[ReplaceVideo] Failed to delete old storyboards for ${episodeId}:`, err?.message);
      });
    }

    // 3. Prepare updated episode record
    const existingRaw = episode.raw_provider_payload || {};
    let updatedUpdateObj: Record<string, any> = {};

    if (deleteOnly) {
      // Detach video stream from episode box
      updatedUpdateObj = {
        video_key: '',
        raw_provider_payload: {
          ...existingRaw,
          video_qualities: {},
          video_meta: null,
          storyboard: { status: 'missing' },
        },
      };
    } else {
      // Attach new video stream
      updatedUpdateObj = {
        video_key: newVideoKey.trim(),
        raw_provider_payload: {
          ...existingRaw,
          video_qualities: {
            '1080p': {
              key: newVideoKey.trim(),
              created_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
          video_meta: null,
          storyboard: { status: 'missing' },
        },
      };
    }

    // 4. Update Supabase master
    const { data: updatedEp, error: updateErr } = await adminSupabase
      .from('episodes')
      .update(updatedUpdateObj)
      .eq('id', episodeId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. Update local high-speed cache
    try {
      await upsertLocalEpisode(updatedEp);
      if (deleteOnly) {
        await resetLocalEpisodeQualities(episodeId, {});
      } else {
        await resetLocalEpisodeQualities(episodeId, {
          '1080p': {
            key: newVideoKey.trim(),
            created_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        });
      }
    } catch (localErr) {
      console.warn('[ReplaceVideo] Local store update fallback:', localErr);
    }

    // 6. If a new video was supplied, automatically trigger background probe and storyboard generation
    if (!deleteOnly && newVideoKey) {
      probeEpisode(episodeId).catch((err: any) => {
        console.warn(`[ReplaceVideo] Background probe failed for ${episodeId}:`, err?.message);
      });
      processEpisodeStoryboard(episodeId).catch((err: any) => {
        console.warn(`[ReplaceVideo] Background storyboard failed for ${episodeId}:`, err?.message);
      });
    }

    revalidateAllCatalogTags();

    return NextResponse.json({
      success: true,
      action: deleteOnly ? 'video_deleted' : 'video_replaced',
      message: deleteOnly
        ? `Video file successfully deleted from S3 for "${episode.title}". Episode box preserved.`
        : `Video stream successfully replaced with new file for "${episode.title}". Probing 1080p stream in background.`,
      episode: updatedEp,
    });
  } catch (err: any) {
    console.error('[ReplaceVideoAPI] Error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
