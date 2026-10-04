import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { getSiteSettings } from '@/utils/siteSettings';
import { Play, Star, Eye, Calendar, Sparkles, Award, Clock, Flame, ChevronRight } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import HeroCarousel from '@/components/HeroCarousel/HeroCarousel';
import SeriesCard, { SeriesItem } from '@/components/SeriesCard/SeriesCard';
import HorizontalScrollRow from '@/components/HorizontalScrollRow/HorizontalScrollRow';
import ThreeDCard from '@/components/ThreeDCard/ThreeDCard';
import UncensoredCard from '@/components/UncensoredCard/UncensoredCard';
import RandomRowSection from '@/components/RandomRowSection/RandomRowSection';
import JsonLd from '@/components/JsonLd/JsonLd';
import RecommendationsBanner from '@/components/RecommendationsBanner/RecommendationsBanner';
import PwaInstallBanner from '@/components/PwaInstallBanner/PwaInstallBanner';
import styles from './page.module.css';
import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import { getSeriesViewsMap, getEpisodeViewsMap } from '@/utils/views';
import { resolveSeriesMetrics, resolveEpisodeMetrics } from '@/utils/fakeMetricsStore';
import { tagToSlug } from '@/utils/constants';
import { convertStudioNameToSlug } from '@/utils/studiosData';

export const revalidate = 120;

const POPULAR_HOMEPAGE_TAGS = [
  'Uncensored', '3D', 'Harem', 'MILF', 'Romance', 'Fantasy', 'School Girls', 'Supernatural', 
  'Comedy', 'Sci-Fi', 'Ecchi', 'Vanilla', 'Tsundere', 'Yuri', 'POV', 'Maid', 'Dark Skin', 
  'Demons', 'Magic', 'Adventure', 'Succubus', 'Drama', 'Cosplay', 'Cat Girl', 'BDSM', 
  'Bondage', 'Cross-dressing', 'Femdom', 'Elf', 'Gyaru', 'Housewife', 'Historical', 
  'Tentacles', 'Toys', 'Vampire', 'Horror'
];

const FEATURED_STUDIOS = [
  'Queen Bee', 'Mary Jane', 'Pink Pineapple', 'PoRO', 'Bunnywalker', 'Seven', 
  'MS Pictures', 'Magic Bus', 'Arms', 'Studio Jack', 'T-Rex', 'Discovery', 
  'Collaboration Works', 'White Bear', 'Studio Fantasia', 'Milky'
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybtbdtgtryrxrhuchlkw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HLX-SCL51o2H254WH-gN0Q_HPpNwKo5';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const HOME_DESCRIPTION = 'Watch free hentai anime online in 1080p HD with English subtitles. Stream uncensored episodes, 3D releases, and trending series on mobile & desktop without ads.';

export const metadata = {
  title: 'Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage',
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage',
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website' as const,
    images: [
      {
        url: `${SITE_URL}/og-banner.png`,
        width: 1200,
        height: 630,
        alt: 'Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage',
    description: HOME_DESCRIPTION,
    images: [`${SITE_URL}/og-banner.png`],
  },
};

import { getLocalCatalog } from '@/utils/localCatalogStore';

// Local Catalog Query with Zero Egress and Sub-Millisecond Speed
const getCachedCatalogData = async () => {
  try {
    const catalog = await getLocalCatalog();
      const viewsMap: Record<string, number> = await getSeriesViewsMap().catch(() => ({}));
      const episodeViewsMap: Record<string, number> = await getEpisodeViewsMap().catch(() => ({}));

      const isDbEmpty = !catalog.series || catalog.series.length === 0;
      if (isDbEmpty) {
        return { dbSeries: [], dbEpisodes: [], isDbEmpty: true };
      }

      // Map series with seasons and episodes
      const seasonsBySeries = new Map<string, any[]>();
      const episodesBySeason = new Map<string, any[]>();

      catalog.episodes.forEach((ep: any) => {
        if (ep.is_published !== false) {
          if (!episodesBySeason.has(ep.season_id)) episodesBySeason.set(ep.season_id, []);
          episodesBySeason.get(ep.season_id)!.push(ep);
        }
      });

      catalog.seasons.forEach((sn: any) => {
        if (sn.is_published !== false) {
          if (!seasonsBySeries.has(sn.series_id)) seasonsBySeries.set(sn.series_id, []);
          const eps = episodesBySeason.get(sn.id) || [];
          seasonsBySeries.get(sn.series_id)!.push({
            ...sn,
            episodes: eps
          });
        }
      });

      const dbSeries = catalog.series
        .filter((s: any) => s.is_published !== false)
        .map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || s.views || 0,
          seasons: seasonsBySeries.get(s.id) || []
        }));

      // Map episodes with parent season and series
      const seriesMap = new Map<string, any>();
      catalog.series.forEach((s: any) => seriesMap.set(s.id, s));

      const seasonMap = new Map<string, any>();
      catalog.seasons.forEach((sn: any) => seasonMap.set(sn.id, sn));

      const dbEpisodes = catalog.episodes
        .filter((ep: any) => ep.is_published !== false)
        .map((ep: any) => {
          const sn = seasonMap.get(ep.season_id);
          const s = sn ? seriesMap.get(sn.series_id) : null;
          return {
            ...ep,
            views: episodeViewsMap[ep.id] || 0,
            seasons: sn ? {
              season_number: sn.season_number,
              series: s ? {
                id: s.id,
                title: s.title,
                slug: s.slug,
                description: s.description,
                studio: s.studio || s.studios?.name || null,
                poster_image_key: s.poster_image_key,
                cover_image_key: s.cover_image_key,
                banner_image_key: s.banner_image_key,
                release_year: s.release_year || s.releaseYear || null,
                tags: s.tags,
                category: s.category || 'Anime',
                rating: s.rating || null
              } : null
            } : null
          };
        })
        .sort((a: any, b: any) => {
          const timeA = new Date(a.release_date || a.created_at || 0).getTime();
          const timeB = new Date(b.release_date || b.created_at || 0).getTime();
          return timeB - timeA;
        });

      return { dbSeries, dbEpisodes, isDbEmpty: false };
    } catch (err) {
      console.error('Error fetching catalog data from local store:', err);
      return { dbSeries: [], dbEpisodes: [], isDbEmpty: true };
    }
  };

function getLocalSettings(): Record<string, string> {
  const defaultSettings: Record<string, string> = { 
    latest_series_sort_mode: 'latest_episode',
    hero_banner_source: 'featured_tags',
    hero_banner_slide_count: '8'
  };
  const settings = getSiteSettings();
  return { ...defaultSettings, ...(settings as Record<string, string>) };
}

