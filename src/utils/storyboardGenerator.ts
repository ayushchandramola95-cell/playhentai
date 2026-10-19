import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getLocalCatalog, updateLocalEpisodeStoryboard } from '@/utils/localCatalogStore';

const execFileAsync = promisify(execFile);

export interface VideoProbeInfo {
  fps: number;
  duration: number;
  width: number;
  height: number;
  isInterlaced: boolean;
  pixFmt: string;
}

export interface StoryboardMetadata {
  status: 'completed' | 'failed' | 'pending' | 'missing';
  interval: number; // 1 = 1 frame per second
  sheet_count: number;
  total_frames: number;
  prefix: string;
  generated_at: string;
  fps: number;
  resolution: string;
  size_kb: number;
  error?: string;
}

/**
 * Returns S3 Client configured for S3 (ap-southeast-2) or R2 fallback.
 */
export function getStorageClient(): { s3: S3Client; bucket: string; publicUrl: string } {
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://dmfrlqgigpmty.cloudfront.net';

  // 1. Check AWS S3 explicit credentials (e.g. EC2 / AWS Sydney)
  const awsBucket = process.env.AWS_S3_BUCKET_NAME || 'hentaikage-media';
  const awsRegion = process.env.AWS_REGION || 'ap-southeast-2';
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;

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
    };
  }

  // 2. Check Cloudflare R2 / S3-compatible credentials
  const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const r2Key = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2Secret = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (r2Bucket && r2Endpoint && r2Key && r2Secret) {
    return {
      s3: new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2Key,
          secretAccessKey: r2Secret,
        },
      }),
      bucket: r2Bucket,
      publicUrl,
    };
  }

  // 3. Fallback to EC2 IAM Role default provider chain
  return {
    s3: new S3Client({ region: awsRegion }),
    bucket: awsBucket,
    publicUrl,
  };
}

/**
 * Ensures binary has executable permissions on Linux/Unix systems.
 */
function ensureExecutable(filePath: string): string {
  if (process.platform !== 'win32' && fs.existsSync(filePath)) {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch {}
  }
  return filePath;
}

/**
 * Resolves FFmpeg binary from system, static binaries, environment variable, or PATH
 */
export function getFfmpegBinary(): string {
  // 1. Explicit env var
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return ensureExecutable(process.env.FFMPEG_PATH);
  }

  // 2. Known system paths (installed via mise, apt, brew)
  const systemCandidates = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/bin/ffmpeg',
    '/root/.local/share/mise/installs/ffmpeg/latest/bin/ffmpeg',
    '/home/linuxbrew/.linuxbrew/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
  ];
  for (const candidate of systemCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. ffmpeg-static package
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
      return ensureExecutable(ffmpegStatic);
    }
  } catch {}

  // 4. CWD node_modules fallback
  const cwdCandidates = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  ];
  for (const candidate of cwdCandidates) {
    if (fs.existsSync(candidate)) {
      return ensureExecutable(candidate);
    }
  }

  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

/**
 * Resolves FFprobe binary from system, static binaries, environment variable, or PATH
 */
export function getFfprobeBinary(): string {
  // 1. Explicit env var
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return ensureExecutable(process.env.FFPROBE_PATH);
  }

  // 2. Known system paths
  const systemCandidates = [
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/bin/ffprobe',
    '/root/.local/share/mise/installs/ffmpeg/latest/bin/ffprobe',
    '/home/linuxbrew/.linuxbrew/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
  ];
  for (const candidate of systemCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. ffprobe-static package
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffprobeStatic = require('ffprobe-static');
    if (ffprobeStatic && ffprobeStatic.path && fs.existsSync(ffprobeStatic.path)) {
      return ensureExecutable(ffprobeStatic.path);
    }
  } catch {}

  // 4. CWD fallback
  const cwdCandidates = [
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'linux', 'x64', 'ffprobe'),
    path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe'),
  ];
  for (const candidate of cwdCandidates) {
    if (fs.existsSync(candidate)) {
      return ensureExecutable(candidate);
    }
  }

  return process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
}

