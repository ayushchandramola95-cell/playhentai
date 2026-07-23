'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Star } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './SeriesCard.module.css';

export interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  cover_image_key?: string;
  banner_image_key?: string;
  tags?: string[];
  category?: string;
  views?: number;
  poster_position?: string;
  status?: string;
  rating?: number;
  release_year?: number;
  releaseYear?: number;
  studio?: string;
  episode_count_override?: number | null;
  seasons?: {
    is_published: boolean;
    episodes?: {
      is_published: boolean;
    }[];
  }[];
}

interface SeriesCardProps {
  item: SeriesItem;
  className?: string;
}

function getStableViews(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const min = 1000;
  const max = 50000;
  const range = max - min;
  const val = Math.abs(hash % range);
  return min + val;
}

function getStableStatus(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0 ? 'airing' : 'finalized';
}

function getStableRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const min = 50; // 5.0
  const max = 95; // 9.5
  const val = Math.abs(hash % (max - min));
  return parseFloat(((min + val) / 10).toFixed(1));
}

export default function SeriesCard({ item, className = '' }: SeriesCardProps) {
  // Synchronous, zero-lag DOM attribute side calculation (Always vertically centered)
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

    const spaceOnLeft = rect.left;
    const spaceOnRight = viewportWidth - rect.right;

    // Synchronous Horizontal Side check
    let side = 'right';
    if (spaceOnLeft < 350) {
      side = 'right';
    } else if (spaceOnRight < 350) {
      side = 'left';
    } else {
      side = 'right';
    }

    card.setAttribute('data-side', side);
  };

  const statusVal = (item.status || getStableStatus(item.id || item.title)).toLowerCase();
  const isOngoing = statusVal === 'airing' || statusVal === 'ongoing';
  const isUpcoming = statusVal === 'upcoming';
  const rating = item.rating || getStableRating(item.id || item.title);
  const releaseYear = item.release_year || item.releaseYear || 2026;
  const studio = item.studio || 'Juicymango';

  // Calculate actual episodes from seasons
  let epCount = 0;
  if (item.seasons) {
    item.seasons.forEach((s: any) => {
      if (s.is_published && s.episodes) {
        epCount += s.episodes.filter((e: any) => e.is_published).length;
      }
    });
  } else if (item.slug) {
    const mockCounts: Record<string, number> = {
      'cyberpunk-odyssey': 3,
      'fantasy-chronicles-runes': 3,
      'neon-tokyo-noir': 3,
      'celestial-guardians': 2,
      'shadow-ninja-legend': 4,
      'retro-arcade-rider': 1,
      'ookii-onnanoko-wa-suki-desu-ka': 2
    };
    epCount = mockCounts[item.slug] || 0;
  }

  return (
    <div
      className={`${styles.seriesCard} ${className} card-hover`}
      onMouseEnter={handleMouseEnter}
      data-side="right"
    >
      <Link href={`/series/${item.slug}`} className={styles.cardImageLink}>
        <div className={styles.seriesImageWrapper}>
          <Image
            src={getR2Url(
              item.poster_image_key || item.cover_image_key || item.banner_image_key || (Array.isArray((item as any).image_library) && (item as any).image_library[0]),
              'poster'
            )}
            alt={item.title}
            fill
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className={styles.cardImage}
            style={{ objectPosition: item.poster_position || 'center' }}
          />
          
          {/* Rating Badge (Top Right) */}
          <div className={styles.ratingBadge}>
            <Star size={9.5} fill="#eab308" color="#eab308" className={styles.starIcon} />
            <span>{rating.toFixed(1)}</span>
          </div>

          {isUpcoming && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: '#3b82f6',
              color: 'white',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              zIndex: 3
            }}>
              Upcoming
            </div>
          )}

          {/* Play Icon Hover Overlay */}
          <div className={styles.cardImageOverlay}>
            <Play size={36} fill="white" className={styles.cardPlayIcon} />
          </div>
        </div>
      </Link>

      {/* Title and Meta (Below Card Image) */}
      <div className={styles.cardMetaContent}>
        <h4 className={styles.seriesTitleText} title={item.title}>
          <Link href={`/series/${item.slug}`}>{item.title}</Link>
        </h4>
        <span className={styles.seriesYearText}>
          {releaseYear} • {isUpcoming ? 'Upcoming' : isOngoing ? 'Ongoing' : 'Completed'} • {epCount} EP
        </span>
      </div>

      {/* Synchronous Vertically Centered Popover */}
      <div className="popover">
        <div className={styles.popoverPosterWrapper}>
          <Image
            src={getR2Url(item.poster_image_key || item.cover_image_key, 'poster')}
            alt={item.title}
            fill
            sizes="80px"
            className={styles.popoverPoster}
            style={{ objectPosition: item.poster_position || 'center' }}
          />
        </div>
        <div className={styles.popoverContent}>
          <h5 className={styles.popoverTitle}>{item.title}</h5>
          <p className={styles.popoverSynopsis}>
            <strong>Synopsis:</strong> {item.description}
          </p>
          <div className={styles.popoverMeta}>
            <span><strong>Year:</strong> <span className={styles.metaYear}>{releaseYear}</span></span>
            <span className={styles.metaDivider}>•</span>
            <span className={styles.metaRating}>
              <Star size={10} fill="#eab308" color="#eab308" className={styles.popoverStar} />
              <strong>{rating.toFixed(1)}</strong>
            </span>
          </div>
          <div className={styles.popoverBadges}>
            <span><strong>Studio:</strong></span>
            <span className={styles.studioBadge}>{studio}</span>
          </div>
          <div className={styles.popoverBadges} style={{ marginTop: '0.4rem' }}>
            <span><strong>Genres:</strong></span>
            <div className={styles.popoverTags}>
              {(item.tags || [item.category || 'Anime'])
                .filter(t => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
                .slice(0, 4)
                .map((t: string) => (
                  <span key={t} className={styles.genreBadge}>{t}</span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
