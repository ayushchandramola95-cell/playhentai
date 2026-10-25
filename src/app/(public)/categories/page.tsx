import React, { Suspense } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { Layers } from 'lucide-react';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { MOCK_SERIES } from '@/utils/mockData';
import JsonLd from '@/components/JsonLd/JsonLd';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import { tagToSlug } from '@/utils/constants';
import styles from './categories.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 120;

interface PageProps {
  searchParams: Promise<{
    genre?: string;
    studio?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

const GENRE_INTRODUCTIONS: Record<string, string> = {
  action: "Explore action hentai anime featuring intense stories, battles, supernatural conflicts, and adventure. Browse available series and episodes and discover related titles on HentaiKage.",
  fantasy: "Step into fantasy hentai anime worlds filled with magic, mythical beasts, epic quests, and otherworldly encounters. Stream complete episodes online.",
  romance: "Discover romance hentai anime focusing on deep relationships, emotional bonds, love stories, and intimate encounters. Watch full series on HentaiKage.",
  comedy: "Enjoy comedy hentai anime combining hilarious situational humor, parody elements, lighthearted stories, and intimate scenes.",
  'sci-fi': "Dive into sci-fi hentai anime featuring futuristic settings, advanced technology, space exploration, cybernetics, and intense encounters.",
  adventure: "Follow adventure hentai anime journeys across uncharted territories, dangerous dungeons, and heroic quests with exciting encounters.",
  drama: "Experience drama hentai anime with deep storytelling, emotional conflicts, complex character relationships, and intense plots.",
  mystery: "Uncover mystery hentai anime filled with suspense, detective work, supernatural puzzles, and dark secrets.",
  supernatural: "Explore supernatural hentai anime involving spirits, ghosts, yokai, and occult mysteries alongside intimate relationships.",
  harem: "Watch harem hentai anime where multiple characters compete for the affection of a single lead, full of comedy, drama, and intimate encounters.",
  ecchi: "Browse ecchi anime series featuring highly suggestive comedy, fan service, playful themes, and romantic encounters.",
  uncensored: "Explore uncensored hentai anime series in high definition. Stream the absolute best uncensored adult anime episodes.",
  '3d': "Browse 3D hentai anime series rendered with stunning modern CGI graphics, detailed animations, and realistic adult encounters."
};

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre;
  const studio = params.studio;
  const year = params.year;
  const page = params.page;

  let title = 'Browse Hentai Anime – Genres, Studios & Years | HentaiKage';
  let description = 'Browse all hentai anime series by genre, theme, studio, and year. Stream 800+ full episodes in 1080p HD with English subtitles online free on HentaiKage.';
  let canonicalPath = '/categories';
  let keywords: string[] = [
    'browse hentai anime',
    'hentai genres',
    'hentai categories',
    'hentai anime studios',
    'uncensored hentai catalog',
    'hentaikage',
    'watch hentai free'
  ];

  if (genre && genre.toLowerCase() !== 'all' && genre.toLowerCase() !== 'all genres') {
    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
    title = `${formattedGenre} Hentai Anime – Watch Free in HD | HentaiKage`;
    description = `Watch the best ${formattedGenre} hentai anime series and episodes in full 1080p HD online free with English subtitles. Complete ${formattedGenre} catalog on HentaiKage.`;
    canonicalPath = `/categories/${tagToSlug(genre)}`;
    keywords = [
      `${genre.toLowerCase()} hentai`,
      `${genre.toLowerCase()} hentai anime`,
      `watch ${genre.toLowerCase()} hentai`,
      `best ${genre.toLowerCase()} hentai`,
      `${genre.toLowerCase()} anime online free`,
      `${genre.toLowerCase()} uncensored`,
      'hentaikage',
      'hentai kage'
    ];
  } else if (studio) {
    title = `${studio} Hentai Anime – Watch All Series in HD | HentaiKage`;
    description = `Watch all ${studio} hentai anime series and episodes online free in 1080p HD with English subtitles. Browse the full ${studio} production catalog on HentaiKage.`;
    canonicalPath = `/studios/${tagToSlug(studio)}`;
    keywords = [
      `${studio.toLowerCase()} hentai`,
      `${studio.toLowerCase()} anime`,
      `watch ${studio.toLowerCase()} hentai`,
      'hentaikage'
    ];
  } else if (year) {
    title = `${year} Hentai Anime Releases – Watch Free in HD | HentaiKage`;
    description = `Watch the best hentai anime series released in ${year} online free in full 1080p HD with English subtitles. Browse all ${year} anime releases on HentaiKage.`;
    canonicalPath = `/year/${year}`;
    keywords = [
      `${year} hentai`,
      `${year} hentai anime`,
      `watch ${year} hentai`,
      'hentaikage'
    ];
  }

  if (page && page !== '1') {
    const querySymbol = canonicalPath.includes('?') ? '&' : '?';
    canonicalPath += `${querySymbol}page=${page}`;
  }

  const cleanTitle = title.replace(/\s*\|.*$/, '').trim();
  const ogApiUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(cleanTitle)}&subtitle=${encodeURIComponent(description.slice(0, 80))}&badge=${encodeURIComponent('BROWSE CATALOG')}&image=${encodeURIComponent(`${SITE_URL}/hero-banner.png`)}`;

  const images = [
    {
      url: ogApiUrl,
      width: 1200,
      height: 630,
      alt: title,
    },
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
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogApiUrl],
    },
  };
}

// Zero-Egress Cached Local Categories Query
const getCachedCategoriesSeries = unstable_cache(
  async () => {
    try {
      const dbSeries = await getLocalAllPublishedSeries();
      return { dbSeries, isDbEmpty: dbSeries.length === 0 };
    } catch (err) {
      console.error('Error fetching local series for categories page:', err);
    }
    return { dbSeries: [], isDbEmpty: true };
  },
  ['categories-page-series-cache-v1'],
  { revalidate: 120, tags: ['categories_page_series', 'catalog_series'] }
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

export default async function CategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre;
  const studio = params.studio;
  const year = params.year;

  const { dbSeries, isDbEmpty } = await getCachedCategoriesSeries();
  const rawSeries = isDbEmpty ? MOCK_SERIES : dbSeries;
  const activeSeries = sanitizeBrowseSeries(rawSeries);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Browse', 'item': `${SITE_URL}/categories` },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Hentai Anime Complete Library & Browse Hub',
    'url': `${SITE_URL}/categories`,
    'itemListElement': activeSeries.slice(0, 24).map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  let h1Text = 'Browse Hentai Anime';
  let introText = 'Browse all hentai anime series by genre, themes, animation studios, and release years. Stream complete episodes with English subtitles in 1080p HD.';
  let basePath = '/categories';

  if (genre && genre.toLowerCase() !== 'all' && genre.toLowerCase() !== 'all genres') {
    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
    h1Text = `${formattedGenre} Hentai Anime`;
    const genKey = genre.toLowerCase();
    introText = GENRE_INTRODUCTIONS[genKey] || `Browse ${formattedGenre} hentai anime series and episodes on HentaiKage. Discover complete series, new releases, and popular titles.`;
    basePath = `/categories/${tagToSlug(genre)}`;
  } else if (studio) {
    h1Text = `${studio} Hentai Anime`;
    introText = `Browse hentai anime produced by ${studio} on HentaiKage. Explore all series, animation releases, and studio catalogs in 1080p HD.`;
    basePath = `/studios/${tagToSlug(studio)}`;
  } else if (year) {
    h1Text = `${year} Hentai Anime`;
    introText = `Browse hentai anime released in ${year} on HentaiKage. Discover series, available episodes, genres, and popular titles from ${year}.`;
    basePath = `/year/${year}`;
  }

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <Link href="/">Home</Link>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Browse</span>
      </nav>

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.libraryHighlightPill}>
            <Layers size={13} className={styles.libraryIconPill} /> COMPLETE CATALOG
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>{h1Text}</h1>
        </div>
        <p className={styles.subtext}>
          {introText}
        </p>
      </div>

      {/* Filterable Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} basePath={basePath} />
      </Suspense>
    </div>
  );
}
