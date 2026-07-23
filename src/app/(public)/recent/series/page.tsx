import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Play, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES } from '@/utils/mockData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import RecentFilterBar from '@/components/RecentFilterBar/RecentFilterBar';
import styles from '../recent.module.css';

export const metadata = {
  title: 'Recent Series - PlayHentai',
  description: 'Browse the latest added series on PlayHentai, updated daily with high-quality content.',
  alternates: {
    canonical: '/recent/series',
  },
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

  const ITEMS_PER_PAGE = 20; // 4 rows of 5 cards

  const supabase = await createClient();
  let dbSeries: any[] = [];
  let isDbEmpty = true;

  try {
    let siteSortMode = 'latest_episode';
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
      if (fs.existsSync(filePath)) {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (fileContent.latest_series_sort_mode) {
          siteSortMode = fileContent.latest_series_sort_mode;
        }
      }
    } catch (fErr) {}

    try {
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'latest_series_sort_mode')
        .maybeSingle();

      if (settingsData && settingsData.value) {
        siteSortMode = settingsData.value;
      }
    } catch (sErr) {
      // Fallback
    }

    const effectiveSortMode = sortModeOverride || siteSortMode;

    const { data: seriesData } = await supabase
      .from('series')
      .select(`
        *,
        seasons (
          is_published,
          episodes (
            is_published,
            release_date,
            created_at
          )
        )
      `)
      .eq('is_published', true);

    if (seriesData && seriesData.length > 0) {
      dbSeries = seriesData
        .filter((s: any) => s.status !== 'upcoming')
        .map((s: any) => {
          let latestEpisodeAirDate = 0;
          let fallbackSeriesDate = new Date(s.first_air_date || s.release_date || s.created_at || 0).getTime();
          if (isNaN(fallbackSeriesDate)) fallbackSeriesDate = 0;
          if (fallbackSeriesDate === 0 && s.release_year) {
            fallbackSeriesDate = new Date(`${s.release_year}-01-01`).getTime();
          }
          
          if (s.seasons) {
            s.seasons.forEach((season: any) => {
              if (season.is_published && season.episodes) {
                season.episodes.forEach((episode: any) => {
                  if (episode.is_published) {
                    const epDateStr = episode.release_date || episode.created_at;
                    if (epDateStr) {
                      const epTime = new Date(epDateStr).getTime();
                      if (!isNaN(epTime) && epTime > latestEpisodeAirDate) {
                        latestEpisodeAirDate = epTime;
                      }
                    }
                  }
                });
              }
            });
          }

          const finalSortDate = latestEpisodeAirDate > 0 ? latestEpisodeAirDate : fallbackSeriesDate;

          return {
            ...s,
            latestEpisodeAirDate: finalSortDate,
            launchDate: fallbackSeriesDate
          };
        });

      if (dbSeries.length > 0) {
        isDbEmpty = false;
      }
    }
  } catch (err) {
    console.error('Error fetching series from DB:', err);
  }

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

  return (
    <div className={styles.container}>
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
        <RecentFilterBar type="series" />

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
