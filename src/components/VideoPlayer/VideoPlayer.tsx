'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, SkipForward, Layout
} from 'lucide-react';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  episodeId: string;
  videoUrl: string;
  title: string;
  episodeNumber: number;
  nextEpisodeUrl?: string | null;
  onToggleTheater?: () => void;
  posterUrl?: string;
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
  onToggleTheater,
  posterUrl
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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
    if (!VAST_TAG_URL) return; // Skip if no VAST URL configured
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

  // Reload video element on URL change; reset ad state
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAdPlaying(false);
    setAdInitialized(false);
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

    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [episodeId, videoUrl]);

  // ─── IMA: Initialize ad display container + loader ──────────────────────
  const initializeIMA = () => {
    if (!imaReady || !window.google?.ima) return;
    if (!videoRef.current || !adContainerRef.current) return;
    if (adInitialized) return;

    const ima = window.google.ima;

    // Create AdDisplayContainer
    const adDisplayContainer = new ima.AdDisplayContainer(
      adContainerRef.current,
      videoRef.current
    );
    adDisplayContainerRef.current = adDisplayContainer;

    // Create AdsLoader
    const adsLoader = new ima.AdsLoader(adDisplayContainer);
    adsLoaderRef.current = adsLoader;

    // Listen for ads loaded
    adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded,
      false
    );

    // Listen for ad error (just play main video)
    adsLoader.addEventListener(
      ima.AdErrorEvent.Type.AD_ERROR,
      onAdError,
      false
    );

    // Build ads request
    const adsRequest = new ima.AdsRequest();
    adsRequest.adTagUrl = VAST_TAG_URL;

    // Match ad size to video dimensions
    const w = containerRef.current?.offsetWidth || 640;
    const h = containerRef.current?.offsetHeight || 360;
    adsRequest.linearAdSlotWidth = w;
    adsRequest.linearAdSlotHeight = h;
    adsRequest.nonLinearAdSlotWidth = w;
    adsRequest.nonLinearAdSlotHeight = 150;

    // Initialize the container (must be called via user gesture)
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

    // Ad events
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
      if (isPlaying) {
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
    if (adPlaying) return; // Don't interfere while ad is running

    if (!isPlaying) {
      // First play — run IMA pre-roll if VAST is configured & not yet done
      if (VAST_TAG_URL && imaReady && !adInitialized) {
        initializeIMA();
        return; // IMA will call playMainVideo after ad
      }
      playMainVideo();
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Handle container tap/click
  const handleContainerClick = (e: React.MouseEvent) => {
    if (adPlaying) return; // Let IMA handle clicks during ad

    const target = e.target as HTMLElement;

    if (showSpeedMenu) {
      if (!target.closest(`.${styles.speedDropdown}`)) {
        setShowSpeedMenu(false);
        return;
      }
    }

    if (
      target.closest(`.${styles.bottomControls}`) ||
      target.closest(`.${styles.bigPlayTrigger}`)
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
          if (isPlaying) {
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
      setDuration(videoRef.current.duration);
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
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.max(0, videoRef.current.currentTime - 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.min(duration || 0, videoRef.current.currentTime + 5);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration, isPlaying, isMuted, volume, isFullscreen, isTheater, adPlaying]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (nextEpisodeUrl) {
      router.push(nextEpisodeUrl);
    } else {
      alert('You have completed this series! Check out other series in our catalog.');
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
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`${styles.playerContainer} ${isTheater ? styles.theaterMode : ''}`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        className={styles.videoElement}
        preload="metadata"
        playsInline
      />

      {/* Google IMA Ad Container — rendered on top of video, hidden when no ad */}
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

      {/* Premium overlay controls — hidden while ad plays */}
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
              {/* Play/Pause & Volume */}
              <div className={styles.leftControls}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className={styles.controlBtn}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                {nextEpisodeUrl && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); router.push(nextEpisodeUrl); }}
                    className={styles.controlBtn}
                    aria-label="Next Episode"
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                )}

                <div className={styles.volumeGroup}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className={styles.controlBtn}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
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

              {/* Speeds, Theater, Fullscreen */}
              <div className={styles.rightControls}>
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
                      {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
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
                  onClick={(e) => { e.stopPropagation(); toggleTheater(); }}
                  className={`${styles.controlBtn} ${styles.theaterBtn}`}
                  title="Theater Mode"
                  aria-label="Toggle Theater Mode"
                >
                  <Layout size={18} />
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className={styles.controlBtn}
                  title="Fullscreen"
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
