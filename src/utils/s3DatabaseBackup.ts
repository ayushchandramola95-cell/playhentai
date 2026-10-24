import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getStorageClient } from './s3Storage';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'local_catalog.json');
const USERS_FILE = path.join(DATA_DIR, 'users_store.json');

let debounceCatalogTimer: NodeJS.Timeout | null = null;
let debounceUsersTimer: NodeJS.Timeout | null = null;

/**
 * Uploads a JSON payload or local file to AWS S3 Sydney under the database-backups/ prefix.
 */
export async function uploadDatabaseBackupToS3(keyName: string, jsonContent: string | Buffer): Promise<boolean> {
  try {
    const { s3, bucket } = getStorageClient();
    const buffer = Buffer.isBuffer(jsonContent) ? jsonContent : Buffer.from(jsonContent, 'utf-8');

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: keyName,
      Body: buffer,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'no-cache, no-store, must-revalidate',
    }));

    return true;
  } catch (err: any) {
    console.error(`[S3BackupEngine] Failed to upload ${keyName} to S3:`, err.message);
    return false;
  }
}

/**
 * Downloads a database backup JSON object from AWS S3 Sydney.
 */
export async function downloadDatabaseBackupFromS3(keyName: string): Promise<any | null> {
  try {
    const { s3, bucket } = getStorageClient();
    const res = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: keyName,
    }));

    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err: any) {
    console.warn(`[S3BackupEngine] Could not download ${keyName} from S3:`, err.message);
    return null;
  }
}

/**
 * Backs up the entire anime catalog (series, seasons, episodes, collections) to S3 Sydney.
 */
export async function backupCatalogToS3(): Promise<{ success: boolean; key: string; sizeMb: number }> {
  if (!fs.existsSync(CATALOG_FILE)) {
    throw new Error('Local catalog file does not exist on disk.');
  }

  const content = fs.readFileSync(CATALOG_FILE);
  const sizeMb = Math.round((content.length / (1024 * 1024)) * 100) / 100;
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Upload latest pointer
  const latestKey = 'database-backups/catalog_latest.json';
  await uploadDatabaseBackupToS3(latestKey, content);

  // 2. Upload timestamped snapshot
  const snapshotKey = `database-backups/catalog_${dateStr}.json`;
  await uploadDatabaseBackupToS3(snapshotKey, content);

  console.log(`[S3BackupEngine] Catalog backup completed: ${latestKey} (${sizeMb} MB)`);
  return { success: true, key: latestKey, sizeMb };
}

/**
 * Restores the local catalog from S3 Sydney if the local disk file is missing or empty.
 */
export async function restoreCatalogFromS3(): Promise<any | null> {
  console.log('[S3BackupEngine] Attempting to restore catalog from S3 Sydney...');
  const data = await downloadDatabaseBackupFromS3('database-backups/catalog_latest.json');

  if (data && Array.isArray(data.series) && data.series.length > 0) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[S3BackupEngine] Successfully restored catalog from S3 (${data.series.length} series, ${data.episodes?.length || 0} episodes)!`);
    return data;
  }

  console.warn('[S3BackupEngine] S3 catalog backup was empty or not found.');
  return null;
}

/**
 * Triggers a debounced catalog backup (5 seconds delay) so rapid edits don't spam S3.
 */
export function triggerDebouncedCatalogBackup() {
  if (debounceCatalogTimer) clearTimeout(debounceCatalogTimer);
  debounceCatalogTimer = setTimeout(() => {
    backupCatalogToS3().catch((err) =>
      console.warn('[S3BackupEngine] Background catalog backup warning:', err.message)
    );
  }, 5000);
}

/**
 * Backs up the local user database to S3 Sydney.
 */
export async function backupUsersToS3(): Promise<{ success: boolean; count: number }> {
  if (!fs.existsSync(USERS_FILE)) {
    return { success: true, count: 0 };
  }

  const content = fs.readFileSync(USERS_FILE);
  const dateStr = new Date().toISOString().split('T')[0];

  await uploadDatabaseBackupToS3('database-backups/users_latest.json', content);
  await uploadDatabaseBackupToS3(`database-backups/users_${dateStr}.json`, content);

  const parsed = JSON.parse(content.toString('utf-8'));
  const count = Array.isArray(parsed) ? parsed.length : Array.isArray(parsed.users) ? parsed.users.length : 0;
  console.log(`[S3BackupEngine] Users backup completed (${count} users)`);
  return { success: true, count };
}

/**
 * Restores the local user database from S3 Sydney if the local disk file is missing.
 */
export async function restoreUsersFromS3(): Promise<any | null> {
  console.log('[S3BackupEngine] Checking for user database backup in S3...');
  const data = await downloadDatabaseBackupFromS3('database-backups/users_latest.json');

  if (data) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[S3BackupEngine] User database restored from S3!');
    return data;
  }

  return null;
}

/**
 * Triggers a debounced users backup (5 seconds delay).
 */
export function triggerDebouncedUsersBackup() {
  if (debounceUsersTimer) clearTimeout(debounceUsersTimer);
  debounceUsersTimer = setTimeout(() => {
    backupUsersToS3().catch((err) =>
      console.warn('[S3BackupEngine] Background users backup warning:', err.message)
    );
  }, 5000);
}

/**
 * Lists all database backup snapshots available in S3.
 */
export async function listS3Backups(): Promise<any[]> {
  try {
    const { s3, bucket } = getStorageClient();
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'database-backups/',
    }));

    if (!res.Contents) return [];

    return res.Contents.map((obj) => ({
      key: obj.Key,
      name: path.basename(obj.Key || ''),
      sizeBytes: obj.Size || 0,
      sizeMb: Math.round(((obj.Size || 0) / (1024 * 1024)) * 100) / 100,
      lastModified: obj.LastModified?.toISOString() || '',
    })).sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (err: any) {
    console.error('[S3BackupEngine] Failed to list S3 backups:', err.message);
    return [];
  }
}
