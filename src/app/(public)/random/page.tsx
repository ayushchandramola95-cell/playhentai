import React from 'react';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { MOCK_SERIES } from '@/utils/mockData';
import RandomizerPortal from './RandomizerPortal';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

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
    title: 'Random Hentai Anime Generator and Picker | Play Hentai',
    description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
    alternates: {
      canonical: `${SITE_URL}/random`,
    },
    robots,
    openGraph: {
      title: 'Random Hentai Anime Generator and Picker | Play Hentai',
      description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
      url: `${SITE_URL}/random`,
      siteName: 'Play Hentai',
      images: [
        {
          url: `${SITE_URL}/og-banner.png`,
          width: 1200,
          height: 630,
          alt: 'Random Hentai Anime Generator and Picker on Play Hentai',
          type: 'image/png',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Random Hentai Anime Generator and Picker | Play Hentai',
      description: 'Discover random hentai anime series with the Random Hentai Anime Generator. Shuffle the library, explore recommendations, and find new series to watch on Play Hentai.',
      images: [`${SITE_URL}/og-banner.png`],
    },
  };
}

export const revalidate = 120;

const getCachedRandomizerSeries = async () => {
  try {
    const dbSeries = await getLocalAllPublishedSeries();
    return { dbSeries, isDbEmpty: dbSeries.length === 0 };
  } catch (err) {
    console.error('Error fetching local series for randomizer:', err);
  }

  return { dbSeries: [], isDbEmpty: true };
};

export default async function RandomPage() {
  const { dbSeries, isDbEmpty } = await getCachedRandomizerSeries();
  const seriesList = isDbEmpty ? MOCK_SERIES : dbSeries;

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
