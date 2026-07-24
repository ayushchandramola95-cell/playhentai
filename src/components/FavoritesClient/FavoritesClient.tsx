'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, Play, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getR2Url } from '@/utils/r2';
import styles from '@/app/(public)/favorites/favorites.module.css';

export default function FavoritesClient() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const data = await res.json();
          if (data.favorites) {
            setFavorites(data.favorites);
          }
        }
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, authLoading]);

  const handleRemove = async (seriesId: string) => {
    setRemovingId(seriesId);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_id: seriesId })
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(item => item.series?.id !== seriesId && item.series_id !== seriesId));
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
        <div className={styles.loadingBox}>Loading your favorite series...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={`${styles.cardShell} glass`}>
          <Lock size={48} className={styles.iconMuted} />
          <h2>Access Restricted</h2>
          <p>Please sign in to view and manage your favorite series collection.</p>
          <Link href="/login" className={styles.actionBtn}>Sign In / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Catalog
      </Link>

      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Heart size={32} className={styles.headerIcon} />
          <h1>My Favorites</h1>
        </div>
        <p className={styles.subtext}>
          Your personal collection of top-rated favorite series. Access them anytime.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className={`${styles.emptyState} glass`}>
          <Sparkles size={40} className={styles.emptyIcon} />
          <h3>Your Favorites List is Empty</h3>
          <p>You haven't added any series to your favorites yet. Click the ❤️ icon on any series page to add it here!</p>
          <Link href="/categories" className={styles.actionBtn}>Browse All Series</Link>
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
                        <span key={idx} className={styles.tagPill}>{tag}</span>
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
