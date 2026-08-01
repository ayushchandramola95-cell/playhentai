import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import UncensoredHub from '@/components/UncensoredHub/UncensoredHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from '../categories/categories.module.css';
import { MOCK_SERIES } from '@/utils/mockData';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageParam = params.page;
  const canonicalPath = pageParam && parseInt(pageParam, 10) > 1 
    ? `/uncensored?page=${pageParam}` 
    : '/uncensored';

  return {
    title: 'Watch Uncensored Hentai Anime Series & Episodes in HD | PlayHentai',
    description: 'Browse and stream all 1080p uncensored hentai anime series, full HD episodes, and popular uncensored titles online for free on PlayHentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Watch Uncensored Hentai Anime Series & Episodes in HD | PlayHentai',
      description: 'Browse and stream all 1080p uncensored hentai anime series, full HD episodes, and popular uncensored titles online for free on PlayHentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'PlayHentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'PlayHentai Uncensored Hentai Anime',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Watch Uncensored Hentai Anime Series & Episodes in HD | PlayHentai',
      description: 'Browse and stream all 1080p uncensored hentai anime series, full HD episodes, and popular uncensored titles online for free on PlayHentai.',
      images: ['https://media.playhentai.live/og-banner.jpg'],
    },
  };
}

// 60-Second TTL Cached Uncensored Query
const getCachedUncensoredSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const { data: seriesData } = await publicSupabaseClient
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

    return { dbSeries, isDbEmpty };
  },
  ['uncensored-series-catalog-cache-v1'],
  { revalidate: 60, tags: ['uncensored_catalog'] }
);

export default async function UncensoredPage() {
  const { dbSeries, isDbEmpty } = await getCachedUncensoredSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Uncensored', 'item': `${SITE_URL}/uncensored` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Uncensored Hentai Anime Series & Catalog',
    url: `${SITE_URL}/uncensored`,
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

      {/* Dedicated Standalone Uncensored Catalog View */}
      <UncensoredHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} />
    </div>
  );
}
