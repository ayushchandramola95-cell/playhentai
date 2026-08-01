'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Layers, ArrowRight, Play, Sparkles, Compass, Flame } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const matched = TABS.find(t => t.id.toLowerCase() === tabParam.toLowerCase());
      if (matched) {
        setActiveTab(matched.id);
      }
    }
  }, [searchParams]);

  const filteredCollections = useMemo(() => {
    if (activeTab === 'all') return collections;
    return collections.filter(c => c.categoryTag === activeTab);
  }, [collections, activeTab]);

  // ItemList JSON-LD Schema for Collections Grid
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Curated Hentai Anime Playlists on PlayHentai',
    'url': `${SITE_URL}/playlists`,
    'itemListElement': filteredCollections.map((col, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': col.name,
      'url': `${SITE_URL}/collections/${col.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={itemListJsonLd} />
      <div className="ambient-glow" />

      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Layers size={28} className={styles.headerIcon} />
          <h1>Curated Playlists</h1>
        </div>
        <p className={styles.subtext}>
          Explore hand-picked series lists curated by our team of collectors. Find your next favorite genre niche.
        </p>
      </div>

      {/* Category Filter Tabs Bar */}
      <div className={styles.categoryTabs}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collections Grid */}
      <div className={styles.collectionsGrid}>
        {filteredCollections.map((col) => (
          <Link
            key={col.id}
            href={`/collections/${col.slug}`}
            className={`${styles.collectionCard} glass`}
            style={{ '--accent-gradient': col.gradient } as React.CSSProperties}
          >
            {/* Gradient Overlay Visual */}
            <div className={styles.cardBgGradient} />

            {/* Content Left */}
            <div className={styles.infoCol}>
              <div className={styles.cardHeader}>
                <div className={styles.badgeRow}>
                  <span className={styles.countBadge}>{col.totalCount || col.series.length} Series</span>
                  {col.categoryTag && <span className={styles.categoryBadge}>{col.categoryTag}</span>}
                </div>
                <h2>{col.name}</h2>
              </div>
              <p className={styles.description}>{col.description}</p>
              
              <div className={styles.viewBtn}>
                <span>Explore Playlist</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* Enhanced 3D Poster Stack Right */}
            <div className={styles.previewCol}>
              {col.series.length > 0 ? (
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
                        alt={item.title}
                        fill
                        sizes="100px"
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
    </div>
  );
}