function getSeriesReleaseTimestamp(s: any): number {
  if (s.first_air_date) {
    const t = new Date(s.first_air_date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const yr = Number(s.release_year || s.releaseYear);
  if (!isNaN(yr) && yr > 1900) {
    return new Date(`${yr}-01-01`).getTime();
  }
  if (s.created_at) {
    const t = new Date(s.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Strips heavy database payloads (synopsis, long descriptions, deep nested season/episode trees)
 * before passing series objects to 'use client' SeriesCard components.
 * This slashes hundreds of kilobytes of redundant Next.js RSC Flight payload from initial HTML.
 */
function toCleanSeriesCard(s: any): SeriesItem {
  let epCount = 0;
  if (s.seasons && Array.isArray(s.seasons)) {
    s.seasons.forEach((sea: any) => {
      if (sea.is_published !== false && sea.episodes && Array.isArray(sea.episodes)) {
        epCount += sea.episodes.filter((e: any) => e.is_published !== false).length;
      }
    });
  } else if (typeof s.episode_count === 'number') {
    epCount = s.episode_count;
  }

  const cleanTags = (s.tags || [s.category || 'Anime'])
    .filter((t: string) => typeof t === 'string' && t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
    .slice(0, 4);

  return {
    id: s.id,
    title: s.title,
    slug: s.slug,
    poster_image_key: s.poster_image_key || s.cover_image_key,
    cover_image_key: s.cover_image_key || s.poster_image_key,
    banner_image_key: s.banner_image_key || s.cover_image_key || s.poster_image_key,
    poster_position: s.poster_position,
    rating: typeof s.rating === 'number' && s.rating > 0 ? s.rating : null,
    release_year: s.release_year || s.releaseYear || null,
    status: s.status || null,
    episode_count: epCount,
    views: s.views || 0,
    studio: s.studio || s.studios?.name || null,
    description: s.description ? s.description.slice(0, 140) : '',
    tags: cleanTags,
    category: s.category || 'Anime',
  };
}

export default async function HomePage() {
  // 1. Fetch site settings (merging local JSON file + Supabase key-value rows)
  const settingsMap = getLocalSettings();
  try {
    const { data: rows } = await publicSupabaseClient.from('site_settings').select('key, value');
    if (rows && rows.length > 0) {
      rows.forEach((r: { key: string; value: string }) => {
        if (r.key && r.value) settingsMap[r.key] = r.value;
      });
    }
  } catch (e) {}

  const heroSource = settingsMap.hero_banner_source || 'featured_tags';
  const slideLimit = parseInt(settingsMap.hero_banner_slide_count || '8', 10) || 8;
  const heroMode = settingsMap.hero_banner_mode || 'series';
  const episodeFilter = settingsMap.hero_banner_episode_filter || 'latest';

  // 3. Fetch Cached Series & Episodes catalog (60s TTL for superfast performance)
  let featuredSeries: any[] = [];
  const { dbSeries, dbEpisodes, isDbEmpty } = await getCachedCatalogData();

  // If Admin chose Episodes Mode: show episodes directly using their video thumbnail
  // Strict rule: no more than one episode of the same series; only show the latest episode uploaded based on air date
  if (heroMode === 'episodes' && dbEpisodes && dbEpisodes.length > 0) {
    const rawEps = dbEpisodes.filter((ep: any) => ep.is_published !== false);

    // Helper to resolve parent series key for deduplication
    const getEpSeriesKey = (ep: any) => {
      const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
      const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
      return seriesObj?.id || seriesObj?.slug || ep.series_id || ep.showSlug || ep.id;
    };

    // Sort strictly by air date / release date descending, tie-broken by highest episode number
    const sortedByAirDate = [...rawEps].sort((a: any, b: any) => {
      const timeA = new Date(a.release_date || a.created_at || 0).getTime();
      const timeB = new Date(b.release_date || b.created_at || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.episode_number || 0) - (a.episode_number || 0);
    });

    // Deduplicate: Each series appears at most ONCE, retaining only its latest episode uploaded based on air date
    const seenSeriesKeys = new Set<string>();
    const deduplicatedEps: any[] = [];
    for (const ep of sortedByAirDate) {
      const key = getEpSeriesKey(ep);
      if (key && seenSeriesKeys.has(key)) {
        continue; // Skip older episodes of the same series
      }
      if (key) seenSeriesKeys.add(key);
      deduplicatedEps.push(ep);
    }

    let targetEps = deduplicatedEps;

    if (episodeFilter === 'latest') {
      targetEps = deduplicatedEps;
    } else if (episodeFilter === 'random') {
      targetEps = [...deduplicatedEps].sort(() => 0.5 - Math.random());
    } else if (episodeFilter === 'mix') {
      const half = Math.ceil(slideLimit / 2);
      const byDate = deduplicatedEps.slice(0, half);
      const remaining = deduplicatedEps.filter((e: any) => !byDate.some((b: any) => b.id === e.id));
      const byViews = [...remaining].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));

      const interleaved: any[] = [];
      const maxCount = Math.max(byDate.length, byViews.length);
      for (let i = 0; i < maxCount; i++) {
        if (i < byDate.length) interleaved.push(byDate[i]);
        if (i < byViews.length) interleaved.push(byViews[i]);
        if (interleaved.length >= slideLimit) break;
      }
      targetEps = interleaved;
    }

    const selectedEps = targetEps.slice(0, slideLimit);
    const seriesLookup = new Map<string, any>();
    (dbSeries || []).forEach((s: any) => seriesLookup.set(s.id, s));

    featuredSeries = selectedEps.map((ep: any) => {
      const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
      const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
      const fullSeries = (seriesObj?.id ? seriesLookup.get(seriesObj.id) : null) || (ep.series_id ? seriesLookup.get(ep.series_id) : null) || seriesObj;
      const seriesTitle = fullSeries?.title || seriesObj?.title || '';
      const seriesSlug = fullSeries?.slug || seriesObj?.slug || '';
      const epTitle = ep.title || `Episode ${ep.episode_number}`;
      const displayTitle = seriesTitle ? `${seriesTitle} - ${epTitle}` : epTitle;
      // In Episode Mode, the cards and thumbnail strip display the specific episode video thumbnail
      const epThumbnail = ep.thumbnail || ep.thumbnail_key || ep.cover_image_key || fullSeries?.cover_image_key || fullSeries?.poster_image_key;
      // The background hero slide displays the high-res series backdrop art (or fallback to episode image)
      const seriesCover = fullSeries?.cover_image_key || fullSeries?.banner_image_key || fullSeries?.poster_image_key || epThumbnail;

      // Always resolve studio name so the studio badge renders after the year badge
      let studioName = fullSeries?.studio || fullSeries?.studios?.name || seriesObj?.studio || seriesObj?.studios?.name || null;
      if (!studioName && fullSeries?.tags) {
        const found = FEATURED_STUDIOS.find(st => 
          (fullSeries.tags || []).some((t: string) => t.toLowerCase() === st.toLowerCase())
        );
        if (found) studioName = found;
      }
      if (!studioName) studioName = 'Pink Pineapple';

      // Always use the series synopsis as requested
      const rawSynopsis = fullSeries?.description || seriesObj?.description || ep.description || '';
      const cleanSynopsis = rawSynopsis && rawSynopsis.trim().length > 0 
        ? rawSynopsis.trim() 
        : 'Watch the latest uncensored episodes in crystal clear 1080p HD with verified English subtitles on HentaiKage.';

      return {
        id: ep.id,
        title: displayTitle,
        slug: seriesSlug || ep.slug || ep.id,
        description: cleanSynopsis,
        poster_image_key: epThumbnail,
        cover_image_key: epThumbnail,
        banner_image_key: epThumbnail,
        episode_thumbnail: epThumbnail,
        tags: (fullSeries?.tags || seriesObj?.tags || ['HD', 'Episode']).filter((t: string) => t.toLowerCase() !== 'featured').slice(0, 4),
        category: fullSeries?.category || seriesObj?.category || 'Anime',
        firstEpisodeId: ep.id,
        watchEpisodeUrl: getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug),
        tagline: 'New episode',
        rating: fullSeries?.rating || seriesObj?.rating || null,
        views: ep.views || 0,
        studio: studioName,
        release_year: ep.release_date ? new Date(ep.release_date).getFullYear() : (fullSeries?.release_year || seriesObj?.release_year || 2026),
        release_date: ep.release_date || ep.created_at || null,
      };
    });
  }

  // Fallback pool to rich Mock Data ONLY if DB has zero series
  // Sort pool by actual release date/year timestamp descending
  const rawPool = isDbEmpty 
    ? MOCK_SERIES 
    : [...dbSeries].sort((a, b) => {
        const timeA = getSeriesReleaseTimestamp(a);
        const timeB = getSeriesReleaseTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
  // Exclude upcoming series from the Hero Banner pool
  const pool = rawPool.filter(s => (s.status || '').toLowerCase() !== 'upcoming');
  const activeSeries = pool;

  // Pre-calculate latest episode series list if needed
  const getLatestEpisodeSeries = () => {
    const list: any[] = [];
    const seen = new Set<string>();
    if (dbEpisodes && dbEpisodes.length > 0) {
      dbEpisodes.forEach(ep => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        if (seriesObj && seriesObj.slug) {
          const fullSeriesObj = pool.find(s => s.slug === seriesObj.slug);
          if (fullSeriesObj && !seen.has(fullSeriesObj.id)) {
            seen.add(fullSeriesObj.id);
            list.push(fullSeriesObj);
          }
        }
      });
    }
    return list.length > 0 ? list : [...pool];
  };

  // Calculate Featured Series according to Admin Panel heroSource & slideLimit (if not already set by Episodes Mode)
  if (featuredSeries.length === 0) {
    if (heroSource === 'latest_series') {
    featuredSeries = [...pool].slice(0, slideLimit);
  } else if (heroSource === 'latest_episodes') {
    featuredSeries = getLatestEpisodeSeries().slice(0, slideLimit);
  } else if (heroSource === 'mix_latest' || heroSource === 'latest_mix') {
    const seriesList = [...pool];
    const episodeList = getLatestEpisodeSeries();
    const interleaved: any[] = [];
    const maxLen = Math.max(seriesList.length, episodeList.length);
    const seenIds = new Set<string>();

    for (let i = 0; i < maxLen; i++) {
      if (i < seriesList.length) {
        const s = seriesList[i];
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          interleaved.push(s);
        }
      }
      if (i < episodeList.length) {
        const s = episodeList[i];
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          interleaved.push(s);
        }
      }
    }
    featuredSeries = interleaved.slice(0, slideLimit);
  } else if (heroSource === 'random') {
    featuredSeries = [...pool].sort(() => 0.5 - Math.random()).slice(0, slideLimit);
  } else if (heroSource === 'mix_random_latest' || heroSource === 'random_mix') {
    const half = Math.ceil(slideLimit / 2);
    const newest = pool.slice(0, half);
    const remaining = pool.filter(s => !newest.some(n => n.id === s.id));
    const randoms = [...remaining].sort(() => 0.5 - Math.random());

    const interleaved: any[] = [];
    const seenIds = new Set<string>();
    const maxCount = Math.max(newest.length, randoms.length);

    for (let i = 0; i < maxCount; i++) {
      if (i < newest.length && !seenIds.has(newest[i].id)) {
        seenIds.add(newest[i].id);
        interleaved.push(newest[i]);
      }
      if (i < randoms.length && !seenIds.has(randoms[i].id)) {
        seenIds.add(randoms[i].id);
        interleaved.push(randoms[i]);
      }
      if (interleaved.length >= slideLimit) break;
    }
    featuredSeries = interleaved.slice(0, slideLimit);
  } else {
    // Default manual featured tags (featured_tags) sorted by order suffix if present (e.g. featured:1, featured:2)
    const tagged = pool.filter(s =>
      (s.tags || []).some((t: string) => t.toLowerCase() === 'featured' || t.toLowerCase().startsWith('featured:'))
    );
    if (tagged.length > 0) {
      tagged.sort((a, b) => {
        const getWeight = (s: any) => {
          const tag = (s.tags || []).find((t: string) => t.toLowerCase().startsWith('featured:'));
          if (tag) {
            const num = parseInt(tag.split(':')[1], 10);
            return isNaN(num) ? 999 : num;
          }
          return (s.tags || []).some((t: string) => t.toLowerCase() === 'featured') ? 99 : 9999;
        };
        return getWeight(a) - getWeight(b);
      });
      featuredSeries = tagged.slice(0, slideLimit);
    } else {
      featuredSeries = pool.slice(0, slideLimit);
    }
  }
}

  // Parse custom promotional taglines and autoplay speed
  const autoplaySpeed = parseInt(settingsMap.hero_banner_autoplay_speed || '6000', 10);
  let heroTaglinesMap: Record<string, string> = {};
  if (settingsMap.hero_banner_taglines) {
    try {
      const parsed = typeof settingsMap.hero_banner_taglines === 'string' 
        ? JSON.parse(settingsMap.hero_banner_taglines) 
        : settingsMap.hero_banner_taglines;
      if (parsed && typeof parsed === 'object') {
        heroTaglinesMap = parsed;
      }
    } catch (e) {}
  }

  // Attach tagline and lightweight clean fields to featured series items
  featuredSeries = featuredSeries.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description ? s.description.slice(0, 240) : '',
    poster_image_key: s.poster_image_key || s.cover_image_key,
    cover_image_key: s.cover_image_key || s.poster_image_key,
    banner_image_key: s.banner_image_key || s.cover_image_key || s.poster_image_key,
    tags: (s.tags || []).slice(0, 4),
    category: s.category || 'Anime',
    firstEpisodeId: s.firstEpisodeId || null,
    watchEpisodeUrl: s.watchEpisodeUrl || null,
    tagline: s.tagline || heroTaglinesMap[s.id] || heroTaglinesMap[s.slug] || undefined,
    rating: s.rating || null,
    views: s.views || 0,
    studio: s.studio || s.studios?.name || 'Pink Pineapple',
    release_year: s.release_year || s.releaseYear || null,
    release_date: s.release_date || s.created_at || null,
  }));



  // Sort Latest Series according to Admin Panel latest_series_sort_mode & release dates (excluding upcoming series)
  const sortMode = settingsMap.latest_series_sort_mode || 'latest_episode';
  let sortedLatestSeries = activeSeries.filter(s => (s.status || '').toLowerCase() !== 'upcoming');

  if (sortMode === 'latest_series') {
    sortedLatestSeries.sort((a, b) => {
      const timeA = getSeriesReleaseTimestamp(a);
      const timeB = getSeriesReleaseTimestamp(b);
      if (timeB !== timeA) return timeB - timeA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  } else if (sortMode === 'alphabetical') {
    sortedLatestSeries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortMode === 'most_viewed') {
    sortedLatestSeries.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    // Default: Sort by release year / first air date descending, then created_at
    sortedLatestSeries.sort((a, b) => {
      const timeA = getSeriesReleaseTimestamp(a);
      const timeB = getSeriesReleaseTimestamp(b);
      if (timeB !== timeA) return timeB - timeA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }

  // Transform recent episodes list cleanly from DB based on release_date
  let processedEpisodes: any[] = [];
  if (dbEpisodes && dbEpisodes.length > 0) {
    processedEpisodes = dbEpisodes
      .map(ep => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        const seriesTitle = seriesObj?.title || ep.title || '';
        const epTitle = ep.title || `Episode ${ep.episode_number}`;
        const fullTitle = seriesObj?.title ? `${seriesObj.title} - ${epTitle}` : epTitle;
        const isUncensored = (seriesObj?.tags || []).some((t: string) => t.toLowerCase() === 'uncensored');
        const isSubbed = (seriesObj?.tags || []).some((t: string) => 
          ['subbed', 'sub', 'english sub', 'eng sub', 'english subtitles'].includes(t.toLowerCase())
        ) || epTitle.toLowerCase().includes('sub') || !(seriesObj?.tags || []).some((t: string) => t.toLowerCase() === 'raw');
        const seriesStatus = (seriesObj?.status || '').toLowerCase();
        
        // Exclude upcoming series or preview/trailer episodes from Recent Episodes section
        const isPreviewOrUpcoming = 
          seriesStatus === 'upcoming' ||
          epTitle.toLowerCase().includes('preview') ||
          epTitle.toLowerCase().includes('[preview]') ||
          epTitle.toLowerCase().includes('trailer') ||
          epTitle.toLowerCase().includes('[pv]');

        if (isPreviewOrUpcoming) return null;

        const effectiveDateStr = ep.release_date || ep.created_at;
        const epTime = effectiveDateStr ? new Date(effectiveDateStr).getTime() : 0;
        const isNew = epTime > 0 ? (Date.now() - epTime < 14 * 86400 * 1000 && epTime <= Date.now()) : false;

        return {
          id: ep.id,
          title: seriesTitle,
          fullTitle,
          showSlug: seriesObj?.slug || '',
          episode_number: ep.episode_number,
          thumbnail: ep.thumbnail_key || seriesObj?.poster_image_key,
          duration: Math.floor((ep.duration_seconds || 1440) / 60) + ' min',
          release_date: ep.release_date,
          created_at: ep.created_at,
          effectiveDate: epTime,
          isNew,
          isUncensored,
          isSubbed,
          views: ep.views || 0
        };
      })
      .filter(Boolean);

    processedEpisodes.sort((a, b) => {
      if (b.effectiveDate !== a.effectiveDate) {
        return b.effectiveDate - a.effectiveDate;
      }
      return (b.episode_number || 0) - (a.episode_number || 0);
    });
  } else {
    // Fallback to Mock Episodes ONLY if DB has zero episodes
    processedEpisodes = MOCK_EPISODES.map(ep => {
      const parentSeries = MOCK_SERIES.find(s => s.slug === ep.showSlug);
      const isUncensored = (parentSeries?.tags || []).some(t => t.toLowerCase() === 'uncensored');
      const seriesTitle = parentSeries?.title || ep.title;
      return {
        ...ep,
        title: seriesTitle,
        fullTitle: `${seriesTitle} - ${ep.title}`,
        isNew: true,
        isUncensored,
        isSubbed: true
      };
    });
  }

  // Populate upcoming series strictly from real upcoming series
  const upcomingSeriesPool = rawPool.filter(s => (s.status || '').toLowerCase() === 'upcoming' || Boolean(s.is_upcoming));
  const upcomingSeries = upcomingSeriesPool.slice(0, 15);

  // Group Explore Categories dynamically (3 rows of 6 cards = 18 items)
  const defaultExploreCategories = [
    'Uncensored', 'Action', 'Romance', 'Fantasy', 'Drama', 'Sci-Fi',
    'Supernatural', 'Ecchi', 'Comedy', 'Harem', 'School', 'Adventure',
    'Psychological', 'Mystery', 'Slice of Life', 'Demon', 'Mature', 'All Genres'
  ];

  let customExploreCategories: any = null;
  if (settingsMap.homepage_explore_categories) {
    try {
      let raw = settingsMap.homepage_explore_categories;
      if (typeof raw === 'string') raw = JSON.parse(raw);
      if (Array.isArray(raw) && raw.length > 0) customExploreCategories = raw;
    } catch (e) {}
  }

  const exploreCategories = customExploreCategories && customExploreCategories.length > 0
    ? customExploreCategories
    : defaultExploreCategories;

  // Emoji icon map for Explore Collections grid
  const CATEGORY_EMOJI: Record<string, string> = {
    'Uncensored': '🔞',
    'Action': '⚔️',
    'Romance': '💕',
    'Fantasy': '🧙',
    'Drama': '🎭',
    'Sci-Fi': '🚀',
    'Supernatural': '👻',
    'Ecchi': '🌸',
    'Comedy': '😂',
    'Harem': '💫',
    'School': '🏫',
    'Adventure': '🗺️',
    'Psychological': '🧠',
    'Mystery': '🔍',
    'Slice of Life': '☕',
    'Demon': '😈',
    'Mature': '🔥',
    'All Genres': '🎬',
    'Vanilla': '🍦',
    '3D': '📐',
    'Historical': '🏯',
    'Magic': '✨',
    'Thriller': '🎯',
    'NTR': '💔',
    'MILF': '👩',
    'Yuri': '🌺',
    'Monster Girl': '🐉',
    'Elf': '🏹',
  };

  const trendingSeriesForSchema = activeSeries.slice(0, 12);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Trending Hentai Series on HentaiKage',
    'url': SITE_URL,
    'numberOfItems': trendingSeriesForSchema.length,
    'itemListElement': trendingSeriesForSchema.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
      'image': getR2Url(s.poster_image_key || s.cover_image_key, 'poster'),
      'description': s.description ? s.description.slice(0, 150) : undefined
    })),
  };

  const brandImageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    'name': 'HentaiKage Official Banner',
    'contentUrl': `${SITE_URL}/og-banner.png`,
    'thumbnailUrl': `${SITE_URL}/hero-banner.png`,
    'url': `${SITE_URL}/`,
    'caption': 'HentaiKage — Watch Hentai Anime Online Free in HD'
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'What is HentaiKage and is it completely free?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'HentaiKage is a premier free adult animation and hentai streaming platform. You can stream full uncensored episodes and series in 1080p HD without paid subscriptions, paywalls, or intrusive popunder advertisements.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Can I watch uncensored hentai anime episodes in 1080p HD?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes. We prioritize pristine 1080p and 720p HD releases for both hand-drawn Japanese animation and modern 3D CGI titles, featuring uncensored footage whenever produced by original animation studios.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Do video releases include English subtitles or English dubs?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'All Japanese releases feature verified, high-accuracy English subtitles (Subbed). Popular releases also provide multi-language voice tracks or English dubbing (Dubbed) where available.'
        }
      },
      {
        '@type': 'Question',
        'name': 'How frequently is new hentai content added to HentaiKage?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Our streaming database updates daily with new episode uploads, trending releases, remastered classics, and upcoming series announcements.'
        }
      },
      {
        '@type': 'Question',
        'name': 'Can I stream HentaiKage on mobile devices, tablets, and smart TVs?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes. The HentaiKage HTML5 video player is fully responsive and optimized for ultra-smooth playback on mobile phones (iOS & Android), tablets, PCs, and smart TVs with zero ad interruptions.'
        }
      }
    ]
  };

  const siteNavJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'HentaiKage Navigation Sitelinks',
    'itemListElement': [
      {
        '@type': 'SiteNavigationElement',
        'position': 1,
        'name': 'Trending Hentai',
        'description': 'Watch trending and most popular anime series online in HD',
        'url': `${SITE_URL}/trending`
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 2,
        'name': 'Uncensored Catalog',
        'description': 'Stream 1080p uncensored hentai anime without pixelation or mosaics',
        'url': `${SITE_URL}/uncensored`
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 3,
        'name': '3D Animation',
        'description': 'Browse premium 3D CGI adult animation series and movies in HD',
        'url': `${SITE_URL}/3d`
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 4,
        'name': 'Browse Genres',
        'description': 'Explore complete directory of hentai genres and thematic tags',
        'url': `${SITE_URL}/categories`
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 5,
        'name': 'Animation Studios',
        'description': 'Browse Japanese adult animation production studios',
        'url': `${SITE_URL}/studios`
      },
      {
        '@type': 'SiteNavigationElement',
        'position': 6,
        'name': 'Recent Episodes',
        'description': 'Daily new uncensored and subbed anime episode releases',
        'url': `${SITE_URL}/recent/episodes`
      }
    ]
  };

  // Lightweight sanitized series lists for SeriesCard components
  // Eliminates hundreds of kilobytes of unneeded description & nested episode columns from RSC Flight payload
  const cleanLatestSeries = sortedLatestSeries.slice(0, 18).map(toCleanSeriesCard);
  const cleanTrendingSeries = [...activeSeries]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 18)
    .map(toCleanSeriesCard);
  const cleanUpcomingSeries = (upcomingSeries || []).slice(0, 18).map(toCleanSeriesCard);
  
  // Random Pool: strictly released, playable series (zero upcoming), pre-shuffled for true randomness on load
  const availableRandomSeries = activeSeries.filter(
    s => (s.status || '').toLowerCase() !== 'upcoming' && !s.is_upcoming
  );
  const shuffledRandomSeries = [...availableRandomSeries].sort(() => 0.5 - Math.random());
  const lightweightRandomPool = shuffledRandomSeries.slice(0, 36).map(toCleanSeriesCard);
  // --------------------------------------------------------------------------
  // Uncensored Hentai Section: Fetches uncensored items sorted by recent release date
  // Uses portrait poster cards, view count pill on thumbnail, and studio underneath
  // --------------------------------------------------------------------------
  const isUncensoredItem = (ep: any, seriesObj: any) => {
    const sTags = (seriesObj?.tags || []).map((t: string) => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
    const epTags = (ep?.tags || []).map((t: string) => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
    const sCat = (seriesObj?.category || '').toLowerCase().trim();
    const sTitle = (seriesObj?.title || '').toLowerCase().trim();
    const epTitle = (ep?.title || '').toLowerCase().trim();
    return sCat === 'uncensored' ||
      sTags.includes('uncensored') || sTags.includes('decensored') ||
      epTags.includes('uncensored') ||
      sTitle.includes('uncensored') || epTitle.includes('uncensored');
  };

  const rawUncensoredList: any[] = [];
  const seenUncensoredSeries = new Set<string>();

  (dbEpisodes || []).forEach((ep: any) => {
    if (ep.is_published === false) return;
    const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
    const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
    if (isUncensoredItem(ep, seriesObj)) {
      const seriesKey = seriesObj?.id || seriesObj?.slug || ep.series_id || ep.id;
      if (seriesKey && seenUncensoredSeries.has(seriesKey)) return;
      if (seriesKey) seenUncensoredSeries.add(seriesKey);

      const seriesTitle = seriesObj?.title || ep.title || '';
      const epTitle = ep.title || `Episode ${ep.episode_number}`;
      const displayTitle = seriesTitle
        ? (epTitle && epTitle.toLowerCase().startsWith('episode') ? `${seriesTitle} ${epTitle}` : (epTitle && epTitle !== seriesTitle ? `${seriesTitle} - ${epTitle}` : seriesTitle))
        : epTitle;
      const releaseDate = ep.release_date || ep.created_at || seriesObj?.release_date || seriesObj?.created_at;
      const href = seriesObj?.slug ? `/series/${seriesObj.slug}` : getEpisodeWatchUrl(ep.id, ep.episode_number, seriesObj?.slug || '');
      const rawViews = ep.views || seriesObj?.views || 0;
      const finalViews = rawViews > 0 ? rawViews : resolveEpisodeMetrics(ep.id, rawViews).views;

      rawUncensoredList.push({
        id: ep.id,
        title: displayTitle,
        studio: seriesObj?.studio || seriesObj?.studios?.name || null,
        poster_image_key: seriesObj?.poster_image_key || seriesObj?.cover_image_key || ep.thumbnail_key,
        views: finalViews,
        releaseDate: releaseDate ? new Date(releaseDate).getTime() : 0,
        href
      });
    }
  });

  (activeSeries || []).forEach((s: any) => {
    const sTags = (s.tags || []).map((t: string) => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
    const sCat = (s.category || '').toLowerCase().trim();
    const sTitle = (s.title || '').toLowerCase().trim();
    if (sCat === 'uncensored' || sTags.includes('uncensored') || sTitle.includes('uncensored')) {
      const seriesKey = s.id || s.slug;
      if (seriesKey && seenUncensoredSeries.has(seriesKey)) return;
      if (seriesKey) seenUncensoredSeries.add(seriesKey);

      const releaseDate = s.release_date || s.created_at || (s.release_year ? `${s.release_year}-01-01` : null);
      const rawViews = s.views || 0;
      const finalViews = rawViews > 0 ? rawViews : resolveSeriesMetrics(s.id, rawViews).views;
      rawUncensoredList.push({
        id: s.id,
        title: s.title,
        studio: s.studio || s.studios?.name || null,
        poster_image_key: s.poster_image_key || s.cover_image_key,
        views: finalViews,
        releaseDate: releaseDate ? new Date(releaseDate).getTime() : 0,
        href: `/series/${s.slug}`
      });
    }
  });

  rawUncensoredList.sort((a: any, b: any) => b.releaseDate - a.releaseDate);
  const recentUncensoredItems = rawUncensoredList.slice(0, 18);

  // --------------------------------------------------------------------------
  // Recent 3D Section: Fetches 3D episodes sorted by recent release date
  // Uses episode video thumbnail image (not series poster), wide 16:9 cards
  // --------------------------------------------------------------------------
  const is3DItem = (ep: any, seriesObj: any) => {
    const sTags = (seriesObj?.tags || []).map((t: string) => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
    const epTags = (ep?.tags || []).map((t: string) => (typeof t === 'string' ? t.toLowerCase().trim() : ''));
    const sCat = (seriesObj?.category || '').toLowerCase().trim();
    const sTitle = (seriesObj?.title || '').toLowerCase().trim();
    const epTitle = (ep?.title || '').toLowerCase().trim();
    return sCat.includes('3d') || sCat.includes('cgi') ||
      sTags.includes('3d') || sTags.includes('cgi') ||
      epTags.includes('3d') || epTags.includes('cgi') ||
      sTitle.startsWith('3d') || sTitle.includes('umemaro') || epTitle.includes('3d');
  };

  const recent3DEpisodes = (dbEpisodes || [])
    .filter((ep: any) => ep.is_published !== false)
    .filter((ep: any) => {
      const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
      const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
      return is3DItem(ep, seriesObj);
    })
    .map((ep: any) => {
      const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
      const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
      const sTitle = seriesObj?.title ? seriesObj.title.replace(/^3D\s*[-–—]\s*/i, '') : '';
      const epTitle = ep.title || '';
      const isGenericEp = !epTitle || /^episode\s*\d+$/i.test(epTitle.trim());
      const displayTitle = sTitle
        ? (isGenericEp ? sTitle : (sTitle.toLowerCase() === epTitle.toLowerCase() ? sTitle : `${sTitle} - ${epTitle}`))
        : (epTitle || '3D Animation');
      const releaseDate = ep.release_date || ep.created_at || seriesObj?.release_date || seriesObj?.created_at;
      const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, seriesObj?.slug || '');
      const rawViews = ep.views || seriesObj?.views || 0;
      const finalViews = rawViews > 0 ? rawViews : resolveEpisodeMetrics(ep.id, rawViews).views;

      return {
        id: ep.id,
        title: displayTitle,
        thumbnail_key: ep.thumbnail_key || seriesObj?.cover_image_key || seriesObj?.poster_image_key,
        views: finalViews,
        releaseDate: releaseDate ? new Date(releaseDate).getTime() : 0,
        watchUrl,
        tag: '3D'
      };
    })
    .sort((a: any, b: any) => b.releaseDate - a.releaseDate)
    .slice(0, 16);

  // Preload first hero image for instant mobile & desktop Largest Contentful Paint (LCP)
  const firstFeatured = featuredSeries && featuredSeries.length > 0 ? featuredSeries[0] : null;
  const firstPosterKey = firstFeatured?.poster_image_key || firstFeatured?.cover_image_key;
  const firstPosterUrl = firstPosterKey ? getR2Url(firstPosterKey, 'poster') : null;
  const firstBannerKey = firstFeatured?.banner_image_key || firstFeatured?.cover_image_key || firstFeatured?.poster_image_key;
  const firstBannerUrl = firstBannerKey ? getR2Url(firstBannerKey, 'banner') : null;
  const firstCoverKey = firstFeatured?.episode_thumbnail || firstFeatured?.cover_image_key || firstFeatured?.poster_image_key || firstFeatured?.banner_image_key;
  const firstCoverUrl = firstCoverKey ? getR2Url(firstCoverKey, 'cover') : null;

  return (
    <div className={styles.container}>
      {firstBannerUrl && (
        <link rel="preload" as="image" href={firstBannerUrl} fetchPriority="high" media="(min-width: 769px)" />
      )}
      {firstCoverUrl && (
        <link rel="preload" as="image" href={firstCoverUrl} fetchPriority="high" media="(max-width: 768px)" />
      )}
      <JsonLd data={[itemListJsonLd, brandImageJsonLd, faqJsonLd, siteNavJsonLd]} />

      {/* Primary SEO H1 Heading Section */}
      <section className={styles.seoHeroHeader} aria-label="Welcome to HentaiKage">
        <h1 className={styles.seoHeroTitle}>
          <span className={styles.seoHeroBrand}>HENTAI</span><span className={styles.seoHeroBrandGold}>KAGE</span> — Watch Hentai Anime Online Free in HD
        </h1>
        <p className={styles.seoHeroDescription}>
          Watch new and popular hentai videos in HD — stream full episodes, uncensored anime scenes, series, genres, and playlists updated daily.
        </p>
      </section>

      {/* Featured Hero Carousel Banner */}
      <HeroCarousel activeSeries={featuredSeries} isDbEmpty={isDbEmpty} autoplaySpeed={autoplaySpeed} />

      {/* 1. Recent Episodes Section: 4x5 landscape grid (20 items total) */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Latest Hentai Episodes</h2>
            <span className={styles.seriesSubtitle}>NEWLY RELEASED</span>
          </div>
          <Link href="/recent/episodes" prefetch={false} className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className={styles.episodeGrid}>
          {processedEpisodes.slice(0, 20).map((ep, epIdx) => {
            const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, ep.showSlug);
            const thumbUrl = getR2Url(ep.thumbnail, 'thumbnail');
            return (
              <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                <Link 
                  href={watchUrl} 
                  className={styles.cardImageLink}
                  title={`Watch ${ep.fullTitle || ep.title} Episode ${ep.episode_number || ''} in 1080p HD (English Subtitles)`}
                >
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={thumbUrl}
                      alt={`Watch ${ep.fullTitle || ep.title} ${ep.isUncensored ? '(Uncensored, Eng Sub)' : '(Eng Sub)'} in HD`}
                      fill
                      sizes="(max-width: 480px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      className={styles.cardImage}
                      loading={epIdx < 2 ? "eager" : "lazy"}
                      decoding="async"
                      unoptimized={typeof thumbUrl === 'string' && thumbUrl.startsWith('data:')}
                    />
                    <div className={styles.cardImageOverlay}>
                      <Play size={36} fill="white" className={styles.cardPlayIcon} />
                    </div>
                    
                    {/* Top-Right: Green NEW star badge */}
                    {ep.isNew && (
                      <div className={styles.newBadge}>
                        <Star size={10} fill="currentColor" />
                        <span>NEW</span>
                      </div>
                    )}

                    {/* Bottom-Left: Episode Number badge */}
                    {ep.episode_number && (
                      <div className={styles.epNumBadge}>
                        EP {ep.episode_number}
                      </div>
                    )}
                  </div>
                </Link>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>
                    <Link href={watchUrl} title={ep.fullTitle || ep.title}>{ep.title}</Link>
                  </h3>
                  <div className={styles.episodeMetaRow}>
                    <div className={styles.episodeViewsRow}>
                      <Eye size={12} className={styles.eyeIcon} />
                      <span>
                        {ep.views !== undefined && ep.views !== null
                          ? (ep.views >= 1000 ? (ep.views / 1000).toFixed(1) + 'K' : ep.views)
                          : '0'}
                      </span>
                    </div>
                    <div className={styles.episodeTagsGroup}>
                      {ep.isUncensored ? (
                        <span className={styles.uncensoredTagBadge}>UNCENSORED</span>
                      ) : (
                        <span className={styles.censoredTagBadge}>CENSORED</span>
                      )}
                      {ep.isSubbed && (
                        <span className={styles.subTagBadge}>SUB</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Latest Series Section: Horizontal scroll slider up to 18 items */}
      <section className={styles.section}>
        <HorizontalScrollRow
          title="Latest Hentai Anime Series"
          subtitle="UPDATED DAILY"
          viewAllHref="/recent/series"
        >
          {cleanLatestSeries.map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </HorizontalScrollRow>
      </section>

      {/* 3. Trending & Most Viewed Section: Horizontal scroll slider up to 18 items */}
      <section className={styles.section}>
        <HorizontalScrollRow
          title="Trending & Most Viewed"
          subtitle="POPULAR NOW"
          subtitleColor="#ec4899"
          viewAllHref="/trending"
        >
          {cleanTrendingSeries.map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </HorizontalScrollRow>
      </section>

      {/* Uncensored Hentai Section: Portrait Poster Slider with View Badge on Thumbnail & Studio Underneath */}
      {recentUncensoredItems && recentUncensoredItems.length > 0 && (
        <section className={styles.section}>
          <HorizontalScrollRow
            title="Uncensored Hentai"
            viewAllHref="/uncensored"
            viewAllText="See all"
          >
            {recentUncensoredItems.map((item) => (
              <UncensoredCard
                key={item.id}
                id={item.id}
                title={item.title}
                studio={item.studio}
                poster_image_key={item.poster_image_key}
                views={item.views}
                href={item.href}
              />
            ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* Recent 3D Section: Wide 16:9 Landscape Card with Episode Image & Bottom Dark Gradient Overlay */}
      {recent3DEpisodes && recent3DEpisodes.length > 0 && (
        <section className={styles.section}>
          <HorizontalScrollRow
            title="Recent 3D"
            viewAllHref="/3d"
            viewAllText="See all"
          >
            {recent3DEpisodes.map((ep) => (
              <ThreeDCard
                key={ep.id}
                id={ep.id}
                title={ep.title}
                thumbnail_key={ep.thumbnail_key}
                views={ep.views}
                watchUrl={ep.watchUrl}
                tag="3D"
                data-is-episode={true}
                data-is-3d={true}
              />
            ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* 5. Random Section: Live Shuffle slider of active series */}
      <section className={styles.section}>
        <RandomRowSection seriesPool={lightweightRandomPool} />
      </section>

      {/* 4. Upcoming Anime Section: Horizontal scroll slider up to 18 items */}
      {cleanUpcomingSeries && cleanUpcomingSeries.length > 0 && (
        <section className={styles.section}>
          <HorizontalScrollRow
            title="Upcoming Hentai Anime"
            subtitle="COMING SOON"
            viewAllHref="/upcoming"
          >
            {cleanUpcomingSeries.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* Recommendations Banner (Client Component with Auth) */}
      <RecommendationsBanner />

      {/* 4. Explore Collections Banner */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Browse Hentai Anime by Genre & Tags</h2>
            <span className={styles.seriesSubtitle}>CURATED CATEGORIES</span>
          </div>
          <Link href="/categories" prefetch={false} className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>

        <div className={styles.categoriesGrid}>
          {exploreCategories.map((cat: any, idx: number) => {
            const title = typeof cat === 'string' ? cat : (cat.title || cat.filter);
            const filterVal = typeof cat === 'string' ? cat : (cat.filter || cat.title);
            const emoji = CATEGORY_EMOJI[title] || '🎌';
            const isAll = filterVal === 'All Genres';
            return (
              <Link
                key={idx}
                href={isAll ? '/categories' : `/categories/${tagToSlug(filterVal)}`}
                prefetch={false}
                className={`${styles.categoryCard} ${isAll ? styles.categoryCardAll : ''}`}
              >
                <span className={styles.categoryEmoji}>{emoji}</span>
                <span className={styles.categoryLabel}>{title}</span>
              </Link>
            );
          })}
        </div>

        {/* Popular Tags Directory Cloud (Internal Link Flood) */}
        <div className={styles.tagsCloudWrapper}>
          <div className={styles.tagsCloudHeader}>
            <div className={styles.tagsCloudTitle}>
              <Sparkles size={15} color="#f59e0b" />
              <span>Explore Popular Genres &amp; Themes</span>
            </div>
            <Link href="/genres" prefetch={false} className={styles.viewAllLink}>
              All Tags <ChevronRight size={13} />
            </Link>
          </div>
          <div className={styles.tagsCloudGrid}>
            {POPULAR_HOMEPAGE_TAGS.map((tag) => {
              const isSpecial = ['Uncensored', '3D', 'MILF', 'Harem', 'Vanilla', 'Romance'].includes(tag);
              return (
                <Link
                  key={tag}
                  href={`/categories/${tagToSlug(tag)}`}
                  prefetch={false}
                  className={`${styles.tagPill} ${isSpecial ? styles.tagPillSpecial : ''}`}
                >
                  <span>#{tag}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Top Production Studios Showcase */}
        <div className={styles.tagsCloudWrapper} style={{ marginTop: '1rem' }}>
          <div className={styles.tagsCloudHeader}>
            <div className={styles.tagsCloudTitle}>
              <Flame size={15} color="#3b82f6" />
              <span>Featured Animation Studios</span>
            </div>
            <Link href="/studios" prefetch={false} className={styles.viewAllLink}>
              All Studios <ChevronRight size={13} />
            </Link>
          </div>
          <div className={styles.studiosGrid}>
            {FEATURED_STUDIOS.map((studio) => (
              <Link
                key={studio}
                href={`/studios/${convertStudioNameToSlug(studio)}`}
                prefetch={false}
                className={styles.studioPill}
              >
                <span>🏢 {studio}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PWA Home Screen Installation Prompt (Direct Traffic Retention) */}
      <PwaInstallBanner />

      {/* Large SEO Content Section */}
      <section className={styles.seoContentSection}>
        <div className={styles.seoContentWrapper}>
          
          {/* Main Title and Expanded Intro Block */}
          <div className={styles.introContent} style={{ background: 'rgba(15, 15, 15, 0.65)', border: '1px solid rgba(245, 158, 11, 0.15)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.04)' }}>
            <h2 className={styles.mainTitle}>HentaiKage — Hentai Anime &amp; Adult Animation</h2>
            
            <p className={styles.introText}>

              Welcome to <strong>HentaiKage</strong>, the premier online database and high-definition streaming platform for adult animation and hentai series. Our library catalogs an extensive range of premium uncensored hentai anime titles, ensuring you can discover legendary classics alongside the latest 3D CGI releases. We systematically organize our content by <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>genres</Link>, <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>tags</Link>, <Link href="/studios" style={{ color: '#f59e0b', textDecoration: 'underline' }}>production studios</Link>, and <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>release years</Link> to deliver a seamless, high-performance browsing experience.
            </p>
            
            <p className={styles.introText}>
              Every series profile on HentaiKage features detailed synopses, verified alternative titles (including Japanese Kanji characters and Romaji spellings), and aggregate community ratings. From there, you can access individual watch pages with our custom theater-mode HTML5 video player. Whether you prefer English subbed episodes, English dubbed releases, or raw uncensored animation, HentaiKage is fully optimized for speed, discoverability, and clean viewing.
            </p>

            <p className={styles.introText} style={{ marginTop: '1.2rem', marginBottom: '0.8rem', fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🚀 Quick Navigation &amp; Discovery Hub
            </p>

            {/* Quick Links Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
              <Link href="/uncensored" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                ✨ Uncensored Hentai
              </Link>
              <Link href="/3d" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                🎥 3D CGI Animation
              </Link>
              <Link href="/categories" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                📂 Browse All Genres
              </Link>
              <Link href="/studios" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                🏢 Production Studios
              </Link>
              <Link href="/trending" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                🔥 Trending Catalog
              </Link>
              <Link href="/playlists" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }} className="card-hover">
                🎵 Custom Playlists
              </Link>
            </div>
          </div>

          <div className={styles.seoContentGrid}>
            
            <div className={styles.seoCard}>
              <h3>What Is HentaiKage?</h3>
              <p>
                HentaiKage is a dedicated online database and streaming platform designed specifically for fans of adult animation and Japanese hentai series. Our goal is to provide a central, organized resource where users can explore comprehensive metadata, track active releases, and stream high-definition content in a clean, high-performance environment. Instead of simple link aggregates, we build rich series profiles that catalog everything from release history to studio details.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Browse Hentai Anime</h3>
              <p>
                Our library is structured to support multiple styles of navigation. If you are looking for what is currently popular, the trending section aggregates real-time view data to show what the community is watching. For users who prefer chronologically fresh uploads, our recent additions grid lists the latest releases daily. You can also filter shows by their production status—whether they are currently ongoing or completed series that are fully available for binge-watching.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Hentai Anime Series &amp; Episodes</h3>
              <p>
                In adult animation, single shows are often split into multiple seasons or release formats. HentaiKage preserves this structure by maintaining a strict parent-child relationship between a series profile and its child episodes. When you visit a series page, you are presented with a complete overview of the show, including its global rating, total episode count, synopsis, and associated tags.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Find Anime by Alternative Titles</h3>
              <p>
                Anime titles are frequently translated or romanized in multiple ways, making them difficult to track down. A single series might be known by its official Japanese Kanji name, its Romaji transliteration, or a literal English translation. HentaiKage solves this by archiving alternative titles for every series, helping you locate the correct page whether you search for a show's original Japanese title or its translated western counterpart.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Browse by Genre, Tags &amp; Studio</h3>
              <p>
                Finding similar content is simple thanks to our tag taxonomy. Every series is mapped to specific tags, genres, and production studios that describe its themes, animation styles, and storylines. Whether you are looking for classic hand-drawn uncensored animation, modern 3D CGI releases, or specific narrative elements like harem, action, supernatural, and comedy, clicking on any tag or studio name takes you directly to a filtered list of matching titles.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Smart Search &amp; Filtering</h3>
              <p>
                If you are not browsing catalog rows, our active search bar offers real-time suggestions as you type. The search index looks through primary titles, alternative English translations, studios, and genres to find matches instantly. Combined with our advanced filters, you can sort search results by ratings, release years, or upload dates.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Trust, Safety, and Content Standards</h3>
              <p>
                HentaiKage is committed to maintaining a safe, transparent, and compliant platform for adult audiences. All characters depicted in the animated works cataloged on our site are fictional and represented as 18 years of age or older. We maintain clear legal frameworks, including copyright DMCA policies, Terms of Service, and Privacy Policies.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>1080p Full HD &amp; Uncensored Quality</h3>
              <p>
                Visual fidelity is paramount in adult animation. HentaiKage encodes and delivers video streams in native 1080p and 720p high-definition resolutions at 60 frames per second. For collectors of unedited content, our dedicated uncensored library preserves original animator drawings without pixelation, digital blur, or mosaic bars, ensuring a crystal-clear, true-to-source presentation.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>English Subbed (Eng Sub) &amp; Voice Dubs</h3>
              <p>
                Enjoy seamless storytelling with verified, highly accurate English subtitles (Eng Sub) timed to precision with Japanese voice acting tracks. Every line of dialogue is translated with context, honorifics, and character nuances intact. In addition to our extensive subbed library, select popular franchises feature complete English voice dubbing (Dubbed) for an accessible viewing experience.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>High-Performance HTML5 Player (Zero Ads)</h3>
              <p>
                We believe your streaming sessions should be smooth, private, and uninterrupted. Unlike traditional streaming sites burdened with intrusive popunders, malware-prone redirects, and video prerolls, HentaiKage provides a 100% ad-free custom HTML5 video player. Enjoy lightning-fast buffering, keyboard shortcuts (Space to toggle play, arrows to scrub), theater mode, and responsive mobile playback across iOS, Android, and desktop.
              </p>
            </div>

          </div>

          {/* FAQ Accordion Section (Rich Snippet SEO & User Guidance) */}
          <div className={styles.faqSection}>
            <h3 className={styles.faqSectionTitle}>
              <span>Frequently Asked Questions</span>
            </h3>

            <div className={styles.faqList}>
              <details className={styles.faqItem} open>
                <summary className={styles.faqQuestion}>
                  <span>What is HentaiKage and is it completely free?</span>
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>
                  HentaiKage is a premier free adult animation and hentai streaming platform. You can stream full uncensored episodes and series in 1080p HD without paid subscriptions, paywalls, or intrusive popunder advertisements.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>Can I watch uncensored hentai anime episodes in 1080p HD?</span>
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>
                  Yes. We prioritize pristine 1080p and 720p HD releases for both hand-drawn Japanese animation and modern 3D CGI titles, featuring uncensored footage whenever produced by original animation studios.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>Do video releases include English subtitles or English dubs?</span>
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>
                  All Japanese releases feature verified, high-accuracy English subtitles (Subbed). Popular releases also provide multi-language voice tracks or English dubbing (Dubbed) where available.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>How frequently is new hentai content added to HentaiKage?</span>
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>
                  Our streaming database updates daily with new episode uploads, trending releases, remastered classics, and upcoming series announcements.
                </p>
              </details>

              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>Can I stream HentaiKage on mobile devices, tablets, and smart TVs?</span>
                  <span className={styles.faqIcon}>+</span>
                </summary>
                <p className={styles.faqAnswer}>
                  Yes. The HentaiKage HTML5 video player is fully responsive and optimized for ultra-smooth playback on mobile phones (iOS & Android), tablets, PCs, and smart TVs with zero ad interruptions.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
