import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSeriesViewsMap } from '@/utils/views';
import FavoritesClient from '@/components/FavoritesClient/FavoritesClient';

export const metadata: Metadata = {
  title: 'My Favorite Anime Series | Play Hentai',
  description: 'Your personal collection of favorite anime series on Play Hentai.',
  alternates: {
    canonical: 'https://playhentai.live/favorites',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  let initialFavorites: any[] = [];
  let user = null;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const userFavs: string[] = Array.isArray(user.user_metadata?.favorites)
        ? user.user_metadata.favorites
        : [];

      if (userFavs.length > 0) {
        const adminSupabase = createAdminClient();
        const [seriesRes, viewsMap] = await Promise.all([
          adminSupabase
            .from('series')
            .select('*, seasons(is_published, episodes(is_published))')
            .in('id', userFavs),
          getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
        ]);

        if (seriesRes.data) {
          const sorted = [...seriesRes.data].sort((a, b) => {
            const idxA = userFavs.indexOf(a.id);
            const idxB = userFavs.indexOf(b.id);
            return idxB - idxA;
          });

          initialFavorites = sorted.map((s) => ({
            id: s.id,
            series_id: s.id,
            created_at: s.created_at,
            series: {
              ...s,
              views: viewsMap[s.id] || 0,
            },
          }));
        }
      }
    }
  } catch (err) {
    console.error('Error prefetching favorites:', err);
  }

  return <FavoritesClient initialFavorites={initialFavorites} user={user} />;
}
