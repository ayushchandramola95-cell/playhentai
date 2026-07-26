import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Play, HelpCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES } from '@/utils/mockData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import styles from './search.module.css';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  return {
    title: q ? `Search results for "${q}"` : 'Search Hentai Anime & Series',
    description: `Find and watch anime series matching "${q}". Search by title, alternative names, studio, or genre tags on PlayHentai.`,
    robots: {
      index: false,
      follow: true,
    }
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Resolve search parameters asynchronously (Next.js 15+ convention)
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  
  const supabase = await createClient();
  let results: any[] = [];
  let isDbEmpty = true;

  if (query) {
    try {
      // Direct PostgreSQL OR query to find matching series
      const { data, error } = await supabase
        .from('series')
        .select(`
          *,
          seasons (
            is_published,
            episodes (
              is_published
            )
          )
        `)
        .eq('is_published', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      if (!error && data) {
        results = data;
      }
      
      // Check if DB is completely empty (for help/demo flags)
      const { count } = await supabase.from('series').select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        isDbEmpty = false;
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    }
  }

  // Fallback search logic on mock items if DB has no entries
  const activeResults = (!query) 
    ? [] 
    : (isDbEmpty) 
      ? MOCK_SERIES.filter(item => 
          item.title.toLowerCase().includes(query.toLowerCase()) || 
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        )
      : results;

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      <div className={styles.searchHeader}>
        <div className={styles.titleRow}>
          <Search size={28} className={styles.searchIcon} />
          <h1>Search Catalog</h1>
        </div>
        <p className={styles.subtext}>
          {query ? `Search results for "${query}"` : 'Type in the search bar above to explore our library.'}
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
              <p>We couldn't find any series matching "{query}". Try checking your spelling or search for broader terms like "Sci-Fi" or "Action".</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`${styles.emptyState} glass`}>
          <Search size={48} className={styles.emptyIcon} />
          <h3>Find your next series</h3>
          <p>Search by title, categories, genres, or tags. Try searching for "Cyberpunk" or "Fantasy" to see how the system behaves.</p>
        </div>
      )}
    </div>
  );
}
