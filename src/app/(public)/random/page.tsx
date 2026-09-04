import React from 'react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';
import RandomizerPortal from './RandomizerPortal';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

interface PageProps {
  searchParams: Promise<{
    genre?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const hasParams = params.genre || params.sort || params.page;

  const robots = hasParams
    ? { index: false, follow: true }
    : { index: true, follow: true };

  return {
    title: 'Random Hentai Anime Generator & Picker | Play Hentai',
    description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
    alternates: {
      canonical: `${SITE_URL}/random`,
    },
    robots,
    openGraph: {
      title: 'Random Hentai Anime Generator & Picker | Play Hentai',
      description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
      url: `${SITE_URL}/random`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: `${SITE_URL}/hero-banner.png`,
          width: 1200,
          height: 630,
          alt: 'Play Hentai Random Hentai Anime Generator',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Random Hentai Anime Generator & Picker | Play Hentai',
      description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
      images: [`${SITE_URL}/hero-banner.png`],
    },
  };
}

const getCachedRandomizerSeries = unstable_cache(
  async () => {
    let seriesList: any[] = [];
    try {
      const { data: dbSeries } = await publicSupabaseClient
        .from('series')
        .select('*')
        .eq('is_published', true);

      if (dbSeries && dbSeries.length > 0) {
        seriesList = dbSeries;
      }
    } catch (err) {
      console.error('Error fetching series for randomizer:', err);
    }

    if (seriesList.length === 0) {
      seriesList = MOCK_SERIES;
    }

    // Deterministic sorting by title alphabetically for SEO stability
    seriesList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return seriesList;
  },
  ['randomizer-series-catalog-cache-v1'],
  { revalidate: 60, tags: ['randomizer_catalog'] }
);

export default async function RandomPage() {
  const seriesList = await getCachedRandomizerSeries();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Random', 'item': `${SITE_URL}/random` },
    ],
  };

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Random Hentai Anime Generator',
    url: `${SITE_URL}/random`,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'All',
    description: 'Interactive random anime picker and series recommendation generator on Play Hentai.',
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Random Hentai Anime Generator List',
    'url': `${SITE_URL}/random`,
    'itemListElement': seriesList.slice(0, 24).map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, webAppJsonLd, itemListJsonLd]} />
      <RandomizerPortal seriesList={seriesList} />
    </>
  );
}
