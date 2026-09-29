'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  UploadCloud, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Copy, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Tag, 
  Building2, 
  ArrowRight,
  Plus,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import styles from './ImageTagExtractorModal.module.css';

export interface ImageTagExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (genres: string[], studios: string[], mode: 'append' | 'replace') => void;
  currentGenres?: string;
  currentStudios?: string;
}

interface UploadedImageItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

interface MergedNote {
  original: string;
  merged_into: string;
}

export interface CustomGeminiKey {
  id: string;
  nickname: string;
  key: string;
}

export default function ImageTagExtractorModal({
  isOpen,
  onClose,
  onApply,
  currentGenres = '',
  currentStudios = ''
}: ImageTagExtractorModalProps) {
  const [images, setImages] = useState<UploadedImageItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Key management state
  const [customKeys, setCustomKeys] = useState<CustomGeminiKey[]>([]);
  const [activeKeyId, setActiveKeyId] = useState<string>('default');
  const [isKeyPanelOpen, setIsKeyPanelOpen] = useState(false);
  const [newKeyNickname, setNewKeyNickname] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updateServerEnv, setUpdateServerEnv] = useState(true);
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestFeedback, setKeyTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [extractedGenres, setExtractedGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  const [extractedStudios, setExtractedStudios] = useState<string[]>([]);
  const [selectedStudios, setSelectedStudios] = useState<Set<string>>(new Set());

  const [mergedNotes, setMergedNotes] = useState<MergedNote[]>([]);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [customGenreInput, setCustomGenreInput] = useState('');
  const [showAddCustomGenre, setShowAddCustomGenre] = useState(false);

  const [customStudioInput, setCustomStudioInput] = useState('');
  const [showAddCustomStudio, setShowAddCustomStudio] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync keys from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedKeys = localStorage.getItem('admin_gemini_keys');
        if (storedKeys) {
          setCustomKeys(JSON.parse(storedKeys));
        }
        const activeId = localStorage.getItem('admin_gemini_active_key_id');
        if (activeId) {
          setActiveKeyId(activeId);
        }
      } catch (e) {
        console.error('Failed to load Gemini keys in ImageTagExtractorModal:', e);
      }
    }
  }, [isOpen]);

  // Resolve the active API key string
  const getActiveApiKeyString = useCallback((): string => {
    if (activeKeyId === 'default') return '';
    const found = customKeys.find(k => k.id === activeKeyId);
    return found ? found.key : '';
  }, [activeKeyId, customKeys]);

  const handleSelectKey = (keyId: string) => {
    setActiveKeyId(keyId);
    localStorage.setItem('admin_gemini_active_key_id', keyId);
    setError(null);
    setIsKeyError(false);
  };

  const handleSaveCustomKey = async (overrideKey?: string) => {
    const rawVal = (overrideKey !== undefined ? overrideKey : newKeyValue).trim();
    if (!rawVal) {
      setKeyTestFeedback({ success: false, message: 'Please enter a valid API key string.' });
      return;
    }

    const nickname = (newKeyNickname.trim() || `Key (${rawVal.slice(0, 6)}...)`);
    const newKeyItem: CustomGeminiKey = {
      id: 'key-' + Date.now(),
      nickname,
      key: rawVal
    };

    const updated = [...customKeys, newKeyItem];
    setCustomKeys(updated);
    localStorage.setItem('admin_gemini_keys', JSON.stringify(updated));
    handleSelectKey(newKeyItem.id);

    // If updateServerEnv is checked, save to server .env.local
    if (updateServerEnv) {
      try {
        await fetch('/api/admin/extract-tags-from-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_key',
            apiKey: rawVal
          })
        });
      } catch (err) {
        console.warn('Could not update server .env key:', err);
      }
    }

    setNewKeyNickname('');
    setNewKeyValue('');
    setKeyTestFeedback({ success: true, message: `✓ Saved and activated "${nickname}"!` });
    setError(null);
    setIsKeyError(false);
    setTimeout(() => setKeyTestFeedback(null), 3000);
  };

  const handleDeleteKey = (keyId: string) => {
    const updated = customKeys.filter(k => k.id !== keyId);
    setCustomKeys(updated);
    localStorage.setItem('admin_gemini_keys', JSON.stringify(updated));
    if (activeKeyId === keyId) {
      handleSelectKey('default');
    }
  };

  const handleTestKey = async () => {
    const keyToTest = newKeyValue.trim() || getActiveApiKeyString();
    setTestingKey(true);
    setKeyTestFeedback(null);

    try {
      const res = await fetch('/api/admin/extract-tags-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_key',
          apiKey: keyToTest,
          updateEnv: updateServerEnv && !!newKeyValue.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setKeyTestFeedback({ success: true, message: data.message || '✓ Gemini API key is valid and working!' });
      } else {
        setKeyTestFeedback({ success: false, message: `❌ ${data.error || 'Key validation failed'}` });
      }
    } catch (err: any) {
      setKeyTestFeedback({ success: false, message: `❌ ${err.message || 'Network test error'}` });
    } finally {
      setTestingKey(false);
    }
  };

  // Helper to read files as data URLs
  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    setIsKeyError(false);
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Please upload valid image files (PNG, JPG, WebP, etc.).');
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setImages(prev => [
            ...prev,
            {
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name || 'Pasted screenshot',
              size: file.size,
              dataUrl
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Listen for Clipboard Paste (Ctrl+V) anywhere while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
        setStatusMessage(`Pasted ${imageFiles.length} image(s) from clipboard!`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleClearAllImages = () => {
    setImages([]);
    setError(null);
    setIsKeyError(false);
  };

  // Perform AI Extraction & Normalization
  const handleExtract = async () => {
    if (images.length === 0) {
      setError('Please upload or paste at least one image/screenshot first.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setIsKeyError(false);
    setStatusMessage('Analyzing images with Gemini Vision & deduplicating tags...');

    const activeKeyStr = getActiveApiKeyString();

    try {
      const res = await fetch('/api/admin/extract-tags-from-image', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(activeKeyStr ? { 'x-gemini-api-key': activeKeyStr } : {})
        },
        body: JSON.stringify({
          images: images.map(img => img.dataUrl),
          apiKey: activeKeyStr
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isKeyError || data.error?.toLowerCase().includes('api key')) {
          setIsKeyError(true);
          setIsKeyPanelOpen(true);
        }
        throw new Error(data.error || 'Failed to extract tags from images.');
      }

      const genres: string[] = data.genres || [];
      const studios: string[] = data.studios || [];
      const notes: MergedNote[] = data.merged_notes || [];

      setExtractedGenres(genres);
      setSelectedGenres(new Set(genres));

      setExtractedStudios(studios);
      setSelectedStudios(new Set(studios));

      setMergedNotes(notes);
      setModelUsed(data.model_used || null);

      setStatusMessage(`Successfully extracted ${genres.length} genres and ${studios.length} studios!`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const toggleStudio = (studio: string) => {
    setSelectedStudios(prev => {
      const next = new Set(prev);
      if (next.has(studio)) next.delete(studio);
      else next.add(studio);
      return next;
    });
  };

  const selectAllGenres = () => setSelectedGenres(new Set(extractedGenres));
  const deselectAllGenres = () => setSelectedGenres(new Set());

  const selectAllStudios = () => setSelectedStudios(new Set(extractedStudios));
  const deselectAllStudios = () => setSelectedStudios(new Set());

  const handleAddCustomGenre = () => {
    const val = customGenreInput.trim();
    if (!val) return;
    if (!extractedGenres.includes(val)) {
      setExtractedGenres(prev => [...prev, val]);
    }
    setSelectedGenres(prev => new Set(prev).add(val));
    setCustomGenreInput('');
    setShowAddCustomGenre(false);
  };

  const handleAddCustomStudio = () => {
    const val = customStudioInput.trim();
    if (!val) return;
    if (!extractedStudios.includes(val)) {
      setExtractedStudios(prev => [...prev, val]);
    }
    setSelectedStudios(prev => new Set(prev).add(val));
    setCustomStudioInput('');
    setShowAddCustomStudio(false);
  };

  const handleCopyGenres = () => {
    const text = Array.from(selectedGenres).join(', ');
    navigator.clipboard.writeText(text);
    setCopyFeedback('Genres copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyStudios = () => {
    const text = Array.from(selectedStudios).join(', ');
    navigator.clipboard.writeText(text);
    setCopyFeedback('Studios copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleApply = () => {
    if (!onApply) return;
    const finalGenres = Array.from(selectedGenres);
    const finalStudios = Array.from(selectedStudios);
    onApply(finalGenres, finalStudios, applyMode);
    onClose();
  };

  if (!isOpen) return null;

  // Active key label
  const activeKeyObj = customKeys.find(k => k.id === activeKeyId);
  const activeKeyDisplay = activeKeyId === 'default' 
    ? 'Server Default (.env)' 
    : (activeKeyObj ? `${activeKeyObj.nickname} (${activeKeyObj.key.slice(0, 6)}...)` : 'Custom Key');

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modalCard} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Camera size={20} />
            </div>
            <div>
              <h3 className={styles.title}>
                <span>Image Tag & Studio Extractor</span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '0.15rem 0.5rem', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                  AI Vision
                </span>
              </h3>
              <p className={styles.subtitle}>
                Upload or paste screenshots containing genre & studio tags. Auto-merges spelling mismatches & separates studios.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className={styles.closeBtn}
            title="Close Extractor"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>

          {/* Active Key Status Bar */}
          <div className={styles.keyBar}>
            <div className={styles.keyBarLeft}>
              <Key size={14} style={{ color: '#c084fc' }} />
              <span style={{ fontWeight: 600 }}>Gemini Key:</span>
              <span className={styles.keyPill}>
                {activeKeyDisplay}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsKeyPanelOpen(prev => !prev)}
              className={styles.keyToggleBtn}
              title="Configure or enter custom Gemini API key"
            >
              <span>{isKeyPanelOpen ? 'Hide Key Settings' : '🔑 Change / Enter API Key'}</span>
              {isKeyPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Expandable Key Settings & Update Panel */}
          {isKeyPanelOpen && (
            <div className={styles.keyPanel}>
              <div className={styles.keyPanelHeader}>
                <div className={styles.keyPanelTitle}>
                  <Key size={16} />
                  <span>Gemini API Key Configuration</span>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#38bdf8',
                    fontSize: '0.74rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    textDecoration: 'none',
                    fontWeight: 700
                  }}
                  title="Open Google AI Studio to get a free API key"
                >
                  <span>Get Free Key (Google AI Studio)</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Saved Keys Selection */}
              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                  Select Active Key:
                </span>
                <div className={styles.keySavedList}>
                  {/* Default .env option */}
                  <div 
                    onClick={() => handleSelectKey('default')}
                    className={`${styles.keyItem} ${activeKeyId === 'default' ? styles.keyItemActive : ''}`}
                  >
                    <div className={styles.keyItemMeta}>
                      <span style={{ fontWeight: 700 }}>Server Default (.env.local)</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Global environment key</span>
                    </div>
                    {activeKeyId === 'default' && <Check size={14} style={{ color: '#a78bfa' }} />}
                  </div>

                  {/* Saved custom keys */}
                  {customKeys.map(k => (
                    <div 
                      key={k.id}
                      onClick={() => handleSelectKey(k.id)}
                      className={`${styles.keyItem} ${activeKeyId === k.id ? styles.keyItemActive : ''}`}
                    >
                      <div className={styles.keyItemMeta}>
                        <span style={{ fontWeight: 700 }}>{k.nickname}</span>
                        <code style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                          {k.key.slice(0, 8)}...{k.key.slice(-4)}
                        </code>
                      </div>
                      <div className={styles.keyActions} onClick={(e) => e.stopPropagation()}>
                        {activeKeyId === k.id && <Check size={14} style={{ color: '#a78bfa', marginRight: '0.3rem' }} />}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.2rem' }}
                          title="Delete saved key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New or Update Key */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
                  ➕ Enter / Update API Key:
                </span>
                <div className={styles.keyInputRow}>
                  <input
                    type="text"
                    placeholder="Nickname (e.g. My AI Key)"
                    value={newKeyNickname}
                    onChange={(e) => setNewKeyNickname(e.target.value)}
                    className={styles.keyTextInput}
                  />
                  <div className={styles.keyPasswordWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Paste Gemini API Key (starts with AIzaSy...)"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className={styles.keyTextInput}
                      style={{ paddingRight: '2.2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className={styles.keyVisibilityBtn}
                      title={showPassword ? 'Hide Key' : 'Show Key'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className={styles.keyOptionsRow}>
                  <label className={styles.keyCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={updateServerEnv}
                      onChange={(e) => setUpdateServerEnv(e.target.checked)}
                      style={{ accentColor: '#10b981' }}
                    />
                    <span>Also update server .env.local as default</span>
                  </label>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={testingKey || (!newKeyValue.trim() && !getActiveApiKeyString())}
                      className={styles.testKeyBtn}
                    >
                      {testingKey ? <Loader2 size={13} className={styles.spin} /> : <Sparkles size={13} />}
                      <span>Test Key</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCustomKey()}
                      disabled={!newKeyValue.trim()}
                      className={styles.saveKeyBtn}
                    >
                      <Check size={14} />
                      <span>Save & Use Key</span>
                    </button>
                  </div>
                </div>

                {keyTestFeedback && (
                  <div style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: keyTestFeedback.success ? '#6ee7b7' : '#fca5a5',
                    background: keyTestFeedback.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: `1px solid ${keyTestFeedback.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {keyTestFeedback.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dropzone & Paste Area */}
          <div 
            className={`${styles.dropzone} ${isDragging ? styles.activeDrag : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files);
              }}
            />
            <div className={styles.dropzoneIcon}>
              <UploadCloud size={26} />
            </div>
            <div className={styles.dropzoneText}>
              Click to browse or drop screenshots here
            </div>
            <div className={styles.dropzoneHint}>
              <span>Tip: You can also press</span>
              <span className={styles.pasteBadge}>Ctrl + V</span>
              <span>anywhere on this screen to paste from clipboard</span>
            </div>
          </div>

          {/* Uploaded Images List */}
          {images.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Uploaded Screenshots ({images.length})
                </span>
                <button 
                  type="button" 
                  onClick={handleClearAllImages}
                  className={styles.textActionBtn}
                  style={{ color: '#f87171' }}
                >
                  Clear All
                </button>
              </div>

              <div className={styles.imagesGrid}>
                {images.map((img) => (
                  <div key={img.id} className={styles.imageCard}>
                    <div className={styles.thumbnailWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.name} className={styles.thumbnailImg} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className={styles.removeImgBtn}
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.imageMeta}>
                      <span title={img.name}>{img.name}</span>
                      <span>{(img.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extract Button & Action Bar */}
          <div className={styles.extractActionRow}>
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || images.length === 0}
              className={styles.extractBtn}
            >
              {isExtracting ? (
                <>
                  <Loader2 size={18} className={styles.spin} />
                  <span>Analyzing & Deduplicating Tags...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>✨ Extract Genres & Studios from {images.length} Image{images.length === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorBanner} style={isKeyError ? { border: '1px solid #f87171', background: 'rgba(239, 68, 68, 0.16)' } : undefined}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#f87171' }} />
              <div style={{ flex: 1 }}>
                <strong>Extraction Notice:</strong> {error}
                {isKeyError && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
                    👉 Click <strong>&quot;Change / Enter API Key&quot;</strong> in the purple bar above to enter your Google AI Studio API key.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status / Feedback message */}
          {statusMessage && !error && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              color: '#6ee7b7',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Extracted Results Section */}
          {(extractedGenres.length > 0 || extractedStudios.length > 0) && (
            <div className={styles.resultsContainer}>
              {/* Genres Card */}
              <div className={styles.resultCard}>
                <div className={styles.resultCardHeader}>
                  <div className={`${styles.resultCardTitle} ${styles.genresTitle}`}>
                    <Tag size={16} />
                    <span>Extracted Genres ({selectedGenres.size} of {extractedGenres.length} selected)</span>
                  </div>
                  <div className={styles.quickActions}>
                    <button type="button" onClick={selectAllGenres} className={styles.textActionBtn}>
                      Select All
                    </button>
                    <span style={{ color: '#475569' }}>•</span>
                    <button type="button" onClick={deselectAllGenres} className={styles.textActionBtn}>
                      Deselect All
                    </button>
                    <span style={{ color: '#475569' }}>•</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCustomGenre(prev => !prev)} 
                      className={styles.textActionBtn}
                      style={{ color: '#f472b6' }}
                    >
                      + Add Tag
                    </button>
                  </div>
                </div>

                {showAddCustomGenre && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input
                      type="text"
                      placeholder="Add custom tag (e.g. Vanilla, Yandere)..."
                      value={customGenreInput}
                      onChange={(e) => setCustomGenreInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomGenre(); }}
                      style={{
                        flex: 1,
                        background: '#0a0d16',
                        border: '1px solid #2d354b',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        color: '#fff',
                        fontSize: '0.78rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomGenre}
                      style={{
                        background: '#ec4899',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className={styles.chipsGrid}>
                  {extractedGenres.map((genre) => {
                    const isSelected = selectedGenres.has(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`${styles.genreChip} ${isSelected ? styles.genreChipActive : styles.genreChipInactive}`}
                      >
                        {isSelected && <Check size={13} />}
                        <span>{genre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Studios Card */}
              <div className={styles.resultCard}>
                <div className={styles.resultCardHeader}>
                  <div className={`${styles.resultCardTitle} ${styles.studiosTitle}`}>
                    <Building2 size={16} />
                    <span>Extracted Studios ({selectedStudios.size} of {extractedStudios.length} selected)</span>
                  </div>
                  <div className={styles.quickActions}>
                    <button type="button" onClick={selectAllStudios} className={styles.textActionBtn}>
                      Select All
                    </button>
                    <span style={{ color: '#475569' }}>•</span>
                    <button type="button" onClick={deselectAllStudios} className={styles.textActionBtn}>
                      Deselect All
                    </button>
                    <span style={{ color: '#475569' }}>•</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCustomStudio(prev => !prev)} 
                      className={styles.textActionBtn}
                      style={{ color: '#34d399' }}
                    >
                      + Add Studio
                    </button>
                  </div>
                </div>

                {showAddCustomStudio && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input
                      type="text"
                      placeholder="Add studio name (e.g. PoRO, King Bee)..."
                      value={customStudioInput}
                      onChange={(e) => setCustomStudioInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomStudio(); }}
                      style={{
                        flex: 1,
                        background: '#0a0d16',
                        border: '1px solid #2d354b',
                        borderRadius: '6px',
                        padding: '0.35rem 0.65rem',
                        color: '#fff',
                        fontSize: '0.78rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomStudio}
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className={styles.chipsGrid}>
                  {extractedStudios.map((s) => {
                    const isSelected = selectedStudios.has(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStudio(s)}
                        className={`${styles.studioChip} ${isSelected ? styles.studioChipActive : styles.studioChipInactive}`}
                      >
                        {isSelected && <Check size={13} />}
                        <span>{s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart Merge Log Display */}
              {mergedNotes.length > 0 && (
                <div className={styles.mergeLogCard}>
                  <div className={styles.mergeLogTitle}>
                    <Sparkles size={15} />
                    <span>Smart Normalization & Spelling Deduplication Applied:</span>
                  </div>
                  <div className={styles.mergeLogBadges}>
                    {mergedNotes.map((note, idx) => (
                      <div key={idx} className={styles.mergeBadge}>
                        <span className={styles.origTag}>{note.original}</span>
                        <ArrowRight size={11} className={styles.arrowIcon} />
                        <span className={styles.targetTag}>{note.merged_into}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {onApply && (
            <div className={styles.applyModeGroup}>
              <button
                type="button"
                onClick={() => setApplyMode('append')}
                className={`${styles.applyModeBtn} ${applyMode === 'append' ? styles.applyModeBtnActive : ''}`}
                title="Preserve existing genres and studios in the series, only append new ones"
              >
                ➕ Append to Existing
              </button>
              <button
                type="button"
                onClick={() => setApplyMode('replace')}
                className={`${styles.applyModeBtn} ${applyMode === 'replace' ? styles.applyModeBtnActive : ''}`}
                title="Overwrite current series genres and studios with these selected ones"
              >
                🔄 Replace All
              </button>
            </div>
          )}

          {copyFeedback && (
            <div style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Check size={14} />
              <span>{copyFeedback}</span>
            </div>
          )}

          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={handleCopyGenres}
              disabled={selectedGenres.size === 0}
              className={styles.copyBtn}
              title="Copy selected genres as comma-separated text"
            >
              <Copy size={14} />
              <span>Copy Genres</span>
            </button>

            <button
              type="button"
              onClick={handleCopyStudios}
              disabled={selectedStudios.size === 0}
              className={styles.copyBtn}
              title="Copy selected studios as comma-separated text"
            >
              <Copy size={14} />
              <span>Copy Studios</span>
            </button>

            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                disabled={selectedGenres.size === 0 && selectedStudios.size === 0}
                className={styles.applyBtn}
              >
                <CheckCircle2 size={16} />
                <span>Apply to Series ({selectedGenres.size + selectedStudios.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
