import React from 'react';
import Link from 'next/link';
import { Flame, Star, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import TrendingGenreSelect from './TrendingGenreSelect';
import styles from './trending.module.css';
import { MOCK_SERIES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { GENRES } from '@/utils/constants';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Trending Hentai Anime Series - PlayHentai',
  description: 'Discover the most popular and trending uncensored hentai anime series right now on PlayHentai.',
  alternates: {
    canonical: '/trending',
  },
  openGraph: {
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}/trending`,
    type: 'website' as const,
  },
};

function getFirstEpisodeId(series: any, isDbEmpty: boolean): string | null {
  if (isDbEmpty) {
    const details = MOCK_SERIES_DETAILS[series.slug];
    if (details && details.seasons?.[0]?.episodes?.[0]) {
      return details.seasons[0].episodes[0].id;
    }
    return null;
  } else {
    if (series.seasons) {
      const activeSeasons = [...series.seasons]
        .filter((sea: any) => sea.is_published)
        .sort((a: any, b: any) => a.season_number - b.season_number);
      for (const season of activeSeasons) {
        if (season.episodes && season.episodes.length > 0) {
          const activeEps = [...season.episodes]
            .filter((ep: any) => ep.is_published)
            .sort((a: any, b: any) => a.episode_number - b.episode_number);
          if (activeEps.length > 0) {
            return activeEps[0].id;
          }
        }
      }
    }
  }
  return null;
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; genre?: string; page?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort || 'views';
  const genreFilter = params.genre || 'all';
  const page = parseInt(params.page || '1', 10);
  const pageSize = 12;

  const supabase = await createClient();
  let seriesList: any[] = [];
  let isDbEmpty = true;

  try {
    const { data: seriesData } = await supabase
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
      .eq('is_published', true);

    if (seriesData && seriesData.length > 0) {
      isDbEmpty = false;
      seriesList = seriesData;
    }
  } catch (err) {
    console.error('Error fetching trending series:', err);
  }

  const rawList = isDbEmpty ? MOCK_SERIES : seriesList;

  // Dynamically extract all unique genres from database catalog & constants
  const allGenreSet = new Set<string>(GENRES.map(g => g.toLowerCase()));
  rawList.forEach((s: any) => {
    (s.tags || []).forEach((t: string) => {
      const cleanTag = t.trim().toLowerCase();
      if (cleanTag && cleanTag !== 'featured' && !cleanTag.startsWith('featured:')) {
        allGenreSet.add(cleanTag);
      }
    });
  });
  const genresList = ['all', ...Array.from(allGenreSet).sort()];

  // Hydrate series items
  let processedList = rawList.map((s, idx) => ({
    ...s,
    views: s.views || Math.max(1200, 18500 - idx * 2400),
    rating: s.rating || parseFloat((9.5 - idx * 0.2).toFixed(1)),
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
  const paginatedItems = processedList.slice(startIndex, startIndex + pageSize);

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Header Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.titleRow}>
          <Flame size={28} className={styles.fireIcon} />
          <h1>Trending & Most Viewed</h1>
        </div>
        <p className={styles.subtitle}>
          Discover the top-rated and most streamed series across our entire catalog.
        </p>

        {/* Filter Controls */}
        <div className={`${styles.filterBar} glass`}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Sort By:</span>
            <div className={styles.chipRow}>
              <Link 
                href={`/trending?sort=views&genre=${genreFilter}`}
                className={`${styles.filterChip} ${sort === 'views' ? styles.activeChip : ''}`}
              >
                <Eye size={14} /> Most Viewed
              </Link>
              <Link 
                href={`/trending?sort=rating&genre=${genreFilter}`}
                className={`${styles.filterChip} ${sort === 'rating' ? styles.activeChip : ''}`}
              >
                <Star size={14} /> Top Rated
              </Link>
              <Link 
                href={`/trending?sort=newest&genre=${genreFilter}`}
                className={`${styles.filterChip} ${sort === 'newest' ? styles.activeChip : ''}`}
              >
                <Flame size={14} /> Newest<span className={styles.desktopOnlyText}> Releases</span>
              </Link>
            </div>
          </div>

          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Genre:</span>
            <TrendingGenreSelect
              currentGenre={genreFilter}
              currentSort={sort}
              genres={genresList}
            />
          </div>
        </div>
      </div>

      {/* Series Grid */}
      {paginatedItems.length > 0 ? (
        <div className={styles.seriesGrid}>
          {paginatedItems.map((item, index) => (
            <div key={item.id} className={styles.rankCardWrapper}>
              <span className={styles.rankBadge}>#{startIndex + index + 1}</span>
              <SeriesCard item={item} />
            </div>
          ))}
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
            <Link href={`/trending?sort=${sort}&genre=${genreFilter}&page=${page - 1}`} className={styles.pageBtn}>
              <ChevronLeft size={16} /> Prev
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}><ChevronLeft size={16} /> Prev</span>
          )}

          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/trending?sort=${sort}&genre=${genreFilter}&page=${page + 1}`} className={styles.pageBtn}>
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
