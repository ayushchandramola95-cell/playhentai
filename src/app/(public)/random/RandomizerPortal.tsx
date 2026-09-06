'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shuffle,
  Dices,
  Filter,
  Star,
  Activity,
  ChevronDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
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

export default function RandomizerPortal({ seriesList }: RandomizerPortalProps) {
  const router = useRouter();

  // Filters State
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Shuffled List State
  const [shuffledList, setShuffledList] = useState<SeriesItem[]>(seriesList);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [shuffleCount, setShuffleCount] = useState<number>(1);
  const pageSize = 24; // 4 rows x 6 columns

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
      setShuffledList(shuffleArray(filteredList));
      setCurrentPage(1);
      setIsShuffling(false);
      setShuffleCount((c) => c + 1);
    }, 220);
  }, [filteredList]);

  // Quick Pick / I'm Feeling Lucky
  const handleQuickPick = () => {
    if (filteredList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredList.length);
    const chosen = filteredList[randomIndex];
    if (chosen?.slug) {
      router.push(`/series/${chosen.slug}`);
    }
  };

  // Shuffle client-side when filtered list changes or on initial mount
  useEffect(() => {
    setShuffledList(shuffleArray(filteredList));
    setCurrentPage(1);
  }, [filteredList]);

  // Pagination calculation
  const totalPages = Math.ceil(shuffledList.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shuffledList.slice(start, start + pageSize);
  }, [shuffledList, currentPage, pageSize]);

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
              🎲 {filteredList.length} Titles Available • Shuffle #{shuffleCount}
            </span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.mainTitle}>Random Hentai Anime Generator</h1>
          </div>
          <p className={styles.subtext}>
            Can&apos;t decide what to watch? Shuffle the entire library to discover random hentai anime series, explore hidden gems, or filter by your favorite genre.
          </p>
        </div>

        {/* Action Bar: Big Randomize Button, Filters, View & Page Controls */}
        <div className={styles.controlsSection}>
          <div className={styles.leftControls}>
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

            {/* Quick Pick / Feeling Lucky */}
            <button
              type="button"
              onClick={handleQuickPick}
              className={styles.luckyBtn}
              title="Pick 1 random anime and start watching immediately"
            >
              <Dices size={15} />
              <span>Quick Pick</span>
            </button>

            {/* Genre Filter Dropdown */}
            <div className={styles.filterSelectWrapper}>
              <Filter size={14} className={styles.selectIcon} />
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
              <Star size={14} className={styles.selectIcon} />
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className={styles.filterSelect}
                aria-label="Filter random by minimum rating"
              >
                <option value="all">Rating: Any</option>
                <option value="7">⭐ 7.0+ Rated</option>
                <option value="8">⭐ 8.0+ Top Rated</option>
                <option value="8.5">⭐ 8.5+ Masterpieces</option>
              </select>
              <ChevronDown size={13} className={styles.filterArrow} />
            </div>

            {/* Status Filter Dropdown */}
            <div className={styles.filterSelectWrapper}>
              <Activity size={14} className={styles.selectIcon} />
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
          </div>

          {/* Right Controls: View Mode & Mini Pagination */}
          <div className={styles.rightControls}>
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
                <LayoutGrid size={15} />
                <span>Grid</span>
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
                <List size={15} />
                <span>List</span>
              </button>
            </div>

            <div className={styles.miniPagination}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={styles.pageArrowBtn}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <span className={styles.pageIndicator}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={styles.pageArrowBtn}
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Randomized Catalog Grid / List */}
        {filteredList.length > 0 ? (
          viewMode === 'grid' ? (
            <div className={`${styles.catalogGrid} ${isShuffling ? styles.gridFade : ''}`}>
              {paginatedItems.map((item) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className={`${styles.catalogList} ${isShuffling ? styles.gridFade : ''}`}>
              {paginatedItems.map((item) => {
                const rating = typeof item.rating === 'number' && item.rating > 0 
                  ? item.rating 
                  : (item.rating && !isNaN(Number(item.rating)) && Number(item.rating) > 0 ? Number(item.rating) : null);
                const views = item.views_count !== undefined ? item.views_count : (item.views !== undefined ? item.views : 1420);
                
                return (
                  <Link
                    key={item.id}
                    href={`/series/${item.slug}`}
                    className={styles.listItemRow}
                  >
                    <div className={styles.listItemThumb}>
                      <Image
                        src={getR2Url(item.poster_image_key, 'poster')}
                        alt={`${item.title} poster`}
                        fill
                        sizes="100px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className={styles.listItemDetails}>
                      <h3 className={styles.listItemTitle}>{item.title}</h3>
                      
                      <div className={styles.listItemMeta}>
                        {rating !== null && rating > 0 && (
                          <>
                            <span style={{ display: 'inline-flex', alignItems: 'center', color: '#fbbf24' }}>
                              <Star size={12} fill="currentColor" style={{ marginRight: '4px' }} />
                              {rating.toFixed(1)}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <Eye size={12} style={{ marginRight: '4px' }} />
                          {formatViews(views)} Views
                        </span>
                        {item.category && (
                          <>
                            <span>•</span>
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>
                              {item.category.toUpperCase()}
                            </span>
                          </>
                        )}
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
            <Film size={40} style={{ color: 'var(--foreground-muted)' }} />
            <h3>No random anime matched your filters</h3>
            <p>Try resetting the genre, minimum rating, or status filter to shuffle across all series.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedGenre('all');
                setSelectedRating('all');
                setSelectedStatus('all');
              }}
              className={styles.resetBtn}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className={styles.bottomPagination}>
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage <= 1}
              className={styles.paginationBtn}
            >
              Previous Page
            </button>
            <span className={styles.pageInfoText}>
              Showing Page {currentPage} of {totalPages} ({filteredList.length} Filtered Titles)
            </span>
            <button
              type="button"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              className={styles.paginationBtn}
            >
              Next Page
            </button>
          </div>
        )}

        {/* SEO Information Section (Bottom) */}
        <section className={styles.seoSection}>
          <div className={styles.seoCard}>
            <h2>Discover New Anime with the Random Hentai Generator</h2>
            <p>
              Stuck in decision paralysis? The Play Hentai Random Anime Generator is built to help you discover hidden masterpieces, nostalgic classics, and trending releases with zero effort. Hit shuffle to randomize the entire anime database or narrow down the random pool using mood, genre, and minimum community rating filters.
            </p>
            <div className={styles.seoGrid}>
              <div className={styles.seoFeature}>
                <h3>Instant Random Discovery</h3>
                <p>Reshuffle hundreds of anime titles with true random distribution to find something fresh every time you click.</p>
              </div>
              <div className={styles.seoFeature}>
                <h3>Tailored Mood Filtering</h3>
                <p>Filter by 100+ genre tags, uncensored releases, 3D CGI animations, or minimum rating thresholds before shuffling.</p>
              </div>
              <div className={styles.seoFeature}>
                <h3>One-Click Quick Pick</h3>
                <p>Use the Quick Pick action to jump straight into a surprise anime series with HD streaming and English subtitles.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
