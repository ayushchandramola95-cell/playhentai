'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import SeriesCard, { SeriesItem } from '../SeriesCard/SeriesCard';
import styles from './SimilarTitles.module.css';

interface SimilarTitlesProps {
  list: SeriesItem[];
  title?: string;
}

export default function SimilarTitles({ list, title = 'You May Also Like' }: SimilarTitlesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 15);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      const timer = setTimeout(handleScroll, 200);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, [list]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.75;
      const target = direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;
      container.scrollTo({
        left: target,
        behavior: 'smooth',
      });
    }
  };

  if (!list || list.length === 0) return null;

  return (
    <section className={styles.similarSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderTitle}>
          <div className={styles.iconCircle}>
            <Compass size={18} className={styles.headerIcon} />
          </div>
          <h2>{title}</h2>
          <span className={styles.recBadge}>RECOMMENDED</span>
        </div>
      </div>

      <div className={styles.similarGridWrapper}>
        {/* Left Arrow */}
        {showLeftArrow && (
          <button 
            className={`${styles.scrollArrow} ${styles.leftArrow}`} 
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            type="button"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Similar Scroll Grid */}
        <div className={styles.similarGrid} ref={scrollContainerRef}>
          {list.map((series) => (
            <div key={series.id} className={styles.cardItemWrapper}>
              <SeriesCard item={series} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button 
            className={`${styles.scrollArrow} ${styles.rightArrow}`} 
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            type="button"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </section>
  );
}

