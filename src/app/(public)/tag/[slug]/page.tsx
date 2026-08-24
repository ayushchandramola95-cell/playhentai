import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Hash, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { tagToSlug } from '@/utils/constants';
import styles from './tag.module.css';

interface TagPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
const PAGE_SIZE = 24;

/**
 * Fetch all distinct tags from published series in Supabase.
 * Returns the exact tag strings as stored in the DB (preserves casing/punctuation).
 */
async function getAllDistinctTags(): Promise<string[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('series')
      .select('tags')
      .eq('is_published', true);

    if (!data) return [];
    const tagSet = new Set<string>();
    data.forEach((row: any) => {
      (row.tags || []).forEach((t: string) => {
        if (t && t.trim()) tagSet.add(t.trim());
      });
    });
    return Array.from(tagSet);
  } catch {
    return [];
  }
}

/**
 * Fetch series that contain the given tag (exact match, case-insensitive via DB filtering).
 */
async function getSeriesByTag(exactTag: string): Promise<any[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Supabase supports array contains via @> operator — filter series whose tags array contains exactTag
    const { data } = await supabase
      .from('series')
      .select(`
        id, title, slug, description, poster_image_key, cover_image_key,
        banner_image_key, tags, category, views, status, rating,
        release_year, studio, episode_count_override, poster_position,
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
      .contains('tags', [exactTag])
      .order('views', { ascending: false, nullsFirst: false });

    return data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;

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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || '1', 10));

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
