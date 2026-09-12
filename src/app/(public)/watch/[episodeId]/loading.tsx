import React from 'react';
import { Play } from 'lucide-react';
import styles from '@/app/(public)/loading.module.css';

export default function WatchLoading() {
  return (
    <div className={styles.skeletonWrapper}>
      {/* 2-Column Watch Grid: Player on left, Episode Queue on right */}
      <div className={styles.watchLayoutGrid}>
        {/* Left: Player + Action Bar + Info */}
        <div className={styles.watchPlayerCol}>
          {/* 16:9 Cinematic Video Player Skeleton */}
          <div className={styles.videoPlayerSkeleton}>
            <div className={styles.centerPlayIconGlow}>
              <Play size={28} fill="#fbbf24" color="#fbbf24" style={{ marginLeft: '4px' }} />
            </div>
          </div>

          {/* Title & Action Buttons Bar Skeleton */}
          <div className={styles.watchMetaRow}>
            <div className={styles.watchTitleGroup}>
              <div className={styles.titleSkeleton} style={{ width: '80%', height: '32px' }} />
              <div className={styles.subtitleSkeleton} style={{ width: '45%', height: '20px' }} />
            </div>

            <div className={styles.watchActionButtons}>
              <div className={styles.watchActionBtn} />
              <div className={styles.watchActionBtn} />
              <div className={styles.watchActionBtn} />
            </div>
          </div>

          {/* Series Visual Card Skeleton */}
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: '90px', height: '125px', borderRadius: '8px', flexShrink: 0 }} className={styles.shimmerBase} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <div className={styles.textLineMed} style={{ height: '22px' }} />
              <div className={styles.textLineLong} />
              <div className={styles.textLineShort} />
            </div>
          </div>
        </div>

        {/* Right: Episode Queue Sidebar Skeleton */}
        <div className={styles.watchQueueSidebar}>
          <div className={styles.queueHeaderSkeleton} />
          <div className={styles.queueListSkeleton}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.queueItemSkeleton} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
