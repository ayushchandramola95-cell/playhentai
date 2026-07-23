'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './MonthlyReleases.module.css';

interface MonthlyEpisodeItem {
  id: string;
  episode_number: number;
  title: string; // Series title
  showSlug: string;
  thumbnail: string;
  release_date: string;
  rating: number;
  description?: string;
  release_year?: number;
  studio?: string;
  tags?: string[];
  poster_image_key?: string;
}

interface MonthlyReleasesProps {
  episodes: MonthlyEpisodeItem[];
}

function formatReleaseDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

export default function MonthlyReleases({ episodes }: MonthlyReleasesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [openLeft, setOpenLeft] = useState<Record<string, boolean>>({});

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleMouseEnter = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const spaceNeeded = 320 + 20; // popover width + buffer spacing
    const rightBoundary = containerRect ? containerRect.right : window.innerWidth;
    const isTooClose = rect.right + spaceNeeded > rightBoundary;
    setOpenLeft(prev => ({ ...prev, [id]: isTooClose }));
  };

  const handleMouseLeave = (id: string) => {
    setOpenLeft(prev => ({ ...prev, [id]: false }));
  };

  if (!episodes || episodes.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.titleWrapper}>
          <span className={styles.accentBar} />
          <h2>Monthly Releases</h2>
        </div>
        
        <div className={styles.controlsWrapper}>
          <Link href="/recent/episodes" className={styles.seeAllBtn}>
            SEE ALL
          </Link>
          <div className={styles.arrowGroup}>
            <button onClick={scrollLeft} className={styles.arrowBtn} aria-label="Scroll left">
              <ChevronLeft size={16} />
            </button>
            <button onClick={scrollRight} className={styles.arrowBtn} aria-label="Scroll right">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className={styles.scrollContainer}>
        {episodes.map((ep) => {
          const releaseYear = ep.release_year || 2026;
          const studio = ep.studio || 'Juicymango';
          const rating = ep.rating;
          const posterKey = ep.poster_image_key || ep.thumbnail;
          const description = ep.description || 'No synopsis available.';
          const tags = ep.tags || [];

          return (
            <div 
              key={ep.id} 
              className={`${styles.episodeCard} card-hover ${openLeft[ep.id] ? styles.openLeft : ''}`}
              onMouseEnter={(e) => handleMouseEnter(ep.id, e)}
              onMouseLeave={() => handleMouseLeave(ep.id)}
            >
              <Link href={ep.showSlug ? `/series/${ep.showSlug}` : '#'} className={styles.cardImageLink}>
                <div className={styles.cardImageWrapper}>
                  <Image
                    src={getR2Url(ep.thumbnail, 'thumbnail')}
                    alt={ep.title}
                    fill
                    sizes="220px"
                    className={styles.cardImage}
                  />
                  
                  {/* SUB Badge (Top Left) */}
                  <div className={styles.subBadge}>
                    <span>SUB</span>
                  </div>

                  {/* Rating Badge (Top Right) */}
                  <div className={styles.ratingBadge}>
                    <Star size={10} fill="currentColor" className={styles.starIcon} />
                    <span>{ep.rating.toFixed(1)}</span>
                  </div>

                  {/* Title Overlay Banner (Bottom Purple Banner) */}
                  <div className={styles.titleOverlay}>
                    <span className={styles.titleText}>{ep.title}</span>
                  </div>
                </div>
              </Link>

              {/* Summary Popover Card (Appears on Hover) */}
              <div className={styles.popover}>
                <div className={styles.popoverPosterWrapper}>
                  <Image
                    src={getR2Url(posterKey, 'poster')}
                    alt={ep.title}
                    fill
                    sizes="80px"
                    className={styles.popoverPoster}
                  />
                </div>
                <div className={styles.popoverContent}>
                  <h5 className={styles.popoverTitle}>{ep.title}</h5>
                  <p className={styles.popoverSynopsis}>
                    <strong>Synopsis:</strong> {description}
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
                      {tags.slice(0, 4).map((t: string) => (
                        <span key={t} className={styles.genreBadge}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.episodeNumber}>Episode {ep.episode_number}</span>
                <span className={styles.releaseDate}>{formatReleaseDate(ep.release_date)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
