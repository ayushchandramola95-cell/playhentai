'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import styles from '@/app/(public)/recent/recent.module.css';

interface RecentFilterBarProps {
  type: 'episodes' | 'series';
  genres?: string[];
}

const COMPREHENSIVE_GENRES = [
  'Action', 'Adventure', 'Ahegao', 'BDSM', 'Blowjob', 'Bondage', 'Comedy', 
  'Cosplay', 'Creampie', 'Cyberpunk', 'Demons', 'Drama', 'Ecchi', 'Fantasy', 
  'Femdom', 'Glasses', 'Harem', 'Historical', 'Horror', 'Idol', 'Incest', 
  'Inflation', 'Isekai', 'Lactation', 'Magic', 'Maid', 'Mecha', 
  'MILF', 'Mind Control', 'Mind Break', 'Monster', 'Mystery', 'Neko', 
  'Netorare', 'Nurse', 'Paizuri', 'Psychological', 'Romance', 'School', 
  'Sci-Fi', 'Slice of Life', 'Sports', 'Succubus', 'Super Power', 
  'Supernatural', 'Teacher', 'Tentacle', 'Thriller', 'Toys', 'Tsundere', 
  'Uncensored', 'Vanilla', 'X-Ray', 'Yandere', '3D'
];

export default function RecentFilterBar({ type, genres = [] }: RecentFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentGenre = searchParams.get('genre') || '';
  const currentFilterType = searchParams.get('type') || '';

  const [searchVal, setSearchVal] = useState(currentSearch);

  useEffect(() => {
    setSearchVal(currentSearch);
  }, [currentSearch]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on filter change
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Debounced live search pulling results instantly as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchVal.trim() !== currentSearch) {
        updateParam('q', searchVal.trim());
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchVal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchVal.trim());
  };

  const handleClearAll = () => {
    setSearchVal('');
    router.push(pathname);
  };

  const hasActiveFilters = currentSearch || currentSort || currentGenre || currentFilterType;

  // Combine provided genres with comprehensive genres list uniquely
  const mergedGenres = Array.from(
    new Set([...genres, ...COMPREHENSIVE_GENRES])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className={styles.filterControlsBar}>
      <form onSubmit={handleSearchSubmit} className={styles.filterSearchWrapper}>
        <Search size={16} className={styles.filterSearchIcon} />
        <input
          type="text"
          placeholder={type === 'episodes' ? "Search episode or series title..." : "Search series title..."}
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className={styles.filterSearchInput}
        />
        {searchVal && (
          <button 
            type="button" 
            onClick={() => { setSearchVal(''); updateParam('q', ''); }} 
            className={styles.clearSearchBtn}
          >
            <X size={14} />
          </button>
        )}
      </form>

      <div className={styles.filterSelectsGroup}>
        {/* Clean & Simple Sort Dropdown */}
        <div className={styles.selectWrapper}>
          <select
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Sort: Default</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title_asc">Title (A - Z)</option>
            <option value="title_desc">Title (Z - A)</option>
          </select>
        </div>

        {/* Complete Category / Genre Dropdown */}
        <div className={styles.selectWrapper}>
          <select
            value={currentGenre}
            onChange={(e) => updateParam('genre', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Genre: All</option>
            {mergedGenres.map((g) => (
              <option key={g} value={g.toLowerCase()}>{g}</option>
            ))}
          </select>
        </div>

        {/* Type / Censorship Dropdown for Episodes */}
        {type === 'episodes' && (
          <div className={styles.selectWrapper}>
            <select
              value={currentFilterType}
              onChange={(e) => updateParam('type', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Type: All</option>
              <option value="uncensored">Uncensored Only</option>
              <option value="subbed">Subbed Only</option>
            </select>
          </div>
        )}

        {/* Clear All Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className={styles.clearAllBtn}
          >
            <X size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
