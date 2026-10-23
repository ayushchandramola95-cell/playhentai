'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Film, X, RefreshCw, Copy, Check, Play, ExternalLink,
  Layers, Sliders, CheckCircle2, AlertCircle, Info, Volume2,
  HardDrive, Sparkles, Terminal, Activity, Eye, Zap, UploadCloud,
  Maximize2, Minimize2, Trash2, Save, FileText, MessageSquare,
  Calendar, Clock, Settings, Image as ImageIcon
} from 'lucide-react';
import styles from './VideoMetaModal.module.css';

interface VideoMetaModalProps {
  episodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReplaceVideo?: () => void;
  onEpisodeUpdated?: () => void;
  episodeTitle?: string;
  episodeNumber?: number;
  seriesTitle?: string;
  seasonTitle?: string;
}

export default function VideoMetaModal({
  episodeId,
  isOpen,
  onClose,
  onReplaceVideo,
  onEpisodeUpdated,
  episodeTitle,
  episodeNumber,
  seriesTitle,
  seasonTitle,
}: VideoMetaModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [reprobing, setReprobing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'renditions' | 'storyboard' | 'subtitles' | 'metadata' | 'json'>('overview');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Active Player Quality selection
  const [activePlayerQuality, setActivePlayerQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Transcoding state
  const [transcodingQuality, setTranscodingQuality] = useState<'720p' | '480p' | 'both' | null>(null);
  const [deletingQuality, setDeletingQuality] = useState<'720p' | '480p' | 'all' | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState<boolean>(false);
  const [isDeletingStoryboard, setIsDeletingStoryboard] = useState<boolean>(false);

  // Metadata form edit state
  const [formData, setFormData] = useState({
    title: '',
    episode_number: 1,
    duration_seconds: 1320,
    release_date: '',
    description: '',
    is_published: true,
  });
  const [isSavingMetadata, setIsSavingMetadata] = useState<boolean>(false);

  // Storyboard Zoom view
  const [zoomSheetUrl, setZoomSheetUrl] = useState<string | null>(null);

  // Fetch telemetry whenever opened
  useEffect(() => {
    if (!isOpen || !episodeId) return;
    fetchMeta(false);
  }, [isOpen, episodeId]);

  // Handle ESC key to exit modal or fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomSheetUrl) {
          setZoomSheetUrl(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, zoomSheetUrl, onClose]);

  const fetchMeta = async (refresh: boolean = false) => {
    if (refresh) setReprobing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/episodes/meta?id=${encodeURIComponent(episodeId || '')}${refresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch video telemetry.');
      }

      const fetchedMeta = data.meta || null;
      setMeta(fetchedMeta);

      // Populate form data
      if (fetchedMeta?.episode) {
        setFormData({
          title: fetchedMeta.episode.title || '',
          episode_number: fetchedMeta.episode.episode_number || 1,
          duration_seconds: fetchedMeta.episode.duration_seconds || fetchedMeta.durationSeconds || 1320,
          release_date: fetchedMeta.episode.release_date ? fetchedMeta.episode.release_date.split('T')[0] : '',
          description: fetchedMeta.episode.description || '',
          is_published: fetchedMeta.episode.is_published ?? true,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error inspecting video stream.');
    } finally {
      setLoading(false);
      setReprobing(false);
    }
  };

  if (!isOpen || !episodeId) return null;

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Switch video stream quality in embedded player while preserving current playback position
  const handleSwitchPlayerQuality = (quality: '1080p' | '720p' | '480p') => {
    if (!meta?.renditions?.[quality]?.url) return;
    const currentTime = videoRef.current ? videoRef.current.currentTime : 0;
    const isPaused = videoRef.current ? videoRef.current.paused : true;

    setActivePlayerQuality(quality);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (!isPaused) {
          videoRef.current.play().catch(() => {});
        }
      }
    }, 50);
  };

  // Single or Dual Quality Transcoding
  const handleTranscode = async (quality: '720p' | '480p' | 'both') => {
    setTranscodingQuality(quality);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transcode_single',
          episodeId,
          options: {
            only1080p: false,
            generate720p: quality === '720p' || quality === 'both',
            generate480p: quality === '480p' || quality === 'both',
            threads: 4,
            crf720: 22,
            crf480: 24,
          }
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to transcode ${quality} rendition.`);
      }

      setActionSuccess(`✓ Transcoding finished! ${quality === 'both' ? '720p & 480p renditions' : `${quality} rendition`} saved to AWS S3 & live on CloudFront.`);
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error transcoding video rendition.');
    } finally {
      setTranscodingQuality(null);
    }
  };

  // Delete Individual Rendition from S3
  const handleDeleteRendition = async (quality: '720p' | '480p') => {
    if (!window.confirm(`Are you sure you want to delete the ${quality} rendition from AWS S3? This will free up storage space.`)) {
      return;
    }

    setDeletingQuality(quality);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_rendition',
          episodeId,
          quality,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to delete ${quality} rendition.`);
      }

      setActionSuccess(`✓ Deleted ${quality} rendition from AWS S3.`);
      if (activePlayerQuality === quality) {
        setActivePlayerQuality('1080p');
      }
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error deleting rendition.');
    } finally {
      setDeletingQuality(null);
    }
  };

  // Purge All Renditions
  const handlePurgeAllRenditions = async () => {
    if (!window.confirm('Are you sure you want to purge all transcoded renditions (720p & 480p)? The 1080p master file will remain intact.')) {
      return;
    }

    setDeletingQuality('all');
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_single',
          episodeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge renditions.');
      }

      setActionSuccess('✓ All secondary renditions purged. Episode restored to master-only.');
      setActivePlayerQuality('1080p');
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error purging renditions.');
    } finally {
      setDeletingQuality(null);
    }
  };

  // Generate Storyboard
  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate storyboard.');
      }

      setActionSuccess(`✓ Storyboard generated successfully (${data.storyboard?.sheet_count || 1} WebP sheets in S3).`);
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error generating storyboard.');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Delete Storyboard
  const handleDeleteStoryboard = async () => {
    if (!window.confirm('Delete all WebP storyboard sprite sheets and timeline cues for this episode from AWS S3?')) {
      return;
    }

    setIsDeletingStoryboard(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/storyboard?episodeId=${encodeURIComponent(episodeId)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete storyboard.');
      }

      setActionSuccess('✓ Storyboard deleted from S3 storage and catalog.');
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error deleting storyboard.');
    } finally {
      setIsDeletingStoryboard(false);
    }
  };

  // Save Episode Metadata
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMetadata(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: episodeId,
          title: formData.title,
          episode_number: Number(formData.episode_number),
          duration_seconds: Number(formData.duration_seconds),
          release_date: formData.release_date ? new Date(formData.release_date).toISOString() : null,
          description: formData.description,
          is_published: formData.is_published,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save metadata.');
      }

      setActionSuccess('✓ Episode metadata saved successfully to database & catalog.');
      await fetchMeta(true);
      onEpisodeUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error saving metadata.');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Current active stream URL for player
  const currentStreamUrl =
    (activePlayerQuality === '720p' && meta?.renditions?.['720p']?.url) ||
    (activePlayerQuality === '480p' && meta?.renditions?.['480p']?.url) ||
    meta?.renditions?.['1080p']?.url ||
    meta?.videoUrl ||
    '';

  const has720p = Boolean(meta?.renditions?.['720p']?.isReady);
  const has480p = Boolean(meta?.renditions?.['480p']?.isReady);
  const isStoryboardReady = meta?.storyboard?.status === 'completed';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBox}>
              <Film size={20} />
            </div>
            <div className={styles.headerTitleBox}>
              <div className={styles.breadcrumbRow}>
                <span>{seriesTitle || meta?.episode?.series_title || 'Series'}</span>
                <span className={styles.crumbSep}>/</span>
                <span>{seasonTitle || meta?.episode?.season_title || 'Season 1'}</span>
                <span className={styles.crumbSep}>/</span>
                <span>Ep {episodeNumber ?? meta?.episode?.episode_number ?? 1}</span>
              </div>
              <div className={styles.titleRow}>
                <h2 className={styles.modalTitle}>
                  {formData.title || episodeTitle || meta?.episode?.title || 'Episode Studio'}
                </h2>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    background: formData.is_published ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: formData.is_published ? '#34d399' : '#fbbf24',
                    border: formData.is_published ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                    textTransform: 'uppercase',
                  }}
                >
                  {formData.is_published ? 'Published' : 'Draft'}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    background: has720p && has480p ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    color: has720p && has480p ? '#34d399' : '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {has720p && has480p ? '🎬 1080p • 720p • 480p' : has720p ? '🎬 1080p • 720p' : '🎬 1080p Master'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.headerRightActions}>
            <Link
              href={`/watch/${episodeId}`}
              target="_blank"
              rel="noreferrer"
              className={styles.headerActionBtn}
              title="Open public watch page in new tab"
            >
              <ExternalLink size={13} />
              <span>Watch</span>
            </Link>

            {onReplaceVideo && (
              <button
                type="button"
                onClick={onReplaceVideo}
                className={styles.headerActionBtn}
                title="Swap video master stream file in S3"
              >
                <UploadCloud size={13} />
                <span>Replace Video</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={styles.headerIconBtn}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Studio'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={styles.closeBtn}
              title="Close Studio (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          >
            <Play size={14} />
            <span>Player & Specs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('renditions')}
            className={`${styles.tabBtn} ${activeTab === 'renditions' ? styles.tabBtnActive : ''}`}
          >
            <Sliders size={14} />
            <span>Video Renditions</span>
            <span className={styles.tabCountBadge}>
              {1 + (has720p ? 1 : 0) + (has480p ? 1 : 0)}/3
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storyboard')}
            className={`${styles.tabBtn} ${activeTab === 'storyboard' ? styles.tabBtnActive : ''}`}
          >
            <Layers size={14} />
            <span>Storyboard Studio</span>
            <span className={styles.tabCountBadge}>
              {meta?.storyboard?.sheetCount || 0} sheets
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subtitles')}
            className={`${styles.tabBtn} ${activeTab === 'subtitles' ? styles.tabBtnActive : ''}`}
          >
            <MessageSquare size={14} />
            <span>Subtitles & Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`${styles.tabBtn} ${activeTab === 'metadata' ? styles.tabBtnActive : ''}`}
          >
            <FileText size={14} />
            <span>Edit Metadata</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`${styles.tabBtn} ${activeTab === 'json' ? styles.tabBtnActive : ''}`}
          >
            <Terminal size={14} />
            <span>Raw Telemetry</span>
          </button>
        </div>

        {/* Body Content */}
        <div className={styles.body}>
          {actionSuccess && (
            <div className={styles.alertSuccess}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} />
                <span>{actionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {error && (
            <div className={styles.alertError}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB 1: Overview & Interactive Player */}
          {activeTab === 'overview' && (
            <div className={styles.playerLayout}>
              {/* Left Column: Player */}
              <div className={styles.playerCard}>
                <div className={styles.playerHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Play size={14} color="#38bdf8" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      Live CDN Stream Player
                    </span>
                  </div>

                  <div className={styles.qualitySwitchGroup}>
                    <button
                      type="button"
                      onClick={() => handleSwitchPlayerQuality('1080p')}
                      className={`${styles.qualitySwitchBtn} ${activePlayerQuality === '1080p' ? styles.qualitySwitchBtnActive : ''}`}
                    >
                      1080p Master
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchPlayerQuality('720p')}
                      disabled={!has720p}
                      className={`${styles.qualitySwitchBtn} ${activePlayerQuality === '720p' ? styles.qualitySwitchBtnActive : ''} ${!has720p ? styles.qualitySwitchBtnDisabled : ''}`}
                      title={has720p ? 'Switch player to 720p HD' : '720p rendition not yet generated'}
                    >
                      720p HD
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchPlayerQuality('480p')}
                      disabled={!has480p}
                      className={`${styles.qualitySwitchBtn} ${activePlayerQuality === '480p' ? styles.qualitySwitchBtnActive : ''} ${!has480p ? styles.qualitySwitchBtnDisabled : ''}`}
                      title={has480p ? 'Switch player to 480p SD' : '480p rendition not yet generated'}
                    >
                      480p SD
                    </button>
                  </div>
                </div>

                <div className={styles.videoWrapper}>
                  {currentStreamUrl ? (
                    <video
                      ref={videoRef}
                      key={currentStreamUrl}
                      src={currentStreamUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className={styles.videoElement}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      {loading ? 'Inspecting stream URL...' : 'No active video stream URL.'}
                    </div>
                  )}
                </div>

                <div className={styles.playerFooter}>
                  <span>Playing: <strong style={{ color: '#f8fafc' }}>{activePlayerQuality.toUpperCase()}</strong></span>
                  <span>CDN: <strong style={{ color: '#38bdf8' }}>AWS CloudFront (Sydney S3)</strong></span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentStreamUrl, 'playerUrl')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem' }}
                  >
                    {copiedKey === 'playerUrl' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedKey === 'playerUrl' ? 'Copied Link' : 'Copy Direct Stream URL'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Key Specifications */}
              <div className={styles.infoPanel}>
                <div className={styles.cardSection}>
                  <div className={styles.cardSectionHeader}>
                    <h4 className={styles.cardSectionTitle}>
                      <Activity size={14} color="#38bdf8" />
                      <span>Stream Telemetry</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => fetchMeta(true)}
                      disabled={reprobing}
                      className={styles.headerActionBtn}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                    >
                      <RefreshCw size={11} className={reprobing ? styles.spinner : ''} />
                      <span>{reprobing ? 'Probing...' : 'Re-Probe'}</span>
                    </button>
                  </div>

                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Resolution</span>
                    <span className={styles.specValue}>{meta ? `${meta.width} × ${meta.height} (${meta.aspectRatio || '16:9'})` : '...'}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Framerate</span>
                    <span className={styles.specValue}>{meta ? `${meta.fpsFormatted} (${meta.isInterlaced ? 'Interlaced' : 'Progressive'})` : '...'}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Video Codec</span>
                    <span className={styles.specValue}>{meta ? `${meta.videoCodec || 'H.264'} (${meta.profile || 'High'} Profile)` : '...'}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Audio Specs</span>
                    <span className={styles.specValue}>{meta ? `${meta.audioCodec || 'AAC'} • ${meta.channelLayout || 'Stereo'} @ ${meta.sampleRateFormatted || '48kHz'}` : '...'}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Runtime</span>
                    <span className={styles.specValue}>{meta?.durationFormatted || `${meta?.durationSeconds}s`}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>Master Size</span>
                    <span className={styles.specValue}>{meta?.sizeFormatted || '...'}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>S3 Sydney Key</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(meta?.videoKey, 'videoKey')}
                      className={styles.copyableKey}
                      title="Click to copy S3 storage key"
                    >
                      {copiedKey === 'videoKey' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                      <span>{meta?.videoKey ? `${meta.videoKey.slice(0, 24)}...` : 'None'}</span>
                    </button>
                  </div>
                </div>

                <div className={styles.cardSection}>
                  <h4 className={styles.cardSectionTitle}>
                    <Sliders size={14} color="#a855f7" />
                    <span>Quick Transcoding Actions</span>
                  </h4>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleTranscode('both')}
                      disabled={!!transcodingQuality}
                      className={styles.btnActionPrimary}
                      style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', border: 'none' }}
                    >
                      {transcodingQuality === 'both' ? <RefreshCw size={12} className={styles.spinner} /> : <Zap size={12} />}
                      <span>{transcodingQuality === 'both' ? 'Transcoding 720p & 480p...' : '⚡ Generate Both 720p & 480p'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('renditions')}
                      className={styles.btnActionSecondary}
                    >
                      <Sliders size={12} />
                      <span>Manage Renditions</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-Quality Renditions */}
          {activeTab === 'renditions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div className={styles.renditionsHeaderRow}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Per-Quality Video Rendition Control Center
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Generate, test, delete, or inspect individual resolutions. Files stream worldwide via AWS CloudFront.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleTranscode('both')}
                    disabled={!!transcodingQuality}
                    className={styles.btnActionPrimary}
                    style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', border: 'none' }}
                  >
                    {transcodingQuality === 'both' ? <RefreshCw size={13} className={styles.spinner} /> : <Zap size={13} />}
                    <span>{transcodingQuality === 'both' ? 'Transcoding...' : '⚡ Transcode All (720p + 480p)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePurgeAllRenditions}
                    disabled={!!deletingQuality}
                    className={styles.btnActionDanger}
                  >
                    <Trash2 size={13} />
                    <span>Purge All Renditions</span>
                  </button>
                </div>
              </div>

              <div className={styles.renditionsGrid}>
                {/* 1080p Master Card */}
                <div className={`${styles.renditionCard} ${styles.renditionCardReady}`}>
                  <div className={styles.renditionTop}>
                    <div className={styles.renditionQualityTitle}>
                      <span>1080p Master</span>
                    </div>
                    <span className={`${styles.renditionBadge} ${styles.badgeReady}`}>
                      ✓ Master File
                    </span>
                  </div>

                  <div className={styles.renditionMetricsList}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Resolution:</span>
                      <span className={styles.specValue}>{meta?.renditions?.['1080p']?.resolution || '1920x1080'}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>File Size:</span>
                      <span className={styles.specValue}>{meta?.renditions?.['1080p']?.sizeMb ? `${meta.renditions['1080p'].sizeMb} MB` : (meta?.sizeFormatted || 'Ready')}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Storage:</span>
                      <span className={styles.specValue}>AWS S3 (Sydney ap-southeast-2)</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>S3 Key:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(meta?.renditions?.['1080p']?.key || meta?.videoKey, 'key1080')}
                        className={styles.copyableKey}
                      >
                        {copiedKey === 'key1080' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        <span>Copy Key</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.renditionActionButtons}>
                    <button
                      type="button"
                      onClick={() => {
                        handleSwitchPlayerQuality('1080p');
                        setActiveTab('overview');
                      }}
                      className={styles.btnActionPrimary}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play Master</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText(meta?.videoUrl, 'url1080')}
                      className={styles.btnActionSecondary}
                    >
                      {copiedKey === 'url1080' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedKey === 'url1080' ? 'Copied' : 'Copy CDN URL'}</span>
                    </button>
                  </div>
                </div>

                {/* 720p HD Rendition Card */}
                <div className={`${styles.renditionCard} ${has720p ? styles.renditionCardReady : styles.renditionCardMissing}`}>
                  <div className={styles.renditionTop}>
                    <div className={styles.renditionQualityTitle}>
                      <span>720p HD</span>
                    </div>
                    <span className={`${styles.renditionBadge} ${has720p ? styles.badgeReady : styles.badgeMissing}`}>
                      {has720p ? '✓ 720p Ready' : 'Not Generated'}
                    </span>
                  </div>

                  <div className={styles.renditionMetricsList}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Resolution:</span>
                      <span className={styles.specValue}>1280 × 720</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>File Size:</span>
                      <span className={styles.specValue}>{has720p ? `${meta?.renditions?.['720p']?.sizeMb || '304'} MB` : 'N/A'}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Target Device:</span>
                      <span className={styles.specValue}>Laptops & High-Res Tablets</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>S3 Key:</span>
                      <span className={styles.specValue}>
                        {has720p ? `videos/${episodeId}/720p.mp4` : 'Pending Generation'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.renditionActionButtons}>
                    {has720p ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleSwitchPlayerQuality('720p');
                            setActiveTab('overview');
                          }}
                          className={styles.btnActionPrimary}
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Play 720p</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTranscode('720p')}
                          disabled={transcodingQuality === '720p'}
                          className={styles.btnActionSecondary}
                          title="Re-encode 720p with FFmpeg"
                        >
                          {transcodingQuality === '720p' ? <RefreshCw size={11} className={styles.spinner} /> : <Zap size={11} />}
                          <span>{transcodingQuality === '720p' ? 'Encoding...' : 'Re-Generate'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRendition('720p')}
                          disabled={deletingQuality === '720p'}
                          className={styles.btnActionDanger}
                          title="Delete 720p video file from S3 bucket"
                        >
                          <Trash2 size={11} />
                          <span>Delete 720p</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTranscode('720p')}
                        disabled={transcodingQuality === '720p'}
                        className={styles.btnActionPrimary}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {transcodingQuality === '720p' ? <RefreshCw size={12} className={styles.spinner} /> : <Zap size={12} />}
                        <span>{transcodingQuality === '720p' ? 'Encoding 720p with FFmpeg...' : '⚡ Generate 720p Only'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 480p SD Rendition Card */}
                <div className={`${styles.renditionCard} ${has480p ? styles.renditionCardReady : styles.renditionCardMissing}`}>
                  <div className={styles.renditionTop}>
                    <div className={styles.renditionQualityTitle}>
                      <span>480p SD Mobile</span>
                    </div>
                    <span className={`${styles.renditionBadge} ${has480p ? styles.badgeReady : styles.badgeMissing}`}>
                      {has480p ? '✓ 480p Ready' : 'Not Generated'}
                    </span>
                  </div>

                  <div className={styles.renditionMetricsList}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Resolution:</span>
                      <span className={styles.specValue}>854 × 480</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>File Size:</span>
                      <span className={styles.specValue}>{has480p ? `${meta?.renditions?.['480p']?.sizeMb || '148'} MB` : 'N/A'}</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>Target Device:</span>
                      <span className={styles.specValue}>Mobile Data-Saver & Slow Networks</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>S3 Key:</span>
                      <span className={styles.specValue}>
                        {has480p ? `videos/${episodeId}/480p.mp4` : 'Pending Generation'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.renditionActionButtons}>
                    {has480p ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            handleSwitchPlayerQuality('480p');
                            setActiveTab('overview');
                          }}
                          className={styles.btnActionPrimary}
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Play 480p</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTranscode('480p')}
                          disabled={transcodingQuality === '480p'}
                          className={styles.btnActionSecondary}
                          title="Re-encode 480p with FFmpeg"
                        >
                          {transcodingQuality === '480p' ? <RefreshCw size={11} className={styles.spinner} /> : <Zap size={11} />}
                          <span>{transcodingQuality === '480p' ? 'Encoding...' : 'Re-Generate'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRendition('480p')}
                          disabled={deletingQuality === '480p'}
                          className={styles.btnActionDanger}
                          title="Delete 480p video file from S3 bucket"
                        >
                          <Trash2 size={11} />
                          <span>Delete 480p</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTranscode('480p')}
                        disabled={transcodingQuality === '480p'}
                        className={styles.btnActionPrimary}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        {transcodingQuality === '480p' ? <RefreshCw size={12} className={styles.spinner} /> : <Zap size={12} />}
                        <span>{transcodingQuality === '480p' ? 'Encoding 480p with FFmpeg...' : '⚡ Generate 480p Only'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Storyboard & WebP Sprites Studio */}
          {activeTab === 'storyboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div className={styles.renditionsHeaderRow}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Storyboard Sprites & Hover Preview Studio
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    10x10 WebP sheet grids (100 tiles/sheet) extracted at 1 frame/sec for zero-lag scrubber hover previews.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={handleGenerateStoryboard}
                    disabled={isGeneratingStoryboard}
                    className={styles.btnActionPrimary}
                  >
                    {isGeneratingStoryboard ? <RefreshCw size={12} className={styles.spinner} /> : <Zap size={12} />}
                    <span>{isGeneratingStoryboard ? 'Generating Sheets...' : '⚡ Generate / Regenerate Storyboard'}</span>
                  </button>

                  {isStoryboardReady && (
                    <button
                      type="button"
                      onClick={handleDeleteStoryboard}
                      disabled={isDeletingStoryboard}
                      className={styles.btnActionDanger}
                    >
                      <Trash2 size={12} />
                      <span>Delete Storyboard</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Storyboard Status Specs */}
              <div className={styles.cardSection}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div className={styles.specLabel}>Status</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: isStoryboardReady ? '#34d399' : '#94a3b8', marginTop: '0.2rem' }}>
                      {isStoryboardReady ? '✓ Active & Ready' : 'Missing / Not Generated'}
                    </div>
                  </div>
                  <div>
                    <div className={styles.specLabel}>Total Sheets</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                      {meta?.storyboard?.sheetCount || 0} WebP Sheets
                    </div>
                  </div>
                  <div>
                    <div className={styles.specLabel}>Frame Interval</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                      1 frame per second
                    </div>
                  </div>
                  <div>
                    <div className={styles.specLabel}>Tile Grid</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                      10×10 (160×90 Lanczos)
                    </div>
                  </div>
                </div>
              </div>

              {/* Sheets Gallery */}
              {meta?.storyboard?.sheets && meta.storyboard.sheets.length > 0 ? (
                <div>
                  <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: '#f8fafc' }}>
                    Generated WebP Sprite Sheets (Click to Zoom & Inspect Frames)
                  </h4>
                  <div className={styles.storyboardGrid}>
                    {meta.storyboard.sheets.map((sheetUrl: string, idx: number) => (
                      <div
                        key={sheetUrl}
                        className={styles.sheetCard}
                        onClick={() => setZoomSheetUrl(sheetUrl)}
                        title="Click to view full 1600x900 sprite sheet"
                      >
                        <div className={styles.sheetThumbWrapper}>
                          <img src={sheetUrl} alt={`Sheet ${idx}`} className={styles.sheetImg} loading="lazy" />
                        </div>
                        <div className={styles.sheetFooter}>
                          <span>Sheet #{String(idx).padStart(2, '0')}</span>
                          <span style={{ color: '#38bdf8', fontSize: '0.7rem' }}>View Sheet →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#0a0e18', border: '1px dashed #1e293b', borderRadius: '10px', color: '#94a3b8' }}>
                  No WebP storyboard sprite sheets found for this episode. Click <strong>Generate Storyboard</strong> to create them.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Subtitles & Audio */}
          {activeTab === 'subtitles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div className={styles.renditionsHeaderRow}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Closed Captions & Subtitle Stream
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Manage external WebVTT (.vtt) caption tracks or burned-in hardsub configurations.
                  </p>
                </div>
              </div>

              <div className={styles.cardSection}>
                <h4 className={styles.cardSectionTitle}>
                  <MessageSquare size={14} color="#38bdf8" />
                  <span>Subtitle Configuration</span>
                </h4>

                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Subtitle Type:</span>
                  <span className={styles.specValue}>
                    {meta?.subtitles?.hasSeparateSubtitles ? 'Separate WebVTT Track (CC Toggle Enabled)' : 'Burned-in Hardsubs (In-Video)'}
                  </span>
                </div>

                <div className={styles.specRow}>
                  <span className={styles.specLabel}>S3 Subtitle Key:</span>
                  <span className={styles.specValue}>
                    {meta?.subtitles?.key ? (
                      <button
                        type="button"
                        onClick={() => handleCopyText(meta.subtitles.key, 'subKey')}
                        className={styles.copyableKey}
                      >
                        {copiedKey === 'subKey' ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        <span>{meta.subtitles.key}</span>
                      </button>
                    ) : 'None (Hardsubbed)'}
                  </span>
                </div>

                {meta?.subtitles?.url && (
                  <div className={styles.specRow}>
                    <span className={styles.specLabel}>CloudFront CDN URL:</span>
                    <a
                      href={meta.subtitles.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', fontSize: '0.78rem', textDecoration: 'none' }}
                    >
                      Open Subtitle File (.vtt) ↗
                    </a>
                  </div>
                )}
              </div>

              <div className={styles.cardSection}>
                <h4 className={styles.cardSectionTitle}>
                  <Volume2 size={14} color="#a855f7" />
                  <span>Audio Stream Details</span>
                </h4>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Audio Codec:</span>
                  <span className={styles.specValue}>{meta?.audioCodec || 'AAC'}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Channel Layout:</span>
                  <span className={styles.specValue}>{meta?.channelLayout || 'Stereo (2.0)'}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Sample Rate:</span>
                  <span className={styles.specValue}>{meta?.sampleRateFormatted || '48.0 kHz'}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Bitrate:</span>
                  <span className={styles.specValue}>{meta?.audioBitrateKbps ? `${meta.audioBitrateKbps} kbps` : 'Standard'}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Metadata Inline Editor */}
          {activeTab === 'metadata' && (
            <form onSubmit={handleSaveMetadata} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div className={styles.renditionsHeaderRow}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                    Edit Episode Metadata
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Changes save instantly to the high-speed local store and sync with the database.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSavingMetadata}
                  className={styles.btnActionSuccess}
                >
                  {isSavingMetadata ? <RefreshCw size={13} className={styles.spinner} /> : <Save size={13} />}
                  <span>{isSavingMetadata ? 'Saving Changes...' : 'Save Metadata'}</span>
                </button>
              </div>

              <div className={styles.cardSection}>
                <div className={styles.metadataFormGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Episode Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className={styles.formInput}
                      placeholder="e.g. Episode 1"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Episode Number</label>
                    <input
                      type="number"
                      value={formData.episode_number}
                      onChange={(e) => setFormData({ ...formData, episode_number: Number(e.target.value) })}
                      required
                      min={1}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Duration (Seconds)</label>
                    <input
                      type="number"
                      value={formData.duration_seconds}
                      onChange={(e) => setFormData({ ...formData, duration_seconds: Number(e.target.value) })}
                      required
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Aired / Release Date</label>
                    <input
                      type="date"
                      value={formData.release_date}
                      onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Episode Synopsis / Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={styles.formTextarea}
                    placeholder="Provide a detailed episode summary or notes..."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', paddingTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="epPublishedCheck"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                  />
                  <label htmlFor="epPublishedCheck" style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>
                    Publish this episode live on the public site
                  </label>
                </div>
              </div>
            </form>
          )}

          {/* TAB 6: Raw Telemetry JSON */}
          {activeTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Complete JSON payload for episode diagnostics and developer debugging.
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(JSON.stringify(meta, null, 2), 'rawJson')}
                  className={styles.btnActionSecondary}
                >
                  {copiedKey === 'rawJson' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedKey === 'rawJson' ? 'Copied' : 'Copy Full JSON'}</span>
                </button>
              </div>

              <pre
                style={{
                  background: '#0a0f1d',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '1.2rem',
                  fontSize: '0.78rem',
                  color: '#93c5fd',
                  overflowX: 'auto',
                  maxHeight: '55vh',
                }}
              >
                {JSON.stringify(meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Storyboard Sheet Zoom Modal */}
      {zoomSheetUrl && (
        <div className={styles.zoomModalOverlay} onClick={() => setZoomSheetUrl(null)}>
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img src={zoomSheetUrl} alt="Zoomed Storyboard Sheet" className={styles.zoomImg} />
            <button
              type="button"
              onClick={() => setZoomSheetUrl(null)}
              className={styles.closeBtn}
              style={{ position: 'absolute', top: '-15px', right: '-15px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
