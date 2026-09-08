'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shuffle,
  Zap,
  Filter,
  Star,
  Activity,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  Film
} from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import { GENRES } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';
import styles from './random.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  cover_image_key?: string;
  poster_position?: string;
  content_rating?: string;
  tags?: string[];
  category?: string;
  status?: string;
  release_year?: number;
  studio?: string;
  views_count?: number;
  views?: number;
  rating?: number;
}

interface RandomizerPortalProps {
  seriesList: SeriesItem[];
}

function formatViews(views?: number): string {
  if (views === undefined || views === null) return '0';
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

const BATCH_SIZE = 24;

export default function RandomizerPortal({ seriesList }: RandomizerPortalProps) {
  const router = useRouter();

  // Filters State
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Random Batch State (no pagination, always fresh 24 random items)
  const [randomBatch, setRandomBatch] = useState<SeriesItem[]>([]);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [shuffleCount, setShuffleCount] = useState<number>(1);

  // Load saved viewMode
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playhentai_random_view_mode');
      if (saved === 'grid' || saved === 'list') {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const shuffleArray = (array: SeriesItem[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Filter series based on user selections
  const filteredList = useMemo(() => {
    return seriesList.filter((s) => {
      // Genre filter
      if (selectedGenre !== 'all') {
        const genLower = selectedGenre.toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const tags = (s.tags || []).map((t) => t.toLowerCase());
        const hasGenre = cat === genLower || tags.includes(genLower);
        if (!hasGenre) return false;
      }

      // Min rating filter
      if (selectedRating !== 'all') {
        const minVal = parseFloat(selectedRating);
        const rating = typeof s.rating === 'number' ? s.rating : 0;
        if (rating < minVal) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const stat = (s.status || '').toLowerCase();
        if (selectedStatus === 'completed' && stat !== 'completed') return false;
        if (selectedStatus === 'ongoing' && stat !== 'ongoing') return false;
        if (selectedStatus === 'uncensored') {
          const cat = (s.category || '').toLowerCase();
          const tags = (s.tags || []).map((t) => t.toLowerCase());
          if (cat !== 'uncensored' && !tags.includes('uncensored')) return false;
        }
      }

      return true;
    });
  }, [seriesList, selectedGenre, selectedRating, selectedStatus]);

  // Handle live randomize reshuffle
  const handleRandomize = useCallback(() => {
    setIsShuffling(true);
    setTimeout(() => {
      setRandomBatch(shuffleArray(filteredList).slice(0, BATCH_SIZE));
      setIsShuffling(false);
      setShuffleCount((c) => c + 1);
    }, 220);
  }, [filteredList]);

  // Surprise Me: Pick 1 random anime and immediately open its page
  const handleSurpriseMe = () => {
    if (filteredList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredList.length);
    const chosen = filteredList[randomIndex];
    if (chosen?.slug) {
      router.push(`/series/${chosen.slug}`);
    }
  };

  // Generate initial or updated random batch whenever filtered list changes
  useEffect(() => {
    setRandomBatch(shuffleArray(filteredList).slice(0, BATCH_SIZE));
  }, [filteredList]);

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      <div className={styles.portalContent}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Random</span>
        </nav>

        {/* Page Header */}
        <div className={styles.portalHeader}>
          <div className={styles.headerTopMeta}>
            <span className={styles.highlightPill}>
              <Shuffle size={13} /> RANDOM GENERATOR
            </span>
            <span className={styles.metaPill}>
              🎲 Showing {randomBatch.length} Titles • Shuffle #{shuffleCount}
            </span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.mainTitle}>Random Hentai Anime Generator</h1>
          </div>
          <p className={styles.subtext}>
            Can&apos;t decide what to watch? Shuffle the entire library to discover random hentai anime series, explore hidden gems, or filter by your favorite genre.
          </p>
        </div>

        {/* Action Bar: Big Randomize Button, Filters, Surprise Me, View Controls */}
        <div className={styles.controlsSection}>
          {/* Action Buttons: Shuffle Library + Surprise Me */}
          <div className={styles.actionButtonsRow}>
            {/* Primary Randomize Button */}
            <button
              type="button"
              onClick={handleRandomize}
              className={`${styles.randomizeBtn} ${isShuffling ? styles.btnSpinning : ''}`}
              disabled={isShuffling}
            >
              <Shuffle size={16} className={styles.shuffleIcon} />
              <span>Shuffle Library</span>
            </button>

            {/* Surprise Me Button */}
            <button
              type="button"
              onClick={handleSurpriseMe}
              className={styles.surpriseBtn}
              title="Immediately open a surprise random anime series"
            >
              <Zap size={14} className={styles.surpriseIcon} />
              <span>Surprise Me</span>
            </button>
          </div>

          {/* Filters & View Switcher Row */}
          <div className={styles.filtersControlsRow}>
            {/* Genre Filter Dropdown */}
            <div className={styles.filterSelectWrapper}>
              <Filter size={13} className={styles.selectIcon} />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter random by genre"
              >
                <option value="all">Genre: All</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className={styles.filterArrow} />
            </div>

            {/* Min Rating Filter Dropdown */}
            <div className={styles.filterSelectWrapper}>
              <Star size={13} className={styles.selectIcon} />
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter random by minimum rating"
              >
                <option value="all">Rating: Any</option>
                <option value="7">⭐ 7.0+ Rated</option>
                <option value="8">⭐ 8.0+ Top</option>
                <option value="8.5">⭐ 8.5+ Peak</option>
              </select>
              <ChevronDown size={13} className={styles.filterArrow} />
            </div>

            {/* Status Filter Dropdown */}
            <div className={styles.filterSelectWrapper}>
              <Activity size={13} className={styles.selectIcon} />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter random by status"
              >
                <option value="all">Status: All</option>
                <option value="completed">Completed</option>
                <option value="ongoing">Ongoing</option>
                <option value="uncensored">Uncensored</option>
              </select>
              <ChevronDown size={13} className={styles.filterArrow} />
            </div>

            {/* View Mode Switcher */}
            <div className={styles.viewModeToggle} role="group" aria-label="View Mode">
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  try { localStorage.setItem('playhentai_random_view_mode', 'grid'); } catch {}
                }}
                className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeActive : ''}`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={14} />
                <span className={styles.viewModeText}>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  try { localStorage.setItem('playhentai_random_view_mode', 'list'); } catch {}
                }}
                className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeActive : ''}`}
                title="List View"
                aria-label="List View"
              >
                <List size={14} />
                <span className={styles.viewModeText}>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Randomized Catalog Grid / List */}
        {filteredList.length > 0 ? (
          viewMode === 'grid' ? (
            <div className={`${styles.catalogGrid} ${isShuffling ? styles.gridFade : ''}`}>
              {randomBatch.map((item) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className={`${styles.catalogList} ${isShuffling ? styles.gridFade : ''}`}>
              {randomBatch.map((item) => {
                const year = item.release_year || 2026;
                const rating = typeof item.rating === 'number' && item.rating > 0 ? item.rating : null;
                const isOngoing = item.status?.toLowerCase() === 'ongoing' || item.status?.toLowerCase() === 'airing';

                return (
                  <Link
                    key={item.id}
                    href={`/series/${item.slug}`}
                    className={styles.listItemRow}
                  >
                    <div className={styles.listItemThumb}>
                      <Image
                        src={getR2Url(item.poster_image_key || item.cover_image_key, 'poster')}
                        alt={item.title}
                        fill
                        sizes="65px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className={styles.listItemDetails}>
                      <h3 className={styles.listItemTitle}>{item.title}</h3>
                      <div className={styles.listItemMeta}>
                        <span>{year}</span>
                        <span>•</span>
                        <span>{item.studio || item.category || 'Anime'}</span>
                        {rating !== null && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#eab308' }}>⭐ {rating.toFixed(1)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Eye size={12} /> {formatViews(item.views || item.views_count)}
                        </span>
                      </div>
                      <p className={styles.listItemDesc}>{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className={styles.emptyState}>
            <h3>No Matching Anime Found</h3>
            <p>Try clearing or broadening your active filters to find random hentai titles.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedGenre('all');
                setSelectedRating('all');
                setSelectedStatus('all');
              }}
              className={styles.resetBtn}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Bottom Shuffler CTA */}
        {filteredList.length > 0 && (
          <div className={styles.bottomShuffleSection}>
            <p className={styles.bottomCountText}>
              Viewing <strong>{randomBatch.length}</strong> of <strong>{filteredList.length}</strong> matching titles
            </p>
            <button
              type="button"
              onClick={() => {
                handleRandomize();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={styles.bottomShuffleBtn}
              disabled={isShuffling}
            >
              <Shuffle size={16} />
              <span>Shuffle Again &amp; Jump to Top</span>
            </button>
          </div>
        )}

        {/* SEO Information Section (Bottom) */}
        <section className={styles.seoSection}>
          <div className={styles.seoCard}>
            <h2>Discover Anime with the Random Hentai Generator</h2>
            <p>
              Looking for something new to watch? The Play Hentai Random Generator allows you to instantly discover hidden gems, top-rated masterpieces, and uncensored classics across our entire catalog of high-definition hentai anime series with English subtitles.
            </p>
            <div className={styles.seoGrid}>
              <div className={styles.seoFeature}>
                <h3>Instant Discovery</h3>
                <p>Roll the dice to generate a randomized batch of 24 anime series with synchronized subtitles and full episode lists.</p>
              </div>
              <div className={styles.seoFeature}>
                <h3>Genre &amp; Rating Filters</h3>
                <p>Narrow down your shuffle results by specifying minimum community ratings, airing status, or specific hentai genres.</p>
              </div>
              <div className={styles.seoFeature}>
                <h3>Surprise Me Feature</h3>
                <p>Feeling adventurous? Click &apos;Surprise Me&apos; to immediately jump into a random series watch portal in one click.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
