'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, ChevronLeft, ChevronRight, Star, Eye, Layers, CheckCircle2 } from 'lucide-react';
import WatchlistToggle from '../WatchlistToggle/WatchlistToggle';
import { getR2Url } from '@/utils/r2';
import styles from './HeroCarousel.module.css';

function formatViews(views?: number): string {
  if (views === undefined || views === null || views === 0) return '1.4K';
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key?: string;
  cover_image_key?: string;
  banner_image_key?: string;
  tags?: string[];
  category?: string;
  firstEpisodeId?: string | null;
  tagline?: string;
  rating?: number | null;
  views?: number;
  studio?: string | null;
  release_year?: number | string | null;
  watchEpisodeUrl?: string | null;
}

interface HeroCarouselProps {
  activeSeries: SeriesItem[];
  isDbEmpty: boolean;
  autoplaySpeed?: number;
}

export default function HeroCarousel({ activeSeries, isDbEmpty, autoplaySpeed = 6000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0, 1]));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const thumbTrackRef = useRef<HTMLDivElement | null>(null);

  const totalSlides = activeSeries ? activeSeries.length : 0;

  useEffect(() => {
    if (currentIndex !== 0) {
      setHasInteracted(true);
    }
  }, [currentIndex]);

  // Preload current slide, next slide, and previous slide for instant rendering
  useEffect(() => {
    if (totalSlides === 0) return;
    setLoadedSlides((prev) => {
      const nextIdx = (currentIndex + 1) % totalSlides;
      const prevIdx = (currentIndex - 1 + totalSlides) % totalSlides;
      if (prev.has(currentIndex) && prev.has(nextIdx) && prev.has(prevIdx)) {
        return prev;
      }
      const updated = new Set(prev);
      updated.add(currentIndex);
      updated.add(nextIdx);
      updated.add(prevIdx);
      return updated;
    });
  }, [currentIndex, totalSlides]);

  // Autoplay timer
  useEffect(() => {
    if (totalSlides <= 1 || autoplaySpeed <= 0) return;

    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
      }, autoplaySpeed);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [totalSlides, isPaused, autoplaySpeed]);

  // Scroll active thumbnail smoothly into view
  useEffect(() => {
    if (!thumbTrackRef.current) return;
    const activeEl = thumbTrackRef.current.children[currentIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentIndex]);

  const handleNext = () => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
  };

  const handlePrev = () => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalSlides) % totalSlides);
  };

  // Touch Swipe for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 35;

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  if (!activeSeries || activeSeries.length === 0) return null;

  const currentSeries = activeSeries[currentIndex] || activeSeries[0];
  const nextIndex = (currentIndex + 1) % totalSlides;
  const nextSeries = activeSeries[nextIndex] || currentSeries;

  const currentWatchLink = currentSeries.watchEpisodeUrl
    ? currentSeries.watchEpisodeUrl
    : (currentSeries.slug 
        ? `/watch/${currentSeries.slug}-episode-1` 
        : (currentSeries.firstEpisodeId ? `/watch/${currentSeries.firstEpisodeId}` : `/series/${currentSeries.slug}`));

  const currentCoverUrl = getR2Url(currentSeries.cover_image_key || currentSeries.banner_image_key || currentSeries.poster_image_key, 'cover');
  const nextCoverUrl = getR2Url(nextSeries.cover_image_key || nextSeries.banner_image_key || nextSeries.poster_image_key, 'cover');

  return (
    <section 
      className={styles.heroSection}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Spotlight Featured Carousel"
    >
      {/* Background Banner Slides with Atmospheric Blur & Gradient Masks */}
      <div className={styles.slidesContainer}>
        {activeSeries.map((series, index) => {
          const isActive = index === currentIndex;
          const bannerKey = series.banner_image_key || series.cover_image_key || series.poster_image_key;
          const bannerUrl = getR2Url(bannerKey, 'banner');
          
          return (
            <div 
              key={series.id || index} 
              className={`${styles.slide} ${isActive ? styles.slideActive : ''}`}
            >
              <div className={styles.heroBg}>
                {loadedSlides.has(index) && (
                  <Image
                    src={bannerUrl}
                    alt={`${series.title || 'Featured'} backdrop`}
                    fill
                    sizes="(max-width: 768px) 1px, 100vw"
                    className={styles.heroBgImage}
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    unoptimized={typeof bannerUrl === 'string' && bannerUrl.startsWith('data:')}
                  />
                )}
                <div className={styles.heroOverlay} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Spotlight Container */}
      <div className={styles.heroContentWrapper}>
        <div className={styles.spotlightGrid}>
          
          {/* LEFT COLUMN: Metadata, Titles, Actions, and Thumbnails Strip */}
          <div className={styles.leftColumn}>
            {isDbEmpty && (
              <div className={styles.dbAlert}>
                💡 Featuring catalog mock data
              </div>
            )}

            {/* Top Badges Row */}
            <div className={styles.badgeRow}>
              <span className={styles.statusPill}>
                {currentSeries.tagline || 'New episode'}
              </span>
              <span className={styles.releaseText}>
                {currentSeries.release_year ? `${currentSeries.release_year}` : 'Latest release'}
              </span>
              {currentSeries.studio && (
                <span className={styles.studioBadge}>
                  <CheckCircle2 size={13} className={styles.checkIcon} />
                  <span>{currentSeries.studio}</span>
                </span>
              )}
            </div>

            {/* Hero Main Title */}
            <h1 className={styles.heroTitle}>
              <Link href={currentSeries.watchEpisodeUrl || `/series/${currentSeries.slug}`} title={currentSeries.title}>
                {currentSeries.title}
              </Link>
            </h1>

            {/* Synopsis (2 lines clamped) */}
            <p className={styles.heroDescription}>
              {currentSeries.description || 'Watch the latest episodes in high definition with English subtitles on PlayHentai.'}
            </p>

            {/* Metadata Stats & Tags Row */}
            <div className={styles.statsAndTagsRow}>
              <div className={styles.statsGroup}>
                <div className={styles.statItem}>
                  <Eye size={14} className={styles.statIcon} />
                  <span>{formatViews(currentSeries.views)}</span>
                </div>
                <div className={styles.statItem}>
                  <Star size={13} fill="#fbbf24" color="#fbbf24" className={styles.statIcon} />
                  <span>
                    {currentSeries.rating ? Number(currentSeries.rating).toFixed(1) : '8.8'}
                  </span>
                </div>
              </div>

              {/* Tag Chips */}
              <div className={styles.tagChips}>
                <span className={styles.qualityChip}>HD</span>
                {(currentSeries.tags || [currentSeries.category || 'Anime'])
                  .filter(t => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
                  .slice(0, 4)
                  .map(tag => (
                    <Link 
                      key={tag} 
                      href={`/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`}
                      className={styles.tagChip}
                    >
                      {tag}
                    </Link>
                  ))}
              </div>
            </div>

            {/* Action Buttons: Watch Now, All Episodes, Watchlist */}
            <div className={styles.actionButtons}>
              <Link href={currentWatchLink} className={styles.watchNowBtn}>
                <Play size={18} fill="currentColor" />
                <span>Watch now</span>
              </Link>

              <Link href={`/series/${currentSeries.slug}`} className={styles.allEpisodesBtn}>
                <Layers size={17} />
                <span>All episodes</span>
              </Link>

              <WatchlistToggle seriesId={currentSeries.id} variant="hero" />
            </div>

            {/* Bottom Mini Thumbnails Strip ("Latest uploads") */}
            {totalSlides > 1 && (
              <div className={styles.thumbStripContainer}>
                <div className={styles.thumbStripHeader}>
                  <span className={styles.thumbStripTitle}>Latest uploads</span>
                  <div className={styles.thumbArrows}>
                    <button 
                      type="button" 
                      onClick={handlePrev} 
                      className={styles.thumbArrowBtn}
                      aria-label="Previous series"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button 
                      type="button" 
                      onClick={handleNext} 
                      className={styles.thumbArrowBtn}
                      aria-label="Next series"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.thumbTrack} ref={thumbTrackRef}>
                  {activeSeries.map((item, idx) => {
                    const isItemActive = idx === currentIndex;
                    const thumbImg = getR2Url(item.cover_image_key || item.poster_image_key || item.banner_image_key, 'cover');
                    
                    return (
                      <button
                        key={item.id || idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`${styles.thumbItem} ${isItemActive ? styles.thumbItemActive : ''}`}
                        aria-label={`Select ${item.title}`}
                      >
                        <Image
                          src={thumbImg}
                          alt={item.title}
                          fill
                          sizes="120px"
                          className={styles.thumbImage}
                          unoptimized={typeof thumbImg === 'string' && thumbImg.startsWith('data:')}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Layered Floating Spotlight Card Stack */}
          <div className={styles.rightColumn}>
            <div className={styles.cardStack}>
              {/* Back Card (Shows next slide, tilted for 3D depth) */}
              {totalSlides > 1 && (
                <div className={styles.backCard} aria-hidden="true">
                  <Image
                    src={nextCoverUrl}
                    alt={nextSeries.title}
                    fill
                    sizes="(max-width: 1024px) 1px, 520px"
                    className={styles.cardImage}
                    unoptimized={typeof nextCoverUrl === 'string' && nextCoverUrl.startsWith('data:')}
                  />
                  <div className={styles.backCardShade} />
                </div>
              )}

              {/* Front Card (Active Series, Interactive with Spotlight Play Badge) */}
              <Link href={currentWatchLink} className={styles.frontCard} aria-label={`Watch ${currentSeries.title}`}>
                <Image
                  src={currentCoverUrl}
                  alt={currentSeries.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 460px, 540px"
                  className={styles.cardImage}
                  priority={true}
                  unoptimized={typeof currentCoverUrl === 'string' && currentCoverUrl.startsWith('data:')}
                />
                <div className={styles.frontCardVignette} />

                {/* Frosted In-the-Spotlight Badge Overlay */}
                <div className={styles.spotlightBadgeOverlay}>
                  <div className={styles.spotlightPlayIconBox}>
                    <Play size={18} fill="white" color="white" />
                  </div>
                  <div className={styles.spotlightInfo}>
                    <span className={styles.spotlightCategory}>IN THE SPOTLIGHT</span>
                    <span className={styles.spotlightTitleText}>{currentSeries.title}</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
