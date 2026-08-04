'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
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
  rating?: number;
}

interface RandomizerPortalProps {
  seriesList: SeriesItem[];
}

export default function RandomizerPortal({ seriesList }: RandomizerPortalProps) {
  const [shuffledList, setShuffledList] = useState<SeriesItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
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

  // Initial random shuffle on mount
  useEffect(() => {
    setShuffledList(shuffleArray(seriesList));
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
          <h1 className={styles.pageTitle}>Random</h1>
          <p className={styles.portalSubtext}>
            Feelin' lucky? Here's the whole library in a random order — hit randomize for a fresh shuffle.
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

          {/* Empty center column to balance layout and keep action items on opposite ends */}
          <div style={{ pointerEvents: 'none' }} />

          <div className={styles.actionBarRight}>
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

        {/* Randomized Catalog Grid / List */}
        <div className={`${styles.catalogGrid} ${isShuffling ? styles.gridFade : ''}`}>
          {paginatedItems.map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </div>

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
