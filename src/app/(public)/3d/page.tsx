import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';
import ThreeDHub from '@/components/ThreeDHub/ThreeDHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isThreeDSeries } from '@/utils/constants';
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
    title: '3D Hentai Anime — Watch CGI Animations in HD | Play Hentai',
    description: 'Watch 3D hentai anime and CGI animation series online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular 3D titles on Play Hentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: '3D Hentai Anime — Watch CGI Animations in HD | Play Hentai',
      description: 'Watch 3D hentai anime and CGI animation series online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular 3D titles on Play Hentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'Play Hentai 3D Hentai & CGI Animations',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: '3D Hentai Anime — Watch CGI Animations in HD | Play Hentai',
      description: 'Watch 3D hentai anime and CGI animation series online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular 3D titles on Play Hentai.',
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

export default async function ThreeDPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageParam = params.page;
  const currentPage = pageParam ? parseInt(pageParam, 10) || 1 : 1;
  const ITEMS_PER_PAGE = 25;

  const { dbSeries, isDbEmpty } = await getCached3DSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  // Filter series using strict tag / category constraints on the server side
  const threedSeries = activeSeries.filter(isThreeDSeries);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': '3D Animations', 'item': `${SITE_URL}/3d` },
    ],
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageSeries = threedSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': '3D Hentai & CGI Animations Catalog',
    'url': `${SITE_URL}/3d`,
    'itemListElement': pageSeries.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': startIndex + i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>3D</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Box size={28} className={styles.headerIcon} />
          <h1>3D Hentai & CGI Animations</h1>
        </div>
        <p className={styles.subtext}>
          Browse 3D hentai anime series and CGI animation releases with English subtitles in HD. Explore complete series, available episodes, new releases, and popular 3D titles on Play Hentai.
        </p>
      </div>

      {/* Main 3D Catalog Hub */}
      <Suspense fallback={null}>
        <ThreeDHub 
          initialSeries={threedSeries} 
          isDbEmpty={isDbEmpty} 
          basePath="/3d"
          currentPage={currentPage}
        />
      </Suspense>
    </div>
  );
}
