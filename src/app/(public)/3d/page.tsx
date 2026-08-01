import React from 'react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';
import ThreeDHub from '@/components/ThreeDHub/ThreeDHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { Box } from 'lucide-react';
import styles from './ThreeD.module.css';

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
    ? `/3d?page=${pageParam}` 
    : '/3d';

  return {
    title: 'Watch 3D Hentai Anime Series & CGI Animations in HD | PlayHentai',
    description: 'Browse and stream 1080p high quality 3D CGI hentai anime series, 3D animations, and top CGI releases online for free on PlayHentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Watch 3D Hentai Anime Series & CGI Animations in HD | PlayHentai',
      description: 'Browse and stream 1080p high quality 3D CGI hentai anime series, 3D animations, and top CGI releases online for free on PlayHentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'PlayHentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'PlayHentai 3D Hentai & CGI Animations',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Watch 3D Hentai Anime Series & CGI Animations in HD | PlayHentai',
      description: 'Browse and stream 1080p high quality 3D CGI hentai anime series, 3D animations, and top CGI releases online for free on PlayHentai.',
      images: ['https://media.playhentai.live/og-banner.jpg'],
    },
  };
}

// 60-Second TTL Cached 3D Query
const getCached3DSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const { data: seriesData, error } = await publicSupabaseClient
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

      if (!error && seriesData && seriesData.length > 0) {
        dbSeries = seriesData;
        isDbEmpty = false;
      }
    } catch (err) {
      console.error('Error fetching series from DB for 3D page:', err);
    }

    return { dbSeries, isDbEmpty };
  },
  ['threed-series-catalog-cache-v1'],
  { revalidate: 60, tags: ['3d_catalog'] }
);

export default async function ThreeDPage() {
  const { dbSeries, isDbEmpty } = await getCached3DSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '3D Hentai & CGI Animations Catalog',
    url: `${SITE_URL}/3d`,
    description: 'Browse and stream 1080p high quality 3D CGI hentai anime series and CGI animation releases.',
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': '3D Animations', 'item': `${SITE_URL}/3d` },
    ],
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd]} />

      {/* Hero Banner Header */}
      <div className={styles.heroBanner}>
        <div className={styles.glowSphere} />

        <div className={styles.badgeRow}>
          <div className={styles.badgeIcon}>
            <Box size={20} />
          </div>
          <span className={styles.badgeText}>
            3D CGI Catalog
          </span>
        </div>

        <h1 className={styles.heroTitle}>
          3D Hentai & CGI Animations
        </h1>
        <p className={styles.heroDescription}>
          Explore our dedicated collection of high quality 3D CGI anime series, smooth 60fps CGI animation releases, and 3D titles available to stream in 1080p HD.
        </p>
      </div>

      {/* Main 3D Catalog Hub */}
      <ThreeDHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} />
    </div>
  );
}
