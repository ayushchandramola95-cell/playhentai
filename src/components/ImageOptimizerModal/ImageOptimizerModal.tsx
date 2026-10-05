'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sparkles, Sliders, Zap, Check, CheckCircle2, Image as ImageIcon, 
  Layers, Download, Maximize2, RotateCcw, Trash2, ArrowRight, 
  UploadCloud, X, AlertCircle, Filter, ArrowDownUp, RefreshCw, FileText, FolderUp
} from 'lucide-react';
import styles from './ImageOptimizerModal.module.css';

export interface OptimizedResultItem {
  key: string;
  filename: string;
  sizeBytes: number;
  format: string;
}

export interface ImageOptimizerModalProps {
  isOpen: boolean;
  files: File[];
  onClose: () => void;
  onUploadComplete: (keys: string[], items: OptimizedResultItem[]) => void;
  targetType?: 'poster' | 'cover' | 'thumbnail' | 'general';
  seoSlug?: string;
  maxSizeMb?: number;
}

interface ImageCardItem {
  id: string;
  originalFile: File;
  previewUrl: string;
  originalFormat: 'png' | 'jpeg' | 'webp' | 'gif' | 'other';
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  // Controls
  targetFormat: 'image/webp' | 'image/jpeg' | 'image/png' | 'original';
  targetQuality: number;
  targetMaxDimension: number; // 0 = original
  // Processed Output
  optimizedBlob: Blob | null;
  optimizedPreviewUrl: string | null;
  optimizedSize: number | null;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  isProcessing: boolean;
  customFilename: string;
}

