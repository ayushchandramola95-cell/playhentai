'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import SeriesCard, { SeriesItem } from '../SeriesCard/SeriesCard';
import styles from './SimilarTitles.module.css';

interface SimilarTitlesProps {
  list: SeriesItem[];
}

export default function SimilarTitles({ list }: SimilarTitlesProps) {
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
      // Run initial check once mounted
      // Use short delay to ensure browser layout completed
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
      const scrollAmount = 400; // scrolls roughly 2 cards
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
          <Compass size={22} className={styles.headerIcon} />
          <h2>Similar Titles</h2>
        </div>
      </div>

      <div className={styles.similarGridWrapper}>
        {/* Left Arrow */}
        {showLeftArrow && (
          <button 
            className={`${styles.scrollArrow} ${styles.leftArrow}`} 
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Similar Scroll Grid */}
        <div className={styles.similarGrid} ref={scrollContainerRef}>
          {list.map((series) => (
            <SeriesCard key={series.id} item={series} />
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button 
            className={`${styles.scrollArrow} ${styles.rightArrow}`} 
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </section>
  );
}
