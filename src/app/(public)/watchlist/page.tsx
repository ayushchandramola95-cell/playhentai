import React from 'react';
import { getCurrentUserFromCookies, getUserWatchlist } from '@/utils/authStore';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import { getSeriesViewsMap } from '@/utils/views';
import WatchlistClient from '@/components/WatchlistClient/WatchlistClient';

export const metadata = {
  title: 'My Anime Watchlist | HentaiKage',
  description: 'Your saved series and bookmarked anime episodes on HentaiKage.',
  alternates: {
    canonical: 'https://hentaikage.cc/watchlist',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 0; // Dynamic user route

function sanitizeWatchlistSeries(s: any) {
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

export default async function WatchlistPage() {
  let watchlistItems: any[] = [];
  let user = null;

  try {
    user = await getCurrentUserFromCookies();

    if (user) {
      const userWatchlistIds = await getUserWatchlist(user.id);

      if (userWatchlistIds.length > 0) {
        const [allSeries, viewsMap] = await Promise.all([
          getLocalAllPublishedSeries(),
          getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
        ]);

        const matching = allSeries.filter((s) => userWatchlistIds.includes(s.id));
        const sorted = [...matching].sort((a, b) => {
          const idxA = userWatchlistIds.indexOf(a.id);
          const idxB = userWatchlistIds.indexOf(b.id);
          return idxA - idxB;
        });

        watchlistItems = sorted.map((s) => ({
          ...sanitizeWatchlistSeries(s),
          added_at: s.created_at || new Date().toISOString(),
          views: viewsMap[s.id] || s.views || 0,
        }));
      }
    }
  } catch (err) {
    console.error('Error fetching watchlist:', err);
  }

  const clientUser = user ? { id: user.id, email: user.email, username: user.username, role: user.role } : null;

  return <WatchlistClient initialSeries={watchlistItems} user={clientUser} />;
}
