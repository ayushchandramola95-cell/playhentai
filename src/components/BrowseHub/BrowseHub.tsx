'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Tag,
  Building2,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Grid,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Activity,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react';
import { GENRES, STUDIOS, RELEASE_YEARS } from '@/utils/constants';
import SeriesCard from '../SeriesCard/SeriesCard';
import SeriesCompactCard from '../SeriesCard/SeriesCompactCard';
import AdBanner from '../AdBanner/AdBanner';
import JsonLd from '../JsonLd/JsonLd';
import styles from './BrowseHub.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

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
  status?: string;
  first_air_date?: string;
  created_at?: string;
  content_rating?: string;
  alt_title_japanese?: string;
  alt_title_romaji?: string;
  alt_title_english?: string;
  altTitleJapanese?: string;
  altTitleRomaji?: string;
  altTitleEnglish?: string;
  aliases?: string[];
  views?: number;
  rating?: number;
}

interface BrowseHubProps {
  initialSeries: SeriesItem[];
  isDbEmpty: boolean;
  initialGenre?: string;
  basePath?: string;
  isUncensoredPage?: boolean;
  is3DPage?: boolean;
  searchPlaceholder?: string;
}

function getStableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function BrowseHubContent({ 
  initialSeries, 
  isDbEmpty, 
  initialGenre, 
  basePath = '/categories',
  isUncensoredPage = false,
  is3DPage = false,
  searchPlaceholder
}: BrowseHubProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Active Main Filters
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [blockedTags, setBlockedTags] = useState<string[]>([]);
  const [isBroadMatches, setIsBroadMatches] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortMode, setSortMode] = useState<string>('most_viewed'); // Default: Popular
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 24; // 4 rows x 6 columns

  // Restore saved view mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playhentai_browse_view_mode');
      if (saved === 'compact' || saved === 'grid') {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const getPageLink = (pageNumber: number) => {
    if (pageNumber === 1) return basePath;
    const querySymbol = basePath.includes('?') ? '&' : '?';
    return `${basePath}${querySymbol}page=${pageNumber}`;
  };

  const handlePageClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modal Open States
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isBrandsModalOpen, setIsBrandsModalOpen] = useState(false);
  const [isYearsModalOpen, setIsYearsModalOpen] = useState(false);

  // Draft States for Modals (so Cancel / Apply work accurately)
  const [tempIncludedTags, setTempIncludedTags] = useState<string[]>([]);
  const [tempBlockedTags, setTempBlockedTags] = useState<string[]>([]);
  const [tempBroadMatches, setTempBroadMatches] = useState(false);
  const [tempSelectedBrands, setTempSelectedBrands] = useState<string[]>([]);
  const [tempSelectedYears, setTempSelectedYears] = useState<string[]>([]);

  // Search inside Modals
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [yearSearchQuery, setYearSearchQuery] = useState('');
  const [brandSortMode, setBrandSortMode] = useState<'count' | 'a_z'>('count');

  // Compute Tag & Brand Counts across initialSeries
  const { tagCounts, brandCounts, yearCounts, allTags, allBrands, availableYears } = useMemo(() => {
    const tCounts: Record<string, number> = {};
    const bCounts: Record<string, number> = {};
    const yCounts: Record<string, number> = {};
    const yearsSet = new Set<number>();

    initialSeries.forEach((series) => {
      // Tags & Category
      const tagsSet = new Set<string>();
      if (series.category) tagsSet.add(series.category);
      if (series.tags) {
        series.tags.forEach((t) => {
          if (!t.toLowerCase().startsWith('featured')) tagsSet.add(t);
        });
      }
      tagsSet.forEach((t) => {
        tCounts[t] = (tCounts[t] || 0) + 1;
      });

      // Studios / Brands
      if (series.studio) {
        bCounts[series.studio] = (bCounts[series.studio] || 0) + 1;
      }

      // Years
      const yr =
        series.release_year ||
        series.releaseYear ||
        (series.first_air_date ? new Date(series.first_air_date).getFullYear() : null);
      if (yr && typeof yr === 'number' && yr > 1970 && yr < 2050) {
        yearsSet.add(yr);
        yCounts[String(yr)] = (yCounts[String(yr)] || 0) + 1;
      }
    });

    // Ensure default GENRES & STUDIOS exist in counts
    GENRES.forEach((g) => {
      if (tCounts[g] === undefined) tCounts[g] = 0;
    });
    STUDIOS.forEach((s) => {
      if (bCounts[s] === undefined) bCounts[s] = 0;
    });
    RELEASE_YEARS.forEach((y) => {
      yearsSet.add(y);
      if (yCounts[String(y)] === undefined) yCounts[String(y)] = 0;
    });

    const tagsList = Object.keys(tCounts)
      .filter((t) => {
        const lower = t.toLowerCase();
        if (isUncensoredPage && (lower === 'uncensored' || lower === 'censored')) return false;
        if (is3DPage && (lower === '3d' || lower === '3d anime' || lower === '3d hentai' || lower === 'cgi')) return false;
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
    const brandsList = Object.keys(bCounts);
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      tagCounts: tCounts,
      brandCounts: bCounts,
      yearCounts: yCounts,
      allTags: tagsList,
      allBrands: brandsList,
      availableYears: sortedYears,
    };
  }, [initialSeries, isUncensoredPage, is3DPage]);

  // Sync Initial URL Search Parameters
  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const studioParam = searchParams.get('studio');
    const yearParam = searchParams.get('year');
    const statusParam = searchParams.get('status');
    const sortParam = searchParams.get('sort');
    const pageParam = searchParams.get('page');

    if (sortParam) setSortMode(sortParam);
    if (yearParam && yearParam.toLowerCase() !== 'all') setSelectedYears([yearParam]);
    if (statusParam) setSelectedStatus(statusParam.toLowerCase());
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (!isNaN(p) && p > 0) setCurrentPage(p);
    }
    if (genreParam && genreParam.toLowerCase() !== 'all') {
      const matched = allTags.find((t) => t.toLowerCase() === genreParam.toLowerCase());
      if (matched) setIncludedTags([matched]);
    }
    if (studioParam) {
      const matched = allBrands.find((b) => b.toLowerCase() === studioParam.toLowerCase());
      if (matched) setSelectedBrands([matched]);
    }
  }, [searchParams, allTags, allBrands]);

  // Handle Opening Modals & Syncing Draft State
  const openTagsModal = () => {
    setTempIncludedTags([...includedTags]);
    setTempBlockedTags([...blockedTags]);
    setTempBroadMatches(isBroadMatches);
    setTagSearchQuery('');
    setIsTagsModalOpen(true);
  };

  const openBrandsModal = () => {
    setTempSelectedBrands([...selectedBrands]);
    setBrandSearchQuery('');
    setIsBrandsModalOpen(true);
  };

  const openYearsModal = () => {
    setTempSelectedYears([...selectedYears]);
    setYearSearchQuery('');
    setIsYearsModalOpen(true);
  };

  // Tag Modal Actions
  const handleToggleIncludeTag = (tag: string) => {
    setTempIncludedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        // Also remove from blocked if included
        setTempBlockedTags((b) => b.filter((t) => t !== tag));
        return [...prev, tag];
      }
    });
  };

  const handleToggleBlockTag = (tag: string) => {
    setTempBlockedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        // Also remove from included if blocked
        setTempIncludedTags((inc) => inc.filter((t) => t !== tag));
        return [...prev, tag];
      }
    });
  };

  const handleApplyTags = () => {
    setIncludedTags([...tempIncludedTags]);
    setBlockedTags([...tempBlockedTags]);
    setIsBroadMatches(tempBroadMatches);
    setIsTagsModalOpen(false);
    setCurrentPage(1);
  };

  const handleResetTagsModal = () => {
    setTempIncludedTags([]);
    setTempBlockedTags([]);
    setTempBroadMatches(false);
  };

  // Brand Modal Actions
  const handleToggleBrand = (brand: string) => {
    setTempSelectedBrands((prev) => {
      if (prev.includes(brand)) {
        return prev.filter((b) => b !== brand);
      } else {
        return [...prev, brand];
      }
    });
  };

  const handleApplyBrands = () => {
    setSelectedBrands([...tempSelectedBrands]);
    setIsBrandsModalOpen(false);
    setCurrentPage(1);
  };

  const handleResetBrandsModal = () => {
    setTempSelectedBrands([]);
  };

  // Year Modal Actions
  const handleToggleYear = (yearStr: string) => {
    setTempSelectedYears((prev) => {
      if (prev.includes(yearStr)) {
        return prev.filter((y) => y !== yearStr);
      } else {
        return [...prev, yearStr];
      }
    });
  };

  const handleApplyYears = () => {
    setSelectedYears([...tempSelectedYears]);
    setIsYearsModalOpen(false);
    setCurrentPage(1);
  };

  const handleResetYearsModal = () => {
    setTempSelectedYears([]);
  };

  // Clear All Main Filters
  const handleClearAllFilters = () => {
    setIncludedTags([]);
    setBlockedTags([]);
    setIsBroadMatches(false);
    setSelectedBrands([]);
    setSelectedYears([]);
    setSelectedStatus('all');
    setSearchQuery('');
    setSortMode('random');
    setCurrentPage(1);
    router.push('/categories');
  };

  // Filtered & Sorted Series Results
  const filteredSeries = useMemo(() => {
    const list = initialSeries.filter((series) => {
      // 1. Search Query Match
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = series.title.toLowerCase().includes(q);
        const matchDesc = series.description.toLowerCase().includes(q);
        const matchTags = series.tags?.some((t) => t.toLowerCase().includes(q));
        const matchStudio = series.studio?.toLowerCase().includes(q);

        const altJp = series.alt_title_japanese || series.altTitleJapanese || '';
        const altRo = series.alt_title_romaji || series.altTitleRomaji || '';
        const altEn = series.alt_title_english || series.altTitleEnglish || '';
        const matchAlt =
          altJp.toLowerCase().includes(q) ||
          altRo.toLowerCase().includes(q) ||
          altEn.toLowerCase().includes(q);

        if (!matchTitle && !matchDesc && !matchTags && !matchStudio && !matchAlt) return false;
      }

      // Collect all tags on series
      const seriesTags = new Set<string>(
        [series.category, ...(series.tags || [])].filter(Boolean).map((t) => t!.toLowerCase())
      );

      // 2. Included Tags Match
      if (includedTags.length > 0) {
        if (isBroadMatches) {
          const hasAll = includedTags.every((inc) => seriesTags.has(inc.toLowerCase()));
          if (!hasAll) return false;
        } else {
          const hasIncluded = includedTags.some((inc) => seriesTags.has(inc.toLowerCase()));
          if (!hasIncluded) return false;
        }
      }

      // 3. Blocked Tags Match
      if (blockedTags.length > 0) {
        const hasBlocked = blockedTags.some((blk) => seriesTags.has(blk.toLowerCase()));
        if (hasBlocked) return false;
      }

      // 4. Selected Brands / Studios Match
      if (selectedBrands.length > 0) {
        if (!series.studio) return false;
        const matchBrand = selectedBrands.some(
          (b) => b.toLowerCase() === series.studio!.toLowerCase()
        );
        if (!matchBrand) return false;
      }

      // 5. Years Match
      if (selectedYears.length > 0) {
        const yr =
          series.release_year ||
          series.releaseYear ||
          (series.first_air_date ? new Date(series.first_air_date).getFullYear() : null);
        if (!yr) return false;

        const matchesYear = selectedYears.some((y) => {
          if (y === '2020s') return yr >= 2020 && yr <= 2029;
          if (y === '2010s') return yr >= 2010 && yr <= 2019;
          if (y === '2000s') return yr >= 2000 && yr <= 2009;
          if (y === '1990s') return yr <= 1999;
          const num = parseInt(y, 10);
          return !isNaN(num) && yr === num;
        });

        if (!matchesYear) return false;
      }

      // 6. Status Match
      if (selectedStatus && selectedStatus !== 'all') {
        const statusLower = (series.status || '').toLowerCase();
        const tagsLower = (series.tags || []).map((t) => t.toLowerCase());
        const catLower = (series.category || '').toLowerCase();
        const contentRating = (series.content_rating || '').toLowerCase();

        if (selectedStatus === 'completed') {
          const isCompleted =
            statusLower.includes('finish') ||
            statusLower.includes('complete') ||
            statusLower === 'finished_airing';
          if (!isCompleted) return false;
        } else if (selectedStatus === 'ongoing') {
          const isOngoing =
            statusLower.includes('releas') ||
            statusLower.includes('ongoing') ||
            statusLower === 'releasing';
          if (!isOngoing) return false;
        } else if (selectedStatus === 'upcoming') {
          const isUpcoming = statusLower.includes('upcom');
          if (!isUpcoming) return false;
        } else if (selectedStatus === 'uncensored') {
          const isUncensored =
            tagsLower.includes('uncensored') ||
            catLower === 'uncensored' ||
            contentRating.includes('uncensored');
          if (!isUncensored) return false;
        } else if (selectedStatus === '3d') {
          const is3D = tagsLower.includes('3d') || catLower === '3d';
          if (!is3D) return false;
        }
      }

      return true;
    });

    // Sort Results
    const sorted = [...list];
    if (sortMode === 'random') {
      // Stable pseudo-random sorting based on static item hashes to prevent hydration mismatches
      sorted.sort((a, b) => {
        const hashA = getStableHash(a.id || a.slug || '');
        const hashB = getStableHash(b.id || b.slug || '');
        return hashA - hashB;
      });
    } else if (sortMode === 'recent') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.release_year || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.release_year || b.releaseYear || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'most_viewed' || sortMode === 'popular') {
      sorted.sort((a, b) => ((b.views || (b as any).views_count) || 0) - ((a.views || (a as any).views_count) || 0));
    } else if (sortMode === 'recent') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.release_year || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.release_year || b.releaseYear || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'updated') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).updated_at || (a as any).created_at || (a as any).release_date || 0).getTime();
        const dateB = new Date((b as any).updated_at || (b as any).created_at || (b as any).release_date || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'a_z') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortMode === 'z_a') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    return sorted;
  }, [initialSeries, searchQuery, includedTags, blockedTags, selectedBrands, selectedYears, selectedStatus, sortMode]);

  // Calculate Pagination
  const totalItems = filteredSeries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const currentSeries = filteredSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter Tags List inside Modal by tagSearchQuery
  const filteredModalTags = useMemo(() => {
    if (!tagSearchQuery) return allTags;
    const q = tagSearchQuery.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, tagSearchQuery]);

  // Filter & Sort Brands List inside Modal by brandSearchQuery & brandSortMode
  const filteredModalBrands = useMemo(() => {
    let list = allBrands;
    if (brandSearchQuery) {
      const q = brandSearchQuery.toLowerCase();
      list = list.filter((b) => b.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (brandSortMode === 'count') {
      sorted.sort((a, b) => (brandCounts[b] || 0) - (brandCounts[a] || 0));
    } else {
      sorted.sort((a, b) => a.localeCompare(b));
    }
    return sorted;
  }, [allBrands, brandSearchQuery, brandSortMode, brandCounts]);

  // Filter Years List inside Modal by yearSearchQuery
  const filteredModalYears = useMemo(() => {
    if (!yearSearchQuery) return availableYears;
    const q = yearSearchQuery.trim().toLowerCase();
    return availableYears.filter((yr) => String(yr).toLowerCase().includes(q));
  }, [availableYears, yearSearchQuery]);

  // Smooth Auto-scroll to hide header when search box is clicked / focused
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (filterPanelRef.current) {
      // Navbar height (74px) + margin offset (12px)
      const NAVBAR_OFFSET = 86;
      const rect = filterPanelRef.current.getBoundingClientRect();
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

  const hasActiveFilters =
    includedTags.length > 0 ||
    blockedTags.length > 0 ||
    selectedBrands.length > 0 ||
    selectedYears.length > 0 ||
    (selectedStatus !== '' && selectedStatus !== 'all') ||
    searchQuery !== '';

  return (
    <div className={styles.hubContainer}>

      {/* 2-Tier Master Filter Control Panel */}
      <div
        ref={filterPanelRef}
        className={`${styles.filterPanel} glass ${
          isSearchFocused ? styles.filterPanelFocused : ''
        }`}
      >
        {/* Row 1: Taxonomy / Facet Filter Controls */}
        <div className={styles.filterTopRow}>
          {/* Genre Trigger Button */}
          <button
            type="button"
            onClick={openTagsModal}
            className={`${styles.filterBtn} ${
              includedTags.length > 0 || blockedTags.length > 0 ? styles.filterBtnActive : ''
            }`}
          >
            <Filter size={15} />
            <span>Genre</span>
            {includedTags.length + blockedTags.length > 0 ? (
              <span className={styles.btnBadge}>{includedTags.length + blockedTags.length}</span>
            ) : (
              <ChevronDown size={14} className={styles.filterArrow} />
            )}
          </button>

          {/* Studio Trigger Button */}
          <button
            type="button"
            onClick={openBrandsModal}
            className={`${styles.filterBtn} ${
              selectedBrands.length > 0 ? styles.filterBtnActive : ''
            }`}
          >
            <Building2 size={15} />
            <span>Studio</span>
            {selectedBrands.length > 0 ? (
              <span className={styles.btnBadge}>{selectedBrands.length}</span>
            ) : (
              <ChevronDown size={14} className={styles.filterArrow} />
            )}
          </button>

          {/* Year Trigger Button */}
          <button
            type="button"
            onClick={openYearsModal}
            className={`${styles.filterBtn} ${
              selectedYears.length > 0 ? styles.filterBtnActive : ''
            }`}
          >
            <Calendar size={15} />
            <span>Year</span>
            {selectedYears.length > 0 ? (
              <span className={styles.btnBadge}>{selectedYears.length}</span>
            ) : (
              <ChevronDown size={14} className={styles.filterArrow} />
            )}
          </button>

          {/* Status Dropdown Filter */}
          <div className={`${styles.filterSelectWrapper} ${selectedStatus !== 'all' ? styles.filterBtnActive : ''}`}>
            <Activity size={15} className={styles.selectIcon} />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.filterSelect}
              aria-label="Filter by series status"
            >
              <option value="all">Status: All</option>
              <option value="completed">Completed</option>
              <option value="ongoing">Ongoing</option>
              <option value="upcoming">Upcoming</option>
              {!isUncensoredPage && <option value="uncensored">Uncensored</option>}
              {!is3DPage && <option value="3d">3D Anime</option>}
            </select>
            <ChevronDown size={14} className={styles.filterArrow} />
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button type="button" onClick={handleClearAllFilters} className={styles.resetBtn}>
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Row 2: Search Catalog & Sort Controls */}
        <div className={styles.filterBottomRow}>
          {/* Real-time Search Box */}
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={searchPlaceholder || "Search catalog..."}
              value={searchQuery}
              onFocus={handleSearchFocus}
              onClick={handleSearchFocus}
              onBlur={handleSearchBlur}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`${styles.searchInput} ${
                isSearchFocused ? styles.searchInputFocused : ''
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearch}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls Group: Sort & View Mode */}
          <div className={styles.controlsGroup}>
            {/* Sort Dropdown */}
            <div className={styles.sortGroup}>
              <span className={styles.sortLabel}>Sort:</span>
              <div className={styles.sortDropdownWrapper}>
                <ArrowUpDown size={14} className={styles.sortIcon} />
                <select
                  value={sortMode}
                  onChange={(e) => {
                    setSortMode(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={styles.sortSelect}
                  aria-label="Sort catalog"
                >
                  <option value="most_viewed">🔥 Popular</option>
                  <option value="recent">🕒 Newest</option>
                  <option value="updated">✨ Recently Updated</option>
                  <option value="rating">⭐ Top Rated</option>
                  <option value="a_z">🔤 Name: A-Z</option>
                  <option value="random">🎲 Random</option>
                </select>
                <ChevronDown size={14} className={styles.selectArrow} />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className={styles.viewModeToggle} role="group" aria-label="View Mode">
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  try { localStorage.setItem('playhentai_browse_view_mode', 'grid'); } catch {}
                }}
                className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeActive : ''}`}
                aria-label="Grid View"
                title="Grid View"
              >
                <LayoutGrid size={15} />
                <span className={styles.viewModeText}>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('compact');
                  try { localStorage.setItem('playhentai_browse_view_mode', 'compact'); } catch {}
                }}
                className={`${styles.viewModeBtn} ${viewMode === 'compact' ? styles.viewModeActive : ''}`}
                aria-label="Compact View"
                title="Compact View"
              >
                <List size={15} />
                <span className={styles.viewModeText}>Compact</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header Bar */}
      <div className={styles.catalogResultsHeader}>
        {hasActiveFilters ? (
          <button type="button" onClick={handleClearAllFilters} className={styles.clearFiltersInlineBtn}>
            <RotateCcw size={13} /> Reset Filters
          </button>
        ) : (
          <span />
        )}
        <span className={styles.resultsCountText}>
          Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</strong> of <strong>{totalItems}</strong> Series
        </span>
      </div>

      {/* Active Badges Banner */}
      {hasActiveFilters && (
        <div className={styles.activeBadgesRow}>
          {includedTags.map((t) => (
            <span key={`inc-${t}`} className={styles.activeBadgeInclude}>
              + {t}
              <button
                type="button"
                className={styles.badgeRemoveBtn}
                onClick={() => setIncludedTags((prev) => prev.filter((item) => item !== t))}
                aria-label={`Remove included genre ${t}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {blockedTags.map((t) => (
            <span key={`blk-${t}`} className={styles.activeBadgeBlock}>
              - {t}
              <button
                type="button"
                className={styles.badgeRemoveBtn}
                onClick={() => setBlockedTags((prev) => prev.filter((item) => item !== t))}
                aria-label={`Remove blocked genre ${t}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {selectedBrands.map((b) => (
            <span key={`brand-${b}`} className={styles.activeBadgeBrand}>
              🏢 {b}
              <button
                type="button"
                className={styles.badgeRemoveBtn}
                onClick={() => setSelectedBrands((prev) => prev.filter((item) => item !== b))}
                aria-label={`Remove studio ${b}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {selectedYears.map((yr) => (
            <span key={`year-${yr}`} className={styles.activeBadgeYear}>
              📅 {yr}
              <button
                type="button"
                className={styles.badgeRemoveBtn}
                onClick={() => setSelectedYears((prev) => prev.filter((item) => item !== yr))}
                aria-label={`Remove year ${yr}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {selectedStatus !== 'all' && (
            <span className={styles.activeBadgeStatus}>
              ⚡ {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
              <button
                type="button"
                className={styles.badgeRemoveBtn}
                onClick={() => setSelectedStatus('all')}
                aria-label="Remove status filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Ad Banner Zone */}
      <AdBanner zoneId="5986838" />

      {/* Catalog Results Grid Section */}
      <section className={styles.catalogSection} ref={catalogRef}>
        {currentSeries.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className={styles.seriesGrid}>
                {currentSeries.map((item) => (
                  <SeriesCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className={styles.compactGrid}>
                {currentSeries.map((item) => (
                  <SeriesCompactCard key={item.id} item={item} />
                ))}
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
            <Filter size={48} className={styles.emptyIcon} />
            <h3>No matches found</h3>
            <p>Try resetting some filters or searching for another keyword!</p>
            <button type="button" onClick={handleClearAllFilters} className={styles.clearFiltersBtn}>
              Reset All Filters
            </button>
          </div>
        )}
      </section>

      {/* ==========================================================================
         TAGS FILTER MODAL (Hanime Replica)
         ========================================================================== */}
      {isTagsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsTagsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalTitleRow}>
                  <Filter size={22} className={styles.modalIcon} />
                  <h2 className={styles.modalTitle}>Genre</h2>
                </div>
                <p className={styles.modalSubtext}>Include or block genres to refine results</p>
              </div>

              <div className={styles.modalHeaderActions}>
                <button type="button" onClick={handleResetTagsModal} className={styles.modalResetBtn}>
                  <RotateCcw size={15} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTagsModalOpen(false)}
                  className={styles.modalCloseBtn}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Broad Matches Switch Card */}
              <div className={styles.broadMatchesCard}>
                <div className={styles.broadTextGroup}>
                  <span className={styles.broadTitle}>Broad Matches</span>
                  <span className={styles.broadDesc}>Must match all selected genres</span>
                </div>
                <label className={styles.switchToggle}>
                  <input
                    type="checkbox"
                    checked={tempBroadMatches}
                    onChange={(e) => setTempBroadMatches(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              {/* Tag Decisions Section Header & Search */}
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>Genre Decisions</h3>
                <div className={styles.statusPillsRow}>
                  <span className={styles.includedPill}>{tempIncludedTags.length} included</span>
                  <span className={styles.blockedPill}>{tempBlockedTags.length} blocked</span>
                </div>
              </div>

              <div className={styles.modalSearchWrapper}>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Filter genres..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className={styles.modalSearchInput}
                  />
                </div>
              </div>

              {/* Tags Cards Grid */}
              <div className={styles.tagsGrid}>
                {filteredModalTags.map((tag) => {
                  const isIncluded = tempIncludedTags.includes(tag);
                  const isBlocked = tempBlockedTags.includes(tag);
                  const count = tagCounts[tag] || 0;

                  return (
                    <div key={tag} className={styles.tagCard}>
                      <div className={styles.tagMeta}>
                        <span className={styles.tagName}>{tag}</span>
                        <span className={styles.tagCount}>{count} videos</span>
                      </div>

                      <div className={styles.tagBtnGroup}>
                        <button
                          type="button"
                          onClick={() => handleToggleIncludeTag(tag)}
                          className={`${styles.tagActionBtn} ${
                            isIncluded ? styles.tagIncludeActive : ''
                          }`}
                        >
                          Include
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBlockTag(tag)}
                          className={`${styles.tagActionBtn} ${
                            isBlocked ? styles.tagBlockActive : ''
                          }`}
                        >
                          Block
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setIsTagsModalOpen(false)}
                className={styles.cancelModalBtn}
              >
                Cancel
              </button>
              <button type="button" onClick={handleApplyTags} className={styles.applyModalBtn}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         STUDIOS FILTER MODAL
         ========================================================================== */}
      {isBrandsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBrandsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalTitleRow}>
                  <Building2 size={22} className={styles.modalIcon} />
                  <h2 className={styles.modalTitle}>Studios</h2>
                </div>
                <p className={styles.modalSubtext}>Select studios and production houses</p>
              </div>

              <div className={styles.modalHeaderActions}>
                <button type="button" onClick={handleResetBrandsModal} className={styles.modalResetBtn}>
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBrandsModalOpen(false)}
                  className={styles.modalCloseBtn}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Filter Sub-header */}
            <div className={styles.modalFilterBar}>
              <span className={styles.selectedPill}>{tempSelectedBrands.length} selected</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className={styles.searchBox}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Filter studios..."
                    value={brandSearchQuery}
                    onChange={(e) => setBrandSearchQuery(e.target.value)}
                    className={styles.modalSearchInput}
                  />
                </div>

                <div className={styles.sortToggleGroup}>
                  <button
                    type="button"
                    onClick={() => setBrandSortMode('count')}
                    className={`${styles.sortToggleBtn} ${
                      brandSortMode === 'count' ? styles.activeSortToggle : ''
                    }`}
                  >
                    ↓ Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandSortMode('a_z')}
                    className={`${styles.sortToggleBtn} ${
                      brandSortMode === 'a_z' ? styles.activeSortToggle : ''
                    }`}
                  >
                    ↑ A-Z
                  </button>
                </div>
              </div>
            </div>

            {/* Brands Cards Grid */}
            <div className={styles.modalBody}>
              <div className={styles.brandsGrid}>
                {filteredModalBrands.map((brand) => {
                  const isSelected = tempSelectedBrands.includes(brand);
                  const count = brandCounts[brand] || 0;

                  return (
                    <div
                      key={brand}
                      onClick={() => handleToggleBrand(brand)}
                      className={`${styles.brandCard} ${
                        isSelected ? styles.brandCardActive : ''
                      }`}
                    >
                      <span>{brand}</span>
                      <span className={styles.brandCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setIsBrandsModalOpen(false)}
                className={styles.cancelModalBtn}
              >
                Cancel
              </button>
              <button type="button" onClick={handleApplyBrands} className={styles.applyModalBtn}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         YEARS FILTER MODAL
         ========================================================================== */}
      {isYearsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsYearsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalTitleRow}>
                  <Calendar size={22} className={styles.modalIcon} />
                  <h2 className={styles.modalTitle}>Release Year</h2>
                </div>
                <p className={styles.modalSubtext}>Select release years or decade eras</p>
              </div>

              <div className={styles.modalHeaderActions}>
                <button type="button" onClick={handleResetYearsModal} className={styles.modalResetBtn}>
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsYearsModalOpen(false)}
                  className={styles.modalCloseBtn}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Filter Sub-header */}
            <div className={styles.modalFilterBar}>
              <span className={styles.selectedPill}>{tempSelectedYears.length} selected</span>

              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter years..."
                  value={yearSearchQuery}
                  onChange={(e) => setYearSearchQuery(e.target.value)}
                  className={styles.modalSearchInput}
                />
              </div>
            </div>

            {/* Quick Era Presets */}
            <div className={styles.eraPresetsRow}>
              <button
                type="button"
                onClick={() => handleToggleYear('2020s')}
                className={`${styles.eraPresetBtn} ${
                  tempSelectedYears.includes('2020s') ? styles.eraPresetBtnActive : ''
                }`}
              >
                2020s (2020–2026)
              </button>
              <button
                type="button"
                onClick={() => handleToggleYear('2010s')}
                className={`${styles.eraPresetBtn} ${
                  tempSelectedYears.includes('2010s') ? styles.eraPresetBtnActive : ''
                }`}
              >
                2010s (2010–2019)
              </button>
              <button
                type="button"
                onClick={() => handleToggleYear('2000s')}
                className={`${styles.eraPresetBtn} ${
                  tempSelectedYears.includes('2000s') ? styles.eraPresetBtnActive : ''
                }`}
              >
                2000s (2000–2009)
              </button>
              <button
                type="button"
                onClick={() => handleToggleYear('1990s')}
                className={`${styles.eraPresetBtn} ${
                  tempSelectedYears.includes('1990s') ? styles.eraPresetBtnActive : ''
                }`}
              >
                1990s & Older
              </button>
            </div>

            {/* Years Cards Grid */}
            <div className={styles.modalBody}>
              <div className={styles.yearsGrid}>
                {filteredModalYears.map((yearNum) => {
                  const yearStr = String(yearNum);
                  const isSelected = tempSelectedYears.includes(yearStr);
                  const count = yearCounts[yearStr] || 0;

                  return (
                    <div
                      key={yearStr}
                      onClick={() => handleToggleYear(yearStr)}
                      className={`${styles.yearCard} ${
                        isSelected ? styles.yearCardActive : ''
                      }`}
                    >
                      <span className={styles.yearNumber}>{yearNum}</span>
                      <span className={styles.yearCount}>{count} videos</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setIsYearsModalOpen(false)}
                className={styles.cancelModalBtn}
              >
                Cancel
              </button>
              <button type="button" onClick={handleApplyYears} className={styles.applyModalBtn}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrowseHub(props: BrowseHubProps) {
  return (
    <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading Library...</div>}>
      <BrowseHubContent {...props} />
    </React.Suspense>
  );
}
