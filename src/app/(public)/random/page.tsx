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
  }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre;
  const canonicalPath = genre && genre.toLowerCase() !== 'all'
    ? `/random?genre=${encodeURIComponent(genre)}`
    : '/random';

  return {
    title: 'Random Hentai Anime Generator & Surprise Picker | PlayHentai',
    description: 'Let our random hentai generator pick your next anime binge-watch. Filter by genre or roll the dice for instant 1080p recommendations on PlayHentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Random Hentai Anime Generator & Surprise Picker | PlayHentai',
      description: 'Let our random hentai generator pick your next anime binge-watch. Filter by genre or roll the dice for instant 1080p recommendations on PlayHentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'PlayHentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'PlayHentai Random Hentai Anime Generator',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Random Hentai Anime Generator & Surprise Picker | PlayHentai',
      description: 'Let our random hentai generator pick your next anime binge-watch. Filter by genre or roll the dice for instant 1080p recommendations on PlayHentai.',
      images: ['https://media.playhentai.live/og-banner.jpg'],
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
    description: 'Interactive random anime picker and series recommendation generator on PlayHentai.',
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, webAppJsonLd]} />
      <RandomizerPortal seriesList={seriesList} />
    </>
  );
}
