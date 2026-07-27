import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getR2Url } from '@/utils/r2';
import { MOCK_SERIES, MOCK_SERIES_DETAILS } from '@/utils/mockData';
import { parseEpisodeSlug, getEpisodeWatchUrl } from '@/utils/episodeUrl';
import WatchPageClient from './WatchPageClient';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './watch.module.css';

export const dynamic = 'force-dynamic';

const MOCK_EPISODES: Record<string, any> = {
  'mock-ep-1': { id: 'mock-ep-1', episode_number: 1, title: 'The Ghost Run', description: 'A high-stakes data heist goes sideways when a digital phantom intercepts the netrunner\'s neural connection.', duration_seconds: 1440, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', series_title: 'Cyberpunk Odyssey', slug: 'cyberpunk-odyssey', next_episode_id: 'mock-ep-2' },
  'mock-ep-2': { id: 'mock-ep-2', episode_number: 2, title: 'Neon Gridlock', description: 'Trapped inside the Lower Slums grid, our hacker must bargain with an illegal cyberware doctor to escape.', duration_seconds: 1320, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', series_title: 'Cyberpunk Odyssey', slug: 'cyberpunk-odyssey', next_episode_id: 'mock-ep-3' },
  'mock-ep-3': { id: 'mock-ep-3', episode_number: 3, title: 'Black Ice Firewall', description: 'Breaching the central server mainframe leads to a final confrontation inside the virtual construct with an AI guardian.', duration_seconds: 1500, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', series_title: 'Cyberpunk Odyssey', slug: 'cyberpunk-odyssey', next_episode_id: null },
  'mock-ep-4': { id: 'mock-ep-4', episode_number: 1, title: 'Ancient Whispers', description: 'Discovering a dormant stone rune in the village outskirts initiates a call that cannot be ignored.', duration_seconds: 1380, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', series_title: 'Fantasy Chronicles: Runes', slug: 'fantasy-chronicles-runes', next_episode_id: 'mock-ep-5' },
  'mock-ep-5': { id: 'mock-ep-5', episode_number: 2, title: 'The Runic Compass', description: 'Finding the ancient cartographer\'s map reveals the location of the secondary core.', duration_seconds: 1260, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', series_title: 'Fantasy Chronicles: Runes', slug: 'fantasy-chronicles-runes', next_episode_id: 'mock-ep-6' },
  'mock-ep-6': { id: 'mock-ep-6', episode_number: 3, title: 'Lost Monolith', description: 'Reaching the core monolith forces our wizard to decipher the ancient spellbooks.', duration_seconds: 1480, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4', series_title: 'Fantasy Chronicles: Runes', slug: 'fantasy-chronicles-runes', next_episode_id: null },
  'mock-ep-7': { id: 'mock-ep-7', episode_number: 1, title: 'Midnight Rain', description: 'A wet alleyway holds the first lead of a missing cyber-augment broker.', duration_seconds: 1440, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', series_title: 'Neon Tokyo Noir', slug: 'neon-tokyo-noir', next_episode_id: 'mock-ep-8' },
  'mock-ep-8': { id: 'mock-ep-8', episode_number: 2, title: 'Shadow Protocol', description: 'Investigating a corporate penthouse requires slipping past state-of-the-art optical camo guards.', duration_seconds: 1320, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', series_title: 'Neon Tokyo Noir', slug: 'neon-tokyo-noir', next_episode_id: 'mock-ep-9' },
  'mock-ep-9': { id: 'mock-ep-9', episode_number: 3, title: 'Chrome Syndicate', description: 'Cornered in an industrial port warehouses, the detective fights to reveal the truth.', duration_seconds: 1500, video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', series_title: 'Neon Tokyo Noir', slug: 'neon-tokyo-noir', next_episode_id: null }
};

interface WatchPageProps {
  params: Promise<{ episodeId: string }>;
}

async function resolveEpisode(supabase: any, episodeId: string) {
  const parsed = parseEpisodeSlug(episodeId);

  // 1. Try slug resolution if episodeId matches "series-slug-episode-1"
  if (parsed?.seriesSlug && parsed?.episodeNumber !== undefined) {
    try {
      const { data: seriesData } = await supabase
        .from('series')
        .select('*, seasons(id, season_number, is_published, episodes(*))')
        .eq('slug', parsed.seriesSlug)
        .eq('is_published', true)
        .maybeSingle();

      if (seriesData && seriesData.seasons) {
        let foundEp: any = null;
        let seasonId: string = '';
        for (const season of seriesData.seasons) {
          if (season.episodes) {
            const ep = season.episodes.find((e: any) => e.episode_number === parsed.episodeNumber && e.is_published);
            if (ep) {
              foundEp = ep;
              seasonId = season.id;
              break;
            }
          }
        }

        if (foundEp) {
          const { data: siblingEps } = await supabase
            .from('episodes')
            .select('*')
            .eq('season_id', seasonId)
            .eq('is_published', true)
            .order('episode_number');

          return {
            activeEpisode: foundEp,
            seriesDetails: seriesData,
            seriesTitle: seriesData.title,
            seriesSlug: seriesData.slug,
            seasonEpisodes: siblingEps || [foundEp],
            isDbEmpty: false
          };
        }
      }
    } catch (e) {}
  }

  // 2. Try direct ID query (UUID or trailer-id)
  try {
    if (episodeId.startsWith('trailer-')) {
      const seriesId = episodeId.replace('trailer-', '');
      const { data: sData } = await supabase
        .from('series')
        .select('*')
        .or(`id.eq.${seriesId},slug.eq.${seriesId}`)
        .maybeSingle();
      if (sData) {
        const activeEp = {
          id: episodeId,
          episode_number: 1,
          title: '[Preview] Trailer / Preview',
          description: 'Official trailer/preview for the upcoming release.',
          video_key: sData.meta_title,
          thumbnail_key: sData.cover_image_key || sData.poster_image_key,
          duration_seconds: 180,
          release_date: sData.created_at
        };
        return {
          activeEpisode: activeEp,
          seriesDetails: sData,
          seriesTitle: sData.title,
          seriesSlug: sData.slug,
          seasonEpisodes: [activeEp],
          isDbEmpty: false
        };
      }
    } else {
      const { data: epData } = await supabase
        .from('episodes')
        .select('*, seasons(series_id, title, series(*))')
        .eq('id', episodeId)
        .eq('is_published', true)
        .maybeSingle();

      if (epData) {
        const seriesObj = epData.seasons?.series || {};
        const { data: siblingEps } = await supabase
          .from('episodes')
          .select('*')
          .eq('season_id', epData.season_id)
          .eq('is_published', true)
          .order('episode_number');

        return {
          activeEpisode: epData,
          seriesDetails: seriesObj,
          seriesTitle: seriesObj.title || 'Series',
          seriesSlug: seriesObj.slug || '',
          seasonEpisodes: siblingEps || [epData],
          isDbEmpty: false
        };
      }
    }
  } catch (e) {}

  // 3. Fallback mock resolution
  if (parsed?.seriesSlug && parsed?.episodeNumber !== undefined) {
    const mockDetail = MOCK_SERIES_DETAILS[parsed.seriesSlug] || MOCK_SERIES.find((s: any) => s.slug === parsed.seriesSlug);
    if (mockDetail && mockDetail.seasons) {
      let foundEp: any = null;
      let allEps: any[] = [];
      for (const season of mockDetail.seasons) {
        if (season.episodes) {
          allEps.push(...season.episodes);
          const ep = season.episodes.find((e: any) => e.episode_number === parsed.episodeNumber);
          if (ep) foundEp = ep;
        }
      }
      if (foundEp) {
        return {
          activeEpisode: foundEp,
          seriesDetails: mockDetail,
          seriesTitle: mockDetail.title,
          seriesSlug: mockDetail.slug || parsed.seriesSlug,
          seasonEpisodes: allEps,
          isDbEmpty: true
        };
      }
    }
  }

  if (MOCK_EPISODES[episodeId]) {
    const activeEp = MOCK_EPISODES[episodeId];
    const sSlug = activeEp.slug;
    const siblingEps = Object.values(MOCK_EPISODES).filter((ep: any) => ep.slug === sSlug);
    const mockDetail = MOCK_SERIES_DETAILS[sSlug] || MOCK_SERIES.find((s: any) => s.slug === sSlug);
    return {
      activeEpisode: activeEp,
      seriesDetails: mockDetail,
      seriesTitle: activeEp.series_title,
      seriesSlug: sSlug,
      seasonEpisodes: siblingEps,
      isDbEmpty: true
    };
  }

  return null;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const episodeId = resolvedParams.episodeId;
  const supabase = await createClient();

  let title = 'Watch Episode - PlayHentai';
  let description = 'Play and watch this episode in full HD streaming on PlayHentai.';
  let thumbnail = '';
  let canonicalPath = `/watch/${episodeId}`;

  try {
    const resolved = await resolveEpisode(supabase, episodeId);
    if (resolved?.activeEpisode) {
      const ep = resolved.activeEpisode;
      title = `${resolved.seriesTitle} Episode ${ep.episode_number}: ${ep.title} (HD Stream)`;
      description = ep.description || description;
      thumbnail = ep.thumbnail_key || ep.thumbnail || '';
      canonicalPath = getEpisodeWatchUrl(ep.id, ep.episode_number, resolved.seriesSlug);
    }
  } catch (err) {
    console.error('Error generating metadata:', err);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const images = thumbnail ? [{ url: getR2Url(thumbnail, 'thumbnail') }] : [];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images,
      type: 'video.episode',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const resolvedParams = await params;
  const episodeId = resolvedParams.episodeId;
  const supabase = await createClient();

  let allSeriesList: any[] = [];
  try {
    const { data: allSeriesData } = await supabase
      .from('series')
      .select('*')
      .eq('is_published', true);
    if (allSeriesData) allSeriesList = allSeriesData;
  } catch (e) {}

  const resolved = await resolveEpisode(supabase, episodeId);

  if (!resolved || !resolved.activeEpisode) {
    return (
      <div className={styles.container}>
        <div className={`${styles.notFound} glass`}>
          <h2>Episode Not Found</h2>
          <p>The requested episode does not exist or has not been published yet.</p>
          <Link href="/" className={styles.backBtn}>Back to Home</Link>
        </div>
      </div>
    );
  }

  const { activeEpisode, seriesDetails, seriesTitle, seriesSlug, seasonEpisodes, isDbEmpty } = resolved;

  const sourceList = isDbEmpty ? MOCK_SERIES : allSeriesList;
  const similarSeries = sourceList
    .filter((s: any) => s.slug !== seriesSlug)
    .slice(0, 6);

  const currentIdx = seasonEpisodes.findIndex((ep: any) => ep.id === activeEpisode.id || ep.episode_number === activeEpisode.episode_number);
  const prevEpisode = currentIdx > 0 ? seasonEpisodes[currentIdx - 1] : null;
  const nextEpisode = currentIdx !== -1 && currentIdx < seasonEpisodes.length - 1 
    ? seasonEpisodes[currentIdx + 1] 
    : null;

  // Guaranteed thumbnailUrl fallback chain — must never be empty for valid VideoObject
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const canonicalUrl = `${siteUrl}${getEpisodeWatchUrl(activeEpisode.id, activeEpisode.episode_number, seriesSlug)}`;

  const thumbnailUrl =
    getR2Url(activeEpisode.thumbnail_key || activeEpisode.thumbnail, 'thumbnail') ||
    getR2Url(seriesDetails?.cover_image_key || seriesDetails?.poster_image_key, 'cover') ||
    '';

  // Direct R2 video URL (MP4 publicly accessible) — required for Google video rich results
  const videoContentUrl = activeEpisode.video_key
    ? getR2Url(activeEpisode.video_key, 'video')
    : canonicalUrl;

  const seriesPageUrl = `${siteUrl}/series/${seriesSlug}`;


  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': canonicalUrl,
    'name': `${seriesTitle} - Episode ${activeEpisode.episode_number}: ${activeEpisode.title}`,
    'description': activeEpisode.description || `Watch ${seriesTitle} Episode ${activeEpisode.episode_number} in HD online.`,
    'thumbnailUrl': thumbnailUrl ? [thumbnailUrl] : undefined,
    'uploadDate': activeEpisode.release_date || activeEpisode.created_at || new Date().toISOString(),
    'duration': activeEpisode.duration_seconds ? `PT${Math.floor(activeEpisode.duration_seconds / 60)}M` : 'PT24M',
    'contentUrl': videoContentUrl,
    'embedUrl': canonicalUrl,
    'url': canonicalUrl,
    'inLanguage': 'en',
    'isFamilyFriendly': false,
    'publisher': {
      '@type': 'Organization',
      'name': 'PlayHentai',
      'url': siteUrl
    },
    'partOfSeries': {
      '@type': 'TVSeries',
      'name': seriesTitle,
      'url': seriesPageUrl
    }
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': seriesTitle, 'item': seriesPageUrl },
      { '@type': 'ListItem', 'position': 3, 'name': `Episode ${activeEpisode.episode_number}`, 'item': canonicalUrl }
    ]
  };

  return (
    <>
      <JsonLd data={[videoJsonLd, breadcrumbJsonLd]} />
      <WatchPageClient
        activeEpisode={activeEpisode}
        seasonEpisodes={seasonEpisodes}
        seriesDetails={seriesDetails}
        seriesTitle={seriesTitle}
        seriesSlug={seriesSlug}
        similarSeries={similarSeries}
        isDbEmpty={isDbEmpty}
        prevEpisode={prevEpisode}
        nextEpisode={nextEpisode}
      />
    </>
  );
}
