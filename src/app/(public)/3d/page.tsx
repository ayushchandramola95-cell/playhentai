import React, { Suspense } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { MOCK_SERIES } from '@/utils/mockData';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isThreeDSeries } from '@/utils/constants';
import { Box } from 'lucide-react';
import styles from './ThreeD.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 120;

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

  const title = '3D Hentai Anime – Watch Free CGI in 1080p HD | HentaiKage';
  const description = 'Watch the best 3D hentai anime and high-fidelity CGI animation series online free in 1080p HD with English subtitles. Stream 3D adult episodes on HentaiKage.';
  const keywords = [
    '3d hentai',
    '3d hentai anime',
    'watch 3d hentai free',
    '3d cgi hentai',
    '3d hentai 1080p',
    'best 3d hentai',
    'hentaikage'
  ];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'HentaiKage',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: `${SITE_URL}/og-banner.png`,
          width: 1200,
          height: 630,
          alt: 'HentaiKage 3D Hentai & CGI Animations',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-banner.png`],
    },
  };
}

// Zero-Egress Cached Local 3D Query
const getCached3DSeries = unstable_cache(
  async () => {
    try {
      const dbSeries = await getLocalAllPublishedSeries();
      return { dbSeries, isDbEmpty: dbSeries.length === 0 };
    } catch (err) {
      console.error('Error fetching series for 3D page:', err);
    }

    return { dbSeries: [], isDbEmpty: true };
  },
  ['threed-page-series-cache-v1'],
  { revalidate: 120, tags: ['3d_page_series', 'catalog_series'] }
);

function sanitizeBrowseSeries(series: any[]) {
  return series.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description || '',
    poster_image_key: s.poster_image_key,
    cover_image_key: s.cover_image_key,
    tags: s.tags || [],
    category: s.category || '',
    studio: s.studio || '',
    releaseYear: s.releaseYear || s.release_year,
    release_year: s.release_year || s.releaseYear,
    status: s.status || '',
    content_rating: s.content_rating || '',
    views: s.views,
    rating: s.rating,
  }));
}

export default async function ThreeDPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const { dbSeries, isDbEmpty } = await getCached3DSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  // Filter series using strict tag / category constraints on the server side
  const threedSeries = sanitizeBrowseSeries(activeSeries.filter(isThreeDSeries));

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
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>3D</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.threeDHighlightPill}>
            <Box size={13} className={styles.threeDIconPill} /> 3D &amp; CGI CATALOG
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>3D Hentai &amp; CGI Animations</h1>
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
          <h2>Watch 3D Hentai Anime &amp; CGI Animations in HD Online</h2>
          <p>
            Welcome to the ultimate 3D hentai and CGI animation collection on HentaiKage. Explore high-framerate, beautifully rendered 3D hentai animations with English subtitles in crystal-clear 1080p and 4K HD. Discover complete series, character models, trending 3D creators, and virtual studio releases curated for an immersive streaming experience.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>Stunning 3D CGI Visuals</h3>
              <p>Experience ultra-detailed 3D models, smooth physics animations, and high-fidelity rendering produced by top creators and studios.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>English Subtitles &amp; High Bitrate</h3>
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
