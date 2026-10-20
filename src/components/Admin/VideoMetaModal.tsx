'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film, X, RefreshCw, Copy, Check, Play, ExternalLink,
  Layers, Sliders, CheckCircle2, AlertCircle, Info, Volume2,
  HardDrive, Sparkles, Terminal, Activity, Eye, Zap, UploadCloud
} from 'lucide-react';
import styles from './VideoMetaModal.module.css';

interface VideoMetaModalProps {
  episodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReplaceVideo?: () => void;
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
  episodeTitle,
  episodeNumber,
  seriesTitle,
  seasonTitle,
}: VideoMetaModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [reprobing, setReprobing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'renditions' | 'storyboard' | 'json'>('specs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !episodeId) return;
    fetchMeta(false);
  }, [isOpen, episodeId]);

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

      setMeta(data.meta || null);
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

  const handleCopySummary = () => {
    if (!meta) return;
    const summary = `
[Video Stream Telemetry: ${seriesTitle || meta.episode?.series_title || 'Series'} - Ep ${episodeNumber ?? meta.episode?.episode_number}: ${episodeTitle || meta.episode?.title}]
- Resolution: ${meta.resolution || `${meta.width}x${meta.height}`} (${meta.aspectRatio || '16:9'})
- Framerate: ${meta.fpsFormatted || `${meta.fps} fps`}
- Video Codec: ${meta.videoCodecLong || meta.videoCodec || 'H.264'} (${meta.profile || 'High'} Profile)
- Pixel Format: ${meta.pixFmt || 'yuv420p'}
- Audio: ${meta.audioCodec || 'AAC'} ${meta.channelLayout || 'Stereo'} @ ${meta.sampleRateFormatted || '48.0 kHz'} (${meta.audioBitrateKbps ? `${meta.audioBitrateKbps} kbps` : 'Standard'})
- Duration: ${meta.durationFormatted || `${meta.durationSeconds}s`}
- File Size: ${meta.sizeFormatted || 'Unknown'} (${meta.overallBitrateKbps ? `~${meta.overallBitrateKbps} kbps` : 'Bitrate N/A'})
- S3 Master Key: ${meta.videoKey || 'None'}
- Probed At: ${meta.probedAt || new Date().toISOString()}
`.trim();

    handleCopyText(summary, 'summary');
  };

  const qualityBadge = meta?.qualityBadge || (meta?.height >= 1080 ? '1080p' : meta?.height >= 720 ? '720p' : '480p');
  const badgeStyle = qualityBadge === '1080p' ? styles.badge1080p : qualityBadge === '720p' ? styles.badge720p : styles.badge480p;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBox}>
              <Film size={22} />
            </div>
            <div className={styles.headerTitleBox}>
              <div className={styles.titleRow}>
                <h2 className={styles.modalTitle}>
                  {episodeTitle || meta?.episode?.title || 'Episode Telemetry'}
                </h2>
                <span className={badgeStyle}>
                  {qualityBadge} {qualityBadge === '1080p' ? 'Full HD' : qualityBadge === '720p' ? 'HD' : 'SD'}
                </span>
                {meta?.isWebOptimized && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                    }}
                    title="Web Faststart moov atom positioned at start of file for instant playback"
                  >
                    ✓ Faststart Web Ready
                  </span>
                )}
              </div>
              <div className={styles.modalSubtitle}>
                {seriesTitle || meta?.episode?.series_title || 'Anime Series'} • {seasonTitle || meta?.episode?.season_title || 'Season 1'} • Episode {episodeNumber ?? meta?.episode?.episode_number}
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} className={styles.closeBtn} title="Close window">
            <X size={18} />
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className={styles.metricsGrid}>
          {/* 1. Resolution */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <Activity size={10} />
              <span>Resolution</span>
            </div>
            <div className={styles.metricValue}>
              {meta ? `${meta.width}×${meta.height}` : '...'}
            </div>
            <div className={styles.metricSub}>{meta?.aspectRatio || '16:9'}</div>
          </div>

          {/* 2. Framerate */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <Zap size={10} />
              <span>Framerate</span>
            </div>
            <div className={styles.metricValue}>
              {meta ? meta.fpsFormatted : '...'}
            </div>
            <div className={styles.metricSub}>{meta?.isInterlaced ? 'Interlaced' : 'Progressive'}</div>
          </div>

          {/* 3. Codec */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <Film size={10} />
              <span>Video Codec</span>
            </div>
            <div className={styles.metricValue}>
              {meta ? (meta.videoCodec || 'H.264').toUpperCase() : '...'}
            </div>
            <div className={styles.metricSub}>{meta?.profile ? `${meta.profile} Profile` : 'AVC'}</div>
          </div>

          {/* 4. File Size */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <HardDrive size={10} />
              <span>File Size</span>
            </div>
            <div className={styles.metricValue}>
              {meta?.sizeFormatted || 'Loading...'}
            </div>
            <div className={styles.metricSub}>
              {meta?.overallBitrateKbps ? `~${meta.overallBitrateKbps} kbps` : 'Bitrate N/A'}
            </div>
          </div>

          {/* 5. Audio */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <Volume2 size={10} />
              <span>Audio</span>
            </div>
            <div className={styles.metricValue}>
              {meta?.hasAudio ? (meta.audioCodec || 'AAC') : 'Silent'}
            </div>
            <div className={styles.metricSub}>
              {meta?.hasAudio ? `${meta.channelLayout || 'Stereo'} • ${meta.sampleRateFormatted || '48kHz'}` : 'No Audio'}
            </div>
          </div>

          {/* 6. Duration */}
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>
              <Info size={10} />
              <span>Runtime</span>
            </div>
            <div className={styles.metricValue}>
              {meta?.durationFormatted || '...'}
            </div>
            <div className={styles.metricSub}>
              {meta?.durationSeconds ? `${Math.round(meta.durationSeconds)}s total` : 'Runtime'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`${styles.tabBtn} ${activeTab === 'specs' ? styles.tabBtnActive : ''}`}
          >
            <Sliders size={13} />
            <span>Technical Specs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('renditions')}
            className={`${styles.tabBtn} ${activeTab === 'renditions' ? styles.tabBtnActive : ''}`}
          >
            <Layers size={13} />
            <span>Multi-Quality Renditions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storyboard')}
            className={`${styles.tabBtn} ${activeTab === 'storyboard' ? styles.tabBtnActive : ''}`}
          >
            <Sparkles size={13} />
            <span>Hover Previews</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`${styles.tabBtn} ${activeTab === 'json' ? styles.tabBtnActive : ''}`}
          >
            <Terminal size={13} />
            <span>Raw Telemetry</span>
          </button>
        </div>

        {/* Body Content */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingBox}>
              <RefreshCw size={28} className={styles.spinner} style={{ color: '#38bdf8' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>Inspecting Video Telemetry...</p>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Probing S3 stream with FFprobe for codecs, framerate, and audio tracks...
                </p>
              </div>
            </div>
          ) : error ? (
            <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', color: '#fca5a5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <AlertCircle size={18} />
                <span>Probe Inspection Notice</span>
              </div>
              <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.82rem', color: '#fecaca' }}>{error}</p>
              <button
                type="button"
                onClick={() => fetchMeta(true)}
                className={styles.btnReProbe}
              >
                <RefreshCw size={13} />
                <span>Retry Probe</span>
              </button>
            </div>
          ) : meta ? (
            <>
              {/* TAB 1: Technical Specs */}
              {activeTab === 'specs' && (
                <div className={styles.specsSection}>
                  {/* Video Stream Category */}
                  <div className={styles.specsCategory}>
                    <div className={styles.specsCategoryHeader}>
                      <Film size={13} style={{ color: '#38bdf8' }} />
                      <span>Video Stream Specifications</span>
                    </div>
                    <div className={styles.specsList}>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Frame Dimensions</span>
                        <span className={styles.specVal}>{meta.width} × {meta.height} px</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Quality Classification</span>
                        <span className={styles.specVal}>{meta.qualityBadge} {meta.height >= 1080 ? 'Master' : 'Stream'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Aspect Ratio</span>
                        <span className={styles.specVal}>{meta.aspectRatio}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Framerate (FPS)</span>
                        <span className={styles.specVal}>{meta.fpsFormatted} ({meta.fps} frames/sec)</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Video Codec</span>
                        <span className={styles.specVal}>{meta.videoCodecLong || meta.videoCodec}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Codec Profile & Level</span>
                        <span className={styles.specVal}>{meta.profile || 'High'}{meta.level ? ` @ Level ${meta.level}` : ''}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Pixel Format / Bit Depth</span>
                        <span className={styles.specVal}><code className={styles.codeVal}>{meta.pixFmt || 'yuv420p'}</code> (8-bit SDR)</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Color Space & Primaries</span>
                        <span className={styles.specVal}>{meta.colorSpace || meta.colorPrimaries || 'bt709 (Rec. 709 HDTV)'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Scan Mode</span>
                        <span className={styles.specVal}>{meta.isInterlaced ? '⚠️ Interlaced' : '✓ Progressive (Clean Lines)'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Estimated Bitrate</span>
                        <span className={styles.specVal}>{meta.videoBitrateKbps ? `${meta.videoBitrateKbps} kbps` : (meta.overallBitrateKbps ? `~${meta.overallBitrateKbps} kbps` : 'Dynamic VBR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio Stream Category */}
                  <div className={styles.specsCategory}>
                    <div className={styles.specsCategoryHeader}>
                      <Volume2 size={13} style={{ color: '#a78bfa' }} />
                      <span>Audio Track Specifications</span>
                    </div>
                    <div className={styles.specsList}>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Audio Presence</span>
                        <span className={styles.specVal}>{meta.hasAudio ? '✓ Active Audio Track' : 'No Audio Track'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Audio Codec</span>
                        <span className={styles.specVal}>{meta.audioCodecLong || meta.audioCodec || 'AAC-LC'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Channel Layout</span>
                        <span className={styles.specVal}>{meta.channelLayout || 'Stereo'} ({meta.channels || 2} Channels)</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Sampling Frequency</span>
                        <span className={styles.specVal}>{meta.sampleRate ? `${meta.sampleRate.toLocaleString()} Hz (${meta.sampleRateFormatted})` : '48,000 Hz'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Audio Bitrate</span>
                        <span className={styles.specVal}>{meta.audioBitrateKbps ? `${meta.audioBitrateKbps} kbps` : '192 kbps (Standard)'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Compression Mode</span>
                        <span className={styles.specVal}>Lossy Perceptual (AAC)</span>
                      </div>
                    </div>
                  </div>

                  {/* Storage & Container Category */}
                  <div className={styles.specsCategory}>
                    <div className={styles.specsCategoryHeader}>
                      <HardDrive size={13} style={{ color: '#34d399' }} />
                      <span>AWS S3 Storage & Container</span>
                    </div>
                    <div className={styles.specsList}>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Container Format</span>
                        <span className={styles.specVal}>{meta.formatLongName || meta.formatName}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Payload File Size</span>
                        <span className={styles.specVal}>{meta.sizeFormatted || 'Unknown'} {meta.sizeBytes ? `(${meta.sizeBytes.toLocaleString()} bytes)` : ''}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>S3 Storage Key</span>
                        <span className={styles.specVal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <code className={styles.codeVal}>{meta.videoKey}</code>
                          <button
                            type="button"
                            onClick={() => handleCopyText(meta.videoKey, 's3key')}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            title="Copy S3 Key"
                          >
                            {copiedKey === 's3key' ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
                          </button>
                        </span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Faststart Streaming</span>
                        <span className={styles.specVal}>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>✓ +faststart (moov atom at head)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Multi-Quality Renditions */}
              {activeTab === 'renditions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>Adaptive Bitrate Renditions</h4>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                        All resolutions available for seamless client switching during playback.
                      </p>
                    </div>
                    <Link
                      href="/admin/transcoder"
                      className={styles.btnPrimary}
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Sliders size={12} />
                      <span>Open Transcoder Studio</span>
                    </Link>
                  </div>

                  <div className={styles.renditionGrid}>
                    {/* 1080p Master Card */}
                    <div className={`${styles.renditionCard} ${styles.renditionReady}`}>
                      <div className={styles.renditionHeader}>
                        <span className={styles.renditionQualityTitle}>1080p FHD</span>
                        <span className={styles.renditionBadgeReady}>✓ Master Ready</span>
                      </div>
                      <div className={styles.renditionDetailRow}>
                        <span>Resolution:</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{meta.renditions?.['1080p']?.resolution || '1920x1080'}</span>
                      </div>
                      <div className={styles.renditionDetailRow}>
                        <span>File Size:</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{meta.renditions?.['1080p']?.sizeMb ? `${meta.renditions['1080p'].sizeMb} MB` : (meta.sizeFormatted || 'Ready')}</span>
                      </div>
                      <div className={styles.renditionDetailRow}>
                        <span>Target Device:</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Desktop / 4K / TV</span>
                      </div>
                      <div className={styles.renditionActions}>
                        <a
                          href={meta.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.btnRenditionAction}
                        >
                          <Play size={11} fill="currentColor" />
                          <span>Direct Stream</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyText(meta.videoUrl, 'url1080')}
                          className={styles.btnRenditionAction}
                        >
                          {copiedKey === 'url1080' ? <Check size={11} /> : <Copy size={11} />}
                          <span>Copy CDN</span>
                        </button>
                      </div>
                    </div>

                    {/* 720p HD Card */}
                    {(() => {
                      const r720 = meta.renditions?.['720p'];
                      const isReady = !!r720?.isReady;
                      return (
                        <div className={`${styles.renditionCard} ${isReady ? styles.renditionReady : styles.renditionMissing}`}>
                          <div className={styles.renditionHeader}>
                            <span className={styles.renditionQualityTitle}>720p HD</span>
                            <span className={isReady ? styles.renditionBadgeReady : styles.renditionBadgeMissing}>
                              {isReady ? '✓ Ready on CDN' : 'Not Generated'}
                            </span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>Resolution:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>1280 × 720</span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>File Size:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{r720?.sizeMb ? `${r720.sizeMb} MB` : (isReady ? 'Ready' : 'Pending Transcode')}</span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>Target Device:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Laptops / Tablets</span>
                          </div>
                          <div className={styles.renditionActions}>
                            {isReady ? (
                              <>
                                <a
                                  href={r720.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.btnRenditionAction}
                                >
                                  <Play size={11} fill="currentColor" />
                                  <span>Direct Stream</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(r720.url, 'url720')}
                                  className={styles.btnRenditionAction}
                                >
                                  {copiedKey === 'url720' ? <Check size={11} /> : <Copy size={11} />}
                                  <span>Copy CDN</span>
                                </button>
                              </>
                            ) : (
                              <Link
                                href="/admin/transcoder"
                                className={styles.btnRenditionAction}
                                style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
                              >
                                <Zap size={11} />
                                <span>Generate in Transcoder</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 480p SD Mobile Card */}
                    {(() => {
                      const r480 = meta.renditions?.['480p'];
                      const isReady = !!r480?.isReady;
                      return (
                        <div className={`${styles.renditionCard} ${isReady ? styles.renditionReady : styles.renditionMissing}`}>
                          <div className={styles.renditionHeader}>
                            <span className={styles.renditionQualityTitle}>480p SD Mobile</span>
                            <span className={isReady ? styles.renditionBadgeReady : styles.renditionBadgeMissing}>
                              {isReady ? '✓ Ready on CDN' : 'Not Generated'}
                            </span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>Resolution:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>854 × 480</span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>File Size:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{r480?.sizeMb ? `${r480.sizeMb} MB` : (isReady ? 'Ready' : 'Pending Transcode')}</span>
                          </div>
                          <div className={styles.renditionDetailRow}>
                            <span>Target Device:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Mobile Phones (Data Saver)</span>
                          </div>
                          <div className={styles.renditionActions}>
                            {isReady ? (
                              <>
                                <a
                                  href={r480.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={styles.btnRenditionAction}
                                >
                                  <Play size={11} fill="currentColor" />
                                  <span>Direct Stream</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(r480.url, 'url480')}
                                  className={styles.btnRenditionAction}
                                >
                                  {copiedKey === 'url480' ? <Check size={11} /> : <Copy size={11} />}
                                  <span>Copy CDN</span>
                                </button>
                              </>
                            ) : (
                              <Link
                                href="/admin/transcoder"
                                className={styles.btnRenditionAction}
                                style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}
                              >
                                <Zap size={11} />
                                <span>Generate in Transcoder</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: Storyboard Previews */}
              {activeTab === 'storyboard' && (
                <div className={styles.storyboardContainer}>
                  <div className={styles.storyboardBanner}>
                    <div>
                      <div className={styles.storyboardBannerTitle}>
                        {meta.storyboard?.status === 'completed' ? '✓ Storyboard Previews Ready' : '⏳ Storyboard Pending'}
                      </div>
                      <div className={styles.storyboardBannerSub}>
                        Interactive 1-frame-per-second preview scrubbing generated with Lanczos scaling.
                      </div>
                    </div>
                    {meta.storyboard?.vttUrl && (
                      <a
                        href={meta.storyboard.vttUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.btnSecondary}
                        style={{ fontSize: '0.74rem' }}
                      >
                        <ExternalLink size={12} />
                        <span>Inspect VTT File</span>
                      </a>
                    )}
                  </div>

                  <div className={styles.specsCategory}>
                    <div className={styles.specsCategoryHeader}>
                      <Sparkles size={13} style={{ color: '#c084fc' }} />
                      <span>Storyboard Telemetry</span>
                    </div>
                    <div className={styles.specsList}>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Processing Status</span>
                        <span className={styles.specVal} style={{ color: meta.storyboard?.status === 'completed' ? '#34d399' : '#f59e0b', fontWeight: 700 }}>
                          {meta.storyboard?.status?.toUpperCase() || 'MISSING'}
                        </span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Frame Sampling Frequency</span>
                        <span className={styles.specVal}>1 frame every 1.0 second</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Sprite Sheet Count</span>
                        <span className={styles.specVal}>{meta.storyboard?.sheetCount || 0} WebP Sheets</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Grid Layout</span>
                        <span className={styles.specVal}>{meta.storyboard?.grid || '10 × 10 (100 tiles/sheet)'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>Tile Resolution</span>
                        <span className={styles.specVal}>{meta.storyboard?.tileDimensions || '160 × 90 px'}</span>
                      </div>
                      <div className={styles.specRow}>
                        <span className={styles.specKey}>VTT Manifest Key</span>
                        <span className={styles.specVal}>
                          <code className={styles.codeVal}>{meta.storyboard?.vttKey || 'storyboards/...'}</code>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Raw Telemetry JSON */}
              {activeTab === 'json' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      Raw JSON telemetry returned by FFprobe and S3 metadata engine:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(JSON.stringify(meta, null, 2), 'rawjson')}
                      className={styles.btnSecondary}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                    >
                      {copiedKey === 'rawjson' ? <Check size={11} style={{ color: '#34d399' }} /> : <Copy size={11} />}
                      <span>{copiedKey === 'rawjson' ? 'Copied JSON' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className={styles.jsonViewer}>
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button
              type="button"
              onClick={() => fetchMeta(true)}
              disabled={reprobing || loading}
              className={styles.btnReProbe}
              title="Execute fresh FFprobe inspection on the remote S3 stream"
            >
              <RefreshCw size={13} className={reprobing ? styles.spinner : ''} />
              <span>{reprobing ? 'Probing S3 Stream...' : 'Re-Probe Stream'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              disabled={!meta || loading}
              className={styles.btnSecondary}
              title="Copy formatted markdown report of all video specs"
            >
              {copiedKey === 'summary' ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
              <span>{copiedKey === 'summary' ? 'Specs Copied!' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className={styles.footerRight}>
            <Link
              href={meta?.episode?.series_slug ? `/watch/${meta.episode.series_slug}-episode-${meta.episode.episode_number}` : `/watch/${episodeId}`}
              target="_blank"
              className={styles.btnSecondary}
            >
              <Eye size={13} />
              <span>Watch</span>
            </Link>

            <Link
              href="/admin/transcoder"
              className={styles.btnPrimary}
            >
              <Sliders size={13} />
              <span>Transcoder Studio</span>
            </Link>

            {onReplaceVideo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReplaceVideo();
                }}
                className={styles.btnSecondary}
                style={{ color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.35)', background: 'rgba(139, 92, 246, 0.12)' }}
                title="Replace video file or delete from S3 (keeps episode box)"
              >
                <UploadCloud size={13} />
                <span>Replace Video</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={styles.btnSecondary}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
