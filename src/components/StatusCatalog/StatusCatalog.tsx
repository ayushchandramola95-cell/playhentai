import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle2, ChevronLeft, ChevronRight, Activity, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { MOCK_SERIES } from '@/utils/mockData';
import styles from './StatusCatalog.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;

export async function fetchSeriesByStatus(status: string): Promise<any[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from('series')
      .select(`
        *,
        seasons (
          is_published,
          season_number,
          episodes (
            id,
            is_published,
            episode_number
          )
        )
      `)
      .eq('is_published', true)
      .ilike('status', status);

    if (data && data.length > 0) {
      return data.sort((a: any, b: any) => {
        const aTime = a.first_air_date ? new Date(a.first_air_date).getTime() : 0;
        const bTime = b.first_air_date ? new Date(b.first_air_date).getTime() : 0;

        if (aTime !== bTime) {
          return bTime - aTime;
        }
        
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });
    }

    // Fallback: If no exact status match, return all published series
    const { data: fallbackData } = await supabase
      .from('series')
      .select(`*`)
      .eq('is_published', true);

    if (fallbackData && fallbackData.length > 0) {
      return fallbackData;
    }
  } catch {
    // fallback
  }

  return MOCK_SERIES;
}

export function buildStatusMetadata(status: string, count: number): Metadata {
  const capStatus = status === 'ongoing' ? 'Ongoing' : status === 'completed' ? 'Completed' : 'Upcoming';
  const routePath = `/${status.toLowerCase()}`;
  const title = `${capStatus} Hentai Anime Series | PlayHentai`;
  let description = `Browse all ${count} ${status} hentai anime series available to stream in HD on PlayHentai.`;

  if (status === 'completed') {
    description = `Browse ${count} completed hentai anime series available to stream in 1080p HD. Watch full finished series from start to finish on PlayHentai.`;
  } else if (status === 'ongoing') {
    description = `Browse ${count} ongoing hentai anime series with fresh airing episode releases available to stream in 1080p HD on PlayHentai.`;
  } else if (status === 'upcoming') {
    description = `Browse ${count} upcoming hentai anime series scheduled for release soon. Check premiere dates and scheduled releases on PlayHentai.`;
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
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
      return `Explore all ${totalCount} completed hentai anime series on PlayHentai. These series are fully finalized and ready for high-fidelity 1080p streaming.`;
    }
    if (normalizedStatus === 'ongoing') {
      return `Explore all ${totalCount} ongoing hentai anime series currently airing on PlayHentai. Stay updated with the latest episodes and airing releases.`;
    }
    return `Explore all ${totalCount} upcoming hentai anime series scheduled for release soon. Stay tuned for upcoming premiere dates and trailers.`;
  })();

  return (
    <div className={styles.container}>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} />

      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{capStatus}</span>
        </nav>

        <div className={styles.titleRow}>
          <StatusIcon size={28} className={styles.statusIcon} />
          <h1 className={styles.pageTitle}>{capStatus} Hentai Titles</h1>
          <span className={styles.countBadge}>
            {totalCount} {totalCount === 1 ? 'Series' : 'Series'}
          </span>
        </div>
      </div>

      {/* SEO Intro */}
      <div className={styles.seoIntro}>
        <h2 className={styles.seoIntroTitle}>{capStatus} Anime Releases</h2>
        <p className={styles.seoIntroText}>
          {introText} All titles are streamable in 1080p HD with fast cloud playback.
        </p>
      </div>

      {/* Series Grid Header */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <StatusIcon size={16} />
          All {capStatus} Series
        </h3>
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
