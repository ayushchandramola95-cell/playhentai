import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Layers, Sparkles } from 'lucide-react';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { tagToSlug, isUncensoredSeries } from '@/utils/constants';
import styles from '../../../categories/categories.module.css';

interface ProgrammaticGenrePageProps {
  params: Promise<{
    genre: string;
    subfilter: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export const revalidate = 120;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

function parseRouteFilter(rawGenre: string, rawSubfilter: string) {
  const genreSlug = decodeURIComponent(rawGenre).toLowerCase().trim();
  const subfilterSlug = decodeURIComponent(rawSubfilter).toLowerCase().trim();

  const formattedGenre = genreSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const isYear = /^\d{4}$/.test(subfilterSlug);
  const isStatus = subfilterSlug === 'completed' || subfilterSlug === 'ongoing';
  const isUncensored = subfilterSlug === 'uncensored';
  const is3D = subfilterSlug === '3d';

  let filterType: 'year' | 'status' | 'uncensored' | '3d' | 'tag' = 'tag';
  let formattedSubfilter = subfilterSlug;

  if (isYear) {
    filterType = 'year';
    formattedSubfilter = subfilterSlug;
  } else if (isStatus) {
    filterType = 'status';
    formattedSubfilter = subfilterSlug === 'completed' ? 'Completed' : 'Ongoing';
  } else if (isUncensored) {
    filterType = 'uncensored';
    formattedSubfilter = 'Uncensored';
  } else if (is3D) {
    filterType = '3d';
    formattedSubfilter = '3D CGI';
  } else {
    formattedSubfilter = subfilterSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return {
    genreSlug,
    formattedGenre,
    subfilterSlug,
    formattedSubfilter,
    filterType,
    isYear,
    isStatus,
    isUncensored,
    is3D,
  };
}

export async function generateMetadata({ params, searchParams }: ProgrammaticGenrePageProps): Promise<Metadata> {
  const { genre, subfilter } = await params;
  const { page } = await searchParams;
  const parsed = parseRouteFilter(genre, subfilter);

  let title = `${parsed.formattedGenre} (${parsed.formattedSubfilter}) Anime | HentaiKage`;
  let description = `Browse and stream ${parsed.formattedGenre} hentai anime series filtered by ${parsed.formattedSubfilter} in full 1080p HD with English subtitles free on HentaiKage.`;

  if (parsed.isYear) {
    title = `${parsed.formattedSubfilter} ${parsed.formattedGenre} Hentai | HentaiKage`;
    description = `Watch the best ${parsed.formattedGenre} hentai anime series released in ${parsed.formattedSubfilter}. Stream full episodes in 1080p HD on HentaiKage.`;
  } else if (parsed.isStatus) {
    title = `${parsed.formattedSubfilter} ${parsed.formattedGenre} Hentai | HentaiKage`;
    description = `Binge watch all ${parsed.formattedSubfilter.toLowerCase()} ${parsed.formattedGenre} hentai anime series with all episodes available online in HD on HentaiKage.`;
  } else if (parsed.isUncensored) {
    title = `Uncensored ${parsed.formattedGenre} Hentai | HentaiKage`;
    description = `Watch 100% uncensored ${parsed.formattedGenre} hentai anime series in high definition on HentaiKage.`;
  }

  let canonicalPath = `/genres/${parsed.genreSlug}/${parsed.subfilterSlug}`;
  if (page && page !== '1') {
    canonicalPath += `?page=${page}`;
  }

  const ogApiUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(title.replace(/\s*\|.*$/, '').trim())}&subtitle=${encodeURIComponent(description.slice(0, 80))}&badge=${encodeURIComponent(parsed.formattedSubfilter.toUpperCase())}&image=${encodeURIComponent(`${SITE_URL}/hero-banner.png`)}`;

    const keywords = [
      `${parsed.formattedGenre.toLowerCase()} ${parsed.formattedSubfilter.toLowerCase()}`,
      `${parsed.formattedSubfilter.toLowerCase()} ${parsed.formattedGenre.toLowerCase()} hentai`,
      `watch ${parsed.formattedGenre.toLowerCase()} anime`,
      'hentaikage',
      'hentai kage'
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
      type: 'website',
      images: [
        {
          url: ogApiUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogApiUrl],
    },
  };
}

export default async function ProgrammaticGenrePage({ params, searchParams }: ProgrammaticGenrePageProps) {
  const { genre, subfilter } = await params;
  const parsed = parseRouteFilter(genre, subfilter);

  const allPublished = await getLocalAllPublishedSeries();

  // Multi-facet filtering logic: must match BOTH primary genre AND the subfilter
  const filteredSeries = allPublished.filter((s: any) => {
    // 1. Primary Genre check
    const tags = (s.tags || []).map((t: string) => t.toLowerCase());
    const matchesGenre =
      tags.some((t: string) => t.includes(parsed.genreSlug) || parsed.genreSlug.includes(t)) ||
      (s.category && s.category.toLowerCase().includes(parsed.genreSlug));

    if (!matchesGenre) return false;

    // 2. Subfilter check
    if (parsed.isYear) {
      const targetYear = parseInt(parsed.subfilterSlug, 10);
      const sYear = s.release_year || s.releaseYear;
      return sYear === targetYear;
    }

    if (parsed.isStatus) {
      const sStatus = (s.status || '').toLowerCase();
      if (parsed.subfilterSlug === 'completed') {
        return sStatus === 'completed' || sStatus === 'finalized';
      }
      return sStatus === 'ongoing' || sStatus === 'releasing';
    }

    if (parsed.isUncensored) {
      return isUncensoredSeries(s);
    }

    if (parsed.is3D) {
      return tags.some((t: string) => t === '3d' || t === 'cgi' || t.includes('3d'));
    }

    // Secondary Tag check
    return tags.some((t: string) => t.includes(parsed.subfilterSlug) || parsed.subfilterSlug.includes(t));
  });

  const canonicalPath = `/genres/${parsed.genreSlug}/${parsed.subfilterSlug}`;

  let h1Text = `${parsed.formattedGenre} Anime (${parsed.formattedSubfilter})`;
  let introText = `Browse and watch ${parsed.formattedGenre} series filtered by ${parsed.formattedSubfilter}. All series stream in full 1080p HD.`;

  if (parsed.isYear) {
    h1Text = `Watch ${parsed.formattedGenre} Hentai Anime (${parsed.formattedSubfilter})`;
    introText = `Discover all ${parsed.formattedGenre} anime titles released in ${parsed.formattedSubfilter}. Stream complete episodes with English subtitles on HentaiKage.`;
  } else if (parsed.isStatus) {
    h1Text = `${parsed.formattedSubfilter} ${parsed.formattedGenre} Hentai Anime`;
    introText = `Stream complete ${parsed.formattedGenre} series that are ${parsed.formattedSubfilter.toLowerCase()}. Watch uninterrupted from start to finish.`;
  } else if (parsed.isUncensored) {
    h1Text = `Uncensored ${parsed.formattedGenre} Hentai Anime`;
    introText = `Enjoy 100% uncensored ${parsed.formattedGenre} adult anime episodes in high bitrate 1080p HD.`;
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Genres', 'item': `${SITE_URL}/genres` },
      { '@type': 'ListItem', 'position': 3, 'name': parsed.formattedGenre, 'item': `${SITE_URL}/genres/${parsed.genreSlug}` },
      { '@type': 'ListItem', 'position': 4, 'name': parsed.formattedSubfilter, 'item': `${SITE_URL}${canonicalPath}` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': h1Text,
    'description': introText,
    'url': `${SITE_URL}${canonicalPath}`,
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': filteredSeries.slice(0, 25).map((s: any, idx: number) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': s.title,
        'url': `${SITE_URL}/series/${s.slug}`,
      })),
    },
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <a href="/genres">Genres</a>
        <span className={styles.crumbDivider}>/</span>
        <a href={`/genres/${parsed.genreSlug}`}>{parsed.formattedGenre}</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>{parsed.formattedSubfilter}</span>
      </nav>

      {/* Programmatic Landing Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.libraryHighlightPill}>
            <Sparkles size={13} className={styles.libraryIconPill} /> {parsed.formattedSubfilter.toUpperCase()} CURATION
          </span>
          <span className={styles.libraryHighlightPill}>
            <Layers size={13} className={styles.libraryIconPill} /> {filteredSeries.length} SERIES MATCHES
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>{h1Text}</h1>
        </div>
        <p className={styles.subtext}>{introText}</p>
      </div>

      {/* Filterable Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub
          initialSeries={filteredSeries}
          isDbEmpty={filteredSeries.length === 0}
          basePath={canonicalPath}
        />
      </Suspense>
    </div>
  );
}
