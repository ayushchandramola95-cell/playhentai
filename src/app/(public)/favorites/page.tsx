import React from 'react';
import { Metadata } from 'next';
import FavoritesClient from '@/components/FavoritesClient/FavoritesClient';

export const metadata: Metadata = {
  title: 'My Favorite Anime Series',
  description: 'View and manage your favorite series collection on PlayHentai.',
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
