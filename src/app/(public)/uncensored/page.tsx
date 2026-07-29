import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from '../categories/categories.module.css';

export const metadata = {
  title: 'Watch Uncensored Hentai Anime Series & Episodes in HD | PlayHentai',
  description: 'Browse and stream all 1080p uncensored hentai anime series, full HD episodes, and popular uncensored titles online for free on PlayHentai.',
  alternates: {
    canonical: '/uncensored',
  },
  openGraph: {
    title: 'Watch Uncensored Hentai Anime Series & Episodes in HD | PlayHentai',
    description: 'Browse and stream all 1080p uncensored hentai anime series, full HD episodes, and popular uncensored titles online for free on PlayHentai.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}/uncensored`,
    type: 'website' as const,
  },
};

const MOCK_SERIES = [
  {
    id: 'mock-1',
    title: 'Cyberpunk Odyssey',
    slug: 'cyberpunk-odyssey',
    description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network and change everything.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    tags: ['Uncensored', 'Sci-Fi', 'Action', 'Cyberpunk', '3D'],
    category: 'Uncensored',
    studio: 'PoRO',
    releaseYear: 2024
  },
  {
    id: 'mock-2',
    title: 'Fantasy Chronicles: Runes',
    slug: 'fantasy-chronicles-runes',
    description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    tags: ['Uncensored', 'Fantasy', 'Adventure', 'Magic'],
    category: 'Uncensored',
    studio: 'Bunnywalker',
    releaseYear: 2023
  }
];

export default async function UncensoredPage() {
  const supabase = await createClient();
  let dbSeries: any[] = [];
  let isDbEmpty = true;

  try {
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
    console.error('Error fetching series from DB for uncensored page:', err);
  }

  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'Uncensored', 'item': `${siteUrl}/uncensored` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Uncensored Hentai Anime Series & Catalog',
    url: `${siteUrl}/uncensored`,
    description: 'Complete collection of 1080p uncensored hentai anime series and full HD episodes.',
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <div className="ambient-glow" />

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <ShieldCheck size={28} className={styles.headerIcon} style={{ color: '#10b981' }} />
          <h1>Uncensored Hentai Anime</h1>
        </div>
        <p className={styles.subtext}>
          Explore our complete library of uncensored 1080p anime series, episodes, and releases.
        </p>
      </div>

      {/* Filterable Browse Hub with initialGenre="Uncensored" */}
      <BrowseHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} initialGenre="Uncensored" />
    </div>
  );
}
