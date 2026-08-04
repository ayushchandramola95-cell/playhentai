import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Play, ArrowLeft, Star, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import { MOCK_EPISODES } from '@/utils/mockData';
import RecentFilterBar from '@/components/RecentFilterBar/RecentFilterBar';
import styles from '../recent.module.css';

export const metadata = {
  title: 'Recent Episodes | PlayHentai',
  description: 'Watch the latest released episodes on PlayHentai, updated daily with high-quality content.',
  alternates: {
    canonical: '/recent/episodes',
  },
};

export default async function RecentEpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string;
    q?: string;
    sort?: string;
    genre?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const rawPage = parseInt(params?.page || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const searchQuery = (params?.q || '').toLowerCase().trim();
  const sortMode = params?.sort || '';
  const selectedGenre = (params?.genre || '').toLowerCase().trim();
  const filterType = params?.type || '';

  const ITEMS_PER_PAGE = 20; // 5 rows of 4 cards

  const supabase = await createClient();
  let dbEpisodes: any[] = [];
  let isDbEmpty = true;

  try {
    const { data: episodesData } = await supabase
      .from('episodes')
      .select(`
        id,
        episode_number,
        title,
        thumbnail_key,
        is_published,
        release_date,
        created_at,
        seasons (
          series (
            title,
            slug,
            status,
            tags
          )
        )
      `)
      .eq('is_published', true)
      .order('release_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (episodesData && episodesData.length > 0) {
      dbEpisodes = episodesData.map((ep: any) => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const series = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        return {
          id: ep.id,
          episode_number: ep.episode_number,
          title: series?.title ? `${series.title} - ${ep.title || `Episode ${ep.episode_number}`}` : ep.title,
          rawTitle: ep.title || '',
          showSlug: series?.slug || '',
          tags: series?.tags || [],
          isNew: false, // Will calculate dynamically below
          isUncensored: ep.title?.toLowerCase().includes('uncensored') || (series?.tags && series.tags.some((t: string) => t.toLowerCase() === 'uncensored')) || false,
          thumbnail: ep.thumbnail_key,
          release_date: ep.release_date,
          created_at: ep.created_at,
          seriesStatus: series?.status || ''
        };
      })
      .filter((ep: any) => {
        const titleLower = (ep.rawTitle || '').toLowerCase();
        const isPreviewOrTrailer = 
          titleLower.includes('preview') || 
          titleLower.includes('[preview]') ||
          titleLower.includes('trailer') || 
          titleLower.includes('[pv]');
        return ep.seriesStatus !== 'upcoming' && !isPreviewOrTrailer;
      });

      if (dbEpisodes.length > 0) {
        isDbEmpty = false;
      }
    }
  } catch (err) {
    console.error('Error fetching episodes from DB:', err);
  }

  const activeEpisodes = isDbEmpty ? MOCK_EPISODES : dbEpisodes;

  // Dynamic "NEW" badge calculation: Prioritize created_at (upload date to site) within 7 days
  const now = new Date().getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  let filtered = activeEpisodes.map(ep => {
    const dateStr = ep.release_date || ep.created_at;
    const epTime = dateStr ? new Date(dateStr).getTime() : 0;
    const isNew = epTime > 0 ? (now - epTime < sevenDaysInMs) : false;
    
    return {
      ...ep,
      isNew
    };
  });

  // 1. Search Filter
  if (searchQuery) {
    filtered = filtered.filter(ep => 
      (ep.title && ep.title.toLowerCase().includes(searchQuery)) ||
      (ep.showSlug && ep.showSlug.toLowerCase().includes(searchQuery))
    );
  }

  // 2. Genre Filter
  if (selectedGenre) {
    filtered = filtered.filter(ep => 
      ep.tags && ep.tags.some((t: string) => t.toLowerCase() === selectedGenre)
    );
  }

  // 3. Type / Censorship Filter
  if (filterType === 'uncensored') {
    filtered = filtered.filter(ep => ep.isUncensored);
  } else if (filterType === 'subbed') {
    filtered = filtered.filter(ep => !ep.isUncensored);
  }

  // 4. Sorting Logic
  filtered.sort((a, b) => {
    if (sortMode === 'oldest') {
      const dateA = new Date(a.release_date || a.created_at || 0).getTime();
      const dateB = new Date(b.release_date || b.created_at || 0).getTime();
      return dateA - dateB;
    } else if (sortMode === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortMode === 'title_desc') {
      return (b.title || '').localeCompare(a.title || '');
    } else {
      // Default / newest
      const dateA = new Date(a.release_date || a.created_at || 0).getTime();
      const dateB = new Date(b.release_date || b.created_at || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  // Calculate Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const currentEpisodes = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Helper for pagination query string preservation
  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', page.toString());
    if (searchQuery) p.set('q', searchQuery);
    if (sortMode) p.set('sort', sortMode);
    if (selectedGenre) p.set('genre', selectedGenre);
    if (filterType) p.set('type', filterType);
    return `/recent/episodes?${p.toString()}`;
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
            <Clock size={24} className={styles.sectionIcon} />
            <h1>Recent Episodes</h1>
            {isDbEmpty && <span className={styles.demoBadge}>DEMO DATA</span>}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
            Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems} Episodes
          </span>
        </div>

        {/* Filter Controls Bar */}
        <Suspense fallback={null}>
          <RecentFilterBar type="episodes" />
        </Suspense>

        {currentEpisodes.length === 0 ? (
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
            <Clock size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Episodes Found</h3>
            <p style={{ color: 'var(--foreground-muted)', maxWidth: '400px', fontSize: '0.9rem' }}>
              No episodes matched your filter criteria. Try adjusting your search query or clearing active filters.
            </p>
          </div>
        ) : (
          <div className={styles.episodeGrid}>
            {currentEpisodes.map((ep) => {
              const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, ep.showSlug);
              return (
                <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                  <Link href={watchUrl} className={styles.cardImageLink}>
                    <div className={styles.episodeImageWrapper}>
                      <Image
                        src={getR2Url(ep.thumbnail, 'thumbnail')}
                        alt={ep.title}
                        fill
                        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className={styles.cardImage}
                      />
                      <div className={styles.cardImageOverlay}>
                        <Play size={36} fill="white" className={styles.cardPlayIcon} />
                      </div>
                      
                      {/* Green NEW star badge */}
                      {ep.isNew && (
                        <div className={styles.newBadge}>
                          <Star size={10} fill="currentColor" />
                          <span>NEW</span>
                        </div>
                      )}

                      {/* Black UNCENSORED pill badge */}
                      {ep.isUncensored && (
                        <div className={styles.uncensoredBadge}>
                          <Eye size={10} />
                          <span>UNCENSORED</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className={styles.episodeCardContent}>
                    <h3 className={styles.episodeTitle}>
                      <Link href={watchUrl}>{ep.title}</Link>
                    </h3>
                    <span className={styles.episodeMeta}>Episode {ep.episode_number}</span>
                  </div>
                </div>
              );
            })}
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
