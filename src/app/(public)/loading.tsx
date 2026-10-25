import React from 'react';
import styles from './loading.module.css';

export default function PublicGlobalLoading() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* 1. SEO Header Skeleton */}
      <div className={styles.homeSeoHeaderSkeleton}>
        <div style={{ width: '380px', height: '20px', borderRadius: '4px' }} className={styles.shimmerBase} />
        <div style={{ width: '640px', height: '14px', borderRadius: '4px' }} className={styles.shimmerBase} />
      </div>

      {/* 2. Spotlight Hero Carousel Skeleton */}
      <div style={{ padding: '0 2rem', maxWidth: '1680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className={styles.homeHeroSpotlightSkeleton}>
          <div className={styles.homeHeroLeftCol}>
            <div style={{ width: '120px', height: '26px', borderRadius: '20px' }} className={styles.shimmerBase} />
            <div style={{ width: '85%', height: '44px', borderRadius: '8px' }} className={styles.shimmerBase} />
            <div style={{ width: '70%', height: '18px', borderRadius: '4px' }} className={styles.shimmerBase} />
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
              <div style={{ width: '140px', height: '44px', borderRadius: '30px' }} className={styles.shimmerBase} />
              <div style={{ width: '140px', height: '44px', borderRadius: '30px' }} className={styles.shimmerBase} />
            </div>
          </div>
          <div className={styles.homeHeroRightCol}>
            <div className={styles.homeHeroCardStack} />
          </div>
        </div>
      </div>

      {/* 3. Recent Episodes Grid Skeleton (5 Columns, 16:9 Landscape) */}
      <div className={styles.homeSectionSkeleton}>
        <div className={styles.homeSectionHeaderSkeleton}>
          <div style={{ width: '220px', height: '30px', borderRadius: '6px' }} className={styles.shimmerBase} />
          <div style={{ width: '80px', height: '26px', borderRadius: '6px' }} className={styles.shimmerBase} />
        </div>

        <div className={styles.homeEpisodeGridSkeleton}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={styles.homeEpisodeCardSkeleton}>
              <div className={styles.homeEpisodeThumbSkeleton} />
              <div className={styles.homeEpisodeContentSkeleton}>
                <div style={{ width: '90%', height: '16px', borderRadius: '4px' }} className={styles.shimmerBase} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <div style={{ width: '45px', height: '12px', borderRadius: '3px' }} className={styles.shimmerBase} />
                  <div style={{ width: '60px', height: '14px', borderRadius: '3px' }} className={styles.shimmerBase} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Latest Series Horizontal Scroll Row Skeleton */}
      <div className={styles.homeSectionSkeleton}>
        <div className={styles.homeSectionHeaderSkeleton}>
          <div style={{ width: '240px', height: '30px', borderRadius: '6px' }} className={styles.shimmerBase} />
          <div style={{ width: '80px', height: '26px', borderRadius: '6px' }} className={styles.shimmerBase} />
        </div>

        <div className={styles.homeScrollRowSkeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.homeScrollCardSkeleton} />
          ))}
        </div>
      </div>
    </div>
  );
}
