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
}

export default function VideoPlayer({
  episodeId,
  videoUrl,
  title,
  episodeNumber,
  nextEpisodeUrl,
  onToggleTheater
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewLoggedRef = useRef(false);

  // Reload video element on URL change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    viewLoggedRef.current = false;
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [episodeId, videoUrl]);

  // Setup heartbeat progress sync & analytics view log
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

      if (!viewLoggedRef.current && currentTime >= 10) {
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Playback error:', err);
        });
      }
    }
  };

  // Handle container tap/click: On mobile, tapping outside control buttons toggles/closes controls & settings without pausing video
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Ignore clicks directly inside interactive control buttons or speed menu
    if (
      target.closest(`.${styles.bottomControls}`) || 
      target.closest(`.${styles.speedSelectorContainer}`) ||
      target.closest(`.${styles.bigPlayTrigger}`)
    ) {
      return;
    }

    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 768;

    if (isMobileScreen) {
      // MOBILE ONLY: Tapping outside closes settings & toggles controls WITHOUT pausing video!
      if (showSpeedMenu) {
        setShowSpeedMenu(false);
        return;
      }

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
      // DESKTOP: Clicking video area toggles play/pause
      togglePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
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
  }, [duration, isPlaying, isMuted, volume, isFullscreen, isTheater]);

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

  // Strip duplicate "Episode X" string from title if already present
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
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        className={styles.videoElement}
        preload="metadata"
        playsInline
      />

      {/* Premium overlay controls */}
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
              {/* Playback speed selector */}
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

              {/* Theater Mode Toggle */}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); toggleTheater(); }} 
                className={`${styles.controlBtn} ${styles.theaterBtn}`} 
                title="Theater Mode" 
                aria-label="Toggle Theater Mode"
              >
                <Layout size={18} />
              </button>

              {/* Fullscreen Toggle */}
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
    </div>
  );
}
