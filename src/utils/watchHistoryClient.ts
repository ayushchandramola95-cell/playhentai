/**
 * Shared Client-side Watch History Provider
 * Deduplicates simultaneous fetch requests across multiple components (e.g. DynamicWatchCTA and SeriesEpisodesSection).
 */

let inFlightHistoryPromise: Promise<any[]> | null = null;
let memoryHistoryCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15s in-memory cache

export async function getClientWatchHistory(): Promise<any[]> {
  const now = Date.now();
  if (memoryHistoryCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return memoryHistoryCache;
  }

  if (inFlightHistoryPromise) {
    return inFlightHistoryPromise;
  }

  const fetchPromise = (async (): Promise<any[]> => {
    try {
      const res = await fetch('/api/watch-history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          memoryHistoryCache = data.history;
          cacheTimestamp = Date.now();
          return data.history;
        }
      }
    } catch {
      // Silently fall back to localStorage
    }

    // Guest fallback from localStorage
    try {
      const local = JSON.parse(
        localStorage.getItem('hentaikage_guest_history') ||
          localStorage.getItem('user_history') ||
          '[]'
      );
      if (Array.isArray(local)) {
        const guestHistory = local.map((h: any) => ({
          episode_id: h.episode_id || h.episodeId || h.id,
          last_position_seconds: h.last_position_seconds || h.position || 0,
          duration_seconds: h.duration_seconds || h.duration || 1440,
          watched_percentage: h.watched_percentage || h.percentage || 0,
          completed: h.completed || (h.percentage && h.percentage >= 90) || false,
        }));
        memoryHistoryCache = guestHistory;
        cacheTimestamp = Date.now();
        return guestHistory;
      }
    } catch {
      // ignore
    }

    return [];
  })().finally(() => {
    inFlightHistoryPromise = null;
  });

  inFlightHistoryPromise = fetchPromise;
  return await fetchPromise;
}
