'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Sliders, Video, Play, RefreshCw, CheckCircle2, AlertCircle, Clock,
  Cpu, HardDrive, ShieldCheck, Layers, Sparkles, ChevronDown, ChevronUp,
  Search, Eye, Film, SlidersHorizontal, Terminal, Zap, Check, X,
  AlertTriangle, Square, CheckSquare, RotateCcw
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './transcoder.module.css';

interface VideoQualityItem {
  key?: string;
  url?: string;
  resolution?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  size_mb?: number;
  created_at?: string;
}

interface EpisodeItem {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  video_key: string;
  duration_seconds: number;
  is_published: boolean;
  video_qualities?: Record<string, any>;
  storyboard?: any;
  has_720p: boolean;
  has_480p: boolean;
  is_fully_transcoded: boolean;
  is_storyboard_ready: boolean;
  source_height: number;
  source_width: number;
}

interface SeasonItem {
  id: string;
  series_id: string;
  season_number: number;
  title: string;
  episodes: EpisodeItem[];
}

interface SeriesItem {
  id: string;
  title: string;
  slug?: string;
  studio?: string;
  release_year?: number;
  poster_image_key?: string;
  is_published: boolean;
  seasons: SeasonItem[];
  stats: {
    total_episodes: number;
    transcoded_episodes: number;
    storyboard_episodes: number;
    is_all_transcoded: boolean;
    is_all_storyboard_ready: boolean;
  };
}

interface CatalogStats {
  total_episodes: number;
  total_series: number;
  has_1080p: number;
  has_720p: number;
  has_480p: number;
  fully_transcoded: number;
  missing_video: number;
  storyboard_ready: number;
  total_transcoded_gb: number;
  transcode_percentage: number;
  storyboard_percentage: number;
}

interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function AdminTranscoderPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);

  // User Setting: Only compress episodes in 1080p
  const [only1080p, setOnly1080p] = useState<boolean>(true);
  const [generate720p, setGenerate720p] = useState<boolean>(true);
  const [generate480p, setGenerate480p] = useState<boolean>(true);
  const [concurrency, setConcurrency] = useState<number>(1);
  const [threads, setThreads] = useState<number>(4);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'needs_transcode' | '1080p_eligible' | 'fully_transcoded' | 'missing_preview'>('all');
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<Set<string>>(new Set());

  // Batch Execution & SSE state
  const [batchRunning, setBatchRunning] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    percentage: number;
    currentMsg?: string;
  }>({ total: 0, completed: 0, skipped: 0, failed: 0, percentage: 0 });

  // Live Terminal Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single Episode Processing tracking
  const [processingEpIds, setProcessingEpIds] = useState<Set<string>>(new Set());

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedOnly1080p = localStorage.getItem('transcoder_only_1080p');
      if (savedOnly1080p !== null) setOnly1080p(savedOnly1080p === 'true');

      const saved720p = localStorage.getItem('transcoder_gen_720p');
      if (saved720p !== null) setGenerate720p(saved720p === 'true');

      const saved480p = localStorage.getItem('transcoder_gen_480p');
      if (saved480p !== null) setGenerate480p(saved480p === 'true');

      const savedConc = localStorage.getItem('transcoder_concurrency');
      if (savedConc !== null) setConcurrency(Number(savedConc) || 1);

      const savedThreads = localStorage.getItem('transcoder_threads');
      if (savedThreads !== null) setThreads(Number(savedThreads) || 4);
    } catch (_) {}

    fetchData();
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-300), { id: `${Date.now()}_${Math.random()}`, time, text, type }]);
  };

  useEffect(() => {
    if (autoScrollLogs && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScrollLogs]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/transcoder');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch transcoder catalog');
      setStats(data.stats);
      setSeriesList(data.series || []);
      addLog(`Catalog synced: ${data.stats.total_episodes} episodes across ${data.stats.total_series} series loaded.`, 'info');
    } catch (err: any) {
      setError(err.message);
      addLog(`Error loading catalog: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnly1080p = () => {
    setOnly1080p((prev) => {
      const next = !prev;
      localStorage.setItem('transcoder_only_1080p', String(next));
      addLog(`Setting updated: "Only compress episodes in 1080p" is now ${next ? 'ENABLED (Safe)' : 'DISABLED (All)'}.`, next ? 'success' : 'warning');
      return next;
    });
  };

  const handleSetConcurrency = (val: number) => {
    setConcurrency(val);
    localStorage.setItem('transcoder_concurrency', String(val));
  };

  const handleSetThreads = (val: number) => {
    setThreads(val);
    localStorage.setItem('transcoder_threads', String(val));
  };

  const toggleSeriesExpand = (seriesId: string) => {
    setExpandedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) next.delete(seriesId);
      else next.add(seriesId);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSeriesIds(new Set(seriesList.map((s) => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedSeriesIds(new Set());
  };

  // Single Episode Probe
  const handleProbeEpisode = async (ep: EpisodeItem) => {
    setProcessingEpIds((prev) => new Set(prev).add(ep.id));
    addLog(`Probing stream resolution for "${ep.title}"...`, 'info');
    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'probe_single', episodeId: ep.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Probe failed');
      addLog(`✓ Probed "${ep.title}": ${data.probe.width}x${data.probe.height} @ ${data.probe.fps}fps, ${Math.round(data.probe.duration)}s`, 'success');
      await fetchData();
    } catch (err: any) {
      addLog(`✕ Probe failed for "${ep.title}": ${err.message}`, 'error');
    } finally {
      setProcessingEpIds((prev) => {
        const next = new Set(prev);
        next.delete(ep.id);
        return next;
      });
    }
  };

  // Single Episode Reset / Re-probe (purges 720p/480p from S3 and re-probes master)
  const handleResetEpisode = async (ep: EpisodeItem) => {
    if (!confirm(`Reset renditions for "${ep.title}"? This will purge generated 720p and 480p videos from S3 and re-probe your current master video.`)) return;
    setProcessingEpIds((prev) => new Set(prev).add(ep.id));
    addLog(`Purging renditions from S3 and resetting qualities for "${ep.title}"...`, 'info');
    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_single', episodeId: ep.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      addLog(`✓ Reset complete for "${ep.title}". Re-probed: ${data.probe.width}x${data.probe.height} @ ${data.probe.fps}fps.`, 'success');
      await fetchData();
    } catch (err: any) {
      addLog(`✕ Reset failed for "${ep.title}": ${err.message}`, 'error');
    } finally {
      setProcessingEpIds((prev) => {
        const next = new Set(prev);
        next.delete(ep.id);
        return next;
      });
    }
  };


  // Single Episode Transcode
  const handleTranscodeEpisode = async (ep: EpisodeItem) => {
    setProcessingEpIds((prev) => new Set(prev).add(ep.id));
    addLog(`Starting transcode for "${ep.title}" (only1080p: ${only1080p ? 'ON' : 'OFF'}, ${threads} threads)...`, 'info');
    try {
      const res = await fetch('/api/admin/transcoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transcode_single',
          episodeId: ep.id,
          options: {
            only1080p,
            generate720p,
            generate480p,
            threads,
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcode failed');
      addLog(`✓ Finished transcoding "${ep.title}"! Multi-quality video is live on CDN.`, 'success');
      await fetchData();
    } catch (err: any) {
      addLog(`✕ Transcode failed for "${ep.title}": ${err.message}`, 'error');
    } finally {
      setProcessingEpIds((prev) => {
        const next = new Set(prev);
        next.delete(ep.id);
        return next;
      });
    }
  };

  // Batch Transcode
  const handleStartBulk = async (targetEpisodeIds?: string[]) => {
    if (batchRunning) return;
    setBatchRunning(true);
    setBatchProgress({ total: 0, completed: 0, skipped: 0, failed: 0, percentage: 0 });
    addLog(`Initiating bulk transcoding job (concurrency: ${concurrency}, threads: ${threads}, only1080p: ${only1080p})...`, 'info');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/admin/transcoder/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          only1080p,
          onlyMissing: !targetEpisodeIds,
          episodeIds: targetEpisodeIds,
          concurrency,
          generate720p,
          generate480p,
          threads,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Bulk transcode request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream returned by server.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evtStr of events) {
          if (!evtStr.trim()) continue;
          const lines = evtStr.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'start') {
              setBatchProgress((prev) => ({ ...prev, total: data.total }));
              addLog(data.message, 'info');
            } else if (eventType === 'progress') {
              const pct = data.total > 0 ? Math.round((data.index / data.total) * 100) : 0;
              setBatchProgress((prev) => ({ ...prev, percentage: pct, currentMsg: data.message }));
              addLog(data.message, 'info');
            } else if (eventType === 'episode_complete') {
              setBatchProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
              addLog(data.message, 'success');
            } else if (eventType === 'episode_skipped') {
              setBatchProgress((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
              addLog(data.message, 'warning');
            } else if (eventType === 'episode_error') {
              setBatchProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
              addLog(data.message, 'error');
            } else if (eventType === 'complete') {
              addLog(data.message, 'success');
              await fetchData();
            }
          } catch (_) {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog('Bulk transcoding aborted by user.', 'warning');
      } else {
        addLog(`Bulk transcode error: ${err.message}`, 'error');
      }
    } finally {
      setBatchRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelBulk = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Filtered Series & Episode list
  const filteredSeries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return seriesList.filter((s) => {
      // 1. Search Query check
      const matchesSearch =
        q === '' ||
        s.title.toLowerCase().includes(q) ||
        (s.studio || '').toLowerCase().includes(q) ||
        s.seasons.some((sn) =>
          sn.episodes.some((ep) => ep.title.toLowerCase().includes(q) || ep.video_key.toLowerCase().includes(q))
        );

      if (!matchesSearch) return false;

      // 2. Tab Filter check
      if (activeFilterTab === 'all') return true;
      if (activeFilterTab === 'needs_transcode') {
        return !s.stats.is_all_transcoded;
      }
      if (activeFilterTab === '1080p_eligible') {
        return s.seasons.some((sn) => sn.episodes.some((ep) => ep.source_height >= 1080));
      }
      if (activeFilterTab === 'fully_transcoded') {
        return s.stats.is_all_transcoded;
      }
      if (activeFilterTab === 'missing_preview') {
        return !s.stats.is_all_storyboard_ready;
      }
      return true;
    });
  }, [seriesList, searchQuery, activeFilterTab]);

  return (
    <div className={styles.container}>
      {/* 1. Header Area */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <Sliders size={26} style={{ color: '#8b5cf6' }} />
            <h1 className={styles.title}>Multi-Quality Video Transcoder</h1>
            <span className={styles.tagPill}>
              <Zap size={11} />
              <span>Studio Engine</span>
            </span>
          </div>
          <p className={styles.subtitle}>
            Automated FFmpeg transcode pipeline with animation tuning, <code>+faststart</code> streaming optimizations,
            and source resolution safeguarding. Seamlessly downscales 1080p masters into high-efficiency 720p HD and 480p SD Mobile renditions.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading || batchRunning}
            className={styles.secondaryActionBtn}
            title="Refresh status from local catalog and storage"
          >
            <RefreshCw size={14} className={loading ? styles.spinner : ''} />
            <span>Sync Catalog</span>
          </button>

          <Link href="/admin/episodes" className={styles.secondaryActionBtn}>
            <Video size={14} />
            <span>Episodes Manager</span>
          </Link>
        </div>
      </div>

      {/* 2. Global Metrics Banner */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd' }}>
              <Film size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.total_episodes}</span>
              <span className={styles.statLabel}>Total Episodes</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Video size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.has_1080p}</span>
              <span className={styles.statLabel}>1080p Masters</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.has_720p}</span>
              <span className={styles.statLabel}>720p HD Ready</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.has_480p}</span>
              <span className={styles.statLabel}>480p SD Ready</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              <Zap size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.fully_transcoded}</span>
              <span className={styles.statLabel}>Fully Transcoded</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Sparkles size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.storyboard_ready}</span>
              <span className={styles.statLabel}>Previews (Storyboards)</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconBox} style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15' }}>
              <HardDrive size={22} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats.total_transcoded_gb} GB</span>
              <span className={styles.statLabel}>Transcoded CDN Storage</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Transcoding Settings Card (User's specific 1080p filter & tuning) */}
      <div className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <div className={styles.settingsTitle}>
            <SlidersHorizontal size={18} style={{ color: '#8b5cf6' }} />
            <span>Transcoding & Safeguard Settings</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Persists to local storage & applies to all single and batch jobs
          </span>
        </div>

        <div className={styles.settingsGrid}>
          {/* USER REQUIREMENT: Only compress 1080p episodes setting */}
          <div className={styles.settingItem}>
            <div className={styles.settingItemLabel}>
              <span>1080p Master Safeguard</span>
              <span style={{ fontSize: '0.72rem', color: only1080p ? '#34d399' : '#f59e0b', fontWeight: 800 }}>
                {only1080p ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div
              onClick={handleToggleOnly1080p}
              className={`${styles.toggleSwitchWrap} ${only1080p ? styles.toggleSwitchWrapActive : ''}`}
            >
              <div className={`${styles.switchTrack} ${only1080p ? styles.switchTrackActive : ''}`}>
                <div className={`${styles.switchThumb} ${only1080p ? styles.switchThumbActive : ''}`} />
              </div>
              <div className={styles.toggleTextContent}>
                <span className={styles.toggleMainText}>
                  Only compress episodes that are in 1080p
                </span>
                <span className={styles.toggleSubText}>
                  {only1080p
                    ? 'Probes resolution via ffprobe. Skips any episode below 1080p (height < 1080) to prevent quality degradation.'
                    : 'Transcodes all videos regardless of resolution. Caution: lower-res videos may be scaled up or re-encoded needlessly.'}
                </span>
              </div>
            </div>
          </div>

          {/* Quality Targets */}
          <div className={styles.settingItem}>
            <div className={styles.settingItemLabel}>
              <span>Target Renditions</span>
            </div>
            <div className={styles.qualityTargetsRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generate720p}
                  onChange={(e) => {
                    setGenerate720p(e.target.checked);
                    localStorage.setItem('transcoder_gen_720p', String(e.target.checked));
                  }}
                  className={styles.checkboxInput}
                />
                <span><strong>720p HD</strong> (scale=-2:720, CRF 22, -65% size)</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={generate480p}
                  onChange={(e) => {
                    setGenerate480p(e.target.checked);
                    localStorage.setItem('transcoder_gen_480p', String(e.target.checked));
                  }}
                  className={styles.checkboxInput}
                />
                <span><strong>480p SD Mobile</strong> (scale=-2:480, CRF 24, -85% size)</span>
              </label>
            </div>
            <span className={styles.settingDescription}>
              Generates independent MP4 renditions with <code>-tune animation</code> and <code>+faststart</code> for immediate seeking.
            </span>
          </div>

          {/* Concurrency and Worker CPU Threads */}
          <div className={styles.settingItem}>
            <div className={styles.settingItemLabel}>
              <span>Worker Concurrency</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{concurrency} Active Job{concurrency > 1 ? 's' : ''}</span>
            </div>
            <div className={styles.pillGroup}>
              {[1, 2, 4].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSetConcurrency(c)}
                  className={`${styles.choicePill} ${concurrency === c ? styles.choicePillActive : ''}`}
                >
                  {c} Worker{c > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <div className={styles.settingItemLabel}>
                <span>CPU Threads per Worker</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{threads} vCPUs</span>
              </div>
              <div className={styles.pillGroup}>
                {[2, 4, 8].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSetThreads(t)}
                    className={`${styles.choicePill} ${threads === t ? styles.choicePillActive : ''}`}
                  >
                    {t} vCPUs {t === 4 ? '(Recommended)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Batch Transcode Action Bar */}
      <div className={styles.batchBar}>
        <div className={styles.batchBarLeft}>
          <div className={styles.statIconBox} style={{ background: 'rgba(139, 92, 246, 0.25)', color: '#c4b5fd' }}>
            <Cpu size={22} />
          </div>
          <div>
            <div className={styles.batchTitle}>
              {batchRunning ? 'Bulk Transcoder Running...' : 'Automated Batch Transcoder'}
            </div>
            <div className={styles.batchSubtitle}>
              {batchRunning
                ? `Processed ${batchProgress.completed + batchProgress.skipped + batchProgress.failed} / ${batchProgress.total} episodes (${batchProgress.completed} done, ${batchProgress.skipped} skipped, ${batchProgress.failed} failed)`
                : `Ready to transcode all eligible episodes with ${concurrency} worker(s) and ${threads} vCPUs per worker.`}
            </div>
          </div>
        </div>

        <div className={styles.batchActions}>
          {!batchRunning ? (
            <button
              type="button"
              onClick={() => handleStartBulk()}
              className={styles.primaryActionBtn}
              title="Transcode all episodes currently missing 720p or 480p"
            >
              <Play size={15} fill="currentColor" />
              <span>Transcode All Missing ({stats ? stats.total_episodes - stats.fully_transcoded : 0})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelBulk}
              className={styles.stopActionBtn}
              title="Stop current batch transcode job"
            >
              <Square size={14} fill="currentColor" />
              <span>Stop Transcoding</span>
            </button>
          )}
        </div>

        {batchRunning && (
          <div className={styles.batchProgressContainer}>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${batchProgress.percentage}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              <span>{batchProgress.currentMsg || 'Processing...'}</span>
              <span><strong>{batchProgress.percentage}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Live FFmpeg Log Terminal */}
      <div className={styles.terminalCard}>
        <div className={styles.terminalHeader}>
          <div className={styles.terminalTitle}>
            <Terminal size={14} style={{ color: '#38bdf8' }} />
            <span>Transcode Terminal Logs</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({logs.length} lines)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoScrollLogs}
                onChange={(e) => setAutoScrollLogs(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span>Auto-scroll</span>
            </label>

            <button
              type="button"
              onClick={() => setLogs([])}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.72rem' }}
            >
              Clear
            </button>
          </div>
        </div>

        <div ref={terminalRef} className={styles.terminalBody}>
          {logs.length === 0 ? (
            <div style={{ color: '#475569', fontStyle: 'italic' }}>Terminal ready. Waiting for transcode activity...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={styles.logLine}>
                <span className={styles.logTimestamp}>[{log.time}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? styles.logSuccess
                      : log.type === 'warning'
                      ? styles.logWarning
                      : log.type === 'error'
                      ? styles.logError
                      : styles.logInfo
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Filter Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search series, episodes, or video keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            type="button"
            onClick={() => setActiveFilterTab('all')}
            className={`${styles.filterTabBtn} ${activeFilterTab === 'all' ? styles.filterTabBtnActive : ''}`}
          >
            All Shows ({seriesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('needs_transcode')}
            className={`${styles.filterTabBtn} ${activeFilterTab === 'needs_transcode' ? styles.filterTabBtnActive : ''}`}
          >
            Needs Transcoding ({seriesList.filter((s) => !s.stats.is_all_transcoded).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('1080p_eligible')}
            className={`${styles.filterTabBtn} ${activeFilterTab === '1080p_eligible' ? styles.filterTabBtnActive : ''}`}
          >
            1080p Masters ({seriesList.filter((s) => s.seasons.some((sn) => sn.episodes.some((ep) => ep.source_height >= 1080))).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('fully_transcoded')}
            className={`${styles.filterTabBtn} ${activeFilterTab === 'fully_transcoded' ? styles.filterTabBtnActive : ''}`}
          >
            100% Ready ({seriesList.filter((s) => s.stats.is_all_transcoded).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('missing_preview')}
            className={`${styles.filterTabBtn} ${activeFilterTab === 'missing_preview' ? styles.filterTabBtnActive : ''}`}
          >
            Missing Previews ({seriesList.filter((s) => !s.stats.is_all_storyboard_ready).length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={handleExpandAll}
            className={styles.secondaryActionBtn}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
          >
            <ChevronDown size={13} />
            <span>Expand All</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className={styles.secondaryActionBtn}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
          >
            <ChevronUp size={13} />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* 7. Hierarchical Series & Episode Matrix */}
      <div className={styles.seriesList}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', width: '38px', height: '38px', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>Scanning catalog and storage renditions...</p>
          </div>
        ) : filteredSeries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(18, 22, 34, 0.5)', borderRadius: '14px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <AlertCircle size={32} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#ffffff', fontWeight: 700, margin: 0 }}>No matching series found</p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>Try clearing filters or search criteria.</p>
          </div>
        ) : (
          filteredSeries.map((series) => {
            const isExpanded = expandedSeriesIds.has(series.id);
            const allEps = series.seasons.flatMap((sn) => sn.episodes);
            const posterUrl = series.poster_image_key ? getR2Url(series.poster_image_key, 'poster') : null;

            return (
              <div
                key={series.id}
                className={`${styles.seriesCard} ${isExpanded ? styles.seriesCardExpanded : ''}`}
              >
                {/* Series Header Row */}
                <div
                  className={styles.seriesHeader}
                  onClick={() => toggleSeriesExpand(series.id)}
                >
                  <div className={styles.seriesHeaderLeft}>
                    {posterUrl ? (
                      <img src={posterUrl} alt="" className={styles.seriesThumb} />
                    ) : (
                      <div className={styles.seriesThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Film size={20} style={{ color: '#64748b' }} />
                      </div>
                    )}

                    <div className={styles.seriesInfo}>
                      <div className={styles.seriesTitleRow}>
                        <h3 className={styles.seriesTitle}>{series.title}</h3>
                        {series.slug && (
                          <Link
                            href={`/series/${series.slug}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: '#38bdf8', fontSize: '0.74rem', textDecoration: 'none' }}
                            title="View public page"
                          >
                            /{series.slug}
                          </Link>
                        )}
                      </div>

                      <div className={styles.seriesMetaSub}>
                        <span>{series.studio || 'Studio Unknown'}</span>
                        <span>•</span>
                        <span>{series.release_year || '2026'}</span>
                        <span>•</span>
                        <span>{allEps.length} Episode{allEps.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Dual Rollup Badges + Transcode Show Button */}
                  <div className={styles.seriesHeaderRight} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.dualBadgesRow}>
                      {/* Quality Rollup Badge */}
                      {series.stats.is_all_transcoded ? (
                        <span className={styles.seriesQualityBadgeDone} title="All episodes in this series have 1080p, 720p, and 480p">
                          🎬 Multi-Quality: {series.stats.transcoded_episodes}/{series.stats.total_episodes} Ready
                        </span>
                      ) : series.stats.transcoded_episodes > 0 ? (
                        <span className={styles.seriesQualityBadgePartial} title="Some episodes have multi-quality renditions">
                          🎬 Multi-Quality: {series.stats.transcoded_episodes}/{series.stats.total_episodes} Partial
                        </span>
                      ) : (
                        <span className={styles.seriesQualityBadgeNone} title="No multi-quality renditions yet">
                          🎬 Multi-Quality: 0/{series.stats.total_episodes} Transcoded
                        </span>
                      )}

                      {/* Storyboard / Preview Rollup Badge */}
                      {series.stats.is_all_storyboard_ready ? (
                        <span className={styles.seriesStoryboardBadgeDone} title="All episode preview storyboards ready">
                          🎞️ Previews: {series.stats.storyboard_episodes}/{series.stats.total_episodes} Ready
                        </span>
                      ) : series.stats.storyboard_episodes > 0 ? (
                        <span className={styles.seriesStoryboardBadgePartial} title="Some episode preview storyboards ready">
                          🎞️ Previews: {series.stats.storyboard_episodes}/{series.stats.total_episodes} Partial
                        </span>
                      ) : (
                        <span className={styles.seriesStoryboardBadgeNone} title="Missing preview storyboards">
                          ⏳ Previews: 0/{series.stats.total_episodes} Missing
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartBulk(allEps.map((e) => e.id))}
                      disabled={batchRunning || allEps.length === 0}
                      className={styles.secondaryActionBtn}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#c4b5fd' }}
                      title="Transcode all episodes in this show"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Transcode Show</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSeriesExpand(series.id)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Episodes Breakdown */}
                {isExpanded && (
                  <div className={styles.episodesContainer}>
                    {allEps.length === 0 ? (
                      <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No episodes added to this series yet.
                      </div>
                    ) : (
                      allEps.map((ep) => {
                        const isProcessing = processingEpIds.has(ep.id);
                        const q = ep.video_qualities || {};
                        const sb = ep.storyboard || {};

                        // Resolution check
                        const sourceH = ep.source_height || 1080;
                        const sourceW = ep.source_width || 1920;
                        const is1080Eligible = sourceH >= 1080;

                        return (
                          <div key={ep.id} className={styles.episodeRow}>
                            {/* Left: Ep number, title, master source info */}
                            <div className={styles.episodeLeft}>
                              <span className={styles.epNumPill}>
                                Ep {ep.episode_number}
                              </span>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span className={styles.epTitle}>{ep.title}</span>
                                  {is1080Eligible ? (
                                    <span className={styles.epEligibilityEligible} title="Eligible for 720p and 480p downscaling">
                                      ✓ 1080p Master ({sourceW}x{sourceH})
                                    </span>
                                  ) : (
                                    <span className={styles.epEligibilityProtected} title="Protected from needless downscaling by 1080p setting">
                                      🛡️ {sourceH}p Master (Protected)
                                    </span>
                                  )}
                                </div>

                                <div className={styles.epMetaRow}>
                                  <span>{Math.floor((ep.duration_seconds || 1440) / 60)} min</span>
                                  <span>•</span>
                                  <span>Key: <code>{ep.video_key || 'No video'}</code></span>
                                </div>
                              </div>
                            </div>

                            {/* Middle: Quality Breakdown Matrix & Preview Image Status */}
                            <div className={styles.qualityMatrix}>
                              {/* 1080p Master status */}
                              <div className={`${styles.qualityItemPill} ${ep.video_key ? styles.qualityItemReady : styles.qualityItemMissing}`}>
                                <span>1080p:</span>
                                <span>{ep.video_key ? 'Master Ready' : 'Missing'}</span>
                              </div>

                              {/* 720p HD status */}
                              <div className={`${styles.qualityItemPill} ${ep.has_720p ? styles.qualityItemReady : styles.qualityItemMissing}`}>
                                <span>720p:</span>
                                <span>{ep.has_720p ? `${q['720p']?.size_mb ? `${q['720p'].size_mb}MB` : 'Ready'}` : 'Not Generated'}</span>
                              </div>

                              {/* 480p SD status */}
                              <div className={`${styles.qualityItemPill} ${ep.has_480p ? styles.qualityItemReady : styles.qualityItemMissing}`}>
                                <span>480p:</span>
                                <span>{ep.has_480p ? `${q['480p']?.size_mb ? `${q['480p'].size_mb}MB` : 'Ready'}` : 'Not Generated'}</span>
                              </div>

                              {/* Preview Image (Storyboard) Badge */}
                              {ep.is_storyboard_ready ? (
                                <span className={styles.epStoryboardReadyPill} title={`Storyboard preview ready (${sb.sheet_count || 1} sheets, 1fps)`}>
                                  🎞️ Preview Ready
                                </span>
                              ) : (
                                <span className={styles.epStoryboardMissingPill} title="No hover preview storyboard generated">
                                  ⏳ No Preview
                                </span>
                              )}
                            </div>

                            {/* Right: Actions */}
                            <div className={styles.episodeActions}>
                              <button
                                type="button"
                                onClick={() => handleTranscodeEpisode(ep)}
                                disabled={isProcessing || batchRunning}
                                className={styles.btnTranscodeEp}
                                title="Transcode 720p & 480p renditions now"
                              >
                                {isProcessing ? (
                                  <RefreshCw size={12} className={styles.spinner} />
                                ) : (
                                  <Play size={12} fill="currentColor" />
                                )}
                                <span>{isProcessing ? 'Encoding...' : 'Transcode'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleProbeEpisode(ep)}
                                disabled={isProcessing || batchRunning}
                                className={styles.btnProbeEp}
                                title="Probe video stream with ffprobe"
                              >
                                <Search size={11} />
                                <span>Probe</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetEpisode(ep)}
                                disabled={isProcessing || batchRunning}
                                className={styles.btnProbeEp}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
                                title="Purge 720p/480p renditions from S3 and re-probe master"
                              >
                                <RotateCcw size={11} />
                                <span>Reset</span>
                              </button>

                              <Link
                                href={series.slug ? `/watch/${series.slug}-episode-${ep.episode_number}` : `/watch/${ep.id}`}
                                target="_blank"
                                className={styles.btnWatchEp}
                                title="Open in video player"
                              >
                                <Eye size={12} />
                                <span>Watch</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
