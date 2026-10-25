import React from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { Flame, Star, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import TrendingGenreSelect from './TrendingGenreSelect';
import TrendingSortSelect from './TrendingSortSelect';
import styles from './trending.module.css';
import { MOCK_SERIES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { GENRES } from '@/utils/constants';
import { getSeriesViewsMap } from '@/utils/views';
import { getR2Url } from '@/utils/r2';
import JsonLd from '@/components/JsonLd/JsonLd';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 120;

export const metadata = {
  title: 'Trending Hentai Anime – Watch Most Viewed in HD | HentaiKage',
  description: 'Discover and stream the most popular trending hentai anime series online free in full 1080p HD with English subtitles. Updated hourly on HentaiKage.',
  keywords: [
    'trending hentai',
    'popular hentai anime',
    'top rated hentai',
    'watch trending hentai',
    'most viewed hentai',
    'hentaikage',
    'best hentai online'
  ],
  alternates: {
    canonical: '/trending',
  },
  openGraph: {
    title: 'Trending Hentai Anime – Watch Most Viewed in HD | HentaiKage',
    description: 'Discover and stream the most popular trending hentai anime series online free in full 1080p HD with English subtitles. Updated hourly on HentaiKage.',
    url: `${SITE_URL}/trending`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website' as const,
    images: [
      {
        url: `${SITE_URL}/og-banner.png`,
        width: 1200,
        height: 630,
        alt: 'Trending Hentai Anime Series on HentaiKage',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending Hentai Anime – Watch Most Viewed in HD | HentaiKage',
    description: 'Discover and stream the most popular trending hentai anime series online free in full 1080p HD with English subtitles. Updated hourly on HentaiKage.',
    images: [`${SITE_URL}/og-banner.png`],
  },
};

function getFirstEpisodeId(series: any, isDbEmpty: boolean): string | null {
  if (isDbEmpty) {
    const details = MOCK_SERIES_DETAILS[series.slug];
    if (details && details.seasons?.[0]?.episodes?.[0]) {
      return details.seasons[0].episodes[0].id;
    }
    return null;
  }
  return series.firstEpisodeId || null;
}

const getCachedTrendingSeriesData = unstable_cache(
  async (timeframe: '7d' | '30d' | 'all') => {
    try {
      const viewsMap = await getSeriesViewsMap(timeframe);
      const all = await getLocalAllPublishedSeries();
      if (all && all.length > 0) {
        const seriesList = all.map(s => ({
          ...s,
          views: viewsMap[s.id] !== undefined ? viewsMap[s.id] : (s.views || 0)
        }));
        return { seriesList, isDbEmpty: false };
      }
    } catch (err) {
      console.error('Error fetching trending series:', err);
    }

    return { seriesList: [], isDbEmpty: true };
  },
  ['trending-series-data-cache-v2'],
  { revalidate: 120, tags: ['trending_page_series', 'catalog_series'] }
);

const getCachedUniqueGenres = unstable_cache(
  async () => {
    try {
      const all = await getLocalAllPublishedSeries();
      const allGenreSet = new Set<string>(GENRES.map(g => g.toLowerCase()));
      (all || []).forEach((s: any) => {
        (s.tags || []).forEach((t: string) => {
          const cleanTag = t.trim().toLowerCase();
          if (cleanTag && cleanTag !== 'featured' && !cleanTag.startsWith('featured:')) {
            allGenreSet.add(cleanTag);
          }
        });
      });
      return ['all', ...Array.from(allGenreSet).sort()];
    } catch {
      return ['all', ...GENRES.map(g => g.toLowerCase()).sort()];
    }
  },
  ['trending-unique-genres-cache-v2'],
  { revalidate: 3600, tags: ['catalog_genres'] }
);

function sanitizeTrendingCard(item: any) {
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
    firstEpisodeId: item.firstEpisodeId || null,
  };
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string; sort?: string; genre?: string; page?: string }>;
}) {
  const params = await searchParams;
  const timeframe = (params.timeframe === '30d' || params.timeframe === 'all' || params.timeframe === '7d')
    ? params.timeframe
    : '7d';
  const sort = params.sort || 'views';
  const genreFilter = params.genre || 'all';
  const page = parseInt(params.page || '1', 10);
  const pageSize = 24; // 4 rows x 6 columns

  const [{ seriesList, isDbEmpty }, genresList] = await Promise.all([
    getCachedTrendingSeriesData(timeframe),
    getCachedUniqueGenres()
  ]);

  const rawList = isDbEmpty ? MOCK_SERIES : seriesList;

  // Hydrate series items
  let processedList = rawList.map((s, idx) => ({
    ...s,
    views: s.views || 0,
    rating: s.rating,
    firstEpisodeId: getFirstEpisodeId(s, isDbEmpty)
  }));

  // Filter by genre
  if (genreFilter !== 'all') {
    processedList = processedList.filter((s: any) =>
      (s.tags || []).some((t: string) => t.toLowerCase() === genreFilter.toLowerCase())
    );
  }

  // Sort by filter
  if (sort === 'rating') {
    processedList.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'newest') {
    processedList.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  } else {
    // Default: Sort by views
    processedList.sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
  }

  // Pagination calculations
  const totalCount = processedList.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedRaw = processedList.slice(startIndex, startIndex + pageSize);
  const paginatedItems = paginatedRaw.map(sanitizeTrendingCard);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Trending Series', 'item': `${SITE_URL}/trending` }
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Trending Hentai Anime Series on HentaiKage',
    'url': `${SITE_URL}/trending`,
    'numberOfItems': paginatedItems.length,
    'itemListElement': paginatedItems.map((item: any, idx: number) => ({
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
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Trending</span>
      </nav>

      {/* Header Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.headerTopMeta}>
          <span className={styles.trendingHighlightPill}>
            <Flame size={13} className={styles.fireIconPill} /> LIVE LEADERBOARD
          </span>
          <span className={styles.totalCountText}>
            Showing {totalCount > 0 ? `${startIndex + 1}–${Math.min(startIndex + pageSize, totalCount)}` : 0} of {totalCount} Series
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>Trending &amp; Most Viewed</h1>
        </div>
        <p className={styles.subtitle}>
          Discover the top-rated and most streamed hentai anime series across our entire catalog.
        </p>

        {/* Filter Controls */}
        <div className={`${styles.filterBar} glass`}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Trending:</span>
            <div className={styles.chipRow}>
              <Link 
                href={`/trending?timeframe=7d&sort=${sort}&genre=${genreFilter}`}
                className={`${styles.filterChip} ${timeframe === '7d' ? styles.activeChip : ''}`}
              >
                7 Days
              </Link>
              <Link 
                href={`/trending?timeframe=30d&sort=${sort}&genre=${genreFilter}`}
                className={`${styles.filterChip} ${timeframe === '30d' ? styles.activeChip : ''}`}
              >
                30 Days
              </Link>
              <Link 
                href={`/trending?timeframe=all&sort=${sort}&genre=${genreFilter}`}
                className={`${styles.filterChip} ${timeframe === 'all' ? styles.activeChip : ''}`}
              >
                All Time
              </Link>
            </div>
          </div>

          <div className={styles.rightFiltersGroup}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sort By:</span>
              <TrendingSortSelect
                currentSort={sort}
                currentGenre={genreFilter}
                currentTimeframe={timeframe}
              />
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Genre:</span>
              <TrendingGenreSelect
                currentGenre={genreFilter}
                currentSort={sort}
                currentTimeframe={timeframe}
                genres={genresList}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Series Grid */}
      {paginatedItems.length > 0 ? (
        <div className={styles.seriesGrid}>
          {paginatedItems.map((item, index) => {
            const rankNum = startIndex + index + 1;
            let rankBadgeClass = styles.rankBadge;
            if (rankNum === 1) rankBadgeClass = `${styles.rankBadge} ${styles.rankGold}`;
            else if (rankNum === 2) rankBadgeClass = `${styles.rankBadge} ${styles.rankSilver}`;
            else if (rankNum === 3) rankBadgeClass = `${styles.rankBadge} ${styles.rankBronze}`;

            return (
              <div key={item.id} className={styles.rankCardWrapper}>
                <span className={rankBadgeClass}>
                  {rankNum === 1 ? '👑 #1' : rankNum === 2 ? '🥈 #2' : rankNum === 3 ? '🥉 #3' : `#${rankNum}`}
                </span>
                <SeriesCard item={item} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Filter size={32} style={{ color: 'var(--foreground-muted)' }} />
          <p>No trending titles found matching your active filters.</p>
          <Link href="/trending" className={styles.resetBtn}>Reset Filters</Link>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          {page > 1 ? (
            <Link href={`/trending?timeframe=${timeframe}&sort=${sort}&genre=${genreFilter}&page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}><ChevronLeft size={16} /> Prev</span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/trending?timeframe=${timeframe}&sort=${sort}&genre=${genreFilter}&page=${page + 1}`} className={styles.pageBtn}>
              Next <ChevronRight size={16} />
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>Next <ChevronRight size={16} /></span>
          )}
        </div>
      )}
    </div>
  );
}
