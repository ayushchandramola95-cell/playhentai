import React, { cache } from 'react';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Eye, ChevronRight, Sparkles } from 'lucide-react';

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
import AboutSectionBox from './AboutSectionBox';
import JsonLd from '@/components/JsonLd/JsonLd';

import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import { buildSeoTitle, buildSeoDescription } from '@/utils/seoTitle';
import { convertStudioNameToSlug } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';
import { getLocalAllPublishedSeries, getLocalSeriesDetails } from '@/utils/localCatalogStore';
import styles from './series.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 120;

const getCachedAllPublishedSeries = unstable_cache(
  async () => {
    return await getLocalAllPublishedSeries();
  },
  ['all-published-series-catalog-v12'],
  { revalidate: 120, tags: ['all_series_catalog'] }
);

const getCachedSeriesDetails = unstable_cache(
  async (slug: string) => {
    return await getLocalSeriesDetails(slug);
  },
  ['series-details-single-item-v11'],
  { revalidate: 120, tags: ['series_details'] }
);

// React.cache deduplicates requests within the same incoming server render cycle
const getDedupedSeriesDetails = cache(async (slug: string) => {
  return await getCachedSeriesDetails(slug);
});

function getFirstEpisodeId(series: any): string | null {
  if (series?.seasons && Array.isArray(series.seasons)) {
    const activeSeasons = [...series.seasons]
      .filter((sea: any) => sea.is_published !== false)
      .sort((a: any, b: any) => (a.season_number || 0) - (b.season_number || 0));
    for (const season of activeSeasons) {
      if (season.episodes && season.episodes.length > 0) {
        const activeEps = [...season.episodes]
          .filter((ep: any) => ep.is_published !== false)
          .sort((a: any, b: any) => (a.episode_number || 0) - (b.episode_number || 0));
        if (activeEps.length > 0) {
          return activeEps[0].id;
        }
      }
    }
  }
  return null;
}

import { SeriesItem } from '@/components/SeriesCard/SeriesCard';

function pruneForCard(s: any): SeriesItem {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    poster_image_key: s.poster_image_key || s.cover_image_key || '',
    cover_image_key: s.cover_image_key || s.poster_image_key || '',
    rating: typeof s.rating === 'number' && s.rating > 0 ? Number(s.rating.toFixed(1)) : null,
    views: s.views || 0,
    tags: Array.isArray(s.tags) ? s.tags.filter((t: string) => !t.toLowerCase().startsWith('featured')).slice(0, 4) : [],
    release_year: s.release_year || s.releaseYear || null,
    status: s.status || 'finalized',
    episode_count: s.episode_count || 0,
  } as SeriesItem;
}

function getSimilarSeries(activeSeries: any, allPublished: any[]): SeriesItem[] {
  if (!allPublished || allPublished.length === 0) return [];

  const rawStudio = activeSeries.studio;
  const currentStudios = (typeof rawStudio === 'string' && rawStudio.trim() && rawStudio !== 'null' && rawStudio !== 'undefined')
    ? rawStudio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean)
    : [];

  const currentTags = Array.isArray(activeSeries.tags)
    ? activeSeries.tags.map((t: string) => t.toLowerCase().trim()).filter((t: string) => !t.startsWith('featured'))
    : [];

  const activeRating = typeof activeSeries.rating === 'number' && activeSeries.rating > 0 ? Number(activeSeries.rating.toFixed(1)) : null;

  const scoredCandidates = allPublished
    .filter((s: any) => s.slug !== activeSeries.slug && s.id !== activeSeries.id)
    .map((s: any) => {
      let score = 0;

      // Studio match (8 points)
      if (currentStudios.length > 0 && s.studio && typeof s.studio === 'string') {
        const sLower = s.studio.trim().toLowerCase();
        if (sLower !== 'null' && sLower !== 'undefined') {
          const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean);
          if (sStudios.some((st: string) => currentStudios.includes(st))) {
            score += 8;
          }
        }
      }

      // Tag match (4 points per non-admin genre tag)
      if (currentTags.length > 0 && Array.isArray(s.tags)) {
        const sTags = s.tags.map((t: string) => t.toLowerCase().trim()).filter((t: string) => !t.startsWith('featured'));
        const intersection = sTags.filter((t: string) => currentTags.includes(t));
        score += intersection.length * 4;
      }

      // Status match (2 points)
      if (s.status && activeSeries.status && s.status.toLowerCase() === activeSeries.status.toLowerCase()) {
        score += 2;
      }

      // Release year match (1 point)
      if (s.release_year && activeSeries.release_year && s.release_year === activeSeries.release_year) {
        score += 1;
      }

      // Rating proximity (1 point)
      const sRating = typeof s.rating === 'number' && s.rating > 0 ? Number(s.rating.toFixed(1)) : null;
      if (sRating !== null && activeRating !== null && Math.abs(sRating - activeRating) <= 1.0) {
        score += 1;
      }

      return { series: s, score };
    });

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.series.views || 0) - (a.series.views || 0);
  });

  let topItems = scoredCandidates
    .filter((item) => item.score > 0)
    .slice(0, 12)
    .map((item) => pruneForCard(item.series));

  if (topItems.length < 6) {
    const existingIds = new Set(topItems.map((s: any) => s.id));
    const backfill = allPublished
      .filter((s: any) => s.slug !== activeSeries.slug && s.id !== activeSeries.id && !existingIds.has(s.id))
      .slice(0, 12 - topItems.length)
      .map(pruneForCard);
    topItems = [...topItems, ...backfill];
  }

  return topItems.filter((item): item is SeriesItem => Boolean(item));
}

