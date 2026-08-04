import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { Play, Star, Eye, Calendar, Sparkles, Award, Clock, Flame, ChevronRight } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import HeroCarousel from '@/components/HeroCarousel/HeroCarousel';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import HorizontalScrollRow from '@/components/HorizontalScrollRow/HorizontalScrollRow';
import RandomRowSection from '@/components/RandomRowSection/RandomRowSection';
import AdBanner from '@/components/AdBanner/AdBanner';
import JsonLd from '@/components/JsonLd/JsonLd';
import { createClient } from '@/utils/supabase/server';
import styles from './page.module.css';
import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export const metadata = {
  title: 'PlayHentai - Watch Uncensored Hentai Anime Online in HD',
  description: 'Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular uncensored titles on PlayHentai.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PlayHentai - Watch Uncensored Hentai Anime Online in HD',
    description: 'Stream high quality uncensored hentai anime series online for free.',
    url: SITE_URL,
    siteName: 'PlayHentai',
    locale: 'en_US',
    type: 'website' as const,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlayHentai - Watch Uncensored Hentai Anime Online in HD',
    description: 'Stream high quality uncensored hentai anime series online for free.',
  },
};

// 60-Second TTL Cached Catalog Query for Super-Fast TTFB (<80ms)
const getCachedCatalogData = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let dbEpisodes: any[] = [];
    let isDbEmpty = true;

    try {
      const { data: seriesData } = await publicSupabaseClient
        .from('series')
        .select(`
          *,
          seasons (
            is_published,
            season_number,
            episodes (
              id,
              is_published,
              episode_number
            )
          )
        `)
        .eq('is_published', true);

      if (seriesData && seriesData.length > 0) {
        isDbEmpty = false;
        dbSeries = seriesData;
      }

      const { data: episodeData } = await publicSupabaseClient
        .from('episodes')
        .select(`
          *,
          seasons (
            season_number,
            series (
              title,
              slug,
              poster_image_key,
              tags
            )
          )
        `)
        .eq('is_published', true)
        .order('release_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (episodeData && episodeData.length > 0) {
        dbEpisodes = episodeData;
      }
    } catch (err) {
      console.error('Error fetching catalog data from Supabase:', err);
    }

    return { dbSeries, dbEpisodes, isDbEmpty };
  },
  ['homepage-catalog-cache-v1'],
  { revalidate: 60, tags: ['homepage_catalog'] }
);

