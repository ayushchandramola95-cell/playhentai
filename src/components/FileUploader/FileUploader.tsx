'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, X, AlertCircle } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onUploadComplete: (key: string) => void;
  onClear?: (clearedKey?: string) => void;
  onFileSelect?: (file: File) => void;
  acceptedTypes?: string;
  maxSizeMb?: number;
  label?: string;
  initialValue?: string;
  previewType?: 'poster' | 'cover' | 'banner' | 'thumbnail' | 'video' | 'avatar';
  multiple?: boolean;
}

export default function FileUploader({
  onUploadComplete,
  onClear,
  onFileSelect,
  acceptedTypes = 'image/*',
  maxSizeMb = 10,
  label,
  initialValue,
  previewType,
  multiple = false
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedKey, setUploadedKey] = useState<string | null>(initialValue || null);
  const [filename, setFilename] = useState<string | null>(initialValue ? initialValue.split('/').pop() || null : null);
  
  useEffect(() => {
    setUploadedKey(initialValue || null);
    setFilename(initialValue ? initialValue.split('/').pop() || null : null);
  }, [initialValue]);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const uploadQueue = async (files: File[]) => {
    setUploading(true);
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`File ${file.name} exceeds limit of ${maxSizeMb}MB.`);
        continue;
      }
      
      // Basic type validation
      const typeRegex = new RegExp(acceptedTypes.replace('*', '.*'));
      if (!typeRegex.test(file.type) && acceptedTypes !== '*/*') {
        setError(`Invalid type for ${file.name}. Allowed: ${acceptedTypes}`);
        continue;
      }

      setFilename(`[${i + 1}/${files.length}] ${file.name}`);
      setFileSize(formatBytes(file.size));
      setProgress(0);

      try {
        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type
          })
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error || 'Failed to initialize upload');

        const { url, key } = presignData;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', file.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204 || xhr.status === 201) {
              onUploadComplete(key);
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name} (Status: ${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}`));
          xhr.send(file);
        });

      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        break;
      }
    }
    setUploading(false);
    setProgress(0);
    setFilename(null);
    setFileSize(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple) {
        uploadQueue(Array.from(e.dataTransfer.files));
      } else {
        validateAndUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        uploadQueue(Array.from(e.target.files));
      } else {
        validateAndUpload(e.target.files[0]);
      }
    }
  };

  const validateAndUpload = (file: File) => {
    setError(null);
    
    // Validate file size
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size exceeds limit of ${maxSizeMb}MB.`);
      return;
    }

    // Simple type check (Next.js file input wildcard validation fallback)
    const typeRegex = new RegExp(acceptedTypes.replace('*', '.*'));
    if (!typeRegex.test(file.type) && acceptedTypes !== '*/*') {
      setError(`Invalid file type. Allowed: ${acceptedTypes}`);
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setFilename(file.name);
    setFileSize(formatBytes(file.size));

    try {
      // 1. Get presigned R2 upload URL
      const presignRes = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || 'Failed to initialize upload');

      const { url, key } = presignData;

      // 2. Perform direct upload using XMLHttpRequest for progress events
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(pct);
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204 || xhr.status === 201) {
          setUploadedKey(key);
          onUploadComplete(key);
        } else {
          setError(`Upload failed with status code: ${xhr.status}`);
          setFilename(null);
        }
        setUploading(false);
      };

      // Handle errors
      xhr.onerror = () => {
        setError('Network error occurred during file upload.');
        setFilename(null);
        setUploading(false);
      };

      // Send the file binary
      xhr.send(file);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setFilename(null);
      setUploading(false);
    }
  };

  const handleClear = async () => {
    // Abort active upload if running
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    const keyToDelete = uploadedKey;

    setUploadedKey(null);
    setFilename(null);
    setFileSize(null);
    setProgress(0);
    setError(null);
    
    if (inputRef.current) inputRef.current.value = '';

    // Delete physically from R2 bucket when user clicks clear (X) button
    if (keyToDelete) {
      try {
        await fetch('/api/admin/delete-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: keyToDelete })
        });
      } catch (err) {
        console.error(`Failed to delete R2 file "${keyToDelete}":`, err);
      }
    }

    if (onClear) onClear(keyToDelete || undefined);
  };

  return (
    <div className={styles.uploader}>
      {label && <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>{label}</label>}

      {/* Uploading Progress */}
      {uploading && (
        <div className={styles.uploadingState}>
          <div className={styles.progressHeader}>
            <span className={styles.filename}>{filename}</span>
            <span className={styles.percent}>{progress}%</span>
          </div>
          <div className={styles.track}>
            <div className={styles.bar} style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.sizeText}>{fileSize}</span>
            <button type="button" onClick={handleClear} className={styles.clearBtn} style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, background: 'none', border: 'none', padding: 0 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Uploaded */}
      {!uploading && uploadedKey && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
          <div className={styles.successState}>
            <div className={styles.successInfo}>
              <CheckCircle size={16} />
              <span className={styles.successFilename}>{filename || uploadedKey}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(Uploaded)</span>
            </div>
            <button type="button" onClick={handleClear} className={styles.clearBtn} title="Remove File">
              <X size={16} />
            </button>
          </div>

          {previewType && previewType !== 'video' && (
            <div style={{
              position: 'relative',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-hover)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: previewType === 'poster' ? '120px' : previewType === 'cover' ? '240px' : '100%',
              height: previewType === 'poster' ? '180px' : previewType === 'cover' ? '135px' : '120px',
              transition: 'all 0.2s ease',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getR2Url(uploadedKey, previewType)}
                alt={`${label || 'Uploaded'} preview`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Dropzone Area */}
      {!uploading && !uploadedKey && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            style={{ display: 'none' }}
            accept={acceptedTypes}
            multiple={multiple}
            onChange={handleFileChange}
          />
          <UploadCloud size={32} className={styles.icon} />
          <div className={styles.title}>Drag & drop file or click to browse</div>
          <div className={styles.subtitle}>
            Max file size {maxSizeMb}MB. Supported: {acceptedTypes}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
