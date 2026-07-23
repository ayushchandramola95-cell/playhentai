'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Dices, Play, RefreshCw, Flame, Zap, Heart, Compass, Star, ArrowRight } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './random.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  tags?: string[];
  category?: string;
}

interface RandomizerPortalProps {
  seriesList: SeriesItem[];
}

const GENRE_FILTERS = [
  { id: 'all', label: '🎲 All Categories', icon: Dices },
  { id: 'uncensored', label: '🔥 Uncensored', icon: Flame },
  { id: 'action', label: '⚡ Action & Martial Arts', icon: Zap },
  { id: 'fantasy', label: '✨ Fantasy & Magic', icon: Sparkles },
  { id: 'harem', label: '💖 Harem & Romance', icon: Heart },
  { id: 'scifi', label: '🌌 Sci-Fi & Cyberpunk', icon: Compass },
];

export default function RandomizerPortal({ seriesList }: RandomizerPortalProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  const [slotImageIndex, setSlotImageIndex] = useState<number>(0);
  const [winner, setWinner] = useState<SeriesItem | null>(null);

  // Filter pool based on selected genre chip
  const filteredPool = useMemo(() => {
    if (selectedGenre === 'all') return seriesList;
    return seriesList.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase());
      const desc = (item.description || '').toLowerCase();

      if (selectedGenre === 'uncensored') return tags.includes('uncensored') || desc.includes('uncensored');
      if (selectedGenre === 'action') return cat === 'action' || tags.includes('action');
      if (selectedGenre === 'fantasy') return cat === 'fantasy' || tags.includes('fantasy') || tags.includes('magic');
      if (selectedGenre === 'harem') return cat === 'harem' || tags.includes('harem') || tags.includes('romance') || cat === 'romance';
      if (selectedGenre === 'scifi') return cat === 'sci-fi' || tags.includes('sci-fi') || tags.includes('cyberpunk');
      return true;
    });
  }, [seriesList, selectedGenre]);

  // Roll the slot machine & pick winner
  const handleRoll = useCallback(() => {
    if (filteredPool.length === 0) return;
    setIsSpinning(true);
    setWinner(null);

    let count = 0;
    const interval = setInterval(() => {
      setSlotImageIndex((prev) => (prev + 1) % seriesList.length);
      count++;
      if (count >= 14) {
        clearInterval(interval);
        // Pick winner from filtered pool
        const randomIndex = Math.floor(Math.random() * filteredPool.length);
        const pickedWinner = filteredPool[randomIndex] || filteredPool[0];
        setWinner(pickedWinner);
        setIsSpinning(false);
      }
    }, 90);
  }, [filteredPool, seriesList]);

  // Initial spin on mount or when genre changes
  useEffect(() => {
    handleRoll();
  }, [selectedGenre]);

  const currentReelPoster = seriesList[slotImageIndex]?.poster_image_key || seriesList[0]?.poster_image_key;

  return (
    <div className={styles.container}>
      {/* Pulsing Background Glows */}
      <div className={styles.backgroundGlows}>
        <div className={`${styles.glowCircle} ${styles.glowPurple}`} />
        <div className={`${styles.glowCircle} ${styles.glowCyan}`} />
      </div>

      <div className={styles.portalContent}>
        {/* Header Section */}
        <div className={styles.portalHeader}>
          <h1>Surprise Me Randomizer</h1>
          <p className={styles.portalSubtext}>
            Can't decide what to watch next? Filter by vibe or spin the wheel for instant recommendations.
          </p>

          {/* Genre Filter Chips */}
          <div className={styles.filterChipsRow}>
            {GENRE_FILTERS.map((chip) => {
              const isActive = selectedGenre === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedGenre(chip.id)}
                  className={`${styles.chipBtn} ${isActive ? styles.activeChip : ''}`}
                >
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reel Box or Winner Card */}
        {isSpinning || !winner ? (
          <div className={styles.slotMachineBox}>
            <div className={styles.spinningReel}>
              {currentReelPoster && (
                <Image
                  src={getR2Url(currentReelPoster, 'poster')}
                  alt="Spinning series"
                  fill
                  sizes="220px"
                  className={styles.slotImage}
                />
              )}
              <div className={styles.slotOverlay}>
                <RefreshCw size={44} className={styles.spinningRingIcon} />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.winnerShowcaseCard}>
            {/* Winner Poster */}
            <div className={styles.winnerPosterWrapper}>
              <Image
                src={getR2Url(winner.poster_image_key, 'poster')}
                alt={winner.title}
                fill
                sizes="160px"
                className={styles.winnerPoster}
              />
            </div>

            {/* Winner Details */}
            <div className={styles.winnerDetails}>
              <div>
                <div className={styles.winnerBadgeRow}>
                  <span className={styles.winnerTag}>
                    <Star size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} fill="currentColor" />
                    Random Choice
                  </span>
                  {winner.category && <span className={styles.winnerCategory}>{winner.category}</span>}
                </div>

                <h2 className={styles.winnerTitle}>{winner.title}</h2>
                <p className={styles.winnerSynopsis}>{winner.description}</p>
              </div>

              {/* Action Row */}
              <div className={styles.actionRow}>
                <Link href={`/series/${winner.slug}`} className={styles.watchBtn}>
                  <Play size={18} fill="currentColor" />
                  <span>Watch Series Now</span>
                </Link>

                <button type="button" onClick={handleRoll} className={styles.rerollBtn}>
                  <Dices size={18} />
                  <span>Spin Again</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
