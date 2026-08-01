import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, ListOrdered } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './year.module.css';

interface YearPageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;

/**
 * Fetch series released in the given year.
 * Sorted by actual release date (first_air_date) descending, falling back to created_at descending.
 */
async function getSeriesByYear(yearNum: number): Promise<any[]> {
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
      .eq('release_year', yearNum);

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

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year } = await params;
  const yearNum = parseInt(year, 10);

  // Strict validation: if not a number, metadata is minimal (page will 404 anyway)
  if (isNaN(yearNum)) {
    return { title: 'Invalid Year - PlayHentai' };
  }

  const seriesList = await getSeriesByYear(yearNum);
  if (seriesList.length === 0) {
    return { title: 'Year Not Found - PlayHentai' };
  }

  const count = seriesList.length;
  const canonicalUrl = `${SITE_URL}/year/${year}`;
  const title = `${year} Hentai Anime | PlayHentai`;
  const description = `Browse ${count} hentai anime series released in ${year} on PlayHentai. Find completed and ongoing releases from ${year}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/year/${year}`,
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

export default async function YearPage({ params, searchParams }: YearPageProps) {
  const { year } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));

  const yearNum = parseInt(year, 10);

  // 1. Check if year is not a valid number -> return 404
  if (isNaN(yearNum)) {
    notFound();
  }

  // 2. Fetch series by release year
  const allSeries = await getSeriesByYear(yearNum);
  const totalCount = allSeries.length;

  // 3. Check if year has 0 series in the database -> return 404
  if (totalCount === 0) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedSeries = allSeries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const canonicalUrl = `${SITE_URL}/year/${year}`;

  // 4. JSON-LD Schemas
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': canonicalUrl,
    'url': canonicalUrl,
    'name': `${year} Hentai Anime Series`,
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
      { '@type': 'ListItem', 'position': 2, 'name': 'Years', 'item': `${SITE_URL}/categories` },
      { '@type': 'ListItem', 'position': 3, 'name': year, 'item': canonicalUrl },
    ],
  };

  // 5. Dynamic SEO intro statistics
  const completedCount = allSeries.filter((s: any) => (s.status || '').toLowerCase() === 'completed').length;
  const ongoingCount = allSeries.filter((s: any) => (s.status || '').toLowerCase() === 'ongoing').length;

  const completedText = completedCount > 0 ? `${completedCount} completed series` : '';
  const ongoingText = ongoingCount > 0 ? `${ongoingCount} ongoing releases` : '';
  
  const statusSummary = [completedText, ongoingText].filter(Boolean).join(' and ');
  const statusConnector = statusSummary ? `, including ${statusSummary},` : '';

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
          <span>Years</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{year}</span>
        </nav>

        <div className={styles.titleRow}>
          <Calendar size={28} className={styles.calendarIcon} />
          <h1 className={styles.pageTitle}>{year} Releases</h1>
          <span className={styles.countBadge}>
            {totalCount} {totalCount === 1 ? 'series' : 'series'}
          </span>
        </div>
      </div>

      {/* SEO Intro — natural dynamic description based on counts */}
      <div className={styles.seoIntro}>
        <h2 className={styles.seoIntroTitle}>{year} Hentai Anime</h2>
        <p className={styles.seoIntroText}>
          Browse all {totalCount} hentai anime series released in {year}{statusConnector} and newly added titles available in HD on PlayHentai.
          Explore the full {year} release schedule catalog listed below sorted by actual release date.
          All videos are streamable instantly without registration.
        </p>
      </div>

      {/* Series Grid */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <ListOrdered size={16} />
          All {year} Releases
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
            <Link href={`/year/${year}?page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
              <ChevronLeft size={16} /> Prev
            </span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/year/${year}?page=${page + 1}`} className={styles.pageBtn}>
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