let cachedSettingsData: Record<string, string> | undefined;
function getLocalSettings(): Record<string, string> {
  if (cachedSettingsData) return cachedSettingsData;
  const defaultSettings: Record<string, string> = { 
    latest_series_sort_mode: 'latest_episode',
    hero_banner_source: 'featured_tags',
    hero_banner_slide_count: '8'
  };
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      cachedSettingsData = { ...defaultSettings, ...JSON.parse(fileData) };
    } else {
      cachedSettingsData = defaultSettings;
    }
  } catch (err) {
    cachedSettingsData = defaultSettings;
  }
  return cachedSettingsData || defaultSettings;
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

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Fetch user session
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch site settings (merging local JSON file + Supabase key-value rows)
  const settingsMap = getLocalSettings();
  try {
    const { data: rows } = await supabase.from('site_settings').select('key, value');
    if (rows && rows.length > 0) {
      rows.forEach((r: { key: string; value: string }) => {
        if (r.key && r.value) settingsMap[r.key] = r.value;
      });
    }
  } catch (e) {}

  const heroSource = settingsMap.hero_banner_source || 'featured_tags';
  const slideLimit = parseInt(settingsMap.hero_banner_slide_count || '8', 10) || 8;

  // 3. Fetch Cached Series & Episodes catalog (60s TTL for superfast performance)
  let featuredSeries: any[] = [];
  const { dbSeries, dbEpisodes, isDbEmpty } = await getCachedCatalogData();

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

  // Calculate Featured Series according to Admin Panel heroSource & slideLimit
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
        const epTitle = ep.title || `Episode ${ep.episode_number}`;
        const fullTitle = seriesObj?.title ? `${seriesObj.title} - ${epTitle}` : epTitle;
        const isUncensored = (seriesObj?.tags || []).some((t: string) => t.toLowerCase() === 'uncensored');
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
          title: fullTitle,
          showSlug: seriesObj?.slug || '',
          episode_number: ep.episode_number,
          thumbnail: ep.thumbnail_key || seriesObj?.poster_image_key,
          duration: Math.floor((ep.duration_seconds || 1440) / 60) + ' min',
          release_date: ep.release_date,
          created_at: ep.created_at,
          effectiveDate: epTime,
          isNew,
          isUncensored
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
      return {
        ...ep,
        isNew: true,
        isUncensored
      };
    });
  }

  // Populate upcoming series strictly from real series (no fake mock data)
  let upcomingSeriesPool = rawPool.filter(s => (s.status || '').toLowerCase() === 'upcoming' || s.is_upcoming);
  if (upcomingSeriesPool.length < 6) {
    const seenIds = new Set(upcomingSeriesPool.map(s => s.id || s.slug));
    rawPool.forEach(s => {
      if (!seenIds.has(s.id) && !seenIds.has(s.slug)) {
        seenIds.add(s.id);
        upcomingSeriesPool.push({ ...s, status: 'upcoming' });
      }
    });
  }
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

  const trendingSeriesForSchema = activeSeries.slice(0, 10);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Trending Hentai Series on PlayHentai',
    'url': SITE_URL,
    'itemListElement': trendingSeriesForSchema.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  // VideoObject JSON-LD Schema for All 20 Visible Recent Episodes on Homepage
  const topRecentEpisodesForSchema = processedEpisodes.slice(0, 20);
  const videoObjectSchemas = topRecentEpisodesForSchema.map((ep: any) => {
    const watchUrl = `${SITE_URL}${getEpisodeWatchUrl(ep.id, ep.episode_number, ep.showSlug)}`;
    const thumbUrl = getR2Url(ep.thumbnail, 'thumbnail');
    const uploadDateStr = ep.release_date || ep.created_at || '2026-01-01T00:00:00Z';
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      'name': ep.title,
      'description': `Watch ${ep.title} full HD uncensored episode online for free on PlayHentai. Fast CDN streaming with high quality playback.`,
      'thumbnailUrl': [thumbUrl],
      'uploadDate': new Date(uploadDateStr).toISOString(),
      'contentUrl': watchUrl,
      'embedUrl': watchUrl,
      'duration': 'PT24M',
      'isFamilyFriendly': false,
    };
  });

  // TVSeries JSON-LD Schemas for All 24 Visible Latest Series on Homepage
  const topLatestSeriesForSchema = sortedLatestSeries.slice(0, 24);
  const tvSeriesSchemas = topLatestSeriesForSchema.map((s: any) => {
    const seriesUrl = `${SITE_URL}/series/${s.slug}`;
    const posterUrl = getR2Url(s.poster_image_key || s.cover_image_key, 'poster');
    return {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      'name': s.title,
      'description': s.description || `Watch ${s.title} uncensored hentai anime series in HD on PlayHentai. Stream full episodes online.`,
      'url': seriesUrl,
      'image': posterUrl,
      'genre': s.category || 'Anime',
      'productionCompany': {
        '@type': 'Organization',
        'name': s.studio || 'Juicymango'
      }
    };
  });

  return (
    <div className={styles.container}>
      <JsonLd data={itemListJsonLd} />
      {videoObjectSchemas.map((schema, idx) => (
        <JsonLd key={`video-${idx}`} data={schema} />
      ))}
      {tvSeriesSchemas.map((schema, idx) => (
        <JsonLd key={`series-${idx}`} data={schema} />
      ))}

      {/* Visually-hidden fallback H1 tag for 100% crawl guarantee */}
      <h1 className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        Watch Uncensored Hentai Anime Online in HD - PlayHentai
      </h1>

      {/* Ambient Glows */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Featured Hero Carousel Banner */}
      <HeroCarousel activeSeries={featuredSeries} isDbEmpty={isDbEmpty} />


      {/* Hero Bottom Sponsored Ad Banner (728x90 Zone 5986176) */}
      <AdBanner zoneId="5986176" desktopOnly />

      {/* Mobile-Only Hero Bottom Banner (Zone 5986984) */}
      <AdBanner zoneId="5986984" insClass="eas6a97888e10" mobileOnly />

      {/* 1. Recent Episodes Section: 4x5 landscape grid (20 items total) */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Recent Uploads</h2>
            <span className={styles.seriesSubtitle}>NEWLY RELEASED</span>
          </div>
          <Link href="/recent/episodes" className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className={styles.episodeGrid}>
          {processedEpisodes.slice(0, 20).map((ep) => {
            const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, ep.showSlug);
            return (
              <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                <Link href={watchUrl} className={styles.cardImageLink}>
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={getR2Url(ep.thumbnail, 'thumbnail')}
                      alt={ep.title}
                      fill
                      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      className={styles.cardImage}
                    />
                    <div className={styles.cardImageOverlay}>
                      <Play size={36} fill="white" className={styles.cardPlayIcon} />
                    </div>
                    
                    {/* Green NEW star badge */}
                    {ep.isNew && (
                      <div className={styles.newBadge}>
                        <Star size={10} fill="currentColor" />
                        <span>NEW</span>
                      </div>
                    )}

                    {/* Episode Number badge — bottom-left */}
                    {ep.episode_number && (
                      <div className={styles.epNumBadge}>
                        EP {ep.episode_number}
                      </div>
                    )}

                    {/* Black UNCENSORED pill badge */}
                    {ep.isUncensored && (
                      <div className={styles.uncensoredBadge}>
                        <Eye size={10} />
                        <span>UNCENSORED</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>
                    <Link href={watchUrl}>{ep.title}</Link>
                  </h3>
                  <div className={styles.episodeViewsRow}>
                    <Eye size={12} className={styles.eyeIcon} />
                    <span>{ep.views ? (ep.views >= 1000 ? (ep.views / 1000).toFixed(1) + 'K' : ep.views) : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sponsored Ad Banner: After Recent Episodes (Zone 5986194) */}
      <AdBanner zoneId="5986194" desktopOnly />

      {/* Mobile-Only After Recent Episodes Banner (Zone 5986994) */}
      <AdBanner zoneId="5986994" insClass="eas6a97888e10" mobileOnly />

      {/* 2. Latest Series Section: Horizontal scroll slider up to 15 items */}
      <section className={styles.section}>
        <HorizontalScrollRow
          title="Latest Series"
          subtitle="UPDATED DAILY"
          viewAllHref="/recent/series"
        >
          {sortedLatestSeries.slice(0, 15).map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </HorizontalScrollRow>
      </section>

      {/* 2b. Random Section: Live Shuffle slider of active series */}
      <section className={styles.section}>
        <RandomRowSection seriesPool={rawPool} />
      </section>

      {/* Sponsored Native Recommendation Feed Widget (Zone 5986302) - Desktop Only */}
      <AdBanner zoneId="5986302" insClass="eas6a9788e20" desktopOnly />

      {/* Recommendations Banner */}
      {!user ? (
        <section className={`${styles.section} ${styles.recommendationBanner} glass`}>
          <div className={styles.recIconWrapper}>
            <Award size={36} />
          </div>
          <div className={styles.recContent}>
            <h3>Want personalized recommendations?</h3>
            <p>Sign in to record views, calculate trending statistics, and keep track of your watch history.</p>
          </div>
          <Link href="/login" className={styles.recBtn}>
            Sign In Now
          </Link>
        </section>
      ) : (
        <section className={`${styles.section} ${styles.recommendationBanner} glass`}>
          <div className={styles.recIconWrapper}>
            <Award size={36} />
          </div>
          <div className={styles.recContent}>
            <h3>Welcome Back!</h3>
            <p>Quickly access your saved bookmarks in Watchlist or resume watching from your Watch History.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href="/watchlist" className={styles.recBtn}>
              My Watchlist
            </Link>
            <Link href="/history" className={`${styles.recBtn} ${styles.recBtnOutline}`}>
              Watch History
            </Link>
          </div>
        </section>
      )}

      {/* 2b. Trending & Most Viewed Section: Horizontal scroll slider up to 15 items */}
      <section className={styles.section}>
        <HorizontalScrollRow
          title="Trending & Most Viewed"
          subtitle="POPULAR NOW"
          subtitleColor="#ec4899"
          viewAllHref="/trending"
        >
          {[...activeSeries]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 15)
            .map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
        </HorizontalScrollRow>
      </section>

      {/* 3. Upcoming Anime Section: Horizontal scroll slider up to 15 items */}
      {upcomingSeries && upcomingSeries.length > 0 && (
        <section className={styles.section}>
          <HorizontalScrollRow
            title="Upcoming Anime"
            subtitle="COMING SOON"
            viewAllHref="/upcoming"
          >
            {upcomingSeries.slice(0, 15).map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* 4. Explore Collections Banner */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Explore Collections</h2>
            <span className={styles.seriesSubtitle}>CURATED CATEGORIES</span>
          </div>
          <Link href="/categories" className={styles.viewAllLink}>
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
                href={`/categories?genre=${encodeURIComponent(isAll ? 'all' : filterVal)}`}
                className={`${styles.categoryCard} ${isAll ? styles.categoryCardAll : ''}`}
              >
                <span className={styles.categoryEmoji}>{emoji}</span>
                <span className={styles.categoryLabel}>{title}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
