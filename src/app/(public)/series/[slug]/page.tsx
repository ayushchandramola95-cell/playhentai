import React from 'react';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import WatchlistToggle from '@/components/WatchlistToggle/WatchlistToggle';
import FavoriteToggle from '@/components/FavoriteToggle/FavoriteToggle';
import ShareButton from '@/components/ShareButton/ShareButton';
import CommentSection from '@/components/CommentSection/CommentSection';
import RateSeriesButton from '@/components/RateSeriesButton/RateSeriesButton';
import SimilarTitles from '@/components/SimilarTitles/SimilarTitles';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import SeriesEpisodesSection from '@/components/SeriesEpisodesSection/SeriesEpisodesSection';
import DynamicWatchCTA from '@/components/DynamicWatchCTA/DynamicWatchCTA';
import SynopsisBox from './SynopsisBox';
import JsonLd from '@/components/JsonLd/JsonLd';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Eye, ChevronRight, Sparkles } from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from './series.module.css';

import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { convertStudioNameToSlug } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';
import { getSeriesViewsMap } from '@/utils/views';

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
      
      const englishTitle = mock.alt_title_english;
      let titleText = mock.title;
      if (englishTitle && englishTitle !== mock.title) {
        const combined = `${mock.title} (${englishTitle})`;
        if (combined.length <= 60) {
          titleText = combined;
        }
      }
      title = `${titleText} — Watch & Episodes | Play Hentai`;

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
    : [{ url: `${SITE_URL}/hero-banner.png`, width: 1200, height: 630, alt: title }];

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
        .filter((sea: any) => sea.is_published !== false)
        .sort((a: any, b: any) => a.season_number - b.season_number);
      for (const season of activeSeasons) {
        if (season.episodes && season.episodes.length > 0) {
          const activeEps = [...season.episodes]
            .filter((ep: any) => ep.is_published !== false)
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

function renderAboutSections(aboutData: any, aboutTextLegacy: string, seriesTitle: string) {
  if (aboutData && typeof aboutData === 'object' && (aboutData.overview || aboutData.production || aboutData.themes || aboutData.recommended)) {
    const sections = [
      { key: 'overview', title: 'Overview', content: aboutData.overview },
      { key: 'production', title: 'Production & Presentation', content: aboutData.production },
      { key: 'themes', title: 'Themes & Style', content: aboutData.themes },
      { key: 'recommended', title: 'Recommended For', content: aboutData.recommended }
    ].filter(s => s.content && s.content.trim());

    if (sections.length === 0) return null;

    return (
      <div className={styles.aboutSectionsList}>
        {sections.map((sec) => (
          <div key={sec.key} className={styles.aboutSectionItem}>
            <h3 className={styles.aboutSubHeading}>{sec.title}</h3>
            <p className={styles.aboutTextContent}>{sec.content}</p>
          </div>
        ))}
      </div>
    );
  }

  if (!aboutTextLegacy) return null;
  return <p className={styles.aboutTextContent}>{aboutTextLegacy}</p>;
}

const getCachedAllPublishedSeries = unstable_cache(
  async () => {
    try {
      const viewsMap = await getSeriesViewsMap();
      const { data: allSeriesData, error } = await publicSupabaseClient
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
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all published series for catalog:', error);
        return [];
      }

      if (allSeriesData && allSeriesData.length > 0) {
        return allSeriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
      }
    } catch (err) {
      console.error('Error in getCachedAllPublishedSeries:', err);
    }
    return [];
  },
  ['all-published-series-catalog-v7'],
  { revalidate: 60, tags: ['all_series_catalog'] }
);

const getCachedSeriesDetails = unstable_cache(
  async (slug: string) => {
    let dbSeries: any = null;
    let dbSeasons: any[] = [];
    let isDbEmpty = true;

    try {
      const viewsMap = await getSeriesViewsMap();

      const { data: seriesData, error } = await publicSupabaseClient
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
      console.error('Error fetching series details for slug:', slug, err);
    }

    return { dbSeries, dbSeasons, isDbEmpty };
  },
  ['series-details-single-item-v7'],
  { revalidate: 60, tags: ['series_details'] }
);

export default async function SeriesDetailsPage({ params }: SeriesPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const [{ dbSeries, dbSeasons, isDbEmpty }, allPublishedSeries] = await Promise.all([
    getCachedSeriesDetails(slug),
    getCachedAllPublishedSeries()
  ]);

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
  const views = activeSeries.views || 0;
  const rating: number | null = typeof activeSeries.rating === 'number' && activeSeries.rating > 0
    ? Number(activeSeries.rating.toFixed(1))
    : null;
  const voteCount: number = typeof (activeSeries as any).vote_count === 'number' && (activeSeries as any).vote_count > 0
    ? (activeSeries as any).vote_count
    : (rating !== null ? 1 : 0);
  const status = (activeSeries.status || 'finalized').toLowerCase();

  // Clean studio extraction
  const rawStudio = activeSeries.studio;
  const isValidStudio = rawStudio && 
    typeof rawStudio === 'string' &&
    rawStudio.trim() !== '' && 
    rawStudio.trim().toLowerCase() !== 'null' && 
    rawStudio.trim().toLowerCase() !== 'undefined';
  const studio = isValidStudio ? rawStudio.trim() : '';
  const displayStudio = studio ? studio.split(',')[0].trim() : '';
  const releaseYear = activeSeries.release_year || activeSeries.releaseYear || 2026;
  
  // Find First Episode for primary CTA
  let firstEpisode: any = null;
  if (activeSeries.seasons) {
    const activeSeasons = [...activeSeries.seasons]
      .filter((sea: any) => sea.is_published !== false)
      .sort((a: any, b: any) => a.season_number - b.season_number);
    for (const season of activeSeasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sortedEps = [...season.episodes]
          .filter((ep: any) => ep.is_published !== false)
          .sort((a: any, b: any) => a.episode_number - b.episode_number);
        if (sortedEps.length > 0) {
          firstEpisode = sortedEps[0];
          break;
        }
      }
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

  // Calculate ceiling average runtime from actual episodes if available
  const allSeriesEpisodes = activeSeries.seasons?.flatMap((s: any) => s.episodes || []) || [];
  const validEpisodesWithDuration = allSeriesEpisodes.filter((ep: any) => ep.duration_seconds && ep.duration_seconds > 0);
  const computedAvgRuntime = validEpisodesWithDuration.length > 0
    ? Math.ceil(validEpisodesWithDuration.reduce((acc: number, ep: any) => acc + ep.duration_seconds, 0) / validEpisodesWithDuration.length / 60)
    : (activeSeries.runtime !== undefined && activeSeries.runtime !== null ? Math.ceil(activeSeries.runtime) : 24);

  // Separate metadata/format tags from thematic discovery tags
  const isUncensored =
    activeSeries.content_rating?.toLowerCase() === 'uncensored' ||
    activeSeries.tags?.some((t: string) => t.toLowerCase() === 'uncensored');

  const derivedThemes = (activeSeries.tags || []).filter(
    (t: string) =>
      t.toLowerCase() !== 'featured' &&
      !t.toLowerCase().startsWith('featured:') &&
      t.toLowerCase() !== (activeSeries.category || '').toLowerCase() &&
      t.toLowerCase() !== 'uncensored' &&
      t.toLowerCase() !== 'censored'
  );

  // Compute similar series (up to 12 items) using real catalog and weighted scoring algorithm
  const sourceList = (allPublishedSeries && allPublishedSeries.length > 0) ? allPublishedSeries : MOCK_SERIES;

  const currentStudios = isValidStudio
    ? studio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean)
    : [];

  const currentTags = Array.isArray(activeSeries.tags)
    ? activeSeries.tags.map((t: string) => t.toLowerCase())
    : [];

  const scoredCandidates = sourceList
    .filter((s: any) => s.slug !== slug && s.id !== activeSeries.id)
    .map((s: any) => {
      let score = 0;

      // Match Studio (8 points)
      if (currentStudios.length > 0 && s.studio && typeof s.studio === 'string') {
        const sLower = s.studio.trim().toLowerCase();
        if (sLower !== 'null' && sLower !== 'undefined') {
          const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean);
          const hasOverlap = sStudios.some((st: string) => currentStudios.includes(st));
          if (hasOverlap) score += 8;
        }
      }

      // Match Tags / Genres (4 points per shared tag)
      if (currentTags.length > 0 && Array.isArray(s.tags)) {
        const sTags = s.tags.map((t: string) => t.toLowerCase());
        const intersection = sTags.filter((t: string) => currentTags.includes(t));
        score += intersection.length * 4;
      }

      // Match Status (2 points)
      if (s.status && activeSeries.status && s.status.toLowerCase() === activeSeries.status.toLowerCase()) {
        score += 2;
      }

      // Match Release Year (1 point)
      if (s.release_year && activeSeries.release_year && s.release_year === activeSeries.release_year) {
        score += 1;
      }

      // Match Rating Proximity (1 point)
      const sRating = typeof s.rating === 'number' && s.rating > 0 ? Number(s.rating.toFixed(1)) : null;
      if (sRating !== null && rating !== null && Math.abs(sRating - rating) <= 1.0) {
        score += 1;
      }

      return { series: s, score };
    });

  // Sort candidates by match score descending, then by views descending
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.series.views || 0) - (a.series.views || 0);
  });

  let similarSeries = scoredCandidates
    .filter((item) => item.score > 0)
    .slice(0, 12)
    .map((item) => item.series);

  // If matching yielded fewer than 6 items, backfill from remaining real catalog items
  if (similarSeries.length < 6) {
    const existingIds = new Set(similarSeries.map((s: any) => s.id || s.slug));
    const backfill = sourceList
      .filter((s: any) => s.slug !== slug && s.id !== activeSeries.id && !existingIds.has(s.id || s.slug))
      .slice(0, 12 - similarSeries.length);
    similarSeries = [...similarSeries, ...backfill];
  }

  // Compute more series by the same studio (up to 6 items)
  let moreFromStudio: any[] = [];
  if (isValidStudio && currentStudios.length > 0) {
    moreFromStudio = sourceList
      .filter((s: any) => s.slug !== slug && s.id !== activeSeries.id)
      .filter((s: any) => {
        if (!s.studio || typeof s.studio !== 'string') return false;
        const sLower = s.studio.trim().toLowerCase();
        if (sLower === 'null' || sLower === 'undefined') return false;
        const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean);
        return sStudios.some((st: string) => currentStudios.includes(st));
      })
      .slice(0, 6);
  }

  // Compile Accordion FAQs
  let renderedFaqs: { q: string, a: string }[] = [];
  if (activeSeries.faq_override && Array.isArray(activeSeries.faq_override) && activeSeries.faq_override.length > 0) {
    renderedFaqs = activeSeries.faq_override;
  } else {
    const genresText = derivedThemes.length > 0 ? derivedThemes.slice(0, 3).join(', ') : 'hentai';
    const mainStudio = displayStudio || 'top animation studios';
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
        a: displayStudio 
          ? `The series was animated by the production studio ${studio}.`
          : `${activeSeries.title} was produced by Japanese animation studios.`
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

  const seriesCanonicalUrl = `${SITE_URL}/series/${slug}`;

  const tvSeriesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    '@id': `${seriesCanonicalUrl}#series`,
    'url': seriesCanonicalUrl,
    'name': activeSeries.title,
    'alternateName': [
      activeSeries.alt_title_english,
      activeSeries.alt_title_romaji,
      activeSeries.alt_title_japanese
    ].filter(Boolean),
    'description': activeSeries.description || `Watch ${activeSeries.title} online in HD on Play Hentai.`,
    'image': [
      getR2Url(activeSeries.cover_image_key || activeSeries.poster_image_key, 'cover'),
      `${SITE_URL}/hero-banner.png`
    ],
    'genre': Array.isArray(activeSeries.tags) && activeSeries.tags.length > 0 ? activeSeries.tags[0] : 'Animation',
    'numberOfSeasons': activeSeries.seasons?.length || 1,
    'numberOfEpisodes': activeSeries.episode_count_override || currentEpCount,
    'datePublished': activeSeries.created_at || activeSeries.first_air_date || undefined,
    'inLanguage': 'en',
    'isFamilyFriendly': false,
    ...(rating !== null && voteCount > 0 ? {
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': Number(rating).toFixed(1),
        'ratingCount': voteCount,
        'bestRating': '10',
        'worstRating': '1',
        'itemReviewed': {
          '@type': 'TVSeries',
          'name': activeSeries.title,
          'url': seriesCanonicalUrl
        }
      }
    } : {}),
    'publisher': {
      '@type': 'Organization',
      'name': 'PlayHentai',
      'url': SITE_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': `${SITE_URL}/icon-512x512.png`
      }
    }
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Series', 'item': `${SITE_URL}/categories` },
      { '@type': 'ListItem', 'position': 3, 'name': activeSeries.title, 'item': seriesCanonicalUrl }
    ]
  };

  return (
    <div className={styles.container}>
      {/* Schema.org Structured Data */}
      <JsonLd data={[tvSeriesJsonLd, breadcrumbJsonLd, faqJsonLd]} />
      
      {/* Ambient Backdrop Banner */}
      <div className={styles.bannerContainer}>
        <Image
          src={getR2Url(activeSeries.banner_image_key || activeSeries.cover_image_key || activeSeries.poster_image_key, 'banner')}
          alt={`Watch ${activeSeries.title} Hentai Anime Online - PlayHentai`}
          fill
          priority
          className={styles.bannerImage}
          style={{ objectPosition: activeSeries.banner_position || 'center 25%' }}
        />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Main Details Wrapper */}
      <div className={styles.contentWrapper}>
        {/* Visible Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight size={14} className={styles.crumbDivider} />
          <Link href="/categories">Series</Link>
          <ChevronRight size={14} className={styles.crumbDivider} />
          <span className={styles.breadcrumbActive}>{activeSeries.title}</span>
        </nav>

        {/* Unified Hero Meta Section */}
        <div className={styles.metaGrid}>
          {/* Left Column: Poster Image & Refined Action Group */}
          <div className={styles.leftCol}>
            <div className={styles.posterWrapper}>
              <Image
                src={getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'poster')}
                alt={`Watch ${activeSeries.title} Uncensored Hentai in Full HD - PlayHentai`}
                fill
                sizes="(max-width: 640px) 140px, (max-width: 900px) 180px, 300px"
                priority
                className={styles.posterImage}
                style={{ objectPosition: activeSeries.poster_position || 'center' }}
              />
              {isUncensored && (
                <div className={styles.posterBadgeUncensored}>
                  <Sparkles size={11} /> UNCENSORED
                </div>
              )}
            </div>

            {/* Poster Action Buttons: Watchlist & Favorite Equal Row, Share Secondary */}
            <div className={styles.posterActionGroup}>
              <div className={styles.actionButtonsTopRow}>
                <WatchlistToggle seriesId={activeSeries.id} />
                <FavoriteToggle seriesId={activeSeries.id} />
              </div>
              <div className={styles.actionButtonsBottomRow}>
                <ShareButton title={activeSeries.title} />
              </div>
            </div>
          </div>

          {/* Right Column: Title, Ratings, Dynamic Watch CTA, Badges & Compact Synopsis */}
          <div className={styles.rightCol}>
            {isDbEmpty && (
              <div className={styles.dbAlert}>
                💡 Displaying catalog preview data.
              </div>
            )}

            {/* Badges & Tags Clean Separation */}
            <div className={styles.headerBadgesContainer}>
              {/* Row 1: Status & Type Metadata Badges */}
              <div className={styles.statusBadgesRow}>
                <span className={styles.categoryBadgePill}>
                  {activeSeries.category || 'ANIME'}
                </span>
                <span className={`${styles.statusBadgePill} ${status === 'completed' ? styles.statusCompleted : styles.statusAiring}`}>
                  {status.toUpperCase()}
                </span>
                {activeSeries.original_source && (
                  <span className={styles.formatBadgePill}>
                    {activeSeries.original_source.toUpperCase()}
                  </span>
                )}
                {isUncensored && (
                  <span className={styles.uncensoredBadgePill}>
                    UNCENSORED
                  </span>
                )}
              </div>

              {/* Row 2: Genre & Thematic Discovery Hashtags */}
              {derivedThemes.length > 0 && (
                <div className={styles.discoveryTagsRow}>
                  {derivedThemes.map((tag: string) => (
                    <Link key={tag} href={`/tag/${tagToSlug(tag)}`} className={styles.discoveryTagChip}>
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Single Semantic H1 */}
            <h1 className={styles.seriesTitle}>{activeSeries.title}</h1>

            {/* Alternative Titles Bar */}
            {(activeSeries.alt_title_english || activeSeries.alt_title_japanese || activeSeries.alt_title_romaji) && (
              <div className={styles.altTitlesRow}>
                {activeSeries.alt_title_english && activeSeries.alt_title_english !== activeSeries.title && (
                  <span className={styles.altTitleItem}>
                    <strong>EN:</strong> {activeSeries.alt_title_english}
                  </span>
                )}
                {activeSeries.alt_title_japanese && (
                  <span className={styles.altTitleItem}>
                    <strong>JP:</strong> {activeSeries.alt_title_japanese}
                  </span>
                )}
              </div>
            )}

            {/* Ratings Summary Block with Compact Rate Button (Visual Priority: Watch > Rate) */}
            <div className={styles.ratingsBlock}>
              <div className={styles.ratingsCard}>
                {rating !== null ? (
                  <>
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
                    <span className={styles.ratingVotes}>({voteCount.toLocaleString()} {voteCount === 1 ? 'vote' : 'votes'})</span>
                  </>
                ) : (
                  <>
                    <span className={`${styles.ratingScore} ${styles.unratedScore}`}>—</span>
                    <span className={styles.ratingMax}>/10</span>
                    <div className={styles.ratingStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          size={13} 
                          fill="transparent" 
                          color="rgba(255,255,255,0.2)" 
                        />
                      ))}
                    </div>
                    <span className={styles.ratingVotes}>(0 votes)</span>
                  </>
                )}
              </div>

              <span className={styles.viewsCounter}>
                <Eye size={14} />
                <span>{views.toLocaleString()} views</span>
              </span>

              {/* Compact Rate Button Placed Inline Next to Ratings */}
              <RateSeriesButton seriesId={activeSeries.id} seriesTitle={activeSeries.title} variant="compact" />
            </div>

            {/* Primary Dynamic Watch CTA Button (Visual Priority) */}
            <DynamicWatchCTA
              seasons={activeSeries.seasons || []}
              seriesSlug={slug}
              defaultEpisodeId={firstEpisode?.id}
              defaultEpisodeNumber={firstEpisode?.episode_number || 1}
            />

            {/* Compact Synopsis with Read More Expansion */}
            <SynopsisBox description={activeSeries.description || ''} />
          </div>
        </div>

        {/* Specifications & Details Grid (Placed directly above Episodes) */}
        <section className={styles.specificationsSection}>
          <div className={styles.detailsTable}>
            {studio ? (
              <div className={styles.detailsRow}>
                <span className={styles.detailsKey}>STUDIO</span>
                <span className={styles.detailsVal}>
                  {studio.split(',').map((sName: string, index: number) => {
                    const cleanName = sName.trim();
                    const studioSlug = convertStudioNameToSlug(cleanName);
                    return (
                      <React.Fragment key={cleanName}>
                        <Link href={`/studios/${studioSlug}`} className={styles.specStudioLink}>
                          {cleanName}
                        </Link>
                        {index < studio.split(',').length - 1 && <span className={styles.specComma}>, </span>}
                      </React.Fragment>
                    );
                  })}
                </span>
              </div>
            ) : null}

            <div className={styles.detailsRow}>
              <span className={styles.detailsKey}>STATUS</span>
              <span className={`${styles.detailsVal} ${styles.statusVal}`}>
                <span 
                  className={styles.statusDot} 
                  style={{ 
                    background: status === 'completed' ? '#94a3b8' : status === 'upcoming' ? '#3b82f6' : '#22c55e',
                    boxShadow: status === 'ongoing' || status === 'airing' ? '0 0 8px #22c55e' : 'none'
                  }} 
                />
                <Link href={`/${status}`} className={styles.specStatusLink}>
                  {status.toUpperCase()}
                </Link>
              </span>
            </div>

            <div className={styles.detailsRow}>
              <span className={styles.detailsKey}>RELEASE YEAR</span>
              <span className={styles.detailsVal}>
                <Link href={`/year/${releaseYear}`} className={styles.specYearLink}>
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
              <span className={styles.detailsKey}>COUNTRY</span>
              <span className={styles.detailsVal}>{activeSeries.country || 'Japan'}</span>
            </div>

            <div className={styles.detailsRow}>
              <span className={styles.detailsKey}>CONTENT RATING</span>
              <span className={styles.detailsVal}>{activeSeries.content_rating || 'Explicit'}</span>
            </div>

            <div className={styles.detailsRow}>
              <span className={styles.detailsKey}>AVG RUNTIME</span>
              <span className={styles.detailsVal}>{computedAvgRuntime} min</span>
            </div>

            <div className={styles.detailsRow}>
              <span className={styles.detailsKey}>SEASONS</span>
              <span className={styles.detailsVal}>{activeSeries.seasons?.length || 1}</span>
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
                <span className={styles.detailsVal} style={{ color: '#ef4444', fontWeight: 600 }}>
                  {activeSeries.content_warnings.join(', ')}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Interactive Episodes Section */}
        <SeriesEpisodesSection
          seasons={activeSeries.seasons || []}
          seriesSlug={slug}
          seriesTitle={activeSeries.title}
          coverImageKey={activeSeries.cover_image_key || activeSeries.poster_image_key}
          contentRating={activeSeries.content_rating}
          seriesRating={rating}
        />

        {/* About This Series Section */}
        {(activeSeries.about_data || activeSeries.about_text) && (
          <section className={styles.aboutSection}>
            <div className={`${styles.aboutCard} glass`}>
              <h2 className={styles.aboutHeading}>About {activeSeries.title}</h2>
              {renderAboutSections(activeSeries.about_data, activeSeries.about_text || '', activeSeries.title)}
            </div>
          </section>
        )}

        {/* Similar Titles Recommendation Carousel */}
        {similarSeries.length > 0 && (
          <SimilarTitles list={similarSeries} />
        )}

        {/* More From Studio Section */}
        {moreFromStudio.length > 0 && displayStudio && (
          <section className={styles.moreFromStudioSection}>
            <div className={styles.moreFromStudioTitleRow}>
              <h2>More From {displayStudio}</h2>
              <Link href={`/studios/${convertStudioNameToSlug(displayStudio)}`} className={styles.moreFromStudioViewAll}>
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

        {/* Discussion / Comments Section (Placed directly above Frequently Asked Questions) */}
        {firstEpisodeId && (
          <section className={styles.discussionSection}>
            <div className={`${styles.commentsCardWrapper} glass`}>
              <CommentSection episodeId={firstEpisodeId} />
            </div>
          </section>
        )}

        {/* Frequently Asked Questions */}
        {renderedFaqs.length > 0 && (
          <section className={styles.faqSection}>
            <h2 className={styles.faqHeading}>Frequently Asked Questions</h2>
            <div className={styles.faqAccordion}>
              {renderedFaqs.map((faq, idx) => (
                <details key={idx} className={styles.faqItem}>
                  <summary className={styles.faqQuestion}>
                    <span>{faq.q}</span>
                    <ChevronRight size={16} className={styles.faqArrow} />
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
    </div>
  );
}
