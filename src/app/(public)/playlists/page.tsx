import React, { Suspense } from 'react';
import { getAllCollectionsWithPreviews } from '@/utils/collectionsData';
import CollectionsClient from '@/components/CollectionsClient/CollectionsClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export const revalidate = 120;

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab;
  const canonicalPath = '/playlists';

  const title = 'Curated Hentai Playlists – Watch Themed Series | HentaiKage';
  const description = 'Explore hand-picked curated hentai anime playlists and collections organized by genre, theme, and popularity. Stream full series in 1080p HD on HentaiKage.';
  const keywords = [
    'hentai playlists',
    'hentai collections',
    'curated hentai anime',
    'themed hentai series',
    'watch hentai playlists',
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
          alt: 'HentaiKage Curated Hentai Playlists',
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

export default async function PlaylistsPage() {
  const collections = await getAllCollectionsWithPreviews();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Playlists', 'item': `${SITE_URL}/playlists` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Curated Hentai Playlists — HentaiKage',
    url: `${SITE_URL}/playlists`,
    description: 'Explore curated hentai anime playlists organized by theme, genre, and popular series. Discover hand-picked collections on HentaiKage.',
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <Suspense fallback={null}>
        <CollectionsClient collections={collections} />
      </Suspense>
    </>
  );
}
