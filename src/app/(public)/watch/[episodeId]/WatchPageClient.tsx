'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Tv, Heart, Star, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';
import CommentSection from '@/components/CommentSection/CommentSection';
import SimilarTitles from '@/components/SimilarTitles/SimilarTitles';
import AdBanner from '@/components/AdBanner/AdBanner';
import styles from './watch.module.css';

interface WatchPageClientProps {
  activeEpisode: any;
  seasonEpisodes: any[];
  seriesDetails: any;
  seriesTitle: string;
  seriesSlug: string;
  similarSeries: any[];
  isDbEmpty: boolean;
  prevEpisode: any;
  nextEpisode: any;
}

export default function WatchPageClient({
  activeEpisode,
  seasonEpisodes,
  seriesDetails,
  seriesTitle,
  seriesSlug,
  similarSeries,
  isDbEmpty,
  prevEpisode,
  nextEpisode,
}: WatchPageClientProps) {
  const [activeServer, setActiveServer] = useState<string>('Server 1');
  const [isTheatreMode, setIsTheatreMode] = useState<boolean>(false);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isFavLoading, setIsFavLoading] = useState<boolean>(false);

  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  const mins = Math.floor((activeEpisode.duration_seconds || 1440) / 60);
  const posterUrl =
    getR2Url(activeEpisode.thumbnail_key || activeEpisode.thumbnail, 'thumbnail') ||
    getR2Url(seriesDetails?.cover_image_key || seriesDetails?.poster_image_key, 'cover');

  // Auto-scroll page to top & active playing episode into view inside queue
  useEffect(() => {
    // 1. Instantly scroll main browser window to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    // 2. Scroll active playing episode item inside sidebar queue box (without scrolling main window)
    if (activeItemRef.current) {
      const queueListElement = activeItemRef.current.parentElement;
      if (queueListElement) {
        queueListElement.scrollTop = activeItemRef.current.offsetTop - queueListElement.offsetTop;
      }
    }
  }, [activeEpisode.id]);

  // Check if series is in user watchlist
  useEffect(() => {
    if (seriesDetails?.id) {
      fetch(`/api/watchlist?series_id=${seriesDetails.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.inWatchlist === 'boolean') {
            setIsFavorited(data.inWatchlist);
          }
        })
        .catch((err) => console.error('Error checking watchlist status:', err));
    }
  }, [seriesDetails]);

  // Toggle favorite / watchlist
  const handleToggleFavorite = async () => {
    if (!seriesDetails?.id) return;
    setIsFavLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series_id: seriesDetails.id }),
      });
      const data = await res.json();
      if (res.ok && typeof data.inWatchlist === 'boolean') {
        setIsFavorited(data.inWatchlist);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setIsFavLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${isTheatreMode ? styles.theatreContainer : ''}`}>
      <div className="ambient-glow" />

      {/* Breadcrumbs Section */}
      <div className={styles.breadcrumbs}>
        <Link href="/">Home</Link>
        <span className={styles.breadDivider}>/</span>
        <Link href="/categories">Series</Link>
        <span className={styles.breadDivider}>/</span>
        <Link href={`/series/${seriesSlug}`}>{seriesTitle}</Link>
        <span className={styles.breadDivider}>/</span>
        <span className={styles.breadActive}>Episode {activeEpisode.episode_number}</span>
      </div>

      {/* Main Theatre View Grid */}
      <div className={`${styles.playerLayout} ${isTheatreMode ? styles.theatreLayout : ''}`}>
        {/* Left Column: Player, Server & Ep Navigation, Details, Comments */}
        <div className={styles.playerCol}>
          {/* Premium Video Player */}
          <div className={`${styles.videoWrapper} ${isTheatreMode ? styles.theatreVideoWrapper : ''}`}>
            <VideoPlayer
              episodeId={activeEpisode.id}
              videoUrl={getR2Url(activeEpisode.video_key, 'video')}
              title={activeEpisode.title}
              episodeNumber={activeEpisode.episode_number}
              nextEpisodeUrl={nextEpisode ? getEpisodeWatchUrl(nextEpisode.id, nextEpisode.episode_number, seriesSlug) : null}
              onToggleTheater={() => setIsTheatreMode(prev => !prev)}
              posterUrl={posterUrl}
            />
          </div>

          {/* Server Selector & Previous/Next Navigation Row Below Video */}
          <div className={`${styles.serverRow} glass`}>
            <div className={styles.serverChips}>
              {['Server 1'].map((server) => (
                <button
                  key={server}
                  type="button"
                  onClick={() => setActiveServer(server)}
                  className={`${styles.serverChip} ${activeServer === server ? styles.activeServerChip : ''}`}
                >
                  {server}
                </button>
              ))}
            </div>

            <div className={styles.actionButtons}>
              {/* Prev Ep Button */}
              {prevEpisode ? (
                <Link href={getEpisodeWatchUrl(prevEpisode.id, prevEpisode.episode_number, seriesSlug)} className={styles.actionBtn} title="Previous Episode">
                  <ChevronLeft size={16} />
                  <span>Prev Ep</span>
                </Link>
              ) : (
                <button type="button" disabled className={`${styles.actionBtn} ${styles.actionBtnDisabled}`} title="First Episode">
                  <ChevronLeft size={16} />
                  <span>Prev Ep</span>
                </button>
              )}

              {/* Next Ep Button */}
              {nextEpisode ? (
                <Link href={getEpisodeWatchUrl(nextEpisode.id, nextEpisode.episode_number, seriesSlug)} className={styles.actionBtn} title="Next Episode">
                  <span>Next Ep</span>
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <button type="button" disabled className={`${styles.actionBtn} ${styles.actionBtnDisabled}`} title="Latest Episode">
                  <span>Next Ep</span>
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Favorite Button */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={isFavLoading}
                className={`${styles.actionBtn} ${isFavorited ? styles.favoritedBtn : ''}`}
                title={isFavorited ? 'Remove from Watchlist' : 'Add to Favorites'}
              >
                <Heart size={15} fill={isFavorited ? '#ef4444' : 'none'} color={isFavorited ? '#ef4444' : 'currentColor'} />
                <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>
              </button>
            </div>
          </div>

          {/* Episode Info Card */}
          <div className={`${styles.episodeInfoCard} glass`}>
            {isDbEmpty && (
              <span className={styles.dbAlert}>
                💡 Streaming high-quality demo video assets.
              </span>
            )}

            <div className={styles.epHeaderInfo}>
              <span className={styles.epBadge}>Episode {activeEpisode.episode_number}</span>
              {(activeEpisode.title.startsWith('[Preview]') || activeEpisode.title.startsWith('[Trailer]')) && (
                <span className={styles.epBadge} style={{ background: '#3b82f6', color: 'white', fontWeight: 800 }}>
                  PREVIEW / TRAILER
                </span>
              )}
              <h1>Watch {seriesTitle} Episode {activeEpisode.episode_number}: {activeEpisode.title.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '')}</h1>
            </div>

            <div className={styles.epMetaRow}>
              <span className={styles.epMetaItem}>
                Aired On:{' '}
                {activeEpisode.release_date
                  ? new Date(activeEpisode.release_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Jun 2026'}
              </span>
              <span className={styles.epMetaDivider}>•</span>
              <span className={styles.epMetaItem}>Duration: {mins} min</span>
              <span className={styles.epMetaDivider}>•</span>
              <span className={styles.epMetaItem} style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> 1080p Ultra HD
              </span>
            </div>

            {(seriesDetails?.status === 'upcoming' ||
              activeEpisode.title.startsWith('[Preview]') ||
              activeEpisode.title.startsWith('[Trailer]')) && (
              <div className={styles.previewNoticeBox}>
                <span>📢</span>
                <span>
                  Upcoming Episode Preview — This video is an official trailer/preview. The full episode will be released soon!
                </span>
              </div>
            )}

            <p className={styles.epDescription}>
              {activeEpisode.description || 'No summary description available for this episode.'}
            </p>
          </div>

          {/* MOBILE ONLY: Series Quick Info Box & Episodes Queue (Placed DIRECTLY below Description Box) */}
          <div className={styles.mobileOnlySeriesQueueBlock}>
            {seriesDetails && (
              <div className={`${styles.sidebarCard} glass`}>
                <div className={styles.seriesInfoGrid}>
                  <div className={styles.sidebarPosterWrapper}>
                    <Image
                      src={getR2Url(seriesDetails.poster_image_key || seriesDetails.cover_image_key, 'poster')}
                      alt={`Watch ${seriesDetails.title} Hentai online - PlayHentai`}
                      fill
                      sizes="85px"
                      className={styles.sidebarPoster}
                    />
                  </div>
                  <div className={styles.sidebarSeriesMeta}>
                    <Link href={`/series/${seriesSlug}`} className={styles.sidebarSeriesTitle}>
                      {seriesDetails.title}
                    </Link>
                    <div className={styles.sidebarRatingBlock}>
                      <Star size={12} fill="#eab308" color="#eab308" />
                      <span className={styles.sidebarRatingScore}>{(seriesDetails.rating || 9.0).toFixed(1)}</span>
                      <span className={styles.sidebarRatingScale}>/10</span>
                    </div>
                    <div className={styles.sidebarStatus}>
                      <span
                        className={`${styles.statusDot} ${
                          seriesDetails.status === 'airing' ? styles.dotAiring : styles.dotFinalized
                        }`}
                      />
                      <span className={styles.statusText}>{(seriesDetails.status || 'finalized').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.sidebarTags}>
                  {(seriesDetails.tags || []).slice(0, 4).map((tag: string) => (
                    <span key={tag} className={styles.sidebarTag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`${styles.queueCard} glass`}>
              <div className={styles.queueHeader}>
                <Tv size={18} className={styles.sidebarIcon} />
                <h3>Episodes Queue</h3>
                <span className={styles.epCountPill}>{seasonEpisodes.length} Episodes</span>
              </div>

              <div className={styles.queueList}>
                {seasonEpisodes.map((ep) => {
                  const isActive = ep.id === activeEpisode.id;
                  const rawTitle = ep.title || `Episode ${ep.episode_number}`;
                  const cleanEpTitle = rawTitle.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').trim();

                  const displayTitleText = cleanEpTitle.startsWith('Episode') || cleanEpTitle.startsWith('Ep')
                    ? cleanEpTitle
                    : `Episode ${ep.episode_number}: ${cleanEpTitle}`;

                  return (
                    <Link
                      key={ep.id}
                      ref={isActive ? activeItemRef : null}
                      href={getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug)}
                      className={`${styles.queueItem} ${isActive ? styles.activeQueueItem : ''}`}
                    >
                      <div className={styles.queueThumbWrapper}>
                        <Image
                          src={getR2Url(ep.thumbnail_key || seriesDetails?.cover_image_key, 'thumbnail')}
                          alt={`Watch ${seriesDetails.title} Episode ${ep.episode_number} Hentai stream - PlayHentai`}
                          fill
                          sizes="80px"
                          className={styles.queueThumb}
                        />
                        {isActive && (
                          <div className={styles.playingOverlay}>
                            <div className={styles.equalizer}>
                              <span />
                              <span />
                              <span />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.queueMeta}>
                        {isActive && (
                          <span className={styles.queuePlayingBadge}>
                            ▶ PLAYING NOW
                          </span>
                        )}
                        <h4 className={styles.queueEpTitle}>
                          {(ep.title.startsWith('[Preview]') || ep.title.startsWith('[Trailer]')) && (
                            <span style={{ color: '#3b82f6', marginRight: '0.3rem', fontSize: '0.7rem', fontWeight: 800 }}>
                              [PREVIEW]
                            </span>
                          )}
                          {displayTitleText}
                        </h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sponsored Ad Banner: Episode Before Similar Titles (Zone 5986956) */}
          <AdBanner zoneId="5986956" desktopOnly />

          {/* Mobile-Only Banner Before Similar Titles (Zone 5987000) */}
          <AdBanner zoneId="5987000" insClass="eas6a97888e10" mobileOnly />

        </div>

        {/* Right Column: Sidebar (DESKTOP ONLY) */}
        <div className={styles.sidebarColDesktop}>
          
          {/* Series Quick Info Card (FIRST Card in Sidebar) */}
          {seriesDetails && (
            <div className={`${styles.sidebarCard} glass`}>
              <div className={styles.seriesInfoGrid}>
                <div className={styles.sidebarPosterWrapper}>
                  <Image
                    src={getR2Url(seriesDetails.poster_image_key || seriesDetails.cover_image_key, 'poster')}
                    alt={`Watch ${seriesDetails.title} Hentai online - PlayHentai`}
                    fill
                    sizes="85px"
                    className={styles.sidebarPoster}
                  />
                </div>
                <div className={styles.sidebarSeriesMeta}>
                  <Link href={`/series/${seriesSlug}`} className={styles.sidebarSeriesTitle}>
                    {seriesDetails.title}
                  </Link>
                  <div className={styles.sidebarRatingBlock}>
                    <Star size={12} fill="#eab308" color="#eab308" />
                    <span className={styles.sidebarRatingScore}>{(seriesDetails.rating || 9.0).toFixed(1)}</span>
                    <span className={styles.sidebarRatingScale}>/10</span>
                  </div>
                  <div className={styles.sidebarStatus}>
                    <span
                      className={`${styles.statusDot} ${
                        seriesDetails.status === 'airing' ? styles.dotAiring : styles.dotFinalized
                      }`}
                    />
                    <span className={styles.statusText}>{(seriesDetails.status || 'finalized').toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className={styles.sidebarTags}>
                {(seriesDetails.tags || []).slice(0, 4).map((tag: string) => (
                  <span key={tag} className={styles.sidebarTag}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Episode List Queue (SECOND Card in Sidebar) */}
          <div className={`${styles.queueCard} glass`}>
            <div className={styles.queueHeader}>
              <Tv size={18} className={styles.sidebarIcon} />
              <h3>Episodes Queue</h3>
              <span className={styles.epCountPill}>{seasonEpisodes.length} Episodes</span>
            </div>

            <div className={styles.queueList}>
              {seasonEpisodes.map((ep) => {
                const isActive = ep.id === activeEpisode.id;
                const rawTitle = ep.title || `Episode ${ep.episode_number}`;
                const cleanEpTitle = rawTitle.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').trim();

                const displayTitleText = cleanEpTitle.startsWith('Episode') || cleanEpTitle.startsWith('Ep')
                  ? cleanEpTitle
                  : `Episode ${ep.episode_number}: ${cleanEpTitle}`;

                return (
                  <Link
                    key={ep.id}
                    ref={isActive ? activeItemRef : null}
                    href={getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug)}
                    className={`${styles.queueItem} ${isActive ? styles.activeQueueItem : ''}`}
                  >
                    <div className={styles.queueThumbWrapper}>
                      <Image
                        src={getR2Url(ep.thumbnail_key || seriesDetails?.cover_image_key, 'thumbnail')}
                        alt={`Watch ${seriesDetails.title} Episode ${ep.episode_number} Hentai stream - PlayHentai`}
                        fill
                        sizes="80px"
                        className={styles.queueThumb}
                      />
                      {isActive && (
                        <div className={styles.playingOverlay}>
                          <div className={styles.equalizer}>
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.queueMeta}>
                      {isActive && (
                        <span className={styles.queuePlayingBadge}>
                          ▶ PLAYING NOW
                        </span>
                      )}
                      <h4 className={styles.queueEpTitle}>
                        {(ep.title.startsWith('[Preview]') || ep.title.startsWith('[Trailer]')) && (
                          <span style={{ color: '#3b82f6', marginRight: '0.3rem', fontSize: '0.7rem', fontWeight: 800 }}>
                            [PREVIEW]
                          </span>
                        )}
                        {displayTitleText}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Full-Width Bottom Sections Outside playerLayout 2-Column Grid */}
      <div className={styles.watchFullWidthSection}>
        {/* Similar Titles row */}
        {similarSeries.length > 0 && (
          <div className={styles.similarWrapper}>
            <SimilarTitles list={similarSeries} />
          </div>
        )}

        {/* Comments Section */}
        <div className={styles.commentsCard}>
          <CommentSection episodeId={activeEpisode.id} />
        </div>
      </div>
    </div>
  );
}
