import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Hash, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { tagToSlug } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';
import { getSeriesViewsMap } from '@/utils/views';
import styles from './tag.module.css';

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;

const CORE_CATEGORY_SLUGS = new Set([
  'action', 'sci-fi', 'fantasy', 'adventure', 'drama', 'mystery', 
  'romance', 'comedy', 'supernatural', 'slice-of-life', 'harem', 
  'ecchi', 'hentai', 'uncensored', '3d', 'cgi'
]);

import { getLocalDistinctTags, getLocalSeriesByTag } from '@/utils/localCatalogStore';

export const revalidate = 120;

async function getAllDistinctTags(): Promise<string[]> {
  return await getLocalDistinctTags();
}

async function getSeriesByTag(exactTag: string): Promise<any[]> {
  const result = await getLocalSeriesByTag(tagToSlug(exactTag));
  return result.series;
}


export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (CORE_CATEGORY_SLUGS.has(slug.toLowerCase())) {
    return {
      alternates: {
        canonical: `/categories/${slug.toLowerCase()}`,
      },
    };
  }

  const allTags = await getAllDistinctTags();
  const exactTag = allTags.find(t => tagToSlug(t) === slug);

  if (!exactTag) {
    return { title: 'Tag Not Found - Play Hentai' };
  }

  const seriesList = await getSeriesByTag(exactTag);
  const count = seriesList.length;
  const canonicalUrl = `${SITE_URL}/tag/${slug}`;

  const title = `${exactTag} Hentai Anime | Play Hentai`;
  const description = `Browse ${count} ${exactTag.toLowerCase()} hentai anime series with English subtitles in HD. Find completed and ongoing ${exactTag.toLowerCase()} titles on Play Hentai.`;

  const topImgKey = seriesList[0]?.cover_image_key || seriesList[0]?.poster_image_key;
  const ogImageUrl = topImgKey ? getR2Url(topImgKey, 'cover') : `${SITE_URL}/og-banner.png`;

  return {
    title,
    description,
    alternates: {
      canonical: `/tag/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${exactTag} Hentai Anime`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));

  if (CORE_CATEGORY_SLUGS.has(slug.toLowerCase())) {
    redirect(`/categories/${slug.toLowerCase()}`);
  }

  // 1. Get all real tags from DB
  const allTags = await getAllDistinctTags();

  // 2. Find exact DB tag matching this slug — map back to exact original string
  const exactTag = allTags.find(t => tagToSlug(t) === slug);

  // 3. Unknown slug → 404 (prevents Google indexing /tag/abcdefg junk)
  if (!exactTag) {
    notFound();
  }

  // 4. Fetch all series for this tag
  const allSeries = await getSeriesByTag(exactTag);
  const totalCount = allSeries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedSeries = allSeries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const canonicalUrl = `${SITE_URL}/tag/${slug}`;

  // 5. JSON-LD schemas
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': canonicalUrl,
    'url': canonicalUrl,
    'name': `${exactTag} Hentai Anime Series`,
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
      { '@type': 'ListItem', 'position': 2, 'name': exactTag, 'item': canonicalUrl },
    ],
  };

  // 6. SEO intro text — unique per tag
  const statusBreakdown = (() => {
    const completed = allSeries.filter((s: any) => (s.status || '').toLowerCase() === 'completed').length;
    const ongoing = allSeries.filter((s: any) => (s.status || '').toLowerCase() === 'ongoing').length;
    if (completed > 0 && ongoing > 0) return 'a mix of completed and ongoing';
    if (completed > 0) return 'completed';
    if (ongoing > 0) return 'ongoing';
    return 'completed and ongoing';
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
          <span className={styles.breadcrumbCurrent}>{exactTag}</span>
        </nav>

        <div className={styles.titleRow}>
          <Hash size={28} className={styles.tagIcon} />
          <h1 className={styles.pageTitle}>{exactTag}</h1>
          <span className={styles.countBadge}>
            {totalCount} {totalCount === 1 ? 'series' : 'series'}
          </span>
        </div>
      </div>

      {/* SEO Intro — 80-150 words, unique per tag */}
      <div className={styles.seoIntro}>
        <h2 className={styles.seoIntroTitle}>{exactTag} Hentai Anime</h2>
        <p className={styles.seoIntroText}>
          Browse {totalCount} {exactTag.toLowerCase()} hentai anime {totalCount === 1 ? 'series' : 'series'} available on Play Hentai.
          Discover {statusBreakdown} {exactTag.toLowerCase()} series featuring HD streaming and complete episode collections.
          All titles are available to watch instantly — no registration required.
          Use the series cards below to explore the full {exactTag.toLowerCase()} catalog, sorted by popularity.
        </p>
      </div>

      {/* Series Grid */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <Layers size={16} />
          All {exactTag} Series
        </h3>
      </div>

      {paginatedSeries.length > 0 ? (
        <div className={styles.seriesGrid}>
          {paginatedSeries.map((item: any) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Hash size={36} />
          <p>No series found for this tag yet.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          {page > 1 ? (
            <Link href={`/tag/${slug}?page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
              <ChevronLeft size={16} /> Prev
            </span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/tag/${slug}?page=${page + 1}`} className={styles.pageBtn}>
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
