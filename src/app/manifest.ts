import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Play Hentai — Premium Anime Streaming',
    short_name: 'Play Hentai',
    description: 'Watch high-definition uncensored anime series and episodes online for free with English subtitles.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#080808',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Trending Anime',
        short_name: 'Trending',
        description: 'Watch top trending hentai anime series',
        url: '/trending',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Genres Directory',
        short_name: 'Genres',
        description: 'Browse all hentai genres and thematic tags',
        url: '/genres',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Recent Episodes',
        short_name: 'Episodes',
        description: 'Stream recently released anime episodes in HD',
        url: '/recent/episodes',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Curated Playlists',
        short_name: 'Playlists',
        description: 'Explore popular collections and staff picks',
        url: '/playlists',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
