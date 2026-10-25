'use client';

import React, { useState } from 'react';
import { Shuffle } from 'lucide-react';
import SeriesCard, { SeriesItem } from '@/components/SeriesCard/SeriesCard';
import HorizontalScrollRow from '@/components/HorizontalScrollRow/HorizontalScrollRow';
import styles from './RandomRowSection.module.css';

interface RandomRowSectionProps {
  seriesPool: SeriesItem[];
}

export default function RandomRowSection({ seriesPool }: RandomRowSectionProps) {
  const getCleanPool = (pool: SeriesItem[]) => {
    return (pool || []).filter(
      (s: any) => (s?.status || '').toLowerCase() !== 'upcoming' && !s?.is_upcoming
    );
  };

  const shuffleArray = (array: SeriesItem[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const [items, setItems] = useState<SeriesItem[]>(() => {
    const clean = getCleanPool(seriesPool);
    return clean.length > 0 ? clean.slice(0, 15) : [];
  });
  const [announcement, setAnnouncement] = useState('');

  const handleShuffle = () => {
    const clean = getCleanPool(seriesPool);
    if (clean.length > 0) {
      setItems(shuffleArray(clean).slice(0, 15));
      setAnnouncement(`Shuffled ${Math.min(15, clean.length)} random series`);
      setTimeout(() => setAnnouncement(''), 3000);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {announcement && (
        <span className={styles.srOnly} aria-live="polite">
          {announcement}
        </span>
      )}
      <HorizontalScrollRow
        title="Random"
        subtitle="FEELIN' LUCKY"
        viewAllHref="/random"
        viewAllText="ALL"
        headerAction={
          <button
            type="button"
            onClick={handleShuffle}
            className={styles.shuffleBtn}
            aria-label="Shuffle random series selection"
          >
            <Shuffle size={14} />
            <span>SHUFFLE</span>
          </button>
        }
      >
        {items.map((item) => (
          <SeriesCard key={item.id} item={item} />
        ))}
      </HorizontalScrollRow>
    </div>
  );
}
