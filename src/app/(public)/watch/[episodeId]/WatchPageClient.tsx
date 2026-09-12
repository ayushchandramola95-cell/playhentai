'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Tv, Star, ShieldCheck, ChevronLeft, ChevronRight,
  Share2, AlertTriangle, Lightbulb, Check, X, LayoutGrid, List,
  Calendar, Clock, Film, ChevronDown, ChevronUp, Sparkles, Subtitles,
  ThumbsUp, ThumbsDown, Eye, MessageSquare, Copy
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';
import CommentSection from '@/components/CommentSection/CommentSection';
import SimilarTitles from '@/components/SimilarTitles/SimilarTitles';
import RankedTabWidget from '@/components/RankedTabWidget/RankedTabWidget';
import FavoriteToggle from '@/components/FavoriteToggle/FavoriteToggle';
import RateSeriesButton from '@/components/RateSeriesButton/RateSeriesButton';
import styles from './watch.module.css';

interface WatchPageClientProps {
  activeEpisode: any;
  seasonEpisodes: any[];
  seasonTitle?: string;
  seriesDetails: any;
  seriesTitle: string;
  seriesSlug: string;
  similarSeries: any[];
  popularSeries?: any[];
  newSeries?: any[];
  isDbEmpty: boolean;
  prevEpisode: any;
  nextEpisode: any;
  allSeasons?: any[];
}

const REPORT_REASONS = [
  'Video fails to load / black screen',
  'Audio is out of sync with video',
  'Subtitles are missing or incorrect',
  'Severe buffering / slow stream',
  'Wrong episode or cut off early',
];

