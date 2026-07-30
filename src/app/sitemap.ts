import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { STUDIOS_METADATA } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  
  // 1. Core Static Pages
  const staticPages = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
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
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/watchlist`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/history`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/favorites`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/settings`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/dmca`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
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

  let dbSeries: any[] = [];
  let dbEpisodes: any[] = [];
  let dbPlaylists: any[] = [];
  let dbDistinctTags: string[] = [];
  let dbDistinctYears: number[] = [];

  try {
    // Cookie-free Supabase client for static sitemap generation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch published series
    const { data: series } = await supabase
      .from('series')
      .select('slug, created_at, release_year, status')
      .eq('is_published', true);

    if (series) {
      dbSeries = series;
      const yearSet = new Set<number>();
      series.forEach((s: any) => {
        if (s.release_year && typeof s.release_year === 'number') {
          yearSet.add(s.release_year);
        }
      });
      dbDistinctYears = Array.from(yearSet);
    }

    // Fetch published episodes with joined series slug for clean URLs
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, episode_number, created_at, seasons(series(slug))')
      .eq('is_published', true);

    if (episodes && episodes.length > 0) {
      dbEpisodes = episodes.map((ep: any) => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        const seriesSlug = seriesObj?.slug;
        const watchSlug = seriesSlug && ep.episode_number ? `${seriesSlug}-episode-${ep.episode_number}` : ep.id;
        return {
          id: watchSlug,
          created_at: ep.created_at
        };
      });
    }

    // Fetch all distinct tags from published series for tag pages
    const { data: seriesWithTags } = await supabase
      .from('series')
      .select('tags')
      .eq('is_published', true);

    if (seriesWithTags) {
      const tagSet = new Set<string>();
      seriesWithTags.forEach((row: any) => {
        (row.tags || []).forEach((t: string) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      });
      dbDistinctTags = Array.from(tagSet);
    }

    // Fetch playlists / collections
    const { data: collections } = await supabase
      .from('collections')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (collections) {
      dbPlaylists = collections;
    }

  } catch (err) {
    console.error('Error gathering dynamic sitemap URLs from DB:', err);
  }

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
  const seriesPages = activeSeries.map(s => ({
    url: `${baseUrl}/series/${s.slug}`,
    lastModified: s.created_at ? new Date(s.created_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // 4. Dynamic Episode Pages
  const episodePages = activeEpisodes.map(ep => ({
    url: `${baseUrl}/watch/${ep.id}`,
    lastModified: ep.created_at ? new Date(ep.created_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

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

  // 7. Tag Pages
  const tagPages = dbDistinctTags.map(tag => ({
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
