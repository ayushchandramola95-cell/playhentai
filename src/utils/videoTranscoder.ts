import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getLocalCatalog, updateLocalEpisodeQualities } from './localCatalogStore';
import { getFfmpegBinary, getFfprobeBinary, probeVideo } from './storyboardGenerator';
import { getR2Url } from './r2';

const execFileAsync = promisify(execFile);

export interface VideoQualityItem {
  key: string;
  url?: string;
  resolution: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  size_mb?: number;
  bitrate_kbps?: number;
  created_at?: string;
}

export interface VideoQualitiesMap {
  '1080p'?: VideoQualityItem;
  '720p'?: VideoQualityItem;
  '480p'?: VideoQualityItem;
  source_height?: number;
  source_width?: number;
  updated_at?: string;
}

export interface TranscodeOptions {
  only1080p?: boolean;
  generate720p?: boolean;
  generate480p?: boolean;
  threads?: number;
  preset?: string;
  crf720?: number;
  crf480?: number;
  onProgress?: (msg: string, pct?: number) => void;
}

import { getStorageClient } from './s3Storage';
export { getStorageClient };

/**
 * Probes an episode video to inspect width, height, duration, and FPS
 */
export async function probeEpisode(episodeId: string, customVideoSource?: string) {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (!episode && !customVideoSource) {
    throw new Error(`Episode "${episodeId}" not found in catalog.`);
  }

  let videoUrl = customVideoSource;
  if (!videoUrl && episode?.video_key) {
    videoUrl = getR2Url(episode.video_key, 'video');
  }

  if (!videoUrl) {
    throw new Error(`Episode "${episodeId}" has no valid video key or URL.`);
  }

  const probeInfo = await probeVideo(videoUrl);

  if (episode) {
    const existingQualities: VideoQualitiesMap = episode.video_qualities || episode.raw_provider_payload?.video_qualities || {};
    const updatedQualities: VideoQualitiesMap = {
      ...existingQualities,
      source_width: probeInfo.width,
      source_height: probeInfo.height,
      updated_at: new Date().toISOString(),
      '1080p': {
        ...(existingQualities['1080p'] || {}),
        key: episode.video_key,
        url: getR2Url(episode.video_key, 'video'),
        resolution: `${probeInfo.width}x${probeInfo.height}`,
        width: probeInfo.width,
        height: probeInfo.height,
        created_at: existingQualities['1080p']?.created_at || episode.created_at || new Date().toISOString(),
      }
    };
    await updateLocalEpisodeQualities(episodeId, updatedQualities);
  }

  return probeInfo;
}

/**
 * Transcodes a single episode into 720p and/or 480p renditions using FFmpeg with 4-vCPU tuning,
 * +faststart optimization, and uploads to S3/R2 storage.
 */
