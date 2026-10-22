'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Layout, RotateCcw, RotateCw,
  HelpCircle, X, Clock, Keyboard, Lightbulb, PictureInPicture,
  Sliders, Check, AlertCircle, RefreshCw, ChevronRight, ChevronLeft
} from 'lucide-react';
import styles from './VideoPlayer.module.css';
import { getR2Url } from '@/utils/r2';
import { parseSubtitleText, findActiveCue, SubtitleCue } from '@/utils/subtitleParser';

interface VideoPlayerProps {
  episodeId: string;
  videoUrl: string;
  title: string;
  episodeNumber: number;
  nextEpisodeUrl?: string | null;
  prevEpisodeUrl?: string | null;
  onToggleTheater?: () => void;
  isTheaterMode?: boolean;
  isLightsOff?: boolean;
  onToggleCinema?: () => void;
  posterUrl?: string;
  autoplay?: boolean;
  onToggleAutoplay?: () => void;
  storyboard?: any;
  videoQualities?: any;
  subtitleUrl?: string | null;
}

export default function VideoPlayer({
  episodeId,
  videoUrl,
  title,
  episodeNumber,
  nextEpisodeUrl,
  prevEpisodeUrl,
  onToggleTheater,
  isTheaterMode,
  isLightsOff = false,
  onToggleCinema,
  posterUrl,
  autoplay = true,
  onToggleAutoplay,
  storyboard,
  videoQualities,
  subtitleUrl,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(isTheaterMode ?? false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isPip, setIsPip] = useState(false);

  // Buffer progress ahead
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);

  // Settings Menu Popup State (Image 2)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'captions' | 'quality' | 'speed' | 'server'>('main');
  const [selectedServer, setSelectedServer] = useState<'CDN 1' | 'CDN 2'>('CDN 1');
  const [fallbackServerEnabled, setFallbackServerEnabled] = useState<boolean>(true);
  const settingsContainerRef = useRef<HTMLDivElement>(null);

  // Multi-Quality state management
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>(videoUrl);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const wasPlayingBeforeSwitchRef = useRef<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Available qualities mapping
  const availableQualities = useMemo(() => {
    const list: Array<{ label: string; keyName: string; url: string; subtext: string }> = [];
    const qMap = videoQualities || {};

    // 1080p (Master)
    const rawUrl1080 = qMap['1080p']?.url || (qMap['1080p']?.key ? getR2Url(qMap['1080p'].key, 'video') : null) || videoUrl;
    const url1080 = getR2Url(rawUrl1080, 'video');
    list.push({ label: '1080p', keyName: '1080p', url: url1080, subtext: 'Full HD Master' });

    // 720p (HD)
    const rawUrl720 = qMap['720p']?.url || (qMap['720p']?.key ? getR2Url(qMap['720p'].key, 'video') : null);
    if (rawUrl720) {
      list.push({ label: '720p', keyName: '720p', url: getR2Url(rawUrl720, 'video'), subtext: 'HD Quality' });
    }

    // 480p (SD Mobile)
    const rawUrl480 = qMap['480p']?.url || (qMap['480p']?.key ? getR2Url(qMap['480p'].key, 'video') : null);
    if (rawUrl480) {
      list.push({ label: '480p', keyName: '480p', url: getR2Url(rawUrl480, 'video'), subtext: 'Data Saver SD' });
    }

    return list;
  }, [videoQualities, videoUrl]);

  // Sync videoUrl or preferred quality when episode changes
  useEffect(() => {
    try {
      const savedQuality = localStorage.getItem('player-preferred-quality');
      const match = availableQualities.find((q) => q.keyName === savedQuality);
      if (match) {
        setSelectedQuality(match.keyName);
        setCurrentVideoSrc(match.url);
        return;
      }
    } catch (_) {}

    setSelectedQuality('1080p');
    setCurrentVideoSrc(videoUrl);
  }, [videoUrl, availableQualities]);

  const handleQualityChange = (targetKeyName: string) => {
    const match = availableQualities.find((q) => q.keyName === targetKeyName);
    if (!match || match.keyName === selectedQuality) {
      setSettingsView('main');
      return;
    }

    if (videoRef.current) {
      pendingSeekTimeRef.current = videoRef.current.currentTime;
      wasPlayingBeforeSwitchRef.current = !videoRef.current.paused;
    }

    setSelectedQuality(match.keyName);
    setCurrentVideoSrc(match.url);
    setSettingsView('main');

    try {
      localStorage.setItem('player-preferred-quality', match.keyName);
    } catch (_) {}
  };

  useEffect(() => {
    if (isTheaterMode !== undefined) {
      setIsTheater(isTheaterMode);
    }
  }, [isTheaterMode]);

  // Hydrate persistent volume and mute preferences from localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem('player-volume');
      const savedMute = localStorage.getItem('player-muted');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          setVolume(v);
          if (videoRef.current) videoRef.current.volume = v;
        }
      }
      if (savedMute !== null) {
        const m = savedMute === 'true';
        setIsMuted(m);
        if (videoRef.current) videoRef.current.muted = m;
      }
    } catch (_) {}
  }, []);

  // Sync Picture-in-Picture state with browser window
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  // Separate English Subtitles (Closed Captions) State Management
  const hasSubtitles = Boolean(subtitleUrl && subtitleUrl.trim() !== '');
  const [isCcActive, setIsCcActive] = useState<boolean>(true);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);

  // Hydrate persistent CC on/off preference
  useEffect(() => {
    try {
      const savedCc = localStorage.getItem('hentai_player_cc');
      if (savedCc !== null) {
        setIsCcActive(savedCc === 'true');
      }
    } catch (_) {}
  }, []);

  const toggleCc = () => {
    setIsCcActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hentai_player_cc', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Track buffered/downloaded ranges ahead for seekbar indicator
  const updateBufferedProgress = () => {
    const v = videoRef.current;
    if (!v || !v.duration || v.duration === 0) return;
    const buf = v.buffered;
    const cur = v.currentTime;
    let currentBufferEnd = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf.start(i) <= cur && cur <= buf.end(i)) {
        currentBufferEnd = buf.end(i);
        break;
      }
    }
    if (currentBufferEnd === 0 && buf.length > 0) {
      for (let i = 0; i < buf.length; i++) {
        if (buf.end(i) > currentBufferEnd) {
          currentBufferEnd = buf.end(i);
        }
      }
    }
    const pct = Math.min(100, Math.max(0, (currentBufferEnd / v.duration) * 100));
    setBufferedPercent(pct);
  };

  // Close Settings menu when clicking outside anywhere on document
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        settingsContainerRef.current &&
        !settingsContainerRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
        setSettingsView('main');
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [isSettingsOpen]);

  // Fetch & parse subtitle file when subtitleUrl changes
  useEffect(() => {
    if (!subtitleUrl || subtitleUrl.trim() === '') {
      setSubtitleCues([]);
      return;
    }

    let isMounted = true;
    const fetchSubtitles = async () => {
      try {
        // Attempt direct fetch first
        let res = await fetch(subtitleUrl);
        if (!res.ok) {
          res = await fetch(`/api/subtitles/proxy?url=${encodeURIComponent(subtitleUrl)}`);
        }
        if (res.ok) {
          const text = await res.text();
          if (isMounted) {
            setSubtitleCues(parseSubtitleText(text));
          }
        }
      } catch {
        // Fallback to internal proxy if browser CORS blocks external asset
        try {
          const proxyRes = await fetch(`/api/subtitles/proxy?url=${encodeURIComponent(subtitleUrl)}`);
          if (proxyRes.ok && isMounted) {
            const text = await proxyRes.text();
            setSubtitleCues(parseSubtitleText(text));
          }
        } catch (proxyErr) {
          console.warn('[VideoPlayer] Failed to load subtitles:', proxyErr);
        }
      }
    };

    fetchSubtitles();
    return () => {
      isMounted = false;
    };
  }, [subtitleUrl]);

  // Active Subtitle Cue for Current Playback Time
  const activeCue = useMemo(() => {
    if (!hasSubtitles || !isCcActive || subtitleCues.length === 0) return null;
    return findActiveCue(subtitleCues, currentTime);
  }, [hasSubtitles, isCcActive, subtitleCues, currentTime]);

  // Resume prompt state
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Hover seekbar scrub & in-memory canvas cache states
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hoverTooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeTextRef = useRef<HTMLSpanElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const storyboardLayerRef = useRef<HTMLDivElement>(null);

  // In-memory Canvas Frame Cache (key: snapped second, value: 160x90 canvas snapshot)
  const frameCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [hasCachedFrame, setHasCachedFrame] = useState(false);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);

  const isSeekingRef = useRef<boolean>(false);
  const pendingSeekRef = useRef<number | null>(null);
  const lastSnappedSecRef = useRef<number>(-1);
  const lastCapturedPlaySecRef = useRef<number>(-1);
  const seekDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for custom seekToTime event (e.g. from clickable timestamp comments)
  useEffect(() => {
    const handleCustomSeek = (e: any) => {
      const targetTime = e.detail?.time;
      if (typeof targetTime === 'number' && videoRef.current) {
        const clamped = Math.max(0, Math.min(duration || 10000, targetTime));
        videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
        setHasStartedPlaying(true);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    window.addEventListener('seekToTime', handleCustomSeek as EventListener);
    return () => {
      window.removeEventListener('seekToTime', handleCustomSeek as EventListener);
    };
  }, [duration]);

  // Autoplay countdown state
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewLoggedRef = useRef(false);
  const hasPrefetchedNextRef = useRef(false);

  // Reload video element on URL change; reset state and clear frame memory cache
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowResumePrompt(false);
    setResumeTime(null);
    setAutoplayCountdown(null);
    viewLoggedRef.current = false;
    hasPrefetchedNextRef.current = false;

    // Reset frame cache & seek throttling
    frameCacheRef.current.clear();
    lastSnappedSecRef.current = -1;
    lastCapturedPlaySecRef.current = -1;
    setPreviewFrameReady(false);
    setHasCachedFrame(false);
    if (seekDebounceTimerRef.current) {
      clearTimeout(seekDebounceTimerRef.current);
    }
    if (displayCanvasRef.current) {
      const ctx = displayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, 160, 90);
    }

    setHasStartedPlaying(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [episodeId, videoUrl]);

  // Clean up seek debounce timer on unmount
  useEffect(() => {
    return () => {
      if (seekDebounceTimerRef.current) {
        clearTimeout(seekDebounceTimerRef.current);
      }
    };
  }, []);

  // Autoplay countdown timer effect
  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown <= 0) {
      if (nextEpisodeUrl) {
        router.push(nextEpisodeUrl);
      }
      setAutoplayCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setAutoplayCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoplayCountdown, nextEpisodeUrl, router]);



  const playMainVideo = () => {
    if (videoRef.current) {
      setHasStartedPlaying(true);
      setPlaybackError(null);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Playback error:', err);
        if (currentVideoSrc && currentVideoSrc.includes('dmfrlqgigpmty.cloudfront.net')) {
          const fallback = currentVideoSrc.replace('dmfrlqgigpmty.cloudfront.net', 'media.hentaikage.cc');
          console.log('[VideoPlayer] Retrying with media.hentaikage.cc:', fallback);
          setCurrentVideoSrc(fallback);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }, 300);
        } else {
          handleVideoError();
        }
      });
    }
  };

  // ─── Progress sync & analytics ──────────────────────────────────────────
  useEffect(() => {
    const syncProgress = async (current: number) => {
      if (!duration || duration <= 0) return;
      try {
        localStorage.setItem(`progress-${episodeId}`, Math.floor(current).toString());
        await fetch('/api/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episode_id: episodeId,
            last_position_seconds: Math.floor(current),
            duration_seconds: Math.floor(duration)
          })
        });
      } catch (err) {
        console.error('Error syncing watch progress:', err);
      }
    };

    if (isPlaying) {
      if (currentTime >= 2 && Math.floor(currentTime) % 5 === 0) {
        syncProgress(currentTime);
      }

      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current && duration > 0) {
          syncProgress(videoRef.current.currentTime);
        }
      }, 5000);

      if (!viewLoggedRef.current && currentTime >= 1) {
        viewLoggedRef.current = true;
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode_id: episodeId })
        }).catch(err => console.error('Error logging view:', err));
      }
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, episodeId]);

  // Handle pointer hover movements to auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showShortcutsModal) {
        setShowControls(false);
        setIsSettingsOpen(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // ─── Play toggle — runs IMA on first press ───────────────────────────────
  const togglePlay = () => {
    if (!isPlaying) {
      setHasStartedPlaying(true);
      playMainVideo();
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Quick relative seek
  const seekRelative = (delta: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration || 0, videoRef.current.currentTime + delta));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle container tap/click
  const handleContainerClick = (e: React.MouseEvent) => {

    const target = e.target as HTMLElement;

    if (isSettingsOpen) {
      if (!target.closest(`.${styles.settingsPopup}`) && !target.closest(`.${styles.settingsBtn}`)) {
        setIsSettingsOpen(false);
        setSettingsView('main');
        return;
      }
    }

    if (
      target.closest(`.${styles.bottomControls}`) ||
      target.closest(`.${styles.bigPlayTrigger}`) ||
      target.closest(`.${styles.resumePrompt}`) ||
      target.closest(`.${styles.autoplayOverlay}`) ||
      target.closest(`.${styles.shortcutsModal}`)
    ) {
      return;
    }

    const isTouchOrMobile = typeof window !== 'undefined' && (
      window.innerWidth <= 1024 ||
      'ontouchstart' in window ||
      (navigator && navigator.maxTouchPoints > 0) ||
      document.fullscreenElement !== null
    );

    if (isTouchOrMobile) {
      if (showControls) {
        setShowControls(false);
      } else {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying && !showShortcutsModal) {
            setShowControls(false);
            setIsSettingsOpen(false);
          }
        }, 3000);
      }
    } else {
      togglePlay();
    }
  };

  // Capture a snapshot frame from any HTMLVideoElement into the off-screen canvas cache
  const captureFrameToCache = (snappedSec: number, sourceVideo: HTMLVideoElement) => {
    try {
      if (!sourceVideo || sourceVideo.videoWidth === 0 || sourceVideo.videoHeight === 0) return;
      if (frameCacheRef.current.has(snappedSec)) return;

      // LRU eviction: Cap cache at 80 frames (approx 160x90 per canvas, RAM footprint < 2MB total)
      if (frameCacheRef.current.size >= 80) {
        const oldestKey = frameCacheRef.current.keys().next().value;
        if (oldestKey !== undefined) {
          frameCacheRef.current.delete(oldestKey);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(sourceVideo, 0, 0, 160, 90);
      frameCacheRef.current.set(snappedSec, canvas);
    } catch (_) {
      // Graceful fallback for cross-origin security
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      updateBufferedProgress();
      if (cur < 1) {
        viewLoggedRef.current = false;
      }

      // Automatically capture playing frames into RAM canvas cache every 4 seconds
      // Gives instant 0ms preview for any section the user has already watched
      const curSnap = Math.floor(cur / 4) * 4;
      if (Math.abs(curSnap - lastCapturedPlaySecRef.current) >= 4) {
        lastCapturedPlaySecRef.current = curSnap;
        captureFrameToCache(curSnap, videoRef.current);
      }

      // Zero-lag continuous streaming: prefetch next episode route & assets at 70% duration
      if (
        duration > 0 &&
        cur / duration > 0.7 &&
        !hasPrefetchedNextRef.current &&
        nextEpisodeUrl
      ) {
        hasPrefetchedNextRef.current = true;
        try {
          router.prefetch(nextEpisodeUrl);
        } catch {}
      }
    }
  };

  const handleLoadedMetadata = () => {
    setPlaybackError(null);
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      updateBufferedProgress();

      // Suppress native browser cue drawing so custom fansub overlay renders cleanly
      if (videoRef.current.textTracks) {
        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
          videoRef.current.textTracks[i].mode = 'hidden';
        }
      }

      // Quality switch timestamp restoration
      if (pendingSeekTimeRef.current !== null) {
        const seekTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        if (wasPlayingBeforeSwitchRef.current) {
          videoRef.current.play().catch(() => {});
        }
        return;
      }

      // 1. Check URL ?t= query parameter for Google Key Moments & timestamp seeking
      try {
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const tParam = urlParams.get('t');
          if (tParam) {
            const seekSec = parseFloat(tParam);
            if (!isNaN(seekSec) && seekSec > 0 && seekSec < dur) {
              videoRef.current.currentTime = seekSec;
              setCurrentTime(seekSec);
              return;
            }
          }
        }
      } catch (_) {}

      try {
        const saved = localStorage.getItem(`progress-${episodeId}`);
        if (saved) {
          const parsed = parseFloat(saved);
          if (parsed > 10 && dur > 30 && parsed < dur * 0.9) {
            setResumeTime(parsed);
            setShowResumePrompt(true);
            setTimeout(() => {
              setShowResumePrompt(false);
            }, 9000);
          }
        }
      } catch (_) {}
    }
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const mediaErr = video?.error;
    console.warn('[VideoPlayer] Video error encountered:', mediaErr?.code, mediaErr?.message, currentVideoSrc);

    // If currently using CloudFront and it fails (e.g. 403 Forbidden), automatically fallback to media.hentaikage.cc
    if (currentVideoSrc && currentVideoSrc.includes('dmfrlqgigpmty.cloudfront.net')) {
      const fallbackUrl = currentVideoSrc.replace('dmfrlqgigpmty.cloudfront.net', 'media.hentaikage.cc');
      console.log('[VideoPlayer] Seamlessly falling back to media.hentaikage.cc:', fallbackUrl);
      setCurrentVideoSrc(fallbackUrl);
      setPlaybackError(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 50);
      return;
    }

    // If current quality failed (e.g. unplayable container or codec), try fallback to next quality (e.g. 720p or 480p)
    const currentQualityIndex = availableQualities.findIndex((q) => q.keyName === selectedQuality);
    const nextQuality = availableQualities.find((q, idx) => idx > currentQualityIndex && q.url && q.url !== currentVideoSrc);
    if (nextQuality) {
      console.log(`[VideoPlayer] Quality ${selectedQuality} failed, automatically failing over to ${nextQuality.keyName}:`, nextQuality.url);
      setSelectedQuality(nextQuality.keyName);
      setCurrentVideoSrc(nextQuality.url);
      setPlaybackError(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        }
      }, 100);
      return;
    }

    const errorMsg = mediaErr?.code === 4
      ? 'The video stream format is not natively supported by your browser or is currently being processed. Please refresh in a moment.'
      : mediaErr ? `Video stream failed to load (Error code ${mediaErr.code}).` : 'Failed to load video stream.';
    setPlaybackError(errorMsg);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const executePreviewSeek = (targetSec: number) => {
    const video = previewVideoRef.current;
    if (!video || !isFinite(targetSec)) {
      isSeekingRef.current = false;
      return;
    }
    isSeekingRef.current = true;
    try {
      // Use hardware-accelerated keyframe snap (fastSeek) if supported for instant scrub
      if (typeof (video as any).fastSeek === 'function') {
        (video as any).fastSeek(targetSec);
      } else {
        video.currentTime = targetSec;
      }
    } catch (_) {
      isSeekingRef.current = false;
    }
  };

  const handlePreviewSeeked = () => {
    const video = previewVideoRef.current;
    if (video) {
      captureFrameToCache(lastSnappedSecRef.current, video);
      // Immediately paint to display canvas
      if (displayCanvasRef.current) {
        try {
          const ctx = displayCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 160, 90);
            setHasCachedFrame(true);
          }
        } catch (_) {}
      }
    }
    setPreviewFrameReady(true);
    isSeekingRef.current = false;

    if (pendingSeekRef.current !== null) {
      const nextTarget = pendingSeekRef.current;
      pendingSeekRef.current = null;
      executePreviewSeek(nextTarget);
    }
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = Math.max(0, Math.min(duration, pct * duration));
    const pct100 = pct * 100;
    const clampedLeftPct = Math.max(8, Math.min(92, pct100));

    // High-performance direct DOM updates: silky smooth 60fps tracking without triggering heavy React component re-renders
    if (hoverTooltipRef.current) {
      hoverTooltipRef.current.style.left = `${clampedLeftPct}%`;
      hoverTooltipRef.current.classList.add(styles.hoverTooltipVisible);
    }
    if (hoverTimeTextRef.current) {
      hoverTimeTextRef.current.textContent = formatTime(targetTime);
    }

    if (hoverTime === null) {
      setHoverTime(targetTime);
      setHoverPosPercent(pct100);
    }

    // 0. Primary 0ms WebP Storyboard Sprite Engine (YouTube / Netflix standard)
    const sb = storyboard;
    const hasStoryboard = sb && sb.status === 'completed';
    if (hasStoryboard && storyboardLayerRef.current) {
      const interval = sb.interval || sb.frame_interval_seconds || 1;
      const frameIndex = Math.floor(targetTime / interval);
      const totalSheets = sb.sheet_count || 1;
      // Sheets generated by FFmpeg %02d are 1-indexed (sheet_01.webp, sheet_02.webp...)
      const sheetNum = Math.min(totalSheets, Math.max(1, Math.floor(frameIndex / 100) + 1));
      const inSheetIndex = frameIndex % 100;
      const col = inSheetIndex % 10;
      const row = Math.floor(inSheetIndex / 10);
      const x = col * 160;
      const y = row * 90;

      const prefix = sb.prefix || `storyboards/${episodeId}`;
      const sheetKey = `${prefix}/sheet_${String(sheetNum).padStart(2, '0')}.webp`;
      const sheetUrl = getR2Url(sheetKey);

      storyboardLayerRef.current.style.backgroundImage = `url("${sheetUrl}")`;
      storyboardLayerRef.current.style.backgroundPosition = `-${x}px -${y}px`;
      storyboardLayerRef.current.style.opacity = '1';
      return; // 0ms instant display, skip hardware video seek!
    }

    // 1. Check in-memory Canvas Frame Cache (0ms instant display from RAM)
    const snappedTime = Math.floor(targetTime / 4) * 4;
    const cachedCanvas = frameCacheRef.current.get(snappedTime);

    if (cachedCanvas && displayCanvasRef.current) {
      const ctx = displayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(cachedCanvas, 0, 0, 160, 90);
        setHasCachedFrame(true);
        setPreviewFrameReady(true);
        return; // Frame already in RAM, zero network seek required!
      }
    }

    // 2. Neighbor search in cache within +/- 8s as an instant visual surrogate
    let nearestDist = Infinity;
    let nearestCanvas: HTMLCanvasElement | null = null;
    frameCacheRef.current.forEach((canvas, sec) => {
      const dist = Math.abs(sec - snappedTime);
      if (dist <= 8 && dist < nearestDist) {
        nearestDist = dist;
        nearestCanvas = canvas;
      }
    });
    if (nearestCanvas && displayCanvasRef.current) {
      const ctx = displayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(nearestCanvas, 0, 0, 160, 90);
        setHasCachedFrame(true);
      }
    }

    // 3. Debounce background hardware video decoder seek to 75ms
    // Prevents queuing dozens of seeks while user is rapidly scrubbing across the bar
    if (snappedTime === lastSnappedSecRef.current) return;

    if (seekDebounceTimerRef.current) {
      clearTimeout(seekDebounceTimerRef.current);
    }

    seekDebounceTimerRef.current = setTimeout(() => {
      lastSnappedSecRef.current = snappedTime;
      if (isSeekingRef.current) {
        pendingSeekRef.current = snappedTime;
      } else {
        executePreviewSeek(snappedTime);
      }
    }, 75);
  };

  const handleProgressBarMouseLeave = () => {
    if (hoverTooltipRef.current) {
      hoverTooltipRef.current.classList.remove(styles.hoverTooltipVisible);
    }
    if (storyboardLayerRef.current) {
      storyboardLayerRef.current.style.opacity = '0';
    }
    setHoverTime(null);
    pendingSeekRef.current = null;
    lastSnappedSecRef.current = -1;
    if (seekDebounceTimerRef.current) {
      clearTimeout(seekDebounceTimerRef.current);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const newMute = val === 0;
    setIsMuted(newMute);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = newMute;
    }
    try {
      localStorage.setItem('player-volume', val.toString());
      localStorage.setItem('player-muted', newMute.toString());
    } catch (_) {}
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (nextMute) {
        videoRef.current.volume = 0;
      } else {
        const restoreVol = volume > 0 ? volume : 0.8;
        videoRef.current.volume = restoreVol;
        setVolume(restoreVol);
      }
      try {
        localStorage.setItem('player-muted', nextMute.toString());
        if (!nextMute && volume > 0) {
          localStorage.setItem('player-volume', volume.toString());
        }
      } catch (_) {}
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setSettingsView('main');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const toggleTheater = () => {
    setIsTheater(!isTheater);
    if (onToggleTheater) {
      onToggleTheater();
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  const togglePip = async () => {
    try {
      if (!videoRef.current) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.warn('Picture-in-picture failed or blocked:', err);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyT':
          e.preventDefault();
          toggleTheater();
          break;
        case 'KeyC':
          e.preventDefault();
          if (hasSubtitles) {
            toggleCc();
          } else if (onToggleCinema) {
            onToggleCinema();
          }
          break;
        case 'KeyI':
          e.preventDefault();
          togglePip();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'KeyJ':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'KeyL':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, Math.round(((videoRef.current.volume || 0) + 0.1) * 100) / 100);
            videoRef.current.volume = newVol;
            videoRef.current.muted = false;
            setVolume(newVol);
            setIsMuted(false);
            try {
              localStorage.setItem('player-volume', newVol.toString());
              localStorage.setItem('player-muted', 'false');
            } catch (_) {}
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, Math.round(((videoRef.current.volume || 0) - 0.1) * 100) / 100);
            videoRef.current.volume = newVol;
            const newMute = newVol === 0;
            videoRef.current.muted = newMute;
            setVolume(newVol);
            setIsMuted(newMute);
            try {
              localStorage.setItem('player-volume', newVol.toString());
              localStorage.setItem('player-muted', newMute.toString());
            } catch (_) {}
          }
          break;
        case 'KeyN':
          if (nextEpisodeUrl) {
            e.preventDefault();
            router.push(nextEpisodeUrl);
          }
          break;
        case 'KeyP':
          if (prevEpisodeUrl) {
            e.preventDefault();
            router.push(prevEpisodeUrl);
          }
          break;
        case 'Slash':
          if (e.shiftKey) { // '?' key
            e.preventDefault();
            setShowShortcutsModal(prev => !prev);
          }
          break;
        case 'Escape':
          if (showShortcutsModal) {
            e.preventDefault();
            setShowShortcutsModal(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration, isPlaying, isMuted, volume, isFullscreen, isTheater, isPip, nextEpisodeUrl, prevEpisodeUrl, showShortcutsModal]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoplay && nextEpisodeUrl) {
      setAutoplayCountdown(5);
    } else if (nextEpisodeUrl) {
      setShowControls(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const totalSecs = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = Math.floor(totalSecs % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const cleanTitle = title
    ? title.replace(/^(Episode|Ep)\s*\d+[\s:\-]*\s*/i, '').trim()
    : '';

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !showShortcutsModal && setShowControls(false)}
      className={`${styles.playerContainer} ${isTheater ? styles.theaterMode : ''}`}
    >
      <video
        ref={videoRef}
        src={currentVideoSrc}
        onPlay={() => setHasStartedPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={updateBufferedProgress}
        onError={handleVideoError}
        onEnded={handleVideoEnded}
        className={styles.videoElement}
        preload="metadata"
        playsInline
      >
        {hasSubtitles && subtitleUrl && (
          <track
            kind="subtitles"
            src={subtitleUrl}
            srcLang="en"
            label="English"
            default={false}
          />
        )}
      </video>

      {/* Playback Error Recovery Banner */}
      {playbackError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 12, 20, 0.94)',
          backdropFilter: 'blur(8px)',
          zIndex: 35,
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '0.8rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.4rem' }}>
            Video Stream Failed to Load
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '400px', marginBottom: '1.2rem', lineHeight: 1.5 }}>
            {playbackError}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPlaybackError(null);
              if (currentVideoSrc && currentVideoSrc.includes('dmfrlqgigpmty.cloudfront.net')) {
                setCurrentVideoSrc(currentVideoSrc.replace('dmfrlqgigpmty.cloudfront.net', 'media.hentaikage.cc'));
              } else if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#a855f7',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>Retry Playback</span>
          </button>
        </div>
      )}

      {/* Pure Black Screen Backdrop Before Video Plays */}
      {!hasStartedPlaying && !playbackError && (
        <div className={styles.blackScreenBackdrop} />
      )}

      {/* Dedicated Anime Subtitle Overlay - ONLY rendered if separate subtitle file exists & CC is active */}
      {hasSubtitles && isCcActive && activeCue && (
        <div className={`${styles.subtitleOverlay} ${!showControls ? styles.subtitleOverlayControlsHidden : ''}`}>
          <span className={styles.subtitleText}>{activeCue.text}</span>
        </div>
      )}

      {/* Floating Resume Prompt */}
      {showResumePrompt && resumeTime !== null && (
        <div className={styles.resumePrompt} onClick={(e) => e.stopPropagation()}>
          <Clock size={15} className={styles.resumeIcon} />
          <span>Resume from <strong>{formatTime(resumeTime)}</strong>?</span>
          <button
            type="button"
            className={styles.resumePlayBtn}
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = resumeTime;
                setCurrentTime(resumeTime);
                playMainVideo();
              }
              setShowResumePrompt(false);
            }}
          >
            Resume
          </button>
          <button
            type="button"
            className={styles.resumeDismissBtn}
            onClick={() => setShowResumePrompt(false)}
            aria-label="Dismiss resume"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Autoplay Countdown Overlay */}
      {autoplayCountdown !== null && nextEpisodeUrl && (
        <div className={styles.autoplayOverlay} onClick={(e) => e.stopPropagation()}>
          <div className={styles.autoplayCard}>
            <div className={styles.countdownRing}>
              <span className={styles.countdownNumber}>{autoplayCountdown}</span>
            </div>
            <h4>Next Episode Starting Soon</h4>
            <p>Episode {episodeNumber + 1}</p>
            <div className={styles.autoplayActions}>
              <button
                type="button"
                className={styles.autoplayCancelBtn}
                onClick={() => setAutoplayCountdown(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.autoplayPlayBtn}
                onClick={() => router.push(nextEpisodeUrl)}
              >
                Play Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className={styles.shortcutsModalBackdrop} onClick={(e) => { e.stopPropagation(); setShowShortcutsModal(false); }}>
          <div className={styles.shortcutsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shortcutsHeader}>
              <h3><Keyboard size={18} color="#a855f7" /> Keyboard Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className={styles.resumeDismissBtn}
                aria-label="Close shortcuts"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.shortcutsList}>
              <div className={styles.shortcutItem}>
                <span>Play / Pause</span>
                <span className={styles.shortcutKey}>Space / K</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Fullscreen</span>
                <span className={styles.shortcutKey}>F</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Theater Mode</span>
                <span className={styles.shortcutKey}>T</span>
              </div>
              {hasSubtitles ? (
                <div className={styles.shortcutItem}>
                  <span>Closed Captions (CC)</span>
                  <span className={styles.shortcutKey}>C</span>
                </div>
              ) : (
                <div className={styles.shortcutItem}>
                  <span>Cinema Mode</span>
                  <span className={styles.shortcutKey}>C</span>
                </div>
              )}
              <div className={styles.shortcutItem}>
                <span>Picture-in-Picture</span>
                <span className={styles.shortcutKey}>I</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Mute / Unmute</span>
                <span className={styles.shortcutKey}>M</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Seek ±5s</span>
                <span className={styles.shortcutKey}>← / →</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Seek ±10s</span>
                <span className={styles.shortcutKey}>J / L</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Volume ±10%</span>
                <span className={styles.shortcutKey}>↑ / ↓</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Next Episode</span>
                <span className={styles.shortcutKey}>N</span>
              </div>
              <div className={styles.shortcutItem}>
                <span>Prev Episode</span>
                <span className={styles.shortcutKey}>P</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium overlay controls */}
      <div className={`${styles.controlsOverlay} ${showControls ? styles.visible : ''}`}>

          {/* Top Header details - EP badge removed per request */}
          <div className={styles.topHeader}>
            <div className={styles.titleInfo}>
              {cleanTitle && cleanTitle.toLowerCase() !== `episode ${episodeNumber}` && (
                <h3>{cleanTitle}</h3>
              )}
            </div>
          </div>

          {/* Big play/pause center button click trigger */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={styles.bigPlayTrigger}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={38} fill="white" /> : <Play size={38} fill="white" style={{ marginLeft: '3px' }} />}
          </button>

          {/* Bottom Panel - Single Line Layout (Matching Anime Player Specs) */}
          <div className={styles.bottomControls}>
            <div className={styles.singleControlsRow}>
              {/* 1. Play / Pause Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className={styles.playPauseBtn}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title="Play / Pause (Space)"
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: '2px' }} />}
              </button>

              {/* 2. Main Scrubber / Timeline Bar with Buffer Ahead Indicator & Storyboard Preview */}
              <div 
                ref={progressBarRef}
                className={styles.timelineContainer}
                onMouseMove={handleProgressBarMouseMove}
                onMouseLeave={handleProgressBarMouseLeave}
              >
                {/* Persistent Hover Preview Tooltip (Tracks at 60fps with 0ms canvas frame cache) */}
                <div 
                  ref={hoverTooltipRef}
                  className={`${styles.hoverTimeTooltip} ${hoverTime !== null ? styles.hoverTooltipVisible : ''}`}
                  style={{ left: `${Math.max(8, Math.min(92, hoverPosPercent))}%` }}
                >
                  <div className={styles.hoverThumbnailWrap}>
                    <div className={styles.hoverThumbnailShimmer} />
                    {posterUrl && (
                      <img 
                        src={posterUrl} 
                        alt="Seek preview fallback" 
                        className={styles.hoverThumbnailImg} 
                        style={{
                          opacity: (hasCachedFrame || previewFrameReady) ? 0 : 1,
                          transition: 'opacity 0.2s ease',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    <video
                      ref={previewVideoRef}
                      src={videoUrl}
                      className={styles.hoverThumbnailVideo}
                      muted
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                      onSeeked={handlePreviewSeeked}
                    />
                    <canvas
                      ref={displayCanvasRef}
                      width={160}
                      height={90}
                      className={styles.hoverThumbnailCanvas}
                      style={{
                        opacity: hasCachedFrame ? 1 : 0,
                        transition: 'opacity 0.12s ease'
                      }}
                    />
                    <div
                      ref={storyboardLayerRef}
                      className={styles.hoverThumbnailStoryboard}
                    />
                  </div>
                  <span ref={hoverTimeTextRef} className={styles.hoverTimeText}>
                    {formatTime(hoverTime ?? 0)}
                  </span>
                </div>

                {/* Visual Tracks: Background, Buffered Range Ahead, Played Progress, Scrubber Thumb */}
                <div className={styles.timelineTrack}>
                  {/* Downloaded / Buffered Range Bar */}
                  <div 
                    className={styles.bufferedBar} 
                    style={{ width: `${bufferedPercent}%` }} 
                  />
                  {/* Played Progress Bar (Vibrant Pink #e11d48) */}
                  <div 
                    className={styles.playedBar} 
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
                  />
                  {/* White Scrubber Thumb */}
                  <div 
                    className={styles.scrubberThumb} 
                    style={{ left: `${(currentTime / (duration || 1)) * 100}%` }} 
                  />
                </div>

                {/* Transparent Range Input for standard drag/seek interactions */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className={styles.seekSlider}
                  aria-label="Seek Video"
                />
              </div>

              {/* 3. Time Display (e.g. 08:47 / 16:36) */}
              <div className={styles.timeDisplay}>
                <span>{formatTime(currentTime)}</span>
                <span className={styles.timeDivider}>/</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* 4. Volume Group: Speaker Icon + Horizontal Slider */}
              <div className={styles.volumeGroup}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className={styles.controlBtn}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  title="Mute / Unmute (M)"
                >
                  {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
                <div className={styles.volumeTrackWrap}>
                  <div 
                    className={styles.volumeFill} 
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} 
                  />
                  <div 
                    className={styles.volumeThumb} 
                    style={{ left: `${(isMuted ? 0 : volume) * 100}%` }} 
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className={styles.volumeSlider}
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* 5. Closed Captions [CC] Toggle Button */}
              {hasSubtitles && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCc();
                  }}
                  className={`${styles.ccBtn} ${isCcActive ? styles.ccActiveBtn : ''}`}
                  title={isCcActive ? 'Closed Captions: ON (C)' : 'Closed Captions: OFF (C)'}
                  aria-label="Toggle Closed Captions"
                >
                  <span>CC</span>
                </button>
              )}

              {/* 6. Settings Gear Button & Popup Menu (Image 2) */}
              <div ref={settingsContainerRef} className={styles.settingsMenuContainer}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen(!isSettingsOpen);
                    setSettingsView('main');
                  }}
                  className={`${styles.controlBtn} ${styles.settingsBtn} ${isSettingsOpen ? styles.settingsBtnActive : ''}`}
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={19} />
                </button>

                {/* Settings Popup Menu (Image 2) */}
                {isSettingsOpen && (
                  <div className={styles.settingsPopup} onClick={(e) => e.stopPropagation()}>
                    {/* Pointer arrow pointing to gear button */}
                    <div className={styles.settingsPopupArrow} />

                    {settingsView === 'main' && (
                      <div className={styles.settingsMenuList}>
                        {/* Captions */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => setSettingsView('captions')}
                        >
                          <span className={styles.settingsMenuLabel}>Captions</span>
                          <span className={styles.settingsMenuValue}>
                            {hasSubtitles ? (isCcActive ? 'English' : 'Off') : 'None'}
                            <ChevronRight size={15} className={styles.settingsChevron} />
                          </span>
                        </div>

                        {/* Quality */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => setSettingsView('quality')}
                        >
                          <span className={styles.settingsMenuLabel}>Quality</span>
                          <span className={styles.settingsMenuValue}>
                            {selectedQuality}
                            <ChevronRight size={15} className={styles.settingsChevron} />
                          </span>
                        </div>

                        {/* Speed */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => setSettingsView('speed')}
                        >
                          <span className={styles.settingsMenuLabel}>Speed</span>
                          <span className={styles.settingsMenuValue}>
                            {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
                            <ChevronRight size={15} className={styles.settingsChevron} />
                          </span>
                        </div>

                        {/* Server */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => setSettingsView('server')}
                        >
                          <span className={styles.settingsMenuLabel}>Server</span>
                          <span className={styles.settingsMenuValue}>
                            {selectedServer}
                            <ChevronRight size={15} className={styles.settingsChevron} />
                          </span>
                        </div>

                        {/* Fallback Server */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => setFallbackServerEnabled(!fallbackServerEnabled)}
                        >
                          <span className={styles.settingsMenuLabel}>Fallback Server</span>
                          <span className={styles.settingsMenuValue}>
                            {fallbackServerEnabled ? 'On' : 'Off'}
                          </span>
                        </div>

                        {/* Ambient Mode */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => onToggleCinema?.()}
                        >
                          <span className={styles.settingsMenuLabel}>Ambient Mode</span>
                          <span className={styles.settingsMenuValue}>
                            {isLightsOff ? 'On' : 'Off'}
                          </span>
                        </div>

                        {/* Autoplay Next */}
                        {onToggleAutoplay && (
                          <div 
                            className={styles.settingsMenuItem} 
                            onClick={() => onToggleAutoplay()}
                          >
                            <span className={styles.settingsMenuLabel}>Autoplay Next</span>
                            <span className={styles.settingsMenuValue}>
                              {autoplay ? 'On' : 'Off'}
                            </span>
                          </div>
                        )}

                        {/* Keyboard Shortcuts */}
                        <div 
                          className={styles.settingsMenuItem} 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setShowShortcutsModal(true);
                          }}
                        >
                          <span className={styles.settingsMenuLabel}>Keyboard Shortcuts</span>
                          <span className={styles.settingsMenuValue}>
                            ?
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Submenu: Captions */}
                    {settingsView === 'captions' && (
                      <div className={styles.settingsSubmenuList}>
                        <div 
                          className={styles.settingsSubmenuHeader} 
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronLeft size={16} />
                          <span>Captions</span>
                        </div>
                        <div 
                          className={`${styles.settingsSubmenuItem} ${!isCcActive ? styles.settingsSubmenuItemActive : ''}`}
                          onClick={() => {
                            if (isCcActive) toggleCc();
                            setSettingsView('main');
                          }}
                        >
                          <span>Off</span>
                          {!isCcActive && <Check size={14} className={styles.submenuCheck} />}
                        </div>
                        {hasSubtitles && (
                          <div 
                            className={`${styles.settingsSubmenuItem} ${isCcActive ? styles.settingsSubmenuItemActive : ''}`}
                            onClick={() => {
                              if (!isCcActive) toggleCc();
                              setSettingsView('main');
                            }}
                          >
                            <span>English</span>
                            {isCcActive && <Check size={14} className={styles.submenuCheck} />}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submenu: Quality */}
                    {settingsView === 'quality' && (
                      <div className={styles.settingsSubmenuList}>
                        <div 
                          className={styles.settingsSubmenuHeader} 
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronLeft size={16} />
                          <span>Quality</span>
                        </div>
                        {availableQualities.map((q) => {
                          const isSelected = selectedQuality === q.keyName;
                          return (
                            <div 
                              key={q.keyName}
                              className={`${styles.settingsSubmenuItem} ${isSelected ? styles.settingsSubmenuItemActive : ''}`}
                              onClick={() => {
                                handleQualityChange(q.keyName);
                              }}
                            >
                              <span>{q.label} <small className={styles.qualityMiniSubtext}>({q.subtext})</small></span>
                              {isSelected && <Check size={14} className={styles.submenuCheck} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Submenu: Speed */}
                    {settingsView === 'speed' && (
                      <div className={styles.settingsSubmenuList}>
                        <div 
                          className={styles.settingsSubmenuHeader} 
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronLeft size={16} />
                          <span>Playback Speed</span>
                        </div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => {
                          const isSelected = playbackRate === rate;
                          return (
                            <div 
                              key={rate}
                              className={`${styles.settingsSubmenuItem} ${isSelected ? styles.settingsSubmenuItemActive : ''}`}
                              onClick={() => {
                                handleSpeedChange(rate);
                              }}
                            >
                              <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                              {isSelected && <Check size={14} className={styles.submenuCheck} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Submenu: Server */}
                    {settingsView === 'server' && (
                      <div className={styles.settingsSubmenuList}>
                        <div 
                          className={styles.settingsSubmenuHeader} 
                          onClick={() => setSettingsView('main')}
                        >
                          <ChevronLeft size={16} />
                          <span>Server</span>
                        </div>
                        <div 
                          className={`${styles.settingsSubmenuItem} ${selectedServer === 'CDN 1' ? styles.settingsSubmenuItemActive : ''}`}
                          onClick={() => {
                            setSelectedServer('CDN 1');
                            setSettingsView('main');
                          }}
                        >
                          <span>CDN 1 (Primary High-Speed)</span>
                          {selectedServer === 'CDN 1' && <Check size={14} className={styles.submenuCheck} />}
                        </div>
                        <div 
                          className={`${styles.settingsSubmenuItem} ${selectedServer === 'CDN 2' ? styles.settingsSubmenuItemActive : ''}`}
                          onClick={() => {
                            setSelectedServer('CDN 2');
                            setSettingsView('main');
                          }}
                        >
                          <span>CDN 2 (Edge Fallback)</span>
                          {selectedServer === 'CDN 2' && <Check size={14} className={styles.submenuCheck} />}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. Fullscreen Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className={styles.controlBtn}
                title="Fullscreen (F)"
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>

        </div>
    </div>
  );
}
