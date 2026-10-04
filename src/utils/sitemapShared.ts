import { unstable_cache } from 'next/cache';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { isUncensoredSeries } from '@/utils/constants';

export const revalidate = 7200;

export function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '')
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
}

export function formatW3cDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    if (!isNaN(d.getTime()) && year > 1990 && year < 2100) {
      return d.toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

export function getSiteBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export interface StrictPublishedCatalog {
  publishedSeries: any[];
  publishedEpisodes: any[];
  distinctTags: string[];
  distinctYears: number[];
  distinctUncensoredYears: number[];
  publishedPlaylists: any[];
}

export const getStrictPublishedCatalogData = unstable_cache(
  async (): Promise<StrictPublishedCatalog> => {
    let publishedSeries: any[] = [];
    let publishedEpisodes: any[] = [];
    let distinctTags: string[] = [];
    let distinctYears: number[] = [];
    let distinctUncensoredYears: number[] = [];
    let publishedPlaylists: any[] = [];

    try {
      const catalog = await getLocalCatalog();

      // 1. STRICT SERIES FILTER: Must have is_published === true, non-empty slug, and not draft
      publishedSeries = (catalog.series || []).filter(
        (s: any) => s && s.is_published === true && s.status !== 'draft' && Boolean(s.slug)
      );

      const seriesMap = new Map<string, any>();
      publishedSeries.forEach((s: any) => seriesMap.set(s.id, s));

      // 2. STRICT SEASON FILTER: Must have is_published === true and belong to a published series
      const seasonMap = new Map<string, any>();
      (catalog.seasons || []).forEach((sn: any) => {
        if (sn && sn.is_published === true && seriesMap.has(sn.series_id)) {
          seasonMap.set(sn.id, {
            ...sn,
            series: seriesMap.get(sn.series_id),
          });
        }
      });

      // 3. STRICT EPISODE FILTER: Must have is_published === true, belong to published season & series
      publishedEpisodes = (catalog.episodes || [])
        .filter((ep: any) => ep && ep.is_published === true && seasonMap.has(ep.season_id))
        .map((ep: any) => {
          const seasonObj = seasonMap.get(ep.season_id);
          const seriesObj = seasonObj?.series;
          const seriesSlug = seriesObj?.slug || '';
          const watchSlug = seriesSlug && ep.episode_number
            ? `${seriesSlug}-episode-${ep.episode_number}`
            : ep.id;

          return {
            ...ep,
            watchSlug,
            seriesTitle: seriesObj?.title || 'Anime Series',
            seriesSlug,
            coverImageKey: seriesObj?.cover_image_key || seriesObj?.poster_image_key,
          };
        });

      // 4. DISTINCT YEARS (from only published series)
      const yearSet = new Set<number>();
      const uncensoredYearSet = new Set<number>();
      publishedSeries.forEach((s: any) => {
        const y = s.release_year;
        if (y && typeof y === 'number' && y > 1980 && y < 2100) {
          yearSet.add(y);
          if (isUncensoredSeries(s)) {
            uncensoredYearSet.add(y);
          }
        }
      });
      distinctYears = Array.from(yearSet).sort((a, b) => b - a);
      distinctUncensoredYears = Array.from(uncensoredYearSet).sort((a, b) => b - a);

      // 5. DISTINCT TAGS (from only published series)
      const tagSet = new Set<string>();
      publishedSeries.forEach((s: any) => {
        (s.tags || []).forEach((t: string) => {
          const clean = t?.trim();
          if (clean && !clean.toLowerCase().startsWith('featured')) {
            tagSet.add(clean);
          }
        });
      });
      distinctTags = Array.from(tagSet).sort();

      // 6. PLAYLISTS (only published)
      const validPlaylists = (catalog.collections || []).filter((c: any) => c.is_published === true);
      if (validPlaylists.length > 0) {
        publishedPlaylists = validPlaylists;
      } else {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const storePath = path.join(process.cwd(), 'src', 'utils', 'playlists_store.json');
          if (fs.existsSync(storePath)) {
            const raw = fs.readFileSync(storePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              publishedPlaylists = parsed.map((p: any) => ({
                slug: p.slug,
                updated_at: new Date().toISOString(),
              }));
            }
          }
        } catch (storeErr) {
          console.error('Error reading playlists store for sitemap:', storeErr);
        }
      }
    } catch (err) {
      console.error('Error gathering strict published catalog data:', err);
    }

    return {
      publishedSeries,
      publishedEpisodes,
      distinctTags,
      distinctYears,
      distinctUncensoredYears,
      publishedPlaylists,
    };
  },
  ['strict-published-sitemap-cache-v1'],
  { revalidate: 7200, tags: ['sitemap_data', 'series_catalog', 'episodes_catalog'] }
);