export default function WatchPageClient({
  activeEpisode,
  seasonEpisodes,
  seasonTitle,
  seriesDetails,
  seriesTitle,
  seriesSlug,
  similarSeries,
  popularSeries = [],
  newSeries = [],
  isDbEmpty,
  prevEpisode,
  nextEpisode,
  allSeasons = [],
}: WatchPageClientProps) {
  const [isTheatreMode, setIsTheatreMode] = useState<boolean>(false);
  const [isLightsOff, setIsLightsOff] = useState<boolean>(false);
  const [autoplay, setAutoplay] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [queueSearch, setQueueSearch] = useState<string>('');
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState<boolean>(false);

  // Multi-Platform Share Modal state
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [showShareToast, setShowShareToast] = useState<boolean>(false);

  // Report Issue Modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Multi-Season Active Tab state
  const resolvedSeasons = useMemo(() => {
    if (allSeasons && allSeasons.length > 0) return allSeasons;
    if (seriesDetails?.seasons && Array.isArray(seriesDetails.seasons) && seriesDetails.seasons.length > 0) {
      return seriesDetails.seasons;
    }
    return [];
  }, [allSeasons, seriesDetails]);

  const [activeSeasonId, setActiveSeasonId] = useState<string>(
    activeEpisode?.season_id || resolvedSeasons[0]?.id || ''
  );

  // Episodes for active season in queue
  const currentSeasonEpisodes = useMemo(() => {
    if (resolvedSeasons.length > 1 && activeSeasonId) {
      const match = resolvedSeasons.find((s: any) => s.id === activeSeasonId);
      if (match && match.episodes && Array.isArray(match.episodes)) {
        return match.episodes.filter((e: any) => e.is_published !== false);
      }
    }
    return seasonEpisodes;
  }, [resolvedSeasons, activeSeasonId, seasonEpisodes]);

  // Filtered queue episodes
  const filteredEpisodes = useMemo(() => {
    if (!queueSearch.trim()) return currentSeasonEpisodes;
    const query = queueSearch.toLowerCase().trim();
    return currentSeasonEpisodes.filter((ep: any) => {
      const epNum = ep.episode_number?.toString() || '';
      const title = (ep.title || '').toLowerCase();
      return epNum.includes(query) || title.includes(query);
    });
  }, [currentSeasonEpisodes, queueSearch]);

  // Watch progress map
  const [watchProgressMap, setWatchProgressMap] = useState<
    Record<string, { percentage: number; completed: boolean }>
  >({});

  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  const mins = Math.floor((activeEpisode.duration_seconds || 1440) / 60);
  const posterUrl =
    getR2Url(activeEpisode.thumbnail_key || activeEpisode.thumbnail, 'thumbnail') ||
    getR2Url(seriesDetails?.cover_image_key || seriesDetails?.poster_image_key, 'cover');

  // Load Autoplay preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('playhentai_autoplay');
      if (stored !== null) {
        setAutoplay(stored === 'true');
      }
    } catch (_) {}
  }, []);

  const handleToggleAutoplay = () => {
    setAutoplay((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('playhentai_autoplay', nextVal.toString());
      } catch (_) {}
      return nextVal;
    });
  };

  // Load Watch Progress from API & localStorage
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const res = await fetch('/api/watch-history');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.history)) {
            const map: Record<string, { percentage: number; completed: boolean }> = {};
            data.history.forEach((item: any) => {
              if (item.episode_id) {
                map[item.episode_id] = {
                  percentage: item.watched_percentage || 0,
                  completed: item.completed || (item.watched_percentage && item.watched_percentage >= 90),
                };
              }
            });
            setWatchProgressMap(map);
          }
        }
      } catch (_) {}
    };
    loadProgress();
  }, [activeEpisode.id]);

  // Auto-scroll active playing episode into view in queue
  useEffect(() => {
    if (activeItemRef.current) {
      const queueListElement = activeItemRef.current.parentElement;
      if (queueListElement) {
        queueListElement.scrollTop = activeItemRef.current.offsetTop - queueListElement.offsetTop - 50;
      }
    }
  }, [activeEpisode.id, viewMode]);

  // Copy URL with clipboard feedback
  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShareCopied(true);
      setShowShareToast(true);
      setTimeout(() => setShareCopied(false), 3000);
      setTimeout(() => setShowShareToast(false), 2500);
    } catch (_) {
      setShareCopied(true);
      setShowShareToast(true);
      setTimeout(() => setShareCopied(false), 3000);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  // Primary Share Episode handler (Native Web Share first, fallback to clipboard copy)
  const handleShareEpisode = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = `${seriesTitle} - Episode ${activeEpisode.episode_number}`;
    const shareText = `Watch ${seriesTitle} Episode ${activeEpisode.episode_number} on PlayHentai`;

    // 1. Try native Web Share API on mobile / PC (triggers Windows / macOS / Android / iOS native share popup)
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare({ url: shareUrl }))
    ) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // User closed or dismissed the native OS share popup
        if (err?.name === 'AbortError') {
          return;
        }
        console.error('Native share failed, using fallback:', err);
      }
    }

    // 2. Fallback for browsers without Web Share support (e.g. desktop Firefox)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setShowShareToast(true);
        setTimeout(() => setShareCopied(false), 2500);
        setTimeout(() => setShowShareToast(false), 2500);
        return;
      }
    } catch (_) {}

    // 3. Fallback to modal if clipboard is blocked
    setShowShareModal(true);
  };

  // Social share dispatcher
  const handleSocialShare = (platform: 'whatsapp' | 'telegram' | 'twitter' | 'reddit' | 'facebook' | 'native') => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const titleText = `Watch ${seriesTitle} Episode ${activeEpisode.episode_number} on PlayHentai`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${titleText} - ${url}`)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titleText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(titleText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'reddit':
        window.open(`https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(titleText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'native':
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          navigator.share({
            title: titleText,
            text: `Stream ${seriesTitle} Episode ${activeEpisode.episode_number} in 1080p HD`,
            url: url,
          }).catch(() => {});
        }
        break;
    }
  };

  // Report issue handler with real API sync
  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: activeEpisode.id,
          series_id: seriesDetails?.id,
          series_title: seriesTitle,
          series_slug: seriesSlug,
          episode_number: activeEpisode.episode_number,
          reason: selectedReportReason,
          notes: reportNotes,
        }),
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSubmitted(false);
        setReportNotes('');
        setIsSubmittingReport(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setReportSubmitted(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSubmitted(false);
        setIsSubmittingReport(false);
      }, 2000);
    }
  };

  const prevEpUrl = prevEpisode ? getEpisodeWatchUrl(prevEpisode.id, prevEpisode.episode_number, seriesSlug) : null;
  const nextEpUrl = nextEpisode ? getEpisodeWatchUrl(nextEpisode.id, nextEpisode.episode_number, seriesSlug) : null;

  const isUncensored = 
    seriesDetails?.content_rating?.toLowerCase() === 'uncensored' ||
    seriesDetails?.tags?.some((t: string) => t.toLowerCase() === 'uncensored');

  const releaseDateFormatted = activeEpisode.release_date
    ? new Date(activeEpisode.release_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : (seriesDetails?.release_year ? `Year ${seriesDetails.release_year}` : 'Recent');

  const studioName = seriesDetails?.studio || '';
  const displayStudio = studioName ? studioName.split(',')[0].trim() : '';
  // Like / Dislike reactions state (Real data from database)
  const defaultViews = useMemo(() => {
    return activeEpisode.views_count || seriesDetails?.views || seriesDetails?.views_count || 0;
  }, [activeEpisode.views_count, seriesDetails?.views, seriesDetails?.views_count]);

  const defaultLikes = useMemo(() => {
    return activeEpisode.likes_count || 0;
  }, [activeEpisode.likes_count]);

  const defaultDislikes = useMemo(() => {
    return activeEpisode.dislikes_count || 0;
  }, [activeEpisode.dislikes_count]);

  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [likesCount, setLikesCount] = useState<number>(defaultLikes);
  const [dislikesCount, setDislikesCount] = useState<number>(defaultDislikes);

  useEffect(() => {
    setLikesCount(defaultLikes);
    setDislikesCount(defaultDislikes);
    try {
      const stored = localStorage.getItem(`ep_vote_${activeEpisode.id}`);
      if (stored === 'like' || stored === 'dislike') {
        setUserVote(stored);
      } else {
        setUserVote(null);
      }
    } catch (_) {}
  }, [activeEpisode.id, defaultLikes, defaultDislikes]);

  const handleVote = (type: 'like' | 'dislike') => {
    if (userVote === type) {
      setUserVote(null);
      if (type === 'like') setLikesCount((c) => Math.max(0, c - 1));
      else setDislikesCount((c) => Math.max(0, c - 1));
      try {
        localStorage.removeItem(`ep_vote_${activeEpisode.id}`);
      } catch (_) {}
    } else {
      if (userVote === 'like') setLikesCount((c) => Math.max(0, c - 1));
      if (userVote === 'dislike') setDislikesCount((c) => Math.max(0, c - 1));

      if (type === 'like') setLikesCount((c) => c + 1);
      else setDislikesCount((c) => c + 1);

      setUserVote(type);
      try {
        localStorage.setItem(`ep_vote_${activeEpisode.id}`, type);
      } catch (_) {}
    }
  };

  const scrollToComments = () => {
    const el = document.getElementById('comments-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
  };

  return (
    <div className={`${styles.container} ${isTheatreMode ? styles.theatreContainer : ''}`}>
      <div className="ambient-glow" />

      {/* Lights Off / Cinema Mode Backdrop */}
      {isLightsOff && (
        <>
          <div className={styles.lightsOffDimmer} onClick={() => setIsLightsOff(false)} />
          <button
            type="button"
            onClick={() => setIsLightsOff(false)}
            className={styles.lightsOffFloatingBtn}
          >
            <Lightbulb size={18} />
            <span>Turn Lights On</span>
          </button>
        </>
      )}

      {/* Toast Copy Notification */}
      {showShareToast && (
        <div className={styles.toastNotification}>
          <Check size={18} color="#22c55e" />
          <span>Episode link copied to clipboard!</span>
        </div>
      )}

      {/* Multi-Platform Share Modal */}
      {showShareModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalIconBadge}>
                  <Share2 size={18} color="#c084fc" />
                </div>
                <div>
                  <h3 className={styles.modalHeading}>Share Episode</h3>
                  <p className={styles.modalSub}>{seriesTitle} • Ep {activeEpisode.episode_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className={styles.modalCloseBtn}
                aria-label="Close share dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.shareSectionLabel}>Share directly to platforms</p>
              
              <div className={styles.shareSocialGrid}>
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleSocialShare('whatsapp')}
                  className={`${styles.socialShareBtn} ${styles.shareWhatsapp}`}
                  title="Share on WhatsApp"
                >
                  <div className={styles.socialIconWrap}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.056-2.18-.553-1.638-.671-2.712-2.316-2.793-2.424-.082-.108-.669-.89-.669-1.696 0-.806.421-1.201.57-1.362.144-.16.315-.2.42-.2.105 0 .21.002.301.007.096.005.226-.036.353.27.13.314.444 1.08.483 1.159.039.08.065.174.013.278-.052.104-.078.169-.155.26-.078.091-.163.203-.233.273-.078.077-.16.16-.068.318.092.158.409.673.876 1.09 1.107 1.008 1.942 1.34 2.197 1.458.204.095.324.08.446-.059.122-.139.524-.608.664-.816.14-.208.28-.174.471-.104.191.07 1.214.573 1.423.678.21.105.35.157.402.244.053.087.053.504-.091.909z" />
                    </svg>
                  </div>
                  <span>WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={() => handleSocialShare('telegram')}
                  className={`${styles.socialShareBtn} ${styles.shareTelegram}`}
                  title="Share on Telegram"
                >
                  <div className={styles.socialIconWrap}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                  <span>Telegram</span>
                </button>

                {/* X (Twitter) */}
                <button
                  type="button"
                  onClick={() => handleSocialShare('twitter')}
                  className={`${styles.socialShareBtn} ${styles.shareTwitter}`}
                  title="Share on X (Twitter)"
                >
                  <div className={styles.socialIconWrap}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span>X (Twitter)</span>
                </button>

                {/* Reddit */}
                <button
                  type="button"
                  onClick={() => handleSocialShare('reddit')}
                  className={`${styles.socialShareBtn} ${styles.shareReddit}`}
                  title="Share on Reddit"
                >
                  <div className={styles.socialIconWrap}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm5.748-11.455a1.47 1.47 0 00-1.428-.973c-.41 0-.784.172-1.05.451-1.077-.738-2.526-1.21-4.137-1.267l.707-3.324 2.308.491a1.243 1.243 0 101.3-.804l-2.684-.572a.31.31 0 00-.363.238l-.837 3.939c-1.66.046-3.153.522-4.253 1.272a1.488 1.488 0 00-1.078-.474 1.47 1.47 0 00-1.47 1.47c0 .546.299 1.021.742 1.272-.03.208-.046.42-.046.634 0 3.018 3.323 5.465 7.424 5.465 4.1 0 7.423-2.447 7.423-5.465 0-.213-.016-.424-.045-.631a1.464 1.464 0 00.704-1.246 1.47 1.47 0 00-1.47-1.47zm-8.89 2.502a1.054 1.054 0 112.108 0 1.054 1.054 0 01-2.108 0zm6.284 3.385c-.65.65-1.874.966-3.142.966-1.269 0-2.493-.316-3.143-.966a.315.315 0 01.446-.446c.49.49 1.493.752 2.697.752 1.203 0 2.206-.262 2.696-.752a.315.315 0 11.446.446zm-.492-2.331a1.054 1.054 0 112.108 0 1.054 1.054 0 01-2.108 0z" />
                    </svg>
                  </div>
                  <span>Reddit</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => handleSocialShare('facebook')}
                  className={`${styles.socialShareBtn} ${styles.shareFacebook}`}
                  title="Share on Facebook"
                >
                  <div className={styles.socialIconWrap}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span>Facebook</span>
                </button>

                {/* Native Mobile/Tablet Share */}
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    onClick={() => handleSocialShare('native')}
                    className={`${styles.socialShareBtn} ${styles.shareNative}`}
                    title="More Share Options"
                  >
                    <div className={styles.socialIconWrap}>
                      <Share2 size={18} color="#ffffff" />
                    </div>
                    <span>More Options</span>
                  </button>
                )}
              </div>

              {/* Direct Link Copy Bar */}
              <div className={styles.shareUrlSection}>
                <span className={styles.shareSectionLabel}>Or copy episode link</span>
                <div className={styles.shareUrlBox}>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    className={styles.shareUrlInput}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`${styles.shareCopyBtn} ${shareCopied ? styles.shareCopyBtnSuccess : ''}`}
                    title="Copy to clipboard"
                  >
                    {shareCopied ? (
                      <>
                        <Check size={15} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmittingReport && setShowReportModal(false)}>
          <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalIconBadgeAlert}>
                  <AlertTriangle size={18} color="#f59e0b" />
                </div>
                <div>
                  <h3 className={styles.modalHeading}>Report Playback Issue</h3>
                  <p className={styles.modalSub}>{seriesTitle} • Ep {activeEpisode.episode_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className={styles.modalCloseBtn}
                aria-label="Close report dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {reportSubmitted ? (
                <div className={styles.reportSuccessBox}>
                  <div className={styles.reportSuccessIcon}>
                    <Check size={32} color="#22c55e" />
                  </div>
                  <h4>Report Successfully Logged</h4>
                  <p>Our team has logged this issue for quick investigation. Thank you for helping keep PlayHentai running smoothly!</p>
                </div>
              ) : (
                <>
                  <p className={styles.reportInstruction}>
                    Having playback or stream issues? Select the reason below:
                  </p>
                  <div className={styles.reportReasonsList}>
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className={`${styles.reportReasonOption} ${selectedReportReason === reason ? styles.selectedReportReason : ''}`}
                      >
                        <input
                          type="radio"
                          name="report_reason"
                          checked={selectedReportReason === reason}
                          onChange={() => setSelectedReportReason(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className={styles.reportNotesSection}>
                    <label htmlFor="reportNotesInput" className={styles.reportNotesLabel}>
                      Additional details / timestamps (optional):
                    </label>
                    <textarea
                      id="reportNotesInput"
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="e.g., Video freezes at 14:20, or audio is missing..."
                      className={styles.reportTextarea}
                      rows={3}
                    />
                  </div>

                  <div className={styles.reportModalActions}>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className={styles.reportCancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      disabled={isSubmittingReport}
                      className={styles.reportSubmitBtn}
                    >
                      {isSubmittingReport ? 'Submitting...' : 'Submit Issue Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
        
        {/* Left Column: Player, Server & Ep Navigation, Details */}
        <div className={styles.playerCol}>
          {/* Ambient Video Glow Halo */}
          <div className={styles.ambientPlayerGlow} />

          {/* Premium Video Player */}
          <div className={`${styles.videoWrapper} ${isTheatreMode ? styles.theatreVideoWrapper : ''} ${isLightsOff ? styles.elevatedForLightsOff : ''}`}>
            <VideoPlayer
              episodeId={activeEpisode.id}
              videoUrl={getR2Url(activeEpisode.video_key, 'video')}
              title={activeEpisode.title}
              episodeNumber={activeEpisode.episode_number}
              nextEpisodeUrl={nextEpUrl}
              prevEpisodeUrl={prevEpUrl}
              onToggleTheater={() => setIsTheatreMode(prev => !prev)}
              isLightsOff={isLightsOff}
              onToggleCinema={() => setIsLightsOff(prev => !prev)}
              posterUrl={posterUrl}
              autoplay={autoplay}
              onToggleAutoplay={handleToggleAutoplay}
            />
          </div>

          {/* Flanking Prev & Next Navigation Directly Below Video Box */}
          <div className={styles.episodeNavRow}>
            {prevEpisode ? (
              <Link href={prevEpUrl!} className={styles.episodeNavBtn} title="Previous Episode (P)">
                <ChevronLeft size={16} className={styles.navIconLeft} />
                <span>Prev Episode</span>
              </Link>
            ) : (
              <div className={`${styles.episodeNavBtn} ${styles.episodeNavBtnDisabled}`}>
                <ChevronLeft size={16} className={styles.navIconLeft} />
                <span>Prev Episode</span>
              </div>
            )}

            {nextEpisode ? (
              <Link href={nextEpUrl!} className={styles.episodeNavBtn} title="Next Episode (N)">
                <span>Next Episode</span>
                <ChevronRight size={16} className={styles.navIconRight} />
              </Link>
            ) : (
              <div className={`${styles.episodeNavBtn} ${styles.episodeNavBtnDisabled}`}>
                <span>Next Episode</span>
                <ChevronRight size={16} className={styles.navIconRight} />
              </div>
            )}
          </div>

          {/* Episode Header & Action Dock Card */}
          <div className={styles.episodeHeaderCard}>
            {isDbEmpty && (
              <span className={styles.dbAlert}>
                💡 Streaming high-quality demo video assets.
              </span>
            )}

            {(() => {
              const sName = (seasonTitle || '').trim();
              const isOva = /ova/i.test(sName);
              const isSpecial = /special/i.test(sName);
              const epLabel = isOva ? `OVA ${activeEpisode.episode_number}` : isSpecial ? `Special ${activeEpisode.episode_number}` : `Episode ${activeEpisode.episode_number}`;
              const rawTitle = (activeEpisode.title || '').replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').trim();

              const isGenericTitle = !rawTitle || 
                new RegExp(`^episode\\s*${activeEpisode.episode_number}$`, 'i').test(rawTitle) ||
                new RegExp(`^ova\\s*${activeEpisode.episode_number}$`, 'i').test(rawTitle) ||
                rawTitle.toLowerCase() === epLabel.toLowerCase();

              const displayTitle = isGenericTitle
                ? `Watch ${seriesTitle} ${isOva && !seriesTitle.toLowerCase().includes('ova') ? 'OVA ' : ''}${epLabel}`
                : `Watch ${seriesTitle} ${isOva && !seriesTitle.toLowerCase().includes('ova') ? 'OVA ' : ''}${epLabel}: ${rawTitle}`;

              return (
                <div className={styles.epHeaderInfo}>
                  <div className={styles.epBadgesGroup}>
                    <span className={styles.epBadge}>{epLabel}</span>
                    {(activeEpisode.title?.startsWith('[Preview]') || activeEpisode.title?.startsWith('[Trailer]')) && (
                      <span className={`${styles.epBadge} ${styles.epBadgePreview}`}>
                        PREVIEW / TRAILER
                      </span>
                    )}
                    {sName && !/^season\s*1$/i.test(sName) && (
                      <span className={`${styles.epBadge} ${styles.epBadgeSeason}`}>
                        {sName}
                      </span>
                    )}
                  </div>
                  <h1 className={styles.epTitle}>{displayTitle}</h1>

                  {/* Social Proof & Stats Bar */}
                  <div className={styles.epStatsRow}>
                    <span className={styles.statItem} title="Total Views">
                      <Eye size={14} className={styles.statIcon} />
                      <span>{formatCount(defaultViews)} Views</span>
                    </span>

                    <span className={styles.statDivider}>•</span>

                    <span className={styles.statItem} title="Release Date">
                      <Calendar size={13} className={styles.statIcon} />
                      <span>{releaseDateFormatted}</span>
                    </span>

                    <span className={styles.statDivider}>•</span>

                    <span className={styles.statItem} title="Duration">
                      <Clock size={13} className={styles.statIcon} />
                      <span>{mins} min</span>
                    </span>

                    <span className={styles.statDivider}>•</span>

                    <span className={`${styles.statItem} ${styles.statItemHd}`} title="Resolution">
                      <ShieldCheck size={13} />
                      <span>1080p Ultra HD</span>
                    </span>

                    <span className={styles.statDivider}>•</span>

                    <button
                      type="button"
                      onClick={scrollToComments}
                      className={styles.statCommentBtn}
                      title="Jump to Discussion"
                    >
                      <MessageSquare size={13} />
                      <span>Discussion</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Action Bar with Like/Dislike + Action Tools */}
            <div className={`${styles.actionBarRow} ${isLightsOff ? styles.elevatedForLightsOff : ''}`}>
              {/* Like / Dislike Pill */}
              <div className={styles.likeDislikeGroup}>
                <button
                  type="button"
                  onClick={() => handleVote('like')}
                  className={`${styles.voteBtn} ${styles.likeBtn} ${userVote === 'like' ? styles.voteActiveLike : ''}`}
                  title="Like this episode"
                >
                  <ThumbsUp size={15} />
                  <span>{formatCount(likesCount)}</span>
                </button>

                <div className={styles.voteDivider} />

                <button
                  type="button"
                  onClick={() => handleVote('dislike')}
                  className={`${styles.voteBtn} ${styles.dislikeBtn} ${userVote === 'dislike' ? styles.voteActiveDislike : ''}`}
                  title="Dislike this episode"
                >
                  <ThumbsDown size={15} />
                  <span>{formatCount(dislikesCount)}</span>
                </button>
              </div>

              {/* Utility Tools */}
              <div className={styles.actionToolsGroup}>
                {/* Favorite Toggle */}
                {seriesDetails?.id && (
                  <FavoriteToggle seriesId={seriesDetails.id} variant="player" />
                )}

                {/* Share Episode (Native OS Share with Fallback) */}
                <button
                  type="button"
                  onClick={handleShareEpisode}
                  className={`${styles.actionBtn} ${styles.actionBtnShare} ${shareCopied ? styles.actionBtnCopied : ''}`}
                  title={shareCopied ? 'Episode link copied!' : 'Share Episode'}
                  aria-label={shareCopied ? 'Link copied to clipboard' : 'Share Episode'}
                >
                  {shareCopied ? (
                    <>
                      <Check size={15} color="#4ade80" />
                      <span style={{ color: '#4ade80' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={15} />
                      <span>Share</span>
                    </>
                  )}
                </button>

                {/* Direct Rating Button */}
                {seriesDetails?.id && (
                  <RateSeriesButton
                    seriesId={seriesDetails.id}
                    seriesTitle={seriesTitle}
                    variant="compact"
                  />
                )}

                {/* Report Issue */}
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className={`${styles.actionBtn} ${styles.actionBtnReport}`}
                  title="Report Playback Issue"
                >
                  <AlertTriangle size={15} />
                  <span>Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visual Series & Episode Details Card (Poster on Left + Full Info on Right) */}
          <div className={styles.seriesVisualCard}>
            {/* Left: Poster Visual Art with CEN/UNCEN Badge */}
            {seriesDetails && (
              <div className={styles.detailPosterCol}>
                <Link href={`/series/${seriesSlug}`} className={styles.detailPosterLink} title={`View all episodes of ${seriesDetails.title}`}>
                  <div className={styles.detailPosterWrapper}>
                    <Image
                      src={getR2Url(seriesDetails.poster_image_key || seriesDetails.cover_image_key, 'poster')}
                      alt={`Watch ${seriesDetails.title} Hentai online - PlayHentai`}
                      fill
                      sizes="(max-width: 768px) 90px, 120px"
                      className={styles.detailPosterImg}
                    />
                    <span className={`${styles.posterRatingBadge} ${isUncensored ? styles.badgeUncen : styles.badgeCen}`}>
                      {isUncensored ? 'UNCEN' : 'CEN'}
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {/* Right: Series Meta, Tags & Episode Synopsis */}
            <div className={styles.detailContentCol}>
              {/* Series Title & Quick Stats */}
              <div className={styles.seriesTitleRow}>
                <Link href={`/series/${seriesSlug}`} className={styles.seriesTitleLink}>
                  {seriesDetails?.title || seriesTitle}
                </Link>

                <div className={styles.seriesMetaGroup}>
                  {seriesDetails?.rating && (
                    <div className={styles.ratingBadge}>
                      <Star size={12} fill="#eab308" color="#eab308" />
                      <span>{(seriesDetails.rating || 9.0).toFixed(1)}</span>
                    </div>
                  )}
                  {seriesDetails?.release_year && (
                    <span className={styles.yearBadge}>{seriesDetails.release_year}</span>
                  )}
                  <span className={styles.statusBadge}>
                    {(seriesDetails?.status || 'finalized').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Taxonomy: Subbed, Studio & Tags */}
              <div className={styles.detailTaxonomyRow}>
                <span className={`${styles.metaPill} ${styles.metaPillPrimary}`}>
                  <Subtitles size={13} />
                  <span>Subbed</span>
                </span>

                {displayStudio && (
                  <Link href={`/browse?studio=${encodeURIComponent(displayStudio)}`} className={styles.studioLink}>
                    <Film size={13} />
                    <span>Studio: <strong>{displayStudio}</strong></span>
                  </Link>
                )}

                <div className={styles.taxTagsList}>
                  {(seriesDetails?.tags || []).slice(0, 6).map((tag: string) => (
                    <Link key={tag} href={`/browse?tag=${encodeURIComponent(tag)}`} className={styles.taxTagChip}>
                      <span className={styles.tagHash}>#</span>
                      <span>{tag}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {(seriesDetails?.status === 'upcoming' ||
                activeEpisode.title?.startsWith('[Preview]') ||
                activeEpisode.title?.startsWith('[Trailer]')) && (
                <div className={styles.previewNoticeBox}>
                  <span>📢</span>
                  <span>
                    Upcoming Episode Preview — This video is an official trailer/preview. The full episode will be released soon!
                  </span>
                </div>
              )}

              {/* Episode Synopsis */}
              <div className={styles.synopsisWrapper}>
                <p className={`${styles.epDescription} ${!isSynopsisExpanded ? styles.epDescriptionCollapsed : ''}`}>
                  <strong className={styles.synopsisEpPrefix}>Episode {activeEpisode.episode_number}: </strong>
                  {activeEpisode.description || seriesDetails?.description || 'No summary description available for this episode.'}
                </p>
                {(activeEpisode.description?.length > 160 || seriesDetails?.description?.length > 160) && (
                  <button
                    type="button"
                    onClick={() => setIsSynopsisExpanded(prev => !prev)}
                    className={styles.readMoreBtn}
                  >
                    <span>{isSynopsisExpanded ? 'Show Less' : 'Read More'}</span>
                    {isSynopsisExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE ONLY: Episodes Queue (Placed directly below series card for quick access) */}
          <div className={styles.mobileOnlyQueueCard}>
            <div className={styles.queueCard}>
              <div className={styles.queueHeader}>
                <Tv size={16} className={styles.sidebarIcon} />
                <h3>Episodes Queue</h3>
                <div className={styles.queueHeaderControls}>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`${styles.viewModeToggleBtn} ${viewMode === 'list' ? styles.viewModeActive : ''}`}
                    aria-label="List View"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`${styles.viewModeToggleBtn} ${viewMode === 'grid' ? styles.viewModeActive : ''}`}
                    aria-label="Grid View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <span className={styles.epCountPill}>{filteredEpisodes.length} Eps</span>
                </div>
              </div>

              {/* Multi-Season Tabs */}
              {resolvedSeasons.length > 1 && (
                <div className={styles.seasonTabsRow}>
                  {resolvedSeasons.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSeasonId(s.id)}
                      className={`${styles.seasonTab} ${activeSeasonId === s.id ? styles.activeSeasonTab : ''}`}
                    >
                      {s.title || `Season ${s.season_number}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Search Filter if > 4 Episodes */}
              {currentSeasonEpisodes.length > 4 && (
                <div className={styles.queueSearchRow}>
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder="Search episodes..."
                    className={styles.queueSearchInput}
                  />
                </div>
              )}

              {viewMode === 'list' ? (
                <div className={styles.queueList}>
                  {filteredEpisodes.map((ep: any) => {
                    const isActive = ep.id === activeEpisode.id;
                    const rawTitle = ep.title || `Episode ${ep.episode_number}`;
                    const cleanEpTitle = rawTitle.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').trim();
                    const displayTitleText = cleanEpTitle.startsWith('Episode') || cleanEpTitle.startsWith('Ep')
                      ? cleanEpTitle
                      : `Episode ${ep.episode_number}: ${cleanEpTitle}`;
                    const progressInfo = watchProgressMap[ep.id];

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
                          {progressInfo && progressInfo.percentage > 0 && (
                            <div className={styles.queueProgressBar}>
                              <div
                                className={styles.queueProgressFill}
                                style={{ width: `${Math.min(100, progressInfo.percentage)}%` }}
                              />
                            </div>
                          )}
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
                            {(ep.title?.startsWith('[Preview]') || ep.title?.startsWith('[Trailer]')) && (
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
              ) : (
                <div className={styles.queueGrid}>
                  {filteredEpisodes.map((ep: any) => {
                    const isActive = ep.id === activeEpisode.id;
                    const progressInfo = watchProgressMap[ep.id];
                    return (
                      <Link
                        key={ep.id}
                        ref={isActive ? activeItemRef : null}
                        href={getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug)}
                        className={`${styles.gridEpBtn} ${isActive ? styles.activeGridEpBtn : ''}`}
                        title={`Episode ${ep.episode_number}: ${ep.title || ''}`}
                      >
                        <span>{ep.episode_number}</span>
                        {progressInfo?.completed && <span className={styles.gridWatchedDot} />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Similar Titles Carousel */}
          {similarSeries.length > 0 && (
            <SimilarTitles list={similarSeries} />
          )}

          {/* MOBILE ONLY: Popular / New Ranked List */}
          <div className={styles.mobileOnlyRankedBlock}>
            <RankedTabWidget
              popularList={popularSeries}
              newList={newSeries}
              maxItems={5}
            />
          </div>

        </div>

        {/* Right Column: Sidebar (DESKTOP ONLY) */}
        <div className={styles.sidebarColDesktop}>

          {/* Episode List Queue (FIRST Card in Sidebar) */}
          <div className={styles.queueCard}>
            <div className={styles.queueHeader}>
              <Tv size={18} className={styles.sidebarIcon} />
              <h3>Episodes Queue</h3>
              <div className={styles.queueHeaderControls}>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`${styles.viewModeToggleBtn} ${viewMode === 'list' ? styles.viewModeActive : ''}`}
                  aria-label="List View"
                  title="Detailed List View"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`${styles.viewModeToggleBtn} ${viewMode === 'grid' ? styles.viewModeActive : ''}`}
                  aria-label="Grid View"
                  title="Numbered Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
                <span className={styles.epCountPill}>{filteredEpisodes.length} Eps</span>
              </div>
            </div>

            {/* Multi-Season Tabs */}
            {resolvedSeasons.length > 1 && (
              <div className={styles.seasonTabsRow}>
                {resolvedSeasons.map((s: any) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSeasonId(s.id)}
                    className={`${styles.seasonTab} ${activeSeasonId === s.id ? styles.activeSeasonTab : ''}`}
                  >
                    {s.title || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>
            )}

            {/* Search Filter if > 4 Episodes */}
            {currentSeasonEpisodes.length > 4 && (
              <div className={styles.queueSearchRow}>
                <input
                  type="text"
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Search episodes..."
                  className={styles.queueSearchInput}
                />
              </div>
            )}

            {viewMode === 'list' ? (
              <div className={styles.queueList}>
                {filteredEpisodes.map((ep: any) => {
                  const isActive = ep.id === activeEpisode.id;
                  const rawTitle = ep.title || `Episode ${ep.episode_number}`;
                  const cleanEpTitle = rawTitle.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '').trim();
                  const displayTitleText = cleanEpTitle.startsWith('Episode') || cleanEpTitle.startsWith('Ep')
                    ? cleanEpTitle
                    : `Episode ${ep.episode_number}: ${cleanEpTitle}`;
                  const progressInfo = watchProgressMap[ep.id];

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
                        {progressInfo && progressInfo.percentage > 0 && (
                          <div className={styles.queueProgressBar}>
                            <div
                              className={styles.queueProgressFill}
                              style={{ width: `${Math.min(100, progressInfo.percentage)}%` }}
                            />
                          </div>
                        )}
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
                          {(ep.title?.startsWith('[Preview]') || ep.title?.startsWith('[Trailer]')) && (
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
            ) : (
              <div className={styles.queueGrid}>
                {filteredEpisodes.map((ep: any) => {
                  const isActive = ep.id === activeEpisode.id;
                  const progressInfo = watchProgressMap[ep.id];
                  return (
                    <Link
                      key={ep.id}
                      ref={isActive ? activeItemRef : null}
                      href={getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug)}
                      className={`${styles.gridEpBtn} ${isActive ? styles.activeGridEpBtn : ''}`}
                      title={`Episode ${ep.episode_number}: ${ep.title || ''}`}
                    >
                      <span>{ep.episode_number}</span>
                      {progressInfo?.completed && <span className={styles.gridWatchedDot} />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* POPULAR / NEW Ranked List Sidebar Widget (SECOND Card in Sidebar) */}
          <RankedTabWidget
            popularList={popularSeries}
            newList={newSeries}
            maxItems={10}
          />

        </div>
      </div>

      {/* Full-Width Bottom Sections Outside playerLayout 2-Column Grid */}
      <div className={styles.watchFullWidthSection}>
        {/* Comments Section */}
        <div id="comments-section" className={styles.commentsCard}>
          <CommentSection episodeId={activeEpisode.id} />
        </div>
      </div>
    </div>
  );
}
