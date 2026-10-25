'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onFocusChange?: (isFocused: boolean) => void;
}

export default function SearchBar({ onFocusChange }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const containerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  // Reset focus state, close dropdown, and blur input on route change
  useEffect(() => {
    setShowDropdown(false);
    inputRef.current?.blur();
    onFocusChange?.(false);
  }, [pathname, searchParams, onFocusChange]);

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
    }, 150); // 150ms debounce for lightning autocomplete

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        inputRef.current?.blur();
        onFocusChange?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onFocusChange]);

  // Global keyboard shortcut to focus search ("/" or "Ctrl+K" / "Cmd+K")
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setShowDropdown(true);
        onFocusChange?.(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onFocusChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[focusedIndex]);
    } else if (query.trim()) {
      setShowDropdown(false);
      inputRef.current?.blur();
      onFocusChange?.(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectSuggestion = (series: any) => {
    setShowDropdown(false);
    inputRef.current?.blur();
    onFocusChange?.(false);
    setQuery(series.title);
    router.push(`/series/${series.slug}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
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
    <>
      {showDropdown && query.trim() && (
        <div
          className={styles.backdrop}
          onClick={() => {
            setShowDropdown(false);
            onFocusChange?.(false);
          }}
          aria-hidden="true"
        />
      )}
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className={styles.searchForm}
      >
        <div className={styles.inputWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search series, tags..."
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
            className={styles.searchInput}
          />
          {isLoading && (
            <Loader2 size={16} className={`${styles.clearBtn} animate-spin`} />
          )}
          {!query && !isLoading && (
            <kbd className={styles.shortcutKbd} title="Press / to search" aria-hidden="true">
              /
            </kbd>
          )}
          {query && !isLoading && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className={styles.clearBtn}
              aria-label="Clear search"
            >
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
              <>
                <div className={styles.suggestionsList}>
                  {suggestions.map((series, idx) => (
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
                        <div className={styles.itemMeta}>
                          {series.release_year && (
                            <span className={styles.metaYear}>{series.release_year}</span>
                          )}
                          {typeof series.rating === 'number' && series.rating > 0 && (
                            <span className={styles.metaRating}>★ {series.rating.toFixed(1)}</span>
                          )}
                          {Array.isArray(series.tags) && series.tags[0] && (
                            <span className={styles.metaTag}>{series.tags[0]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  onClick={handleSubmit}
                  className={styles.viewAllFooter}
                  role="button"
                  tabIndex={0}
                >
                  <span>View all results for &quot;<strong>{query.trim()}</strong>&quot;</span>
                  <ArrowRight size={14} className={styles.viewAllArrow} />
                </div>
              </>
            ) : (
              <div className={styles.noResults}>No series found matching &quot;{query}&quot;</div>
            )}
          </div>
        )}
      </form>
    </>
  );
}
