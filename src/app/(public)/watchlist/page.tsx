import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { getSeriesViewsMap } from '@/utils/views';
import WatchlistClient from '@/components/WatchlistClient/WatchlistClient';

export const metadata = {
  title: 'My Anime Watchlist | Play Hentai',
  description: 'Your saved series and bookmarked anime episodes on Play Hentai.',
  alternates: {
    canonical: 'https://playhentai.live/watchlist',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WatchlistPage() {
  const supabase = await createClient();
  let watchlistItems: any[] = [];
  let user = null;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const [watchlistResult, viewsMap] = await Promise.all([
        supabase
          .from('watchlist')
          .select('*, series(*)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false }),
        getSeriesViewsMap('all').catch(() => ({} as Record<string, number>))
      ]);

      if (!watchlistResult.error && watchlistResult.data) {
        watchlistItems = watchlistResult.data
          .map((item) => {
            if (!item.series) return null;
            return {
              ...item.series,
              added_at: item.created_at,
              views: viewsMap[item.series.id] || 0
            };
          })
          .filter(Boolean);
      }
    }
  } catch (err) {
    console.error('Error fetching watchlist:', err);
  }

  return <WatchlistClient initialSeries={watchlistItems} user={user} />;
}
