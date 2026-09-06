'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Filter } from 'lucide-react';
import styles from './trending.module.css';

interface TrendingGenreSelectProps {
  currentGenre: string;
  currentSort: string;
  currentTimeframe: string;
  genres: string[];
}

export default function TrendingGenreSelect({
  currentGenre,
  currentSort,
  currentTimeframe,
  genres,
}: TrendingGenreSelectProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGenre = e.target.value;
    router.push(`/trending?timeframe=${currentTimeframe}&sort=${currentSort}&genre=${newGenre}`);
  };

  return (
    <div className={styles.genreDropdownWrapper}>
      <Filter size={14} className={styles.genreIcon} />
      <select
        value={currentGenre.toLowerCase()}
        onChange={handleChange}
        className={styles.genreSelect}
        aria-label="Filter by genre"
      >
        {genres.map((g) => (
          <option key={g} value={g}>
            {g === 'all' ? 'All Genres' : g.toUpperCase()}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className={styles.selectArrow} />
    </div>
  );
}
