'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Flame,
  Play,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from './SeriesEpisodesSection.module.css';

export interface EpisodeItem {
  id: string;
  episode_number: number;
  title?: string;
  description?: string;
  duration_seconds?: number;
  thumbnail_key?: string;
  release_date?: string;
  created_at?: string;
  is_published?: boolean;
}

export interface SeasonItem {
  id: string;
  season_number: number;
  title: string;
  episodes: EpisodeItem[];
}

interface SeriesEpisodesSectionProps {
  seasons: SeasonItem[];
  seriesSlug: string;
  seriesTitle: string;
  coverImageKey?: string;
  contentRating?: string;
  seriesRating?: number | null;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '24m';
  const mins = Math.round(seconds / 60);
  return `${mins}m`;
}

function formatReleaseDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function SeriesEpisodesSection({
  seasons,
  seriesSlug,
  seriesTitle,
  coverImageKey,
  contentRating = 'Censored',
  seriesRating,
}: SeriesEpisodesSectionProps) {
  // 1. Valid seasons with published episodes
  const validSeasons = useMemo(() => {
    return (seasons || []).filter((s) => s.episodes && s.episodes.length > 0);
  }, [seasons]);

  // 2. Active season state
  const [activeSeasonId, setActiveSeasonId] = useState<string>(
    validSeasons[0]?.id || seasons?.[0]?.id || ''
  );

  // 3. Sort Order: 'desc' (default: latest first) vs 'asc' (1 -> N)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 4. Live Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // 5. Watch Progress Map { [episodeId]: { percentage: number, completed: boolean } }
  const [watchProgressMap, setWatchProgressMap] = useState<
    Record<string, { percentage: number; completed: boolean }>
  >({});

  // Load Watch Progress from local / API
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const res = await fetch('/api/watch-history');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.history)) {
            const map: Record<string, { percentage: number; completed: boolean }> = {};
            data.history.forEach((item: any) => {
              if (item.episode_id) {
                map[item.episode_id] = {
                  percentage: item.watched_percentage || 0,
                  completed: item.completed || (item.watched_percentage && item.watched_percentage >= 90),
                };
              }
            });
            setWatchProgressMap(map);
          }
        }
      } catch (err) {
        // Guest fallback: check local storage if available
        try {
          const localHistory = JSON.parse(localStorage.getItem('playhentai_guest_history') || '[]');
          if (Array.isArray(localHistory)) {
            const map: Record<string, { percentage: number; completed: boolean }> = {};
            localHistory.forEach((item: any) => {
              if (item.episodeId) {
                map[item.episodeId] = {
                  percentage: item.percentage || 0,
                  completed: item.completed || false,
                };
              }
            });
            setWatchProgressMap(map);
          }
        } catch {
          // ignore
        }
      }
    };

    loadProgress();
  }, [seriesSlug]);

  // Current active season object
  const currentSeason = useMemo(() => {
    return (
      validSeasons.find((s) => s.id === activeSeasonId) ||
      validSeasons[0] ||
      seasons?.[0] || { id: 'default', season_number: 1, title: 'Season 1', episodes: [] }
    );
  }, [validSeasons, activeSeasonId, seasons]);

  // Filtered & Sorted Episodes List
  const displayedEpisodes = useMemo(() => {
    let list = [...(currentSeason.episodes || [])];

    // Filter by live search if entered
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((ep) => {
        const epNumMatch = `episode ${ep.episode_number}`.includes(q) || `ep ${ep.episode_number}`.includes(q) || String(ep.episode_number) === q;
        const titleMatch = (ep.title || '').toLowerCase().includes(q);
        return epNumMatch || titleMatch;
      });
    }

    // Sort order
    list.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.episode_number - a.episode_number;
      }
      return a.episode_number - b.episode_number;
    });

    return list;
  }, [currentSeason, searchQuery, sortOrder]);

  const isUncensored =
    contentRating?.toLowerCase() === 'uncensored' ||
    contentRating?.toLowerCase().includes('uncensored');

  if (!seasons || seasons.length === 0 || (validSeasons.length === 0 && (!currentSeason.episodes || currentSeason.episodes.length === 0))) {
    return null;
  }

  return (
    <section className={styles.episodesContainer} id="episodes">
      {/* Section Header with Title & Controls */}
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconWrapper}>
            <Flame size={20} className={styles.headerIcon} />
          </div>
          <div className={styles.headerTitleGroup}>
            <h2 className={styles.sectionTitle}>Episodes</h2>
            <span className={styles.episodeCountBadge}>
              {displayedEpisodes.length} {displayedEpisodes.length === 1 ? 'Episode' : 'Episodes'}
            </span>
          </div>
        </div>

        {/* Season Selector Tabs & Sort Controls */}
        <div className={styles.headerControls}>
          {/* Season Tabs (if multiple seasons exist) */}
          {validSeasons.length > 1 && (
            <div className={styles.seasonTabsWrapper} role="tablist" aria-label="Seasons">
              {validSeasons.map((season) => {
                const isActive = season.id === currentSeason.id;
                return (
                  <button
                    key={season.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveSeasonId(season.id)}
                    className={`${styles.seasonTab} ${isActive ? styles.activeSeasonTab : ''}`}
                  >
                    <Layers size={13} className={styles.seasonTabIcon} />
                    <span>{season.title || `Season ${season.season_number}`}</span>
                    <span className={styles.seasonCountPill}>
                      {season.episodes?.length || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Search for Long Series */}
          {currentSeason.episodes && currentSeason.episodes.length > 6 && (
            <div className={styles.episodeSearchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Find episode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearchBtn}
                  aria-label="Clear episode search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className={styles.sortToggleBtn}
            title={sortOrder === 'desc' ? 'Sorted Newest First (Click to reverse)' : 'Sorted Oldest First (Click to reverse)'}
            aria-label="Toggle episode sort order"
          >
            <ArrowUpDown size={14} className={styles.sortIcon} />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Episodes Responsive Grid */}
      {displayedEpisodes.length > 0 ? (
        <div className={styles.episodeGrid}>
          {displayedEpisodes.map((ep) => {
            const cleanTitle = (ep.title || '')
              .replace(/^\[Preview\]\s*/i, '')
              .replace(/^\[Trailer\]\s*/i, '')
              .replace(/^.*-\s*/, '')
              .trim();

            const releaseDate = formatReleaseDate(ep.release_date || ep.created_at);
            const duration = formatDuration(ep.duration_seconds);
            const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug);
            const progress = watchProgressMap[ep.id];
            const isCompleted = progress?.completed || (progress?.percentage && progress.percentage >= 90);

            return (
              <div key={ep.id} className={styles.episodeCardWrapper}>
                <Link href={watchUrl} className={styles.episodeCard}>
                  {/* Thumbnail Container */}
                  <div className={styles.thumbnailWrapper}>
                    <Image
                      src={getR2Url(ep.thumbnail_key || coverImageKey, 'thumbnail')}
                      alt={`Stream ${seriesTitle} Episode ${ep.episode_number} Hentai online - PlayHentai`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={styles.thumbnailImage}
                    />

                    {/* Top Floating Badges */}
                    <div className={styles.badgesTopRow}>
                      <span className={styles.subBadge}>SUB</span>
                      <span
                        className={`${styles.censorshipBadge} ${
                          isUncensored ? styles.uncensoredBadge : styles.censoredBadge
                        }`}
                      >
                        {isUncensored ? 'UNCENSORED' : 'CENSORED'}
                      </span>
                    </div>

                    {/* Top Right Duration Pill */}
                    <div className={styles.durationBadge}>
                      <Clock size={11} className={styles.clockIcon} />
                      <span>{duration}</span>
                    </div>

                    {/* Play Hover Overlay */}
                    <div className={styles.playOverlay}>
                      <div className={styles.playButtonCircle}>
                        <Play size={24} fill="currentColor" className={styles.playIcon} />
                      </div>
                    </div>

                    {/* Bottom Watch Progress Bar */}
                    {progress && progress.percentage > 0 && (
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${Math.min(100, progress.percentage)}%` }}
                        />
                      </div>
                    )}

                    {/* Completed "Watched" Checkmark Badge */}
                    {isCompleted && (
                      <div className={styles.completedBadge} title="Watched">
                        <CheckCircle2 size={13} fill="#22c55e" color="#ffffff" />
                        <span>Watched</span>
                      </div>
                    )}
                  </div>

                  {/* Episode Info Row */}
                  <div className={styles.episodeInfo}>
                    <div className={styles.episodeTitleRow}>
                      <span className={styles.episodeNumberBadge}>
                        EP {ep.episode_number}
                      </span>
                      <h3 className={styles.episodeTitleText} title={cleanTitle || `Episode ${ep.episode_number}`}>
                        {cleanTitle || `Episode ${ep.episode_number}`}
                      </h3>
                    </div>

                    {releaseDate && (
                      <div className={styles.episodeMetaRow}>
                        <span className={styles.episodeReleaseDate}>{releaseDate}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No episodes found matching "{searchQuery}".</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className={styles.clearFilterBtn}
          >
            Clear Search Filter
          </button>
        </div>
      )}
    </section>
  );
}
