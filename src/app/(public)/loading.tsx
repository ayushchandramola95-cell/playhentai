import React from 'react';
import styles from './loading.module.css';

export default function PublicGlobalLoading() {
  return (
    <div className={styles.skeletonWrapper}>
      {/* Featured Banner Skeleton */}
      <div className={styles.seriesHeroBanner} style={{ height: '320px', borderRadius: '16px' }} />

      {/* Row Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem' }}>
        <div className={styles.sectionHeaderSkeleton} style={{ width: '240px' }} />
        <div className={styles.badgeSkeleton} style={{ width: '70px', height: '24px' }} />
      </div>

      {/* Cards Catalog Grid Skeleton */}
      <div className={styles.cardsCatalogGrid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.catalogCardSkeleton} />
        ))}
      </div>
    </div>
  );
}
