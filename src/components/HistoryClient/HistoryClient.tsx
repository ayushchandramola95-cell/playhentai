'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  History as HistoryIcon,
  Play,
  Trash2,
  Lock,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  AlertTriangle,
  FolderHeart,
  Flame,
  Layers,
  Box,
  Sparkles,
  SearchX,
  BookmarkCheck,
  ShieldCheck,
  Film
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from '@/app/(public)/history/history.module.css';

export interface HistoryItem {
  id: string;
  episode_id: string;
  last_position_seconds: number;
  watched_percentage: number;
  completed: boolean;
  updated_at: string;
  episode_title: string;
  episode_number: number;
  series_title: string;
  series_slug?: string;
  thumbnail_key?: string;
  duration_seconds?: number;
}

interface HistoryClientProps {
  initialHistory: HistoryItem[];
  user: any;
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '24:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function HistoryClient({ initialHistory, user }: HistoryClientProps) {
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'progress' | 'series_asc'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Tab counts
  const tabCounts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    history.forEach((item) => {
      if (item.completed || (item.watched_percentage || 0) >= 90) {
        completed++;
      } else {
        inProgress++;
      }
    });
    return {
      all: history.length,
      in_progress: inProgress,
      completed,
    };
  }, [history]);

  // Filter and Sort logic
  const filteredHistory = useMemo(() => {
    let list = [...history];

    // Status Tab Filter
    if (filterTab === 'in_progress') {
      list = list.filter((item) => !item.completed && (item.watched_percentage || 0) < 90);
    } else if (filterTab === 'completed') {
      list = list.filter((item) => item.completed || (item.watched_percentage || 0) >= 90);
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const epMatch = (item.episode_title || '').toLowerCase().includes(q);
        const seriesMatch = (item.series_title || '').toLowerCase().includes(q);
        const epNumMatch = `episode ${item.episode_number}`.includes(q) || `ep ${item.episode_number}`.includes(q);
        return epMatch || seriesMatch || epNumMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortMode === 'recent') {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      }
      if (sortMode === 'progress') {
        return (b.watched_percentage || 0) - (a.watched_percentage || 0);
      }
      if (sortMode === 'series_asc') {
        return (a.series_title || '').localeCompare(b.series_title || '');
      }
      return 0;
    });

    return list;
  }, [history, filterTab, searchQuery, sortMode]);

  // Remove Single Episode from History
  const handleRemoveSingle = async (item: HistoryItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetId = item.id || item.episode_id;
    setRemovingId(targetId);

    try {
      const res = await fetch(`/api/watch-history?id=${encodeURIComponent(item.id)}&episode_id=${encodeURIComponent(item.episode_id)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setHistory((prev) => prev.filter((h) => (h.id !== item.id && h.episode_id !== item.episode_id)));
      }
    } catch (err) {
      console.error('Error removing history item:', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Clear Entire Watch History
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/watch-history?all=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setHistory([]);
        setShowClearModal(false);
      }
    } catch (err) {
      console.error('Error clearing history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // 1. Guest View
  if (!user) {
    return (
      <div className={styles.container}>
        <div className="ambient-glow" />

        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Watch History</span>
        </nav>

        {/* Guest Lock Card */}
        <div className={styles.guestCard}>
          <div className={styles.guestIconBadge}>
            <Lock size={32} className={styles.guestLockIcon} />
          </div>

          <h1 className={styles.guestTitle}>Sign In to Track Your Watch History</h1>
          <p className={styles.guestDesc}>
            Never lose your place again. Resume video playback right where you left off across your desktop, tablet, and mobile devices.
          </p>

          <div className={styles.guestFeatureGrid}>
            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <Clock size={18} />
              </div>
              <div>
                <h4>Resume Playback</h4>
                <p>Pick up exactly where you left off on any video.</p>
              </div>
            </div>

            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <BookmarkCheck size={18} />
              </div>
              <div>
                <h4>Cross-Device Sync</h4>
                <p>Saved positions sync in real-time across devices.</p>
              </div>
            </div>

            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4>100% Free Account</h4>
                <p>Instant activation without subscriptions or fees.</p>
              </div>
            </div>
          </div>

          <div className={styles.guestActionsRow}>
            <Link href="/login" className={styles.primaryBtn}>
              Sign In / Register
            </Link>
            <Link href="/" className={styles.secondaryBtn}>
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated View
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
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.highlightPill}>
            <Clock size={13} /> CONTINUOUS PLAYBACK
          </span>
          <span className={styles.totalPill}>
            <Film size={13} /> {history.length} {history.length === 1 ? 'Episode' : 'Episodes'} Watched
          </span>
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleIconBadge}>
            <HistoryIcon size={24} className={styles.titleIcon} />
          </div>
          <h1 className={styles.mainTitle}>Watch History</h1>
        </div>

        <p className={styles.subtext}>
          Resume episodes right where you left off, review completed videos, and manage your streaming activity anytime.
        </p>
      </div>

      {history.length > 0 && (
        <div className={styles.controlsSection}>
          {/* Top Row: Search & View Controls */}
          <div className={styles.searchSortRow}>
            {/* Search Box */}
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search your ${history.length} watched episodes...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearch}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Actions */}
            <div className={styles.filterActionsGroup}>
              {/* Sort Selector */}
              <div className={styles.sortWrapper}>
                <ArrowUpDown size={13} className={styles.sortIcon} />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className={styles.sortSelect}
                  aria-label="Sort history"
                >
                  <option value="recent">🕒 Recently Watched</option>
                  <option value="progress">📊 Highest Progress</option>
                  <option value="series_asc">🔤 Series: A-Z</option>
                </select>
                <ChevronDown size={13} className={styles.sortArrow} />
              </div>

              {/* View Mode Toggle */}
              <div className={styles.viewToggleGroup}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  title="Grid View"
                  aria-label="Grid view"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                  title="List View"
                  aria-label="List view"
                >
                  <List size={15} />
                </button>
              </div>

              {/* Clear All Button */}
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className={styles.clearAllBtn}
                title="Clear entire watch history"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Filter Tabs */}
          <div className={styles.tabsRow}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`${styles.tabBtn} ${filterTab === 'all' ? styles.tabBtnActive : ''}`}
            >
              All Episodes ({tabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('in_progress')}
              className={`${styles.tabBtn} ${filterTab === 'in_progress' ? styles.tabBtnActive : ''}`}
            >
              In Progress ({tabCounts.in_progress})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={`${styles.tabBtn} ${filterTab === 'completed' ? styles.tabBtnActive : ''}`}
            >
              Completed ({tabCounts.completed})
            </button>
          </div>
        </div>
      )}

      {/* History Items Section */}
      <section className={styles.listSection}>
        {history.length > 0 ? (
          filteredHistory.length > 0 ? (
            viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className={styles.historyGrid}>
                {filteredHistory.map((item) => {
                  const watchUrl = getEpisodeWatchUrl(
                    item.episode_id,
                    item.episode_number,
                    item.series_slug || (item.series_title ? item.series_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '')
                  );
                  const isFinished = item.completed || (item.watched_percentage || 0) >= 90;
                  const targetId = item.id || item.episode_id;

                  return (
                    <div key={item.id} className={styles.gridCard}>
                      {/* Thumbnail with Overlay & Progress */}
                      <div className={styles.gridThumbWrap}>
                        <Link href={watchUrl} className={styles.thumbLink}>
                          {item.thumbnail_key ? (
                            <Image
                              src={getR2Url(item.thumbnail_key, 'thumbnail')}
                              alt={item.episode_title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                              className={styles.gridThumbImg}
                            />
                          ) : (
                            <div className={styles.gridThumbPlaceholder}>
                              <Play size={28} />
                            </div>
                          )}

                          {/* Play Hover Overlay */}
                          <div className={styles.thumbHoverOverlay}>
                            <div className={styles.playBadge}>
                              <Play size={18} fill="#ffffff" />
                            </div>
                          </div>
                        </Link>

                        {/* Duration Badge */}
                        <div className={styles.durationBadge}>
                          {formatDuration(item.duration_seconds)}
                        </div>

                        {/* Delete / Remove on Card Hover */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSingle(item, e)}
                          disabled={removingId === targetId}
                          className={styles.removeBtn}
                          title="Remove from Watch History"
                          aria-label={`Remove ${item.episode_title} from history`}
                        >
                          <Trash2 size={13} />
                          <span>{removingId === targetId ? '...' : 'Remove'}</span>
                        </button>

                        {/* Bottom Progress Bar */}
                        <div className={styles.cardProgressBarTrack}>
                          <div
                            className={styles.cardProgressBarFill}
                            style={{ width: `${item.watched_percentage || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Meta Content */}
                      <div className={styles.gridCardBody}>
                        <div className={styles.cardHeaderRow}>
                          <span className={styles.seriesPill}>{item.series_title}</span>
                          <span className={styles.epPill}>EP {item.episode_number}</span>
                        </div>

                        <h3 className={styles.gridEpTitle}>
                          <Link href={watchUrl} title={item.episode_title}>
                            {item.episode_title}
                          </Link>
                        </h3>

                        <div className={styles.cardFooterRow}>
                          <span className={styles.relativeTime}>
                            <Clock size={12} /> {formatRelativeTime(item.updated_at)}
                          </span>

                          {isFinished ? (
                            <span className={styles.statusCompleted}>
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : (
                            <span className={styles.statusProgress}>
                              {item.watched_percentage || 0}% Watched
                            </span>
                          )}
                        </div>

                        <Link href={watchUrl} className={styles.resumeCardBtn}>
                          <Play size={13} fill="currentColor" />
                          <span>{isFinished ? 'Watch Again' : 'Resume'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className={styles.historyList}>
                {filteredHistory.map((item) => {
                  const minutes = Math.floor((item.last_position_seconds || 0) / 60);
                  const durMinutes = item.duration_seconds ? Math.floor(item.duration_seconds / 60) : 24;
                  const watchUrl = getEpisodeWatchUrl(
                    item.episode_id,
                    item.episode_number,
                    item.series_slug || (item.series_title ? item.series_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '')
                  );
                  const isFinished = item.completed || (item.watched_percentage || 0) >= 90;
                  const targetId = item.id || item.episode_id;

                  return (
                    <div key={item.id} className={styles.historyItem}>
                      {/* Left: Thumbnail with Progress Bar */}
                      <div className={styles.thumbnailWrapper}>
                        <Link href={watchUrl} className={styles.thumbLink}>
                          {item.thumbnail_key ? (
                            <Image
                              src={getR2Url(item.thumbnail_key, 'thumbnail')}
                              alt={item.episode_title}
                              fill
                              sizes="220px"
                              className={styles.thumbnailImage}
                            />
                          ) : (
                            <div className={styles.gridThumbPlaceholder}>
                              <Play size={24} />
                            </div>
                          )}
                          <div className={styles.playOverlay}>
                            <div className={styles.playBadge}>
                              <Play size={18} fill="#ffffff" />
                            </div>
                          </div>
                        </Link>

                        <div className={styles.durationBadge}>
                          {formatDuration(item.duration_seconds)}
                        </div>

                        {/* Progress Bar inside Thumbnail */}
                        <div className={styles.cardProgressBarTrack}>
                          <div
                            className={styles.cardProgressBarFill}
                            style={{ width: `${item.watched_percentage || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Center: Details & Progress Info */}
                      <div className={styles.contentCol}>
                        <div className={styles.seriesMeta}>
                          <span className={styles.seriesTitle}>{item.series_title}</span>
                          <span className={styles.metaDivider}>•</span>
                          <span className={styles.seasonTitle}>Episode {item.episode_number}</span>
                          <span className={styles.metaDivider}>•</span>
                          <span className={styles.timeAgo}>
                            <Clock size={11} style={{ marginRight: '3px' }} />
                            {formatRelativeTime(item.updated_at)}
                          </span>
                        </div>

                        <h3 className={styles.episodeTitle}>
                          <Link href={watchUrl}>{item.episode_title}</Link>
                        </h3>

                        {/* Progress Bar & Details */}
                        <div className={styles.progressContainer}>
                          <div className={styles.progressDetails}>
                            <span className={styles.timeLabel}>
                              {minutes}m watched of {durMinutes}m
                            </span>
                            {isFinished ? (
                              <span className={styles.completedLabel}>
                                <CheckCircle2 size={13} style={{ marginRight: '4px' }} />
                                Completed
                              </span>
                            ) : (
                              <span className={styles.percentLabel}>{item.watched_percentage || 0}% watched</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className={styles.actionCol}>
                        <Link href={watchUrl} className={styles.resumeBtn}>
                          <Play size={13} fill="currentColor" />
                          <span>{isFinished ? 'Watch Again' : 'Resume'}</span>
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveSingle(item, e)}
                          disabled={removingId === targetId}
                          className={styles.listRemoveBtn}
                          title="Remove from history"
                          aria-label="Remove from history"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className={styles.emptySearchCard}>
              <SearchX size={44} className={styles.emptyIcon} />
              <h3>No matching episodes found</h3>
              <p>
                No watched anime matched &quot;{searchQuery}&quot;. Try adjusting your search query or switching tabs.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterTab('all');
                }}
                className={styles.resetBtn}
              >
                Reset Filters
              </button>
            </div>
          )
        ) : (
          <div className={styles.emptyWatchlistCard}>
            <div className={styles.emptyIconBadge}>
              <FolderHeart size={46} className={styles.emptyHeartIcon} />
            </div>
            <h3>Your Watch History is Empty</h3>
            <p>
              You haven&apos;t started watching any anime episodes yet. Choose a video from our collection and we&apos;ll automatically save your playback progress.
            </p>

            <div className={styles.quickExploreGrid}>
              <Link href="/trending" className={styles.explorePill}>
                <Flame size={15} color="#f97316" />
                <span>Explore Trending</span>
              </Link>
              <Link href="/genres" className={styles.explorePill}>
                <Layers size={15} color="#ec4899" />
                <span>Browse Genres</span>
              </Link>
              <Link href="/3d" className={styles.explorePill}>
                <Box size={15} color="#06b6d4" />
                <span>3D CGI Animations</span>
              </Link>
              <Link href="/uncensored" className={styles.explorePill}>
                <Sparkles size={15} color="#a855f7" />
                <span>Uncensored Series</span>
              </Link>
            </div>

            <Link href="/" className={styles.primaryBtn} style={{ marginTop: '1.5rem' }}>
              Browse Catalog
            </Link>
          </div>
        )}
      </section>

      {/* Confirmation Modal for Clear All */}
      {showClearModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowClearModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrap}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3>Clear Watch History?</h3>
            <p>
              This will remove all <strong>{history.length} watched episodes</strong> and reset all saved resume progress. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className={styles.modalCancelBtn}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className={styles.modalConfirmBtn}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