export async function transcodeEpisode(
  episodeId: string,
  options: TranscodeOptions = {}
): Promise<VideoQualitiesMap> {
  const {
    only1080p = true,
    generate720p = true,
    generate480p = true,
    threads = 4,
    preset = 'fast',
    crf720 = 22,
    crf480 = 24,
    onProgress
  } = options;

  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (!episode) {
    throw new Error(`Episode "${episodeId}" not found in catalog.`);
  }

  if (!episode.video_key) {
    throw new Error(`Episode "${episode.title}" has no video stream assigned.`);
  }

  onProgress?.(`Starting transcode pipeline for "${episode.title}"...`, 5);

  const videoUrl = getR2Url(episode.video_key, 'video');

  // 1. Probe video stream resolution
  onProgress?.('Inspecting source video resolution with ffprobe...', 10);
  const probeInfo = await probeVideo(videoUrl);
  const sourceHeight = probeInfo.height || 1080;
  const sourceWidth = probeInfo.width || 1920;

  onProgress?.(`Source detected: ${sourceWidth}x${sourceHeight} @ ${probeInfo.fps}fps, Duration: ${probeInfo.duration}s`, 15);

  // Always record source dimensions in local store
  const existingQualities: VideoQualitiesMap = episode.video_qualities || episode.raw_provider_payload?.video_qualities || {};
  existingQualities.source_width = sourceWidth;
  existingQualities.source_height = sourceHeight;

  // 2. Setting filter: Only compress if source is in 1080p (height >= 1080)
  if (only1080p && sourceHeight < 1080) {
    await updateLocalEpisodeQualities(episodeId, existingQualities);
    const skipMsg = `Skipped: Source resolution is ${sourceHeight}p (requires 1080p minimum as per settings).`;
    onProgress?.(skipMsg, 100);
    throw new Error(skipMsg);
  }

  // 3. Prepare temporary local working directory
  const tempDir = path.join(os.tmpdir(), `transcode_${episodeId}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const ffmpegCmd = getFfmpegBinary();
  const { s3, bucket } = getStorageClient();

  const updatedQualities: VideoQualitiesMap = {
    ...existingQualities,
    source_width: sourceWidth,
    source_height: sourceHeight,
    '1080p': existingQualities['1080p'] || {
      key: episode.video_key,
      url: getR2Url(episode.video_key, 'video'),
      resolution: `${sourceWidth}x${sourceHeight}`,
      width: sourceWidth,
      height: sourceHeight,
      created_at: episode.created_at,
    },
    updated_at: new Date().toISOString()
  };

  try {
    // 4. Generate 720p HD Rendition
    if (generate720p && sourceHeight >= 720) {
      const out720Path = path.join(tempDir, '720p.mp4');
      const target720Key = `videos/${episodeId}/720p.mp4`;
      onProgress?.(`[1/2] Encoding 720p HD rendition (scale=-2:720, CRF ${crf720}, preset ${preset}, threads ${threads})...`, 25);

      const args720 = [
        '-y',
        '-i', videoUrl,
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf720),
        '-tune', 'animation',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-threads', String(threads),
        out720Path
      ];

      await execFileAsync(ffmpegCmd, args720, { timeout: 1800000 }); // 30 min max

      if (fs.existsSync(out720Path)) {
        const stats = fs.statSync(out720Path);
        const sizeMb = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
        onProgress?.(`Uploading 720p rendition (${sizeMb} MB) to storage...`, 55);

        const fileBuffer = fs.readFileSync(out720Path);
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: target720Key,
          Body: fileBuffer,
          ContentType: 'video/mp4',
          CacheControl: 'public, max-age=31536000, immutable'
        }));

        updatedQualities['720p'] = {
          key: target720Key,
          url: getR2Url(target720Key, 'video'),
          resolution: '1280x720',
          width: 1280,
          height: 720,
          size_bytes: stats.size,
          size_mb: sizeMb,
          created_at: new Date().toISOString()
        };

        onProgress?.(`✓ 720p HD ready (${sizeMb} MB) on CDN`, 60);
      }
    }

    // 5. Generate 480p SD Rendition (Mobile Data-Saver)
    if (generate480p && sourceHeight >= 480) {
      const out480Path = path.join(tempDir, '480p.mp4');
      const target480Key = `videos/${episodeId}/480p.mp4`;
      onProgress?.(`[2/2] Encoding 480p SD Mobile rendition (scale=-2:480, CRF ${crf480}, preset ${preset}, threads ${threads})...`, 65);

      const args480 = [
        '-y',
        '-i', videoUrl,
        '-vf', 'scale=-2:480',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf480),
        '-tune', 'animation',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        '-threads', String(threads),
        out480Path
      ];

      await execFileAsync(ffmpegCmd, args480, { timeout: 1800000 }); // 30 min max

      if (fs.existsSync(out480Path)) {
        const stats = fs.statSync(out480Path);
        const sizeMb = Math.round((stats.size / (1024 * 1024)) * 100) / 100;
        onProgress?.(`Uploading 480p rendition (${sizeMb} MB) to storage...`, 90);

        const fileBuffer = fs.readFileSync(out480Path);
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: target480Key,
          Body: fileBuffer,
          ContentType: 'video/mp4',
          CacheControl: 'public, max-age=31536000, immutable'
        }));

        updatedQualities['480p'] = {
          key: target480Key,
          url: getR2Url(target480Key, 'video'),
          resolution: '854x480',
          width: 854,
          height: 480,
          size_bytes: stats.size,
          size_mb: sizeMb,
          created_at: new Date().toISOString()
        };

        onProgress?.(`✓ 480p SD ready (${sizeMb} MB) on CDN`, 95);
      }
    }

    // 6. Save updated qualities to in-memory store, local disk, and Supabase master
    await updateLocalEpisodeQualities(episodeId, updatedQualities);

    onProgress?.(`✓ Transcode complete for "${episode.title}"! Multi-quality video is live.`, 100);
    return updatedQualities;
  } finally {
    // 7. Always clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}
