import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isThreeDSeries } from '@/utils/constants';
import { getSeriesViewsMap } from '@/utils/views';
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
          url: `${SITE_URL}/hero-banner.png`,
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
      images: [`${SITE_URL}/hero-banner.png`],
    },
  };
}

// 60-Second TTL Cached 3D Query
const getCached3DSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const viewsMap = await getSeriesViewsMap();

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
        dbSeries = seriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
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
  const ITEMS_PER_PAGE = 24;

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

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': '3D Hentai & CGI Animations Catalog',
    'url': `${SITE_URL}/3d`,
    'itemListElement': threedSeries.slice(0, 24).map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>3D</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.threeDHighlightPill}>
            <Box size={13} className={styles.threeDIconPill} /> 3D & CGI CATALOG
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>3D Hentai & CGI Animations</h1>
        </div>
        <p className={styles.subtext}>
          Browse our collection of 3D hentai anime and CGI animation series with English subtitles, including complete series, new releases, and popular titles.
        </p>
      </div>

      {/* Dedicated Tailored 3D Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub 
          initialSeries={threedSeries} 
          isDbEmpty={isDbEmpty} 
          basePath="/3d"
          is3DPage={true}
          searchPlaceholder="Search 3D catalog..."
        />
      </Suspense>

      {/* Informative SEO Section at the Bottom */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Watch 3D Hentai Anime & CGI Animations in HD Online</h2>
          <p>
            Welcome to the ultimate 3D hentai and CGI animation collection on Play Hentai. Explore high-framerate, beautifully rendered 3D hentai animations with English subtitles in crystal-clear 1080p and 4K HD. Discover complete series, character models, trending 3D creators, and virtual studio releases curated for an immersive streaming experience.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>Stunning 3D CGI Visuals</h3>
              <p>Experience ultra-detailed 3D models, smooth physics animations, and high-fidelity rendering produced by top creators and studios.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>English Subtitles & High Bitrate</h3>
              <p>Every release includes synchronized English subtitles, detailed chapter metadata, voice acting details, and fast buffer-free playback.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Multi-Facet Filtering</h3>
              <p>Easily refine the entire 3D library by genre, studio, release year, or airing status to find your favorite CGI series in seconds.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
