import React from 'react';
import { Metadata } from 'next';
import WatchlistToggle from '@/components/WatchlistToggle/WatchlistToggle';
import CommentSection from '@/components/CommentSection/CommentSection';
import RateSeriesButton from '@/components/RateSeriesButton/RateSeriesButton';
import SimilarTitles from '@/components/SimilarTitles/SimilarTitles';
import Link from 'next/link';
import Image from 'next/image';
import { Compass, Play, Clock, Layers, Star, Eye, MessageSquare, Flame, Camera, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
export const dynamic = 'force-dynamic';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import styles from './series.module.css';

import { MOCK_SERIES, MOCK_EPISODES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { convertStudioNameToSlug } from '@/utils/studiosData';

import SynopsisBox from './SynopsisBox';

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();

  let title = 'Series Details - PlayHentai';
  let description = 'View details and watch episodes of this series on PlayHentai.';
  let ogImage = '';
  let keywords: string[] = [];

  try {
    const { data } = await supabase
      .from('series')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (data) {
      const isDubbed = data.tags ? data.tags.some((t: string) => t.toLowerCase() === 'dub' || t.toLowerCase() === 'dubbed') : false;
      title = data.meta_title || `${data.title} - Watch Online with English ${isDubbed ? 'Dubbed' : 'Subtitles'} | PlayHentai`;
      description = data.meta_description || `Watch ${data.title} online in HD with English ${isDubbed ? 'dubbed and subtitled' : 'subtitles'}. Browse ${isDubbed ? 'series' : 'all episodes, series'} information, release details, genres, and stream the latest updates on PlayHentai.`;
      ogImage = data.cover_image_key || data.poster_image_key || '';
      
      const keywordsList = [
        `${data.title} watch`,
        `${data.title} stream`,
        `${data.title} online`,
        `${data.title} uncensored`,
        `${data.title} subbed`,
        `${data.title} episodes`,
        `${data.title} hentai`,
        data.studio ? `${data.studio} anime` : '',
        data.studio ? `${data.studio} hentai` : '',
        ...(data.alt_title_japanese ? [data.alt_title_japanese] : []),
        ...(data.alt_title_romaji ? [data.alt_title_romaji] : []),
        ...(data.alt_title_english ? [data.alt_title_english] : []),
        ...(data.tags || [])
      ].filter(Boolean);
      keywords = Array.from(new Set(keywordsList));
    } else if (MOCK_SERIES_DETAILS[slug]) {
      const mock = MOCK_SERIES_DETAILS[slug];
      const isDubbed = mock.tags ? mock.tags.some((t: string) => t.toLowerCase() === 'dub' || t.toLowerCase() === 'dubbed') : false;
      title = `${mock.title} - Watch Online with English ${isDubbed ? 'Dubbed' : 'Subtitles'} | StreamNexus`;
      description = `Watch ${mock.title} online in HD with English ${isDubbed ? 'dubbed and subtitled' : 'subtitles'}. Browse ${isDubbed ? 'series' : 'all episodes, series'} information, release details, genres, and stream the latest updates on StreamNexus.`;
      ogImage = mock.cover_image_key || mock.poster_image_key || '';
      
      const keywordsList = [
        `${mock.title} watch`,
        `${mock.title} stream`,
        `${mock.title} online`,
        `${mock.title} uncensored`,
        `${mock.title} subbed`,
        `${mock.title} episodes`,
        `${mock.title} hentai`,
        mock.studio ? `${mock.studio} anime` : '',
        ...(mock.tags || [])
      ].filter(Boolean);
      keywords = Array.from(new Set(keywordsList));
    }
  } catch (err) {
    console.error('Error generating metadata:', err);
  }

  const images = ogImage ? [{ url: getR2Url(ogImage, 'cover') }] : [];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/series/${slug}`,
    },
    openGraph: {
      title,
      description,
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

function getStableViews(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const min = 5000;
  const max = 150000;
  const range = max - min;
  const val = Math.abs(hash % range);
  return min + val;
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

export default async function SeriesDetailsPage({ params }: SeriesPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const supabase = await createClient();
  let dbSeries: any = null;
  let dbSeasons: any[] = [];
  let isDbEmpty = true;
  let allSeriesList: any[] = [];

  try {
    // 1. Fetch all series list for similar carousel
    const { data: allSeriesData } = await supabase
      .from('series')
      .select('*')
      .eq('is_published', true);
    if (allSeriesData) {
      allSeriesList = allSeriesData;
    }

    // 2. Fetch series details
    const { data: seriesData } = await supabase
      .from('series')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (seriesData) {
      dbSeries = seriesData;
      isDbEmpty = false;

      // 3. Fetch seasons under this series
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('*')
        .eq('series_id', seriesData.id)
        .eq('is_published', true)
        .order('season_number');

      if (seasonsData) {
        // 4. Fetch episodes for each season
        const seasonsWithEpisodes = await Promise.all(
          seasonsData.map(async (season) => {
            const { data: eps } = await supabase
              .from('episodes')
              .select('*')
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
        thumbnail_key: e.thumbnail || baseSeries.cover_image_key,
        video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
      }));
      
      if (relatedEps.length === 0) {
        relatedEps.push({
          id: `mock-ep-${baseSeries.id}-1`,
          episode_number: 1,
          title: `Episode 1`,
          description: `This is the detailed description for episode 1 of ${baseSeries.title}.`,
          duration_seconds: 1440,
          thumbnail_key: baseSeries.cover_image_key,
          video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
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
  const currentEpCount = (activeSeries.seasons || []).reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0);
  const totalEpisodesText = activeSeries.episode_count_override !== undefined && activeSeries.episode_count_override !== null
    ? `${currentEpCount} / ${activeSeries.episode_count_override}`
    : `${currentEpCount}`;
  const rating = activeSeries.rating || getStableRating(activeSeries.id || activeSeries.title);
  const status = (activeSeries.status || getStableStatus(activeSeries.id || activeSeries.title)).toLowerCase();
  const views = activeSeries.views || getStableViews(activeSeries.id || activeSeries.title);
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

  // Compute similar series (5 items)
  const sourceList = isDbEmpty ? MOCK_SERIES : allSeriesList;
  const similarSeries = sourceList
    .filter((s: any) => s.slug !== slug)
    .slice(0, 5);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    'name': activeSeries.title,
    'description': activeSeries.description,
    'image': getR2Url(activeSeries.cover_image_key || activeSeries.poster_image_key, 'cover'),
    'genre': activeSeries.tags || [],
    'numberOfSeasons': activeSeries.seasons?.length || 0,
    'numberOfEpisodes': activeSeries.episode_count_override || currentEpCount
  };

  return (
    <div className={styles.container}>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Premium Ambient Backdrop */}
      <div className={styles.bannerContainer}>
        <Image
          src={getR2Url(activeSeries.banner_image_key || activeSeries.cover_image_key || activeSeries.poster_image_key, 'banner')}
          alt={activeSeries.title}
          fill
          priority
          className={styles.bannerImage}
          style={{ objectPosition: activeSeries.banner_position || 'center' }}
        />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Main Details Wrapper */}
      <div className={styles.contentWrapper}>
        {/* Top Hero Section: Side-by-Side Poster & Main Details */}
        <div className={styles.mobileHeroSection}>
          <div className={styles.posterWrapper}>
            <Image
              src={getR2Url(activeSeries.poster_image_key || activeSeries.cover_image_key, 'poster')}
              alt={activeSeries.title}
              fill
              sizes="(max-width: 768px) 130px, 300px"
              className={styles.posterImage}
              style={{ objectPosition: activeSeries.poster_position || 'center' }}
            />
          </div>

          <div className={styles.heroInfoRight}>
            <h1 className={styles.seriesTitle}>{activeSeries.title}</h1>

            {/* Rating Row */}
            <div className={styles.ratingRow}>
              <span className={styles.ratingScoreGold}>{rating.toFixed(1)}</span>
              <RateSeriesButton seriesId={activeSeries.id} seriesTitle={activeSeries.title} />
            </div>

            {/* Status & Censorship Badges Row */}
            <div className={styles.statusBadgesRow}>
              <span className={styles.statusPillPink}>{status.toUpperCase()}</span>
              <span className={styles.censoredPillPink}>{activeSeries.content_rating || 'Censored'}</span>
            </div>

            {/* Compact Inline Genre Tags Row */}
            {activeSeries.tags && activeSeries.tags.length > 0 && (
              <div className={styles.inlineTagsRow}>
                {activeSeries.tags
                  .filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
                  .slice(0, 3)
                  .map((tag: string) => (
                    <Link key={tag} href={`/categories?genre=${encodeURIComponent(tag)}`} className={styles.tagPillGold}>
                      {tag}
                    </Link>
                  ))}
                {activeSeries.tags.filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:')).length > 3 && (
                  <span className={styles.tagPlusCount}>
                    +{activeSeries.tags.filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:')).length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Synopsis Box with Left Yellow Accent Border */}
        <SynopsisBox description={activeSeries.description} />

        {/* Action Buttons Row (Add to Favorites & Watchlist) */}
        <div className={styles.actionButtonsRow}>
          <WatchlistToggle seriesId={activeSeries.id} />
          {firstEpisodeId ? (
            <Link href={getEpisodeWatchUrl(firstEpisodeId, 1, slug)} className={styles.watchLaterBtn}>
              <Clock size={16} />
              <span>Add to watch later</span>
            </Link>
          ) : null}
        </div>

        {/* Studio Meta Line */}
        <div className={styles.studioMetaLine}>
          <Camera size={18} className={styles.studioIcon} />
          <span className={styles.studioLabel}>Studio</span>
          <Link href={`/studios/${convertStudioNameToSlug(studio.split(',')[0].trim())}`} className={styles.studioValueGold}>
            {studio.split(',')[0]}
          </Link>
        </div>

        {/* Episodes Section - Sleek List Cards */}
        <section className={styles.episodesSectionContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderTitle}>
              <h2>Episodes</h2>
            </div>
            
            {/* Season Selector */}
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
            <div className={styles.episodesStackList}>
              {[...episodesToRender]
                .sort((a: any, b: any) => b.episode_number - a.episode_number)
                .map((ep: any) => {
                const cleanTitle = (ep.title || '')
                  .replace(/^\[Preview\]\s*/i, '')
                  .replace(/^\[Trailer\]\s*/i, '')
                  .replace(/^.*-\s*/, '')
                  .trim();

                return (
                  <Link key={ep.id} href={getEpisodeWatchUrl(ep.id, ep.episode_number, slug)} className={styles.epListItemCard}>
                    <div className={styles.epPlayBtnCircle}>
                      <Play size={18} fill="#090d16" color="#090d16" />
                    </div>
                    <div className={styles.epListTitleCol}>
                      <span className={styles.epSeriesSubname}>{activeSeries.title}</span>
                      <span className={styles.epTitleMain}>{cleanTitle || `Episode ${ep.episode_number}`}</span>
                    </div>
                    <div className={styles.epListRightCol}>
                      <span className={styles.epNewBadge}>NEW</span>
                      <ChevronRight size={18} className={styles.epChevronIcon} />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={`${styles.emptyGridState} glass`}>
              <HelpCircle size={48} />
              <h3>No episodes available</h3>
              <p>No episodes have been published for this season yet. Check back later!</p>
            </div>
          )}
        </section>

        {/* Similar Titles Section */}
        {similarSeries.length > 0 && (
          <SimilarTitles list={similarSeries} />
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
