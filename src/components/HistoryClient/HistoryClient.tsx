'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History as HistoryIcon, Play, UserX, Clock, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from '@/app/(public)/history/history.module.css';

interface HistoryItem {
  id: string;
  episode_id: string;
  last_position_seconds: number;
  watched_percentage: number;
  completed: boolean;
  updated_at: string;
  episode_title: string;
  episode_number: number;
  series_title: string;
  thumbnail_key?: string;
  duration_seconds?: number;
}

interface HistoryClientProps {
  initialHistory: HistoryItem[];
  user: any;
}

export default function HistoryClient({ initialHistory, user }: HistoryClientProps) {
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your entire watch history?')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/watch-history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]);
      } else {
        alert('Failed to clear history.');
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Error clearing watch history.');
    } finally {
      setIsClearing(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Watch History</span>
        </nav>

        <div className={`${styles.cardShell} glass`}>
          <UserX size={48} className={styles.iconMuted} />
          <h2>Access Restricted</h2>
          <p>Please sign in to track your watch progress, save resume locations, and check your watch history.</p>
          <Link href="/login" className={styles.actionBtn}>Sign In / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Watch History</span>
      </nav>

      {/* Header */}
      <div className={styles.headerSection} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className={styles.titleRow}>
            <HistoryIcon size={28} className={styles.headerIcon} />
            <h1>Watch History</h1>
          </div>
          <p className={styles.subtext}>
            Resume episodes you've started or keep track of what you've finished.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            disabled={isClearing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1.1rem',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Trash2 size={15} />
            <span>{isClearing ? 'Clearing...' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* History List */}
      <section className={styles.listSection}>
        {history.length > 0 ? (
          <div className={styles.historyList}>
            {history.map((item) => {
              const minutes = Math.floor(item.last_position_seconds / 60);
              const durMinutes = item.duration_seconds ? Math.floor(item.duration_seconds / 60) : null;
              const watchUrl = getEpisodeWatchUrl(
                item.episode_id,
                item.episode_number,
                (item as any).series_slug || (item.series_title ? item.series_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '')
              );

              return (
                <div key={item.id} className={`${styles.historyItem} glass card-hover`}>
                  {/* Left: Thumbnail with Play Hover */}
                  <div className={styles.thumbnailWrapper}>
                    {item.thumbnail_key ? (
                      <Image
                        src={getR2Url(item.thumbnail_key, 'thumbnail')}
                        alt={item.episode_title}
                        fill
                        sizes="180px"
                        className={styles.thumbnailImage}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={24} style={{ color: 'var(--foreground-muted)' }} />
                      </div>
                    )}
                    <Link href={watchUrl} className={styles.playOverlay}>
                      <Play size={24} fill="white" />
                    </Link>
                  </div>

                  {/* Center: Details & Progress Bar */}
                  <div className={styles.contentCol}>
                    <div className={styles.seriesMeta}>
                      <span className={styles.seriesTitle}>{item.series_title}</span>
                      <span className={styles.metaDivider}>•</span>
                      <span className={styles.seasonTitle}>Episode {item.episode_number}</span>
                    </div>

                    <h3 className={styles.episodeTitle}>
                      <Link href={watchUrl}>{item.episode_title}</Link>
                    </h3>

                    {/* Progress indicator */}
                    <div className={styles.progressContainer}>
                      <div className={styles.track}>
                        <div 
                          className={styles.bar} 
                          style={{ width: `${item.watched_percentage || 0}%` }}
                        />
                      </div>
                      <div className={styles.progressDetails}>
                        <span className={styles.timeLabel}>
                          {minutes}m watched {durMinutes ? `/ ${durMinutes}m` : ''}
                        </span>
                        {item.completed ? (
                          <span className={styles.completedLabel}>
                            <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                            Completed
                          </span>
                        ) : (
                          <span className={styles.percentLabel}>{item.watched_percentage || 0}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Resume Buttons */}
                  <div className={styles.actionCol}>
                    <Link href={`/watch/${item.episode_id}`} className={styles.resumeBtn}>
                      <Play size={14} fill="currentColor" />
                      <span>{item.completed ? 'Watch Again' : 'Resume'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${styles.cardShell} glass`}>
            <HistoryIcon size={48} className={styles.iconMuted} />
            <h3>Your watch history is empty</h3>
            <p>You haven't watched any episodes yet. Start playing your first video from our collection.</p>
            <Link href="/" className={styles.actionBtn}>Browse Catalog</Link>
          </div>
        )}
      </section>
    </div>
  );
}
