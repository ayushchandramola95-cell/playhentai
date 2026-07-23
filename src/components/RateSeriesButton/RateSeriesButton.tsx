'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Star, Check, Loader2 } from 'lucide-react';
import styles from './RateSeriesButton.module.css';

interface RateSeriesButtonProps {
  seriesId: string;
  seriesTitle: string;
}

const RATING_LABELS = [
  'Appalling',
  'Horrible',
  'Very Bad',
  'Bad',
  'Average',
  'Fine',
  'Good',
  'Very Good',
  'Great',
  'Masterpiece',
];

export default function RateSeriesButton({ seriesId, seriesTitle }: RateSeriesButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [savedRating, setSavedRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load rating from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`rate-${seriesId}`);
    if (stored) {
      setSavedRating(parseInt(stored, 10));
    }
  }, [seriesId]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
        setSubmitted(false); // Reset submitted state on close
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRate = async (score: number) => {
    setSubmitting(true);
    // Simulate API request delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    localStorage.setItem(`rate-${seriesId}`, score.toString());
    setSavedRating(score);
    setSubmitting(false);
    setSubmitted(true);

    // Auto close popover after success message
    setTimeout(() => {
      setPopoverOpen(false);
      setSubmitted(false);
    }, 1500);
  };

  const handleClearRating = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`rate-${seriesId}`);
    setSavedRating(null);
    setPopoverOpen(false);
  };

  const activeHoverValue = hoveredStar !== null ? hoveredStar : 0;

  return (
    <div className={styles.rateWrapper} ref={popoverRef}>
      <button 
        onClick={() => setPopoverOpen(!popoverOpen)}
        className={`${styles.rateBtn} ${savedRating ? styles.activeRateBtn : ''}`}
        aria-label="Rate this series"
      >
        <Star size={16} fill="currentColor" />
        <span>
          {savedRating ? `You Rated: ${savedRating}/10` : 'Rate this Series'}
        </span>
      </button>

      {popoverOpen && (
        <div className={`${styles.ratePopover} glass`}>
          {submitted ? (
            <div className={styles.successState}>
              <div className={styles.checkmarkCircle}>
                <Check size={20} className={styles.checkmarkIcon} />
              </div>
              <p className={styles.successText}>Rating Saved!</p>
              <p className={styles.successSubtext}>Thank you for your feedback.</p>
            </div>
          ) : submitting ? (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinner} size={28} />
              <p className={styles.loadingText}>Submitting rating...</p>
            </div>
          ) : (
            <div className={styles.ratingState}>
              <h4 className={styles.popoverTitle}>Rate {seriesTitle}</h4>
              
              <div className={styles.starsRow}>
                {Array.from({ length: 10 }).map((_, index) => {
                  const starValue = index + 1;
                  const isGold = activeHoverValue >= starValue || (!hoveredStar && (savedRating || 0) >= starValue);
                  
                  return (
                    <button
                      key={starValue}
                      className={styles.starBtn}
                      onMouseEnter={() => setHoveredStar(starValue)}
                      onMouseLeave={() => setHoveredStar(null)}
                      onClick={() => handleRate(starValue)}
                      title={`${starValue}/10 - ${RATING_LABELS[index]}`}
                    >
                      <Star 
                        size={20} 
                        fill={isGold ? '#eab308' : 'transparent'} 
                        color={isGold ? '#eab308' : 'rgba(255,255,255,0.2)'} 
                        className={styles.starIcon}
                      />
                    </button>
                  );
                })}
              </div>

              <div className={styles.ratingCaption}>
                {activeHoverValue > 0 ? (
                  <span>
                    <strong style={{ color: '#eab308' }}>{activeHoverValue}</strong>/10 - {RATING_LABELS[activeHoverValue - 1]}
                  </span>
                ) : savedRating ? (
                  <span>
                    Current: <strong style={{ color: 'var(--primary)' }}>{savedRating}</strong>/10
                  </span>
                ) : (
                  <span className={styles.mutedText}>Select your rating</span>
                )}
              </div>

              {savedRating && (
                <button onClick={handleClearRating} className={styles.clearBtn}>
                  Clear rating
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
