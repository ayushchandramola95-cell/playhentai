import React from 'react';
import styles from '@/app/(public)/loading.module.css';

export default function SeriesLoading() {
  return (
    <div className={styles.skeletonWrapper}>
      {/* Top Banner Skeleton */}
      <div className={styles.seriesHeroBanner} />

      {/* Series Details Top Grid */}
      <div className={styles.seriesTopSection}>
        {/* Left Column: Poster & Action Buttons */}
        <div>
          <div className={styles.seriesPosterSkeleton} />
          <div className={styles.seriesPosterButtons}>
            <div className={styles.seriesActionBtnSkeleton} />
            <div className={styles.seriesActionBtnSkeleton} />
          </div>
          <div style={{ marginTop: '0.45rem', width: '100%', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Right Column: Title, Metadata, Badges, CTA, Tags & Synopsis */}
        <div className={styles.seriesInfoCol}>
          <div className={styles.badgeRow}>
            <div className={styles.badgeSkeleton} />
            <div className={styles.badgeSkeleton} />
            <div className={styles.badgeSkeleton} />
          </div>

          <div className={styles.titleSkeleton} />
          <div className={styles.subtitleSkeleton} />
          <div className={styles.ratingRowSkeleton} />

          {/* Primary CTA Skeleton (Matches DynamicWatchCTA) */}
          <div style={{ height: '48px', width: '100%', maxWidth: '360px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', margin: '0.65rem 0' }} />

          {/* Tag Pills Skeleton (Placed above Synopsis matching real page) */}
          <div className={styles.tagsRowSkeleton}>
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
          </div>

          {/* Synopsis Skeleton Lines */}
          <div className={styles.synopsisSkeleton}>
            <div className={styles.textLineLong} />
            <div className={styles.textLineLong} />
            <div className={styles.textLineMed} />
          </div>
        </div>
      </div>

      {/* Episodes Section Skeleton */}
      <div className={styles.episodesSectionSkeleton}>
        <div className={styles.sectionHeaderSkeleton} />
        <div className={styles.episodesGridSkeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.episodeCardSkeleton} />
          ))}
        </div>
      </div>
    </div>
  );
}
