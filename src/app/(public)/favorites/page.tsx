import React from 'react';
import { Metadata } from 'next';
import { getCurrentUserFromCookies, getUserFavorites } from '@/utils/authStore';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { getSeriesViewsMap } from '@/utils/views';
import FavoritesClient from '@/components/FavoritesClient/FavoritesClient';

export const metadata: Metadata = {
  title: 'My Favorite Anime Series | HentaiKage',
  description: 'Your personal collection of favorite anime series on HentaiKage.',
  alternates: {
    canonical: 'https://hentaikage.cc/favorites',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 0; // Dynamic user route

function sanitizeFavoriteSeries(s: any) {
  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description || '',
    poster_image_key: s.poster_image_key,
    cover_image_key: s.cover_image_key,
    poster_position: s.poster_position,
    tags: s.tags || [],
    category: s.category || '',
    studio: s.studio || '',
    release_year: s.release_year || s.releaseYear,
    releaseYear: s.releaseYear || s.release_year,
    status: s.status || '',
    content_rating: s.content_rating || '',
    views: s.views || 0,
    rating: s.rating,
  };
}

export default async function FavoritesPage() {
  let initialFavorites: any[] = [];
  let user = null;

  try {
    user = await getCurrentUserFromCookies();

    if (user) {
      const userFavs = await getUserFavorites(user.id);

      if (userFavs.length > 0) {
        const [allSeries, viewsMap] = await Promise.all([
          getLocalAllPublishedSeries(),
          getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
        ]);

        const matching = allSeries.filter((s) => userFavs.includes(s.id));

        const sorted = [...matching].sort((a, b) => {
          const idxA = userFavs.indexOf(a.id);
          const idxB = userFavs.indexOf(b.id);
          return idxB - idxA;
        });

        initialFavorites = sorted.map((s) => ({
          id: s.id,
          series_id: s.id,
          created_at: s.created_at || new Date().toISOString(),
          series: sanitizeFavoriteSeries({
            ...s,
            views: viewsMap[s.id] || s.views || 0,
          }),
        }));
      }
    }
  } catch (err) {
    console.error('Error prefetching favorites:', err);
  }

  // Pass sanitized user object (without passwordHash/salt)
  const clientUser = user ? { id: user.id, email: user.email, username: user.username, role: user.role } : null;

  return <FavoritesClient initialFavorites={initialFavorites} user={clientUser} />;
}
