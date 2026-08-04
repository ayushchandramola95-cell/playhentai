import React, { Suspense } from 'react';
import { getAllCollectionsWithPreviews } from '@/utils/collectionsData';
import CollectionsClient from '@/components/CollectionsClient/CollectionsClient';

export const metadata = {
  title: 'Curated Playlists - PlayHentai',
  description: 'Hand-picked collections of top series, movies, and episodes grouped by genre and themes.',
  alternates: {
    canonical: '/playlists',
  },
};

export default async function CollectionsPage() {
  const collections = await getAllCollectionsWithPreviews();
  return (
    <Suspense fallback={null}>
      <CollectionsClient collections={collections} />
    </Suspense>
  );
}