/**
 * Runs ffprobe to inspect video stream details (FPS, duration, resolution, interlacing).
 */
export async function probeVideo(videoUrlOrPath: string): Promise<VideoProbeInfo> {
  const ffprobeCmd = getFfprobeBinary();
  
  const args = [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate,avg_frame_rate,width,height,duration,field_order,pix_fmt',
    '-show_entries', 'format=duration',
    '-of', 'json',
    videoUrlOrPath,
  ];

  try {
    const { stdout } = await execFileAsync(ffprobeCmd, args, { timeout: 30000 });
    const data = JSON.parse(stdout);
    const stream = data.streams?.[0] || {};
    const format = data.format || {};

    // Calculate exact FPS (e.g. "24000/1001" -> 23.976)
    let fps = 24;
    const rRate = stream.r_frame_rate || stream.avg_frame_rate;
    if (rRate && typeof rRate === 'string') {
      if (rRate.includes('/')) {
        const [num, den] = rRate.split('/').map(Number);
        if (num && den && den > 0) fps = Math.round((num / den) * 1000) / 1000;
      } else {
        const parsed = parseFloat(rRate);
        if (!isNaN(parsed) && parsed > 0) fps = parsed;
      }
    }

    let duration = parseFloat(stream.duration || format.duration || '0');
    if (isNaN(duration) || duration <= 0) duration = 1200; // default 20 min if unreadable

    const width = stream.width || 1920;
    const height = stream.height || 1080;
    const fieldOrder = stream.field_order || 'progressive';
    const isInterlaced = fieldOrder !== 'progressive' && fieldOrder !== 'unknown';
    const pixFmt = stream.pix_fmt || 'yuv420p';

    return { fps, duration, width, height, isInterlaced, pixFmt };
  } catch (err: any) {
    console.warn(`[StoryboardProbe] ffprobe fallback for ${videoUrlOrPath}:`, err.message);
    return {
      fps: 24,
      duration: 1440,
      width: 1920,
      height: 1080,
      isInterlaced: false,
      pixFmt: 'yuv420p',
    };
  }
}

/**
 * Runs FFmpeg with Lanczos anti-blur scaling and 1-second interval grid tiling.
 */
export async function generateStoryboardLocal(options: {
  videoUrlOrPath: string;
  outputDir: string;
  probeInfo?: VideoProbeInfo;
  onProgress?: (msg: string) => void;
}): Promise<{
  sheetFiles: string[];
  totalFrames: number;
  sheetCount: number;
  interval: number;
}> {
  const { videoUrlOrPath, outputDir, onProgress } = options;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const probe = options.probeInfo || (await probeVideo(videoUrlOrPath));
  onProgress?.(`Probed video: ${probe.width}x${probe.height} @ ${probe.fps}fps, Duration: ${Math.round(probe.duration)}s`);

  const ffmpegCmd = getFfmpegBinary();

  // Build filter chain:
  // 1. fps=1: Exactly 1 frame per second
  // 2. yadif de-interlacing: only if interlaced
  // 3. Lanczos sharp scaling: scale=160:90:flags=lanczos+accurate_rnd (eliminates anime line blur)
  // 4. tile=10x10: 100 frames per sheet
  const filterParts = ['fps=1'];
  if (probe.isInterlaced) {
    filterParts.push('yadif=0:-1:1');
  }
  filterParts.push('scale=160:90:flags=lanczos+accurate_rnd');
  filterParts.push('tile=10x10');
  const vfString = filterParts.join(',');

  const outPattern = path.join(outputDir, 'sheet_%02d.webp');

  const args = [
    '-y',
    '-i', videoUrlOrPath,
    '-vf', vfString,
    '-q:v', '82',
    '-an',
    outPattern,
  ];

  onProgress?.(`Extracting 1-frame-per-second Lanczos storyboard sheets...`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });

  // Collect generated sheets
  const files = fs.readdirSync(outputDir)
    .filter((f) => f.startsWith('sheet_') && f.endsWith('.webp'))
    .sort()
    .map((f) => path.join(outputDir, f));

  const sheetCount = files.length;
  const totalFrames = Math.round(probe.duration);

  onProgress?.(`Successfully generated ${sheetCount} WebP storyboard sheets for ${totalFrames} seconds.`);

  return {
    sheetFiles: files,
    totalFrames,
    sheetCount,
    interval: 1,
  };
}

