'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, ChevronLeft, ChevronRight, Star, Eye, Layers, CheckCircle2, Heart, Sparkles } from 'lucide-react';
import WatchlistToggle from '../WatchlistToggle/WatchlistToggle';
import { getR2Url } from '@/utils/r2';
import styles from './HeroCarousel.module.css';

function formatViews(views?: number): string {
  if (views === undefined || views === null || views === 0) return '71.2K';
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

function formatReleaseText(releaseDate?: string | null, releaseYear?: number | string | null): string {
  if (releaseDate) {
    const time = new Date(releaseDate).getTime();
    if (!isNaN(time) && time > 0) {
      const diffMs = Date.now() - time;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      }
      return `${new Date(time).getFullYear()}`;
    }
  }
  if (releaseYear) return `${releaseYear}`;
  return '3 weeks ago';
}

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key?: string;
  cover_image_key?: string;
  banner_image_key?: string;
  episode_thumbnail?: string;
  tags?: string[];
  category?: string;
  firstEpisodeId?: string | null;
  tagline?: string;
  rating?: number | null;
  views?: number;
  studio?: string | null;
  release_year?: number | string | null;
  release_date?: string | null;
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

  // Autoplay timer (auto-scrolls continuously and syncs with progress bar)
  useEffect(() => {
    if (totalSlides <= 1 || autoplaySpeed <= 0) return;

    if (!isPaused) {
      const timer = setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % totalSlides);
      }, autoplaySpeed);

      return () => clearTimeout(timer);
    }
  }, [totalSlides, isPaused, autoplaySpeed, currentIndex]);

  // Scroll active thumbnail smoothly into view inside horizontal track ONLY (never moves or scrolls the page window)
  useEffect(() => {
    const track = thumbTrackRef.current;
    if (!track) return;
    const activeEl = track.children[currentIndex] as HTMLElement | undefined;
    if (activeEl) {
      const trackWidth = track.clientWidth;
      const elOffsetLeft = activeEl.offsetLeft;
      const elWidth = activeEl.clientWidth;
      const targetScrollLeft = elOffsetLeft - (trackWidth / 2) + (elWidth / 2);

      track.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
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

  const sectionRef = useRef<HTMLElement | null>(null);
  const cardStackRef = useRef<HTMLDivElement | null>(null);
  const isHoveringCardRef = useRef(false);

  // Background parallax + subtle ambient tilt across hero section
  const handleSectionMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const heroNormX = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to +1
    const heroNormY = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to +1

    // Subtle, elegant background parallax drift
    const bgX = heroNormX * -8;
    const bgY = heroNormY * -5;
    sectionRef.current.style.setProperty('--bg-parallax-x', `${bgX.toFixed(2)}px`);
    sectionRef.current.style.setProperty('--bg-parallax-y', `${bgY.toFixed(2)}px`);

    // Very subtle ambient tilt when moving outside the card
    if (!isHoveringCardRef.current && cardStackRef.current) {
      const ambientTiltX = 2 - heroNormY * 1.5;
      const ambientTiltY = -6 + heroNormX * 1.5;
      cardStackRef.current.style.setProperty('--card-tilt-x', `${ambientTiltX.toFixed(2)}deg`);
      cardStackRef.current.style.setProperty('--card-tilt-y', `${ambientTiltY.toFixed(2)}deg`);
      cardStackRef.current.style.setProperty('--card-transition', '0.25s cubic-bezier(0.16, 1, 0.3, 1)');
    }
  };

  const handleSectionMouseLeave = () => {
    setIsPaused(false);
    if (sectionRef.current) {
      sectionRef.current.style.setProperty('--bg-parallax-x', '0px');
      sectionRef.current.style.setProperty('--bg-parallax-y', '0px');
    }
    if (!isHoveringCardRef.current && cardStackRef.current) {
      cardStackRef.current.style.setProperty('--card-tilt-x', '2deg');
      cardStackRef.current.style.setProperty('--card-tilt-y', '-6deg');
      cardStackRef.current.style.setProperty('--card-lift', '0px');
      cardStackRef.current.style.setProperty('--card-transition', '0.65s cubic-bezier(0.2, 0.7, 0.2, 1)');
    }
  };

  // Subtle, tactile 3D Corner & Edge Pressing Physics on Card Stack
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardStackRef.current) return;
    isHoveringCardRef.current = true;
    const rect = cardStackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const normX = (x - 0.5) * 2; // -1 (left) to +1 (right)
    const normY = (y - 0.5) * 2; // -1 (top) to +1 (bottom)

    // Refined subtle tilt mechanics:
    // Gentle 6deg maximum tilt that softly presses down corners and edges under cursor
    const maxTilt = 6;
    const tiltX = 2 - normY * maxTilt;
    const tiltY = -6 + normX * maxTilt;

    cardStackRef.current.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
    cardStackRef.current.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
    cardStackRef.current.style.setProperty('--card-lift', '6px');
    cardStackRef.current.style.setProperty('--card-shine-opacity', '0.55');
    cardStackRef.current.style.setProperty('--card-shine-x', `${(x * 100).toFixed(1)}%`);
    cardStackRef.current.style.setProperty('--card-shine-y', `${(y * 100).toFixed(1)}%`);
    cardStackRef.current.style.setProperty('--card-transition', '0.16s cubic-bezier(0.16, 1, 0.3, 1)');
  };

  const handleCardMouseEnter = () => {
    isHoveringCardRef.current = true;
    setIsPaused(true);
  };

  const handleCardMouseLeave = () => {
    isHoveringCardRef.current = false;
    setIsPaused(false);
    if (!cardStackRef.current) return;
    cardStackRef.current.style.setProperty('--card-tilt-x', '2deg');
    cardStackRef.current.style.setProperty('--card-tilt-y', '-6deg');
    cardStackRef.current.style.setProperty('--card-lift', '0px');
    cardStackRef.current.style.setProperty('--card-shine-opacity', '0');
    cardStackRef.current.style.setProperty('--card-transition', '0.65s cubic-bezier(0.2, 0.7, 0.2, 1)');
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

  const currentCoverUrl = getR2Url(currentSeries.episode_thumbnail || currentSeries.cover_image_key || currentSeries.poster_image_key || currentSeries.banner_image_key, 'cover');
  const nextCoverUrl = getR2Url(nextSeries.episode_thumbnail || nextSeries.cover_image_key || nextSeries.poster_image_key || nextSeries.banner_image_key, 'cover');

  return (
    <section 
      ref={sectionRef}
      className={styles.heroSection}
      onMouseMove={handleSectionMouseMove}
      onMouseLeave={handleSectionMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Spotlight Featured Carousel"
    >
      {/* Background Banner Slides with Atmospheric Blur & Gradient Masks */}
      <div className={styles.slidesContainer}>
        {activeSeries.map((series, index) => {
          const isActive = index === currentIndex;
          const bannerKey = series.episode_thumbnail || series.banner_image_key || series.cover_image_key || series.poster_image_key;
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
                {formatReleaseText(currentSeries.release_date, currentSeries.release_year)}
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
                  <Heart size={13} fill="#ff2e7e" color="#ff2e7e" className={styles.statIcon} />
                  <span>
                    {Math.max(12, Math.floor((currentSeries.views || 600) / 85))}
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
                <span className={styles.allEpisodesTextDesktop}>All episodes</span>
                <span className={styles.allEpisodesTextMobile}>Episodes</span>
              </Link>

              <div className={styles.watchlistWrapper}>
                <WatchlistToggle seriesId={currentSeries.id} variant="hero" />
              </div>
            </div>

            {/* Mobile-only Slide Indicator Dots & Chevrons (Ultra-compact, cleanly centered) */}
            {totalSlides > 1 && (
              <div className={styles.mobilePaginationContainer} aria-label="Carousel navigation">
                <button 
                  type="button" 
                  onClick={handlePrev} 
                  className={styles.mobileNavArrow}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className={styles.mobileDotsTrack}>
                  {activeSeries.map((item, idx) => {
                    const isItemActive = idx === currentIndex;
                    return (
                      <button
                        key={item.id || idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`${styles.mobileDot} ${isItemActive ? styles.mobileDotActive : ''}`}
                        aria-label={`Slide ${idx + 1}`}
                      >
                        {isItemActive && <span key={currentIndex} className={styles.mobileDotProgress} />}
                      </button>
                    );
                  })}
                </div>

                <button 
                  type="button" 
                  onClick={handleNext} 
                  className={styles.mobileNavArrow}
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Bottom Mini Thumbnails Strip ("Latest uploads") - Desktop & Tablet */}
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
                    const thumbImg = getR2Url(item.episode_thumbnail || item.cover_image_key || item.poster_image_key || item.banner_image_key, 'cover');
                    
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
                          sizes="(max-width: 768px) 140px, 220px"
                          className={styles.thumbImage}
                          unoptimized={typeof thumbImg === 'string' && thumbImg.startsWith('data:')}
                        />
                        <div className={styles.thumbShade} />
                        {isItemActive && <span key={currentIndex} className={styles.thumbProgressBar} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Layered Floating Spotlight Card Stack with Interactive 3D Physics */}
          <div className={styles.rightColumn}>
            <div 
              ref={cardStackRef}
              className={styles.cardStack}
              onMouseMove={handleCardMouseMove}
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
            >
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
              <Link 
                key={currentSeries.id || currentIndex}
                href={currentWatchLink} 
                className={styles.frontCard} 
                aria-label={`Watch ${currentSeries.title}`}
              >
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
                <div className={styles.cardShine} aria-hidden="true" />

                {/* Mobile Spotlight Corner Tag */}
                <div className={styles.cardCornerBadge}>
                  <Sparkles size={11} className={styles.cornerSparkle} />
                  <span>SPOTLIGHT</span>
                </div>

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
