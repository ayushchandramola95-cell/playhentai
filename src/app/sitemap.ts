import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { STUDIOS_METADATA } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';

export const revalidate = 7200;

const getCachedSitemapData = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let dbEpisodes: any[] = [];
    let dbPlaylists: any[] = [];
    let dbDistinctTags: string[] = [];
    let dbDistinctYears: number[] = [];

    try {
      const catalog = await getLocalCatalog();
      const publishedSeries = catalog.series.filter((s: any) => s.is_published !== false);
      dbSeries = publishedSeries;

      const yearSet = new Set<number>();
      publishedSeries.forEach((s: any) => {
        if (s.release_year && typeof s.release_year === 'number') {
          yearSet.add(s.release_year);
        }
      });
      dbDistinctYears = Array.from(yearSet);

      const seriesMap = new Map<string, any>();
      publishedSeries.forEach((s: any) => seriesMap.set(s.id, s));

      const seasonMap = new Map<string, any>();
      catalog.seasons.forEach((sn: any) => {
        if (sn.is_published !== false && seriesMap.has(sn.series_id)) {
          seasonMap.set(sn.id, seriesMap.get(sn.series_id));
        }
      });

      dbEpisodes = catalog.episodes
        .filter((ep: any) => ep.is_published !== false && seasonMap.has(ep.season_id))
        .map((ep: any) => {
          const seriesObj = seasonMap.get(ep.season_id);
          const seriesSlug = seriesObj?.slug;
          const watchSlug = seriesSlug && ep.episode_number ? `${seriesSlug}-episode-${ep.episode_number}` : ep.id;
          const thumbKey = ep.thumbnail_key || seriesObj?.cover_image_key || seriesObj?.poster_image_key;
          return {
            id: watchSlug,
            created_at: ep.created_at,
            image_key: thumbKey
          };
        });

      const tagSet = new Set<string>();
      publishedSeries.forEach((s: any) => {
        (s.tags || []).forEach((t: string) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      });
      dbDistinctTags = Array.from(tagSet);

      const validCollections = (catalog.collections || []).filter((c: any) => c.is_published !== false);
      if (validCollections.length > 0) {
        dbPlaylists = validCollections;
      } else {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const storePath = path.join(process.cwd(), 'src', 'utils', 'playlists_store.json');
          if (fs.existsSync(storePath)) {
            const raw = fs.readFileSync(storePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              dbPlaylists = parsed.map((p: any) => ({
                slug: p.slug,
                updated_at: new Date().toISOString(),
              }));
            }
          }
        } catch (storeErr) {
          console.error('Error reading playlists store fallback for sitemap:', storeErr);
        }
      }

    } catch (err) {
      console.error('Error gathering dynamic sitemap URLs from DB:', err);
    }

    return { dbSeries, dbEpisodes, dbPlaylists, dbDistinctTags, dbDistinctYears };
  },
  ['sitemap-data-cache-v2'],
  { revalidate: 7200, tags: ['sitemap_data', 'series_catalog', 'episodes_catalog'] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  
  // 1. Core Public Indexable Static Pages (Excludes private user account and internal search URLs)
  const staticPages = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/genres`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.85 },
    { url: `${baseUrl}/uncensored`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/3d`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/upcoming`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/ongoing`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/completed`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/recent/series`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/recent/episodes`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/playlists`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/studios`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/random`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/dmca`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/content-removal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/2257`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // 2. Category Pages
  const genres = [
    'action', 'sci-fi', 'fantasy', 'adventure', 'drama', 'mystery', 
    'romance', 'comedy', 'supernatural', 'slice-of-life', 'harem', 
    'ecchi', 'hentai', 'uncensored', '3d', 'cgi'
  ];
  const categoryPages = genres.map(genre => ({
    url: `${baseUrl}/categories/${genre}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const { dbSeries, dbEpisodes, dbPlaylists, dbDistinctTags, dbDistinctYears } = await getCachedSitemapData();

  // Fallbacks if database catalog is empty
  const activeSeries = dbSeries.length > 0 ? dbSeries : [
    { slug: 'cyberpunk-odyssey', created_at: new Date().toISOString() },
    { slug: 'fantasy-chronicles-runes', created_at: new Date().toISOString() },
    { slug: 'neon-tokyo-noir', created_at: new Date().toISOString() }
  ];

  const activeEpisodes = dbEpisodes.length > 0 ? dbEpisodes : [
    { id: 'cyberpunk-odyssey-episode-1', created_at: new Date().toISOString() },
    { id: 'cyberpunk-odyssey-episode-2', created_at: new Date().toISOString() },
    { id: 'cyberpunk-odyssey-episode-3', created_at: new Date().toISOString() }
  ];

  // 3. Dynamic Series Pages
  const seriesPages = activeSeries.map((s: any) => {
    const posterKey = s.poster_image_key || s.cover_image_key;
    const imageUrl = posterKey ? getR2Url(posterKey, 'poster') : undefined;
    return {
      url: `${baseUrl}/series/${s.slug}`,
      lastModified: s.created_at ? new Date(s.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      ...(imageUrl ? { images: [imageUrl] } : {})
    };
  });

  // 4. Dynamic Episode Pages
  const episodePages = activeEpisodes.map((ep: any) => {
    const thumbKey = ep.image_key;
    const imageUrl = thumbKey ? getR2Url(thumbKey, 'thumbnail') : undefined;
    return {
      url: `${baseUrl}/watch/${ep.id}`,
      lastModified: ep.created_at ? new Date(ep.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(imageUrl ? { images: [imageUrl] } : {})
    };
  });

  // 5. Studio Pages (from STUDIOS_METADATA)
  const studioDetailPages = STUDIOS_METADATA.map(studio => ({
    url: `${baseUrl}/studios/${(studio as any).slug || studio.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 6. Year Pages
  const activeYears = dbDistinctYears.length > 0 ? dbDistinctYears : [2024, 2025, 2026];
  const yearPages = activeYears.map(year => ({
    url: `${baseUrl}/year/${year}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 7. Tag Pages (Filter out tags that already have dedicated category pages to prevent keyword cannibalization)
  const categorySlugs = new Set(genres.map(g => tagToSlug(g)));
  const tagPages = dbDistinctTags
    .filter(tag => !categorySlugs.has(tagToSlug(tag)))
    .map(tag => ({
      url: `${baseUrl}/tag/${tagToSlug(tag)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }));

  // 8. Playlist / Collection Pages
  const playlistPages = dbPlaylists.map(pl => ({
    url: `${baseUrl}/playlists/${pl.slug}`,
    lastModified: pl.updated_at ? new Date(pl.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...seriesPages,
    ...episodePages,
    ...studioDetailPages,
    ...yearPages,
    ...tagPages,
    ...playlistPages,
  ];
}
