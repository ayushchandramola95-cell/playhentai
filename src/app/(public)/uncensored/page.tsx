import React, { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isUncensoredSeries } from '@/utils/constants';
import { getSeriesViewsMap } from '@/utils/views';
import styles from './uncensored.module.css';
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
    title: 'Uncensored Hentai Anime — Watch Online in HD | Play Hentai',
    description: 'Watch uncensored hentai anime online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular titles on Play Hentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Uncensored Hentai Anime — Watch Online in HD | Play Hentai',
      description: 'Watch uncensored hentai anime online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular titles on Play Hentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: `${SITE_URL}/hero-banner.png`,
          width: 1200,
          height: 630,
          alt: 'Play Hentai Uncensored Hentai Anime',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Uncensored Hentai Anime — Watch Online in HD | Play Hentai',
      description: 'Watch uncensored hentai anime online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular titles on Play Hentai.',
      images: [`${SITE_URL}/hero-banner.png`],
    },
  };
}

// 60-Second TTL Cached Uncensored Query
const getCachedUncensoredSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const viewsMap = await getSeriesViewsMap();

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
        dbSeries = seriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
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

export default async function UncensoredPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageParam = params.page;
  const currentPage = pageParam ? parseInt(pageParam, 10) || 1 : 1;
  const ITEMS_PER_PAGE = 24;

  const { dbSeries, isDbEmpty } = await getCachedUncensoredSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  // Filter series using strict genre (category) & tag constraints
  const uncensoredSeries = activeSeries.filter(isUncensoredSeries);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Uncensored', 'item': `${SITE_URL}/uncensored` },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Uncensored Hentai Anime Series & Catalog',
    'url': `${SITE_URL}/uncensored`,
    'itemListElement': uncensoredSeries.slice(0, 24).map((s: any, i: number) => ({
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
        <span className={styles.activeCrumb}>Uncensored</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.uncensoredHighlightPill}>
            <ShieldCheck size={13} className={styles.uncensoredIconPill} /> UNCENSORED CATALOG
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>Uncensored Hentai Anime</h1>
        </div>
        <p className={styles.subtext}>
          Browse our collection of uncensored hentai anime with English subtitles, including complete series, new releases, and popular titles.
        </p>
      </div>

      {/* Dedicated Tailored Uncensored Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub 
          initialSeries={uncensoredSeries} 
          isDbEmpty={isDbEmpty} 
          basePath="/uncensored"
          isUncensoredPage={true}
          searchPlaceholder="Search uncensored catalog..."
        />
      </Suspense>

      {/* Informative SEO Section at the Bottom */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Watch Uncensored Hentai Anime in HD Online</h2>
          <p>
            Welcome to the ultimate uncensored hentai anime catalog on Play Hentai. Explore hundreds of full-length, high-definition hentai releases completely unfiltered and uncut. Whether you are looking for classic masterpieces, new seasonal releases, 3D CGI animations, or trending OVAs with English subtitles, our dedicated library is curated for the best streaming experience.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>100% Uncensored Quality</h3>
              <p>Experience explicit anime series presented in their authentic, unpixelated form with crystal-clear 1080p and 4K HD video streams.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>English Subtitles & Dubs</h3>
              <p>All series feature accurate English subtitles, detailed synopses, voice cast info, and studio credits for seamless viewing.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Multi-Facet Filtering</h3>
              <p>Easily filter the entire uncensored database by genre, studio, release year, or airing status to find exactly what you love.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
