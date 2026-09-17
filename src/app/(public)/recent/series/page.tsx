import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Play, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalRecentSeries } from '@/utils/localCatalogStore';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES } from '@/utils/mockData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import RecentFilterBar from '@/components/RecentFilterBar/RecentFilterBar';
import { getSiteSettings } from '@/utils/siteSettings';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from '../recent.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const revalidate = 120;

export const metadata = {
  title: 'Recent Series | Play Hentai',
  description: 'Browse the latest added series on Play Hentai, updated daily with high-definition streaming, English subtitles, and complete episode catalogs.',
  alternates: {
    canonical: '/recent/series',
  },
  openGraph: {
    title: 'Recent Series | Play Hentai',
    description: 'Browse the latest added series on Play Hentai, updated daily with high-definition streaming, English subtitles, and complete episode catalogs.',
    url: `${SITE_URL}/recent/series`,
    siteName: 'Play Hentai',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/hero-banner.png`,
        width: 1200,
        height: 630,
        alt: 'Recent Series on Play Hentai',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recent Series | Play Hentai',
    description: 'Browse the latest added series on Play Hentai, updated daily with high-definition streaming, English subtitles, and complete episode catalogs.',
    images: [`${SITE_URL}/hero-banner.png`],
  },
};

const getCachedRecentSeriesData = async () => {
  let siteSortMode = 'latest_episode';

  try {
    const fileContent = getSiteSettings();
    if (fileContent.latest_series_sort_mode) {
      siteSortMode = fileContent.latest_series_sort_mode;
    }
  } catch (fErr) {}

  try {
    const dbSeries = await getLocalRecentSeries(siteSortMode);
    if (dbSeries && dbSeries.length > 0) {
      return { dbSeries, isDbEmpty: false, siteSortMode };
    }
  } catch (err) {
    console.error('Error fetching local recent series:', err);
  }

  return { dbSeries: [], isDbEmpty: true, siteSortMode };
};

export default async function RecentSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string;
    q?: string;
    sort?: string;
    genre?: string;
  }>;
}) {
  const params = await searchParams;
  const rawPage = parseInt(params?.page || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const searchQuery = (params?.q || '').toLowerCase().trim();
  const sortModeOverride = params?.sort || '';
  const selectedGenre = (params?.genre || '').toLowerCase().trim();

  const ITEMS_PER_PAGE = 24; // 4 rows of 6 cards (6-column layout)

  const { dbSeries, isDbEmpty, siteSortMode } = await getCachedRecentSeriesData();
  const effectiveSortMode = sortModeOverride || siteSortMode;

  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  let filtered = [...activeSeries];

  // 1. Search Filter
  if (searchQuery) {
    filtered = filtered.filter(s => 
      (s.title && s.title.toLowerCase().includes(searchQuery)) ||
      (s.description && s.description.toLowerCase().includes(searchQuery)) ||
      (s.slug && s.slug.toLowerCase().includes(searchQuery))
    );
  }

  // 2. Genre Filter
  if (selectedGenre) {
    filtered = filtered.filter(s => 
      s.tags && s.tags.some((t: string) => t.toLowerCase() === selectedGenre)
    );
  }

  // 3. Sorting Filter
  const effectiveSort = sortModeOverride || 'newest';
  filtered.sort((a: any, b: any) => {
    if (effectiveSort === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (effectiveSort === 'title_desc') {
      return (b.title || '').localeCompare(a.title || '');
    } else if (effectiveSort === 'oldest') {
      const dateA = a.latestEpisodeAirDate || a.launchDate || new Date(a.created_at || 0).getTime();
      const dateB = b.latestEpisodeAirDate || b.launchDate || new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    } else {
      // Default & 'newest'
      const dateA = a.latestEpisodeAirDate || a.launchDate || new Date(a.created_at || 0).getTime();
      const dateB = b.latestEpisodeAirDate || b.launchDate || new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    }
  });

  // Calculate Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const currentSeries = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Helper for pagination query string preservation
  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', page.toString());
    if (searchQuery) p.set('q', searchQuery);
    if (sortModeOverride) p.set('sort', sortModeOverride);
    if (selectedGenre) p.set('genre', selectedGenre);
    return `/recent/series?${p.toString()}`;
  };

  // Generate Page Numbers Array
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Recent Series', 'item': `${SITE_URL}/recent/series` }
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Latest Added Hentai Series on Play Hentai',
    'url': `${SITE_URL}/recent/series`,
    'numberOfItems': currentSeries.length,
    'itemListElement': currentSeries.map((item: any, idx: number) => ({
      '@type': 'ListItem',
      'position': startIndex + idx + 1,
      'name': item.title,
      'url': `${SITE_URL}/series/${item.slug}`,
      'image': getR2Url(item.poster_image_key || item.cover_image_key, 'poster'),
      'description': item.description ? item.description.slice(0, 150) : undefined
    }))
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      {/* Ambient Glows */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <section className={styles.section}>
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.9rem', 
              color: 'var(--foreground-muted)', 
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            className="hover-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <TrendingUp size={24} className={styles.sectionIcon} />
            <h1>Recent Series</h1>
            {isDbEmpty && <span className={styles.demoBadge}>DEMO DATA</span>}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
            Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems} Series
          </span>
        </div>

        {/* Filter Controls Bar */}
        <Suspense fallback={null}>
          <RecentFilterBar type="series" />
        </Suspense>

        {currentSeries.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            marginTop: '1rem'
          }} className="glass">
            <TrendingUp size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Series Found</h3>
            <p style={{ color: 'var(--foreground-muted)', maxWidth: '400px', fontSize: '0.9rem' }}>
              No series matched your filter criteria. Try adjusting your search query or clearing active filters.
            </p>
          </div>
        ) : (
          <div className={styles.seriesGrid}>
            {currentSeries.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className={styles.paginationContainer}>
            {/* Prev Button */}
            <Link
              href={validPage > 1 ? buildPageUrl(validPage - 1) : '#'}
              className={`${styles.pageBtn} ${validPage <= 1 ? styles.pageBtnDisabled : ''}`}
              aria-disabled={validPage <= 1}
            >
              <ChevronLeft size={18} />
              <span>Prev</span>
            </Link>

            {/* Page Numbers */}
            {pageNumbers.map((pageNum) => (
              <Link
                key={pageNum}
                href={buildPageUrl(pageNum)}
                className={`${styles.pageBtn} ${pageNum === validPage ? styles.pageBtnActive : ''}`}
              >
                {pageNum}
              </Link>
            ))}

            {/* Next Button */}
            <Link
              href={validPage < totalPages ? buildPageUrl(validPage + 1) : '#'}
              className={`${styles.pageBtn} ${validPage >= totalPages ? styles.pageBtnDisabled : ''}`}
              aria-disabled={validPage >= totalPages}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
