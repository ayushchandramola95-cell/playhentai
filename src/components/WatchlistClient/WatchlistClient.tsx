'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, UserX, Compass, Star, Eye } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import styles from '@/app/(public)/watchlist/watchlist.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  category?: string;
  tags?: string[];
}

interface WatchlistClientProps {
  initialSeries: SeriesItem[];
  user: any;
}

export default function WatchlistClient({ initialSeries, user }: WatchlistClientProps) {
  const [watchlist, setWatchlist] = useState<SeriesItem[]>(initialSeries);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
        // Fallback POST toggle
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

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={`${styles.cardShell} glass`}>
          <UserX size={48} className={styles.iconMuted} />
          <h2>Access Restricted</h2>
          <p>Please sign in to save your favorite series, track releases, and compile your personalized watchlist.</p>
          <Link href="/login" className={styles.actionBtn}>Sign In / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Heart size={28} className={styles.headerIcon} fill="currentColor" />
          <h1>My Watchlist</h1>
        </div>
        <p className={styles.subtext}>
          Your saved series and bookmarked movies. Manage or remove items anytime.
        </p>
      </div>

      {/* Catalog Grid */}
      <section className={styles.catalogSection}>
        {watchlist.length > 0 ? (
          <div className={styles.seriesGrid}>
            {watchlist.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <SeriesCard item={item} />
                <button
                  type="button"
                  onClick={(e) => handleRemove(item.id, e)}
                  disabled={removingId === item.id}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 20,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    borderRadius: '20px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                  }}
                  title="Remove from Watchlist"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${styles.cardShell} glass`}>
            <Heart size={48} className={styles.iconMuted} />
            <h3>Your watchlist is empty</h3>
            <p>You haven't bookmarked any series yet. Visit the catalog home page to browse and save interesting shows.</p>
            <Link href="/" className={styles.actionBtn}>Browse Catalog</Link>
          </div>
        )}
      </section>
    </div>
  );
}