/**
 * Uploads generated storyboard sheets to S3 / CloudFront with immutable caching.
 */
export async function uploadStoryboardSheets(
  episodeId: string,
  sheetFiles: string[]
): Promise<{ prefix: string; sheetCount: number; totalBytes: number }> {
  const { s3, bucket } = getStorageClient();
  const prefix = `storyboards/${episodeId}`;
  let totalBytes = 0;

  for (let i = 0; i < sheetFiles.length; i++) {
    const filePath = sheetFiles[i];
    const fileName = path.basename(filePath);
    const key = `${prefix}/${fileName}`;
    const fileBuffer = fs.readFileSync(filePath);
    totalBytes += fileBuffer.length;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  }

  return {
    prefix,
    sheetCount: sheetFiles.length,
    totalBytes,
  };
}

/**
 * Complete Coordinator: Probes, Generates, Uploads, and Updates Catalog History.
 */
export async function processEpisodeStoryboard(
  episodeId: string,
  customVideoSource?: string,
  onProgress?: (msg: string) => void
): Promise<StoryboardMetadata> {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (!episode && !customVideoSource) {
    throw new Error(`Episode "${episodeId}" not found in catalog.`);
  }

  // Resolve video URL
  let videoSource = customVideoSource;
  if (!videoSource && episode) {
    const rawKey = episode.video_key || '';
    if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
      videoSource = rawKey;
    } else {
      const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://dmfrlqgigpmty.cloudfront.net';
      videoSource = `${publicUrl.replace(/\/$/, '')}/${rawKey.replace(/^\//, '')}`;
    }
  }

  if (!videoSource) {
    throw new Error(`No video source found for episode "${episodeId}".`);
  }

  const tempDir = path.join(os.tmpdir(), `storyboard_${episodeId}_${Date.now()}`);

  try {
    onProgress?.(`Starting storyboard generation for ${episode?.title || episodeId}...`);
    const probe = await probeVideo(videoSource);

    const { sheetFiles, totalFrames, sheetCount, interval } = await generateStoryboardLocal({
      videoUrlOrPath: videoSource,
      outputDir: tempDir,
      probeInfo: probe,
      onProgress,
    });

    onProgress?.(`Uploading ${sheetCount} sheets to S3 Sydney (ap-southeast-2)...`);
    const { prefix, totalBytes } = await uploadStoryboardSheets(episodeId, sheetFiles);

    const metadata: StoryboardMetadata = {
      status: 'completed',
      interval,
      sheet_count: sheetCount,
      total_frames: totalFrames,
      prefix,
      generated_at: new Date().toISOString(),
      fps: probe.fps,
      resolution: `${probe.width}x${probe.height}`,
      size_kb: Math.round(totalBytes / 1024),
    };

    // Update catalog memory and local disk registry
    await updateLocalEpisodeStoryboard(episodeId, metadata);
    onProgress?.(`Done! Storyboard ready: ${sheetCount} sheets (${metadata.size_kb} KB).`);

    return metadata;
  } catch (err: any) {
    const errorMeta: StoryboardMetadata = {
      status: 'failed',
      interval: 1,
      sheet_count: 0,
      total_frames: 0,
      prefix: '',
      generated_at: new Date().toISOString(),
      fps: 0,
      resolution: '',
      size_kb: 0,
      error: err.message || 'Unknown generation error',
    };
    await updateLocalEpisodeStoryboard(episodeId, errorMeta).catch(() => {});
    throw err;
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}