function formatIsoDuration(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `PT${mins}M${secs}S` : `PT${mins}M`;
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  let title = 'Series Details | HentaiKage';
  let description = 'View details and watch episodes of this series on HentaiKage.';
  let ogImage = '';
  let rawSeriesName = '';
  let seriesTags: string[] = [];
  let altEnglish = '';
  let altJapanese = '';

  try {
    const { dbSeries } = await getDedupedSeriesDetails(slug);
    const data = dbSeries;

    if (data) {
      rawSeriesName = data.title || '';
      altEnglish = data.alt_title_english || '';
      altJapanese = data.alt_title_japanese || '';
      seriesTags = (data.tags || [])
        .filter((t: string) => !t.toLowerCase().startsWith('featured'))
        .slice(0, 4);
      ogImage = data.cover_image_key || data.poster_image_key || '';
      
      const isUncensored = 
        data.content_rating?.toLowerCase() === 'uncensored' ||
        data.tags?.some((t: string) => t.toLowerCase() === 'uncensored');
      
      const epCount = (data.seasons || []).reduce((acc: number, s: any) => {
        if (s.is_published !== false && s.episodes) {
          return acc + (s.episodes.filter((e: any) => e.is_published !== false).length || 0);
        }
        return acc;
      }, 0);
      const epCountStr = epCount > 0 ? `${epCount} episode${epCount > 1 ? 's' : ''}` : '';
      const statusStr = data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : '';
      const topGenres = (data.tags || [])
        .filter((t: string) => !t.toLowerCase().startsWith('featured'))
        .slice(0, 4)
        .join(', ');

      if (data.meta_title) {
        title = data.meta_title;
      } else {
        const candidate1 = isUncensored
          ? `Watch ${data.title} Uncensored Hentai Free in HD — HentaiKage`
          : `Watch ${data.title} Hentai Online Free in HD — HentaiKage`;

        if (candidate1.length <= 65) {
          title = candidate1;
        } else {
          const candidate2 = isUncensored
            ? `Watch ${data.title} Uncensored Hentai in HD — HentaiKage`
            : `Watch ${data.title} Hentai Online in HD — HentaiKage`;
          if (candidate2.length <= 65) {
            title = candidate2;
          } else {
            title = buildSeoTitle(`Watch ${data.title}`, isUncensored ? '(Uncensored Hentai)' : '(Hentai Anime)');
          }
        }
      }

      if (data.meta_description) {
        description = buildSeoDescription(data.meta_description);
      } else {
        const metaTokens = [epCountStr, statusStr].filter(Boolean).join(', ');
        const genreToken = topGenres ? `Genres: ${topGenres}.` : '';
        const baseLead = `Watch ${data.title} ${isUncensored ? 'uncensored ' : ''}hentai anime online free in 1080p HD with English subtitles.`;
        
        let candidateDesc = `${baseLead} ${metaTokens ? metaTokens + '. ' : ''}${genreToken} Stream on HentaiKage without ads.`;
        if (candidateDesc.length > 155) {
          candidateDesc = `${baseLead} ${metaTokens ? metaTokens + '. ' : ''}Stream all episodes online in HD.`;
        }
        description = buildSeoDescription(candidateDesc, 155);
      }
    }
  } catch (err) {
    console.error('Error generating metadata:', err);
  }

  const canonicalUrl = `${SITE_URL}/series/${slug}`;
  const posterUrl = ogImage ? getR2Url(ogImage, 'poster') : '';
  const cleanTitle = title.replace(/\s*\|.*$/, '').replace(/\s*—.*$/, '').trim();
  const ogApiUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(cleanTitle)}&subtitle=${encodeURIComponent(description.slice(0, 80))}&badge=${encodeURIComponent('ANIME SERIES')}&image=${encodeURIComponent(posterUrl)}`;

  const images = [
    {
      url: ogApiUrl,
      width: 1200,
      height: 630,
      alt: title,
    },
  ];

  return {
    title,
    description,
    keywords: [
      (rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim(),
      `watch ${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()}`,
      `${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()} hentai`,
      `${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()} anime`,
      `${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()} online free`,
      `${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()} english subtitles`,
      `${(rawSeriesName || cleanTitle.replace(/^Watch\s+/i, '')).trim()} episodes`,
      ...(altEnglish && altEnglish !== rawSeriesName ? [altEnglish, `${altEnglish} hentai`] : []),
      ...(altJapanese ? [altJapanese] : []),
      ...seriesTags.map(t => `${rawSeriesName || cleanTitle} ${t}`),
      'hentaikage',
      'hentai kage',
      'hentai anime stream'
    ],
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

export default async function SeriesDetailsPage({ params }: SeriesPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const [{ dbSeries, dbSeasons }, allPublishedSeries] = await Promise.all([
    getDedupedSeriesDetails(slug),
    getCachedAllPublishedSeries()
  ]);

  const activeSeries = dbSeries ? { ...dbSeries, seasons: dbSeasons } : null;

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

  // Status URL routing slug
  const statusSlug = status === 'completed' || status === 'finalized'
    ? 'completed'
    : status === 'airing' || status === 'ongoing'
    ? 'ongoing'
    : status === 'upcoming'
    ? 'upcoming'
    : status;

  // Clean studio extraction
  const rawStudio = activeSeries.studio;
  const isValidStudio = rawStudio && 
    typeof rawStudio === 'string' &&
    rawStudio.trim() !== '' && 
    rawStudio.trim().toLowerCase() !== 'null' && 
    rawStudio.trim().toLowerCase() !== 'undefined';
  const studio = isValidStudio ? rawStudio.trim() : '';
  const allStudios = isValidStudio
    ? studio.split(',').map((st: string) => st.trim()).filter(Boolean)
    : [];
  const displayStudio = allStudios[0] || '';
  const releaseYear = activeSeries.release_year || activeSeries.releaseYear || null;
  
  // Find First Episode for primary CTA
  let firstEpisode: any = null;
  if (activeSeries.seasons) {
    const activeSeasons = [...activeSeries.seasons]
      .filter((sea: any) => sea.is_published !== false)
      .sort((a: any, b: any) => (a.season_number || 0) - (b.season_number || 0));
    for (const season of activeSeasons) {
      if (season.episodes && season.episodes.length > 0) {
        const sortedEps = [...season.episodes]
          .filter((ep: any) => ep.is_published !== false)
          .sort((a: any, b: any) => (a.episode_number || 0) - (b.episode_number || 0));
        if (sortedEps.length > 0) {
          firstEpisode = sortedEps[0];
          break;
        }
      }
    }
  }

  const firstEpisodeId = getFirstEpisodeId(activeSeries) || (firstEpisode ? firstEpisode.id : null);

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
      !t.toLowerCase().startsWith('featured') &&
      t.toLowerCase() !== (activeSeries.category || '').toLowerCase() &&
      t.toLowerCase() !== 'uncensored' &&
      t.toLowerCase() !== 'censored'
  );

  // Compute similar series (pruned to lightweight objects, eliminating ~160 KB of RSC flight bloat)
  const similarSeries = getSimilarSeries(activeSeries, allPublishedSeries);

  // Compute more series by the same studio(s)
  let moreFromStudio: any[] = [];
  if (allStudios.length > 0) {
    const studioLowerSet = new Set(allStudios.map(s => s.toLowerCase()));
    moreFromStudio = (allPublishedSeries || [])
      .filter((s: any) => s.slug !== slug && s.id !== activeSeries.id)
      .filter((s: any) => {
        if (!s.studio || typeof s.studio !== 'string') return false;
        const sLower = s.studio.trim().toLowerCase();
        if (sLower === 'null' || sLower === 'undefined') return false;
        const sStudios = s.studio.split(',').map((st: string) => st.trim().toLowerCase()).filter(Boolean);
        return sStudios.some((st: string) => studioLowerSet.has(st));
      })
      .slice(0, 6)
      .map(pruneForCard)
      .filter((item): item is SeriesItem => Boolean(item));
  }

  // Prune CTA seasons to minimal payload
  const ctaSeasons = (activeSeries.seasons || []).map((s: any) => ({
    id: s.id,
    season_number: s.season_number || 1,
    episodes: (s.episodes || []).map((ep: any) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      duration_seconds: ep.duration_seconds,
      is_published: ep.is_published,
    }))
  }));

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
        a: `${activeSeries.title} is available in its ${activeSeries.content_rating || 'uncensored'} version. You can watch it in full high definition (1080p) online on HentaiKage.`
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
  const posterFullUrl = getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'poster');
  const defaultPublishDate = activeSeries.created_at || activeSeries.first_air_date || '2024-01-01T00:00:00.000Z';

  const tvEpisodesJsonLd: any[] = [];
  if (Array.isArray(activeSeries.seasons)) {
    activeSeries.seasons.forEach((season: any) => {
      if (Array.isArray(season.episodes)) {
        season.episodes
          .filter((ep: any) => ep.is_published !== false)
          .forEach((ep: any) => {
            const epWatchUrl = `${SITE_URL}${getEpisodeWatchUrl(ep.id, ep.episode_number, slug)}`;
            tvEpisodesJsonLd.push({
              '@type': 'TVEpisode',
              'episodeNumber': ep.episode_number,
              'name': ep.title || `${activeSeries.title} Episode ${ep.episode_number}`,
              'url': epWatchUrl,
              'image': ep.thumbnail_key ? getR2Url(ep.thumbnail_key, 'thumbnail') : posterFullUrl,
              'datePublished': ep.release_date || ep.created_at || defaultPublishDate,
              ...(ep.duration_seconds ? { 'duration': formatIsoDuration(ep.duration_seconds) } : {})
            });
          });
      }
    });
  }

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
    'description': activeSeries.description || `Watch ${activeSeries.title} online in HD on HentaiKage.`,
    'image': [
      getR2Url(activeSeries.cover_image_key || activeSeries.poster_image_key, 'cover'),
      `${SITE_URL}/hero-banner.png`
    ],
    'genre': Array.isArray(activeSeries.tags) && activeSeries.tags.length > 0 
      ? activeSeries.tags.filter((t: string) => !t.toLowerCase().startsWith('featured')).slice(0, 5) 
      : ['Hentai', 'Animation'],
    'numberOfSeasons': activeSeries.seasons?.length || 1,
    'numberOfEpisodes': activeSeries.episode_count_override || currentEpCount,
    'datePublished': defaultPublishDate,
    'inLanguage': ['ja', 'en'],
    'subtitleLanguage': 'en',
    'isFamilyFriendly': false,
    ...(tvEpisodesJsonLd.length > 0 ? { 'episode': tvEpisodesJsonLd } : {}),
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
      'name': 'HentaiKage',
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

  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': `${seriesCanonicalUrl}#poster`,
    'url': seriesCanonicalUrl,
    'contentUrl': posterFullUrl,
    'thumbnailUrl': getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'thumbnail'),
    'name': `${activeSeries.title} Official Anime Poster`,
    'caption': `Watch ${activeSeries.title} full episodes on HentaiKage`,
    'description': activeSeries.description || `Official high definition poster artwork for ${activeSeries.title} hentai anime series.`,
    'representativeOfPage': true,
  };

  return (
    <div className={styles.container}>
      {/* Schema.org Structured Data */}
      <JsonLd data={[tvSeriesJsonLd, breadcrumbJsonLd, faqJsonLd, imageJsonLd]} />
      
      {/* Ambient Backdrop Banner (priority false to prevent stealing LCP bandwidth from series poster) */}
      <div className={styles.bannerContainer}>
        <Image
          src={getR2Url(activeSeries.banner_image_key || activeSeries.cover_image_key || activeSeries.poster_image_key, 'banner')}
          alt={`Watch ${activeSeries.title} Hentai Anime Online - HentaiKage`}
          fill
          priority={false}
          loading="lazy"
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
                alt={`Watch ${activeSeries.title} Uncensored Hentai in Full HD - HentaiKage`}
                fill
                sizes="(max-width: 640px) 140px, (max-width: 900px) 180px, 300px"
                priority
                fetchPriority="high"
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
            {/* Header Main Info: Badges, Title, Alt Titles & Ratings */}
            <div className={styles.headerInfoBlock}>
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

              {/* Ratings Summary Block with Compact Rate Button */}
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
            </div>

            {/* Primary Dynamic Watch CTA Button */}
            <DynamicWatchCTA
              seasons={ctaSeasons}
              seriesSlug={slug}
              defaultEpisodeId={firstEpisode?.id}
              defaultEpisodeNumber={firstEpisode?.episode_number || 1}
              className={styles.dynamicWatchCtaWrap}
            />

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

            {/* Compact Synopsis with Read More Expansion */}
            <SynopsisBox description={activeSeries.description || ''} />
          </div>
        </div>

        {/* Interactive Episodes Section */}
        <div className={styles.episodesSectionWrap}>
          <SeriesEpisodesSection
            seasons={activeSeries.seasons || []}
            seriesSlug={slug}
            seriesTitle={activeSeries.title}
            coverImageKey={activeSeries.cover_image_key || activeSeries.poster_image_key}
            contentRating={activeSeries.content_rating}
            seriesRating={rating}
          />
        </div>

        {/* Specifications & Details Grid */}
        <section className={styles.specificationsSection}>
          <div className={styles.detailsTable}>
            {studio ? (
              <div className={styles.detailsRow}>
                <span className={styles.detailsKey}>STUDIO</span>
                <span className={styles.detailsVal}>
                  {allStudios.map((cleanName: string, index: number) => {
                    const studioSlug = convertStudioNameToSlug(cleanName);
                    return (
                      <React.Fragment key={cleanName}>
                        <Link href={`/studios/${studioSlug}`} className={styles.specStudioLink}>
                          {cleanName}
                        </Link>
                        {index < allStudios.length - 1 && <span className={styles.specComma}>, </span>}
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
                    background: status === 'completed' || status === 'finalized' ? '#94a3b8' : status === 'upcoming' ? '#3b82f6' : '#22c55e',
                    boxShadow: status === 'ongoing' || status === 'airing' ? '0 0 8px #22c55e' : 'none'
                  }} 
                />
                <Link href={`/status/${statusSlug}`} className={styles.specStatusLink}>
                  {status.toUpperCase()}
                </Link>
              </span>
            </div>

            {releaseYear && (
              <div className={styles.detailsRow}>
                <span className={styles.detailsKey}>RELEASE YEAR</span>
                <span className={styles.detailsVal}>
                  <Link href={`/year/${releaseYear}`} className={styles.specYearLink}>
                    {releaseYear}
                  </Link>
                </span>
              </div>
            )}

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

        {/* About This Series Section */}
        <AboutSectionBox
          title={activeSeries.title}
          aboutData={activeSeries.about_data}
          aboutTextLegacy={activeSeries.about_text || ''}
        />

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

        {/* Discussion / Comments Section */}
        {firstEpisodeId ? (
          <section className={styles.discussionSection} id="comments">
            <div className={styles.commentsCardWrapper}>
              <CommentSection episodeId={firstEpisodeId} />
            </div>
          </section>
        ) : (
          <section className={styles.discussionSection} id="comments">
            <div className={styles.commentsCardWrapper}>
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem' }}>
                <p style={{ margin: 0 }}>Discussion will open once episodes are released.</p>
              </div>
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
