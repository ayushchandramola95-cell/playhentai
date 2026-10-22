import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageClientConfig {
  s3: S3Client;
  bucket: string;
  publicUrl: string;
  provider: 'aws-s3' | 'cloudflare-r2' | 'fallback';
}

/**
 * Returns a configured S3Client supporting both standard AWS S3 and Cloudflare R2.
 * Automatically inspects environment variables:
 * - AWS S3: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_REGION
 * - Cloudflare R2: CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_ENDPOINT
 */
export function getStorageClient(): StorageClientConfig {
  const publicUrl =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL ||
    'https://media.hentaikage.cc';

  const awsBucket =
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    'hentaikage-media';

  const awsRegion = process.env.AWS_REGION || 'ap-southeast-2';
  const awsKey = process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  // 1. If explicit AWS S3 is requested or configured
  const preferS3 =
    process.env.STORAGE_PROVIDER === 's3' ||
    process.env.USE_S3 === 'true' ||
    Boolean(process.env.AWS_S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID);

  if (preferS3 && awsKey && awsSecret) {
    return {
      s3: new S3Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsKey,
          secretAccessKey: awsSecret,
        },
      }),
      bucket: awsBucket,
      publicUrl,
      provider: 'aws-s3',
    };
  }

  // 2. Check if explicit Cloudflare R2 endpoint is specified
  if (process.env.CLOUDFLARE_R2_ENDPOINT && process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    return {
      s3: new S3Client({
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || awsKey || '',
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || awsSecret || '',
        },
      }),
      bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      publicUrl,
      provider: 'cloudflare-r2',
    };
  }

  // 3. Check standard AWS S3 credentials
  if (awsKey && awsSecret) {
    return {
      s3: new S3Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsKey,
          secretAccessKey: awsSecret,
        },
      }),
      bucket: awsBucket,
      publicUrl,
      provider: 'aws-s3',
    };
  }

  // 4. Fallback to default IAM role / AWS environment
  return {
    s3: new S3Client({ region: awsRegion }),
    bucket: awsBucket,
    publicUrl,
    provider: 'fallback',
  };
}

/**
 * Deletes a single object from S3/R2 storage by key
 */
export async function deleteStorageObject(key: string): Promise<boolean> {
  if (!key || key.startsWith('http://') || key.startsWith('https://')) {
    return true; // Ignore external URLs
  }

  try {
    const { s3, bucket } = getStorageClient();
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    await s3.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
    }));
    return true;
  } catch (err: any) {
    console.error(`[StorageDelete] Failed to delete key "${key}":`, err.message);
    return false;
  }
}

/**
 * Deletes multiple objects in a single batch from S3/R2 storage
 */
export async function deleteStorageObjects(keys: string[]): Promise<number> {
  const validKeys = keys
    .filter((k) => k && !k.startsWith('http://') && !k.startsWith('https://'))
    .map((k) => (k.startsWith('/') ? k.slice(1) : k));

  if (validKeys.length === 0) return 0;

  try {
    const { s3, bucket } = getStorageClient();
    const chunks: string[][] = [];
    const chunkSize = 1000;

    for (let i = 0; i < validKeys.length; i += chunkSize) {
      chunks.push(validKeys.slice(i, i + chunkSize));
    }

    let deletedCount = 0;
    for (const chunk of chunks) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
      deletedCount += chunk.length;
    }

    return deletedCount;
  } catch (err: any) {
    console.error('[StorageDeleteBatch] Error batch deleting keys:', err.message);
    // Fallback: delete sequentially
    let count = 0;
    for (const k of validKeys) {
      const ok = await deleteStorageObject(k);
      if (ok) count++;
    }
    return count;
  }
}

/**
 * Deletes all objects matching a prefix (e.g. "videos/ep-123/" or "storyboards/ep-123/")
 */
export async function deleteStoragePrefix(prefix: string): Promise<number> {
  if (!prefix || prefix.trim() === '') return 0;

  try {
    const { s3, bucket } = getStorageClient();
    const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;

    let continuationToken: string | undefined = undefined;
    const keysToDelete: string[] = [];

    do {
      const listRes: any = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: cleanPrefix,
          ContinuationToken: continuationToken,
        })
      );

      if (listRes.Contents) {
        for (const item of listRes.Contents) {
          if (item.Key) keysToDelete.push(item.Key);
        }
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    if (keysToDelete.length > 0) {
      return await deleteStorageObjects(keysToDelete);
    }

    return 0;
  } catch (err: any) {
    console.error(`[StorageDeletePrefix] Error deleting prefix "${prefix}":`, err.message);
    return 0;
  }
}
