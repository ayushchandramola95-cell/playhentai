'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HorizontalScrollRow.module.css';

interface HorizontalScrollRowProps {
  title?: string;
  subtitle?: string;
  subtitleColor?: string;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export default function HorizontalScrollRow({
  title,
  subtitle,
  subtitleColor,
  viewAllHref,
  children,
  className = '',
}: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const totalDots = 5;

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);

      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const ratio = Math.max(0, Math.min(1, scrollLeft / maxScroll));
        const index = Math.min(Math.floor(ratio * totalDots), totalDots - 1);
        setActiveIndex(index);
      }
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleDotClick = (index: number) => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const targetScroll = (index / (totalDots - 1)) * maxScroll;
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={styles.sectionContainer}>
      {/* Header Row with Title on Left and Controls (ALL, <, >) on Right */}
      {title && (
        <div className={styles.headerRow}>
          <div className={styles.headerTitles}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {subtitle && (
              <span
                className={styles.sectionSubtitle}
                style={subtitleColor ? { color: subtitleColor } : undefined}
              >
                {subtitle}
              </span>
            )}
          </div>

          <div className={styles.headerControls}>
            {viewAllHref && (
              <Link href={viewAllHref} prefetch={false} className={styles.viewAllBtn}>
                ALL
              </Link>
            )}
            <button
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={styles.arrowBtn}
              aria-label="Previous slide"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={styles.arrowBtn}
              aria-label="Next slide"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Content */}
      <div className={styles.scrollWrapper}>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className={`${styles.scrollContainer} ${className}`}
        >
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            const isEpisode = (child.props as any)?.['data-is-episode'] || (child.props as any)?.isEpisode;
            const itemClass = isEpisode ? styles.episodeItem : styles.seriesItem;
            return (
              <div className={`${styles.scrollItem} ${itemClass}`}>
                {child}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dash Slide Indicators below Row */}
      <div className={styles.indicatorRow}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`${styles.indicatorDash} ${i === activeIndex ? styles.activeDash : ''}`}
            aria-label={`Go to slide section ${i + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