export default function ImageOptimizerModal({
  isOpen,
  files,
  onClose,
  onUploadComplete,
  targetType = 'thumbnail',
  seoSlug,
  maxSizeMb = 15
}: ImageOptimizerModalProps) {
  const [items, setItems] = useState<ImageCardItem[]>([]);
  const [filterFormat, setFilterFormat] = useState<'all' | 'png' | 'jpeg' | 'webp' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'size' | 'format' | 'name' | 'dimensions'>('size');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Global Batch Controls
  const [globalFormat, setGlobalFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png' | 'original'>('image/webp');
  const [globalQuality, setGlobalQuality] = useState<number>(0.88);
  const [globalDimension, setGlobalDimension] = useState<number>(0); // 0 = original
  const [seoNamingPrefix, setSeoNamingPrefix] = useState<string>(seoSlug || '');
  const [applySeoNames, setApplySeoNames] = useState<boolean>(true);

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatFromType = (type: string, name: string): 'png' | 'jpeg' | 'webp' | 'gif' | 'other' => {
    const t = type.toLowerCase();
    const n = name.toLowerCase();
    if (t.includes('png') || n.endsWith('.png')) return 'png';
    if (t.includes('jpeg') || t.includes('jpg') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpeg';
    if (t.includes('webp') || n.endsWith('.webp')) return 'webp';
    if (t.includes('gif') || n.endsWith('.gif')) return 'gif';
    return 'other';
  };

  // Convert and resize an image via HTML5 Canvas
  const processImageBlob = useCallback(async (
    file: File,
    targetMime: 'image/webp' | 'image/jpeg' | 'image/png' | 'original',
    quality: number,
    maxDim: number
  ): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        const width = img.naturalWidth || img.width || 1280;
        const height = img.naturalHeight || img.height || 720;

        // If keeping original, bypass canvas encoding completely
        if (targetMime === 'original') {
          resolve({ blob: file, width, height, previewUrl: objectUrl });
          return;
        }

        let targetW = width;
        let targetH = height;

        // Apply max dimension constraint preserving aspect ratio
        if (maxDim > 0) {
          if (targetW > targetH && targetW > maxDim) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else if (targetH >= targetW && targetH > maxDim) {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { alpha: targetMime === 'image/png' });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to create canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Failed to encode image to target format'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          resolve({ blob, width: targetW, height: targetH, previewUrl });
        }, targetMime, quality);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load image: ${file.name}`));
      };
    });
  }, []);

  // Initialize items from raw incoming files
  useEffect(() => {
    if (!isOpen || files.length === 0) {
      setItems([]);
      return;
    }

    let active = true;

    const initItems = async () => {
      const initialCards: ImageCardItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const format = getFormatFromType(file.type, file.name);
        const previewUrl = URL.createObjectURL(file);

        // Read intrinsic dimensions
        const { width, height } = await new Promise<{ width: number; height: number }>((res) => {
          const tempImg = new Image();
          tempImg.src = previewUrl;
          tempImg.onload = () => res({ width: tempImg.naturalWidth, height: tempImg.naturalHeight });
          tempImg.onerror = () => res({ width: 1920, height: 1080 });
        });

        // Determine SEO name
        const cleanSlug = (seoNamingPrefix || 'image')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const autoName = files.length > 1
          ? `${cleanSlug}-${String(i + 1).padStart(2, '0')}.webp`
          : `${cleanSlug}-${targetType || 'media'}.webp`;

        initialCards.push({
          id: `item-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          originalFile: file,
          previewUrl,
          originalFormat: format,
          originalSize: file.size,
          originalWidth: width,
          originalHeight: height,
          targetFormat: globalFormat,
          targetQuality: globalQuality,
          targetMaxDimension: globalDimension,
          optimizedBlob: null,
          optimizedPreviewUrl: null,
          optimizedSize: null,
          optimizedWidth: null,
          optimizedHeight: null,
          isProcessing: true,
          customFilename: autoName
        });
      }

      if (!active) return;
      setItems(initialCards);

      // Trigger optimization for all items in batch
      initialCards.forEach(async (card) => {
        try {
          const res = await processImageBlob(
            card.originalFile,
            card.targetFormat,
            card.targetQuality,
            card.targetMaxDimension
          );
          if (!active) return;
          setItems((prev) =>
            prev.map((it) =>
              it.id === card.id
                ? {
                    ...it,
                    optimizedBlob: res.blob,
                    optimizedPreviewUrl: res.previewUrl,
                    optimizedSize: res.blob.size,
                    optimizedWidth: res.width,
                    optimizedHeight: res.height,
                    isProcessing: false
                  }
                : it
            )
          );
        } catch (e) {
          if (!active) return;
          setItems((prev) =>
            prev.map((it) => (it.id === card.id ? { ...it, isProcessing: false } : it))
          );
        }
      });
    };

    initItems();

    return () => {
      active = false;
    };
  }, [isOpen, files, processImageBlob]);

  // Bulk Apply Settings to All Items
  const applyGlobalSettingsToAll = (
    nextFormat = globalFormat,
    nextQuality = globalQuality,
    nextDim = globalDimension
  ) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetFormat: nextFormat,
        targetQuality: nextQuality,
        targetMaxDimension: nextDim,
        isProcessing: true
      }))
    );

    // Re-process all items
    items.forEach(async (item) => {
      try {
        const res = await processImageBlob(item.originalFile, nextFormat, nextQuality, nextDim);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  targetFormat: nextFormat,
                  targetQuality: nextQuality,
                  targetMaxDimension: nextDim,
                  optimizedBlob: res.blob,
                  optimizedPreviewUrl: res.previewUrl,
                  optimizedSize: res.blob.size,
                  optimizedWidth: res.width,
                  optimizedHeight: res.height,
                  isProcessing: false
                }
              : it
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isProcessing: false } : it))
        );
      }
    });
  };

  // Update Individual Item Settings
  const updateItemSettings = async (
    id: string,
    updates: Partial<Pick<ImageCardItem, 'targetFormat' | 'targetQuality' | 'targetMaxDimension' | 'customFilename'>>
  ) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const nextFormat = updates.targetFormat || target.targetFormat;
    const nextQuality = updates.targetQuality !== undefined ? updates.targetQuality : target.targetQuality;
    const nextDim = updates.targetMaxDimension !== undefined ? updates.targetMaxDimension : target.targetMaxDimension;

    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, ...updates, isProcessing: true } : i
      )
    );

    try {
      const res = await processImageBlob(target.originalFile, nextFormat, nextQuality, nextDim);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                ...updates,
                optimizedBlob: res.blob,
                optimizedPreviewUrl: res.previewUrl,
                optimizedSize: res.blob.size,
                optimizedWidth: res.width,
                optimizedHeight: res.height,
                isProcessing: false
              }
            : i
        )
      );
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isProcessing: false } : i))
      );
    }
  };

  // Remove Item from queue
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Filter & Sort Items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter
    if (filterFormat !== 'all') {
      result = result.filter((i) => i.originalFormat === filterFormat);
    }

    // Sort
    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'size') {
        comp = a.originalSize - b.originalSize;
      } else if (sortBy === 'format') {
        comp = a.originalFormat.localeCompare(b.originalFormat);
      } else if (sortBy === 'name') {
        comp = a.originalFile.name.localeCompare(b.originalFile.name);
      } else if (sortBy === 'dimensions') {
        comp = (a.originalWidth * a.originalHeight) - (b.originalWidth * b.originalHeight);
      }
      return sortOrder === 'desc' ? -comp : comp;
    });

    return result;
  }, [items, filterFormat, sortBy, sortOrder]);

  // Aggregate Batch Telemetry
  const telemetry = useMemo(() => {
    const totalOriginal = items.reduce((sum, i) => sum + i.originalSize, 0);
    const totalOptimized = items.reduce((sum, i) => sum + (i.optimizedSize || i.originalSize), 0);
    const savedBytes = Math.max(0, totalOriginal - totalOptimized);
    const pctSaved = totalOriginal > 0 ? Math.round((savedBytes / totalOriginal) * 100) : 0;
    return {
      totalOriginal,
      totalOptimized,
      savedBytes,
      pctSaved
    };
  }, [items]);

  // Counts by format
  const formatCounts = useMemo(() => {
    const counts = { all: items.length, png: 0, jpeg: 0, webp: 0, other: 0 };
    items.forEach((i) => {
      if (i.originalFormat === 'png') counts.png++;
      else if (i.originalFormat === 'jpeg') counts.jpeg++;
      else if (i.originalFormat === 'webp') counts.webp++;
      else counts.other++;
    });
    return counts;
  }, [items]);

  // Upload All Optimized Images to R2
  const handleUploadAllToR2 = async () => {
    if (items.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: items.length });

    const uploadedKeys: string[] = [];
    const uploadedDetails: OptimizedResultItem[] = [];

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadProgress({ current: i + 1, total: items.length });

        const isOriginal = item.targetFormat === 'original';
        const blobToUpload = isOriginal ? item.originalFile : (item.optimizedBlob || item.originalFile);
        const mimeType = isOriginal ? (item.originalFile.type || 'image/jpeg') : (item.targetFormat || 'image/webp');
        const originalExt = item.originalFile.name.split('.').pop() || 'jpg';
        const ext = isOriginal ? originalExt : (mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg');

        // Prepare clean filename
        let baseFilename = isOriginal
          ? item.originalFile.name
          : (item.customFilename || `upload-${Date.now()}-${i}.${ext}`);
        if (!baseFilename.toLowerCase().endsWith(`.${ext}`)) {
          baseFilename = baseFilename.replace(/\.[^/.]+$/, '') + `.${ext}`;
        }

        // 1. Get presigned R2 upload URL
        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: baseFilename, contentType: mimeType })
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error || `Failed to get signature for ${baseFilename}`);

        const { url: r2PutUrl, key } = presignData;

        // 2. Put binary to Cloudflare R2
        const uploadRes = await fetch(r2PutUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blobToUpload
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload ${baseFilename} to Cloudflare R2`);

        uploadedKeys.push(key);
        uploadedDetails.push({
          key,
          filename: baseFilename,
          sizeBytes: blobToUpload.size,
          format: ext.toUpperCase()
        });
      }

      onUploadComplete(uploadedKeys, uploadedDetails);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Direct Upload Original Images as-is (Bypass conversion & compression)
  const handleUploadOriginalToR2 = async () => {
    if (items.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: items.length });

    const uploadedKeys: string[] = [];
    const uploadedDetails: OptimizedResultItem[] = [];

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadProgress({ current: i + 1, total: items.length });

        const blobToUpload = item.originalFile;
        const mimeType = item.originalFile.type || 'image/jpeg';
        const baseFilename = item.originalFile.name;

        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: baseFilename, contentType: mimeType })
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error || `Failed to get signature for ${baseFilename}`);

        const { url: r2PutUrl, key } = presignData;

        const uploadRes = await fetch(r2PutUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blobToUpload
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload ${baseFilename} to Cloudflare R2`);

        uploadedKeys.push(key);
        uploadedDetails.push({
          key,
          filename: baseFilename,
          sizeBytes: blobToUpload.size,
          format: (baseFilename.split('.').pop() || 'IMG').toUpperCase()
        });
      }

      onUploadComplete(uploadedKeys, uploadedDetails);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Original upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className={styles.headerTitle}>Image Processing & Optimization Studio</h3>
              <p className={styles.headerSubtitle}>
                Sort by format, convert to lightweight WebP, compress and clean metadata before saving to Cloudflare R2.
              </p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} title="Close Studio">
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {uploadError && (
          <div style={{ margin: '0.75rem 1.75rem 0', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontSize: '0.8rem' }}>
            <AlertCircle size={16} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Control Hub */}
        <div className={styles.controlHub}>
          {/* Row 1: Format Categorization Tabs & Sorting */}
          <div className={styles.controlRow}>
            {/* Format Filter Pills */}
            <div className={styles.filterPills}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.2rem' }}>
                <Filter size={12} style={{ display: 'inline', marginRight: '4px' }} />
                FORMATS:
              </span>
              <button
                type="button"
                onClick={() => setFilterFormat('all')}
                className={`${styles.filterPill} ${filterFormat === 'all' ? styles.filterPillActive : ''}`}
              >
                All <span className={styles.filterCount}>{formatCounts.all}</span>
              </button>
              {formatCounts.png > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterFormat('png')}
                  className={`${styles.filterPill} ${filterFormat === 'png' ? styles.filterPillActive : ''}`}
                >
                  PNG <span className={styles.filterCount}>{formatCounts.png}</span>
                </button>
              )}
              {formatCounts.jpeg > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterFormat('jpeg')}
                  className={`${styles.filterPill} ${filterFormat === 'jpeg' ? styles.filterPillActive : ''}`}
                >
                  JPG <span className={styles.filterCount}>{formatCounts.jpeg}</span>
                </button>
              )}
              {formatCounts.webp > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterFormat('webp')}
                  className={`${styles.filterPill} ${filterFormat === 'webp' ? styles.filterPillActive : ''}`}
                >
                  WebP <span className={styles.filterCount}>{formatCounts.webp}</span>
                </button>
              )}
              {formatCounts.other > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterFormat('other')}
                  className={`${styles.filterPill} ${filterFormat === 'other' ? styles.filterPillActive : ''}`}
                >
                  Other <span className={styles.filterCount}>{formatCounts.other}</span>
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                <ArrowDownUp size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={styles.settingSelect}
                style={{ width: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
              >
                <option value="size">File Size</option>
                <option value="format">Format Type</option>
                <option value="dimensions">Dimensions</option>
                <option value="name">File Name</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className={styles.actionBtnSecondary}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem' }}
                title="Toggle sort direction"
              >
                {sortOrder === 'desc' ? '▼ Desc' : '▲ Asc'}
              </button>
            </div>
          </div>

          {/* Row 2: Global Batch Optimization Toolbar */}
          <div className={styles.toolSettingsGrid}>
            {/* Target Format */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <span>Target Format</span>
              </label>
              <select
                value={globalFormat}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setGlobalFormat(val);
                  applyGlobalSettingsToAll(val, globalQuality, globalDimension);
                }}
                className={styles.settingSelect}
              >
                <option value="image/webp">🌟 WebP (.webp - Recommended)</option>
                <option value="original">📁 Keep Original (No Conversion / No Compression)</option>
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png Lossless)</option>
              </select>
            </div>

            {/* Quality Preset */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <span>Quality / Compression</span>
              </label>
              <select
                value={globalQuality}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setGlobalQuality(val);
                  applyGlobalSettingsToAll(globalFormat, val, globalDimension);
                }}
                className={styles.settingSelect}
              >
                <option value={0.88}>⚡ Balanced 88% (Anime Sweet Spot)</option>
                <option value={0.96}>💎 Ultra HD 96% (Near Lossless)</option>
                <option value={0.78}>📱 Compact 78% (Fast Mobile Loading)</option>
                <option value={0.65}>🚀 High Compression 65%</option>
              </select>
            </div>

            {/* Max Dimension */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>
                <span>Resolution Clamp</span>
              </label>
              <select
                value={globalDimension}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setGlobalDimension(val);
                  applyGlobalSettingsToAll(globalFormat, globalQuality, val);
                }}
                className={styles.settingSelect}
              >
                <option value={0}>Original Dimensions (No Resize)</option>
                <option value={1920}>1080p Full HD (Max 1920px)</option>
                <option value={1280}>720p HD (Max 1280px)</option>
                <option value={900}>Poster Standard (Max 900px)</option>
                <option value={600}>Thumbnail Mini (Max 600px)</option>
              </select>
            </div>

            {/* Quick Batch Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label className={styles.settingLabel}>
                <span>Quick Batch Actions</span>
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setGlobalFormat('image/webp');
                    setGlobalQuality(0.88);
                    applyGlobalSettingsToAll('image/webp', 0.88, globalDimension);
                  }}
                  className={styles.actionBtn}
                  style={{ flex: 1, justifyContent: 'center' }}
                  title="Convert all images to optimized WebP"
                >
                  <Zap size={14} />
                  <span>Convert All to WebP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGlobalFormat('original');
                    applyGlobalSettingsToAll('original', globalQuality, 0);
                  }}
                  className={styles.actionBtnSecondary}
                  style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}
                  title="Keep all images in their original untouched format without compression"
                >
                  <span>📁 Keep Original</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Live Telemetry Savings Banner */}
          <div className={styles.telemetryBanner}>
            <div className={styles.telemetryText}>
              <CheckCircle2 size={16} />
              <span>
                Original: <b>{formatBytes(telemetry.totalOriginal)}</b> ➔ Optimized:{' '}
                <b>{formatBytes(telemetry.totalOptimized)}</b>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className={styles.telemetryBadge}>
                {telemetry.pctSaved}% Bandwidth Saved ({formatBytes(telemetry.savedBytes)})
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {items.length} images queued
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body / Items Grid */}
        <div className={styles.modalBody}>
          <div className={styles.itemsGrid}>
            {filteredAndSortedItems.map((item) => {
              const isWebp = item.targetFormat === 'image/webp';
              const sizeDiff = (item.originalSize - (item.optimizedSize || item.originalSize));
              const pctSaved = Math.round((sizeDiff / item.originalSize) * 100);

              return (
                <div key={item.id} className={styles.imageCard}>
                  {/* Top Preview */}
                  <div className={styles.previewContainer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.optimizedPreviewUrl || item.previewUrl}
                      alt={item.originalFile.name}
                      className={styles.previewImage}
                    />

                    {/* Top Badges */}
                    <div className={styles.cardTopBadges}>
                      <span className={styles.badgeOriginal}>
                        {item.originalFormat}
                      </span>
                      <span className={styles.badgeTarget} style={item.targetFormat === 'original' ? { background: '#3b82f6', boxShadow: 'none' } : {}}>
                        {item.targetFormat === 'original' ? 'ORIGINAL' : `➔ ${item.targetFormat.replace('image/', '')}`}
                      </span>
                    </div>

                    {/* Hover Overlay Controls */}
                    <div className={styles.overlayTools}>
                      <button
                        type="button"
                        onClick={() =>
                          setZoomImage({
                            url: item.optimizedPreviewUrl || item.previewUrl,
                            title: item.customFilename
                          })
                        }
                        className={styles.overlayBtn}
                        title="Zoom Inspection"
                      >
                        <Maximize2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className={styles.overlayBtn}
                        style={{ color: '#f87171' }}
                        title="Remove from batch"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className={styles.cardFooter}>
                    <div className={styles.filenameRow}>
                      <span className={styles.fileName} title={item.originalFile.name}>
                        {item.customFilename || item.originalFile.name}
                      </span>
                      <span className={styles.dimensionLabel}>
                        {item.optimizedWidth || item.originalWidth}×
                        {item.optimizedHeight || item.originalHeight}
                      </span>
                    </div>

                    {/* Before vs After Telemetry */}
                    <div className={styles.comparisonRow}>
                      {item.targetFormat === 'original' ? (
                        <>
                          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{formatBytes(item.originalSize)}</span>
                          <span className={styles.sizeSavingBadge} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                            Original (Uncompressed)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={styles.sizeOriginal}>
                            {formatBytes(item.originalSize)}
                          </span>
                          <span style={{ color: '#64748b' }}>➔</span>
                          <span className={styles.sizeOptimized}>
                            {item.isProcessing ? 'Encoding...' : formatBytes(item.optimizedSize || item.originalSize)}
                          </span>
                          {pctSaved > 0 && !item.isProcessing && (
                            <span className={styles.sizeSavingBadge}>
                              -{pctSaved}%
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Individual Override Controls */}
                    <div className={styles.cardSettingsRow}>
                      <select
                        value={item.targetFormat}
                        onChange={(e) => updateItemSettings(item.id, { targetFormat: e.target.value as any })}
                        className={styles.miniSelect}
                      >
                        <option value="image/webp">WebP</option>
                        <option value="original">Keep Original</option>
                        <option value="image/jpeg">JPG</option>
                        <option value="image/png">PNG</option>
                      </select>

                      <select
                        value={item.targetQuality}
                        onChange={(e) => updateItemSettings(item.id, { targetQuality: parseFloat(e.target.value) })}
                        className={styles.miniSelect}
                      >
                        <option value={0.88}>Quality 88%</option>
                        <option value={0.96}>Quality 96%</option>
                        <option value={0.78}>Quality 78%</option>
                        <option value={0.65}>Quality 65%</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom / Action Bar */}
        <div className={styles.modalFooter}>
          <div className={styles.footerStats}>
            <span>
              Ready to upload: <b style={{ color: '#f8fafc' }}>{items.length}</b> optimized images (
              <b style={{ color: '#10b981' }}>{formatBytes(telemetry.totalOptimized)}</b> total)
            </span>
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.actionBtnSecondary}
              disabled={isUploading}
            >
              Cancel
            </button>

            {/* Direct Upload Original Files (Uncompressed & Untouched) */}
            <button
              type="button"
              onClick={handleUploadOriginalToR2}
              disabled={isUploading || items.length === 0}
              className={styles.uploadOriginalBtn}
              title="Upload all original files directly without any conversion or compression"
            >
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <FolderUp size={16} />
                  <span>Upload {items.length} Original (No Changes)</span>
                </>
              )}
            </button>

            {/* Upload Optimized Images */}
            <button
              type="button"
              onClick={handleUploadAllToR2}
              disabled={isUploading || items.length === 0}
              className={styles.uploadSubmitBtn}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>
                    Uploading {uploadProgress?.current} / {uploadProgress?.total}...
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload {items.length} Optimized Images to R2</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fullscreen Zoom Preview */}
        {zoomImage && (
          <div className={styles.zoomOverlay} onClick={() => setZoomImage(null)}>
            <button
              type="button"
              className={styles.zoomCloseBtn}
              onClick={() => setZoomImage(null)}
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomImage.url} alt={zoomImage.title} className={styles.zoomImg} />
            <div style={{ marginTop: '0.85rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}>
              {zoomImage.title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
