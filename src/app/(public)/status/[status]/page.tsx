import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, Activity, Calendar } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { getSeriesViewsMap } from '@/utils/views';
import styles from './status.module.css';

export const revalidate = 120;

interface StatusPageProps {
  params: Promise<{ status: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;
const VALID_STATUSES = ['completed', 'ongoing', 'upcoming'];

import { getLocalSeriesByStatus } from '@/utils/localCatalogStore';
import { MOCK_SERIES } from '@/utils/mockData';

const getCachedSeriesByStatus = async (status: string): Promise<any[]> => {
  try {
    const list = await getLocalSeriesByStatus(status);
    if (list && list.length > 0) {
      return list;
    }
  } catch {
    // fallback
  }

  return MOCK_SERIES;
};


async function getSeriesByStatus(status: string): Promise<any[]> {
  return await getCachedSeriesByStatus(status);
}

function getCapitalizedStatus(status: string): string {
  if (status === 'ongoing') return 'Ongoing';
  if (status === 'completed') return 'Completed';
  if (status === 'upcoming') return 'Upcoming';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getMetaDescription(status: string, count: number): string {
  if (status === 'completed') {
    return `Browse ${count} completed hentai anime series available to stream in HD. Watch full series from beginning to end on PlayHentai.`;
  }
  if (status === 'ongoing') {
    return `Browse ${count} ongoing hentai anime series with the latest released episodes available to stream in HD on PlayHentai.`;
  }
  if (status === 'upcoming') {
    return `Browse ${count} upcoming hentai anime series, including announced releases and scheduled premiere dates on PlayHentai.`;
  }
  return `Browse ${count} ${status} hentai anime series available to stream in HD on PlayHentai.`;
}

function getIntroText(status: string, count: number): string {
  if (status === 'completed') {
    return `Browse all ${count} completed hentai anime series available to stream in HD on PlayHentai. These series are fully finalized and ready for binge-watching from beginning to end.`;
  }
  if (status === 'ongoing') {
    return `Browse all ${count} ongoing hentai anime series currently airing on PlayHentai. Keep up with the latest episode releases and stream airing titles in HD.`;
  }
  if (status === 'upcoming') {
    return `Browse all ${count} upcoming hentai anime series scheduled for release soon. Check out announced releases, trailers, and scheduled premiere dates on PlayHentai.`;
  }
  return `Explore our catalog of ${count} ${status} hentai anime series on PlayHentai.`;
}

export async function generateMetadata({ params }: StatusPageProps): Promise<Metadata> {
  const { status } = await params;
  const normalizedStatus = status.toLowerCase();

  if (!VALID_STATUSES.includes(normalizedStatus)) {
    return { title: 'Status Not Found - PlayHentai' };
  }

  const seriesList = await getSeriesByStatus(normalizedStatus);
  const count = seriesList.length || 1;

  const capStatus = getCapitalizedStatus(normalizedStatus);
  const title = `${capStatus} Hentai Anime | PlayHentai`;
  const description = getMetaDescription(normalizedStatus, count);
  const canonicalUrl = `${SITE_URL}/status/${normalizedStatus}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/status/${normalizedStatus}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function StatusPage({ params, searchParams }: StatusPageProps) {
  const { status } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));

  const normalizedStatus = status.toLowerCase();

  // 1. Strict status param check
  if (!VALID_STATUSES.includes(normalizedStatus)) {
    notFound();
  }

  // 2. Fetch series (never triggers 404 for valid status routes)
  const allSeries = await getSeriesByStatus(normalizedStatus);
  const totalCount = allSeries.length;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedSeries = allSeries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const capStatus = getCapitalizedStatus(normalizedStatus);
  const canonicalUrl = `${SITE_URL}/status/${normalizedStatus}`;

  // 4. JSON-LD Schemas
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
      { '@type': 'ListItem', 'position': 2, 'name': 'Status', 'item': `${SITE_URL}/categories` },
      { '@type': 'ListItem', 'position': 3, 'name': capStatus, 'item': canonicalUrl },
    ],
  };

  // 5. Header icons
  const StatusIcon = (() => {
    if (normalizedStatus === 'completed') return CheckCircle2;
    if (normalizedStatus === 'ongoing') return Activity;
    return Calendar;
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
          <span>Status</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{capStatus}</span>
        </nav>

        <div className={styles.titleRow}>
          <StatusIcon size={28} className={styles.statusIcon} />
          <h1 className={styles.pageTitle}>{capStatus} Releases</h1>
          <span className={styles.countBadge}>
            {totalCount} {totalCount === 1 ? 'Series' : 'Series'}
          </span>
        </div>
      </div>

      {/* SEO Intro paragraph */}
      <div className={styles.seoIntro}>
        <h2 className={styles.seoIntroTitle}>{capStatus} Hentai Anime</h2>
        <p className={styles.seoIntroText}>
          {getIntroText(normalizedStatus, totalCount)}
          {' '}All titles are fully uncensored and streamable instantly with high-fidelity video quality.
        </p>
      </div>

      {/* Series Grid */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <StatusIcon size={16} />
          All {capStatus} Series
        </h3>
      </div>

      <div className={styles.seriesGrid}>
        {paginatedSeries.map((item: any) => (
          <SeriesCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          {page > 1 ? (
            <Link href={`/status/${normalizedStatus}?page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
              <ChevronLeft size={16} /> Prev
            </span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/status/${normalizedStatus}?page=${page + 1}`} className={styles.pageBtn}>
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
