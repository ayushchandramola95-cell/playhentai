import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, Activity, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './status.module.css';

export const dynamic = 'force-dynamic';

interface StatusPageProps {
  params: Promise<{ status: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;
const VALID_STATUSES = ['completed', 'ongoing', 'upcoming'];

/**
 * Fetch series by status value.
 * Sorted by actual release date (first_air_date) descending, falling back to created_at descending.
 */
async function getSeriesByStatus(status: string): Promise<any[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from('series')
      .select(`
        id, title, slug, description, poster_image_key, cover_image_key,
        banner_image_key, tags, category, views, status, rating,
        release_year, studio, episode_count_override, poster_position,
        first_air_date, created_at,
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
      .eq('status', status);

    if (!data) return [];

    // Custom sorting: first_air_date DESC (nulls last) -> created_at DESC
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
  } catch {
    return [];
  }
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
  const count = seriesList.length;

  if (count === 0) {
    return { title: 'Status Not Found - PlayHentai' };
  }

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

  // 2. Fetch series
  const allSeries = await getSeriesByStatus(normalizedStatus);
  const totalCount = allSeries.length;

  // 3. 404 if no published series match
  if (totalCount === 0) {
    notFound();
  }

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
