import React from 'react';
import { createClient } from '@/utils/supabase/server';
import HistoryClient from '@/components/HistoryClient/HistoryClient';

export const metadata = {
  title: 'Watch History | Play Hentai',
  description: 'Resume your saved video playback locations on Play Hentai.',
  alternates: {
    canonical: 'https://playhentai.live/history',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HistoryPage() {
  const supabase = await createClient();
  let parsedHistory: any[] = [];
  let user = null;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      // 1. Fetch watch history rows for this user
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('profile_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // 2. Fetch all matching episodes if available
        const episodeIds = data.map((d) => d.episode_id).filter(Boolean);
        let episodesMap: Record<string, any> = {};

        if (episodeIds.length > 0) {
          const { data: dbEpisodes } = await supabase
            .from('episodes')
            .select('*, seasons(*, series(*))')
            .in('id', episodeIds);

          if (dbEpisodes) {
            dbEpisodes.forEach((ep) => {
              episodesMap[ep.id] = ep;
            });
          }
        }

        // 3. Map each history log safely with full fallbacks
        parsedHistory = data.map((item) => {
          const dbEp = episodesMap[item.episode_id];

          const episode_title = dbEp?.title || `Episode ${item.episode_id}`;
          const episode_number = dbEp?.episode_number || 1;
          const series_title = dbEp?.seasons?.series?.title || dbEp?.series_title || 'PlayHentai Series';
          const series_slug = dbEp?.seasons?.series?.slug || '';
          const thumbnail_key = dbEp?.thumbnail_key || '';
          const duration_seconds = dbEp?.duration_seconds || item.duration_seconds || 1400;

          return {
            id: item.id || item.episode_id,
            episode_id: item.episode_id,
            last_position_seconds: item.last_position_seconds || 0,
            watched_percentage: item.watched_percentage || 0,
            completed: !!item.completed,
            updated_at: item.updated_at,
            episode_title,
            episode_number,
            series_title,
            series_slug,
            thumbnail_key,
            duration_seconds,
          };
        });
      }
    }
  } catch (err) {
    console.error('Error fetching watch history:', err);
  }

  return <HistoryClient initialHistory={parsedHistory} user={user} />;
}
