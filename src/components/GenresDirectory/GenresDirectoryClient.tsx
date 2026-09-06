'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Layers,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  Film,
  Star,
  ChevronRight,
  FolderHeart,
  Eye
} from 'lucide-react';
import type { GenreWithStats } from '@/utils/genresData';
import { getR2Url } from '@/utils/r2';
import styles from './GenresDirectoryClient.module.css';

interface GenresDirectoryClientProps {
  genres: GenreWithStats[];
}

const ALPHABET = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function formatViews(views?: number): string {
  if (views === undefined || views === null || views === 0) return '0';
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

export default function GenresDirectoryClient({ genres }: GenresDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [filterTab, setFilterTab] = useState<'all' | 'with_series' | 'popular'>('all');
  const [sortMode, setSortMode] = useState<'popular' | 'series_count' | 'views' | 'name_asc'>('popular');

  // Filter & Sort Logic
  const filteredGenres = useMemo(() => {
    let list = [...genres];

    // 1. Tab Filter
    if (filterTab === 'with_series') {
      list = list.filter((g) => g.seriesCount > 0);
    } else if (filterTab === 'popular') {
      list = list.filter((g) => g.isTrending || g.seriesCount >= 10);
    }

    // 2. Alphabet Filter
    if (selectedLetter !== 'ALL') {
      if (selectedLetter === '#') {
        list = list.filter((g) => /^[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(g.name.trim()));
      } else {
        list = list.filter((g) => g.name.trim().toUpperCase().startsWith(selectedLetter));
      }
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => {
        const nameMatch = g.name.toLowerCase().includes(q);
        const descMatch = g.description.toLowerCase().includes(q);
        return nameMatch || descMatch;
      });
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortMode === 'popular' || sortMode === 'series_count') {
        if (b.seriesCount !== a.seriesCount) {
          return b.seriesCount - a.seriesCount;
        }
        if (b.totalViews !== a.totalViews) {
          return b.totalViews - a.totalViews;
        }
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'views') {
        if (b.totalViews !== a.totalViews) {
          return b.totalViews - a.totalViews;
        }
        return b.seriesCount - a.seriesCount;
      }
      if (sortMode === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [genres, filterTab, selectedLetter, searchQuery, sortMode]);

  const activeGenresCount = useMemo(() => {
    return genres.filter((g) => g.seriesCount > 0).length;
  }, [genres]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLetter('ALL');
    setFilterTab('all');
    setSortMode('popular');
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Genres</span>
      </nav>

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.highlightPill}>
            <Sparkles size={13} /> ANIME GENRES & THEMES
          </span>
          <span className={styles.totalGenresPill}>
            <Layers size={13} /> {genres.length} Genres Cataloged • {activeGenresCount} Active
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>Hentai Anime Genres Directory</h1>
        </div>
        <p className={styles.subtext}>
          Browse visual categories, genres, and themes across the entire Play Hentai library. Explore complete catalogs for {genres.length}+ hentai anime genres with high-definition artwork.
        </p>
      </div>

      {/* Controls & Filter Hub */}
      <div className={styles.controlsSection}>
        <div className={styles.searchSortRow}>
          {/* Live Search Box */}
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={`Search ${genres.length} genres (e.g. Vanilla, 3D, Romance)...`}
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
              <span>All Genres</span>
              <span className={styles.tabBadge}>{genres.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('with_series')}
              className={`${styles.tabBtn} ${filterTab === 'with_series' ? styles.tabBtnActive : ''}`}
            >
              <Sparkles size={13} />
              <span>With Releases</span>
              <span className={styles.tabBadge}>{activeGenresCount}</span>
            </button>

            {/* Sort Selector */}
            <div className={styles.sortWrapper}>
              <ArrowUpDown size={13} className={styles.sortIcon} />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className={styles.sortSelect}
                aria-label="Sort genres"
              >
                <option value="popular">🔥 Most Popular</option>
                <option value="series_count">📁 Most Series</option>
                <option value="views">👁️ Most Views</option>
                <option value="name_asc">🔤 Name: A-Z</option>
              </select>
              <ChevronDown size={13} className={styles.filterArrow || styles.sortArrow} />
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

      {/* Visual Genre Cards Grid */}
      {filteredGenres.length > 0 ? (
        <div className={styles.genresGrid}>
          {filteredGenres.map((genre) => {
            const hasPoster = Boolean(genre.featuredPoster || genre.featuredCover);
            const posterUrl = hasPoster
              ? getR2Url((genre.featuredCover || genre.featuredPoster)!, 'cover')
              : null;

            return (
              <Link
                key={genre.slug}
                href={`/categories/${genre.slug}`}
                className={styles.genreCard}
              >
                {/* Top Accent Strip */}
                <div
                  className={styles.cardTopAccent}
                  style={{ background: genre.gradient }}
                />

                {/* Background Image / Gradient */}
                <div className={styles.cardBgWrapper}>
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={`${genre.name} anime genre preview`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className={styles.cardBgImage}
                    />
                  ) : (
                    <div
                      className={styles.fallbackPattern}
                      style={{ background: genre.gradient }}
                    />
                  )}
                  <div className={styles.cardOverlay} />
                </div>

                {/* Card Top Row Badges */}
                <div className={styles.cardHeaderRow}>
                  <span
                    className={`${styles.seriesCountPill} ${
                      genre.seriesCount > 0 ? styles.seriesCountPillActive : ''
                    }`}
                  >
                    <Film size={12} />
                    {genre.seriesCount} {genre.seriesCount === 1 ? 'Series' : 'Series'}
                  </span>

                  {genre.totalViews > 0 && (
                    <span className={styles.ratingPill}>
                      <Eye size={11} style={{ marginRight: '2px' }} />
                      {formatViews(genre.totalViews)}
                    </span>
                  )}
                </div>

                {/* Card Body Content */}
                <div className={styles.cardBody}>
                  <h2 className={styles.genreTitle}>{genre.name}</h2>
                  <p className={styles.genreDesc}>{genre.description}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.exploreAction}>
                      Explore Catalog <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FolderHeart size={42} className={styles.emptyIcon} />
          <h3>No genres found</h3>
          <p>
            No genres matched &quot;{searchQuery || selectedLetter}&quot;. Try adjusting your search term or letter filter.
          </p>
          <button type="button" onClick={handleResetFilters} className={styles.resetBtn}>
            Reset Filters
          </button>
        </div>
      )}

      {/* SEO Information Section (Bottom) */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Explore 100+ Hentai Anime Genres, Categories & Tropes</h2>
          <p>
            Dive into the most comprehensive hentai anime genre library on the internet. Whether you crave sweet romance and wholesome Vanilla stories, heart-pounding 3D CGI spectacles, high-fantasy isekai adventures, or intense taboo subgenres, Play Hentai categorizes every series with precision.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>Visual Category Browsing</h3>
              <p>Explore over {genres.length} curated categories with high-definition artwork previews, live episode counts, and rating statistics.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Precision Multi-Tag Filtering</h3>
              <p>Easily combine or filter genres on the Browse Hub to isolate exact themes, studios, and release years with instant playback.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Uncensored & HD Quality</h3>
              <p>Every genre collection is optimized for seamless 1080p / 4K streaming with English subtitles and full uncensored master files.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
