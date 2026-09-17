import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle2, ChevronLeft, ChevronRight, Activity, Calendar } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { MOCK_SERIES } from '@/utils/mockData';
import styles from './StatusCatalog.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;

import { getLocalSeriesByStatus } from '@/utils/localCatalogStore';

export async function fetchSeriesByStatus(status: string): Promise<any[]> {
  try {
    const list = await getLocalSeriesByStatus(status);
    if (list && list.length > 0) {
      return list;
    }
  } catch {
    // fallback
  }

  return MOCK_SERIES.map((s: any) => ({
    ...s,
    episode_count: s.episode_count || 3,
  }));
}


export function buildStatusMetadata(status: string, count: number): Metadata {
  const capStatus = status === 'ongoing' ? 'Ongoing' : status === 'completed' ? 'Completed' : 'Upcoming';
  const routePath = `/${status.toLowerCase()}`;
  const title = `${capStatus} Hentai Anime Series | Play Hentai`;
  let description = `Browse all ${count} ${status} hentai anime series available to stream in HD on Play Hentai.`;

  if (status === 'completed') {
    description = `Browse ${count} completed hentai anime series available to stream in 1080p HD. Watch full finished series from start to finish on Play Hentai.`;
  } else if (status === 'ongoing') {
    description = `Browse ${count} ongoing hentai anime series with fresh airing episode releases available to stream in 1080p HD on Play Hentai.`;
  } else if (status === 'upcoming') {
    description = `Browse ${count} upcoming hentai anime series scheduled for release soon. Check premiere dates and scheduled releases on Play Hentai.`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: routePath,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${routePath}`,
      siteName: 'Play Hentai',
      type: 'website',
      images: [
        {
          url: `${SITE_URL}/og-banner.png`,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-banner.png`],
    },
  };
}

interface StatusCatalogProps {
  status: 'upcoming' | 'ongoing' | 'completed';
  searchParams?: { page?: string };
}

export default async function StatusCatalog({ status, searchParams }: StatusCatalogProps) {
  const sp = searchParams || {};
  const page = Math.max(1, parseInt(sp.page || '1', 10));
  const normalizedStatus = status.toLowerCase();

  const allSeries = await fetchSeriesByStatus(normalizedStatus);
  const totalCount = allSeries.length;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedSeries = allSeries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const capStatus = status === 'ongoing' ? 'Ongoing' : status === 'completed' ? 'Completed' : 'Upcoming';
  const canonicalUrl = `${SITE_URL}/${normalizedStatus}`;

  // Schemas
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': canonicalUrl,
    'url': canonicalUrl,
    'name': `${capStatus} Hentai Anime Series`,
    'itemListElement': allSeries.slice(0, 50).map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': capStatus, 'item': canonicalUrl },
    ],
  };

  const StatusIcon = (() => {
    if (normalizedStatus === 'completed') return CheckCircle2;
    if (normalizedStatus === 'ongoing') return Activity;
    return Calendar;
  })();

  const introText = (() => {
    if (normalizedStatus === 'completed') {
      return `Explore all ${totalCount} completed hentai anime series on Play Hentai. These series are fully finalized and ready for high-fidelity 1080p streaming.`;
    }
    if (normalizedStatus === 'ongoing') {
      return `Explore all ${totalCount} ongoing hentai anime series currently airing on Play Hentai. Stay updated with the latest episodes and airing releases.`;
    }
    return `Explore all ${totalCount} upcoming hentai anime series scheduled for release soon. Stay tuned for upcoming premiere dates and trailers.`;
  })();

  return (
    <div className={styles.container}>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{capStatus}</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={`${styles.statusPill} ${styles[`statusPill_${normalizedStatus}`] || ''}`}>
            <StatusIcon size={13} className={styles.statusIconPill} />
            <span>{capStatus.toUpperCase()} CATALOG</span>
          </span>
          <span className={styles.totalCountText}>
            {totalCount} Total Series
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>{capStatus} Hentai Anime</h1>
        </div>
        <p className={styles.subtext}>
          {introText} All titles are streamable in 1080p HD with fast cloud playback.
        </p>
      </div>

      {/* Series Grid */}
      <div className={styles.seriesGrid}>
        {paginatedSeries.map((item: any) => (
          <SeriesCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          {page > 1 ? (
            <Link href={`/${normalizedStatus}?page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
              <ChevronLeft size={16} /> Prev
            </span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/${normalizedStatus}?page=${page + 1}`} className={styles.pageBtn}>
              Next <ChevronRight size={16} />
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
              Next <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
