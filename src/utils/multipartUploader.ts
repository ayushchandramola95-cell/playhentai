export interface UploadProgressEvent {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedMBps: number;
  etaSeconds: number;
  currentPart?: number;
  totalParts?: number;
  stage: 'initializing' | 'uploading' | 'assembling' | 'complete' | 'error';
}

export interface MultipartUploadOptions {
  file: File;
  chunkSize?: number; // bytes per chunk, default 10MB
  concurrency?: number; // parallel chunk streams, default 3
  onProgress?: (progress: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_CONCURRENCY = 3;

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
 * High-Speed Parallel Multipart Uploader for Cloudflare R2 / AWS S3
 * Automatically chunks large files into parallel streams and combines into 1 intact file on R2.
 */
export async function uploadFileWithMultipart(options: MultipartUploadOptions): Promise<string> {
  const {
    file,
    chunkSize = DEFAULT_CHUNK_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    signal,
  } = options;

  // Single-Shot Direct Presigned PUT for files <= 10MB (images, posters, small clips)
  if (file.size <= chunkSize) {
    return uploadSinglePresigned(file, onProgress, signal);
  }

  // --- PARALLEL MULTIPART UPLOAD FOR LARGE VIDEOS (10MB+) ---
  const totalParts = Math.ceil(file.size / chunkSize);

  onProgress?.({
    percent: 0,
    loadedBytes: 0,
    totalBytes: file.size,
    speedMBps: 0,
    etaSeconds: 0,
    currentPart: 0,
    totalParts,
    stage: 'initializing',
  });

  // Step 1: Initialize Multipart Upload on R2
  const initRes = await fetch('/api/admin/upload/multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'init',
      filename: file.name,
      contentType: file.type || 'video/mp4',
    }),
    signal,
  });

  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize multipart upload');

  const { uploadId, key } = initData;

  // Step 2: Request presigned URLs for all parts in parallel
  const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

  const signRes = await fetch('/api/admin/upload/multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sign-parts',
      key,
      uploadId,
      partNumbers,
    }),
    signal,
  });

  const signData = await signRes.json();
  if (!signRes.ok) throw new Error(signData.error || 'Failed to sign multipart upload chunks');

  const signedPartsMap = new Map<number, string>();
  signData.parts.forEach((p: { partNumber: number; url: string }) => {
    signedPartsMap.set(p.partNumber, p.url);
  });

  // Telemetry trackers
  const partBytesLoaded = new Map<number, number>();
  const completedParts: { PartNumber: number; ETag: string }[] = [];
  const activeXHRs = new Set<XMLHttpRequest>();

  let startTime = Date.now();
  let lastReportTime = 0;
  let smoothedSpeedMBps = 0;

  const emitProgress = (force = false) => {
    const now = Date.now();
    if (!force && now - lastReportTime < 250) return; // 4 FPS render throttle
    lastReportTime = now;

    let totalLoaded = 0;
    partBytesLoaded.forEach((b) => (totalLoaded += b));
    totalLoaded = Math.min(file.size, totalLoaded);

    const elapsedSeconds = Math.max(0.1, (now - startTime) / 1000);
    const instantSpeedMBps = (totalLoaded / (1024 * 1024)) / elapsedSeconds;
    smoothedSpeedMBps = smoothedSpeedMBps === 0 ? instantSpeedMBps : smoothedSpeedMBps * 0.7 + instantSpeedMBps * 0.3;

    const remainingBytes = Math.max(0, file.size - totalLoaded);
    const speedBytesPerSec = smoothedSpeedMBps * 1024 * 1024;
    const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;
    const percent = Math.min(99, Math.round((totalLoaded / file.size) * 100));

    onProgress?.({
      percent,
      loadedBytes: totalLoaded,
      totalBytes: file.size,
      speedMBps: Math.round(smoothedSpeedMBps * 100) / 100,
      etaSeconds,
      currentPart: completedParts.length,
      totalParts,
      stage: 'uploading',
    });
  };

  // Upload a single chunk with retry mechanism
  const uploadChunk = async (partNumber: number): Promise<{ PartNumber: number; ETag: string }> => {
    const startByte = (partNumber - 1) * chunkSize;
    const endByte = Math.min(file.size, startByte + chunkSize);
    const chunkBlob = file.slice(startByte, endByte);
    const presignedUrl = signedPartsMap.get(partNumber);

    if (!presignedUrl) throw new Error(`Missing presigned URL for part ${partNumber}`);

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      if (signal?.aborted) throw new Error('Upload aborted by user');

      try {
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXHRs.add(xhr);

          if (signal) {
            signal.addEventListener('abort', () => {
              xhr.abort();
              reject(new Error('Upload aborted by user'));
            });
          }

          xhr.open('PUT', presignedUrl, true);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              partBytesLoaded.set(partNumber, event.loaded);
              emitProgress();
            }
          };

          xhr.onload = () => {
            activeXHRs.delete(xhr);
            if (xhr.status === 200 || xhr.status === 204 || xhr.status === 201) {
              // Extract ETag header from R2 response
              let etagHeader = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '';
              // Fallback for mocked uploads if etag isn't provided
              if (!etagHeader) {
                etagHeader = `"${Date.now()}-${partNumber}"`;
              }
              partBytesLoaded.set(partNumber, chunkBlob.size);
              emitProgress();
              resolve(etagHeader);
            } else {
              reject(new Error(`Part ${partNumber} failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            activeXHRs.delete(xhr);
            reject(new Error(`Network error on part ${partNumber}`));
          };

          xhr.onabort = () => {
            activeXHRs.delete(xhr);
            reject(new Error('Upload aborted'));
          };

          xhr.send(chunkBlob);
        });

        return { PartNumber: partNumber, ETag: etag };
      } catch (err: any) {
        attempt++;
        if (attempt >= maxAttempts || signal?.aborted) {
          throw err;
        }
        // Exponential backoff retry
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error(`Failed to upload part ${partNumber} after ${maxAttempts} attempts`);
  };

  // Step 3: Concurrency Worker Pool to upload chunks in parallel
  try {
    const queue = [...partNumbers];
    const workers = Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
      while (queue.length > 0) {
        if (signal?.aborted) throw new Error('Upload aborted by user');
        const partNumber = queue.shift();
        if (partNumber === undefined) break;
        const result = await uploadChunk(partNumber);
        completedParts.push(result);
      }
    });

    await Promise.all(workers);

    // Step 4: Assemble and Complete Multipart Upload on R2
    onProgress?.({
      percent: 99,
      loadedBytes: file.size,
      totalBytes: file.size,
      speedMBps: smoothedSpeedMBps,
      etaSeconds: 0,
      currentPart: totalParts,
      totalParts,
      stage: 'assembling',
    });

    const completeRes = await fetch('/api/admin/upload/multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        key,
        uploadId,
        parts: completedParts,
      }),
      signal,
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error || 'Failed to complete multipart assembly on R2');

    onProgress?.({
      percent: 100,
      loadedBytes: file.size,
      totalBytes: file.size,
      speedMBps: smoothedSpeedMBps,
      etaSeconds: 0,
      currentPart: totalParts,
      totalParts,
      stage: 'complete',
    });

    return key;
  } catch (err: any) {
    // Abort active XHRs
    activeXHRs.forEach((xhr) => xhr.abort());

    // Clean up multipart upload on R2
    try {
      await fetch('/api/admin/upload/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abort',
          key,
          uploadId,
        }),
      });
    } catch (abortErr) {
      console.warn('Failed to clean up aborted upload on R2:', abortErr);
    }

    onProgress?.({
      percent: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      speedMBps: 0,
      etaSeconds: 0,
      stage: 'error',
    });

    throw err;
  }
}

/**
 * Direct Single Presigned PUT (for files <= 10MB like thumbnails, posters)
 */
async function uploadSinglePresigned(
  file: File,
  onProgress?: (progress: UploadProgressEvent) => void,
  signal?: AbortSignal
): Promise<string> {
  onProgress?.({
    percent: 0,
    loadedBytes: 0,
    totalBytes: file.size,
    speedMBps: 0,
    etaSeconds: 0,
    stage: 'initializing',
  });

  const presignRes = await fetch('/api/admin/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
    signal,
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || 'Failed to initialize direct upload');

  const { url, key } = presignData;
  const startTime = Date.now();
  let lastReportTime = 0;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload aborted by user'));
      });
    }

    xhr.open('PUT', url, true);
    if (file.type) {
      xhr.setRequestHeader('Content-Type', file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        if (now - lastReportTime < 200) return;
        lastReportTime = now;

        const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
        const speedMBps = (event.loaded / (1024 * 1024)) / elapsedSec;
        const remainingBytes = Math.max(0, event.total - event.loaded);
        const speedBytes = speedMBps * 1024 * 1024;
        const etaSeconds = speedBytes > 0 ? Math.round(remainingBytes / speedBytes) : 0;
        const pct = Math.round((event.loaded / event.total) * 100);

        onProgress?.({
          percent: Math.min(99, pct),
          loadedBytes: event.loaded,
          totalBytes: event.total,
          speedMBps: Math.round(speedMBps * 100) / 100,
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
          speedMBps: 0,
          etaSeconds: 0,
          stage: 'complete',
        });
        resolve(key);
      } else {
        reject(new Error(`Upload failed with status code ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));
    xhr.send(file);
  });
}
