import React from 'react';
import { getCurrentUserFromCookies, getUserWatchHistory } from '@/utils/authStore';
import { getLocalEpisodesWithSeriesHierarchy } from '@/utils/localCatalogStore';
import HistoryClient from '@/components/HistoryClient/HistoryClient';

export const metadata = {
  title: 'Watch History | HentaiKage',
  description: 'Resume your saved video playback locations on HentaiKage.',
  alternates: {
    canonical: 'https://hentaikage.cc/history',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 0; // Dynamic user route

export default async function HistoryPage() {
  let parsedHistory: any[] = [];
  let user = null;

  try {
    user = await getCurrentUserFromCookies();

    if (user) {
      const historyEntries = await getUserWatchHistory(user.id);

      if (historyEntries.length > 0) {
        const episodeIds = historyEntries.map((d) => d.episode_id).filter(Boolean);
        let episodesMap: Record<string, any> = {};

        if (episodeIds.length > 0) {
          const allEpisodes = await getLocalEpisodesWithSeriesHierarchy();
          const idSet = new Set(episodeIds);
          allEpisodes.forEach((ep: any) => {
            if (idSet.has(ep.id)) {
              episodesMap[ep.id] = ep;
            }
          });
        }

        parsedHistory = historyEntries.map((item) => {
          const dbEp = episodesMap[item.episode_id];

          const episode_title = dbEp?.title || `Episode ${item.episode_id}`;
          const episode_number = dbEp?.episode_number || 1;
          const series_title = dbEp?.seasons?.series?.title || dbEp?.series_title || 'HentaiKage Series';
          const series_slug = dbEp?.seasons?.series?.slug || '';
          const thumbnail_key = dbEp?.thumbnail_key || '';
          const duration_seconds = dbEp?.duration_seconds || item.duration_seconds || 1400;

          return {
            id: item.episode_id,
            episode_id: item.episode_id,
            last_position_seconds: item.last_position_seconds || 0,
            watched_percentage: item.watched_percentage || 0,
            completed: Boolean(item.completed),
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

  const clientUser = user ? { id: user.id, email: user.email, username: user.username, role: user.role } : null;

  return <HistoryClient initialHistory={parsedHistory} user={clientUser} />;
}
