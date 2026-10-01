'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Play } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './ThreeDCard.module.css';

function formatViews(views?: number): string {
  if (views === undefined || views === null) return '0';
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

export interface ThreeDCardProps {
  id: string;
  title: string;
  thumbnail_key?: string | null;
  views?: number;
  watchUrl: string;
  tag?: string;
  priority?: boolean;
  className?: string;
  'data-is-episode'?: boolean;
  'data-is-3d'?: boolean;
}

export default function ThreeDCard({
  id,
  title,
  thumbnail_key,
  views = 0,
  watchUrl,
  tag = '3D',
  priority = false,
  className = '',
  'data-is-episode': dataIsEpisode = true,
  'data-is-3d': dataIs3D = true,
}: ThreeDCardProps) {
  const imageUrl = getR2Url(thumbnail_key, 'thumbnail');

  return (
    <Link
      href={watchUrl}
      className={`${styles.card} ${className}`}
      data-is-episode={dataIsEpisode}
      data-is-3d={dataIs3D}
      title={title}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={imageUrl}
          alt={`Watch ${title} in 3D HD`}
          fill
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={styles.image}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          unoptimized={typeof imageUrl === 'string' && imageUrl.startsWith('data:')}
        />
        <div className={styles.gradientOverlay} />
        <div className={styles.playOverlay}>
          <Play size={32} fill="white" className={styles.playIcon} />
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.metaRow}>
          <span className={styles.badge}>{tag}</span>
          <span className={styles.dot}>•</span>
          <div className={styles.viewsRow}>
            <Eye size={12} />
            <span>{formatViews(views)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
