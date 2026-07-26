import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import fs from 'fs';
import path from 'path';
import { Play, Star, Eye, Calendar, Sparkles, Award, Clock, Flame, ChevronRight } from 'lucide-react';
import HeroCarousel from '@/components/HeroCarousel/HeroCarousel';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import { createClient } from '@/utils/supabase/server';
import styles from './page.module.css';
import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';

export const dynamic = 'force-dynamic';

function getLocalSettings(): Record<string, string> {
  const defaultSettings = { 
    latest_series_sort_mode: 'latest_episode',
    hero_banner_source: 'featured_tags',
    hero_banner_slide_count: '8'
  };
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(fileData) };
    }
  } catch (err) {}
  return defaultSettings;
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

  // 3. Fetch Series from DB
  let featuredSeries: any[] = [];
  let dbSeries: any[] = [];
  let dbEpisodes: any[] = [];
  let isDbEmpty = true;

  try {
    // Fetch series from DB
    const { data: seriesData } = await supabase
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
      .order('created_at', { ascending: false });

    if (seriesData && seriesData.length > 0) {
      isDbEmpty = false;
      dbSeries = seriesData;
    }

    // Fetch episodes directly, ordering by release_date descending first
    const { data: episodeData } = await supabase
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
      .order('release_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (episodeData && episodeData.length > 0) {
      dbEpisodes = episodeData;
    }
  } catch (err) {
    console.error('Error fetching data from Supabase:', err);
  }

  // Fallback pool to rich Mock Data ONLY if DB has zero series
  const pool = isDbEmpty ? MOCK_SERIES : dbSeries;
  const activeSeries = pool;

  // Calculate Featured Series according to Admin Panel heroSource & slideLimit
  if (heroSource === 'latest_series') {
    featuredSeries = [...pool].slice(0, slideLimit);
  } else if (heroSource === 'latest_episodes') {
    featuredSeries = [...pool].slice(0, slideLimit);
  } else if (heroSource === 'latest_mix') {
    featuredSeries = [...pool].slice(0, slideLimit);
  } else if (heroSource === 'random') {
    featuredSeries = [...pool].sort(() => 0.5 - Math.random()).slice(0, slideLimit);
  } else if (heroSource === 'random_mix') {
    const half = Math.ceil(slideLimit / 2);
    const newest = pool.slice(0, half);
    const randoms = [...pool].sort(() => 0.5 - Math.random()).filter(s => !newest.some(n => n.id === s.id)).slice(0, slideLimit - newest.length);
    featuredSeries = [...newest, ...randoms].slice(0, slideLimit);
  } else {
    // Default manual featured tags
    const tagged = pool.filter(s =>
      (s.tags || []).some((t: string) => t.toLowerCase() === 'featured' || t.toLowerCase().startsWith('featured:'))
    );
    featuredSeries = tagged.length > 0 ? tagged.slice(0, slideLimit) : pool.slice(0, slideLimit);
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

  // Sort upcoming series
  const upcomingSeries = activeSeries.filter(s => (s.status || '').toLowerCase() === 'upcoming');

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

  return (
    <div className={styles.container}>
      {/* Ambient Glows */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Featured Hero Carousel Banner */}
      <HeroCarousel activeSeries={featuredSeries} isDbEmpty={isDbEmpty} />

      {/* Hero Bottom Sponsored Ad Banner (728x90 Zone 5986176) */}
      <AdBanner zoneId="5986176" />

      {/* 1. Recent Episodes Section: 4*5 landscape grid */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Recent Episodes</h2>
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
                  <span className={styles.episodeMeta}>Episode {ep.episode_number}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sponsored Ad Banner: After Recent Episodes (Zone 5986194) */}
      <AdBanner zoneId="5986194" />

      {/* 2. Latest Series Section: 6-column Grid with views and status overlays */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Latest Series</h2>
            <span className={styles.seriesSubtitle}>UPDATED DAILY</span>
          </div>
          <Link href="/recent/series" className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className={styles.latestSeriesGrid}>
          {sortedLatestSeries.slice(0, 24).map((item) => (
            <SeriesCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Sponsored Ad Banner: After Latest Series (Zone 5986226) */}
      <AdBanner zoneId="5986226" />

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
          <div className={styles.recIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Award size={36} />
          </div>
          <div className={styles.recContent}>
            <h3>Welcome Back!</h3>
            <p>Quickly access your saved bookmarks in Watchlist or resume watching from your Watch History.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <Link href="/watchlist" className={styles.recBtn} style={{ background: '#3b82f6', color: '#ffffff' }}>
              My Watchlist
            </Link>
            <Link href="/history" className={styles.recBtn} style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
              Watch History
            </Link>
          </div>
        </section>
      )}

      {/* 2b. Trending & Most Viewed Section (Placed before Upcoming Anime) */}
      <section className={styles.section}>
        <div className={styles.seriesSectionHeader}>
          <div className={styles.headerLeftCol}>
            <h2>Trending & Most Viewed</h2>
            <span className={styles.seriesSubtitle} style={{ color: '#ec4899' }}>POPULAR NOW</span>
          </div>
          <Link href="/trending" className={styles.viewAllLink}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className={styles.latestSeriesGrid}>
          {[...activeSeries]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 6)
            .map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
        </div>
      </section>

      {/* 3. Upcoming Anime Grid Section */}
      {upcomingSeries && upcomingSeries.length > 0 && (
        <section className={styles.section}>
          <div className={styles.seriesSectionHeader}>
            <div className={styles.headerLeftCol}>
              <h2>Upcoming Anime</h2>
              <span className={styles.seriesSubtitle} style={{ color: '#3b82f6' }}>COMING SOON</span>
            </div>
            <Link href="/upcoming" className={styles.viewAllLink}>
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className={styles.upcomingGrid}>
            {upcomingSeries.slice(0, 6).map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
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
            return (
              <Link
                key={idx}
                href={`/categories?genre=${encodeURIComponent(filterVal === 'All Genres' ? 'all' : filterVal)}`}
                className={styles.categoryCard}
              >
                <span>{title}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
