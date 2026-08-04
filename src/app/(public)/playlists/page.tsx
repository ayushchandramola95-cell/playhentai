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

  return {
    title: 'Curated Hentai Playlists & Collections | PlayHentai',
    description: 'Explore hand-picked hentai playlists and thematic series collections of top 1080p anime series on PlayHentai.',
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: 'Curated Hentai Playlists & Collections | PlayHentai',
      description: 'Explore hand-picked hentai playlists and thematic series collections of top 1080p anime series on PlayHentai.',
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'PlayHentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: 'https://media.playhentai.live/og-banner.jpg',
          width: 1200,
          height: 630,
          alt: 'PlayHentai Curated Hentai Playlists',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Curated Hentai Playlists & Collections | PlayHentai',
      description: 'Explore hand-picked hentai playlists and thematic series collections of top 1080p anime series on PlayHentai.',
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
    name: 'Curated Anime Playlists',
    url: `${SITE_URL}/playlists`,
    description: 'Hand-picked collections of top series, movies, and episodes grouped by genre and themes.',
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
