'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './HorizontalScrollRow.module.css';

interface HorizontalScrollRowProps {
  children: React.ReactNode;
  className?: string;
}

export default function HorizontalScrollRow({ children, className = '' }: HorizontalScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
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

  return (
    <div className={styles.scrollWrapper}>
      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className={`${styles.navButton} ${styles.leftButton}`}
          aria-label="Scroll left"
          type="button"
        >
          <ChevronLeft size={22} />
        </button>
      )}

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

      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className={`${styles.navButton} ${styles.rightButton}`}
          aria-label="Scroll right"
          type="button"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
