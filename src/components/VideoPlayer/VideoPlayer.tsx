'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Layout, RotateCcw, RotateCw,
  HelpCircle, X, Clock, Keyboard, Lightbulb
} from 'lucide-react';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  episodeId: string;
  videoUrl: string;
  title: string;
  episodeNumber: number;
  nextEpisodeUrl?: string | null;
  prevEpisodeUrl?: string | null;
  onToggleTheater?: () => void;
  isLightsOff?: boolean;
  onToggleCinema?: () => void;
  posterUrl?: string;
  autoplay?: boolean;
  onToggleAutoplay?: () => void;
}

// ExoClick VAST tag — replace with your actual VAST URL from ExoClick dashboard
const VAST_TAG_URL = process.env.NEXT_PUBLIC_EXOCLICK_VAST_URL || '';

declare global {
  interface Window {
    google?: any;
  }
}

export default function VideoPlayer({
  episodeId,
  videoUrl,
  title,
  episodeNumber,
  nextEpisodeUrl,
  prevEpisodeUrl,
  onToggleTheater,
  isLightsOff = false,
  onToggleCinema,
  posterUrl,
  autoplay = true,
  onToggleAutoplay,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Resume prompt state
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Autoplay countdown state
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);

  // IMA state
  const [adPlaying, setAdPlaying] = useState(false);
  const [adInitialized, setAdInitialized] = useState(false);
  const [imaReady, setImaReady] = useState(false);
  const adsLoaderRef = useRef<any>(null);
  const adsManagerRef = useRef<any>(null);
  const adDisplayContainerRef = useRef<any>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewLoggedRef = useRef(false);

  // Load Google IMA SDK script once
  useEffect(() => {
    if (!VAST_TAG_URL) return;
    if (window.google?.ima) {
      setImaReady(true);
      return;
    }
    const existingScript = document.getElementById('google-ima-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => setImaReady(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-ima-sdk';
    script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
    script.async = true;
    script.onload = () => setImaReady(true);
    script.onerror = () => console.warn('IMA SDK failed to load — ads disabled');
    document.head.appendChild(script);
  }, []);

  // Reload video element on URL change; reset state
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAdPlaying(false);
    setAdInitialized(false);
    setShowResumePrompt(false);
    setResumeTime(null);
    setAutoplayCountdown(null);
    viewLoggedRef.current = false;

    // Destroy existing ads manager on episode change
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch (_) {}
      adsManagerRef.current = null;
    }
    if (adsLoaderRef.current) {
      adsLoaderRef.current = null;
    }
    if (adDisplayContainerRef.current) {
      adDisplayContainerRef.current = null;
    }

    setHasStartedPlaying(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [episodeId, videoUrl]);

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

  // ─── IMA: Initialize ad display container + loader ──────────────────────
  const initializeIMA = () => {
    if (!imaReady || !window.google?.ima) return;
    if (!videoRef.current || !adContainerRef.current) return;
    if (adInitialized) return;

    const ima = window.google.ima;

    const adDisplayContainer = new ima.AdDisplayContainer(
      adContainerRef.current,
      videoRef.current
    );
    adDisplayContainerRef.current = adDisplayContainer;

    const adsLoader = new ima.AdsLoader(adDisplayContainer);
    adsLoaderRef.current = adsLoader;

    adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false
    );

    adsLoader.addEventListener(
      ima.AdErrorEvent.Type.AD_ERROR,
      onAdError,
      false
    );

    const adsRequest = new ima.AdsRequest();
    adsRequest.adTagUrl = VAST_TAG_URL;

    const w = containerRef.current?.offsetWidth || 640;
    const h = containerRef.current?.offsetHeight || 360;
    adsRequest.linearAdSlotWidth = w;
    adsRequest.linearAdSlotHeight = h;
    adsRequest.nonLinearAdSlotWidth = w;
    adsRequest.nonLinearAdSlotHeight = 150;

    adDisplayContainer.initialize();
    adsLoader.requestAds(adsRequest);
    setAdInitialized(true);
  };

  const onAdsManagerLoaded = (adsManagerLoadedEvent: any) => {
    const ima = window.google.ima;
    const adsRenderingSettings = new ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

    const adsManager = adsManagerLoadedEvent.getAdsManager(
      videoRef.current,
      adsRenderingSettings
    );
    adsManagerRef.current = adsManager;

    adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested, false);
    adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, onContentResumeRequested, false);
    adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, onAllAdsCompleted, false);
    adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

    try {
      const w = containerRef.current?.offsetWidth || 640;
      const h = containerRef.current?.offsetHeight || 360;
      adsManager.init(w, h, ima.ViewMode.NORMAL);
      adsManager.start();
    } catch (err) {
      console.warn('IMA AdsManager start error:', err);
      playMainVideo();
    }
  };

  const onContentPauseRequested = () => {
    if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
    setAdPlaying(true);
  };

  const onContentResumeRequested = () => {
    setAdPlaying(false);
    playMainVideo();
  };

  const onAllAdsCompleted = () => {
    setAdPlaying(false);
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch (_) {}
      adsManagerRef.current = null;
    }
    playMainVideo();
  };

  const onAdError = (adErrorEvent: any) => {
    console.warn('IMA Ad error:', adErrorEvent?.getError?.()?.toString());
    setAdPlaying(false);
    if (adsManagerRef.current) {
      try { adsManagerRef.current.destroy(); } catch (_) {}
      adsManagerRef.current = null;
    }
    playMainVideo();
  };

  const playMainVideo = () => {
    if (videoRef.current) {
      setHasStartedPlaying(true);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Playback error:', err);
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
        setShowSpeedMenu(false);
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
    if (adPlaying) return;

    if (!isPlaying) {
      setHasStartedPlaying(true);
      if (VAST_TAG_URL && imaReady && !adInitialized) {
        initializeIMA();
        return;
      }
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
    if (adPlaying) return;

    const target = e.target as HTMLElement;

    if (showSpeedMenu) {
      if (!target.closest(`.${styles.speedDropdown}`)) {
        setShowSpeedMenu(false);
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
            setShowSpeedMenu(false);
          }
        }, 3000);
      }
    } else {
      togglePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (cur < 1) {
        viewLoggedRef.current = false;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);

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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (nextMute) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume || 0.5;
      }
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
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
          if (onToggleCinema) {
            e.preventDefault();
            onToggleCinema();
          }
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
            const newVol = Math.min(1, (videoRef.current.volume || 0) + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, (videoRef.current.volume || 0) - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
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
  }, [duration, isPlaying, isMuted, volume, isFullscreen, isTheater, adPlaying, nextEpisodeUrl, prevEpisodeUrl, showShortcutsModal]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoplay && nextEpisodeUrl) {
      setAutoplayCountdown(5);
    } else if (nextEpisodeUrl) {
      setShowControls(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
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
        src={videoUrl}
        onPlay={() => setHasStartedPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        className={styles.videoElement}
        preload="metadata"
        playsInline
      />

      {/* Pure Black Screen Backdrop Before Video Plays */}
      {!hasStartedPlaying && (
        <div className={styles.blackScreenBackdrop} />
      )}

      {/* Google IMA Ad Container */}
      <div
        ref={adContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: adPlaying ? 20 : -1,
          pointerEvents: adPlaying ? 'all' : 'none',
        }}
      />

      {/* Floating Resume Prompt */}
      {showResumePrompt && resumeTime !== null && !adPlaying && (
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
      {autoplayCountdown !== null && nextEpisodeUrl && !adPlaying && (
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
              <div className={styles.shortcutItem}>
                <span>Cinema Mode</span>
                <span className={styles.shortcutKey}>C</span>
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
      {!adPlaying && (
        <div className={`${styles.controlsOverlay} ${showControls ? styles.visible : ''}`}>

          {/* Top Header details */}
          <div className={styles.topHeader}>
            <div className={styles.titleInfo}>
              <span className={styles.badge}>EP {episodeNumber}</span>
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

          {/* Bottom Panel */}
          <div className={styles.bottomControls}>
            {/* Progress Slider (Seekbar) */}
            <div className={styles.progressBarRow}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                className={styles.seekSlider}
                style={{
                  background: `linear-gradient(to right, var(--primary) ${(currentTime / (duration || 1)) * 100}%, #475569 ${(currentTime / (duration || 1)) * 100}%)`
                }}
              />
            </div>

            <div className={styles.controlsRow}>
              {/* Play/Pause, 10s Rewind/Forward & Volume */}
              <div className={styles.leftControls}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className={styles.controlBtn}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  title="Play / Pause (Space)"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                {/* 10s Rewind & Forward Seek */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); seekRelative(-10); }}
                  className={styles.seekStepBtn}
                  title="Rewind 10 seconds (J)"
                >
                  <RotateCcw size={15} />
                  <span>10s</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); seekRelative(10); }}
                  className={styles.seekStepBtn}
                  title="Forward 10 seconds (L)"
                >
                  <RotateCw size={15} />
                  <span>10s</span>
                </button>

                <div className={styles.volumeGroup}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className={styles.controlBtn}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    title="Mute / Unmute (M)"
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className={styles.volumeSlider}
                    style={{
                      background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #475569 ${(isMuted ? 0 : volume) * 100}%)`
                    }}
                  />
                </div>

                <div className={styles.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span className={styles.timeDivider}>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Speeds, Shortcuts, Theater, Fullscreen */}
              <div className={styles.rightControls}>
                {/* In-Player Autoplay Switch */}
                {onToggleAutoplay && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleAutoplay(); }}
                    className={styles.inPlayerAutoplayBtn}
                    title={`Autoplay next episode: ${autoplay ? 'ON' : 'OFF'}`}
                    aria-label="Toggle Autoplay"
                  >
                    <span className={styles.inPlayerAutoplayText}>Auto</span>
                    <div className={`${styles.inPlayerToggleTrack} ${autoplay ? styles.inPlayerToggleTrackActive : ''}`}>
                      <div className={`${styles.inPlayerToggleThumb} ${autoplay ? styles.inPlayerToggleThumbActive : ''}`} />
                    </div>
                  </button>
                )}

                <div className={styles.speedSelectorContainer}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}
                    className={styles.controlBtn}
                    title="Playback Speed"
                  >
                    <Settings size={18} />
                    <span className={styles.speedLabel}>{playbackRate}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className={`${styles.speedDropdown} glass`}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSpeedChange(rate); }}
                          className={`${styles.speedOption} ${playbackRate === rate ? styles.activeSpeed : ''}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowShortcutsModal(true); }}
                  className={styles.controlBtn}
                  title="Keyboard Shortcuts (?)"
                  aria-label="Keyboard Shortcuts"
                >
                  <HelpCircle size={18} />
                </button>

                {/* Cinema Mode (Lights Off) Toggle */}
                {onToggleCinema && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleCinema(); }}
                    className={`${styles.controlBtn} ${isLightsOff ? styles.cinemaActiveBtn : ''}`}
                    title={isLightsOff ? 'Cinema Mode: Turn Lights On (C)' : 'Cinema Mode: Turn Lights Off (C)'}
                    aria-label="Toggle Cinema Mode"
                  >
                    <Lightbulb size={18} color={isLightsOff ? '#fbbf24' : 'currentColor'} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTheater(); }}
                  className={`${styles.controlBtn} ${styles.theaterBtn}`}
                  title="Theater Mode (T)"
                  aria-label="Toggle Theater Mode"
                >
                  <Layout size={18} />
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className={styles.controlBtn}
                  title="Fullscreen (F)"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
