'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Play } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './UncensoredCard.module.css';

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

export interface UncensoredCardProps {
  id: string;
  title: string;
  studio?: string | null;
  poster_image_key?: string | null;
  views?: number;
  href: string;
  priority?: boolean;
  className?: string;
}

export default function UncensoredCard({
  id,
  title,
  studio,
  poster_image_key,
  views = 0,
  href,
  priority = false,
  className = '',
}: UncensoredCardProps) {
  const posterUrl = getR2Url(poster_image_key, 'poster');

  return (
    <div className={`${styles.card} ${className}`}>
      <Link href={href} className={styles.posterWrapper} title={title}>
        <Image
          src={posterUrl}
          alt={`Watch ${title} Uncensored in HD`}
          fill
          sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, (max-width: 1200px) 20vw, 16vw"
          className={styles.posterImage}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          unoptimized={typeof posterUrl === 'string' && posterUrl.startsWith('data:')}
        />
        <div className={styles.playOverlay}>
          <Play size={34} fill="white" className={styles.playIcon} />
        </div>
      </Link>

      <div className={styles.metaContent}>
        <h4 className={styles.title} title={title}>
          <Link href={href}>{title}</Link>
        </h4>
        <div className={styles.bottomMeta}>
          <div className={styles.viewsRow}>
            <Eye size={12} className={styles.eyeIcon} />
            <span>{formatViews(views)}</span>
          </div>
          {studio && (
            <span className={styles.studio} title={studio}>
              {studio}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
