import React from 'react';
import { getAllCollectionsWithPreviews } from '@/utils/collectionsData';
import CollectionsClient from '@/components/CollectionsClient/CollectionsClient';
import JsonLd from '@/components/JsonLd/JsonLd';

export const metadata = {
  title: 'Curated Anime Playlists & Collections | PlayHentai',
  description: 'Explore hand-picked playlists and thematic series collections of top 1080p anime series on PlayHentai.',
  alternates: {
    canonical: '/playlists',
  },
  openGraph: {
    title: 'Curated Anime Playlists & Collections | PlayHentai',
    description: 'Explore hand-picked playlists and thematic series collections of top 1080p anime series on PlayHentai.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}/playlists`,
    type: 'website' as const,
  },
};

export default async function PlaylistsPage() {
  const collections = await getAllCollectionsWithPreviews();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'Playlists', 'item': `${siteUrl}/playlists` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Curated Anime Playlists',
    url: `${siteUrl}/playlists`,
    description: 'Hand-picked collections of top series, movies, and episodes grouped by genre and themes.',
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <CollectionsClient collections={collections} />
    </>
  );
}
