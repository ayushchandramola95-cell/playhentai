'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud, X, Trash2, Film, CheckCircle2, AlertCircle,
  Play, RefreshCw, ShieldCheck, ArrowRight, Zap, Check
} from 'lucide-react';
import { uploadFileWithMultipart, formatUploadBytes, UploadProgressEvent } from '@/utils/multipartUploader';
import { getR2Url } from '@/utils/r2';
import styles from './ReplaceVideoModal.module.css';

interface ReplaceVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  episode: {
    id: string;
    title: string;
    episode_number: number;
    video_key?: string;
    duration_seconds?: number;
    seasonTitle?: string;
    seriesTitle?: string;
    seriesSlug?: string;
  } | null;
}

export default function ReplaceVideoModal({
  isOpen,
  onClose,
  onSuccess,
  episode,
}: ReplaceVideoModalProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deletingOnly, setDeletingOnly] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [speedMBps, setSpeedMBps] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number>(0);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen || !episode) return null;

  const currentVideoUrl = episode.video_key ? getR2Url(episode.video_key, 'video') : null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragover' || e.type === 'dragenter') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || /\.(mp4|mkv|webm|mov)$/i.test(file.name)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a valid video file (MP4, MKV, WebM, MOV).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
    }
  };

  // Action 1: Delete current video only (preserving episode box)
  const handleDeleteVideoOnly = async () => {
    if (!confirm(`Are you sure you want to delete the video file for "${episode.title}" from S3?\n\nThe episode box, title, number, views, and comments will remain completely intact, but the video stream will be removed until a new one is uploaded.`)) {
      return;
    }

    setDeletingOnly(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/episodes/replace-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          deleteOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete video file.');

      setSuccessMsg('Video file successfully purged from S3. Episode box preserved.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error deleting video file.');
    } finally {
      setDeletingOnly(false);
    }
  };

  // Action 2: Upload new 1080p replacement video and swap
  const handleUploadAndReplace = async () => {
    if (!selectedFile) {
      setError('Please choose a replacement video file first.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setSpeedMBps(0);
    setEtaSeconds(0);
    setError(null);
    setSuccessMsg(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 1. Direct High-Speed S3 Multipart Upload
      const uploadedKey = await uploadFileWithMultipart({
        file: selectedFile,
        concurrency: 3,
        signal: abortController.signal,
        onProgress: (p: UploadProgressEvent) => {
          setProgress(p.percent);
          setSpeedMBps(p.speedMBps);
          setEtaSeconds(p.etaSeconds);
          setLoadedBytes(p.loadedBytes);
          setTotalBytes(p.totalBytes);
        },
      });

      // 2. Call Replace API to swap video_key in episode and purge old S3 files
      const replaceRes = await fetch('/api/admin/episodes/replace-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          newVideoKey: uploadedKey,
          deleteOnly: false,
        }),
      });

      const replaceData = await replaceRes.json();
      if (!replaceRes.ok) throw new Error(replaceData.error || 'Failed to link new video to episode.');

      setSuccessMsg('✓ Video successfully replaced! Old S3 files purged. FFprobe background probe started.');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      if (err.message !== 'Upload cancelled by user') {
        setError(err.message || 'An error occurred while uploading replacement video.');
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBox}>
              <Film size={22} />
            </div>
            <div>
              <h2 className={styles.modalTitle}>Replace Video Stream</h2>
              <div className={styles.modalSubtitle}>
                {episode.seriesTitle ? `${episode.seriesTitle} • ` : ''}Ep {episode.episode_number}: {episode.title}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className={styles.closeBtn}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Preservation Banner */}
          <div className={styles.preservationBanner}>
            <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Episode Box & Metadata Preserved:</strong> Replacing or deleting this video will keep the episode title, description, episode number, views, watch history, and comments 100% intact. Only the underlying media file in S3 will be updated.
            </div>
          </div>

          {/* Current Video File Card */}
          <div className={styles.currentVideoCard}>
            <div className={styles.currentVideoHeader}>
              <span>Current Video in S3</span>
              <span style={{ color: episode.video_key ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                {episode.video_key ? '● Stream Assigned' : '○ No Stream (Empty)'}
              </span>
            </div>

            {episode.video_key ? (
              <>
                <div className={styles.currentVideoKeyRow}>
                  <code className={styles.currentVideoKey}>{episode.video_key}</code>
                </div>

                <div className={styles.currentVideoActions}>
                  {currentVideoUrl && (
                    <a
                      href={currentVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.btnSecondaryOutline}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Test Current Stream</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteVideoOnly}
                    disabled={deletingOnly || uploading}
                    className={styles.btnDangerOutline}
                    title="Delete current video from S3 without uploading a replacement"
                  >
                    {deletingOnly ? <RefreshCw size={12} className={styles.spinner} /> : <Trash2 size={12} />}
                    <span>{deletingOnly ? 'Deleting from S3...' : 'Delete Video Only (Keep Box)'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                This episode currently has no video stream assigned. Upload a 1080p video below to activate it.
              </div>
            )}
          </div>

          {/* Upload New Replacement Video Section */}
          <div className={styles.uploadSection}>
            <div className={styles.sectionTitle}>
              <UploadCloud size={15} style={{ color: '#38bdf8' }} />
              <span>Upload New 1080p Replacement Video</span>
            </div>

            {!selectedFile ? (
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mkv,.webm,.mov"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className={styles.uploadIconBox}>
                  <UploadCloud size={24} />
                </div>
                <h4 className={styles.uploadTitle}>
                  Drag & Drop replacement video here, or <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>browse</span>
                </h4>
                <p className={styles.uploadSub}>
                  Direct S3 Multipart streaming • Supports MP4, MKV, WebM (up to 10GB+)
                </p>
              </div>
            ) : (
              <div className={styles.selectedFileCard}>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{selectedFile.name}</div>
                  <div className={styles.fileMeta}>
                    {formatUploadBytes(selectedFile.size)} • Ready to upload to S3
                  </div>
                </div>

                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title="Choose different file"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Live Upload Progress */}
            {uploading && (
              <div className={styles.progressBox}>
                <div className={styles.progressHeader}>
                  <span>Uploading to S3 Bucket...</span>
                  <strong style={{ color: '#38bdf8' }}>{progress}%</strong>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                </div>

                <div className={styles.progressTelemetry}>
                  <span>
                    {formatUploadBytes(loadedBytes)} / {formatUploadBytes(totalBytes)} ({speedMBps} MB/s)
                  </span>
                  <span>
                    {etaSeconds > 0 ? `${etaSeconds}s remaining` : 'Finalizing...'}
                  </span>
                </div>
              </div>
            )}

            {/* Error & Success Banners */}
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {uploading ? (
            <button
              type="button"
              onClick={handleCancelUpload}
              className={styles.btnDangerOutline}
            >
              Cancel Upload
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={styles.btnCancel}
            >
              Close
            </button>
          )}

          <button
            type="button"
            onClick={handleUploadAndReplace}
            disabled={!selectedFile || uploading}
            className={styles.btnSubmit}
          >
            {uploading ? (
              <>
                <RefreshCw size={14} className={styles.spinner} />
                <span>Streaming to S3 ({progress}%)...</span>
              </>
            ) : (
              <>
                <UploadCloud size={15} />
                <span>Upload & Replace Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
