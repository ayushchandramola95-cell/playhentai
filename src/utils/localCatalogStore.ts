import fs from 'fs';
import path from 'path';
import { getSeriesViewsMap } from '@/utils/views';
import { resolveSeriesMetrics, resolveEpisodeMetrics } from '@/utils/fakeMetricsStore';
import { MOCK_SERIES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { tagToSlug } from '@/utils/constants';
import { triggerDebouncedCatalogBackup, restoreCatalogFromS3 } from './s3DatabaseBackup';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const STORE_FILE = path.join(DATA_DIR, 'local_catalog.json');

export interface LocalCatalogData {
  lastSyncedAt: string;
  series: any[];
  seasons: any[];
  episodes: any[];
  collections: any[];
}

let memoryCatalog: LocalCatalogData | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeStoreToDisk(data: LocalCatalogData) {
  try {
    ensureDataDirectory();
    // Safety check: Never overwrite an existing populated file with an empty series array!
    if (!data.series || data.series.length === 0) {
      const existing = loadStoreFromDisk();
      if (existing && existing.series && existing.series.length > 0) {
        console.warn('[LocalStore] Safety safeguard: Refused to overwrite existing populated disk store with 0 series.');
        return;
      }
    }
    const tempFile = `${STORE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
    // Automatically trigger debounced S3 Sydney backup
    triggerDebouncedCatalogBackup();
  } catch (err) {
    console.error('Error writing local catalog store to disk:', err);
  }
}

function loadStoreFromDisk(): LocalCatalogData | null {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.series)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading local catalog store from disk:', err);
  }
  return null;
}

/**
 * Returns a synchronized catalog snapshot from memory or disk/S3.
 * Preserves zero-latency EC2 in-memory architecture with S3 disaster recovery.
 */
export async function syncLocalCatalogWithSupabase(): Promise<LocalCatalogData> {
  return await getLocalCatalog();
}

/**
 * Returns the current local catalog data.
 * If in memory, returns immediately (<0.05ms).
 * If memory is cold, loads from disk or restores from AWS S3 Sydney.
 */
export async function getLocalCatalog(): Promise<LocalCatalogData> {
  if (memoryCatalog && memoryCatalog.series && memoryCatalog.series.length > 0) {
    return memoryCatalog;
  }

  const diskData = loadStoreFromDisk();
  if (diskData && diskData.series && diskData.series.length > 0) {
    memoryCatalog = diskData;
    return memoryCatalog;
  }

  // Cold-boot S3 Restore Fallback: If local disk and memory are empty, restore from AWS S3 Sydney
  try {
    const s3Data = await restoreCatalogFromS3();
    if (s3Data && Array.isArray(s3Data.series) && s3Data.series.length > 0) {
      memoryCatalog = s3Data as LocalCatalogData;
      writeStoreToDisk(memoryCatalog);
      return memoryCatalog;
    }
  } catch (err: any) {
    console.warn('[LocalStore] S3 cold-boot restore check skipped:', err.message);
  }

  return {
    lastSyncedAt: new Date().toISOString(),
    series: [],
    seasons: [],
    episodes: [],
    collections: []
  };
}

/**
 * Synchronous memory-only getter (safe for high-concurrency loops).
 */
export function getLocalCatalogSync(): LocalCatalogData | null {
  if (memoryCatalog) return memoryCatalog;
  const diskData = loadStoreFromDisk();
  if (diskData) {
    memoryCatalog = diskData;
    return memoryCatalog;
  }
  return null;
}

// ============================================================================
// DUAL-WRITE MUTATIONS (Called by Admin API handlers on Create, Edit, Delete)
// ============================================================================

export async function upsertLocalSeries(seriesItem: any) {
  const catalog = await getLocalCatalog();
  const existingIdx = catalog.series.findIndex(s => s.id === seriesItem.id);
  if (existingIdx >= 0) {
    catalog.series[existingIdx] = { ...catalog.series[existingIdx], ...seriesItem };
  } else {
    catalog.series.unshift(seriesItem);
  }
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function submitLocalSeriesRating(seriesId: string, ratingScore: number): Promise<{ newRating: number; newVoteCount: number } | null> {
  const catalog = await getLocalCatalog();
  const series = catalog.series.find(s => s.id === seriesId);
  if (!series) return null;

  const currentRating = typeof series.rating === 'number' && series.rating > 0 ? series.rating : ratingScore;
  const currentVotes = typeof series.vote_count === 'number' && series.vote_count > 0 ? series.vote_count : 1;
  const newVotes = currentVotes + 1;
  const newRating = Number(((currentRating * currentVotes + ratingScore) / newVotes).toFixed(1));

  series.rating = newRating;
  series.vote_count = newVotes;
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);

  return { newRating, newVoteCount: newVotes };
}


export async function deleteLocalSeries(seriesId: string) {
  const catalog = await getLocalCatalog();
  catalog.series = catalog.series.filter(s => s.id !== seriesId);
  catalog.seasons = catalog.seasons.filter(s => s.series_id !== seriesId);
  const validSeasonIds = new Set(catalog.seasons.map(s => s.id));
  catalog.episodes = catalog.episodes.filter(e => validSeasonIds.has(e.season_id));
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function upsertLocalSeason(seasonItem: any) {
  const catalog = await getLocalCatalog();
  const existingIdx = catalog.seasons.findIndex(s => s.id === seasonItem.id);
  if (existingIdx >= 0) {
    catalog.seasons[existingIdx] = { ...catalog.seasons[existingIdx], ...seasonItem };
  } else {
    catalog.seasons.push(seasonItem);
  }
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function deleteLocalSeason(seasonId: string) {
  const catalog = await getLocalCatalog();
  catalog.seasons = catalog.seasons.filter(s => s.id !== seasonId);
  catalog.episodes = catalog.episodes.filter(e => e.season_id !== seasonId);
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function upsertLocalEpisode(episodeItem: any) {
  const catalog = await getLocalCatalog();
  const existingIdx = catalog.episodes.findIndex(e => e.id === episodeItem.id);
  if (existingIdx >= 0) {
    catalog.episodes[existingIdx] = { ...catalog.episodes[existingIdx], ...episodeItem };
  } else {
    catalog.episodes.push(episodeItem);
  }
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function deleteLocalEpisode(episodeId: string) {
  const catalog = await getLocalCatalog();
  catalog.episodes = catalog.episodes.filter(e => e.id !== episodeId);
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function upsertLocalCollection(collectionItem: any) {
  const catalog = await getLocalCatalog();
  const existingIdx = catalog.collections.findIndex(c => c.id === collectionItem.id);
  if (existingIdx >= 0) {
    catalog.collections[existingIdx] = { ...catalog.collections[existingIdx], ...collectionItem };
  } else {
    catalog.collections.push(collectionItem);
  }
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

export async function deleteLocalCollection(collectionId: string) {
  const catalog = await getLocalCatalog();
  catalog.collections = catalog.collections.filter(c => c.id !== collectionId);
  catalog.lastSyncedAt = new Date().toISOString();
  writeStoreToDisk(catalog);
}

// ============================================================================
// ULTRA-FAST LOCAL READ QUERIES (0ms latency, ZERO Supabase Egress)
// ============================================================================

/**
 * Returns all published series enriched with computed views and episode counts.
 */
export async function getLocalAllPublishedSeries(): Promise<any[]> {
  const catalog = await getLocalCatalog();
  const viewsMap: Record<string, number> = await getSeriesViewsMap().catch(() => ({}));

  const episodeCountMap: Record<string, number> = {};
  catalog.episodes.forEach(ep => {
    if (ep.is_published !== false) {
      episodeCountMap[ep.season_id] = (episodeCountMap[ep.season_id] || 0) + 1;
    }
  });

  const seriesEpisodeCountMap: Record<string, number> = {};
  catalog.seasons.forEach(sn => {
    if (sn.is_published !== false) {
      const eps = episodeCountMap[sn.id] || 0;
      seriesEpisodeCountMap[sn.series_id] = (seriesEpisodeCountMap[sn.series_id] || 0) + eps;
    }
  });

  // Pre-calculate first episode ID for each season
  const seasonFirstEpMap: Record<string, string> = {};
  const sortedEpisodes = [...catalog.episodes]
    .filter(ep => ep.is_published !== false)
    .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));

  sortedEpisodes.forEach(ep => {
    if (!seasonFirstEpMap[ep.season_id]) {
      seasonFirstEpMap[ep.season_id] = ep.id;
    }
  });

  // Sort seasons by season_number ascending
  const sortedSeasons = [...catalog.seasons]
    .filter(sn => sn.is_published !== false)
    .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));

  const seriesFirstEpMap: Record<string, string> = {};
  sortedSeasons.forEach(sn => {
    if (!seriesFirstEpMap[sn.series_id] && seasonFirstEpMap[sn.id]) {
      seriesFirstEpMap[sn.series_id] = seasonFirstEpMap[sn.id];
    }
  });

  const published = catalog.series.filter(s => s.is_published !== false);

  if (published.length === 0) {
    return MOCK_SERIES;
  }

  return published.map(s => {
    const isUpcoming = (s.status || '').toLowerCase() === 'upcoming' || Boolean(s.is_upcoming);
    const rawViews = isUpcoming ? 0 : (viewsMap[s.id] || s.views || 0);
    const rawRating = s.rating ?? null;
    const resolved = resolveSeriesMetrics(s.id, rawViews, rawRating, 0, isUpcoming);

    return {
      ...s,
      views: isUpcoming ? 0 : resolved.views,
      rating: resolved.rating,
      isBoosted: isUpcoming ? false : resolved.isBoosted,
      episode_count: s.episode_count_override || seriesEpisodeCountMap[s.id] || 0,
      firstEpisodeId: seriesFirstEpMap[s.id] || null,
    };
  });
}

/**
 * Returns detailed series metadata with all seasons and episodes for /series/[slug].
 */
export async function getLocalSeriesDetails(slug: string): Promise<{ dbSeries: any | null; dbSeasons: any[]; isDbEmpty: boolean }> {
  let catalog = await getLocalCatalog();
  const viewsMap: Record<string, number> = await getSeriesViewsMap().catch(() => ({}));

  let series = catalog.series.find(s => s.slug === slug && s.is_published !== false);



  if (!series) {
    if (catalog.series.length === 0) {
      const mockDetail = MOCK_SERIES_DETAILS[slug] || MOCK_SERIES.find(s => s.slug === slug);
      return {
        dbSeries: mockDetail || null,
        dbSeasons: mockDetail?.seasons || [],
        isDbEmpty: true
      };
    }
    return { dbSeries: null, dbSeasons: [], isDbEmpty: false };
  }

  const seasons = catalog.seasons
    .filter(sn => sn.series_id === series.id && sn.is_published !== false)
    .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));

  const seasonsWithEpisodes = seasons.map(sn => {
    const episodes = catalog.episodes
      .filter(ep => ep.season_id === sn.id && ep.is_published !== false)
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      .map(ep => {
        const resolvedEp = resolveEpisodeMetrics(ep.id, ep.views || 0, ep.rating ?? null, ep.episode_number || 1);
        return {
          ...ep,
          views: resolvedEp.views,
          views_count: resolvedEp.views,
          rating: resolvedEp.rating,
        };
      });
    return {
      ...sn,
      episodes
    };
  });

  const isUpcoming = (series.status || '').toLowerCase() === 'upcoming' || Boolean(series.is_upcoming);
  const rawSeriesViews = isUpcoming ? 0 : (viewsMap[series.id] || series.views || 0);
  const resolvedSeries = resolveSeriesMetrics(series.id, rawSeriesViews, series.rating ?? null, 0, isUpcoming);

  const enrichedSeries = {
    ...series,
    views: isUpcoming ? 0 : resolvedSeries.views,
    rating: resolvedSeries.rating,
  };

  return {
    dbSeries: enrichedSeries,
    dbSeasons: seasonsWithEpisodes,
    isDbEmpty: false
  };
}

/**
 * Resolves an episode for /watch/[episodeId].
 * Supports clean slugs like 'overflow-episode-1' or UUIDs or trailers.
 * Includes on-demand Supabase query fallback on cache miss.
 */
export async function getLocalResolvedEpisode(episodeId: string): Promise<any | null> {
  let catalog = await getLocalCatalog();

  // 1. Check if it's a slug format: 'series-slug-episode-N'
  const match = episodeId.match(/^(.*?)-episode-(\d+)$/i);
  if (match) {
    const seriesSlug = match[1];
    const episodeNum = parseInt(match[2], 10);

    let series = catalog.series.find(s => s.slug === seriesSlug && s.is_published !== false);

    if (series) {
      const seasons = catalog.seasons.filter(sn => sn.series_id === series.id && sn.is_published !== false);
      const seasonIds = new Set(seasons.map(s => s.id));
      let episodes = catalog.episodes.filter(e => seasonIds.has(e.season_id) && e.is_published !== false);

      let foundEp = episodes.find(e => e.episode_number === episodeNum);

      if (foundEp) {
        const parentSeason = seasons.find(s => s.id === foundEp.season_id);
        const resolvedEp = resolveEpisodeMetrics(foundEp.id, foundEp.views || 0, foundEp.rating ?? null, foundEp.episode_number || 1);
        const resolvedSeries = resolveSeriesMetrics(series.id, series.views || 0, series.rating ?? null);

        const siblingEps = episodes
          .filter(e => e.season_id === foundEp.season_id)
          .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
          .map(e => {
            const r = resolveEpisodeMetrics(e.id, e.views || 0, e.rating ?? null, e.episode_number || 1);
            return {
              ...e,
              views: r.views,
              views_count: r.views,
              rating: r.rating,
            };
          });

        const activeEpEnriched = {
          ...foundEp,
          views: resolvedEp.views,
          views_count: resolvedEp.views,
          rating: resolvedEp.rating,
        };

        const seriesEnriched = {
          ...series,
          views: resolvedSeries.views,
          views_count: resolvedSeries.views,
          rating: resolvedSeries.rating,
        };

        return {
          activeEpisode: activeEpEnriched,
          seriesDetails: seriesEnriched,
          seriesTitle: series.title,
          seriesSlug: series.slug,
          seasonTitle: parentSeason?.title || 'Season 1',
          seasonEpisodes: siblingEps.length > 0 ? siblingEps : [activeEpEnriched],
          isDbEmpty: false
        };
      }
    }
  }

  // 2. Check direct UUID match in episodes
  let ep = catalog.episodes.find(e => e.id === episodeId && e.is_published !== false);


  if (ep) {
    const parentSeason = catalog.seasons.find(s => s.id === ep.season_id);
    const series = parentSeason ? catalog.series.find(s => s.id === parentSeason.series_id) : null;
    const resolvedEp = resolveEpisodeMetrics(ep.id, ep.views || 0, ep.rating ?? null, ep.episode_number || 1);
    const resolvedSeries = series ? resolveSeriesMetrics(series.id, series.views || 0, series.rating ?? null) : null;

    const siblingEps = catalog.episodes
      .filter(e => e.season_id === ep.season_id && e.is_published !== false)
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      .map(e => {
        const r = resolveEpisodeMetrics(e.id, e.views || 0, e.rating ?? null, e.episode_number || 1);
        return {
          ...e,
          views: r.views,
          views_count: r.views,
          rating: r.rating,
        };
      });

    const activeEpEnriched = {
      ...ep,
      views: resolvedEp.views,
      views_count: resolvedEp.views,
      rating: resolvedEp.rating,
    };

    const seriesEnriched = series ? {
      ...series,
      views: resolvedSeries?.views ?? series.views,
      views_count: resolvedSeries?.views ?? series.views,
      rating: resolvedSeries?.rating ?? series.rating,
    } : null;

    return {
      activeEpisode: activeEpEnriched,
      seriesDetails: seriesEnriched,
      seriesTitle: seriesEnriched?.title || 'Series',
      seriesSlug: seriesEnriched?.slug || '',
      seasonTitle: parentSeason?.title || 'Season 1',
      seasonEpisodes: siblingEps.length > 0 ? siblingEps : [activeEpEnriched],
      isDbEmpty: false
    };
  }

  // 3. Check trailer
  if (episodeId.startsWith('trailer-')) {
    const seriesIdOrSlug = episodeId.replace('trailer-', '');
    const series = catalog.series.find(s => (s.id === seriesIdOrSlug || s.slug === seriesIdOrSlug) && s.is_published !== false);
    if (series) {
      const trailerEp = {
        id: episodeId,
        episode_number: 1,
        title: '[Preview] Trailer / Preview',
        description: 'Official trailer/preview for the upcoming release.',
        video_key: series.meta_title,
        thumbnail_key: series.cover_image_key || series.poster_image_key,
        duration_seconds: 180,
        release_date: series.created_at
      };
      return {
        activeEpisode: trailerEp,
        seriesDetails: series,
        seriesTitle: series.title,
        seriesSlug: series.slug,
        seasonTitle: 'Trailer',
        seasonEpisodes: [trailerEp],
        isDbEmpty: false
      };
    }
  }

  return null;
}

/**
 * Searches series instantly in-memory across title, alt titles, description, tags, studio.
 */
export async function searchLocalSeries(query: string, limit: number = 10): Promise<any[]> {
  const clean = query.toLowerCase().trim();
  if (!clean) return [];

  const catalog = await getLocalCatalog();
  const seriesList = (catalog.series || []).filter(s => s.is_published !== false);

  const exactMatches: any[] = [];
  const prefixMatches: any[] = [];
  const otherMatches: any[] = [];

  for (const s of seriesList) {
    const title = (s.title || '').toLowerCase();
    const altEng = (s.alt_title_english || '').toLowerCase();
    const altRom = (s.alt_title_romaji || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const studio = (s.studio || '').toLowerCase();
    const tags = Array.isArray(s.tags) ? s.tags.map((t: string) => t.toLowerCase()) : [];

    const item = {
      id: s.id,
      title: s.title,
      slug: s.slug,
      poster_image_key: s.poster_image_key,
      release_year: s.release_year || s.releaseYear,
      rating: s.rating,
      vote_count: s.vote_count,
      tags: s.tags,
      studio: s.studio,
    };

    if (title === clean || altEng === clean || altRom === clean) {
      exactMatches.push(item);
    } else if (title.startsWith(clean) || altEng.startsWith(clean) || altRom.startsWith(clean)) {
      prefixMatches.push(item);
    } else if (
      title.includes(clean) ||
      altEng.includes(clean) ||
      altRom.includes(clean) ||
      tags.some((t: string) => t.includes(clean)) ||
      studio.includes(clean) ||
      desc.includes(clean)
    ) {
      otherMatches.push(item);
    }

    if (exactMatches.length + prefixMatches.length + otherMatches.length >= limit * 2) {
      break;
    }
  }

  return [...exactMatches, ...prefixMatches, ...otherMatches].slice(0, limit);
}

/**
 * Returns series filtered by genre/tag slug.
 */
export async function getLocalSeriesByTag(slug: string): Promise<{ series: any[]; tagName: string }> {
  const allSeries = await getLocalAllPublishedSeries();

  const matching = allSeries.filter(s => {
    if (!s.tags || !Array.isArray(s.tags)) return false;
    return s.tags.some((t: string) => tagToSlug(t) === slug);
  });

  let tagName = slug.replace(/-/g, ' ');
  for (const s of allSeries) {
    if (s.tags && Array.isArray(s.tags)) {
      const matched = s.tags.find((t: string) => tagToSlug(t) === slug);
      if (matched) {
        tagName = matched;
        break;
      }
    }
  }

  return { series: matching.sort((a, b) => (b.views || 0) - (a.views || 0)), tagName };
}

/**
 * Returns series filtered by release year.
 */
export async function getLocalSeriesByYear(year: number): Promise<any[]> {
  const allSeries = await getLocalAllPublishedSeries();
  return allSeries.filter(s => {
    const yr = Number(s.release_year || s.releaseYear);
    return yr === year;
  });
}

/**
 * Returns series filtered by status ('ongoing', 'completed', 'upcoming').
 */
export async function getLocalSeriesByStatus(status: string): Promise<any[]> {
  const allSeries = await getLocalAllPublishedSeries();
  const target = status.toLowerCase();

  return allSeries.filter(s => {
    const st = (s.status || '').toLowerCase();
    if (target === 'ongoing') return st === 'ongoing' || st === 'airing';
    if (target === 'completed') return st === 'completed' || st === 'finished';
    if (target === 'upcoming') return st === 'upcoming' || Boolean(s.is_upcoming);
    return st === target;
  });
}

/**
 * Returns trending series sorted by views.
 */
export async function getLocalTrendingSeries(limit: number = 30): Promise<any[]> {
  const allSeries = await getLocalAllPublishedSeries();
  const nonUpcoming = allSeries.filter(s => (s.status || '').toLowerCase() !== 'upcoming' && !s.is_upcoming);
  return [...nonUpcoming].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limit);
}

/**
 * Returns distinct tags from published series.
 */
export async function getLocalDistinctTags(): Promise<string[]> {
  const allSeries = await getLocalAllPublishedSeries();
  const set = new Set<string>();
  allSeries.forEach(s => {
    (s.tags || []).forEach((t: string) => {
      if (t && t.trim()) set.add(t.trim());
    });
  });
  return Array.from(set).sort();
}

/**
 * Returns latest published episodes enriched with parent series data.
 */
export async function getLocalRecentEpisodes(limit: number = 50): Promise<any[]> {
  const catalog = await getLocalCatalog();
  const seriesMap = new Map<string, any>();
  catalog.series.forEach(s => {
    if (s.is_published !== false) {
      seriesMap.set(s.id, s);
    }
  });

  const seasonMap = new Map<string, any>();
  catalog.seasons.forEach(sn => {
    if (sn.is_published !== false && seriesMap.has(sn.series_id)) {
      seasonMap.set(sn.id, { ...sn, series: seriesMap.get(sn.series_id) });
    }
  });

  const publishedEpisodes = catalog.episodes
    .filter(ep => ep.is_published !== false && seasonMap.has(ep.season_id))
    .map(ep => {
      const season = seasonMap.get(ep.season_id);
      const series = season?.series;
      const resolvedEp = resolveEpisodeMetrics(ep.id, ep.views || 0, ep.rating ?? null, ep.episode_number || 1);
      return {
        id: ep.id,
        episode_number: ep.episode_number,
        title: series?.title ? `${series.title} - ${ep.title || `Episode ${ep.episode_number}`}` : ep.title,
        rawTitle: ep.title || '',
        showSlug: series?.slug || '',
        tags: series?.tags || [],
        views: resolvedEp.views,
        views_count: resolvedEp.views,
        rating: resolvedEp.rating,
        isNew: false,
        isUncensored: (ep.title || '').toLowerCase().includes('uncensored') || (series?.tags && series.tags.some((t: string) => t.toLowerCase() === 'uncensored')) || false,
        thumbnail: ep.thumbnail_key,
        release_date: ep.release_date,
        created_at: ep.created_at,
        seriesStatus: series?.status || '',
      };
    })
    .sort((a, b) => {
      const aTime = a.release_date ? new Date(a.release_date).getTime() : 0;
      const bTime = b.release_date ? new Date(b.release_date).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });

  return publishedEpisodes.slice(0, limit);
}

/**
 * Returns latest published series sorted by either latest episode air date or series creation.
 */
export async function getLocalRecentSeries(siteSortMode: string = 'latest_episode_desc'): Promise<any[]> {
  const catalog = await getLocalCatalog();
  const allSeries = await getLocalAllPublishedSeries();

  const seasonToSeries = new Map<string, string>();
  catalog.seasons.forEach(sn => {
    if (sn.is_published !== false) {
      seasonToSeries.set(sn.id, sn.series_id);
    }
  });

  const seriesLatestEpDate = new Map<string, number>();
  catalog.episodes.forEach(ep => {
    if (ep.is_published !== false && seasonToSeries.has(ep.season_id)) {
      const seriesId = seasonToSeries.get(ep.season_id)!;
      const epDate = new Date(ep.release_date || ep.created_at || 0).getTime();
      if (!isNaN(epDate)) {
        const current = seriesLatestEpDate.get(seriesId) || 0;
        if (epDate > current) {
          seriesLatestEpDate.set(seriesId, epDate);
        }
      }
    }
  });

  const enriched = allSeries
    .filter(s => (s.status || '').toLowerCase() !== 'upcoming')
    .map(s => {
      let fallbackSeriesDate = new Date(s.first_air_date || s.release_date || s.created_at || 0).getTime();
      if (isNaN(fallbackSeriesDate)) fallbackSeriesDate = 0;
      const latestEpisodeAirDate = seriesLatestEpDate.get(s.id) || 0;
      return {
        ...s,
        latestEpisodeAirDate,
        fallbackSeriesDate
      };
    });

  if (siteSortMode === 'series_created_desc') {
    return enriched.sort((a, b) => {
      const aDate = new Date(a.first_air_date || a.release_date || a.created_at || 0).getTime();
      const bDate = new Date(b.first_air_date || b.release_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  } else {
    return enriched.sort((a, b) => {
      const aEffectiveDate = Math.max(a.latestEpisodeAirDate, a.fallbackSeriesDate);
      const bEffectiveDate = Math.max(b.latestEpisodeAirDate, b.fallbackSeriesDate);
      return bEffectiveDate - aEffectiveDate;
    });
  }
}

/**
 * Returns published episodes formatted with season/series hierarchy for sitemaps and RSS feeds.
 */
export async function getLocalEpisodesWithSeriesHierarchy(): Promise<any[]> {
  const catalog = await getLocalCatalog();
  const seriesMap = new Map<string, any>();
  catalog.series.forEach(s => {
    if (s.is_published !== false) {
      seriesMap.set(s.id, s);
    }
  });

  const seasonMap = new Map<string, any>();
  catalog.seasons.forEach(sn => {
    if (sn.is_published !== false && seriesMap.has(sn.series_id)) {
      seasonMap.set(sn.id, {
        ...sn,
        series: seriesMap.get(sn.series_id)
      });
    }
  });

  return catalog.episodes
    .filter(ep => ep.is_published !== false && seasonMap.has(ep.season_id))
    .map(ep => {
      const seasonObj = seasonMap.get(ep.season_id);
      return {
        ...ep,
        seasons: seasonObj
      };
    });
}

/**
 * Updates storyboard metadata and history for a specific episode in memory and on disk.
 */
export async function updateLocalEpisodeStoryboard(episodeId: string, storyboardData: any): Promise<any> {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (episode) {
    episode.storyboard = {
      ...(episode.storyboard || {}),
      ...storyboardData,
      updated_at: new Date().toISOString()
    };
    writeStoreToDisk(catalog);
    return episode;
  }
  return null;
}

/**
 * Updates multi-resolution video qualities for a specific episode in memory and on disk.
 */
export async function updateLocalEpisodeQualities(episodeId: string, qualitiesData: any): Promise<any> {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (episode) {
    episode.video_qualities = {
      ...(episode.video_qualities || {}),
      ...qualitiesData,
      updated_at: new Date().toISOString()
    };
    writeStoreToDisk(catalog);
    return episode;
  }
  return null;
}

/**
 * Resets multi-resolution video qualities (replaces existing map) for a specific episode in memory and on disk.
 */
export async function resetLocalEpisodeQualities(episodeId: string, qualitiesData: any): Promise<any> {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (episode) {
    episode.video_qualities = {
      ...qualitiesData,
      updated_at: new Date().toISOString()
    };
    writeStoreToDisk(catalog);
    return episode;
  }
  return null;
}

/**
 * Removes an individual rendition ('720p' or '480p') from an episode's video qualities in memory and on disk.
 */
export async function removeLocalEpisodeQuality(episodeId: string, qualityKey: '720p' | '480p'): Promise<any> {
  const catalog = await getLocalCatalog();
  const episode = catalog.episodes.find((e: any) => e.id === episodeId);

  if (episode) {
    const q = { ...(episode.video_qualities || episode.raw_provider_payload?.video_qualities || {}) };
    delete q[qualityKey];
    q.updated_at = new Date().toISOString();
    episode.video_qualities = q;
    writeStoreToDisk(catalog);
    return episode;
  }
  return null;
}
