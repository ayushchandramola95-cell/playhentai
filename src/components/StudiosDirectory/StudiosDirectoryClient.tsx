'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Building2, Search, X, ArrowUpDown, ChevronDown, Calendar, MapPin, Film, Star, ChevronRight, Layers, Sparkles } from 'lucide-react';
import type { StudioWithStats } from '@/utils/studiosData';
import styles from './StudiosDirectoryClient.module.css';

interface StudiosDirectoryClientProps {
  studios: StudioWithStats[];
}

const ALPHABET = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export default function StudiosDirectoryClient({ studios }: StudiosDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [filterTab, setFilterTab] = useState<'all' | 'with_series'>('all');
  const [sortMode, setSortMode] = useState<'series_count' | 'name_asc' | 'rating' | 'newest_founded'>('series_count');
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter & Sort Logic
  const filteredStudios = useMemo(() => {
    let list = [...studios];

    // 1. Tab Filter
    if (filterTab === 'with_series') {
      list = list.filter((s) => s.stats.totalSeries > 0);
    }

    // 2. Alphabet Filter
    if (selectedLetter !== 'ALL') {
      if (selectedLetter === '#') {
        list = list.filter((s) => /^[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(s.name.trim()));
      } else {
        list = list.filter((s) => s.name.trim().toUpperCase().startsWith(selectedLetter));
      }
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const bioMatch = (s.bio || '').toLowerCase().includes(q);
        const tagMatch = (s.tags || []).some((t) => t.toLowerCase().includes(q));
        const countryMatch = (s.country || '').toLowerCase().includes(q);
        return nameMatch || bioMatch || tagMatch || countryMatch;
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortMode === 'series_count') {
        if (b.stats.totalSeries !== a.stats.totalSeries) {
          return b.stats.totalSeries - a.stats.totalSeries;
        }
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'rating') {
        const rA = typeof a.stats.averageRating === 'number' ? a.stats.averageRating : 0;
        const rB = typeof b.stats.averageRating === 'number' ? b.stats.averageRating : 0;
        if (rB !== rA) return rB - rA;
        return b.stats.totalSeries - a.stats.totalSeries;
      }
      if (sortMode === 'newest_founded') {
        return (b.founded || 0) - (a.founded || 0);
      }
      return 0;
    });

    return list;
  }, [studios, filterTab, selectedLetter, searchQuery, sortMode]);

  const activeStudiosCount = useMemo(() => {
    return studios.filter((s) => s.stats.totalSeries > 0).length;
  }, [studios]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLetter('ALL');
    setFilterTab('all');
    setSortMode('series_count');
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Studios</span>
      </nav>

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.highlightPill}>
            <Building2 size={13} /> PRODUCTION HOUSES
          </span>
          <span className={styles.totalStudiosPill}>
            <Layers size={13} /> {studios.length} Studios Registered
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>Hentai Production Studios</h1>
        </div>
        <p className={styles.subtext}>
          Browse full studio profiles, animation release histories, ratings, and catalogs for {studios.length}+ Japanese animation production companies on Play Hentai.
        </p>
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className={styles.controlsSection}>
        <div className={styles.searchSortRow}>
          {/* Real-time Search Box */}
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={`Search ${studios.length} studios by name, country, genre...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={styles.clearSearch}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs & Sort Select */}
          <div className={styles.filterActionsGroup}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`${styles.tabBtn} ${filterTab === 'all' ? styles.tabBtnActive : ''}`}
            >
              <span>All Studios</span>
              <span className={styles.tabBadge}>{studios.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('with_series')}
              className={`${styles.tabBtn} ${filterTab === 'with_series' ? styles.tabBtnActive : ''}`}
            >
              <Sparkles size={13} />
              <span>With Releases</span>
              <span className={styles.tabBadge}>{activeStudiosCount}</span>
            </button>

            {/* Sort Selector */}
            <div className={styles.sortWrapper}>
              <ArrowUpDown size={13} className={styles.sortIcon} />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className={styles.sortSelect}
                aria-label="Sort studios"
              >
                <option value="series_count">🔥 Most Releases</option>
                <option value="name_asc">🔤 Name: A-Z</option>
                <option value="rating">⭐ Highest Rated</option>
                <option value="newest_founded">📅 Established Year</option>
              </select>
              <ChevronDown size={13} className={styles.sortArrow} />
            </div>
          </div>
        </div>

        {/* A-Z Alphabet Filter Bar */}
        <div className={styles.alphabetBar}>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`${styles.letterBtn} ${selectedLetter === letter ? styles.letterBtnActive : ''}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Studio Cards Grid */}
      <div ref={gridRef}>
        {filteredStudios.length > 0 ? (
          <div className={styles.studiosGrid}>
            {filteredStudios.map((studio) => (
              <Link
                key={studio.slug}
                href={`/studios/${studio.slug}`}
                className={styles.studioCard}
              >
                <div
                  className={styles.cardTopAccent}
                  style={{ background: studio.gradient }}
                />

                <div className={styles.cardHeader}>
                  <div className={styles.logoAvatar} style={{ background: studio.gradient }}>
                    {studio.logoChar}
                  </div>
                  <div className={styles.headerInfo}>
                    <h2 className={styles.studioName} title={studio.name}>
                      {studio.name}
                    </h2>
                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>
                        <Calendar size={12} />
                        Est. {studio.founded}
                      </span>
                      <span>•</span>
                      <span className={styles.metaItem}>
                        <MapPin size={12} />
                        {studio.country}
                      </span>
                    </div>
                  </div>
                </div>

                <p className={styles.bioText}>{studio.bio}</p>

                <div className={styles.statsFooter}>
                  <div className={styles.statsPills}>
                    <span
                      className={`${styles.seriesCountPill} ${
                        studio.stats.totalSeries > 0 ? styles.seriesCountPillActive : ''
                      }`}
                    >
                      <Film size={12} />
                      {studio.stats.totalSeries} {studio.stats.totalSeries === 1 ? 'Series' : 'Series'}
                    </span>

                    {typeof studio.stats.averageRating === 'number' && studio.stats.averageRating > 0 && (
                      <span className={styles.ratingPill}>
                        <Star size={11} fill="currentColor" />
                        {studio.stats.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <span className={styles.viewCatalogArrow}>
                    Catalog <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Building2 size={40} className={styles.emptyIcon} />
            <h3>No studios found</h3>
            <p>
              No studios matched &quot;{searchQuery || selectedLetter}&quot;. Try adjusting your search term or letter filter.
            </p>
            <button type="button" onClick={handleResetFilters} className={styles.resetBtn}>
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* SEO Information Section (Bottom) */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Explore Top Hentai Animation Studios & Production Houses</h2>
          <p>
            Discover the premier Japanese animation houses, boutique creators, and veteran studios that have shaped the anime industry. From iconic powerhouses like PoRO, Bunnywalker, Queen Bee, and Mary Jane to legendary labels like Pink Pineapple, MS Pictures, and Studio Jack, our directory provides exhaustive series catalogs, production stats, and release chronologies.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>Complete Studio Profiles</h3>
              <p>Explore established years, origin locations, studio legacies, and comprehensive catalogs for over {studios.length} animation production brands.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Verified Ratings & Statistics</h3>
              <p>Compare studio performance with aggregated community ratings, total catalog sizes, and prominent genre themes across all releases.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Instant Stream Access</h3>
              <p>Click into any studio to stream their entire uncensored, 3D, and high-definition OVA library in English subtitles with zero buffer.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
