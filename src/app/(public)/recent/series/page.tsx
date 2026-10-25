import React, { Suspense } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalRecentSeries } from '@/utils/localCatalogStore';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES } from '@/utils/mockData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import RecentFilterBar from '@/components/RecentFilterBar/RecentFilterBar';
import { getSiteSettings } from '@/utils/siteSettings';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from '../recent.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 120;

export const metadata = {
  title: 'New Hentai Anime Series – Watch Free in 1080p HD | HentaiKage',
  description: 'Browse the newest added hentai anime series online free in full 1080p HD with English subtitles. Complete episode catalogs and new releases on HentaiKage.',
  keywords: [
    'new hentai series',
    'recent hentai anime',
    'latest hentai releases',
    'watch new hentai',
    'hentaikage',
    'uncensored anime series',
    'complete anime catalogs'
  ],
  alternates: {
    canonical: '/recent/series',
  },
  openGraph: {
    title: 'New Hentai Anime Series – Watch Free in 1080p HD | HentaiKage',
    description: 'Browse the newest added hentai anime series online free in full 1080p HD with English subtitles. Complete episode catalogs and new releases on HentaiKage.',
    url: `${SITE_URL}/recent/series`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/hero-banner.png`,
        width: 1200,
        height: 630,
        alt: 'Recent Series on HentaiKage',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Hentai Anime Series – Watch Free in 1080p HD | HentaiKage',
    description: 'Browse the newest added hentai anime series online free in full 1080p HD with English subtitles. Complete episode catalogs and new releases on HentaiKage.',
    images: [`${SITE_URL}/hero-banner.png`],
  },
};

const getCachedRecentSeriesData = unstable_cache(
  async () => {
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
  },
  ['recent-series-page-cache-v1'],
  { revalidate: 120, tags: ['recent_series_page', 'catalog_series'] }
);

function sanitizeSeriesCard(item: any) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description || '',
    poster_image_key: item.poster_image_key,
    cover_image_key: item.cover_image_key,
    poster_position: item.poster_position,
    tags: item.tags || [],
    category: item.category || '',
    studio: item.studio || '',
    release_year: item.release_year || item.releaseYear,
    releaseYear: item.releaseYear || item.release_year,
    status: item.status || '',
    content_rating: item.content_rating || '',
    views: item.views || 0,
    rating: item.rating,
  };
}

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

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRaw = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const paginated = paginatedRaw.map(sanitizeSeriesCard);

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
    'name': 'Recent Hentai Anime Series on HentaiKage',
    'url': `${SITE_URL}/recent/series`,
    'numberOfItems': paginated.length,
    'itemListElement': paginated.map((item: any, idx: number) => ({
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
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className={styles.crumbDivider}>/</span>
          <span className={styles.activeCrumb}>Series</span>
        </nav>

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

        {/* Series Grid */}
        {paginated.length > 0 ? (
          <div className={styles.seriesGrid}>
            {paginated.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No series found matching your active search or filters.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            {currentPage > 1 ? (
              <Link 
                href={`/recent/series?page=${currentPage - 1}&q=${encodeURIComponent(searchQuery)}&sort=${effectiveSortMode}&genre=${selectedGenre}`}
                className={styles.pageBtn}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </Link>
            ) : (
              <span className={`${styles.pageBtn} ${styles.disabled}`}>
                <ChevronLeft size={16} />
                <span>Prev</span>
              </span>
            )}

            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link 
                href={`/recent/series?page=${currentPage + 1}&q=${encodeURIComponent(searchQuery)}&sort=${effectiveSortMode}&genre=${selectedGenre}`}
                className={styles.pageBtn}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className={`${styles.pageBtn} ${styles.disabled}`}>
                <span>Next</span>
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
