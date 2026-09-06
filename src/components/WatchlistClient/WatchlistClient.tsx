'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Heart,
  Trash2,
  Lock,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  Sparkles,
  Flame,
  Layers,
  Box,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FolderHeart,
  SearchX,
  BookmarkCheck,
  Film
} from 'lucide-react';
import SeriesCard, { SeriesItem } from '@/components/SeriesCard/SeriesCard';
import styles from '@/app/(public)/watchlist/watchlist.module.css';

interface WatchlistSeriesItem extends SeriesItem {
  added_at?: string;
}

interface WatchlistClientProps {
  initialSeries: WatchlistSeriesItem[];
  user: any;
}

export default function WatchlistClient({ initialSeries, user }: WatchlistClientProps) {
  const [watchlist, setWatchlist] = useState<WatchlistSeriesItem[]>(initialSeries);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'rating' | 'views' | 'name_asc'>('recent');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Filter & Sort Logic
  const filteredList = useMemo(() => {
    let list = [...watchlist];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        const studioMatch = (item.studio || '').toLowerCase().includes(q);
        return titleMatch || descMatch || tagMatch || studioMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortMode === 'recent') {
        const dateA = a.added_at ? new Date(a.added_at).getTime() : 0;
        const dateB = b.added_at ? new Date(b.added_at).getTime() : 0;
        return dateB - dateA;
      }
      if (sortMode === 'rating') {
        const rA = Number(a.rating) || 0;
        const rB = Number(b.rating) || 0;
        if (rB !== rA) return rB - rA;
        return (Number(b.views) || 0) - (Number(a.views) || 0);
      }
      if (sortMode === 'views') {
        return (Number(b.views) || 0) - (Number(a.views) || 0);
      }
      if (sortMode === 'name_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [watchlist, searchQuery, sortMode]);

  // Remove single series
  const handleRemove = async (seriesId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setRemovingId(seriesId);
    try {
      const res = await fetch(`/api/watchlist?series_id=${seriesId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setWatchlist((prev) => prev.filter((item) => item.id !== seriesId));
      } else {
        // Fallback toggle POST
        const postRes = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_id: seriesId }),
        });
        if (postRes.ok) {
          setWatchlist((prev) => prev.filter((item) => item.id !== seriesId));
        }
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Clear entire watchlist
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/watchlist?all=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setWatchlist([]);
        setShowClearModal(false);
      }
    } catch (err) {
      console.error('Error clearing watchlist:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // 1. Guest / Unauthenticated State
  if (!user) {
    return (
      <div className={styles.container}>
        <div className="ambient-glow" />

        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Watchlist</span>
        </nav>

        {/* Guest Lock Card */}
        <div className={styles.guestCard}>
          <div className={styles.guestIconBadge}>
            <Lock size={32} className={styles.guestLockIcon} />
          </div>

          <h1 className={styles.guestTitle}>Sign In to Access Your Watchlist</h1>
          <p className={styles.guestDesc}>
            Create your personalized anime library. Bookmark shows, track episode progress, and sync your favorite series seamlessly across all your devices.
          </p>

          <div className={styles.guestFeatureGrid}>
            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <BookmarkCheck size={18} />
              </div>
              <div>
                <h4>Cloud Bookmarks</h4>
                <p>Save unlimited anime series and access them anywhere.</p>
              </div>
            </div>

            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <Sparkles size={18} />
              </div>
              <div>
                <h4>Episode Tracking</h4>
                <p>Keep track of watched episodes and new releases.</p>
              </div>
            </div>

            <div className={styles.guestFeature}>
              <div className={styles.featureIconWrap}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4>100% Free Account</h4>
                <p>Instant access with no ads or hidden charges.</p>
              </div>
            </div>
          </div>

          <div className={styles.guestActionsRow}>
            <Link href="/login" className={styles.primaryBtn}>
              Sign In / Register
            </Link>
            <Link href="/" className={styles.secondaryBtn}>
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated State
  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Watchlist</span>
      </nav>

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.highlightPill}>
            <BookmarkCheck size={13} /> MY SAVED LIBRARY
          </span>
          <span className={styles.totalPill}>
            <Film size={13} /> {watchlist.length} {watchlist.length === 1 ? 'Series' : 'Series'} Saved
          </span>
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleIconBadge}>
            <Heart size={24} fill="#ec4899" color="#ec4899" />
          </div>
          <h1 className={styles.mainTitle}>My Anime Watchlist</h1>
        </div>

        <p className={styles.subtext}>
          Your personal collection of saved anime series and bookmarked shows. Track your favorites, explore related genres, and manage your queue anytime.
        </p>
      </div>

      {watchlist.length > 0 && (
        <div className={styles.controlsSection}>
          <div className={styles.searchSortRow}>
            {/* Live Search Box */}
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search your ${watchlist.length} saved series...`}
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

            {/* Filter Actions & Sort Select */}
            <div className={styles.filterActionsGroup}>
              <div className={styles.sortWrapper}>
                <ArrowUpDown size={13} className={styles.sortIcon} />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className={styles.sortSelect}
                  aria-label="Sort watchlist"
                >
                  <option value="recent">📅 Recently Added</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="views">👁️ Most Viewed</option>
                  <option value="name_asc">🔤 Title: A-Z</option>
                </select>
                <ChevronDown size={13} className={styles.sortArrow} />
              </div>

              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className={styles.clearAllBtn}
                title="Clear entire watchlist"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Grid Section */}
      <section className={styles.catalogSection}>
        {watchlist.length > 0 ? (
          filteredList.length > 0 ? (
            <div className={styles.seriesGrid}>
              {filteredList.map((item) => (
                <div key={item.id} className={styles.cardContainer}>
                  <SeriesCard item={item} />
                  <button
                    type="button"
                    onClick={(e) => handleRemove(item.id, e)}
                    disabled={removingId === item.id}
                    className={styles.removeBtn}
                    title="Remove from Watchlist"
                    aria-label={`Remove ${item.title} from watchlist`}
                  >
                    <Trash2 size={13} />
                    <span>{removingId === item.id ? 'Removing...' : 'Remove'}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptySearchCard}>
              <SearchX size={44} className={styles.emptyIcon} />
              <h3>No matching series found</h3>
              <p>
                No saved anime matched &quot;{searchQuery}&quot;. Try adjusting your search query.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.resetBtn}
              >
                Clear Search
              </button>
            </div>
          )
        ) : (
          <div className={styles.emptyWatchlistCard}>
            <div className={styles.emptyIconBadge}>
              <FolderHeart size={46} className={styles.emptyHeartIcon} />
            </div>
            <h3>Your Watchlist is Empty</h3>
            <p>
              You haven&apos;t bookmarked any anime series yet. Explore our extensive catalog and click the &quot;Watchlist&quot; button on any show to save it here for later.
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

            <Link href="/" className={styles.primaryBtn} style={{ marginTop: '1.5rem' }}>
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
            <h3>Clear Entire Watchlist?</h3>
            <p>
              This will remove all <strong>{watchlist.length} series</strong> from your saved library. This action cannot be undone.
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
