'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, Play, Lock, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getR2Url } from '@/utils/r2';
import styles from '@/app/(public)/favorites/favorites.module.css';

export default function FavoritesClient() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Helper to read local favorites
  const getLocalFavIds = useCallback((): string[] => {
    try {
      if (typeof window === 'undefined') return [];
      return JSON.parse(localStorage.getItem('user_favorites') || '[]');
    } catch {
      return [];
    }
  }, []);

  // Fetch favorites from API or fallback to localStorage
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Logged in user: sync any local favorites first, then fetch
        const localIds = getLocalFavIds();
        if (localIds.length > 0) {
          try {
            await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ series_ids: localIds }),
            });
            // Clear local merged IDs
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
        // Guest user: Fetch series by IDs from categories/browse
        const localIds = getLocalFavIds();
        if (localIds.length === 0) {
          setFavorites([]);
        } else {
          // Fetch from browse API
          const res = await fetch('/api/browse?limit=100');
          if (res.ok) {
            const data = await res.json();
            const seriesList = data.series || [];
            const matched = seriesList
              .filter((s: any) => localIds.includes(s.id))
              .map((s: any) => ({
                id: s.id,
                series_id: s.id,
                created_at: s.created_at,
                series: s,
              }));
            setFavorites(matched);
          }
        }
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getLocalFavIds]);

  useEffect(() => {
    if (!authLoading) {
      loadFavorites();
    }
  }, [user, authLoading, loadFavorites]);

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

  const handleRemove = async (seriesId: string) => {
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

      // 4. If logged in, update server
      if (user) {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_id: seriesId }),
        });
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <RefreshCw size={24} className={styles.spinIcon} />
          <span>Loading your favorite series...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      <Link href="/categories" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Browse
      </Link>

      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Heart size={32} className={styles.headerIcon} />
          <h1>My Favorites</h1>
        </div>
        <p className={styles.subtext}>
          Your personal collection of favorite anime series. Access them anytime across your devices.
        </p>

        {!user && favorites.length > 0 && (
          <div className={styles.guestNotice}>
            <Lock size={15} />
            <span>
              Favorites stored locally on this device.{' '}
              <Link href="/login" className={styles.loginInlineLink}>
                Sign in
              </Link>{' '}
              to sync across all your devices.
            </span>
          </div>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className={`${styles.emptyState} glass`}>
          <Sparkles size={40} className={styles.emptyIcon} />
          <h3>Your Favorites List is Empty</h3>
          <p>
            You haven't added any series to your favorites yet. Click the ❤️ Favorite button on any series or watch page to save it here!
          </p>
          <Link href="/categories" className={styles.actionBtn}>
            Browse All Series
          </Link>
        </div>
      ) : (
        <div className={styles.seriesGrid}>
          {favorites.map((item) => {
            const series = item.series || item;
            if (!series || !series.slug) return null;

            return (
              <div key={item.id || series.id} className={styles.seriesCard}>
                <div className={styles.posterWrapper}>
                  <Link href={`/series/${series.slug}`}>
                    {series.poster_image_key ? (
                      <Image
                        src={getR2Url(series.poster_image_key, 'poster')}
                        alt={series.title || 'Series poster'}
                        fill
                        sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 240px"
                        className={styles.posterImage}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.noPoster}>
                        <span>{series.title}</span>
                      </div>
                    )}
                  </Link>

                  <button
                    onClick={() => handleRemove(series.id)}
                    disabled={removingId === series.id}
                    className={styles.removeBtn}
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className={styles.badgeOverlay}>
                    {series.rating && (
                      <span className={styles.ratingBadge}>★ {series.rating}</span>
                    )}
                  </div>
                </div>

                <div className={styles.seriesMeta}>
                  <h3 className={styles.seriesTitle}>
                    <Link href={`/series/${series.slug}`}>{series.title}</Link>
                  </h3>

                  {series.tags && series.tags.length > 0 && (
                    <div className={styles.tagsRow}>
                      {series.tags.slice(0, 2).map((tag: string, idx: number) => (
                        <span key={idx} className={styles.tagPill}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link href={`/series/${series.slug}`} className={styles.watchNowLink}>
                    <Play size={13} fill="currentColor" /> Watch Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
