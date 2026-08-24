import React, { Suspense } from 'react';
import { getAllCollectionsWithPreviews } from '@/utils/collectionsData';
import CollectionsClient from '@/components/CollectionsClient/CollectionsClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab;
  const canonicalPath = tab && tab.toLowerCase() !== 'all'
    ? `/playlists?tab=${encodeURIComponent(tab)}`
    : '/playlists';

  const title = 'Curated Hentai Playlists — Anime Collections | Play Hentai';
  const description = 'Explore curated hentai anime playlists organized by theme, genre, and popular series. Discover hand-picked collections on Play Hentai.';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'Play Hentai Curated Hentai Playlists',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://media.playhentai.live/og-banner.jpg'],
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
    name: 'Curated Hentai Playlists — Play Hentai',
    url: `${SITE_URL}/playlists`,
    description: 'Explore curated hentai anime playlists organized by theme, genre, and popular series. Discover hand-picked collections on Play Hentai.',
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
