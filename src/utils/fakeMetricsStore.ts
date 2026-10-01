import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const METRICS_FILE = path.join(DATA_DIR, 'fake_metrics.json');

export interface FakeMetricsConfig {
  enabled: boolean;
  mode: 'boosted' | 'real';
  generatedAt: string | null;
  settings: {
    minEpisodeViews: number;
    maxEpisodeViews: number;
    minRating: number;
    maxRating: number;
  };
  series: Record<string, { views: number; rating: number }>;
  episodes: Record<string, { views: number; rating: number }>;
}

const DEFAULT_CONFIG: FakeMetricsConfig = {
  enabled: true,
  mode: 'boosted',
  generatedAt: null,
  settings: {
    minEpisodeViews: 10000,
    maxEpisodeViews: 300000,
    minRating: 7.8,
    maxRating: 9.7,
  },
  series: {},
  episodes: {},
};

let memoryConfig: FakeMetricsConfig | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfigFromDisk(): FakeMetricsConfig {
  try {
    ensureDataDir();
    if (fs.existsSync(METRICS_FILE)) {
      const content = fs.readFileSync(METRICS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.enabled === 'boolean') {
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          settings: { ...DEFAULT_CONFIG.settings, ...(parsed.settings || {}) },
          series: parsed.series || {},
          episodes: parsed.episodes || {},
        };
      }
    }
  } catch (err) {
    console.error('[FakeMetricsStore] Error reading fake_metrics.json:', err);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfigToDisk(config: FakeMetricsConfig) {
  try {
    ensureDataDir();
    const tempFile = `${METRICS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(config, null, 2), 'utf-8');
    fs.renameSync(tempFile, METRICS_FILE);
  } catch (err) {
    console.error('[FakeMetricsStore] Error writing fake_metrics.json:', err);
  }
}

export function getFakeMetricsConfig(): FakeMetricsConfig {
  if (!memoryConfig) {
    memoryConfig = loadConfigFromDisk();
  }
  return memoryConfig;
}

export function isFakeMetricsActive(): boolean {
  const config = getFakeMetricsConfig();
  return config.enabled === true && config.mode === 'boosted';
}

/**
 * Deterministic pseudo-random number generator for fallback items
 * (e.g. newly created series/episodes before 1-click batch generation)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getDeterministicFakeEpisodeViews(
  episodeId: string,
  minViews = 10000,
  maxViews = 300000,
  episodeNumber = 1
): number {
  const h = hashString(episodeId);
  const rawRange = maxViews - minViews;
  // Natural episode decay curve (Episode 1 has highest viewership, sequels taper gently)
  const decayFactor = Math.max(0.65, 1 - (episodeNumber - 1) * 0.08);
  const baseViews = minViews + (h % rawRange);
  const calculated = Math.round(baseViews * decayFactor);
  // Round to nearest 50 for realistic human-like traffic
  return Math.max(minViews, Math.min(maxViews, Math.round(calculated / 50) * 50));
}

export function getDeterministicFakeRating(
  id: string,
  minRating = 7.8,
  maxRating = 9.7
): number {
  const h = hashString(id);
  const range = maxRating - minRating;
  const raw = minRating + ((h % 1000) / 1000) * range;
  return Math.round(raw * 10) / 10;
}

/**
 * Resolves boosted views & rating for an episode, taking into account
 * whether fake metrics mode is active.
 * Never touches or overwrites real database tracking!
 */
export function resolveEpisodeMetrics(
  episodeId: string,
  realViews = 0,
  realRating: number | null = null,
  episodeNumber = 1
): { views: number; rating: number | null; isBoosted: boolean } {
  const config = getFakeMetricsConfig();
  if (!config.enabled || config.mode !== 'boosted') {
    return {
      views: realViews,
      rating: realRating,
      isBoosted: false,
    };
  }

  const stored = config.episodes[episodeId];
  const boostedViews = stored
    ? stored.views
    : getDeterministicFakeEpisodeViews(
        episodeId,
        config.settings.minEpisodeViews,
        config.settings.maxEpisodeViews,
        episodeNumber
      );

  const boostedRating = stored
    ? stored.rating
    : getDeterministicFakeRating(
        episodeId,
        config.settings.minRating,
        config.settings.maxRating
      );

  // Add any real views on top of boosted views so real plays still increment the counter!
  return {
    views: boostedViews + (realViews || 0),
    rating: boostedRating,
    isBoosted: true,
  };
}

/**
 * Resolves boosted views & rating for a series.
 */
export function resolveSeriesMetrics(
  seriesId: string,
  realViews = 0,
  realRating: number | null = null,
  aggregatedEpisodeViews = 0,
  isUpcoming = false
): { views: number; rating: number | null; isBoosted: boolean } {
  const config = getFakeMetricsConfig();

  // Upcoming series never display views
  if (isUpcoming) {
    const stored = config.series[seriesId];
    const boostedRating = stored
      ? stored.rating
      : getDeterministicFakeRating(
          seriesId,
          config.settings.minRating,
          config.settings.maxRating
        );
    return {
      views: 0,
      rating: boostedRating,
      isBoosted: false,
    };
  }

  if (!config.enabled || config.mode !== 'boosted') {
    return {
      views: realViews,
      rating: realRating,
      isBoosted: false,
    };
  }

  const stored = config.series[seriesId];
  let boostedViews = 0;

  if (stored) {
    boostedViews = stored.views;
  } else if (aggregatedEpisodeViews > 0) {
    boostedViews = aggregatedEpisodeViews;
  } else {
    // Standalone series views fallback
    const h = hashString(seriesId);
    boostedViews =
      config.settings.minEpisodeViews * 2 +
      (h % (config.settings.maxEpisodeViews * 2));
    boostedViews = Math.round(boostedViews / 100) * 100;
  }

  const boostedRating = stored
    ? stored.rating
    : getDeterministicFakeRating(
        seriesId,
        config.settings.minRating,
        config.settings.maxRating
      );

  return {
    views: boostedViews + (realViews || 0),
    rating: boostedRating,
    isBoosted: true,
  };
}

/**
 * 1-Click Generator: Automatically generates realistic fake views and ratings
 * for all catalog series and episodes without altering real DB data.
 */
export async function generateAllFakeMetrics(options?: {
  minEpisodeViews?: number;
  maxEpisodeViews?: number;
  minRating?: number;
  maxRating?: number;
}): Promise<{
  seriesCount: number;
  episodesCount: number;
  totalViews: number;
  avgRating: number;
}> {
  // Dynamically import local catalog store to avoid circular imports
  const { getLocalCatalog } = await import('@/utils/localCatalogStore');
  const catalog = await getLocalCatalog();

  const current = getFakeMetricsConfig();
  const minViews = options?.minEpisodeViews ?? current.settings.minEpisodeViews ?? 10000;
  const maxViews = options?.maxEpisodeViews ?? current.settings.maxEpisodeViews ?? 300000;
  const minRate = options?.minRating ?? current.settings.minRating ?? 7.8;
  const maxRate = options?.maxRating ?? current.settings.maxRating ?? 9.7;

  const seriesMap: Record<string, { views: number; rating: number }> = {};
  const episodesMap: Record<string, { views: number; rating: number }> = {};

  let totalViewsSum = 0;
  let totalRatingSum = 0;
  let ratingCount = 0;

  // Group episodes by season & series
  const seasonToSeries = new Map<string, string>();
  catalog.seasons.forEach((sn: any) => {
    if (sn.id && sn.series_id) {
      seasonToSeries.set(sn.id, sn.series_id);
    }
  });

  const seriesEpisodes = new Map<string, any[]>();
  catalog.episodes.forEach((ep: any) => {
    const sId = seasonToSeries.get(ep.season_id);
    if (sId) {
      if (!seriesEpisodes.has(sId)) {
        seriesEpisodes.set(sId, []);
      }
      seriesEpisodes.get(sId)!.push(ep);
    }
  });

  // Generate per series & per episode
  catalog.series.forEach((s: any) => {
    const isUpcoming = (s.status || '').toLowerCase() === 'upcoming' || Boolean(s.is_upcoming);
    const eps = (seriesEpisodes.get(s.id) || []).sort(
      (a: any, b: any) => (a.episode_number || 0) - (b.episode_number || 0)
    );

    let seriesTotalViews = 0;
    const seriesRatings: number[] = [];

    if (!isUpcoming) {
      // Realistic first-episode baseline (random within upper 60% of range)
      const baseEp1Views =
        minViews +
        Math.floor(Math.random() * (maxViews - minViews * 1.5)) +
        minViews;

      eps.forEach((ep: any, idx: number) => {
        // Episode decay: Episode 1 is highest, subsequent episodes retain 84%-96% of prior
        const decay = Math.pow(0.88 + Math.random() * 0.08, idx);
        const rawViews = Math.max(minViews, Math.round(baseEp1Views * decay));
        const roundedViews = Math.round(rawViews / 50) * 50;

        // Smart rating between minRate and maxRate
        const epRating =
          Math.round((minRate + Math.random() * (maxRate - minRate)) * 10) / 10;

        episodesMap[ep.id] = {
          views: roundedViews,
          rating: epRating,
        };

        seriesTotalViews += roundedViews;
        seriesRatings.push(epRating);
        totalViewsSum += roundedViews;
        totalRatingSum += epRating;
        ratingCount++;
      });

      // If series has no episodes yet and is not upcoming, provide a realistic series view count
      if (eps.length === 0) {
        seriesTotalViews =
          minViews * 2 +
          Math.floor(Math.random() * (maxViews - minViews)) * 2;
        seriesTotalViews = Math.round(seriesTotalViews / 100) * 100;
        totalViewsSum += seriesTotalViews;
      }
    } else {
      // Upcoming series strictly have 0 views
      seriesTotalViews = 0;
    }

    const seriesRating =
      seriesRatings.length > 0
        ? Math.round(
            (seriesRatings.reduce((a, b) => a + b, 0) / seriesRatings.length) * 10
          ) / 10
        : Math.round((minRate + Math.random() * (maxRate - minRate)) * 10) / 10;

    seriesMap[s.id] = {
      views: seriesTotalViews,
      rating: seriesRating,
    };
  });

  const updatedConfig: FakeMetricsConfig = {
    enabled: true,
    mode: 'boosted',
    generatedAt: new Date().toISOString(),
    settings: {
      minEpisodeViews: minViews,
      maxEpisodeViews: maxViews,
      minRating: minRate,
      maxRating: maxRate,
    },
    series: seriesMap,
    episodes: episodesMap,
  };

  memoryConfig = updatedConfig;
  saveConfigToDisk(updatedConfig);

  return {
    seriesCount: Object.keys(seriesMap).length,
    episodesCount: Object.keys(episodesMap).length,
    totalViews: totalViewsSum,
    avgRating:
      ratingCount > 0 ? Math.round((totalRatingSum / ratingCount) * 10) / 10 : 8.8,
  };
}

/**
 * 1-Click Reset: Clears all fake metrics and returns to pure database metrics.
 */
export function resetAllFakeMetrics(): void {
  const current = getFakeMetricsConfig();
  const resetConfig: FakeMetricsConfig = {
    ...current,
    enabled: false,
    mode: 'real',
    generatedAt: null,
    series: {},
    episodes: {},
  };
  memoryConfig = resetConfig;
  saveConfigToDisk(resetConfig);
}

/**
 * Switch display mode between 'boosted' and 'real'
 */
export function setFakeMetricsMode(mode: 'boosted' | 'real'): FakeMetricsConfig {
  const current = getFakeMetricsConfig();
  const updated: FakeMetricsConfig = {
    ...current,
    mode,
    enabled: mode === 'boosted',
  };
  memoryConfig = updated;
  saveConfigToDisk(updated);
  return updated;
}
