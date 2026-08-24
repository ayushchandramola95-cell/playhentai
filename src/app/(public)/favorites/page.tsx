import React from 'react';
import { Metadata } from 'next';
import FavoritesClient from '@/components/FavoritesClient/FavoritesClient';

export const metadata: Metadata = {
  title: 'My Favorite Anime Series | Play Hentai',
  description: 'View and manage your favorite series collection on Play Hentai.',
  alternates: {
    canonical: 'https://playhentai.live/favorites',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
