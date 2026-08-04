import React from 'react';
import { Metadata } from 'next';
import FavoritesClient from '@/components/FavoritesClient/FavoritesClient';

export const metadata: Metadata = {
  title: 'My Favorite Anime Series | PlayHentai',
  description: 'View and manage your favorite series collection on PlayHentai.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
