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
import { getSeriesViewsMap, getEpisodeViewsMap } from '@/utils/views';
import { tagToSlug } from '@/utils/constants';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export const metadata = {
  title: 'Play Hentai – Watch Hentai Anime Online Free in HD',
  description: 'Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Play Hentai – Watch Hentai Anime Online Free in HD',
    description: 'Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.',
    url: SITE_URL,
    siteName: 'PlayHentai',
    locale: 'en_US',
    type: 'website' as const,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play Hentai – Watch Hentai Anime Online Free in HD',
    description: 'Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.',
  },
};

// 60-Second TTL Cached Catalog Query for Super-Fast TTFB (<80ms)
const getCachedCatalogData = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let dbEpisodes: any[] = [];
    let isDbEmpty = true;

    try {
      const viewsMap = await getSeriesViewsMap();
      const episodeViewsMap = await getEpisodeViewsMap();

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
        dbSeries = seriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
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
        dbEpisodes = episodeData.map((ep: any) => ({
          ...ep,
          views: episodeViewsMap[ep.id] || 0
        }));
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
          isUncensored,
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

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'PlayHentai',
    'url': `${SITE_URL}/`
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[itemListJsonLd, websiteJsonLd]} />

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
            <h2>Latest Hentai Episodes</h2>
            <span className={styles.seriesSubtitle}>NEWLY RELEASED</span>
          </div>
          <Link href="/recent/episodes" prefetch={false} className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className={styles.episodeGrid}>
          {processedEpisodes.slice(0, 20).map((ep) => {
            const watchUrl = getEpisodeWatchUrl(ep.id, ep.episode_number, ep.showSlug);
            return (
              <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                <Link href={watchUrl} prefetch={false} className={styles.cardImageLink}>
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
                    <Link href={watchUrl} prefetch={false}>{ep.title}</Link>
                  </h3>
                  <div className={styles.episodeViewsRow}>
                    <Eye size={12} className={styles.eyeIcon} />
                    <span>
                      {ep.views !== undefined && ep.views !== null
                        ? (ep.views >= 1000 ? (ep.views / 1000).toFixed(1) + 'K' : ep.views)
                        : '0'}
                    </span>
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
          title="Latest Hentai Anime Series"
          subtitle="UPDATED DAILY"
          viewAllHref="/recent/series"
        >
          {sortedLatestSeries.slice(0, 15).map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </HorizontalScrollRow>
      </section>

      {/* Sponsored Ad Banner: After Latest Series (Zone 5986226) - Desktop Only */}
      <AdBanner zoneId="5986226" desktopOnly />

      {/* 2b. Random Section: Live Shuffle slider of active series */}
      <section className={styles.section}>
        <RandomRowSection seriesPool={rawPool} />
      </section>

      {/* Sponsored Native Recommendation Feed Widget (Zone 5986302) - Desktop Only */}
      <section className={styles.section}>
        <AdBanner zoneId="5986302" insClass="eas6a97888e20" desktopOnly className={styles.homepageNativeAd} />
      </section>

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
          <Link href="/login" prefetch={false} className={styles.recBtn}>
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
            <Link href="/watchlist" prefetch={false} className={styles.recBtn}>
              My Watchlist
            </Link>
            <Link href="/history" prefetch={false} className={`${styles.recBtn} ${styles.recBtnOutline}`}>
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
            title="Upcoming Hentai Anime"
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
      </section>

      {/* Large SEO Content Section */}
      <section className={styles.seoContentSection}>
        <div className={styles.seoContentWrapper}>
          
          {/* Main Title and Expanded Intro Block */}
          <div className={styles.introContent} style={{ background: 'rgba(15, 15, 15, 0.65)', border: '1px solid rgba(245, 158, 11, 0.15)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.04)' }}>
            <h1 className={styles.mainTitle}>Play Hentai — Hentai Anime &amp; Adult Animation</h1>
            
            <p className={styles.introText}>
              Welcome to <strong>Play Hentai</strong>, the premier online database and high-definition streaming platform for adult animation and hentai series. Our library catalogs an extensive range of premium uncensored hentai anime titles, ensuring you can discover legendary classics alongside the latest 3D CGI releases. We systematically organize our content by <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>genres</Link>, <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>tags</Link>, <Link href="/studios" style={{ color: '#f59e0b', textDecoration: 'underline' }}>production studios</Link>, and <Link href="/categories" style={{ color: '#f59e0b', textDecoration: 'underline' }}>release years</Link> to deliver a seamless, high-performance browsing experience.
            </p>
            
            <p className={styles.introText}>
              Every series profile on Play Hentai features detailed synopses, verified alternative titles (including Japanese Kanji characters and Romaji spellings), and aggregate community ratings. From there, you can access individual watch pages with our custom theater-mode HTML5 video player. Whether you prefer English subbed episodes, English dubbed releases, or raw uncensored animation, Play Hentai is fully optimized for speed, discoverability, and clean viewing.
            </p>

            <p className={styles.introText} style={{ marginTop: '1.2rem', marginBottom: '0.8rem', fontWeight: 700, color: '#ffffff', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🚀 Quick Navigation &amp; Discovery Hub
            </p>

            {/* Quick Links Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
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
              <h3>What Is Play Hentai?</h3>
              <p>
                Play Hentai is a dedicated online database and streaming platform designed specifically for fans of adult animation and Japanese hentai series. Our goal is to provide a central, organized resource where users can explore comprehensive metadata, track active releases, and stream high-definition content in a clean, high-performance environment. Instead of simple link aggregates, we build rich series profiles that catalog everything from release history to studio details.
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
                In adult animation, single shows are often split into multiple seasons or release formats. Play Hentai preserves this structure by maintaining a strict parent-child relationship between a series profile and its child episodes. When you visit a series page, you are presented with a complete overview of the show, including its global rating, total episode count, synopsis, and associated tags.
              </p>
            </div>

            <div className={styles.seoCard}>
              <h3>Find Anime by Alternative Titles</h3>
              <p>
                Anime titles are frequently translated or romanized in multiple ways, making them difficult to track down. A single series might be known by its official Japanese Kanji name, its Romaji transliteration, or a literal English translation. Play Hentai solves this by archiving alternative titles for every series, helping you locate the correct page whether you search for a show's original Japanese title or its translated western counterpart.
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
                Play Hentai is committed to maintaining a safe, transparent, and compliant platform for adult audiences. All characters depicted in the animated works cataloged on our site are fictional and represented as 18 years of age or older. We maintain clear legal frameworks, including copyright DMCA policies, Terms of Service, and Privacy Policies.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
