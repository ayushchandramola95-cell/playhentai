'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Shuffle, LayoutGrid, List, Eye, Star } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import { getR2Url } from '@/utils/r2';
import styles from './random.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  tags?: string[];
  category?: string;
  views_count?: number;
  views?: number;
  rating?: number;
}

interface RandomizerPortalProps {
  seriesList: SeriesItem[];
}

function getStableRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const min = 50; // 5.0
  const max = 95; // 9.5
  const val = Math.abs(hash % (max - min));
  return parseFloat(((min + val) / 10).toFixed(1));
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
  const [shuffledList, setShuffledList] = useState<SeriesItem[]>(seriesList);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const pageSize = 24;

  const shuffleArray = (array: SeriesItem[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Handle live randomize reshuffle
  const handleRandomize = useCallback(() => {
    setIsShuffling(true);
    setTimeout(() => {
      setShuffledList(shuffleArray(seriesList));
      setCurrentPage(1);
      setIsShuffling(false);
    }, 250);
  }, [seriesList]);

  // Sync stable list on mount / data updates without auto-shuffling
  useEffect(() => {
    setShuffledList(seriesList);
    setCurrentPage(1);
  }, [seriesList]);

  // Pagination calculation
  const totalPages = Math.ceil(shuffledList.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shuffledList.slice(start, start + pageSize);
  }, [shuffledList, currentPage, pageSize]);

  return (
    <div className={styles.container}>
      <div className={styles.portalContent}>
        {/* Breadcrumb Row */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Random</span>
        </nav>

        {/* Page Header */}
        <div className={styles.portalHeader}>
          <h1 className={styles.pageTitle}>Random Hentai Anime Generator</h1>
          <p className={styles.portalSubtext}>
            Can't decide what to watch? Shuffle the library to discover a random hentai anime series, explore recommendations, or filter the results by category.
          </p>
        </div>

        {/* Action Bar: Big Randomize Button, View Mode, Pagination */}
        <div className={styles.actionBar}>
          <div className={styles.actionBarLeft}>
            <button
              type="button"
              onClick={handleRandomize}
              className={`${styles.randomizeBtn} ${isShuffling ? styles.btnSpinning : ''}`}
              disabled={isShuffling}
            >
              <Shuffle size={16} className={styles.shuffleIcon} />
              <span>Randomize</span>
            </button>
          </div>

          {/* Empty center column to balance layout */}
          <div style={{ pointerEvents: 'none' }} />

          <div className={styles.actionBarRight}>
            <div className={styles.controlsRight}>
              <div className={styles.viewToggleGroup}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`}
                  title="Grid View"
                  aria-label="Switch to Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`}
                  title="List View"
                  aria-label="Switch to List View"
                >
                  <List size={16} />
                </button>
              </div>

              <div className={styles.miniPagination}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={styles.pageArrowBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.pageIndicator}>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={styles.pageArrowBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Randomized Catalog Grid / List */}
        {viewMode === 'grid' ? (
          <div className={`${styles.catalogGrid} ${isShuffling ? styles.gridFade : ''}`}>
            {paginatedItems.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={`${styles.catalogList} ${isShuffling ? styles.gridFade : ''}`}>
            {paginatedItems.map((item) => {
              const rating = item.rating || getStableRating(item.id || item.title);
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
                      sizes="120px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.listItemDetails}>
                    <h3 className={styles.listItemTitle}>{item.title}</h3>
                    
                    <div className={styles.listItemMeta}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Star size={12} fill="#eab308" color="#eab308" style={{ marginRight: '4px' }} />
                        {rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Eye size={12} style={{ marginRight: '4px' }} />
                        {formatViews(views)} Views
                      </span>
                      {item.category && (
                        <>
                          <span>•</span>
                          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
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
              Showing Page {currentPage} of {totalPages} ({shuffledList.length} Random Titles)
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
      </div>
    </div>
  );
}
