'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './FavoriteToggle.module.css';

interface FavoriteToggleProps {
  seriesId: string;
}

export default function FavoriteToggle({ seriesId }: FavoriteToggleProps) {
  const { user, loading: authLoading } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    // Local storage sync as instant fallback
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      setIsFavorite(favs.includes(seriesId));
    } catch {
      // ignore JSON parse error
    }

    if (authLoading || !user) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/favorites?series_id=${seriesId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isFavorite !== undefined) {
            setIsFavorite(data.isFavorite);
          }
        }
      } catch {
        // Fallback silently
      }
    };

    checkStatus();
  }, [seriesId, user, authLoading]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle local state and localStorage for instant feedback
    let nextState = !isFavorite;
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('user_favorites') || '[]');
      if (nextState) {
        if (!favs.includes(seriesId)) favs.push(seriesId);
      } else {
        const idx = favs.indexOf(seriesId);
        if (idx > -1) favs.splice(idx, 1);
      }
      localStorage.setItem('user_favorites', JSON.stringify(favs));
    } catch {
      // ignore
    }
    setIsFavorite(nextState);

    if (user) {
      setToggling(true);
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_id: seriesId })
        });
      } catch (err) {
        console.error('Error toggling favorite:', err);
      } finally {
        setToggling(false);
      }
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      disabled={toggling}
      className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ''}`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      type="button"
    >
      <Heart 
        size={16} 
        fill={isFavorite ? "#f43f5e" : "none"} 
        color={isFavorite ? "#f43f5e" : "currentColor"} 
      />
      <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
    </button>
  );
}
