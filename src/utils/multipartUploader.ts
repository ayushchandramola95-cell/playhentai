export interface UploadProgressEvent {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedMBps: number;
  etaSeconds: number;
  currentPart?: number;
  totalParts?: number;
  stage: 'initializing' | 'uploading' | 'complete' | 'error';
}

export interface MultipartUploadOptions {
  file: File;
  chunkSize?: number;
  concurrency?: number;
  onProgress?: (progress: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * Format bytes into human readable string (e.g., 12.4 MB)
 */
export function formatUploadBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Direct High-Speed Cloudflare R2 Uploader with Real-Time Telemetry
 * Bypasses Vercel/Next.js proxy limits completely by uploading straight to Cloudflare R2 storage.
 * Works seamlessly with files of any size (100MB to 5GB+).
 */
export async function uploadFileWithMultipart(options: MultipartUploadOptions): Promise<string> {
  const { file, onProgress, signal } = options;

  onProgress?.({
    percent: 0,
    loadedBytes: 0,
    totalBytes: file.size,
    speedMBps: 0,
    etaSeconds: 0,
    stage: 'initializing',
  });

  // Step 1: Request S3 Presigned Upload Signature for Cloudflare R2
  const presignRes = await fetch('/api/admin/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'video/mp4',
    }),
    signal,
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || 'Failed to initialize upload signature');

  const { url, key } = presignData;

  const startTime = Date.now();
  let lastReportTime = 0;
  let smoothedSpeedMBps = 0;

  // Step 2: Stream file directly from browser to Cloudflare R2 via XMLHttpRequest with progress tracking
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled by user'));
      });
    }

    xhr.open('PUT', url, true);
    if (file.type) {
      try {
        xhr.setRequestHeader('Content-Type', file.type);
      } catch (_) {}
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        // 4 FPS render throttle (every 250ms) to avoid locking React rendering
        if (now - lastReportTime < 250 && event.loaded < event.total) return;
        lastReportTime = now;

        const elapsedSeconds = Math.max(0.1, (now - startTime) / 1000);
        const instantSpeedMBps = (event.loaded / (1024 * 1024)) / elapsedSeconds;
        smoothedSpeedMBps = smoothedSpeedMBps === 0 ? instantSpeedMBps : smoothedSpeedMBps * 0.7 + instantSpeedMBps * 0.3;

        const remainingBytes = Math.max(0, event.total - event.loaded);
        const speedBytesPerSec = smoothedSpeedMBps * 1024 * 1024;
        const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));

        onProgress?.({
          percent,
          loadedBytes: event.loaded,
          totalBytes: event.total,
          speedMBps: Math.round(smoothedSpeedMBps * 100) / 100,
          etaSeconds,
          stage: 'uploading',
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 204 || xhr.status === 201) {
        onProgress?.({
          percent: 100,
          loadedBytes: file.size,
          totalBytes: file.size,
          speedMBps: smoothedSpeedMBps,
          etaSeconds: 0,
          stage: 'complete',
        });
        resolve(key);
      } else {
        onProgress?.({
          percent: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          speedMBps: 0,
          etaSeconds: 0,
          stage: 'error',
        });
        let responseDetail = xhr.statusText || 'R2 Storage Rejection';
        try {
          if (xhr.responseText) responseDetail += ` - ${xhr.responseText.substring(0, 200)}`;
        } catch (_) {}
        reject(new Error(`Upload failed (Status: ${xhr.status} ${responseDetail})`));
      }
    };

    xhr.onerror = () => {
      onProgress?.({
        percent: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        speedMBps: 0,
        etaSeconds: 0,
        stage: 'error',
      });
      reject(new Error('Network error during video upload. Please check your internet connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled'));
    };

    // Send binary payload straight to R2
    xhr.send(file);
  });
}
