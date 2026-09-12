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
        </div>

        {/* Right Column: Title, Metadata, Badges & Synopsis */}
        <div className={styles.seriesInfoCol}>
          <div className={styles.badgeRow}>
            <div className={styles.badgeSkeleton} />
            <div className={styles.badgeSkeleton} />
          </div>

          <div className={styles.titleSkeleton} />
          <div className={styles.subtitleSkeleton} />
          <div className={styles.ratingRowSkeleton} />

          {/* Synopsis Skeleton Lines */}
          <div className={styles.synopsisSkeleton}>
            <div className={styles.textLineLong} />
            <div className={styles.textLineLong} />
            <div className={styles.textLineMed} />
            <div className={styles.textLineShort} />
          </div>

          {/* Tag Pills Skeleton */}
          <div className={styles.tagsRowSkeleton}>
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
            <div className={styles.tagPillSkeleton} />
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
