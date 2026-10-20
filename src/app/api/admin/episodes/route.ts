import { NextResponse } from 'next/server';
import { verifyAdmin, createAdminClient } from '@/utils/supabase/admin';
import { revalidateAllCatalogTags } from '@/utils/revalidateCatalog';
import { getLocalCatalog, upsertLocalEpisode, deleteLocalEpisode, resetLocalEpisodeQualities } from '@/utils/localCatalogStore';
import { processEpisodeStoryboard } from '@/utils/storyboardGenerator';
import { deleteStorageObject, deleteStorageObjects, deleteStoragePrefix } from '@/utils/s3Storage';
import { probeEpisode } from '@/utils/videoTranscoder';

export async function GET(request: Request) {
  try {
    await verifyAdmin();
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const seriesId = searchParams.get('series_id');

    // 1. Fetch from high-speed local EC2 memory/disk store (0ms latency, instant response)
    const catalog = await getLocalCatalog();

    if (catalog.episodes && catalog.episodes.length > 0) {
      const seasonMap = new Map((catalog.seasons || []).map((s: any) => [s.id, s]));
      const seriesMap = new Map((catalog.series || []).map((s: any) => [s.id, s]));

      let eps = catalog.episodes;
      if (seasonId) {
        eps = eps.filter((e: any) => e.season_id === seasonId);
      } else if (seriesId) {
        const seasonIds = new Set((catalog.seasons || []).filter((s: any) => s.series_id === seriesId).map((s: any) => s.id));
        eps = eps.filter((e: any) => seasonIds.has(e.season_id));
      }

      const mapped = eps.map((ep: any) => {
        const season = seasonMap.get(ep.season_id);
        const series = season ? seriesMap.get(season.series_id) : null;
        const subtitleKey = ep.subtitle_key || ep.raw_provider_payload?.subtitle_key || null;
        const subtitles = ep.subtitles || ep.raw_provider_payload?.subtitles || null;
        return {
          ...ep,
          subtitle_key: subtitleKey,
          subtitles: subtitles,
          storyboard: ep.storyboard || ep.raw_provider_payload?.storyboard || null,
          video_qualities: ep.video_qualities || ep.raw_provider_payload?.video_qualities || null,
          seasons: season ? {
            title: season.title,
            series: series ? { title: series.title } : undefined
          } : undefined
        };
      }).sort((a: any, b: any) => (a.episode_number || 0) - (b.episode_number || 0));

      return NextResponse.json({ episodes: mapped, source: 'aws-local-memory' });
    }

    // 2. Fallback to Supabase only if local store is empty
    const adminSupabase = createAdminClient();
    let query = adminSupabase.from('episodes').select('*, seasons(title, series(title))');
    
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }
    
    const { data, error } = await query.order('episode_number', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ episodes: data || [], source: 'supabase-fallback' });
  } catch (err: any) {
    console.error('Error fetching admin episodes:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

async function syncSeriesAverageRuntime(seasonId: string | null | undefined, supabase: any) {
  if (!seasonId) return;
  try {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('series_id')
      .eq('id', seasonId)
      .single();

    if (!seasonData || !seasonData.series_id) return;
    const seriesId = seasonData.series_id;

    const { data: seasons } = await supabase
      .from('seasons')
      .select('id')
      .eq('series_id', seriesId);

    if (!seasons || seasons.length === 0) return;
    const seasonIds = seasons.map((s: any) => s.id);

    const { data: eps } = await supabase
      .from('episodes')
      .select('duration_seconds')
      .in('season_id', seasonIds);

    if (eps && eps.length > 0) {
      const validEps = eps.filter((e: any) => e.duration_seconds && e.duration_seconds > 0);
      if (validEps.length > 0) {
        const totalSecs = validEps.reduce((sum: number, e: any) => sum + e.duration_seconds, 0);
        const avgMinutes = Math.ceil(totalSecs / validEps.length / 60);
        await supabase
          .from('series')
          .update({ runtime: avgMinutes })
          .eq('id', seriesId);
      }
    }
  } catch (syncErr) {
    console.error('Failed to auto-sync series average runtime:', syncErr);
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    if (!payload.season_id || payload.episode_number === undefined || !payload.title || !payload.video_key) {
      return NextResponse.json({ error: 'Missing required episode fields (season_id, episode_number, title, video_key)' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('episodes')
      .insert({
        season_id: payload.season_id,
        episode_number: payload.episode_number,
        title: payload.title,
        description: payload.description || '',
        video_key: payload.video_key,
        thumbnail_key: payload.thumbnail_key || '',
        thumbnail_options: payload.thumbnail_options || [],
        duration_seconds: payload.duration_seconds || 0,
        release_date: payload.release_date || new Date().toISOString(),
        is_published: payload.is_published ?? false,
        created_at: new Date().toISOString(),
        raw_provider_payload: {
          ...(payload.raw_provider_payload || {}),
          subtitle_key: payload.subtitle_key || null,
          subtitles: payload.subtitles || null,
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-sync series average runtime (rounded up to nearest minute)
    await syncSeriesAverageRuntime(payload.season_id, adminSupabase);
    try {
      await upsertLocalEpisode({
        ...data,
        subtitle_key: payload.subtitle_key || null,
        subtitles: payload.subtitles || null,
      });
    } catch (localErr) {
      console.warn('Local store episode upsert fallback:', localErr);
    }

    // Automatically trigger probe & Storyboard Generation in background
    if (data?.id && data.video_key && data.video_key.trim() !== '') {
      probeEpisode(data.id).catch((err: any) => {
        console.warn(`[AutoProbe] Background probe failed for new episode ${data.id}:`, err?.message);
      });
      processEpisodeStoryboard(data.id).catch((err: any) => {
        console.warn(`[AutoStoryboard] Background generation failed for new episode ${data.id}:`, err?.message);
      });
    }

    revalidateAllCatalogTags();

    return NextResponse.json({ success: true, episode: data });
  } catch (err: any) {
    console.error('Error creating episode:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const payload = await request.json();

    if (!payload.id) {
      return NextResponse.json({ error: 'Missing episode ID' }, { status: 400 });
    }

    // 1. Fetch current episode to compare keys and clean up old S3 files if replaced
    const { data: existingEp } = await adminSupabase
      .from('episodes')
      .select('id, season_id, video_key, thumbnail_key, raw_provider_payload')
      .eq('id', payload.id)
      .single();

    const videoReplaced = payload.video_key && existingEp && payload.video_key !== existingEp.video_key;
    const thumbReplaced = payload.thumbnail_key && existingEp && payload.thumbnail_key !== existingEp.thumbnail_key;

    if (videoReplaced) {
      // Delete old video file from S3 so it doesn't leave orphaned files or waste storage
      if (existingEp.video_key) {
        deleteStorageObject(existingEp.video_key).catch((err: any) => {
          console.warn(`[VideoReplace] Failed to delete old video ${existingEp.video_key}:`, err?.message);
        });
      }
      // Delete old transcoded renditions (720p, 480p) from S3 for this episode
      deleteStoragePrefix(`videos/${payload.id}/`).catch((err: any) => {
        console.warn(`[VideoReplace] Failed to delete old renditions for ${payload.id}:`, err?.message);
      });
      // Delete old storyboard sprite sheets from S3
      deleteStoragePrefix(`storyboards/${payload.id}/`).catch((err: any) => {
        console.warn(`[VideoReplace] Failed to delete old storyboards for ${payload.id}:`, err?.message);
      });
    }

    if (thumbReplaced && existingEp.thumbnail_key) {
      deleteStorageObject(existingEp.thumbnail_key).catch((err: any) => {
        console.warn(`[ThumbReplace] Failed to delete old thumbnail ${existingEp.thumbnail_key}:`, err?.message);
      });
    }

    const updateObj: Record<string, any> = {};
    if (payload.season_id !== undefined) updateObj.season_id = payload.season_id;
    if (payload.episode_number !== undefined) updateObj.episode_number = payload.episode_number;
    if (payload.title !== undefined) updateObj.title = payload.title;
    if (payload.description !== undefined) updateObj.description = payload.description;
    if (payload.video_key !== undefined) updateObj.video_key = payload.video_key;
    if (payload.thumbnail_key !== undefined) updateObj.thumbnail_key = payload.thumbnail_key;
    if (payload.thumbnail_options !== undefined) updateObj.thumbnail_options = payload.thumbnail_options;
    if (payload.duration_seconds !== undefined) updateObj.duration_seconds = payload.duration_seconds;
    if (payload.release_date !== undefined) updateObj.release_date = payload.release_date;
    if (payload.is_published !== undefined) updateObj.is_published = payload.is_published;

    const existingRaw = existingEp?.raw_provider_payload || {};
    let finalRaw = { ...existingRaw };

    if (videoReplaced) {
      finalRaw = {
        ...finalRaw,
        video_qualities: {
          '1080p': {
            key: payload.video_key,
            created_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        },
        storyboard: { status: 'missing' }
      };
    }

    if (payload.subtitle_key !== undefined) {
      finalRaw = {
        ...finalRaw,
        subtitle_key: payload.subtitle_key || null,
        subtitles: payload.subtitles !== undefined ? payload.subtitles : (payload.subtitle_key ? {
          en: {
            key: payload.subtitle_key,
            label: 'English',
            url: payload.subtitle_key
          }
        } : null)
      };
    }

    updateObj.raw_provider_payload = finalRaw;

    const { data, error } = await adminSupabase
      .from('episodes')
      .update(updateObj)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) throw error;

    // Auto-sync series average runtime (rounded up to nearest minute)
    const targetSeasonId = payload.season_id || data?.season_id;
    if (targetSeasonId) {
      await syncSeriesAverageRuntime(targetSeasonId, adminSupabase);
    }
    try {
      await upsertLocalEpisode({
        ...data,
        subtitle_key: payload.subtitle_key !== undefined ? payload.subtitle_key : data?.raw_provider_payload?.subtitle_key,
        subtitles: payload.subtitles !== undefined ? payload.subtitles : data?.raw_provider_payload?.subtitles,
      });
    } catch (localErr) {
      console.warn('Local store episode update fallback:', localErr);
    }

    // When video was replaced with a new 1080p master:
    if (videoReplaced) {
      // 1. Reset local qualities to master
      await resetLocalEpisodeQualities(payload.id, {
        '1080p': {
          key: payload.video_key,
          created_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      });

      // 2. Automatically probe new video to record exact dimensions (1080p)
      probeEpisode(payload.id).catch((err: any) => {
        console.warn(`[AutoProbe] Background probe failed for replaced video ${payload.id}:`, err?.message);
      });

      // 3. Automatically regenerate storyboard previews from the new 1080p master
      processEpisodeStoryboard(payload.id).catch((err: any) => {
        console.warn(`[AutoStoryboard] Background storyboard generation failed for replaced video ${payload.id}:`, err?.message);
      });
    }

    revalidateAllCatalogTags();

    return NextResponse.json({ success: true, episode: data, videoReplaced: !!videoReplaced });
  } catch (err: any) {
    console.error('Error updating episode:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing episode ID' }, { status: 400 });
    }

    // 1. Fetch episode data to delete all S3 storage files and sync runtime after deletion
    const { data: epData } = await adminSupabase
      .from('episodes')
      .select('id, season_id, video_key, thumbnail_key, thumbnail_options, raw_provider_payload')
      .eq('id', id)
      .single();

    if (epData) {
      const keysToDelete: string[] = [];
      if (epData.video_key) keysToDelete.push(epData.video_key);
      if (epData.thumbnail_key) keysToDelete.push(epData.thumbnail_key);
      if (epData.raw_provider_payload?.subtitle_key) keysToDelete.push(epData.raw_provider_payload.subtitle_key);
      if (Array.isArray(epData.thumbnail_options)) {
        keysToDelete.push(...epData.thumbnail_options);
      }

      if (keysToDelete.length > 0) {
        deleteStorageObjects(keysToDelete).catch((err: any) => {
          console.warn(`[EpisodeDelete] Failed to delete S3 files for episode ${id}:`, err?.message);
        });
      }

      // Delete transcoded 720p/480p files from S3
      deleteStoragePrefix(`videos/${id}/`).catch((err: any) => {
        console.warn(`[EpisodeDelete] Failed to delete S3 renditions prefix for episode ${id}:`, err?.message);
      });

      // Delete storyboard preview sheets from S3
      deleteStoragePrefix(`storyboards/${id}/`).catch((err: any) => {
        console.warn(`[EpisodeDelete] Failed to delete S3 storyboard prefix for episode ${id}:`, err?.message);
      });
    }

    // 2. Delete user logs / relations referencing this episode
    await adminSupabase.from('watch_history').delete().eq('episode_id', id);
    await adminSupabase.from('episode_views').delete().eq('episode_id', id);
    await adminSupabase.from('comments').delete().eq('episode_id', id);

    // 3. Finally, delete the episode record itself
    const { error } = await adminSupabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Auto-sync series average runtime after deletion
    if (epData?.season_id) {
      await syncSeriesAverageRuntime(epData.season_id, adminSupabase);
    }
    try {
      await deleteLocalEpisode(id);
    } catch (localErr) {
      console.warn('Local store episode delete fallback:', localErr);
    }
    revalidateAllCatalogTags();

    return NextResponse.json({ success: true, purgedFromS3: true });
  } catch (err: any) {
    console.error('Error deleting episode:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();
    const body = await request.json();

    const items: Array<{ id: string; changes: Record<string, any> }> = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No episode updates provided' }, { status: 400 });
    }

    const allowedFields = [
      'title', 'description', 'duration_seconds', 'release_date',
      'thumbnail_key', 'thumbnail_options', 'is_published', 'episode_number', 'video_key', 'season_id'
    ];

    const updatedEpisodes: any[] = [];
    const seasonIdsToSync = new Set<string>();

    for (const item of items) {
      if (!item.id) continue;
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(item.changes || {})) {
        if (allowedFields.includes(key)) {
          sanitized[key] = item.changes[key];
        }
      }

      if (Object.keys(sanitized).length === 0) continue;

      const { data, error } = await adminSupabase
        .from('episodes')
        .update(sanitized)
        .eq('id', item.id)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update episode ${item.id}:`, error);
        continue;
      }

      if (data) {
        updatedEpisodes.push(data);
        if (data.season_id) seasonIdsToSync.add(data.season_id);
        try {
          await upsertLocalEpisode(data);
        } catch (localErr) {
          console.warn('Local store batch update fallback:', localErr);
        }
      }
    }

    // Auto-sync series average runtime for all touched seasons
    for (const seasonId of seasonIdsToSync) {
      await syncSeriesAverageRuntime(seasonId, adminSupabase);
    }

    revalidateAllCatalogTags();

    return NextResponse.json({
      success: true,
      updatedCount: updatedEpisodes.length,
      episodes: updatedEpisodes
    });
  } catch (err: any) {
    console.error('Batch episode update error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
