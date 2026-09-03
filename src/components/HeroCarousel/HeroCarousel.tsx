'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import WatchlistToggle from '../WatchlistToggle/WatchlistToggle';
import { getR2Url } from '@/utils/r2';
import styles from './HeroCarousel.module.css';

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
}

interface HeroCarouselProps {
  activeSeries: SeriesItem[];
  isDbEmpty: boolean;
  autoplaySpeed?: number;
}

export default function HeroCarousel({ activeSeries, isDbEmpty, autoplaySpeed = 6000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = activeSeries ? activeSeries.length : 0;

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

  const handleNext = () => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
  };

  const handlePrev = () => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalSlides) % totalSlides);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  // Touch Swipe State for Mobile Screens
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 35; // minimum px distance for swipe trigger

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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  if (!activeSeries || activeSeries.length === 0) return null;

  return (
    <section 
      className={styles.heroSection}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Series Carousel"
    >
      {/* Background Banner Slides with Vignette Overlay */}
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
                <Image
                  src={bannerUrl}
                  alt={`${series.title || 'Featured'} cover`}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={styles.heroImage}
                />
                <div className={styles.heroOverlay} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Hero Card Container */}
      <div className={styles.heroContentWrapper}>
        {activeSeries.map((series, index) => {
          const isActive = index === currentIndex;

          const posterKey = series.poster_image_key || series.cover_image_key;
          const posterUrl = getR2Url(posterKey, 'poster');
          
          const cleanTags = (series.tags || [series.category || 'Featured'])
            .filter(t => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
            .slice(0, 3);

          return (
            <div 
              key={series.id || index} 
              className={`${styles.heroCardContainer} ${isActive ? styles.heroCardActive : styles.heroCardInactive}`}
            >
              {/* Left Poster Thumbnail Card */}
              <div className={styles.posterCardWrapper}>
                <Link href={`/series/${series.slug}`} className={styles.posterLink}>
                  <Image
                    src={posterUrl}
                    alt={`${series.title || 'Featured'} poster`}
                    fill
                    sizes="(max-width: 768px) 140px, 220px"
                    className={styles.posterImage}
                    priority
                  />
                  <div className={styles.posterHoverOverlay}>
                    <Play size={40} fill="white" />
                  </div>
                </Link>
              </div>

              {/* Right Content Area */}
              <div className={styles.heroContent}>
                {isDbEmpty && (
                  <div className={styles.dbAlert}>
                    💡 Featuring catalog mock data
                  </div>
                )}

                <div className={styles.badgeRow}>
                  {series.tagline && (
                    <span className={styles.taglineBadge}>
                      {series.tagline}
                    </span>
                  )}
                  <span className={styles.qualityBadge}>HD</span>
                  <span className={styles.categoryBadge}>{series.category || 'Anime'}</span>
                </div>

                <h2 className={styles.heroTitle}>
                  <Link href={`/series/${series.slug}`}>{series.title}</Link>
                </h2>

                {cleanTags.length > 0 && (
                  <div className={styles.genreSubLine}>
                    {cleanTags.join(' • ')}
                  </div>
                )}

                <p className={styles.heroDescription}>
                  {series.description}
                </p>

                <div className={styles.heroButtons}>
                  <Link 
                    href={series.slug ? `/watch/${series.slug}-episode-1` : (series.firstEpisodeId ? `/watch/${series.firstEpisodeId}` : `/series/${series.slug}`)} 
                    className={styles.playBtn}
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Watch Now</span>
                  </Link>

                  <Link href={`/series/${series.slug}`} className={styles.detailsBtn}>
                    <Info size={18} />
                    <span>Details</span>
                  </Link>

                  <WatchlistToggle seriesId={series.id} variant="hero" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side Circular Navigation Buttons */}
      {totalSlides > 1 && (
        <>
          <button 
            type="button"
            className={`${styles.navBtn} ${styles.prevBtn}`}
            onClick={handlePrev}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={24} />
          </button>

          <button 
            type="button"
            className={`${styles.navBtn} ${styles.nextBtn}`}
            onClick={handleNext}
            aria-label="Next Slide"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Bottom Capsule Dots Indicator Bar */}
      {totalSlides > 1 && (
        <div className={styles.capsuleDotsContainer}>
          {activeSeries.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
