import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Search, Play, HelpCircle } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES } from '@/utils/mockData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './search.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybtbdtgtryrxrhuchlkw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HLX-SCL51o2H254WH-gN0Q_HPpNwKo5';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const revalidate = 60;

const getCachedIsDbEmpty = unstable_cache(
  async () => {
    try {
      const { count } = await publicSupabaseClient.from('series').select('id', { count: 'exact', head: true });
      return !count || count === 0;
    } catch {
      return false;
    }
  },
  ['db-empty-check-v1'],
  { revalidate: 3600, tags: ['db_status'] }
);

const getCachedSearchResults = unstable_cache(
  async (query: string) => {
    const cleanQuery = query.replace(/[,().%\\"]/g, '').trim();
    if (!cleanQuery) return { results: [], isDbEmpty: true };
    let results: any[] = [];
    let isDbEmpty = false;

    try {
      const { data, error } = await publicSupabaseClient
        .from('series')
        .select(`
          id,
          title,
          slug,
          description,
          poster_image_key,
          cover_image_key,
          tags,
          category,
          studio,
          status,
          rating,
          release_year,
          created_at,
          seasons (
            is_published,
            episodes (
              is_published
            )
          )
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);

      if (!error && data) {
        results = data.map((item: any) => {
          let epCount = 0;
          if (item.seasons && Array.isArray(item.seasons)) {
            item.seasons.forEach((s: any) => {
              if (s.is_published !== false && s.episodes && Array.isArray(s.episodes)) {
                epCount += s.episodes.filter((e: any) => e.is_published !== false).length;
              }
            });
          }
          const { seasons, ...rest } = item;
          return {
            ...rest,
            episode_count: epCount
          };
        });
      }

      if (results.length === 0) {
        isDbEmpty = await getCachedIsDbEmpty();
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    }

    return { results, isDbEmpty };
  },
  ['search-results-cache-v2'],
  { revalidate: 60, tags: ['search_results'] }
);

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  return {
    title: q ? `Search results for "${q}" | Play Hentai` : 'Search Hentai Anime & Series | Play Hentai',
    description: `Find and watch anime series matching "${q}". Search by title, alternative names, studio, or genre tags on Play Hentai.`,
    alternates: {
      canonical: '/search',
    },
    robots: {
      index: false,
      follow: true,
    }
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';

  const { results, isDbEmpty } = await getCachedSearchResults(query);

  const activeResults = (!query) 
    ? [] 
    : (isDbEmpty) 
      ? MOCK_SERIES.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) || 
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          (item.tags && item.tags.some((t: string) => t.toLowerCase().includes(query.toLowerCase())))
        )
      : results;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Search', 'item': `${SITE_URL}/search` }
    ]
  };

  const itemListJsonLd = activeResults.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': query ? `Search Results for "${query}"` : 'Search Hentai Anime Catalog',
    'numberOfItems': activeResults.length,
    'itemListElement': activeResults.map((item: any, idx: number) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': item.title,
      'url': `${SITE_URL}/series/${item.slug}`
    }))
  } : null;

  return (
    <div className={styles.container}>
      <JsonLd data={itemListJsonLd ? [breadcrumbJsonLd, itemListJsonLd] : [breadcrumbJsonLd]} />
      <div className="ambient-glow" />

      <div className={styles.searchHeader}>
        <div className={styles.titleRow}>
          <Search size={28} className={styles.searchIcon} />
          <h1>{query ? `Search Results for "${query}"` : 'Search Hentai Anime Catalog'}</h1>
        </div>
        <p className={styles.subtext}>
          {query ? `Showing matching hentai anime series for "${query}"` : 'Type in the search bar above to explore our library.'}
        </p>
      </div>

      {query ? (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSummary}>
            Found {activeResults.length} {activeResults.length === 1 ? 'result' : 'results'}
            {isDbEmpty && <span className={styles.demoBadge}>DEMO DATA</span>}
          </div>

          {activeResults.length > 0 ? (
            <div className={styles.seriesGrid}>
              {activeResults.map((item) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className={`${styles.emptyState} glass`}>
              <HelpCircle size={48} className={styles.emptyIcon} />
              <h3>No results found</h3>
              <p>We couldn't find any series matching "{query}". Try checking your spelling or search for broader terms like "3D", "Uncensored", or "Action".</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`${styles.emptyState} glass`}>
          <Search size={48} className={styles.emptyIcon} />
          <h3>Find your next series</h3>
          <p>Search by title, categories, genres, or tags. Try searching for "Cyberpunk" or "Fantasy" to explore show releases.</p>
        </div>
      )}
    </div>
  );
}
