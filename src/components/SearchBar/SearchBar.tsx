'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, Loader2 } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onFocusChange?: (isFocused: boolean) => void;
}

export default function SearchBar({ onFocusChange }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLFormElement>(null);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Sync state with URL search param
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
    } else {
      setQuery('');
    }
  }, [searchParams]);

  // Debounced suggestion fetcher
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.series) {
          setSuggestions(data.series);
        }
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180); // 180ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[focusedIndex]);
    } else if (query.trim()) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectSuggestion = (series: any) => {
    setShowDropdown(false);
    setQuery(series.title);
    router.push(`/series/${series.slug}`);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    router.push('/search');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={styles.searchForm}
    >
      <div className={styles.inputWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search series, categories, tags..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => {
            setShowDropdown(true);
            onFocusChange?.(true);
          }}
          onBlur={() => {
            onFocusChange?.(false);
          }}
          className={styles.searchInput}
        />
        {isLoading && (
          <Loader2 size={16} className={`${styles.clearBtn} animate-spin`} />
        )}
        {query && !isLoading && (
          <button type="button" onClick={handleClear} className={styles.clearBtn} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && query.trim() && (
        <div className={styles.dropdown}>
          {isLoading && suggestions.length === 0 ? (
            <div className={styles.noResults}>
              <Loader2 size={20} className="animate-spin inline-block mr-2" /> Searching...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((series, idx) => (
              <div
                key={series.id || series.slug}
                onClick={() => handleSelectSuggestion(series)}
                className={`${styles.dropdownItem} ${
                  focusedIndex === idx ? styles.dropdownItemFocused : ''
                }`}
              >
                <div className={styles.itemPoster}>
                  {series.poster_image_key ? (
                    <Image
                      src={getR2Url(series.poster_image_key, 'poster')}
                      alt={series.title}
                      fill
                      sizes="44px"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#64748b' }}>
                      NO IMG
                    </div>
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{series.title}</div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>No series found matching "{query}"</div>
          )}
        </div>
      )}
    </form>
  );
}
