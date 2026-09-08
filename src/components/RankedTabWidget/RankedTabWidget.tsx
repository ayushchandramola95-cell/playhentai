'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './RankedTabWidget.module.css';

export interface RankedItem {
  id: string;
  title: string;
  slug: string;
  poster_image_key?: string;
  cover_image_key?: string;
  poster_position?: string;
  rating?: number;
  release_year?: number;
  views?: number;
}

interface RankedTabWidgetProps {
  popularList: RankedItem[];
  newList: RankedItem[];
  maxItems?: number;
}

export default function RankedTabWidget({
  popularList,
  newList,
  maxItems = 10,
}: RankedTabWidgetProps) {
  const [activeTab, setActiveTab] = useState<'popular' | 'new'>('popular');

  const activeItems = (activeTab === 'popular' ? popularList : newList).slice(0, maxItems);

  return (
    <div className={styles.rankedWidgetCard}>
      {/* Header Tabs: POPULAR / NEW */}
      <div className={styles.tabsHeader}>
        <button
          type="button"
          onClick={() => setActiveTab('popular')}
          className={`${styles.tabBtn} ${
            activeTab === 'popular' ? styles.tabActive : ''
          }`}
        >
          POPULAR
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`${styles.tabBtn} ${
            activeTab === 'new' ? styles.tabActive : ''
          }`}
        >
          NEW
        </button>
      </div>

      {/* Ranked List */}
      <div className={styles.listContainer}>
        {activeItems.map((item, idx) => {
          const rank = idx + 1;
          const isTopRank = rank === 1;
          const hasRating = typeof item.rating === 'number' && item.rating > 0;
          const ratingVal = hasRating ? item.rating!.toFixed(1) : null;
          const releaseYear = item.release_year || 2024;
          const posterSrc = getR2Url(item.poster_image_key || item.cover_image_key, 'poster');

          return (
            <Link
              key={`${activeTab}-${item.id || item.slug}-${rank}`}
              href={`/series/${item.slug}`}
              className={styles.rankedRow}
            >
              {/* Thumbnail Poster */}
              <div className={styles.posterWrapper}>
                <Image
                  src={posterSrc}
                  alt={`${item.title} anime poster`}
                  fill
                  sizes="65px"
                  className={styles.posterImg}
                  style={{
                    objectPosition: item.poster_position || 'center'
                  }}
                />
              </div>

              {/* Title & Meta */}
              <div className={styles.metaContent}>
                <h4 className={`${styles.itemTitle} ${isTopRank ? styles.topRankTitle : ''}`}>
                  {item.title}
                </h4>
                <div className={styles.statsRow}>
                  {hasRating && (
                    <div className={styles.ratingBadge}>
                      <Star size={11} fill="#eab308" color="#eab308" />
                      <span>{ratingVal}</span>
                    </div>
                  )}
                  <span className={styles.yearText}>{releaseYear}</span>
                </div>
              </div>

              {/* Large Rank Watermark / Number on Right */}
              <div className={`${styles.rankNumber} ${isTopRank ? styles.topRankNumber : ''}`}>
                #{rank}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
