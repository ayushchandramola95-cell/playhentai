'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ChevronDown, RotateCcw } from 'lucide-react';
import SeriesCard from '../SeriesCard/SeriesCard';
import AdBanner from '../AdBanner/AdBanner';
import styles from './ThreeDHub.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  tags?: string[];
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
  content_rating?: string;
  views?: number;
  rating?: number;
}

interface ThreeDHubProps {
  initialSeries: SeriesItem[];
  isDbEmpty: boolean;
  basePath?: string;
  currentPage?: number;
}

function getStableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function ThreeDHubContent({ 
  initialSeries, 
  isDbEmpty,
  basePath = '/3d',
  currentPage: serverPage = 1
}: ThreeDHubProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<string>('random'); // DEFAULT: Random
  const [currentPage, setCurrentPage] = useState<number>(serverPage);

  const ITEMS_PER_PAGE = 24; // 4 rows x 6 columns

  const getPageLink = (pageNumber: number) => {
    if (pageNumber === 1) return basePath;
    const querySymbol = basePath.includes('?') ? '&' : '?';
    return `${basePath}${querySymbol}page=${pageNumber}`;
  };

  const handlePageClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const pageParam = searchParams.get('page');
    const sortParam = searchParams.get('sort');

    if (sortParam) setSortMode(sortParam);
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      }
    }
  }, [searchParams]);

  // Smooth Auto-scroll to hide header when search box is clicked / focused
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (filterBarRef.current) {
      const NAVBAR_OFFSET = 86; // 74px navbar + 12px margin
      const rect = filterBarRef.current.getBoundingClientRect();
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      const targetScroll = rect.top + currentScroll - NAVBAR_OFFSET;

      window.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter series based on search query
  const filteredSeries = useMemo(() => {
    return initialSeries.filter((series) => {
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

  // Sort filtered series stably
  const sortedSeries = useMemo(() => {
    const list = [...filteredSeries];
    if (sortMode === 'random') {
      list.sort((a, b) => {
        const hashA = getStableHash(a.id || a.slug || '');
        const hashB = getStableHash(b.id || b.slug || '');
        return hashA - hashB;
      });
    } else if (sortMode === 'recent') {
      list.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.release_year || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.release_year || b.releaseYear || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'most_viewed') {
      list.sort((a, b) => ((b as any).views || (b as any).views_count || 0) - ((a as any).views || (a as any).views_count || 0));
    } else if (sortMode === 'rating') {
      list.sort((a, b) => ((b as any).rating || 0) - ((a as any).rating || 0));
    } else if (sortMode === 'a_z') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'z_a') {
      list.sort((a, b) => b.title.localeCompare(a.title));
    }
    return list;
  }, [filteredSeries, sortMode]);

  // Pagination calculation
  const totalItems = sortedSeries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedSeries = sortedSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className={styles.hubContainer} ref={catalogRef}>
      {/* Sleek Single-Bar Filter Control Panel */}
      <div 
        ref={filterBarRef}
        className={`${styles.filterBar} glass ${isSearchFocused ? styles.filterBarFocused : ''}`}
      >
        {/* Real-time Search Box */}
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search 3D catalog..."
            value={searchQuery}
            onFocus={handleSearchFocus}
            onClick={handleSearchFocus}
            onBlur={handleSearchBlur}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`${styles.searchInput} ${isSearchFocused ? styles.searchInputFocused : ''}`}
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={handleClearSearch}
              className={styles.clearSearch}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className={styles.sortGroup}>
          <span className={styles.sortLabel}>Sort:</span>
          <div className={styles.sortDropdownWrapper}>
            <ArrowUpDown size={14} className={styles.sortIcon} />
            <select 
              id="threed-sort-select"
              value={sortMode} 
              onChange={(e) => {
                setSortMode(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.sortSelect}
              aria-label="Sort 3D catalog"
            >
              <option value="random">🎲 Random</option>
              <option value="recent">🕒 Newest Releases</option>
              <option value="most_viewed">🔥 Most Viewed</option>
              <option value="rating">⭐ Highest Rated</option>
              <option value="a_z">🔤 Name: A-Z</option>
              <option value="z_a">🔤 Name: Z-A</option>
            </select>
            <ChevronDown size={14} className={styles.selectArrow} />
          </div>
        </div>
      </div>

      {/* Results Header Bar */}
      <div className={styles.catalogResultsHeader}>
        {searchQuery ? (
          <button type="button" onClick={handleClearSearch} className={styles.clearFiltersInlineBtn}>
            <RotateCcw size={13} /> Clear Search
          </button>
        ) : (
          <span />
        )}
        <span className={styles.resultsCountText}>
          Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</strong> of <strong>{totalItems}</strong> Series
        </span>
      </div>

      {/* Sponsored Ad Banner */}
      <AdBanner zoneId="5986838" />

      {/* Catalog Results Grid Section */}
      <section className={styles.catalogSection}>
        {paginatedSeries.length > 0 ? (
          <>
            <div className={styles.seriesGrid}>
              {paginatedSeries.map((series) => (
                <SeriesCard key={series.id || series.slug} item={series} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                {validPage <= 1 ? (
                  <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`} aria-disabled="true">
                    <ChevronsLeft size={16} />
                  </span>
                ) : (
                  <Link
                    href={getPageLink(1)}
                    onClick={handlePageClick}
                    className={styles.pageBtn}
                    aria-label="First Page"
                  >
                    <ChevronsLeft size={16} />
                  </Link>
                )}

                {validPage <= 1 ? (
                  <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`} aria-disabled="true">
                    <ChevronLeft size={16} />
                  </span>
                ) : (
                  <Link
                    href={getPageLink(validPage - 1)}
                    onClick={handlePageClick}
                    className={styles.pageBtn}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                )}

                <span className={styles.pageIndicator}>
                  Page <strong>{validPage}</strong> of <strong>{totalPages}</strong>
                </span>

                {validPage >= totalPages ? (
                  <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`} aria-disabled="true">
                    <ChevronRight size={16} />
                  </span>
                ) : (
                  <Link
                    href={getPageLink(validPage + 1)}
                    onClick={handlePageClick}
                    className={styles.pageBtn}
                    aria-label="Next Page"
                  >
                    <ChevronRight size={16} />
                  </Link>
                )}

                {validPage >= totalPages ? (
                  <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`} aria-disabled="true">
                    <ChevronsRight size={16} />
                  </span>
                ) : (
                  <Link
                    href={getPageLink(totalPages)}
                    onClick={handlePageClick}
                    className={styles.pageBtn}
                    aria-label="Last Page"
                  >
                    <ChevronsRight size={16} />
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <h3>No matches found</h3>
            <p>Try searching for another keyword or title!</p>
            <button 
              type="button"
              onClick={handleClearSearch}
              className={styles.clearFiltersBtn}
            >
              Clear Search
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ThreeDHub(props: ThreeDHubProps) {
  return (
    <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading 3D Catalog...</div>}>
      <ThreeDHubContent {...props} />
    </React.Suspense>
  );
}
