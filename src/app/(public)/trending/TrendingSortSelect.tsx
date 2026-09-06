'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ArrowUpDown } from 'lucide-react';
import styles from './trending.module.css';

interface TrendingSortSelectProps {
  currentSort: string;
  currentGenre: string;
  currentTimeframe: string;
}

export default function TrendingSortSelect({
  currentSort,
  currentGenre,
  currentTimeframe,
}: TrendingSortSelectProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    router.push(`/trending?timeframe=${currentTimeframe}&sort=${newSort}&genre=${currentGenre}`);
  };

  return (
    <div className={styles.genreDropdownWrapper}>
      <ArrowUpDown size={14} className={styles.genreIcon} />
      <select
        value={currentSort}
        onChange={handleChange}
        className={styles.genreSelect}
        aria-label="Sort by metric"
      >
        <option value="views">Most Viewed</option>
        <option value="rating">Top Rated</option>
        <option value="newest">Newest Releases</option>
      </select>
      <ChevronDown size={14} className={styles.selectArrow} />
    </div>
  );
}
