'use client';

import React, { useState, useRef } from 'react';
import {
  FileText, UploadCloud, CheckCircle2, AlertCircle, Trash2,
  Eye, RefreshCw, Sparkles, X
} from 'lucide-react';
import { convertSrtToVtt, parseSubtitleText, SubtitleCue } from '@/utils/subtitleParser';
import { getR2Url } from '@/utils/r2';
import styles from './SubtitleUploader.module.css';

interface SubtitleUploaderProps {
  initialKey?: string;
  onUploadComplete: (key: string, url: string) => void;
  onClear: () => void;
  episodeTitle?: string;
}

export default function SubtitleUploader({
  initialKey = '',
  onUploadComplete,
  onClear,
  episodeTitle,
}: SubtitleUploaderProps) {
  const [currentKey, setCurrentKey] = useState<string>(initialKey);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [detectedCues, setDetectedCues] = useState<SubtitleCue[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; cueCount: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialKey changes from parent (e.g. when opening a different episode edit modal)
  React.useEffect(() => {
    setCurrentKey(initialKey || '');
  }, [initialKey]);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleProcessFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(15);

    try {
      const fileNameLower = file.name.toLowerCase();
      const isSrt = fileNameLower.endsWith('.srt');
      const isVtt = fileNameLower.endsWith('.vtt');

      if (!isSrt && !isVtt && !fileNameLower.endsWith('.ass') && !fileNameLower.endsWith('.txt')) {
        throw new Error('Unsupported subtitle format. Please upload a .vtt or .srt file.');
      }

      // Read file content
      const rawText = await file.text();
      setProgress(35);

      // Normalize into clean WebVTT
      const vttContent = isSrt ? convertSrtToVtt(rawText) : rawText;
      const parsedCues = parseSubtitleText(vttContent);

      if (parsedCues.length === 0) {
        throw new Error('No valid subtitle dialogue cues could be parsed from this file.');
      }

      setDetectedCues(parsedCues);
      setFileDetails({
        name: file.name,
        size: formatFileSize(file.size),
        cueCount: parsedCues.length,
      });

      setProgress(55);

      // Create standardized VTT Blob to upload
      const vttBlob = new Blob([vttContent], { type: 'text/vtt; charset=utf-8' });
      const cleanBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uploadFilename = `subtitles/${Date.now()}-${cleanBaseName}.vtt`;

      // Request S3 presigned URL
      const presignRes = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFilename,
          contentType: 'text/vtt',
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error || 'Failed to get subtitle upload signature.');
      }

      setProgress(75);

      // Upload directly to S3 / Cloudflare R2
      const uploadRes = await fetch(presignData.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
        },
        body: vttBlob,
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload subtitle file to storage (${uploadRes.status}).`);
      }

      setProgress(100);
      const newKey = presignData.key || uploadFilename;
      const publicUrl = getR2Url(newKey);

      setCurrentKey(newKey);
      onUploadComplete(newKey, publicUrl);
    } catch (err: any) {
      console.error('[SubtitleUploader] Upload error:', err);
      setError(err.message || 'Error processing subtitle file.');
    } finally {
      setUploading(false);
    }
  };

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
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setCurrentKey('');
    setFileDetails(null);
    setDetectedCues([]);
    setShowPreview(false);
    onClear();
  };

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <label className={styles.label}>
          <FileText size={16} color="#a855f7" />
          <span>English Subtitle File (Closed Captions)</span>
        </label>
        <span className={styles.optionalBadge}>Optional • .vtt / .srt</span>
      </div>

      {/* When a subtitle is already uploaded / assigned */}
      {currentKey ? (
        <div className={styles.currentSubCard}>
          <div className={styles.subInfoLeft}>
            <div className={styles.subIconBox}>
              <CheckCircle2 size={18} />
            </div>
            <div className={styles.subMeta}>
              <div className={styles.subFilename} title={currentKey}>
                {fileDetails?.name || currentKey.split('/').pop() || 'English Subtitles (WebVTT)'}
              </div>
              <div className={styles.subDetails}>
                <span style={{ color: '#34d399', fontWeight: 700 }}>● Active in Player</span>
                {fileDetails?.cueCount ? (
                  <>
                    <span>•</span>
                    <span>{fileDetails.cueCount} Cues</span>
                  </>
                ) : null}
                <span>•</span>
                <span style={{ color: '#c084fc' }}>CC En</span>
              </div>
            </div>
          </div>

          <div className={styles.subActions}>
            {detectedCues.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={styles.actionBtn}
                title="Preview dialogue cues"
              >
                <Eye size={12} />
                <span>{showPreview ? 'Hide Cues' : 'Preview'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.actionBtn}
              title="Replace subtitle file"
            >
              <RefreshCw size={12} />
              <span>Replace</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              title="Remove subtitle from episode"
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Dropzone for Uploading New Subtitle */
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div style={{ width: '100%', padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <RefreshCw size={16} className="animate-spin" color="#a855f7" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  Processing & Uploading Subtitles ({progress}%)...
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className={styles.dropIcon} />
              <div>
                <div className={styles.dropTitle}>
                  Upload English Subtitles (.vtt or .srt)
                </div>
                <div className={styles.dropHint}>
                  Drag & drop here or click to browse. SRT files are automatically converted to standard WebVTT.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".vtt,.srt,.ass,.txt,text/vtt,application/x-subrip"
        onChange={handleFileChange}
        className={styles.fileInput}
      />

      {/* Error alert */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Optional Cue Preview Drawer */}
      {showPreview && detectedCues.length > 0 && (
        <div className={styles.cuePreviewDrawer}>
          <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: '0.2rem' }}>
            First Dialogue Lines Preview ({detectedCues.length} total cues):
          </div>
          {detectedCues.slice(0, 5).map((cue) => (
            <div key={cue.id} className={styles.cueItem}>
              <span className={styles.cueTime}>[{formatTime(cue.start)} → {formatTime(cue.end)}]</span>
              <span className={styles.cueText}>{cue.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
