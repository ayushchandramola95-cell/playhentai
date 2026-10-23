import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { getLocalCatalog, updateLocalEpisodeStoryboard } from '@/utils/localCatalogStore';
import { processEpisodeStoryboard } from '@/utils/storyboardGenerator';
import { deleteStoragePrefix } from '@/utils/s3Storage';

/**
 * GET: Returns summary statistics and list of all episodes with their storyboard history.
 */
export async function GET() {
  try {
    await verifyAdmin();
    const catalog = await getLocalCatalog();
    const episodes = catalog.episodes || [];

    let completedCount = 0;
    let missingCount = 0;
    let failedCount = 0;
    let totalSizeKb = 0;
    let totalFrames = 0;

    const list = episodes.map((ep: any) => {
      const sb = ep.storyboard || ep.raw_provider_payload?.storyboard;
      const status = sb?.status || 'missing';

      if (status === 'completed') {
        completedCount++;
        totalSizeKb += sb.size_kb || 0;
        totalFrames += sb.total_frames || 0;
      } else {
        missingCount++;
        if (status === 'failed') {
          failedCount++;
        }
      }

      return {
        id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
        video_key: ep.video_key,
        duration_seconds: ep.duration_seconds,
        season_id: ep.season_id,
        storyboard: sb || { status: 'missing' },
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: episodes.length,
        completed: completedCount,
        missing: missingCount,
        failed: failedCount,
        totalSizeKb,
        totalFrames,
        percentage: episodes.length > 0 ? Math.round((completedCount / episodes.length) * 100) : 0,
      },
      episodes: list,
    });
  } catch (err: any) {
    console.error('[StoryboardAPI] GET Error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

/**
 * POST: Generates storyboard for a single specified episode.
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const body = await request.json();
    const { episodeId, videoSource } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'Missing episodeId' }, { status: 400 });
    }

    const metadata = await processEpisodeStoryboard(episodeId, videoSource);

    return NextResponse.json({
      success: true,
      message: `Storyboard generated successfully (${metadata.sheet_count} sheets).`,
      storyboard: metadata,
    });
  } catch (err: any) {
    console.error('[StoryboardAPI] POST Error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes storyboard sprite sheets and VTT from S3 and resets metadata in catalog.
 */
export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({ error: 'Missing episodeId parameter.' }, { status: 400 });
    }

    // Delete all storyboard assets from S3 Sydney
    await deleteStoragePrefix(`storyboards/${episodeId}/`);

    // Reset status in local catalog store and Supabase
    await updateLocalEpisodeStoryboard(episodeId, {
      status: 'missing',
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      episodeId,
      message: 'Storyboard successfully removed from S3 storage and catalog.',
    });
  } catch (err: any) {
    console.error('[StoryboardAPI] DELETE Error:', err);
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
