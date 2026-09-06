'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Eye } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { SeriesItem } from './SeriesCard';
import styles from './SeriesCompactCard.module.css';

function formatViews(views?: number): string {
  if (views === undefined || views === null) return '0';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
}

interface SeriesCompactCardProps {
  item: SeriesItem;
  className?: string;
}

export default function SeriesCompactCard({ item, className = '' }: SeriesCompactCardProps) {
  const rating = typeof item.rating === 'number' && item.rating > 0 
    ? item.rating 
    : (item.rating && !isNaN(Number(item.rating)) && Number(item.rating) > 0 ? Number(item.rating) : null);
  const releaseYear = item.release_year || item.releaseYear || 2026;
  const studio = item.studio || (item as any).studios?.name || '';

  // Calculate actual episodes from seasons
  let epCount = 0;
  if (item.seasons && Array.isArray(item.seasons)) {
    item.seasons.forEach((s: any) => {
      if (s.is_published !== false && s.episodes && Array.isArray(s.episodes)) {
        epCount += s.episodes.filter((e: any) => e.is_published !== false).length;
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

  if (epCount === 0 && item.episode_count_override !== undefined && item.episode_count_override !== null && Number(item.episode_count_override) > 0) {
    epCount = Number(item.episode_count_override);
  }

  // Tags & Censorship check
  const tags = (item.tags || []).map(t => (typeof t === 'string' ? t : ''));
  const isUncensored = tags.some(t => t.toLowerCase() === 'uncensored') || (item.category || '').toLowerCase() === 'uncensored';

  return (
    <Link href={`/series/${item.slug}`} prefetch={false} className={`${styles.compactCard} ${className}`}>
      {/* Poster Thumbnail */}
      <div className={styles.posterWrapper}>
        <Image
          src={getR2Url(
            item.poster_image_key || item.cover_image_key || item.banner_image_key || (Array.isArray((item as any).image_library) && (item as any).image_library[0]),
            'poster'
          )}
          alt={`${item.title} poster`}
          fill
          sizes="90px"
          className={styles.posterImage}
          style={{
            objectFit: item.poster_position === 'squeeze' ? 'fill' : 'cover',
            objectPosition: item.poster_position === 'squeeze' ? 'center' : (item.poster_position || 'center')
          }}
        />
      </div>

      {/* Info Column */}
      <div className={styles.infoCol}>
        {/* Title */}
        <h3 className={styles.titleText} title={item.title}>
          {item.title}
        </h3>

        {/* Meta Line: Year · Episodes · Rating · Views */}
        <div className={styles.metaLine}>
          <span className={styles.metaYear}>{releaseYear}</span>
          <span className={styles.dotDivider}>•</span>
          <span className={styles.metaEpisodes}>
            {epCount > 0 ? `${epCount} ${epCount === 1 ? 'ep' : 'eps'}` : 'OVA'}
          </span>
          {rating !== null && rating > 0 && (
            <>
              <span className={styles.dotDivider}>•</span>
              <span className={styles.metaRating}>
                <Star size={10.5} fill="#eab308" color="#eab308" className={styles.starIcon} />
                {rating.toFixed(1)}
              </span>
            </>
          )}
          <span className={styles.dotDivider}>•</span>
          <span className={styles.metaViews}>
            <Eye size={10.5} className={styles.eyeIcon} />
            {formatViews(item.views || 0)}
          </span>
        </div>

        {/* Badges Line: Studio · SUB · Censorship · Genre */}
        <div className={styles.badgeLine}>
          {studio && (
            <span className={styles.studioPill} title={studio}>
              {studio}
            </span>
          )}
          <span className={styles.subPill}>SUB</span>
          {isUncensored ? (
            <span className={styles.uncensoredPill}>Uncensored</span>
          ) : (
            <span className={styles.censoredPill}>Censored</span>
          )}
          {tags
            .filter(t => t.toLowerCase() !== 'uncensored' && t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
            .slice(0, 2)
            .map((t) => (
              <span key={t} className={styles.genrePill}>
                {t}
              </span>
            ))}
        </div>
      </div>
    </Link>
  );
}
