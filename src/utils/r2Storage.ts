import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export interface StorageBreakdownItem {
  bytes: number;
  formatted: string;
  count: number;
  percentage: number;
}

export interface R2StorageStats {
  total: StorageBreakdownItem;
  videos: StorageBreakdownItem;
  seriesMedia: StorageBreakdownItem;
  episodeThumbs: StorageBreakdownItem;
  isLiveBucketScan: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Calculates Cloudflare R2 storage usage separated by:
 * 1. Video Episodes (.mp4 / video_keys)
 * 2. Series Posters & Artwork (poster_image_key, cover_image_key, banner_image_key)
 * 3. Episode Thumbnails & Options (thumbnail_key, thumbnail_options)
 */
export async function getR2StorageStats(
  allSeries: any[] = [],
  allEpisodes: any[] = []
): Promise<R2StorageStats> {
  let videoBytes = 0;
  let videoCount = 0;
  let seriesMediaBytes = 0;
  let seriesMediaCount = 0;
  let episodeThumbBytes = 0;
  let episodeThumbCount = 0;
  let isLiveBucketScan = false;

  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

  // Try live bucket object enumeration if credentials exist
  if (bucketName && accessKeyId && secretAccessKey && endpoint) {
    try {
      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      let continuationToken: string | undefined = undefined;
      let totalListed = 0;
      const MAX_OBJECTS_SCAN = 5000;

      do {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const res = await s3.send(command);
        const contents = res.Contents || [];

        for (const item of contents) {
          const key = (item.Key || '').toLowerCase();
          const size = item.Size || 0;

          if (
            key.endsWith('.mp4') ||
            key.endsWith('.mkv') ||
            key.endsWith('.webm') ||
            key.includes('/videos/') ||
            key.includes('episode')
          ) {
            videoBytes += size;
            videoCount++;
          } else if (
            key.includes('thumb') ||
            key.includes('option') ||
            key.includes('ep-') ||
            key.includes('ep_')
          ) {
            episodeThumbBytes += size;
            episodeThumbCount++;
          } else if (
            key.includes('poster') ||
            key.includes('cover') ||
            key.includes('banner') ||
            key.endsWith('.jpg') ||
            key.endsWith('.jpeg') ||
            key.endsWith('.png') ||
            key.endsWith('.webp') ||
            key.endsWith('.avif')
          ) {
            seriesMediaBytes += size;
            seriesMediaCount++;
          } else {
            // General media upload
            seriesMediaBytes += size;
            seriesMediaCount++;
          }
        }

        totalListed += contents.length;
        continuationToken = res.NextContinuationToken;
      } while (continuationToken && totalListed < MAX_OBJECTS_SCAN);

      if (totalListed > 0) {
        isLiveBucketScan = true;
      }
    } catch (r2Err) {
      console.warn('R2 live bucket listing error, falling back to database mapped analytics:', r2Err);
    }
  }

  // If live bucket listing is empty or not permitted, calculate based on database indexed assets
  if (!isLiveBucketScan || (videoBytes === 0 && seriesMediaBytes === 0)) {
    // 1. Episode Videos: average ~280 MB per 1080p anime episode
    const validVideoEpisodes = allEpisodes.filter((e) => e.video_key && e.video_key.trim() !== '');
    videoCount = validVideoEpisodes.length || allEpisodes.length;
    // Estimate based on duration if available (~12 MB per minute of 1080p video)
    videoBytes = validVideoEpisodes.reduce((acc, ep) => {
      const durMins = ep.duration_seconds ? ep.duration_seconds / 60 : 24;
      return acc + Math.round(durMins * 12.5 * 1024 * 1024);
    }, 0);

    // 2. Series Media (Posters, Covers, Banners, Library images): ~350 KB per image
    seriesMediaCount = allSeries.reduce((acc, s) => {
      let count = 0;
      if (s.poster_image_key) count++;
      if (s.cover_image_key) count++;
      if (s.banner_image_key) count++;
      if (Array.isArray(s.image_library)) count += s.image_library.length;
      return acc + (count || 1);
    }, 0);
    seriesMediaBytes = seriesMediaCount * 365 * 1024; // ~365 KB per webp/jpg

    // 3. Episode Thumbnails & Options: ~180 KB per 16:9 thumbnail
    episodeThumbCount = allEpisodes.reduce((acc, ep) => {
      let count = 0;
      if (ep.thumbnail_key) count++;
      if (Array.isArray(ep.thumbnail_options)) count += ep.thumbnail_options.length;
      return acc + (count || 1);
    }, 0);
    episodeThumbBytes = episodeThumbCount * 195 * 1024; // ~195 KB per thumbnail
  }

  const totalBytes = videoBytes + seriesMediaBytes + episodeThumbBytes || 1;

  return {
    total: {
      bytes: totalBytes,
      formatted: formatBytes(totalBytes),
      count: videoCount + seriesMediaCount + episodeThumbCount,
      percentage: 100,
    },
    videos: {
      bytes: videoBytes,
      formatted: formatBytes(videoBytes),
      count: videoCount,
      percentage: Math.max(1, Math.round((videoBytes / totalBytes) * 100)),
    },
    seriesMedia: {
      bytes: seriesMediaBytes,
      formatted: formatBytes(seriesMediaBytes),
      count: seriesMediaCount,
      percentage: Math.max(1, Math.round((seriesMediaBytes / totalBytes) * 100)),
    },
    episodeThumbs: {
      bytes: episodeThumbBytes,
      formatted: formatBytes(episodeThumbBytes),
      count: episodeThumbCount,
      percentage: Math.max(1, Math.round((episodeThumbBytes / totalBytes) * 100)),
    },
    isLiveBucketScan,
  };
}
