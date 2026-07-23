import React from 'react';
import { getAllCollectionsWithPreviews } from '@/utils/collectionsData';
import CollectionsClient from '@/components/CollectionsClient/CollectionsClient';

export const metadata = {
  title: 'Curated Playlists - StreamNexus',
  description: 'Hand-picked collections of top series, movies, and episodes grouped by genre and themes.',
};

export default async function CollectionsPage() {
  const collections = await getAllCollectionsWithPreviews();
  return <CollectionsClient collections={collections} />;
}
