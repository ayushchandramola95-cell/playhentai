import React from 'react';
import { createClient } from '@/utils/supabase/server';
import HistoryClient from '@/components/HistoryClient/HistoryClient';

export const metadata = {
  title: 'Watch History - PlayHentai',
  description: 'Resume your saved video playback locations.',
};

const MOCK_EPISODES: Record<string, any> = {
  'mock-ep-1': { title: 'The Ghost Run', episode_number: 1, series_title: 'Cyberpunk Odyssey', thumbnail_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', duration_seconds: 1440 },
  'mock-ep-2': { title: 'Neon Gridlock', episode_number: 2, series_title: 'Cyberpunk Odyssey', thumbnail_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', duration_seconds: 1320 },
  'mock-ep-3': { title: 'Black Ice Firewall', episode_number: 3, series_title: 'Cyberpunk Odyssey', thumbnail_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', duration_seconds: 1500 },
  'mock-ep-4': { title: 'Ancient Whispers', episode_number: 1, series_title: 'Fantasy Chronicles: Runes', thumbnail_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', duration_seconds: 1380 },
  'mock-ep-5': { title: 'The Runic Compass', episode_number: 2, series_title: 'Fantasy Chronicles: Runes', thumbnail_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', duration_seconds: 1260 },
  'mock-ep-6': { title: 'Lost Monolith', episode_number: 3, series_title: 'Fantasy Chronicles: Runes', thumbnail_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', duration_seconds: 1480 },
  'mock-ep-7': { title: 'Midnight Rain', episode_number: 1, series_title: 'Neon Tokyo Noir', thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', duration_seconds: 1440 },
  'mock-ep-8': { title: 'Shadow Protocol', episode_number: 2, series_title: 'Neon Tokyo Noir', thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', duration_seconds: 1320 },
  'mock-ep-9': { title: 'Chrome Syndicate', episode_number: 3, series_title: 'Neon Tokyo Noir', thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', duration_seconds: 1500 }
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
        const episodeIds = data.map(d => d.episode_id).filter(Boolean);
        let episodesMap: Record<string, any> = {};

        if (episodeIds.length > 0) {
          const { data: dbEpisodes } = await supabase
            .from('episodes')
            .select('*, seasons(*, series(*))')
            .in('id', episodeIds);

          if (dbEpisodes) {
            dbEpisodes.forEach(ep => {
              episodesMap[ep.id] = ep;
            });
          }
        }

        // 3. Map each history log safely with full fallbacks so zero items are lost
        parsedHistory = data.map(item => {
          const dbEp = episodesMap[item.episode_id];
          const mockEp = MOCK_EPISODES[item.episode_id];

          const episode_title = dbEp?.title || mockEp?.title || `Episode ${item.episode_id}`;
          const episode_number = dbEp?.episode_number || mockEp?.episode_number || 1;
          const series_title = dbEp?.seasons?.series?.title || dbEp?.series_title || mockEp?.series_title || 'PlayHentai Series';
          const thumbnail_key = dbEp?.thumbnail_key || mockEp?.thumbnail_key || '';
          const duration_seconds = dbEp?.duration_seconds || mockEp?.duration_seconds || item.duration_seconds || 1400;

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
            thumbnail_key,
            duration_seconds
          };
        });
      }
    }
  } catch (err) {
    console.error('Error fetching watch history:', err);
  }

  return <HistoryClient initialHistory={parsedHistory} user={user} />;
}
