import React from 'react';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import WatchlistToggle from '@/components/WatchlistToggle/WatchlistToggle';
import FavoriteToggle from '@/components/FavoriteToggle/FavoriteToggle';
import CommentSection from '@/components/CommentSection/CommentSection';
import RateSeriesButton from '@/components/RateSeriesButton/RateSeriesButton';
import SimilarTitles from '@/components/SimilarTitles/SimilarTitles';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import JsonLd from '@/components/JsonLd/JsonLd';
import Link from 'next/link';
import Image from 'next/image';
import { Compass, Play, Clock, Layers, Star, Eye, MessageSquare, Flame, Camera, ChevronRight } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from './series.module.css';

import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { convertStudioNameToSlug } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';
import { getSeriesViewsMap } from '@/utils/views';

import SynopsisBox from './SynopsisBox';
import MobileTagsRow from './MobileTagsRow';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let title = 'Series Details - PlayHentai';
  let description = 'View details and watch episodes of this series on PlayHentai.';
  let ogImage = '';

  try {
    const { data } = await publicSupabaseClient
      .from('series')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (data) {
      ogImage = data.cover_image_key || data.poster_image_key || '';
      
      // Dynamic Title System (Length-Sensitive & Em-Dash)
      if (data.meta_title) {
        title = data.meta_title;
      } else {
        const englishTitle = data.alt_title_english;
        let titleText = data.title;
        if (englishTitle && englishTitle !== data.title) {
          const combined = `${data.title} (${englishTitle})`;
          if (combined.length <= 60) {
            titleText = combined;
          }
        }
        title = `${titleText} — Watch & Episodes | Play Hentai`;
      }

      // Description Template (Strict Uncensored Check)
      if (data.meta_description) {
        description = data.meta_description;
      } else {
        const isUncensored = 
          data.content_rating?.toLowerCase() === 'uncensored' ||
          data.tags?.some((t: string) => t.toLowerCase() === 'uncensored');

        if (isUncensored) {
          description = `Watch ${data.title} uncensored hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai.`;
        } else {
          description = `Watch ${data.title} hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai.`;
        }
      }
    } else if (MOCK_SERIES_DETAILS[slug]) {
      const mock = MOCK_SERIES_DETAILS[slug];
      ogImage = mock.cover_image_key || mock.poster_image_key || '';
      
      // Dynamic Title System for mock data
      const englishTitle = mock.alt_title_english;
      let titleText = mock.title;
      if (englishTitle && englishTitle !== mock.title) {
        const combined = `${mock.title} (${englishTitle})`;
        if (combined.length <= 60) {
          titleText = combined;
        }
      }
      title = `${titleText} — Watch & Episodes | Play Hentai`;

      // Description Template for mock data
      const isUncensored = 
        mock.content_rating?.toLowerCase() === 'uncensored' ||
        mock.tags?.some((t: string) => t.toLowerCase() === 'uncensored');

      if (isUncensored) {
        description = `Watch ${mock.title} uncensored hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai.`;
      } else {
        description = `Watch ${mock.title} hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai.`;
      }
    }
  } catch (err) {
    console.error('Error generating metadata:', err);
  }

  const canonicalUrl = `${SITE_URL}/series/${slug}`;
  const images = ogImage 
    ? [{ url: getR2Url(ogImage, 'cover') }] 
    : [{ url: 'https://media.playhentai.live/og-banner.jpg', width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates: {
      canonical: `/series/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images,
      type: 'video.tv_show',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

function getStableStatus(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0 ? 'airing' : 'finalized';
}

function getStableRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const min = 60; // 6.0
  const max = 98; // 9.8
  const val = Math.abs(hash % (max - min));
  return parseFloat(((min + val) / 10).toFixed(1));
}

function getStableReleaseDate(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const daysOffset = Math.abs(hash % 45) + 1;
  const date = new Date(Date.now() - daysOffset * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getFirstEpisodeId(series: any, isDbEmpty: boolean): string | null {
  if (isDbEmpty) {
    const details = MOCK_SERIES_DETAILS[series.slug];
    if (details && details.seasons?.[0]?.episodes?.[0]) {
      return details.seasons[0].episodes[0].id;
    }
    const ep = MOCK_EPISODES.find(e => e.showSlug === series.slug);
    return ep ? ep.id : null;
  } else {
    if (series.seasons) {
      const activeSeasons = [...series.seasons]
        .filter((sea: any) => sea.is_published)
        .sort((a: any, b: any) => a.season_number - b.season_number);
      for (const season of activeSeasons) {
        if (season.episodes && season.episodes.length > 0) {
          const activeEps = [...season.episodes]
            .filter((ep: any) => ep.is_published)
            .sort((a: any, b: any) => a.episode_number - b.episode_number);
          if (activeEps.length > 0) {
            return activeEps[0].id;
          }
        }
      }
    }
  }
  return null;
}

function renderAboutSections(aboutData: any, aboutTextLegacy: string, seriesTitle: string, isMobile = false) {
  // If aboutData exists and has structured sections
  if (aboutData && typeof aboutData === 'object' && (aboutData.overview || aboutData.production || aboutData.themes || aboutData.recommended)) {
    const sections = [
      { key: 'overview', title: 'Overview', content: aboutData.overview },
      { key: 'production', title: 'Production & Presentation', content: aboutData.production },
      { key: 'themes', title: 'Themes & Style', content: aboutData.themes },
      { key: 'recommended', title: 'Recommended For', content: aboutData.recommended }
    ].filter(s => s.content && s.content.trim());

    if (sections.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', textAlign: 'left' }}>
        {sections.map((sec) => (
          <div key={sec.key}>
            <h3 style={{
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: 700,
              color: '#a855f7',
              marginBottom: '0.4rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '0.2rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {sec.title}
            </h3>
            <p style={{
              fontSize: isMobile ? '0.82rem' : '0.92rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              margin: 0
            }}>
              {sec.content}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Legacy fallback: render plaintext
  if (!aboutTextLegacy) return null;
  return (
    <p style={{
      fontSize: isMobile ? '0.82rem' : '0.92rem',
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: '1.6',
      margin: 0,
      textAlign: 'left'
    }}>
      {aboutTextLegacy}
    </p>
  );
}

const getCachedSeriesData = unstable_cache(
  async (slug: string) => {
    let dbSeries: any = null;
    let dbSeasons: any[] = [];
    let isDbEmpty = true;
    let allSeriesList: any[] = [];

    try {
      const viewsMap = await getSeriesViewsMap();

      const { data: allSeriesData } = await publicSupabaseClient
        .from('series')
        .select('*')
        .eq('is_published', true);
      if (allSeriesData) {
        allSeriesList = allSeriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
      }

      const { data: seriesData } = await publicSupabaseClient
        .from('series')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (seriesData) {
        dbSeries = {
          ...seriesData,
          views: viewsMap[seriesData.id] || 0
        };
        isDbEmpty = false;

        const { data: seasonsData } = await publicSupabaseClient
          .from('seasons')
          .select('*')
          .eq('series_id', seriesData.id)
          .eq('is_published', true)
          .order('season_number');

        if (seasonsData) {
          const seasonsWithEpisodes = await Promise.all(
            seasonsData.map(async (season) => {
              const { data: eps } = await publicSupabaseClient
                .from('episodes')
                .select('id, episode_number, title, description, duration_seconds, thumbnail_key, release_date, created_at, is_published')
                .eq('season_id', season.id)
                .eq('is_published', true)
                .order('episode_number');
              return {
                ...season,
                episodes: eps || []
              };
            })
          );
          dbSeasons = seasonsWithEpisodes;
        }
      }
    } catch (err) {
      console.error('Error fetching series details:', err);
    }

    return { dbSeries, dbSeasons, isDbEmpty, allSeriesList };
  },
  ['series-details-full-cache-v1'],
  { revalidate: 60, tags: ['series_details'] }
);

export default async function SeriesDetailsPage({ params }: SeriesPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const { dbSeries, dbSeasons, isDbEmpty, allSeriesList } = await getCachedSeriesData(slug);

  // Load fallback if not found in database
  let activeSeries = isDbEmpty ? MOCK_SERIES_DETAILS[slug] : { ...dbSeries, seasons: dbSeasons };

  if (isDbEmpty && !activeSeries) {
    const baseSeries = MOCK_SERIES.find(s => s.slug === slug);
    if (baseSeries) {
      const relatedEps = MOCK_EPISODES.filter(e => e.showSlug === slug).map((e, index) => ({
        id: e.id,
        episode_number: index + 1,
        title: `${baseSeries.title} - Episode ${index + 1}`,
        description: `This is the detailed description for episode ${index + 1} of ${baseSeries.title}.`,
        duration_seconds: 1440,
        thumbnail_key: e.thumbnail || baseSeries.cover_image_key
      }));
      
      if (relatedEps.length === 0) {
        relatedEps.push({
          id: `mock-ep-${baseSeries.id}-1`,
          episode_number: 1,
          title: `Episode 1`,
          description: `This is the detailed description for episode 1 of ${baseSeries.title}.`,
          duration_seconds: 1440,
          thumbnail_key: baseSeries.cover_image_key
        });
      }
      
      activeSeries = {
        ...baseSeries,
        seasons: [
          {
            id: `mock-season-${baseSeries.id}`,
            season_number: 1,
            title: 'Season 1',
            episodes: relatedEps
          }
        ]
      };
    }
  }

  if (!activeSeries) {
    return (
      <div className={styles.container}>
        <div className={`${styles.notFound} glass`}>
          <h2>Series Not Found</h2>
          <p>The series "{slug}" does not exist in our catalog. Try searching for a different title.</p>
          <Link href="/" className={styles.backBtn}>Back to Home</Link>
        </div>
      </div>
    );
  }

  const activeSeason = activeSeries.seasons?.[0]; // Default to Season 1
  const currentEpCount = (activeSeries.seasons || []).reduce((acc: number, s: any) => {
    if (s.is_published !== false && s.episodes) {
      return acc + (s.episodes.filter((e: any) => e.is_published !== false).length || 0);
    }
    return acc;
  }, 0);

  const hasPlannedOverride = activeSeries.episode_count_override !== undefined && 
                             activeSeries.episode_count_override !== null && 
                             Number(activeSeries.episode_count_override) > 0;

  const totalEpisodesText = hasPlannedOverride
    ? `${currentEpCount} / ${activeSeries.episode_count_override}`
    : `${currentEpCount}`;
  const rating = activeSeries.rating || getStableRating(activeSeries.id || activeSeries.title);
  const status = (activeSeries.status || getStableStatus(activeSeries.id || activeSeries.title)).toLowerCase();
  const views = activeSeries.views || 0;
  const studio = activeSeries.studio || 'Juicymango';
  const releaseYear = activeSeries.release_year || activeSeries.releaseYear || 2026;
  
  // Find Episode 1 to check if it's a preview trailer
  let firstEpisode: any = null;
  if (activeSeries.seasons) {
    const activeSeasons = [...activeSeries.seasons]
      .filter((sea: any) => sea.is_published)
      .sort((a: any, b: any) => a.season_number - b.season_number);
    for (const season of activeSeasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sortedEps = [...season.episodes]
          .filter((ep: any) => ep.is_published)
          .sort((a: any, b: any) => a.episode_number - b.episode_number);
        if (sortedEps.length > 0) {
          firstEpisode = sortedEps[0];
          break;
        }
      }
    }
  }

  // Assemble episodes list
  let episodesToRender = activeSeason && activeSeason.episodes ? [...activeSeason.episodes] : [];
  
  if (episodesToRender.length === 0 && activeSeries.meta_title) {
    const virtualEp = {
      id: `trailer-${activeSeries.id}`,
      episode_number: 1,
      title: '[Preview] Trailer / Preview',
      description: 'Official trailer/preview for the upcoming release.',
      duration_seconds: 180,
      thumbnail_key: activeSeries.poster_image_key || activeSeries.cover_image_key,
      release_date: activeSeries.created_at
    };
    episodesToRender.push(virtualEp);
    if (!firstEpisode) {
      firstEpisode = virtualEp;
    }
  }

  const firstEpisodeId = getFirstEpisodeId(activeSeries, isDbEmpty) || (firstEpisode ? firstEpisode.id : null);

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const firstAirDateFormatted = formatDateString(activeSeries.first_air_date);
  const lastAirDateFormatted = formatDateString(activeSeries.last_air_date);

  // Helper helper to get stable ratings
  function getStableRating(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 7.0 + (Math.abs(hash) % 25) / 10;
  }

  // Derive Themes from Tags to avoid duplication
  const derivedThemes = activeSeries.tags
    ? activeSeries.tags.filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:') && t !== activeSeries.category)
    : [];

  // Compute similar series (5 items) using weighted scoring algorithm
  const sourceList = isDbEmpty ? MOCK_SERIES : allSeriesList;
  const similarSeries = [...sourceList]
    .filter((s: any) => s.slug !== slug)
    .map((s: any) => {
      let score = 0;
      // 1. Same Studio (+6 points)
      if (s.studio && activeSeries.studio) {
        const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase());
        const actStudios = activeSeries.studio.split(',').map((st: string) => st.trim().toLowerCase());
        const hasOverlap = sStudios.some((st: string) => actStudios.includes(st));
        if (hasOverlap) score += 6;
      }
      // 2. Shared Tags (+4 points for EACH matching tag)
      if (s.tags && activeSeries.tags) {
        const sTags = s.tags.map((t: string) => t.toLowerCase());
        const actTags = activeSeries.tags.map((t: string) => t.toLowerCase());
        const intersection = sTags.filter((t: string) => actTags.includes(t));
        score += intersection.length * 4;
      }
      // 3. Same Airing Status (+2 points)
      if (s.status && activeSeries.status && s.status.toLowerCase() === activeSeries.status.toLowerCase()) {
        score += 2;
      }
      // 4. Same Release Year (+1 point)
      if (s.release_year && activeSeries.release_year && s.release_year === activeSeries.release_year) {
        score += 1;
      }
      // 5. Similar Rating (within ±1.0) (+1 point)
      const sRating = s.rating || getStableRating(s.id || s.title);
      const actRating = activeSeries.rating || getStableRating(activeSeries.id || activeSeries.title);
      if (Math.abs(sRating - actRating) <= 1.0) {
        score += 1;
      }
      return { series: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.series)
    .slice(0, 12);

  // Compute more series by the same studio (up to 5 items)
  const moreFromStudio = [...sourceList]
    .filter((s: any) => s.slug !== slug)
    .filter((s: any) => {
      if (!s.studio || !activeSeries.studio) return false;
      const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase());
      const actStudios = activeSeries.studio.split(',').map((st: string) => st.trim().toLowerCase());
      return sStudios.some((st: string) => actStudios.includes(st));
    })
    .slice(0, 5);

  // Compile Accordion FAQs
  let renderedFaqs: { q: string, a: string }[] = [];
  if (activeSeries.faq_override && Array.isArray(activeSeries.faq_override) && activeSeries.faq_override.length > 0) {
    renderedFaqs = activeSeries.faq_override;
  } else {
    const genresText = derivedThemes.length > 0 ? derivedThemes.slice(0, 3).join(', ') : 'hentai';
    const mainStudio = studio.split(',')[0].trim();
    renderedFaqs = [
      {
        q: `What is ${activeSeries.title}?`,
        a: `${activeSeries.title} is a ${genresText} hentai anime series produced by ${mainStudio}. ${activeSeries.description || ''}`
      },
      {
        q: `Is ${activeSeries.title} uncensored?`,
        a: `${activeSeries.title} is available in its ${activeSeries.content_rating || 'uncensored'} version. You can watch it in full high definition (1080p) online on PlayHentai.`
      },
      {
        q: `How many episodes does ${activeSeries.title} have?`,
        a: `${activeSeries.title} has ${currentEpCount} episodes currently available to stream${activeSeries.episode_count_override ? ` out of a planned ${activeSeries.episode_count_override} episodes` : ''}.`
      },
      {
        q: `Is ${activeSeries.title} completed or ongoing?`,
        a: `The show is currently ${status}. New releases are updated here immediately.`
      },
      {
        q: `Who produced ${activeSeries.title}?`,
        a: `The series was animated by the production studio ${studio}.`
      }
    ];
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': renderedFaqs.map((faq) => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.a
      }
    }))
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const seriesCanonicalUrl = `${siteUrl}/series/${slug}`;

  const tvSeriesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    '@id': seriesCanonicalUrl,
    'url': seriesCanonicalUrl,
    'name': activeSeries.title,
    'alternateName': [
      activeSeries.alt_title_english,
      activeSeries.alt_title_romaji,
      activeSeries.alt_title_japanese
    ].filter(Boolean),
    'description': activeSeries.description || `Watch ${activeSeries.title} online in HD on Play Hentai.`,
    'image': getR2Url(activeSeries.cover_image_key || activeSeries.poster_image_key, 'cover'),
    'genre': Array.isArray(activeSeries.tags) && activeSeries.tags.length > 0 ? activeSeries.tags[0] : 'Animation',
    'numberOfSeasons': activeSeries.seasons?.length || 1,
    'numberOfEpisodes': activeSeries.episode_count_override || currentEpCount,
    'datePublished': activeSeries.created_at || activeSeries.first_air_date || undefined,
    'inLanguage': 'en',
    'isFamilyFriendly': false,
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': rating,
      'ratingCount': Math.round(views / 15) || 1,
      'bestRating': 10,
      'worstRating': 1
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'PlayHentai',
      'url': SITE_URL
    }
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'Browse', 'item': `${siteUrl}/categories` },
      { '@type': 'ListItem', 'position': 3, 'name': activeSeries.title, 'item': seriesCanonicalUrl }
    ]
  };

  return (
    <div className={styles.container}>
      {/* Schema.org Structured Data */}
      <JsonLd data={[tvSeriesJsonLd, breadcrumbJsonLd, faqJsonLd]} />
      
      {/* Premium Ambient Backdrop */}
      <div className={styles.bannerContainer}>
        <Image
          src={getR2Url(activeSeries.banner_image_key || activeSeries.cover_image_key || activeSeries.poster_image_key, 'banner')}
          alt={`Watch ${activeSeries.title} Hentai Anime Online - PlayHentai`}
          fill
          priority
          className={styles.bannerImage}
          style={{ objectPosition: activeSeries.banner_position || 'center' }}
        />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Main Details Wrapper */}
      <div className={styles.contentWrapper}>
        {/* Visible Breadcrumbs UI */}
        <div className={styles.breadcrumbs}>
          <Link href="/">Home</Link>
          <ChevronRight size={14} />
          <Link href="/categories">Series</Link>
          <ChevronRight size={14} />
          <span className={styles.breadcrumbActive}>{activeSeries.title}</span>
        </div>

        {/* Desktop View (> 900px) - EXACT REFERENCE SCREENSHOT MATCH */}
        <div className={styles.desktopOnlyContainer}>
          <div className={styles.metaGrid}>
            
            {/* Left Column: Poster Image & Action Buttons */}
            <div className={styles.leftCol}>
              <div className={styles.posterWrapper}>
                <Image
                  src={getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'poster')}
                  alt={`Watch ${activeSeries.title} Uncensored Hentai in Full HD - PlayHentai`}
                  fill
                  sizes="300px"
                  className={styles.posterImage}
                  style={{ objectPosition: activeSeries.poster_position || 'center' }}
                />
              </div>

              {/* Watchlist & Favorite Action Buttons Row */}
              <div className={styles.actionButtonsRow}>
                <WatchlistToggle seriesId={activeSeries.id} />
                <FavoriteToggle seriesId={activeSeries.id} />
              </div>
            </div>

            {/* Right Column: Title, Category Badges, Ratings, Synopsis & Details Grid */}
            <div className={styles.rightCol}>
              {isDbEmpty && (
                <span className={styles.dbAlert}>
                  💡 Displaying catalog mock data for demo.
                </span>
              )}

              {/* Category & Tags Badges */}
              <div className={styles.categoryBadgeRow}>
                <Link href={`/categories/${tagToSlug(activeSeries.category || 'Anime')}`} className={styles.categoryBadge}>
                  {activeSeries.category || 'Anime'}
                </Link>
                {activeSeries.tags && activeSeries.tags
                  .filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
                  .map((tag: string) => (
                    <Link key={tag} href={`/tag/${tagToSlug(tag)}`} className={styles.tagBadge}>
                      #{tag}
                    </Link>
                  ))}
              </div>

              <h1 className={styles.seriesTitle}>{activeSeries.title}</h1>

              {/* Ratings Summary Block */}
              <div className={styles.ratingsBlock}>
                <div className={styles.ratingsCard}>
                  <span className={styles.ratingScore}>{rating.toFixed(1)}</span>
                  <span className={styles.ratingMax}>/10</span>
                  <div className={styles.ratingStars}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const filled = rating / 2 > i;
                      return (
                        <Star 
                          key={i} 
                          size={13} 
                          fill={filled ? '#eab308' : 'transparent'} 
                          color={filled ? '#eab308' : 'rgba(255,255,255,0.2)'} 
                        />
                      );
                    })}
                  </div>
                  <span className={styles.ratingVotes}>({(views / 15).toFixed(0)} votes)</span>
                </div>
                <span className={styles.viewsCounter}>
                  <Eye size={13} />
                  <span>{views.toLocaleString()} views</span>
                </span>
              </div>

              {/* Original Desktop Synopsis Box */}
              <div className={styles.synopsisBox}>
                <h3 className={styles.synopsisLabel}>SYNOPSIS</h3>
                <p className={styles.synopsisText}>{activeSeries.description}</p>
              </div>
            </div>
          </div>

          {/* Details Meta Grid Card (Rendered Full Width below the columns!) */}
          <div className={styles.detailsTable} style={{ marginTop: '2.5rem' }}>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>STUDIO</span>
                  <span className={styles.detailsVal} style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {studio.split(',').map((sName: string, index: number) => {
                      const cleanName = sName.trim();
                      const studioSlug = convertStudioNameToSlug(cleanName);
                      return (
                        <React.Fragment key={cleanName}>
                          <Link href={`/studios/${studioSlug}`} style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                            {cleanName}
                          </Link>
                          {index < studio.split(',').length - 1 && <span style={{ color: 'var(--foreground-secondary)' }}>,</span>}
                        </React.Fragment>
                      );
                    })}
                  </span>
                </div>
                
                {activeSeries.alt_title_japanese && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>JAPANESE TITLE</span>
                    <span className={styles.detailsVal}>{activeSeries.alt_title_japanese}</span>
                  </div>
                )}
                {activeSeries.alt_title_romaji && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>ROMAJI TITLE</span>
                    <span className={styles.detailsVal}>{activeSeries.alt_title_romaji}</span>
                  </div>
                )}
                {activeSeries.alt_title_english && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>ENGLISH TITLE</span>
                    <span className={styles.detailsVal}>{activeSeries.alt_title_english}</span>
                  </div>
                )}

                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>STATUS</span>
                  <span className={`${styles.detailsVal} ${styles.statusVal}`}>
                    <span 
                      className={styles.statusDot} 
                      style={{ 
                        background: status === 'completed' ? '#94a3b8' : status === 'upcoming' ? '#3b82f6' : '#22c55e',
                        boxShadow: status === 'ongoing' || status === 'airing' ? '0 0 8px #22c55e' : status === 'upcoming' ? '0 0 8px #3b82f6' : 'none'
                      }} 
                    />
                    <Link href={`/${status}`} style={{ textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                      {status}
                    </Link>
                  </span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>RELEASE YEAR</span>
                  <span className={styles.detailsVal}>
                    <Link href={`/year/${releaseYear}`} style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                      {releaseYear}
                    </Link>
                  </span>
                </div>
                {firstAirDateFormatted && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>FIRST AIR DATE</span>
                    <span className={styles.detailsVal}>{firstAirDateFormatted}</span>
                  </div>
                )}
                {lastAirDateFormatted && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>LAST AIR DATE</span>
                    <span className={styles.detailsVal}>{lastAirDateFormatted}</span>
                  </div>
                )}
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>ORIGINAL LANGUAGE</span>
                  <span className={styles.detailsVal}>{activeSeries.original_language || 'Japanese'}</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>COUNTRY OF ORIGIN</span>
                  <span className={styles.detailsVal}>{activeSeries.country || 'Japan'}</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>CONTENT RATING</span>
                  <span className={styles.detailsVal} style={{ textTransform: 'capitalize' }}>{activeSeries.content_rating || 'Explicit'}</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>AGE RATING</span>
                  <span className={styles.detailsVal}>{activeSeries.age_rating || '18+'}</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>AVG RUNTIME</span>
                  <span className={styles.detailsVal}>{activeSeries.runtime !== undefined && activeSeries.runtime !== null ? activeSeries.runtime : 24} min</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>SEASONS</span>
                  <span className={styles.detailsVal}>{activeSeries.seasons?.length || 0}</span>
                </div>
                <div className={styles.detailsRow}>
                  <span className={styles.detailsKey}>TOTAL EPISODES</span>
                  <span className={styles.detailsVal}>{totalEpisodesText}</span>
                </div>
                {activeSeries.original_source && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>ORIGINAL SOURCE</span>
                    <span className={styles.detailsVal}>{activeSeries.original_source}</span>
                  </div>
                )}
                {activeSeries.content_warnings && activeSeries.content_warnings.length > 0 && (
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsKey}>CONTENT WARNINGS</span>
                    <span className={styles.detailsVal} style={{ color: '#ef4444', fontWeight: 600 }}>{activeSeries.content_warnings.join(', ')}</span>
                  </div>
                )}
              </div>

          {/* About This Series (Desktop) */}
          {(activeSeries.about_data || activeSeries.about_text) && (
            <section className={styles.aboutSection} style={{ marginBottom: '2rem' }}>
              <div className={`${styles.aboutCard} glass`}>
                <h2>About {activeSeries.title}</h2>
                {renderAboutSections(activeSeries.about_data, activeSeries.about_text || '', activeSeries.title, false)}
              </div>
            </section>
          )}

          {/* Sponsored Ad Banner: Series Details Before Episodes (Zone 5986920) */}
          <AdBanner zoneId="5986920" desktopOnly />

          {/* Desktop 16:9 Episodes Section */}
          <section className={styles.episodesSectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTitle}>
                <Flame size={22} className={styles.headerIcon} />
                <h2>Episodes</h2>
              </div>
              <div className={styles.seasonSelector}>
                {activeSeries.seasons && activeSeries.seasons.map((s: any) => (
                  <button 
                    key={s.id} 
                    className={`${styles.seasonTab} ${s.id === activeSeason?.id ? styles.activeSeasonTab : ''}`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {episodesToRender.length > 0 ? (
              <div className={styles.episodeGrid}>
                {[...episodesToRender]
                  .sort((a: any, b: any) => b.episode_number - a.episode_number)
                  .map((ep: any) => {
                  const epRating = rating - 0.2 - (ep.episode_number % 5) * 0.1;
                  const releaseDate = ep.release_date ? new Date(ep.release_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : getStableReleaseDate(ep.id);
                  const cleanTitle = (ep.title || '').replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').replace(/^.*-\s*/, '').trim();

                  return (
                    <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                      <Link href={getEpisodeWatchUrl(ep.id, ep.episode_number, slug)} className={styles.epImageLink}>
                        <div className={styles.epImageWrapper}>
                          <Image src={getR2Url(ep.thumbnail_key || activeSeries.cover_image_key, 'thumbnail')} alt={`Stream ${activeSeries.title} Episode ${ep.episode_number} Hentai online - PlayHentai`} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 360px" className={styles.epThumbnailImage} />
                          <div className={styles.epTitleOverlay}><span className={styles.epTitleName}>{cleanTitle || `Episode ${ep.episode_number}`}</span></div>
                          <div className={styles.epPlayOverlay}><Play size={28} fill="white" className={styles.epPlayIcon} /></div>
                        </div>
                      </Link>
                      <div className={styles.epMetadataRow}>
                        <span className={styles.epReleaseDate}>{releaseDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        {/* Mobile View (<= 900px) */}
        <div className={styles.mobileOnlyContainer}>
          {/* Top Hero Section */}
          <div className={styles.mobileHeroSection}>
            <div className={styles.posterWrapperMobile}>
              <Image
                src={getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'poster')}
                alt={`Watch ${activeSeries.title} Uncensored Hentai in Full HD - PlayHentai`}
                fill
                sizes="150px"
                className={styles.posterImage}
                style={{ objectPosition: activeSeries.poster_position || 'center' }}
              />
            </div>

            <div className={styles.heroInfoRight}>
              <p className={styles.seriesTitleMobile} aria-hidden="true">{activeSeries.title}</p>

              {/* Rating Row */}
              <div className={styles.ratingRow}>
                <span className={styles.ratingScoreGoldMobile}>{rating.toFixed(1)}</span>
                <RateSeriesButton seriesId={activeSeries.id} seriesTitle={activeSeries.title} iconOnly />
              </div>

              {/* Status & Censorship Badges Row */}
              <div className={styles.statusBadgesRow}>
                <span className={styles.statusPillPinkMobile}>{status.toUpperCase()}</span>
                <span className={styles.censoredPillPinkMobile}>{activeSeries.content_rating || 'Censored'}</span>
              </div>

              {/* Interactive Clickable +Count Tag Expansion Row */}
              <MobileTagsRow tags={activeSeries.tags || []} />
            </div>
          </div>

          {/* Synopsis Box - Expands with Full Series Details on See More */}
          <SynopsisBox 
            description={activeSeries.description} 
            details={{
              studio: (
                <span style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {studio.split(',').map((sName: string, index: number) => {
                    const cleanName = sName.trim();
                    const studioSlug = convertStudioNameToSlug(cleanName);
                    return (
                      <React.Fragment key={cleanName}>
                        <Link href={`/studios/${studioSlug}`} style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                          {cleanName}
                        </Link>
                        {index < studio.split(',').length - 1 && <span style={{ color: 'var(--foreground-secondary)' }}>,</span>}
                      </React.Fragment>
                    );
                  })}
                </span>
              ),
              releaseDate: (
                <Link href={`/year/${releaseYear}`} style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                  {firstAirDateFormatted || releaseYear.toString()}
                </Link>
              ),
              status: (
                <Link href={`/${status}`} style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
                  {status.toUpperCase()}
                </Link>
              ),
              runtime: activeSeries.runtime || 24,
              episodes: totalEpisodesText,
              originalLanguage: activeSeries.original_language || 'Japanese',
              country: activeSeries.country || 'Japan',
              contentRating: activeSeries.content_rating || 'Explicit',
              altTitleJapanese: activeSeries.alt_title_japanese,
              altTitleEnglish: activeSeries.alt_title_english || activeSeries.title,
              originalSource: activeSeries.original_source,
              contentWarnings: activeSeries.content_warnings && activeSeries.content_warnings.length > 0 
                ? activeSeries.content_warnings.join(', ') 
                : undefined,
            }}
          />

          {/* About This Series (Mobile) */}
          {(activeSeries.about_data || activeSeries.about_text) && (
            <section className={styles.aboutSection} style={{ marginBottom: '1.25rem' }}>
              <div className={`${styles.aboutCard} glass`}>
                <h2>About {activeSeries.title}</h2>
                {renderAboutSections(activeSeries.about_data, activeSeries.about_text || '', activeSeries.title, true)}
              </div>
            </section>
          )}

          {/* Action Buttons Row */}
          <div className={styles.actionButtonsRow}>
            <WatchlistToggle seriesId={activeSeries.id} />
            <FavoriteToggle seriesId={activeSeries.id} />
          </div>

          {/* Mobile-Only Banner Above Episodes Grid (Zone 5986998) */}
          <AdBanner zoneId="5986998" insClass="eas6a97888e10" mobileOnly />

          {/* Mobile Episodes Section - 2 Column Image Box Grid */}
          <section className={styles.episodesSectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderTitle}>
                <Flame size={22} className={styles.headerIcon} />
                <h2>Episodes</h2>
              </div>
            </div>

            {episodesToRender.length > 0 ? (
              <div className={styles.episodeGridMobile}>
                {[...episodesToRender]
                  .sort((a: any, b: any) => b.episode_number - a.episode_number)
                  .map((ep: any) => {
                  const releaseDate = ep.release_date ? new Date(ep.release_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : getStableReleaseDate(ep.id);
                  const cleanTitle = (ep.title || '').replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').replace(/^.*-\s*/, '').trim();

                  return (
                    <div key={ep.id} className={`${styles.episodeCard} card-hover`}>
                      <Link href={getEpisodeWatchUrl(ep.id, ep.episode_number, slug)} className={styles.epImageLink}>
                        <div className={styles.epImageWrapper}>
                          <Image src={getR2Url(ep.thumbnail_key || activeSeries.cover_image_key, 'thumbnail')} alt={`Stream ${activeSeries.title} Episode ${ep.episode_number} Hentai online - PlayHentai`} fill sizes="(max-width: 768px) 50vw, 360px" className={styles.epThumbnailImage} />
                          <div className={styles.epTitleOverlay}><span className={styles.epTitleName}>{cleanTitle || `Episode ${ep.episode_number}`}</span></div>
                          <div className={styles.epPlayOverlay}><Play size={28} fill="white" className={styles.epPlayIcon} /></div>
                        </div>
                      </Link>
                      <div className={styles.epMetadataRow}>
                        <span className={styles.epReleaseDate}>{releaseDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        {/* Similar Titles Section */}
        {similarSeries.length > 0 && (
          <SimilarTitles list={similarSeries} />
        )}

        {/* Frequently Asked Questions accordion */}
        {renderedFaqs.length > 0 && (
          <section className={styles.faqSection}>
            <h2>Frequently Asked Questions</h2>
            <div className={styles.faqAccordion}>
              {renderedFaqs.map((faq, idx) => (
                <details key={idx} className={styles.faqItem}>
                  <summary className={styles.faqQuestion}>
                    <span>{faq.q}</span>
                    <svg className={styles.faqArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className={styles.faqAnswer}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Full-Width Bottom Sections (More From Studio & Discussion) */}
      <div className={styles.fullWidthSectionContainer}>
        {/* More From Studio Section */}
        {moreFromStudio.length > 0 && (
          <section className={styles.moreFromStudioSection}>
            <div className={styles.moreFromStudioTitleRow}>
              <h2>More From {studio.split(',')[0].trim()}</h2>
              <Link href={`/studios/${convertStudioNameToSlug(studio.split(',')[0].trim())}`} className={styles.moreFromStudioViewAll}>
                View All
              </Link>
            </div>
            <div className={styles.moreFromStudioGrid}>
              {moreFromStudio.map((item: any) => (
                <SeriesCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Discussion / Comments Section */}
        {firstEpisodeId && (
          <section className={styles.discussionSection}>
            <div className={`${styles.commentsCardWrapper} glass`}>
              <CommentSection episodeId={firstEpisodeId} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Simple fallback icon helper for empty states
function HelpCircle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
