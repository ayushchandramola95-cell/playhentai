'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Trash2,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Sparkles,
  Flame,
  Layers,
  Box,
  AlertTriangle,
  FolderHeart,
  SearchX,
  Film,
  Play,
  Star,
  Eye,
  Lock,
  Calendar,
  Building2,
  ShieldCheck
} from 'lucide-react';
import SeriesCard, { SeriesItem } from '@/components/SeriesCard/SeriesCard';
import { getR2Url } from '@/utils/r2';
import styles from '@/app/(public)/favorites/favorites.module.css';

interface FavoriteItem {
  id: string;
  series_id: string;
  created_at?: string;
  series: SeriesItem & { added_at?: string };
}

interface FavoritesClientProps {
  initialFavorites?: FavoriteItem[];
  user?: any;
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

export default function FavoritesClient({ initialFavorites = [], user: initialUser }: FavoritesClientProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(initialFavorites);
  const [user, setUser] = useState<any>(initialUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'rating' | 'views' | 'name_asc' | 'name_desc'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Helper to read local favorites
  const getLocalFavIds = useCallback((): string[] => {
    try {
      if (typeof window === 'undefined') return [];
      return JSON.parse(localStorage.getItem('user_favorites') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Sync / Load favorites on client mount
  const loadFavorites = useCallback(async () => {
    try {
      const localIds = getLocalFavIds();

      if (user) {
        // If user is logged in, sync any local favorites to server
        if (localIds.length > 0) {
          try {
            await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ series_ids: localIds }),
            });
            localStorage.removeItem('user_favorites');
          } catch {
            // ignore
          }
        }

        const res = await fetch('/api/favorites');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.favorites)) {
            setFavorites(data.favorites);
          }
        }
      } else {
        // Guest user: fetch details for local IDs
        if (localIds.length === 0) {
          setFavorites([]);
        } else {
          const res = await fetch(`/api/favorites?ids=${encodeURIComponent(localIds.join(','))}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.favorites)) {
              setFavorites(data.favorites);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing favorites:', err);
    }
  }, [user, getLocalFavIds]);

  // Listen to cross-component sync
  useEffect(() => {
    const handleSync = () => {
      loadFavorites();
    };
    window.addEventListener('playhentai_favorites_changed', handleSync);
    return () => {
      window.removeEventListener('playhentai_favorites_changed', handleSync);
    };
  }, [loadFavorites]);

  // Extract top available tags/genres from the current favorites
  const availableTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    favorites.forEach((item) => {
      const s = item.series;
      if (s?.tags && Array.isArray(s.tags)) {
        s.tags.forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) {
            tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return sorted;
  }, [favorites]);

  // Filter & Sort Logic
  const filteredFavorites = useMemo(() => {
    let list = [...favorites];

    // Filter by tag
    if (selectedTag !== 'all') {
      list = list.filter((item) => {
        const tags = item.series?.tags || [];
        return tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      });
    }

    // Filter by live search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const s = item.series;
        if (!s) return false;
        const titleMatch = (s.title || '').toLowerCase().includes(q);
        const descMatch = (s.description || '').toLowerCase().includes(q);
        const tagMatch = (s.tags || []).some((t) => t.toLowerCase().includes(q));
        const studioMatch = (s.studio || '').toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || studioMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      const sA = a.series || {};
      const sB = b.series || {};

      if (sortMode === 'recent') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      if (sortMode === 'rating') {
        const rA = Number(sA.rating) || 0;
        const rB = Number(sB.rating) || 0;
        if (rB !== rA) return rB - rA;
        return (Number(sB.views) || 0) - (Number(sA.views) || 0);
      }
      if (sortMode === 'views') {
        return (Number(sB.views) || 0) - (Number(sA.views) || 0);
      }
      if (sortMode === 'name_asc') {
        return (sA.title || '').localeCompare(sB.title || '');
      }
      if (sortMode === 'name_desc') {
        return (sB.title || '').localeCompare(sA.title || '');
      }
      return 0;
    });

    return list;
  }, [favorites, searchQuery, selectedTag, sortMode]);

  // Remove single favorite
  const handleRemove = async (seriesId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setRemovingId(seriesId);
    try {
      // 1. Update localStorage
      const localIds = getLocalFavIds().filter((id) => id !== seriesId);
      localStorage.setItem('user_favorites', JSON.stringify(localIds));

      // 2. Dispatch event
      window.dispatchEvent(
        new CustomEvent('playhentai_favorites_changed', {
          detail: { seriesId, favs: localIds },
        })
      );

      // 3. Update state
      setFavorites((prev) =>
        prev.filter((item) => (item.series?.id || item.series_id || item.id) !== seriesId)
      );

      // 4. Update server if authenticated
      if (user) {
        await fetch(`/api/favorites?series_id=${encodeURIComponent(seriesId)}`, {
          method: 'DELETE',
        });
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Clear entire favorites list
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      // 1. Clear local storage
      localStorage.removeItem('user_favorites');

      // 2. Clear server
      if (user) {
        await fetch('/api/favorites?all=true', {
          method: 'DELETE',
        });
      }

      // 3. Dispatch event
      window.dispatchEvent(
        new CustomEvent('playhentai_favorites_changed', {
          detail: { seriesId: null, favs: [] },
        })
      );

      setFavorites([]);
      setShowClearModal(false);
    } catch (err) {
      console.error('Error clearing favorites:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Favorites</span>
      </nav>

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.highlightPill}>
            <Heart size={13} fill="#ec4899" /> MY FAVORITES COLLECTION
          </span>
          <span className={styles.totalPill}>
            <Film size={13} /> {favorites.length} {favorites.length === 1 ? 'Series' : 'Series'} Favorited
          </span>
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleIconBadge}>
            <Heart size={24} fill="#ec4899" color="#ec4899" />
          </div>
          <h1 className={styles.mainTitle}>My Favorite Anime</h1>
        </div>

        <p className={styles.subtext}>
          Your handpicked anime collection. Quick access to your favorite shows, explore high-rated series, and sync your library effortlessly.
        </p>

        {!user && favorites.length > 0 && (
          <div className={styles.guestNotice}>
            <Lock size={15} className={styles.guestLockIcon} />
            <span>
              Favorites are saved locally on this browser.{' '}
              <Link href="/login" className={styles.loginInlineLink}>
                Sign in or Register
              </Link>{' '}
              to sync your library securely across all your devices.
            </span>
          </div>
        )}
      </div>

      {favorites.length > 0 && (
        <div className={styles.controlsSection}>
          <div className={styles.searchSortRow}>
            {/* Live Search Input */}
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search ${favorites.length} favorite ${favorites.length === 1 ? 'series' : 'series'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
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

            {/* Controls Group */}
            <div className={styles.filterActionsGroup}>
              {/* Sort Select */}
              <div className={styles.sortWrapper}>
                <ArrowUpDown size={13} className={styles.sortIcon} />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className={styles.sortSelect}
                  aria-label="Sort favorites"
                >
                  <option value="recent">📅 Recently Added</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="views">👁️ Most Viewed</option>
                  <option value="name_asc">🔤 Title: A-Z</option>
                  <option value="name_desc">🔤 Title: Z-A</option>
                </select>
                <ChevronDown size={13} className={styles.sortArrow} />
              </div>

              {/* View Mode Toggle */}
              <div className={styles.viewModeToggle} role="group" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                  title="List View"
                  aria-label="List View"
                >
                  <ListFilter size={15} />
                </button>
              </div>

              {/* Clear All Button */}
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className={styles.clearAllBtn}
                title="Clear all favorites"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Quick Tag Pills */}
          {availableTags.length > 0 && (
            <div className={styles.tagsFilterRow}>
              <span className={styles.tagsFilterLabel}>Filter by:</span>
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`${styles.tagFilterChip} ${selectedTag === 'all' ? styles.tagFilterActive : ''}`}
              >
                All ({favorites.length})
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag.name ? 'all' : tag.name)}
                  className={`${styles.tagFilterChip} ${selectedTag === tag.name ? styles.tagFilterActive : ''}`}
                >
                  {tag.name} <span className={styles.tagCount}>({tag.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalog Display Section */}
      <section className={styles.catalogSection}>
        {favorites.length > 0 ? (
          filteredFavorites.length > 0 ? (
            viewMode === 'grid' ? (
              /* Grid View (6-column responsive card grid) */
              <div className={styles.seriesGrid}>
                {filteredFavorites.map((item) => {
                  const series = item.series;
                  if (!series || !series.slug) return null;

                  return (
                    <div key={item.id || series.id} className={styles.cardContainer}>
                      <SeriesCard item={series} />
                      <button
                        type="button"
                        onClick={(e) => handleRemove(series.id, e)}
                        disabled={removingId === series.id}
                        className={styles.removeBtn}
                        title="Remove from favorites"
                        aria-label={`Remove ${series.title} from favorites`}
                      >
                        <Trash2 size={13} />
                        <span>{removingId === series.id ? 'Removing...' : 'Remove'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View (Detailed horizontal cards) */
              <div className={styles.seriesList}>
                {filteredFavorites.map((item) => {
                  const series = item.series;
                  if (!series || !series.slug) return null;
                  const posterUrl = series.poster_image_key
                    ? getR2Url(series.poster_image_key, 'poster')
                    : '/placeholder-poster.webp';

                  const ratingVal = typeof series.rating === 'number' && series.rating > 0
                    ? series.rating
                    : (series.rating && !isNaN(Number(series.rating)) && Number(series.rating) > 0 ? Number(series.rating) : null);
                  const releaseYear = series.release_year || series.releaseYear || 2026;
                  const studioName = series.studio || (series as any).studios?.name || '';

                  return (
                    <div key={item.id || series.id} className={styles.listItem}>
                      {/* Left Poster */}
                      <Link href={`/series/${series.slug}`} className={styles.listPosterWrap}>
                        <Image
                          src={posterUrl}
                          alt={series.title || 'Series poster'}
                          fill
                          sizes="(max-width: 640px) 100px, 130px"
                          className={styles.listPosterImg}
                          unoptimized
                        />
                        <div className={styles.listPlayOverlay}>
                          <Play size={24} fill="#ffffff" color="#ffffff" />
                        </div>
                      </Link>

                      {/* Right Details */}
                      <div className={styles.listContent}>
                        <div className={styles.listHeaderRow}>
                          <div className={styles.listTitleGroup}>
                            <h3 className={styles.listTitle}>
                              <Link href={`/series/${series.slug}`}>{series.title}</Link>
                            </h3>
                            <div className={styles.listMetaRow}>
                              {ratingVal && (
                                <span className={styles.listRatingBadge}>
                                  <Star size={12} fill="#f59e0b" color="#f59e0b" /> {ratingVal.toFixed(1)}
                                </span>
                              )}
                              <span className={styles.listMetaPill}>
                                <Calendar size={12} /> {releaseYear}
                              </span>
                              {studioName && (
                                <span className={styles.listMetaPill}>
                                  <Building2 size={12} /> {studioName}
                                </span>
                              )}
                              {series.views !== undefined && (
                                <span className={styles.listMetaPill}>
                                  <Eye size={12} /> {formatViews(series.views)} views
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className={styles.listActions}>
                            <Link href={`/series/${series.slug}`} className={styles.listWatchBtn}>
                              <Play size={13} fill="currentColor" /> Watch
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemove(series.id)}
                              disabled={removingId === series.id}
                              className={styles.listRemoveBtn}
                              title="Remove from favorites"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Description Snippet */}
                        {series.description && (
                          <p className={styles.listDescription}>
                            {series.description}
                          </p>
                        )}

                        {/* Tag Pills */}
                        {series.tags && series.tags.length > 0 && (
                          <div className={styles.listTagsRow}>
                            {series.tags.map((tag: string, idx: number) => (
                              <span key={idx} className={styles.listTagPill}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Empty Filter Search */
            <div className={styles.emptySearchCard}>
              <SearchX size={44} className={styles.emptyIcon} />
              <h3>No matching favorites found</h3>
              <p>
                No saved anime matched &quot;{searchQuery}&quot;{selectedTag !== 'all' ? ` in ${selectedTag}` : ''}. Try adjusting your filter or search query.
              </p>
              <div className={styles.emptySearchActions}>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.resetBtn}
                  >
                    Clear Search Query
                  </button>
                )}
                {selectedTag !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag('all')}
                    className={styles.resetBtnSecondary}
                  >
                    Reset Genre Filter
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          /* Empty Favorites List */
          <div className={styles.emptyFavoritesCard}>
            <div className={styles.emptyIconBadge}>
              <FolderHeart size={46} className={styles.emptyHeartIcon} />
            </div>
            <h3>Your Favorites List is Empty</h3>
            <p>
              You haven&apos;t added any anime series to your favorites yet. Explore our extensive catalog and click the &quot;Favorite&quot; heart button on any show or watch page to save it here!
            </p>

            <div className={styles.quickExploreGrid}>
              <Link href="/trending" className={styles.explorePill}>
                <Flame size={15} color="#f97316" />
                <span>Explore Trending</span>
              </Link>
              <Link href="/genres" className={styles.explorePill}>
                <Layers size={15} color="#ec4899" />
                <span>Browse Genres</span>
              </Link>
              <Link href="/3d" className={styles.explorePill}>
                <Box size={15} color="#06b6d4" />
                <span>3D CGI Animations</span>
              </Link>
              <Link href="/uncensored" className={styles.explorePill}>
                <Sparkles size={15} color="#a855f7" />
                <span>Uncensored Series</span>
              </Link>
            </div>

            <Link href="/categories" className={styles.primaryBtn} style={{ marginTop: '1.5rem' }}>
              Browse Catalog
            </Link>
          </div>
        )}
      </section>

      {/* Confirmation Modal for Clear All */}
      {showClearModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowClearModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrap}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3>Clear All Favorites?</h3>
            <p>
              This will remove all <strong>{favorites.length} series</strong> from your favorites collection. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className={styles.modalCancelBtn}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className={styles.modalConfirmBtn}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
