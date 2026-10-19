'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Film, 
  HardDrive, 
  Cloud, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Sliders
} from 'lucide-react';
import styles from './StoryboardStudio.module.css';

interface StoryboardData {
  status: 'completed' | 'failed' | 'pending' | 'missing';
  interval?: number;
  sheet_count?: number;
  total_frames?: number;
  prefix?: string;
  generated_at?: string;
  fps?: number;
  resolution?: string;
  size_kb?: number;
  error?: string;
}

interface EpisodeItem {
  id: string;
  title: string;
  episode_number: number;
  video_key: string;
  duration_seconds: number;
  season_id?: string;
  storyboard: StoryboardData;
}

interface StoryboardStudioProps {
  onUpdate?: () => void;
}

export default function StoryboardStudio({ onUpdate }: StoryboardStudioProps) {
  const [stats, setStats] = useState<any>({
    total: 0,
    completed: 0,
    missing: 0,
    failed: 0,
    totalSizeKb: 0,
    totalFrames: 0,
    percentage: 0,
  });

  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    currentIndex: number;
    total: number;
    percent: number;
    currentTitle: string;
    message: string;
  } | null>(null);

  const [concurrency, setConcurrency] = useState<number>(2);
  const [logs, setLogs] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'ready' | 'missing' | 'failed'>('all');
  const [generatingEpisodeId, setGeneratingEpisodeId] = useState<string | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch storyboard statistics and history
  const fetchStoryboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/storyboard');
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
        setEpisodes(data.episodes);
      }
    } catch (err) {
      console.error('Failed to load storyboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryboardData();
  }, []);

  const appendLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-80), `[${time}] ${msg}`]);
    if (logBoxRef.current) {
      setTimeout(() => {
        if (logBoxRef.current) {
          logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  // Start 1-Click Bulk Generation
  const handleStartBulk = async (onlyMissing = true) => {
    if (isBulkRunning) return;
    setIsBulkRunning(true);
    setLogs([]);
    appendLog(`🚀 Initializing bulk generator (${concurrency} parallel worker${concurrency > 1 ? 's' : ''}, 1 frame/sec, Lanczos anti-blur)...`);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/admin/storyboard/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyMissing, concurrency }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by server response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const eventMatch = block.match(/event:\s*(.+)/);
          const dataMatch = block.match(/data:\s*(.+)/);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1].trim();
            const data = JSON.parse(dataMatch[1]);

            if (event === 'start') {
              appendLog(data.message);
              setBulkProgress({
                currentIndex: 0,
                total: data.total,
                percent: 0,
                currentTitle: 'Starting...',
                message: data.message,
              });
            } else if (event === 'progress') {
              setBulkProgress({
                currentIndex: data.currentIndex,
                total: data.total,
                percent: data.percent,
                currentTitle: data.title,
                message: data.message,
              });
            } else if (event === 'log') {
              appendLog(data.message);
            } else if (event === 'episode_completed') {
              appendLog(`✓ ${data.message}`);
              setEpisodes((prev) =>
                prev.map((e) =>
                  e.id === data.episodeId ? { ...e, storyboard: data.storyboard } : e
                )
              );
              setBulkProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      currentIndex: data.currentIndex,
                      percent: data.percent,
                      message: data.message,
                    }
                  : null
              );
            } else if (event === 'episode_failed') {
              appendLog(`✗ ${data.message}`);
            } else if (event === 'finished') {
              appendLog(`🎉 ${data.message}`);
              setBulkProgress(null);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        appendLog('⏸ Bulk generation stopped by user.');
      } else {
        appendLog(`Error: ${err.message || 'Bulk generation interrupted'}`);
      }
    } finally {
      setIsBulkRunning(false);
      abortControllerRef.current = null;
      await fetchStoryboardData();
      onUpdate?.();
    }
  };

  const handleStopBulk = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Generate for a single episode
  const handleGenerateSingle = async (episodeId: string) => {
    if (generatingEpisodeId) return;
    setGeneratingEpisodeId(episodeId);
    appendLog(`Starting generation for episode ${episodeId}...`);

    try {
      const res = await fetch('/api/admin/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      appendLog(`✓ Success: ${data.message}`);
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === episodeId ? { ...e, storyboard: data.storyboard } : e
        )
      );
      await fetchStoryboardData();
      onUpdate?.();
    } catch (err: any) {
      appendLog(`✗ Error on ${episodeId}: ${err.message}`);
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGeneratingEpisodeId(null);
    }
  };

  const filteredEpisodes = episodes.filter((ep) => {
    const s = ep.storyboard?.status || 'missing';
    if (historyFilter === 'ready') return s === 'completed';
    if (historyFilter === 'missing') return s === 'missing';
    if (historyFilter === 'failed') return s === 'failed';
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Top Banner Row */}
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.iconBadge}>
            <Zap size={24} />
          </div>
          <div className={styles.titleText}>
            <h3>
              Ultra-Fast Storyboard Studio (1 Frame / Sec)
              <span className={styles.badgeAwsSydney}>
                <Cloud size={13} />
                AWS Sydney (ap-southeast-2) • $0.00 Internal Bandwidth
              </span>
            </h3>
            <p>
              Pre-generate WebP storyboard sheets for true 0ms YouTube-style scrubbing with Lanczos anti-blur sharpness.
            </p>
          </div>
        </div>

        <div className={styles.actionsBar}>
          <div className={styles.concurrencyGroup} title="Parallel processing workers (adjust based on instance vCPUs)">
            <span className={styles.concurrencyLabel}>Workers:</span>
            {[1, 2, 4, 6, 8].map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.concurrencyBtn} ${concurrency === c ? styles.concurrencyBtnActive : ''}`}
                onClick={() => setConcurrency(c)}
                disabled={isBulkRunning}
                title={`${c} parallel episode${c > 1 ? 's at the same time' : ''} (${c === 1 ? 'Safe for 1-2 vCPU' : c === 4 ? 'Optimal for 8-16 vCPU' : c >= 6 ? 'Turbo for 16+ vCPU' : ''})`}
              >
                {c}x
              </button>
            ))}
          </div>

          {!isBulkRunning ? (
            <button
              onClick={() => handleStartBulk(true)}
              className={styles.primaryBtn}
              disabled={loading || stats.missing === 0}
              title="Generate 1-second storyboard sprite sheets for all missing episodes"
            >
              <Zap size={16} />
              <span>Generate All Missing ({stats.missing})</span>
            </button>
          ) : (
            <button onClick={handleStopBulk} className={styles.secondaryBtn}>
              <span>⏸ Pause Generation</span>
            </button>
          )}

          <button onClick={fetchStoryboardData} className={styles.secondaryBtn} title="Refresh status">
            <RotateCw size={15} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className={styles.secondaryBtn}
            title="Inspect storyboard generation history"
          >
            <Clock size={15} />
            <span>History & List</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>Total Episodes</span>
          <span className={styles.statItemValue}>{stats.total}</span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>0ms Ready (Completed)</span>
          <span className={styles.statItemValue} style={{ color: '#34d399' }}>
            {stats.completed} ({stats.percentage}%)
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>Missing Storyboard</span>
          <span className={styles.statItemValue} style={{ color: stats.missing > 0 ? '#fbbf24' : '#94a3b8' }}>
            {stats.missing}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statItemLabel}>Total Sheets Size</span>
          <span className={styles.statItemValue} style={{ color: '#38bdf8' }}>
            {(stats.totalSizeKb / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>

      {/* Live Bulk Progress Bar & Terminal Log Stream */}
      {(isBulkRunning || bulkProgress || logs.length > 0) && (
        <div className={styles.progressContainer}>
          <div className={styles.progressStatusText}>
            <span>
              {bulkProgress
                ? `Processing [${bulkProgress.currentIndex}/${bulkProgress.total}]: ${bulkProgress.currentTitle}`
                : isBulkRunning
                ? 'Processing...'
                : 'Bulk Operation Idle'}
            </span>
            <span>{bulkProgress ? `${bulkProgress.percent}%` : ''}</span>
          </div>

          <div className={styles.progressBarBg}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${bulkProgress?.percent || (isBulkRunning ? 5 : 0)}%` }}
            />
          </div>

          {logs.length > 0 && (
            <div ref={logBoxRef} className={styles.logBox}>
              {logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History & Episode Storyboard Registry Drawer */}
      {showHistory && (
        <div className={styles.historyDrawer}>
          <div className={styles.filterChips}>
            <button
              onClick={() => setHistoryFilter('all')}
              className={`${styles.chip} ${historyFilter === 'all' ? styles.chipActive : ''}`}
            >
              All Episodes ({episodes.length})
            </button>
            <button
              onClick={() => setHistoryFilter('ready')}
              className={`${styles.chip} ${historyFilter === 'ready' ? styles.chipActive : ''}`}
            >
              Ready ({stats.completed})
            </button>
            <button
              onClick={() => setHistoryFilter('missing')}
              className={`${styles.chip} ${historyFilter === 'missing' ? styles.chipActive : ''}`}
            >
              Missing ({stats.missing})
            </button>
            {stats.failed > 0 && (
              <button
                onClick={() => setHistoryFilter('failed')}
                className={`${styles.chip} ${historyFilter === 'failed' ? styles.chipActive : ''}`}
              >
                Failed ({stats.failed})
              </button>
            )}
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Episode</th>
                  <th>Status</th>
                  <th>Sheets & Frames</th>
                  <th>Size</th>
                  <th>Generated Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEpisodes.slice(0, 100).map((ep) => {
                  const sb = ep.storyboard || { status: 'missing' };
                  const isReady = sb.status === 'completed';
                  const isFailed = sb.status === 'failed';
                  const isThisGenerating = generatingEpisodeId === ep.id;

                  return (
                    <tr key={ep.id}>
                      <td style={{ fontWeight: 600 }}>
                        {ep.title || `Episode ${ep.episode_number}`}
                      </td>
                      <td>
                        {isReady ? (
                          <span className={styles.statusBadgeReady}>
                            <CheckCircle2 size={12} />
                            Ready (1 frame/sec)
                          </span>
                        ) : isFailed ? (
                          <span className={styles.statusBadgeFailed} title={sb.error}>
                            <AlertCircle size={12} />
                            Failed
                          </span>
                        ) : (
                          <span className={styles.statusBadgeMissing}>
                            ⚪ Missing
                          </span>
                        )}
                      </td>
                      <td>
                        {isReady ? (
                          <span>
                            {sb.sheet_count} sheets ({sb.total_frames || '1440'} frames)
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td>
                        {isReady && sb.size_kb ? `${(sb.size_kb / 1024).toFixed(1)} MB` : '—'}
                      </td>
                      <td>
                        {isReady && sb.generated_at
                          ? new Date(sb.generated_at).toLocaleDateString() + ' ' + new Date(sb.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleGenerateSingle(ep.id)}
                          disabled={isThisGenerating || isBulkRunning}
                          className={styles.tableActionBtn}
                        >
                          {isThisGenerating ? (
                            <span>Generating...</span>
                          ) : isReady ? (
                            <>
                              <RotateCw size={12} />
                              <span>Regenerate</span>
                            </>
                          ) : (
                            <>
                              <Zap size={12} />
                              <span>Generate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
