'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './series.module.css';

interface SeriesDetails {
  studio?: string;
  releaseDate?: string;
  status?: string;
  runtime?: number | string;
  episodes?: string;
  originalLanguage?: string;
  country?: string;
  contentRating?: string;
  altTitleJapanese?: string;
  altTitleEnglish?: string;
}

interface SynopsisBoxProps {
  description: string;
  details?: SeriesDetails;
}

export default function SynopsisBox({ description, details }: SynopsisBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (description || '').length > 150 || Boolean(details);

  return (
    <div className={styles.synopsisBoxCard}>
      <p className={`${styles.synopsisText} ${!expanded && (description || '').length > 150 ? styles.synopsisCollapsed : ''}`}>
        {description}
      </p>

      {expanded && details && (
        <div className={styles.mobileDetailsExpandedGrid}>
          {details.studio && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>STUDIO</span>
              <span className={styles.mobileDetailVal}>{details.studio}</span>
            </div>
          )}
          {details.releaseDate && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>RELEASE DATE</span>
              <span className={styles.mobileDetailVal}>{details.releaseDate}</span>
            </div>
          )}
          {details.status && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>STATUS</span>
              <span className={styles.mobileDetailVal}>{details.status.toUpperCase()}</span>
            </div>
          )}
          {details.runtime && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>RUNTIME</span>
              <span className={styles.mobileDetailVal}>{details.runtime} min</span>
            </div>
          )}
          {details.episodes && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>EPISODES</span>
              <span className={styles.mobileDetailVal}>{details.episodes}</span>
            </div>
          )}
          {details.originalLanguage && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>LANGUAGE</span>
              <span className={styles.mobileDetailVal}>{details.originalLanguage}</span>
            </div>
          )}
          {details.country && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>COUNTRY</span>
              <span className={styles.mobileDetailVal}>{details.country}</span>
            </div>
          )}
          {details.contentRating && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>RATING</span>
              <span className={styles.mobileDetailVal}>{details.contentRating}</span>
            </div>
          )}
          {details.altTitleJapanese && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>JAPANESE</span>
              <span className={styles.mobileDetailVal}>{details.altTitleJapanese}</span>
            </div>
          )}
          {details.altTitleEnglish && (
            <div className={styles.mobileDetailItem}>
              <span className={styles.mobileDetailKey}>ENGLISH</span>
              <span className={styles.mobileDetailVal}>{details.altTitleEnglish}</span>
            </div>
          )}
        </div>
      )}

      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className={styles.seeMoreBtn}
          type="button"
        >
          <span>{expanded ? 'See Less' : 'See More'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
  );
}
