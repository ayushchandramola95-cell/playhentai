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
  Filter,
  Grid,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { GENRES, STUDIOS } from '@/utils/constants';
import SeriesCard from '../SeriesCard/SeriesCard';
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
}

function BrowseHubContent({ initialSeries, isDbEmpty, initialGenre }: BrowseHubProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogRef = useRef<HTMLDivElement>(null);

  // Active Main Filters
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [blockedTags, setBlockedTags] = useState<string[]>([]);
  const [isBroadMatches, setIsBroadMatches] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<string>('recent'); // Default: Recent Upload
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 24;

  // Modal Open States
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isBrandsModalOpen, setIsBrandsModalOpen] = useState(false);

  // Draft States for Modals (so Cancel / Apply work accurately)
  const [tempIncludedTags, setTempIncludedTags] = useState<string[]>([]);
  const [tempBlockedTags, setTempBlockedTags] = useState<string[]>([]);
  const [tempBroadMatches, setTempBroadMatches] = useState(false);
  const [tempSelectedBrands, setTempSelectedBrands] = useState<string[]>([]);

  // Search inside Modals
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [brandSortMode, setBrandSortMode] = useState<'count' | 'a_z'>('count');

  // Compute Tag & Brand Counts across initialSeries
  const { tagCounts, brandCounts, allTags, allBrands } = useMemo(() => {
    const tCounts: Record<string, number> = {};
    const bCounts: Record<string, number> = {};

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
    });

    // Ensure default GENRES & STUDIOS exist in counts
    GENRES.forEach((g) => {
      if (tCounts[g] === undefined) tCounts[g] = 0;
    });
    STUDIOS.forEach((s) => {
      if (bCounts[s] === undefined) bCounts[s] = 0;
    });

    const tagsList = Object.keys(tCounts).sort((a, b) => a.localeCompare(b));
    const brandsList = Object.keys(bCounts);

    return { tagCounts: tCounts, brandCounts: bCounts, allTags: tagsList, allBrands: brandsList };
  }, [initialSeries]);

  // Sync Initial URL Search Parameters
  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const studioParam = searchParams.get('studio');
    const sortParam = searchParams.get('sort');
    const pageParam = searchParams.get('page');

    if (sortParam) setSortMode(sortParam);
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

  // Clear All Main Filters
  const handleClearAllFilters = () => {
    setIncludedTags([]);
    setBlockedTags([]);
    setIsBroadMatches(false);
    setSelectedBrands([]);
    setSearchQuery('');
    setSortMode('recent');
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

      return true;
    });

    // Sort Results
    const sorted = [...list];
    if (sortMode === 'recent') {
      sorted.sort((a, b) => {
        const dateA = new Date((a as any).release_date || (a as any).created_at || a.releaseYear || 0).getTime();
        const dateB = new Date((b as any).release_date || (b as any).created_at || b.releaseYear || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortMode === 'most_viewed') {
      sorted.sort((a, b) => ((b.views || (b as any).views_count) || 0) - ((a.views || (a as any).views_count) || 0));
    } else if (sortMode === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'a_z') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortMode === 'z_a') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }

    return sorted;
  }, [initialSeries, searchQuery, includedTags, blockedTags, selectedBrands, sortMode]);

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

  // JSON-LD Schema
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Browse Hentai Anime Categories & Series on PlayHentai',
    url: `${SITE_URL}/categories`,
    itemListElement: currentSeries.map((s, i) => ({
      '@type': 'ListItem',
      position: startIndex + i + 1,
      name: s.title,
      url: `${SITE_URL}/series/${s.slug}`,
    })),
  };

  const hasActiveFilters =
    includedTags.length > 0 || blockedTags.length > 0 || selectedBrands.length > 0 || searchQuery !== '';

  return (
    <div className={styles.hubContainer}>
      <JsonLd data={itemListJsonLd} />

      {/* Top Filter Action Bar */}
      <div className={styles.filterActionBar}>
        <div className={styles.leftControls}>
          {/* Tags Trigger Button */}
          <button
            type="button"
            onClick={openTagsModal}
            className={`${styles.actionTriggerBtn} ${
              includedTags.length > 0 || blockedTags.length > 0 ? styles.activeTriggerBtn : ''
            }`}
          >
            <Tag size={18} />
            <span>Tags</span>
            {includedTags.length + blockedTags.length > 0 && (
              <span className={styles.btnBadge}>{includedTags.length + blockedTags.length}</span>
            )}
          </button>

          {/* Brands Trigger Button */}
          <button
            type="button"
            onClick={openBrandsModal}
            className={`${styles.actionTriggerBtn} ${
              selectedBrands.length > 0 ? styles.activeTriggerBtn : ''
            }`}
          >
            <Building2 size={18} />
            <span>Brands</span>
            {selectedBrands.length > 0 && (
              <span className={styles.btnBadge}>{selectedBrands.length}</span>
            )}
          </button>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button type="button" onClick={handleClearAllFilters} className={styles.resetBtn}>
              <RotateCcw size={15} />
              <span>Reset All</span>
            </button>
          )}
        </div>

        <div className={styles.rightControls}>
          {/* Real-time Search Box */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearch}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortMode}
            onChange={(e) => {
              setSortMode(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.sortSelect}
          >
            <option value="recent">≡ Recent Upload</option>
            <option value="most_viewed">🔥 Most Viewed</option>
            <option value="rating">⭐ Highest Rated</option>
            <option value="a_z">🔤 Name: A-Z</option>
            <option value="z_a">🔤 Name: Z-A</option>
          </select>
        </div>
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
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Ad Banner Zone */}
      <AdBanner zoneId="5986838" />

      {/* Catalog Results Grid Section */}
      <section className={styles.catalogSection} ref={catalogRef}>
        {currentSeries.length > 0 ? (
          <>
            <div className={styles.seriesGrid}>
              {currentSeries.map((item) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={validPage <= 1}
                  className={`${styles.pageBtn} ${validPage <= 1 ? styles.pageBtnDisabled : ''}`}
                >
                  |&lt;
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(validPage - 1)}
                  disabled={validPage <= 1}
                  className={`${styles.pageBtn} ${validPage <= 1 ? styles.pageBtnDisabled : ''}`}
                >
                  &lt;
                </button>

                <span className={styles.pageBtn} style={{ cursor: 'default', background: 'transparent', border: 'none' }}>
                  Page {validPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(validPage + 1)}
                  disabled={validPage >= totalPages}
                  className={`${styles.pageBtn} ${validPage >= totalPages ? styles.pageBtnDisabled : ''}`}
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={validPage >= totalPages}
                  className={`${styles.pageBtn} ${validPage >= totalPages ? styles.pageBtnDisabled : ''}`}
                >
                  &gt;|
                </button>
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
                  <Tag size={22} className={styles.modalIcon} />
                  <h2 className={styles.modalTitle}>Tags</h2>
                </div>
                <p className={styles.modalSubtext}>Include or block tags to refine results</p>
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
                  <span className={styles.broadSub}>Must match all selected tags</span>
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
                <h3 className={styles.sectionTitle}>Tag Decisions</h3>
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
                    placeholder="Filter tags..."
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
         BRANDS FILTER MODAL (Hanime Replica)
         ========================================================================== */}
      {isBrandsModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBrandsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalTitleRow}>
                  <Building2 size={22} className={styles.modalIcon} />
                  <h2 className={styles.modalTitle}>Brands</h2>
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
                    placeholder="Filter brands..."
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
