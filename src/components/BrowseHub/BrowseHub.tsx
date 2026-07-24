'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Search, X, Filter, Calendar, Tv, Layers, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENRES, STUDIOS, RELEASE_YEARS } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';
import SeriesCard from '../SeriesCard/SeriesCard';
import styles from './BrowseHub.module.css';

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
  alt_title_japanese?: string;
  alt_title_romaji?: string;
  alt_title_english?: string;
  altTitleJapanese?: string;
  altTitleRomaji?: string;
  altTitleEnglish?: string;
  aliases?: string[];
}

interface BrowseHubProps {
  initialSeries: SeriesItem[];
  isDbEmpty: boolean;
}

type TabType = 'genres' | 'studios' | 'years';

function BrowseHubContent({ initialSeries, isDbEmpty }: BrowseHubProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogRef = useRef<HTMLDivElement>(null);

  // Active filter states
  const [activeTab, setActiveTab] = useState<TabType>('genres');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<string>('a_z'); // DEFAULT: A to Z
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 20; // 4 rows of 5 cards

  // Smooth scroll helper to slide series grid 50-75% into view
  const scrollToResults = () => {
    setTimeout(() => {
      if (catalogRef.current) {
        const rect = catalogRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - 150;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      }
    }, 60);
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGenre, selectedStudio, selectedYear, searchQuery, sortMode]);

  // Dynamically compute unique genres list by combining static GENRES + any dynamic tags in initialSeries
  const dynamicGenres = useMemo(() => {
    const allGenres = new Set<string>(GENRES);
    initialSeries.forEach((series) => {
      if (series.tags) {
        series.tags.forEach((tag) => {
          if (tag.toLowerCase() !== 'featured' && !tag.toLowerCase().startsWith('featured:')) {
            allGenres.add(tag);
          }
        });
      }
    });
    return Array.from(allGenres).sort((a, b) => a.localeCompare(b));
  }, [initialSeries]);

  // Sync initial filters from URL search params
  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const studioParam = searchParams.get('studio');
    const yearParam = searchParams.get('year');
    const sortParam = searchParams.get('sort');

    if (sortParam) {
      setSortMode(sortParam);
    }

    if (genreParam) {
      if (genreParam.toLowerCase() === 'all' || genreParam.toLowerCase() === 'all genres') {
        setSelectedGenre(null);
      } else {
        // Find case-insensitive match in our dynamicGenres list
        const matchedGenre = dynamicGenres.find(g => g.toLowerCase() === genreParam.toLowerCase());
        if (matchedGenre) {
          setSelectedGenre(matchedGenre);
        } else {
          const formatted = genreParam.charAt(0).toUpperCase() + genreParam.slice(1);
          setSelectedGenre(formatted);
        }
      }
      setActiveTab('genres');
      scrollToResults();
    }
    if (studioParam) {
      const matchedStudio = STUDIOS.find(s => s.toLowerCase() === studioParam.toLowerCase());
      if (matchedStudio) {
        setSelectedStudio(matchedStudio);
        setActiveTab('studios');
        scrollToResults();
      }
    }
    if (yearParam) {
      const parsedYear = parseInt(yearParam, 10);
      if (RELEASE_YEARS.includes(parsedYear)) {
        setSelectedYear(parsedYear);
        setActiveTab('years');
        scrollToResults();
      }
    }
  }, [searchParams, dynamicGenres]);

  // Handle setting/toggling a genre filter
  const handleGenreToggle = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
    } else {
      setSelectedGenre(genre);
      scrollToResults();
    }
  };

  // Handle setting/toggling a studio filter
  const handleStudioToggle = (studio: string) => {
    if (selectedStudio === studio) {
      setSelectedStudio(null);
    } else {
      setSelectedStudio(studio);
      scrollToResults();
    }
  };

  // Handle setting/toggling a year filter
  const handleYearToggle = (year: number) => {
    if (selectedYear === year) {
      setSelectedYear(null);
    } else {
      setSelectedYear(year);
      scrollToResults();
    }
  };

  const handleClearFilters = () => {
    setSelectedGenre(null);
    setSelectedStudio(null);
    setSelectedYear(null);
    setSearchQuery('');
    setSortMode('a_z');
    setCurrentPage(1);
    router.push('/categories');
  };

  // Computed filtered & sorted list of series
  const filteredSeries = useMemo(() => {
    const list = initialSeries.filter(series => {
      // 1. Text Search matching title, alternative titles, aliases, description, and tags
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = series.title.toLowerCase().includes(query);
        const matchesDesc = series.description.toLowerCase().includes(query);
        const matchesTags = series.tags?.some(tag => tag.toLowerCase().includes(query));
        
        const altJp = series.alt_title_japanese || series.altTitleJapanese || '';
        const altRo = series.alt_title_romaji || series.altTitleRomaji || '';
        const altEn = series.alt_title_english || series.altTitleEnglish || '';
        const matchesAltTitles = 
          altJp.toLowerCase().includes(query) ||
          altRo.toLowerCase().includes(query) ||
          altEn.toLowerCase().includes(query);

        const matchesAliases = series.aliases?.some(alias => alias.toLowerCase().includes(query)) || false;

        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesAltTitles && !matchesAliases) return false;
      }

      // 2. Genre filter (matches either series.category or series.tags)
      if (selectedGenre) {
        const matchesCategory = series.category?.toLowerCase() === selectedGenre.toLowerCase();
        const matchesTags = series.tags?.some(tag => tag.toLowerCase() === selectedGenre.toLowerCase());
        if (!matchesCategory && !matchesTags) return false;
      }

      // 3. Studio filter
      if (selectedStudio) {
        if (!series.studio || series.studio.toLowerCase() !== selectedStudio.toLowerCase()) return false;
      }

      // 4. Release Year filter
      if (selectedYear) {
        if (!series.releaseYear || series.releaseYear !== selectedYear) return false;
      }

      return true;
    });

    // 5. Apply Sorting (DEFAULT: A-Z)
    const sorted = [...list];
    if (sortMode === 'a_z') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortMode === 'z_a') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sortMode === 'newest') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.releaseYear || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.releaseYear || 0).getTime();
        return dateA - dateB;
      });
    } else if (sortMode === 'most_viewed') {
      sorted.sort((a, b) => ((b as any).views || 0) - ((a as any).views || 0));
    } else if (sortMode === 'rating') {
      sorted.sort((a, b) => ((b as any).rating || 0) - ((a as any).rating || 0));
    }

    return sorted;
  }, [initialSeries, searchQuery, selectedGenre, selectedStudio, selectedYear, sortMode]);

  // Calculate Pagination
  const totalItems = filteredSeries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const currentSeries = filteredSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      scrollToResults();
    }
  };

  // Generate Page Numbers Array
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className={styles.hubContainer}>
      {/* Search and Quick Filters Bar */}
      <div className={`${styles.filterBar} glass`}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search titles, tags, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Selected Filters Badges */}
        {(selectedGenre || selectedStudio || selectedYear || searchQuery) && (
          <div className={styles.activeBadgesRow}>
            {selectedGenre && (
              <span className={styles.activeBadge}>
                Genre: {selectedGenre}
                <button onClick={() => setSelectedGenre(null)}><X size={12} /></button>
              </span>
            )}
            {selectedStudio && (
              <span className={styles.activeBadge}>
                Studio: {selectedStudio}
                <button onClick={() => setSelectedStudio(null)}><X size={12} /></button>
              </span>
            )}
            {selectedYear && (
              <span className={styles.activeBadge}>
                Year: {selectedYear}
                <button onClick={() => setSelectedYear(null)}><X size={12} /></button>
              </span>
            )}
            <button onClick={handleClearFilters} className={styles.clearAllBtn}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Tabs Selector */}
      <div className={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab('genres')}
          className={`${styles.tabBtn} ${activeTab === 'genres' ? styles.activeTab : ''}`}
        >
          <Layers size={16} />
          <span>Genres</span>
        </button>
        <button
          onClick={() => setActiveTab('studios')}
          className={`${styles.tabBtn} ${activeTab === 'studios' ? styles.activeTab : ''}`}
        >
          <Tv size={16} />
          <span>Studios</span>
        </button>
        <button
          onClick={() => setActiveTab('years')}
          className={`${styles.tabBtn} ${activeTab === 'years' ? styles.activeTab : ''}`}
        >
          <Calendar size={16} />
          <span>Release Years</span>
        </button>
      </div>

      {/* Selector Grid (Pills) */}
      <div className={`${styles.selectorSection} glass`}>
        {activeTab === 'genres' && (
          <div className={styles.pillsGrid}>
            {dynamicGenres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`${styles.pillBtn} ${isActive ? styles.activePill : ''}`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'studios' && (
          <div className={styles.pillsGrid}>
            {STUDIOS.map((studio) => {
              const isActive = selectedStudio === studio;
              return (
                <button
                  key={studio}
                  onClick={() => handleStudioToggle(studio)}
                  className={`${styles.pillBtn} ${isActive ? styles.activePill : ''}`}
                >
                  {studio}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'years' && (
          <div className={styles.pillsGrid}>
            {RELEASE_YEARS.map((year) => {
              const isActive = selectedYear === year;
              return (
                <button
                  key={year}
                  onClick={() => handleYearToggle(year)}
                  className={`${styles.pillBtn} ${isActive ? styles.activePill : ''}`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Catalog Results Grid */}
      <section className={styles.catalogSection} ref={catalogRef}>
        <div className={styles.catalogHeader}>
          <div className={styles.catalogTitle}>
            <Grid size={20} className={styles.headerIcon} />
            <h2>Filtered Releases</h2>
            {isDbEmpty && <span className={styles.demoBadge}>DEMO DATA</span>}
          </div>

          <div className={styles.sortControls}>
            <span className={styles.sortLabel}>Sort By:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="a_z">Name: A to Z (Default)</option>
              <option value="z_a">Name: Z to A</option>
              <option value="newest">Newest Releases</option>
              <option value="oldest">Oldest Releases</option>
              <option value="most_viewed">Most Viewed</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {currentSeries.length > 0 ? (
          <>
            <div className={styles.seriesGrid}>
              {currentSeries.map((item) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <button
                  type="button"
                  onClick={() => handlePageChange(validPage - 1)}
                  disabled={validPage <= 1}
                  className={`${styles.pageBtn} ${validPage <= 1 ? styles.pageBtnDisabled : ''}`}
                >
                  <ChevronLeft size={18} />
                  <span>Prev</span>
                </button>

                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`${styles.pageBtn} ${pageNum === validPage ? styles.pageBtnActive : ''}`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handlePageChange(validPage + 1)}
                  disabled={validPage >= totalPages}
                  className={`${styles.pageBtn} ${validPage >= totalPages ? styles.pageBtnDisabled : ''}`}
                >
                  <span>Next</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={`${styles.emptyState} glass`}>
            <Filter size={48} className={styles.emptyIcon} />
            <h3>No matches found</h3>
            <p>We couldn't find any titles matching your selected filters. Try clearing some options or searching for something else!</p>
            <button onClick={handleClearFilters} className={styles.clearFiltersBtn}>
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function BrowseHub(props: BrowseHubProps) {
  return (
    <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Library...</div>}>
      <BrowseHubContent {...props} />
    </React.Suspense>
  );
}
