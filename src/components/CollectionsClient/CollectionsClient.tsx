'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Layers, ArrowRight, Play, Sparkles, Compass, Flame, Search, X, RotateCcw } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import JsonLd from '../JsonLd/JsonLd';
import styles from '@/app/(public)/collections/collections.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

interface SeriesItem {
  id: string;
  title: string;
  poster_image_key: string;
}

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryTag?: string;
  gradient: string;
  totalCount?: number;
  series: SeriesItem[];
}

interface CollectionsClientProps {
  collections: CollectionItem[];
}

const TABS = [
  { id: 'all', label: 'All Playlists', icon: Layers },
  { id: 'Featured', label: 'Featured', icon: Sparkles },
  { id: 'Genre Specials', label: 'Genre Specials', icon: Compass },
  { id: 'Most Popular', label: 'Most Popular', icon: Flame },
];

export default function CollectionsClient({ collections }: CollectionsClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const routePrefix = pathname?.startsWith('/playlists') ? '/playlists' : '/collections';
  const tabLabel = routePrefix === '/playlists' ? 'Playlists' : 'Collections';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const matched = TABS.find(t => t.id.toLowerCase() === tabParam.toLowerCase());
      if (matched) {
        setActiveTab(matched.id);
      }
    }
  }, [searchParams]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: collections.length };
    collections.forEach((c) => {
      if (c.categoryTag) {
        counts[c.categoryTag] = (counts[c.categoryTag] || 0) + 1;
      }
    });
    return counts;
  }, [collections]);

  // Smooth Auto-scroll to hide header when search box is clicked / focused
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (filterBarRef.current) {
      const NAVBAR_OFFSET = 86; // 74px navbar + 12px margin
      const rect = filterBarRef.current.getBoundingClientRect();
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      const targetScroll = rect.top + currentScroll - NAVBAR_OFFSET;

      window.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Filter collections based on activeTab and searchQuery
  const filteredCollections = useMemo(() => {
    let list = activeTab === 'all' 
      ? collections 
      : collections.filter(c => c.categoryTag === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.categoryTag && c.categoryTag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [collections, activeTab, searchQuery]);

  // ItemList JSON-LD Schema for Collections Grid
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `Curated Hentai Anime ${tabLabel} on Play Hentai`,
    'url': `${SITE_URL}${routePrefix}`,
    'itemListElement': filteredCollections.map((col, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': col.name,
      'url': `${SITE_URL}${routePrefix}/${col.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={itemListJsonLd} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>{tabLabel}</span>
      </nav>

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.playlistsHighlightPill}>
            <Sparkles size={13} className={styles.playlistsIconPill} /> CURATED PLAYLISTS
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>Curated Hentai Playlists</h1>
        </div>
        <p className={styles.subtext}>
          Explore curated hentai anime playlists organized by theme, genre, and popular series. Discover hand-picked collections on Play Hentai.
        </p>
      </div>

      {/* Category Tabs & Search Filter Bar */}
      <div 
        ref={filterBarRef} 
        className={`${styles.filterBar} glass ${isSearchFocused ? styles.filterBarFocused : ''}`}
      >
        {/* Category Filter Tabs */}
        <div className={styles.categoryTabs}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'all') {
                    router.replace(routePrefix, { scroll: false });
                  } else {
                    router.replace(`${routePrefix}?tab=${encodeURIComponent(tab.id)}`, { scroll: false });
                  }
                }}
                className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span className={`${styles.tabCount} ${isActive ? styles.activeTabCount : ''}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time Search Box */}
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onFocus={handleSearchFocus}
            onClick={handleSearchFocus}
            onBlur={handleSearchBlur}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${styles.searchInput} ${isSearchFocused ? styles.searchInputFocused : ''}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.clearSearch}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Results Counter Bar */}
      <div className={styles.resultsHeaderBar}>
        {searchQuery ? (
          <button type="button" onClick={handleClearSearch} className={styles.clearSearchInlineBtn}>
            <RotateCcw size={13} /> Clear Search
          </button>
        ) : (
          <span />
        )}
        <span className={styles.resultsCountText}>
          Showing <strong>{filteredCollections.length}</strong> of <strong>{collections.length}</strong> Playlists
        </span>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length > 0 ? (
        <div className={styles.collectionsGrid}>
          {filteredCollections.map((col) => (
            <Link
              key={col.id}
              href={`${routePrefix}/${col.slug}`}
              className={`${styles.collectionCard} glass`}
              style={{ '--accent-gradient': col.gradient } as React.CSSProperties}
            >
              {/* Gradient Overlay Visual */}
              <div className={styles.cardBgGradient} />

              {/* Content Left */}
              <div className={styles.infoCol}>
                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <span className={styles.countBadge}>
                      <Layers size={11} />
                      {col.totalCount || col.series.length} Series
                    </span>
                    {col.categoryTag && <span className={styles.categoryBadge}>{col.categoryTag}</span>}
                  </div>
                  <h2>{col.name}</h2>
                </div>
                <p className={styles.description}>{col.description}</p>
                
                <div className={styles.viewBtn}>
                  <span>Explore Playlist</span>
                  <ArrowRight size={15} className={styles.arrowIcon} />
                </div>
              </div>

              {/* Enhanced 3D Poster Stack Right */}
              <div className={styles.previewCol}>
                {col.series && col.series.length > 0 ? (
                  <div className={styles.posterStack}>
                    {col.series.slice(0, 3).map((item, index) => (
                      <div 
                        key={item.id || index} 
                        className={styles.stackedPoster}
                        style={{ 
                          '--index': index,
                          zIndex: 4 - index
                        } as React.CSSProperties}
                      >
                        <Image
                          src={getR2Url(item.poster_image_key, 'poster')}
                          alt={`${col.name} - ${item.title} Hentai Poster`}
                          fill
                          sizes="120px"
                          className={styles.posterImage}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyPreview}>
                    <Play size={24} className={styles.emptyIcon} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3>No Playlists Found</h3>
          <p>No playlists match your search &quot;{searchQuery}&quot; in this category.</p>
          <button 
            type="button" 
            onClick={handleClearSearch}
            className={styles.clearFiltersBtn}
          >
            Clear Search Filter
          </button>
        </div>
      )}
    </div>
  );
}
