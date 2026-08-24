import React from 'react';
import { createClient } from '@/utils/supabase/server';
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
      const { data, error } = await supabase
        .from('watchlist')
        .select('*, series(*)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        watchlistItems = data.map(item => item.series).filter(Boolean);
      }
    }
  } catch (err) {
    console.error('Error fetching watchlist:', err);
  }

  return <WatchlistClient initialSeries={watchlistItems} user={user} />;
}
