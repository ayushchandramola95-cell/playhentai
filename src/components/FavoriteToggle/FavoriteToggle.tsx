'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './FavoriteToggle.module.css';

interface FavoriteToggleProps {
  seriesId: string;
  variant?: 'default' | 'hero' | 'compact' | 'player';
  showLabel?: boolean;
}

export default function FavoriteToggle({
  seriesId,
  variant = 'default',
  showLabel = true,
}: FavoriteToggleProps) {
  const { user, loading: authLoading } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Sync state helper
  const readLocalFavs = useCallback((): string[] => {
    try {
      if (typeof window === 'undefined') return [];
      return JSON.parse(localStorage.getItem('user_favorites') || '[]');
    } catch {
      return [];
    }
  }, []);

  const writeLocalFavs = useCallback((favs: string[]) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_favorites', JSON.stringify(favs));
        window.dispatchEvent(
          new CustomEvent('playhentai_favorites_changed', {
            detail: { seriesId, favs },
          })
        );
      }
    } catch {
      // ignore
    }
  }, [seriesId]);

  // Initial check & cloud sync
  useEffect(() => {
    // 1. Instant check from localStorage
    const favs = readLocalFavs();
    setIsFavorite(favs.includes(seriesId));

    // 2. If logged in, verify against cloud
    if (!authLoading && user && seriesId) {
      let isMounted = true;
      fetch(`/api/favorites?series_id=${encodeURIComponent(seriesId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data && typeof data.isFavorite === 'boolean') {
            setIsFavorite(data.isFavorite);
            // Sync local storage cache
            const current = readLocalFavs();
            if (data.isFavorite && !current.includes(seriesId)) {
              writeLocalFavs([...current, seriesId]);
            } else if (!data.isFavorite && current.includes(seriesId)) {
              writeLocalFavs(current.filter((id) => id !== seriesId));
            }
          }
        })
        .catch(() => {
          // silently keep local state
        });

      return () => {
        isMounted = false;
      };
    }
  }, [seriesId, user, authLoading, readLocalFavs, writeLocalFavs]);

  // Listen to cross-component sync events
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail?.favs && Array.isArray(e.detail.favs)) {
        setIsFavorite(e.detail.favs.includes(seriesId));
      } else {
        const favs = readLocalFavs();
        setIsFavorite(favs.includes(seriesId));
      }
    };

    window.addEventListener('playhentai_favorites_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('playhentai_favorites_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [seriesId, readLocalFavs]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isFavorite;
    setIsFavorite(nextState);

    // Update local storage & broadcast event
    const favs = readLocalFavs();
    const updated = nextState
      ? Array.from(new Set([...favs, seriesId]))
      : favs.filter((id) => id !== seriesId);
    writeLocalFavs(updated);

    // If authenticated, persist to Supabase Auth metadata
    if (user) {
      setToggling(true);
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_id: seriesId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.isFavorite === 'boolean') {
            setIsFavorite(data.isFavorite);
          }
        }
      } catch (err) {
        console.error('Error toggling favorite on server:', err);
      } finally {
        setToggling(false);
      }
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'hero':
        return styles.heroVariant;
      case 'compact':
        return styles.compactVariant;
      case 'player':
        return styles.playerVariant;
      default:
        return '';
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`${styles.favoriteBtn} ${getVariantClass()} ${isFavorite ? styles.active : ''}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'In your Favorites' : 'Add to Favorites'}
      type="button"
    >
      <Heart
        size={variant === 'compact' ? 14 : 16}
        className={`${styles.heartIcon} ${isFavorite ? styles.heartPop : ''}`}
        fill={isFavorite ? '#f43f5e' : 'none'}
        color={isFavorite ? '#f43f5e' : 'currentColor'}
      />
      {showLabel && <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>}
    </button>
  );
}
