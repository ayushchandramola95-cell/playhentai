import React from 'react';
import { Layers } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import JsonLd from '@/components/JsonLd/JsonLd';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import styles from './categories.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const metadata = {
  title: 'Browse Hentai Anime Categories & Series | PlayHentai',
  description: 'Browse all uncensored hentai anime series, genres, studios, and release years. Filter the complete anime library on PlayHentai.',
  alternates: {
    canonical: '/categories',
  },
  openGraph: {
    title: 'Browse Hentai Anime Categories & Series | PlayHentai',
    description: 'Browse all uncensored hentai anime series, genres, studios, and release years on PlayHentai.',
    url: `${SITE_URL}/categories`,
    type: 'website' as const,
  },
};

// 60-Second TTL Cached Categories Series Query
const getCachedCategoriesSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

      const { data: seriesData } = await supabase
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
        .order('created_at', { ascending: false });

      if (seriesData && seriesData.length > 0) {
        dbSeries = seriesData;
        isDbEmpty = false;
      }
    } catch (err) {
      console.error('Error fetching series from DB:', err);
    }

    return { dbSeries, isDbEmpty };
  },
  ['categories-series-catalog-cache-v1'],
  { revalidate: 60, tags: ['categories_catalog'] }
);

// Rich Mock Data with assigned Genres, Studios, and Release Years matching images
const MOCK_SERIES = [
  {
    id: 'mock-1',
    title: 'Cyberpunk Odyssey',
    slug: 'cyberpunk-odyssey',
    description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network and change everything.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Action', 'Cyberpunk', 'Uncensored', '3D'],
    category: 'Sci-Fi',
    studio: 'PoRO',
    releaseYear: 2024
  },
  {
    id: 'mock-2',
    title: 'Fantasy Chronicles: Runes',
    slug: 'fantasy-chronicles-runes',
    description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Adventure', 'Magic', 'Vanilla'],
    category: 'Fantasy',
    studio: 'Bunnywalker',
    releaseYear: 2023
  },
  {
    id: 'mock-3',
    title: 'Neon Tokyo Noir',
    slug: 'neon-tokyo-noir',
    description: 'A detective investigates a series of unexplained disappearances in the neon-lit underbelly of Tokyo\'s futuristic nightlife districts.',
    poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    tags: ['Action', 'Thriller', 'Mystery', 'Tsundere'],
    category: 'Action',
    studio: 'PoRO',
    releaseYear: 2025
  },
  {
    id: 'mock-4',
    title: 'Celestial Guardians',
    slug: 'celestial-guardians',
    description: 'As dark rifts tear open across the skies, an elite band of winged guardians must reunite to defend the floating cities from primordial beasts.',
    poster_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Action', 'Adventure', 'Super Power'],
    category: 'Fantasy',
    studio: 'Mary Jane',
    releaseYear: 2026
  },
  {
    id: 'mock-5',
    title: 'Shadow Ninja Legend',
    slug: 'shadow-ninja-legend',
    description: 'A banished ninja warrior uncovers a secret scroll revealing the resurrection of an ancient shadow clan, forcing him to face his former masters.',
    poster_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=500&auto=format&fit=crop&q=80',
    tags: ['Action', 'Adventure', 'Historical', 'Demons'],
    category: 'Action',
    studio: 'Studio Jack',
    releaseYear: 2022
  },
  {
    id: 'mock-6',
    title: 'Retro Arcade Rider',
    slug: 'retro-arcade-rider',
    description: 'In a retro-futuristic world where virtual motorcycle racing determines social status, an underdog rider enters the legendary Grand Neon Prix.',
    poster_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Sports', 'Racing', 'Vanilla'],
    category: 'Sci-Fi',
    studio: 'Bunnywalker',
    releaseYear: 2026
  }
];

export default async function CategoriesPage() {
  const { dbSeries, isDbEmpty } = await getCachedCategoriesSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': SITE_URL,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Browse Library',
        'item': `${SITE_URL}/categories`,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="ambient-glow" />

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Layers size={28} className={styles.headerIcon} />
          <h1>Browse Hentai Anime Library</h1>
        </div>
        <p className={styles.subtext}>
          Filter through our complete collection by genres, studios, and release years.
        </p>
      </div>

      {/* Filterable Browse Hub */}
      <BrowseHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} />
    </div>
  );
}
