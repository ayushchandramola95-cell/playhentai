'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import SeriesCard from '../SeriesCard/SeriesCard';
import AdBanner from '../AdBanner/AdBanner';
import styles from '../BrowseHub/BrowseHub.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  tags: string[];
  category?: string;
  studio?: string;
  releaseYear?: number;
  release_year?: number;
  alt_title_japanese?: string;
  alt_title_romaji?: string;
  alt_title_english?: string;
  altTitleJapanese?: string;
  altTitleRomaji?: string;
  altTitleEnglish?: string;
  aliases?: string[];
}

interface UncensoredHubProps {
  initialSeries: SeriesItem[];
  isDbEmpty: boolean;
}

export default function UncensoredHub({ initialSeries, isDbEmpty }: UncensoredHubProps) {
  const catalogRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<string>('a_z'); // DEFAULT: A to Z
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 25; // 5 rows x 5 columns

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setTimeout(() => {
      if (filterBarRef.current) {
        const rect = filterBarRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - 75;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      }
    }, 40);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortMode]);

  // Filter series for uncensored items (or all items if tagged as uncensored or empty)
  const uncensoredFilteredSeries = useMemo(() => {
    return initialSeries.filter((series) => {
      // If searchQuery is entered, match query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = series.title.toLowerCase().includes(query);
        const matchesDesc = series.description ? series.description.toLowerCase().includes(query) : false;
        const matchesTags = series.tags ? series.tags.some(t => t.toLowerCase().includes(query)) : false;
        const matchesStudio = series.studio ? series.studio.toLowerCase().includes(query) : false;
        const matchesAltJa = series.altTitleJapanese || series.alt_title_japanese ? (series.altTitleJapanese || series.alt_title_japanese || '').toLowerCase().includes(query) : false;
        const matchesAltRo = series.altTitleRomaji || series.alt_title_romaji ? (series.altTitleRomaji || series.alt_title_romaji || '').toLowerCase().includes(query) : false;
        const matchesAltEn = series.altTitleEnglish || series.alt_title_english ? (series.altTitleEnglish || series.alt_title_english || '').toLowerCase().includes(query) : false;

        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesStudio && !matchesAltJa && !matchesAltRo && !matchesAltEn) {
          return false;
        }
      }
      return true;
    });
  }, [initialSeries, searchQuery]);

  // Sort filtered series
  const sortedSeries = useMemo(() => {
    const list = [...uncensoredFilteredSeries];
    if (sortMode === 'a_z') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'z_a') {
      list.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortMode === 'newest') {
      list.sort((a, b) => {
        const yearA = a.release_year || a.releaseYear || 0;
        const yearB = b.release_year || b.releaseYear || 0;
        return yearB - yearA;
      });
    } else if (sortMode === 'oldest') {
      list.sort((a, b) => {
        const yearA = a.release_year || a.releaseYear || 0;
        const yearB = b.release_year || b.releaseYear || 0;
        return yearA - yearB;
      });
    }
    return list;
  }, [uncensoredFilteredSeries, sortMode]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedSeries.length / ITEMS_PER_PAGE) || 1;
  const paginatedSeries = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedSeries.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [sortedSeries, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (catalogRef.current) {
        const rect = catalogRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        window.scrollTo({ top: Math.max(0, rect.top + scrollTop - 100), behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={styles.hubContainer} ref={catalogRef}>
      {/* Search Bar & Controls */}
      <div 
        ref={filterBarRef}
        className={`${styles.filterBar} ${isSearchFocused ? styles.filterBarFocused : ''}`}
      >
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search uncensored titles, tags, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Sponsored Ad Banner */}
      <AdBanner zoneId="5986838" />

      {/* Header & Controls */}
      <div className={styles.catalogHeader}>
        <div className={styles.catalogTitle}>
          <Grid size={20} className={styles.gridIcon} />
          <h2>Uncensored Releases</h2>
          <span className={styles.itemCount}>({sortedSeries.length} titles)</span>
        </div>

        {/* Sort Controls */}
        <div className={styles.sortControls}>
          <label htmlFor="uncensored-sort-select" className={styles.sortLabel}>Sort By:</label>
          <select 
            id="uncensored-sort-select"
            value={sortMode} 
            onChange={(e) => setSortMode(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="a_z">Name: A to Z (Default)</option>
            <option value="z_a">Name: Z to A</option>
            <option value="newest">Release Year: Newest First</option>
            <option value="oldest">Release Year: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Grid of Series Cards */}
      {paginatedSeries.length > 0 ? (
        <div className={styles.seriesGrid}>
          {paginatedSeries.map((series) => (
            <SeriesCard key={series.id || series.slug} item={series} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No uncensored anime found matching your search term.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className={styles.resetBtn}
          >
            Clear Search Filter
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className={styles.pageBtn}
            title="Previous Page"
          >
            <ChevronLeft size={18} />
            <span>Prev</span>
          </button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`${styles.pageNumBtn} ${currentPage === pageNum ? styles.activePageBtn : ''}`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className={styles.pageBtn}
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
