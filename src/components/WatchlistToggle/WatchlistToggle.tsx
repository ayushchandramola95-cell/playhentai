'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Check, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './WatchlistToggle.module.css';

interface WatchlistToggleProps {
  seriesId: string;
  variant?: 'default' | 'hero';
}

export default function WatchlistToggle({ seriesId, variant = 'default' }: WatchlistToggleProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/watchlist?series_id=${seriesId}`);
        if (res.ok) {
          const data = await res.json();
          setInWatchlist(data.inWatchlist);
        }
      } catch (err) {
        console.error('Error fetching watchlist status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [seriesId, user, authLoading]);

  const handleToggle = async () => {
    if (!user) {
      // Redirect to login if unauthenticated
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setToggling(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_id: seriesId })
      });
      if (res.ok) {
        const data = await res.json();
        setInWatchlist(data.inWatchlist);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
    } finally {
      setToggling(false);
    }
  };

  if (loading || authLoading) {
    return (
      <button className={styles.watchlistBtn} disabled>
        <div className={styles.loadingSpinner} />
        <span>Loading...</span>
      </button>
    );
  }

  return (
    <button 
      onClick={handleToggle} 
      disabled={toggling}
      className={`${styles.watchlistBtn} ${variant === 'hero' ? styles.heroVariant : ''} ${inWatchlist ? styles.active : ''}`}
      aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {toggling ? (
        <div className={styles.loadingSpinner} />
      ) : inWatchlist ? (
        <>
          <Check size={16} />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Plus size={16} />
          <span>Watchlist</span>
        </>
      )}
    </button>
  );
}
