import React from 'react';
import type { Metadata } from 'next';
import { getAllGenresWithStats } from '@/utils/genresData';
import GenresDirectoryClient from '@/components/GenresDirectory/GenresDirectoryClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Hentai Anime Genres & Categories Directory | HentaiKage',
  description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on HentaiKage.',
  keywords: [
    'hentai genres',
    'hentai anime categories',
    'hentai tags list',
    'browse hentai anime',
    'uncensored genres',
    'hentaikage',
    'anime themes'
  ],
  alternates: {
    canonical: `${SITE_URL}/genres`,
  },
  openGraph: {
    title: 'Hentai Anime Genres & Categories Directory | HentaiKage',
    description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on HentaiKage.',
    url: `${SITE_URL}/genres`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/api/og?title=Genres%20Directory&subtitle=Explore%20100%2B%20anime%20genres%20and%20categories&badge=100%2B%20GENRES`,
        width: 1200,
        height: 630,
        alt: 'HentaiKage Genres Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hentai Anime Genres & Categories Directory | HentaiKage',
    description: 'Browse all 100+ hentai anime genres, themes, and tags with high-definition artwork, series counts, ratings, and episode catalogs on HentaiKage.',
    images: [`${SITE_URL}/api/og?title=Genres%20Directory&subtitle=Explore%20100%2B%20anime%20genres%20and%20categories&badge=100%2B%20GENRES`],
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
