'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

interface UncensoredHubProps {
  initialSeries: SeriesItem[];
  isDbEmpty: boolean;
}

export default function UncensoredHub({ initialSeries, isDbEmpty }: UncensoredHubProps) {
  const searchParams = useSearchParams();
  const catalogRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<string>('random'); // DEFAULT: Random
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasHydrated, setHasHydrated] = useState(false);

  const ITEMS_PER_PAGE = 25; // 5 rows x 5 columns

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

  // Filter series specifically for uncensored content
  const uncensoredFilteredSeries = useMemo(() => {
    const baseList = initialSeries.filter((series) => {
      const tags = (series.tags || []).map(t => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
      const cat = (series.category || '').toLowerCase().trim();
      const desc = (series.description || '').toLowerCase().trim();

      const matchesUncensoredTag = tags.some(t => t === 'uncensored');
      const matchesUncensoredCat = cat === 'uncensored';
      const matchesUncensoredDesc = desc.includes('uncensored');

      return matchesUncensoredTag || matchesUncensoredCat || matchesUncensoredDesc;
    });

    return baseList.filter((series) => {
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
    if (sortMode === 'random' && hasHydrated) {
      // Fisher-Yates shuffle for true randomness
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
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
  }, [uncensoredFilteredSeries, sortMode, hasHydrated]);

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

  // ItemList JSON-LD Schema for Active Paginated Uncensored Results
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Uncensored Hentai Anime Releases on PlayHentai',
    'url': `${SITE_URL}/uncensored`,
    'itemListElement': paginatedSeries.map((s, i) => ({
      '@type': 'ListItem',
      'position': startIndex + i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  return (
    <div className={styles.hubContainer} ref={catalogRef}>
      <JsonLd data={itemListJsonLd} />
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
          <button 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
            title="Previous Page"
          >
            <ChevronLeft size={18} />
            <span>Prev</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`${styles.pageBtn} ${currentPage === pageNum ? styles.pageBtnActive : ''}`}
            >
              {pageNum}
            </button>
          ))}

          <button 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
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
