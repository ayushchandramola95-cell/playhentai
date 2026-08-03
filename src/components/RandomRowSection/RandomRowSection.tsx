'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import styles from './RandomRowSection.module.css';

interface RandomRowSectionProps {
  seriesPool: any[];
}

export default function RandomRowSection({ seriesPool }: RandomRowSectionProps) {
  const [items, setItems] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const totalDots = 5;

  const shuffleArray = (array: any[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useEffect(() => {
    if (seriesPool && seriesPool.length > 0) {
      setItems(shuffleArray(seriesPool).slice(0, 15));
    }
  }, [seriesPool]);

  const handleShuffle = () => {
    if (seriesPool && seriesPool.length > 0) {
      setItems(shuffleArray(seriesPool).slice(0, 15));
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  };

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
  }, [items]);

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

  if (!items || items.length === 0) return null;

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerRow}>
        <div className={styles.headerTitles}>
          <h2 className={styles.sectionTitle}>Random</h2>
          <span className={styles.sectionSubtitle}>FEELIN' LUCKY</span>
        </div>

        <div className={styles.headerControls}>
          <button
            type="button"
            onClick={handleShuffle}
            className={styles.shuffleBtn}
            aria-label="Shuffle random series"
          >
            <Shuffle size={14} />
            <span>SHUFFLE</span>
          </button>
          
          <Link href="/random" className={styles.viewAllBtn}>
            ALL
          </Link>

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

      <div className={styles.scrollWrapper}>
        <div className={styles.scrollContainer} ref={scrollRef} onScroll={checkScroll}>
          {items.map((item) => (
            <div key={item.id} className={styles.seriesItem}>
              <SeriesCard item={item} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.indicatorRow}>
        {Array.from({ length: totalDots }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`${styles.indicatorDash} ${idx === activeIndex ? styles.activeDash : ''}`}
            onClick={() => handleDotClick(idx)}
            aria-label={`Go to slide page ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
