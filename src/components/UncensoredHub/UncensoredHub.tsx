'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import SeriesCard from '../SeriesCard/SeriesCard';
import AdBanner from '../AdBanner/AdBanner';
import JsonLd from '../JsonLd/JsonLd';
import styles from '../BrowseHub/BrowseHub.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

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
  content_rating?: string;
}

interface UncensoredHubProps {
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

export default function UncensoredHub({ 
  initialSeries, 
  isDbEmpty,
  basePath = '/uncensored',
  currentPage: serverPage = 1
}: UncensoredHubProps) {
  const searchParams = useSearchParams();
  const catalogRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<string>('random'); // DEFAULT: Random
  const [currentPage, setCurrentPage] = useState<number>(serverPage);
  const [hasHydrated, setHasHydrated] = useState(false);

  const ITEMS_PER_PAGE = 25; // 5 rows x 5 columns

  const getPageLink = (pageNumber: number) => {
    if (pageNumber === 1) return basePath;
    return `${basePath}?page=${pageNumber}`;
  };

  const handlePageClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      }
    }
  }, [searchParams]);

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

  // Filter series based on search query (initialSeries is already strictly pre-filtered by isUncensoredSeries)
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

  // Sort filtered series stably
  const sortedSeries = useMemo(() => {
    const list = [...uncensoredFilteredSeries];
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
  }, [uncensoredFilteredSeries, sortMode]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedSeries.length / ITEMS_PER_PAGE) || 1;
  const validPage = Math.min(currentPage, totalPages);

  const paginatedSeries = useMemo(() => {
    const startIdx = (validPage - 1) * ITEMS_PER_PAGE;
    return sortedSeries.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [sortedSeries, validPage]);

  return (
    <div className={styles.hubContainer} ref={catalogRef}>
      {/* Search Bar & Controls */}
      <div 
        ref={filterBarRef}
        className={styles.customFilterBar}
      >
        {/* Dummy div to balance grid left column and keep search centered */}
        <div style={{ pointerEvents: 'none' }} />

        {/* Centered Search box */}
        <div className={styles.customFilterBarCenter}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={styles.clearSearch}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Sort select dropdown aligned on the right */}
        <div className={styles.customFilterBarRight}>
          <select 
            id="uncensored-sort-select"
            value={sortMode} 
            onChange={(e) => setSortMode(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="random">🎲 Random</option>
            <option value="recent">≡ Recent Upload</option>
            <option value="most_viewed">🔥 Most Viewed</option>
            <option value="rating">⭐ Highest Rated</option>
            <option value="a_z">🔤 Name: A-Z</option>
            <option value="z_a">🔤 Name: Z-A</option>
          </select>
        </div>
      </div>

      {/* Sponsored Ad Banner */}
      <AdBanner zoneId="5986838" />

      {/* Catalog Grid Area */}

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
            className={styles.clearFiltersBtn}
          >
            Clear Search Filter
          </button>
        </div>
      )}

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

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            validPage === pageNum ? (
              <span key={pageNum} className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
                {pageNum}
              </span>
            ) : (
              <Link
                key={pageNum}
                href={getPageLink(pageNum)}
                onClick={handlePageClick}
                className={styles.pageBtn}
              >
                {pageNum}
              </Link>
            )
          ))}

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
    </div>
  );
}
