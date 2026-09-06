import React from 'react';
import type { Metadata } from 'next';
import { getAllGenresWithStats } from '@/utils/genresData';
import GenresDirectoryClient from '@/components/GenresDirectory/GenresDirectoryClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const metadata: Metadata = {
  title: 'Hentai Anime Genres & Categories Directory | Play Hentai',
  description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on Play Hentai.',
  alternates: {
    canonical: `${SITE_URL}/genres`,
  },
  openGraph: {
    title: 'Hentai Anime Genres & Categories Directory | Play Hentai',
    description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on Play Hentai.',
    url: `${SITE_URL}/genres`,
    siteName: 'Play Hentai',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/hero-banner.png`,
        width: 1200,
        height: 630,
        alt: 'Play Hentai Genres Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hentai Anime Genres & Categories Directory | Play Hentai',
    description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on Play Hentai.',
    images: [`${SITE_URL}/hero-banner.png`],
  },
};

export default async function GenresPage() {
  const genres = await getAllGenresWithStats();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Genres', 'item': `${SITE_URL}/genres` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Hentai Anime Genres Directory',
    'description': 'Complete visual directory of 100+ hentai anime genres and categories.',
    'url': `${SITE_URL}/genres`,
    'mainEntity': {
      '@type': 'ItemList',
      'name': 'Hentai Genres List',
      'itemListElement': genres.slice(0, 30).map((g, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'name': g.name,
        'url': `${SITE_URL}/categories/${g.slug}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <GenresDirectoryClient genres={genres} />
    </>
  );
}
