'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Video, Plus, Search, Edit2, Trash2, X, AlertCircle, Clock, Camera, 
  Image as ImageIcon, UploadCloud, Minimize2, Maximize2, Tv, Film, 
  ExternalLink, Play, CheckCircle2, ChevronDown, ChevronUp, ChevronsLeft,
  ChevronLeft, ChevronRight, ChevronsRight, LayoutGrid, Table as TableIcon,
  Copy, Check, Layers, Sparkles, FolderOpen, Download, Sliders, RotateCcw,
  Sun, Contrast, Eye, CheckCheck, Zap
} from 'lucide-react';
import FileUploader from '@/components/FileUploader/FileUploader';
import { getR2Url } from '@/utils/r2';
import styles from './episodes.module.css';
import adminStyles from '../admin.module.css';

interface Series {
  id: string;
  title: string;
  slug?: string;
  release_year?: number;
  poster_image_key?: string;
  cover_image_key?: string;
  studio?: string;
  is_published?: boolean;
  created_at?: string;
}

interface Season {
  id: string;
  series_id: string;
  season_number: number;
  title: string;
}

interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  description: string;
  video_key: string;
  thumbnail_key: string;
  thumbnail_options?: string[];
  duration_seconds: number;
  release_date: string;
  is_published: boolean;
  created_at: string;
  seasons?: {
    title: string;
    series?: {
      title: string;
    };
  };
}

interface BatchEpisodeFile {
  id: string;
  file: File;
  seriesId?: string;
  seasonId?: string;
  episodeNumber: number;
  title: string;
  releaseDate?: string;
  durationSeconds: number;
  videoKey: string;
  thumbnailKey: string;
  status: 'metadata' | 'pending' | 'uploading' | 'saving' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
  isPublished: boolean;
  isPreview: boolean;
}

const ImageSize = ({ r2Key }: { r2Key: string }) => {
  const [size, setSize] = useState<string>('Loading...');

  useEffect(() => {
    let active = true;
    const url = getR2Url(r2Key, 'thumbnail');

    const fetchSize = async () => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!active) return;
        
        const contentLength = res.headers.get('content-length');
        if (contentLength) {
          const bytes = parseInt(contentLength, 10);
          if (bytes > 0) {
            setSize(formatBytes(bytes));
            return;
          }
        }

        const getRes = await fetch(url, { headers: { 'Range': 'bytes=0-0' } });
        if (!active) return;
        
        const contentRange = getRes.headers.get('content-range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match && match[1]) {
            const bytes = parseInt(match[1], 10);
            setSize(formatBytes(bytes));
            return;
          }
        }

        setSize('Size Unknown');
      } catch (e) {
        if (active) setSize('Size Unknown');
      }
    };

    const formatBytes = (bytes: number) => {
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
      return `${(bytes / 1024).toFixed(1)} KB`;
    };

    fetchSize();
    return () => {
      active = false;
    };
  }, [r2Key]);

  return (
    <span 
      style={{ 
        fontSize: '0.65rem', 
        color: 'var(--foreground-muted)', 
        fontWeight: 'normal',
        marginLeft: '0.5rem',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '0.08rem 0.3rem',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {size}
    </span>
  );
};

export default function AdminEpisodesPage() {
  const [episodesList, setEpisodesList] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLaunchYear, setSelectedLaunchYear] = useState('all');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'missing_video' | 'missing_thumb'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'episodes'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'accordion' | 'table'>('accordion');
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLaunchYear, selectedSeriesFilter, statusFilter, mediaFilter, sortBy, sortOrder, pageSize]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormLocked, setIsFormLocked] = useState(false);
  
  const [formSeriesId, setFormSeriesId] = useState('');
  const [formSeasonId, setFormSeasonId] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [description, setDescription] = useState('');
  const [videoKey, setVideoKey] = useState('');
  const [thumbnailKey, setThumbnailKey] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(1440); // 24 mins default
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sessionKeys, setSessionKeys] = useState<string[]>([]);
  const originalKeysRef = useRef<string[]>([]);
  const scrubVideoRef = useRef<HTMLVideoElement>(null);
  const [capturedFrameUrl, setCapturedFrameUrl] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [savedThumbnails, setSavedThumbnails] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  // Batch Upload Modal states
  interface UploadBatch {
    id: string;
    seriesId: string;
    seasonId: string;
    files: BatchEpisodeFile[];
    schedulingType: 'none' | '1day' | '3days' | '1week' | '2weeks' | '1month';
    baseReleaseDate: string;
    status: 'editing' | 'pending' | 'uploading' | 'success' | 'error';
    isMinimized: boolean;
  }

  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const batchesRef = useRef<UploadBatch[]>([]);
  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const activeBatch = batches.find(b => b.id === activeBatchId);
  const activeBatchFiles = activeBatch?.files || [];
  const isActiveUploading = activeBatch?.status === 'uploading';
  const activeSeriesId = activeBatch?.seriesId || '';
  const activeSeasonId = activeBatch?.seasonId || '';
  const activeBaseReleaseDate = activeBatch?.baseReleaseDate || '';
  const activeSchedulingType = activeBatch?.schedulingType || 'none';
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Thumbnail Studio Modal states
  const [isThumbModalOpen, setIsThumbModalOpen] = useState(false);
  const [thumbModalEpisode, setThumbModalEpisode] = useState<Episode | null>(null);
  const [batchOptions, setBatchOptions] = useState<{ dataUrl: string; sizeKb: number; time?: number }[]>([]);
  const [capturedFrameSizeKb, setCapturedFrameSizeKb] = useState<number | null>(null);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const cancelGenerationRef = useRef<boolean>(false);
  const [thumbActiveTab, setThumbActiveTab] = useState<'auto' | 'scrub' | 'upload'>('auto');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [focusedMinutes, setFocusedMinutes] = useState<number[]>([]);
  const [excludedMinutes, setExcludedMinutes] = useState<number[]>([]);
  const [minuteInteractionMode, setMinuteInteractionMode] = useState<'focus' | 'exclude'>('focus');
  const [autoGenerateOnClick, setAutoGenerateOnClick] = useState<boolean>(false);
  const [skipSubtitles, setSkipSubtitles] = useState<boolean>(false);
  const [fpsPreset, setFpsPreset] = useState<'24fps' | '30fps' | '60fps' | 'smart'>('24fps');
  const [samplingMode, setSamplingMode] = useState<'serial' | 'random'>('serial');
  const [serialStepSec, setSerialStepSec] = useState<number>(1.0);
  const [targetOptionCount, setTargetOptionCount] = useState<number>(60);
  const [isAutoCountMode, setIsAutoCountMode] = useState<boolean>(true);
  const [timeframeWindow, setTimeframeWindow] = useState<'full' | 'first25' | 'first50' | 'first75' | 'middle50' | 'last75' | 'last50' | 'last25'>('full');
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [scrubIntensity, setScrubIntensity] = useState<'frame' | 'fine' | 'jog' | 'turbo'>('frame');
  const [scrubCurrentTime, setScrubCurrentTime] = useState<number>(0);
  const [isPlayingScrub, setIsPlayingScrub] = useState<boolean>(false);

  const getIntensityStepSec = (intensity = scrubIntensity) => {
    if (intensity === 'frame') return 0.0416; // ~1 Frame (1/24s)
    if (intensity === 'fine') return 0.2;
    if (intensity === 'jog') return 1.0;
    return 5.0; // turbo
  };

  const stepScrubVideo = (deltaSec: number) => {
    const video = scrubVideoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 600, video.currentTime + deltaSec));
    if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
      try { (video as any).fastSeek(target); } catch { video.currentTime = target; }
    } else {
      video.currentTime = target;
    }
    setScrubCurrentTime(target);
  };

  // Non-passive wheel event listener to prevent browser page scrolling during video scrubbing
  useEffect(() => {
    const video = scrubVideoRef.current;
    if (!video || thumbActiveTab !== 'scrub') return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = getIntensityStepSec();
      if (e.deltaY < 0) {
        stepScrubVideo(-step);
      } else {
        stepScrubVideo(step);
      }
    };

    video.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      video.removeEventListener('wheel', handleWheel);
    };
  }, [thumbActiveTab, scrubIntensity]);

  // Helper: Calculate active timeframe duration in seconds
  const getActiveTimeframeDuration = (mins: number[] = focusedMinutes, windowMode: string = timeframeWindow) => {
    let windowFraction = 1.0;
    if (windowMode === 'first25' || windowMode === 'last25') windowFraction = 0.25;
    else if (windowMode === 'first50' || windowMode === 'last50' || windowMode === 'middle50') windowFraction = 0.50;
    else if (windowMode === 'first75' || windowMode === 'last75') windowFraction = 0.75;

    if (mins.length > 0) {
      return mins.length * 60 * windowFraction;
    }
    const totalSec = videoDuration || 600;
    return totalSec * windowFraction;
  };

  // Smart Sync Handlers: Step -> Count & Count -> Step (Uncapped)
  const handleStepChange = (newStep: number, mins = focusedMinutes, win = timeframeWindow) => {
    setSerialStepSec(newStep);
    if (newStep > 0 && isAutoCountMode) {
      const activeSpan = getActiveTimeframeDuration(mins, win);
      const calculatedCount = Math.max(1, Math.floor(activeSpan / newStep));
      setTargetOptionCount(calculatedCount);
    }
  };

  const handleCountChange = (newCount: number, mins = focusedMinutes, win = timeframeWindow) => {
    if (newCount === 0) {
      setIsAutoCountMode(true);
      const activeSpan = getActiveTimeframeDuration(mins, win);
      const step = serialStepSec > 0 ? serialStepSec : 1.0;
      const calculatedCount = Math.max(1, Math.floor(activeSpan / step));
      setTargetOptionCount(calculatedCount);
      return;
    }

    setIsAutoCountMode(false);
    setTargetOptionCount(newCount);
    if (samplingMode === 'serial' && newCount > 0) {
      const activeSpan = getActiveTimeframeDuration(mins, win);
      const matchingStep = Math.round((activeSpan / newCount) * 100) / 100;
      if (matchingStep >= 0.01 && matchingStep <= 300) {
        setSerialStepSec(matchingStep);
      }
    }
  };
  const [cpuMode, setCpuMode] = useState<'eco' | 'fast'>('eco');
  const [localScrubFile, setLocalScrubFile] = useState<File | null>(null);
  const [isRemoteVideoLoaded, setIsRemoteVideoLoaded] = useState(false);
  const [thumbStudioActiveKey, setThumbStudioActiveKey] = useState('');
  const [thumbStudioSavedList, setThumbStudioSavedList] = useState<string[]>([]);
  const [isSavedGalleryOpen, setIsSavedGalleryOpen] = useState(false);
  const [savingThumbStudio, setSavingThumbStudio] = useState(false);
  const [thumbStudioError, setThumbStudioError] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [imageBrightness, setImageBrightness] = useState<number>(100);
  const [imageContrast, setImageContrast] = useState<number>(100);
  const [imageSaturation, setImageSaturation] = useState<number>(100);
  const [thumbResolution, setThumbResolution] = useState<'native' | '1080p' | '720p' | '4k'>('native');
  const [thumbQualityMode, setThumbQualityMode] = useState<'ultra' | 'max' | 'high' | 'standard'>('ultra');
  const [thumbImageFormat, setThumbImageFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');

  // Clipboard Paste Listener for Thumbnail Studio (Press Ctrl+V to instantly paste & upload)
  useEffect(() => {
    if (!isThumbModalOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file && thumbModalEpisode) {
            setSavingThumbStudio(true);
            setThumbStudioError(null);
            try {
              const filename = `pasted-thumb-${Date.now()}.jpg`;
              const presignRes = await fetch('/api/admin/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, contentType: file.type || 'image/jpeg' })
              });
              const presignData = await presignRes.json();
              if (!presignRes.ok) throw new Error(presignData.error || 'Failed to get upload signature');

              const uploadRes = await fetch(presignData.url, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'image/jpeg' },
                body: file
              });
              if (!uploadRes.ok) throw new Error('Failed to upload pasted image');

              await handleCustomThumbnailUploadComplete(presignData.key);
            } catch (err: any) {
              setThumbStudioError(err.message || 'Failed to upload pasted image');
            } finally {
              setSavingThumbStudio(false);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isThumbModalOpen, thumbModalEpisode, thumbStudioSavedList]);

  // Memoize scrubVideoSrc so the video element never reloads or resets to 0:00 on state re-renders
  const scrubVideoSrc = useMemo(() => {
    if (localScrubFile) {
      return URL.createObjectURL(localScrubFile);
    }
    if (thumbModalEpisode?.video_key) {
      return getR2Url(thumbModalEpisode.video_key, 'video');
    }
    return '';
  }, [localScrubFile, thumbModalEpisode?.video_key]);



  // Load draft check on mount
  useEffect(() => {
    const saved = localStorage.getItem('episode_form_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formSeriesId || parsed.formSeasonId || parsed.videoKey || parsed.thumbnailKey) {
          setHasDraft(true);
        } else {
          localStorage.removeItem('episode_form_draft');
        }
      } catch (e) {
        localStorage.removeItem('episode_form_draft');
      }
    }
  }, []);

  // Save draft on state change (only for creations, not edits)
  useEffect(() => {
    if (isModalOpen && !editingId) {
      const draft = {
        editingId,
        formSeriesId,
        formSeasonId,
        episodeNumber,
        title,
        description,
        videoKey,
        thumbnailKey,
        durationSeconds,
        releaseDate,
        isPublished,
        savedThumbnails,
        isPreview
      };
      localStorage.setItem('episode_form_draft', JSON.stringify(draft));
    }
  }, [
    isModalOpen, editingId, formSeriesId, formSeasonId, episodeNumber, title,
    description, videoKey, thumbnailKey, durationSeconds, releaseDate, isPublished,
    savedThumbnails, isPreview
  ]);

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem('episode_form_draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setEditingId(d.editingId || null);
        setFormSeriesId(d.formSeriesId || '');
        setFormSeasonId(d.formSeasonId || '');
        setEpisodeNumber(d.episodeNumber || 1);
        setTitle(d.title || '');
        setDescription(d.description || '');
        setVideoKey(d.videoKey || '');
        setThumbnailKey(d.thumbnailKey || '');
        setDurationSeconds(d.durationSeconds || 1440);
        setReleaseDate(d.releaseDate || '');
        setIsPublished(d.isPublished || false);
        setSavedThumbnails(d.savedThumbnails || []);
        setIsPreview(d.isPreview || false);
        
        setIsModalOpen(true);
        setHasDraft(false);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('episode_form_draft');
    setHasDraft(false);
  };

  const handleCloseModal = () => {
    localStorage.removeItem('episode_form_draft');
    setHasDraft(false);
    setIsModalOpen(false);
  };

  const generateThumbnailFromSource = (source: File | string) => {
    let videoUrl = '';
    const isRemote = typeof source === 'string';
    if (isRemote) {
      videoUrl = getR2Url(source as string, 'video');
    } else {
      videoUrl = URL.createObjectURL(source as File);
    }

    const video = document.createElement('video');
    if (isRemote) {
      video.crossOrigin = 'anonymous'; // Enable CORS request for canvas capture
    }
    video.src = videoUrl;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      setDurationSeconds(Math.round(video.duration));
      const randomPercent = 0.15 + Math.random() * 0.7;
      video.currentTime = video.duration * randomPercent;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setIsGeneratingThumbnail(true);
          canvas.toBlob(async (blob) => {
            if (!blob) {
              setIsGeneratingThumbnail(false);
              return;
            }
            try {
              const filename = `auto-thumb-${Date.now()}.jpg`;
              const presignRes = await fetch('/api/admin/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, contentType: 'image/jpeg' })
              });
              const presignData = await presignRes.json();
              if (presignRes.ok) {
                const { url, key } = presignData;
                const uploadRes = await fetch(url, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'image/jpeg' },
                  body: blob
                });
                if (uploadRes.ok) {
                  setThumbnailKey(key);
                  setSessionKeys((prev) => [...prev, key]);
                }
              }
            } catch (e) {
              console.error('Failed to upload auto thumbnail:', e);
            } finally {
              setIsGeneratingThumbnail(false);
              if (!isRemote) URL.revokeObjectURL(videoUrl);
            }
          }, 'image/jpeg', 0.95);
        } catch (canvasErr) {
          console.error('SecurityError or canvas drawing failed:', canvasErr);
          setError('Could not generate thumbnail from remote video due to browser security restrictions. Please select the video file locally to extract frames.');
          setIsGeneratingThumbnail(false);
          if (!isRemote) URL.revokeObjectURL(videoUrl);
        }
      } else {
        if (!isRemote) URL.revokeObjectURL(videoUrl);
      }
    };

    video.onerror = () => {
      console.error('Error loading video source for thumbnail generation.');
      if (!isRemote) URL.revokeObjectURL(videoUrl);
    };
  };

  useEffect(() => {
    setTitle(`Episode ${episodeNumber}`);
  }, [episodeNumber]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [episodesRes, seasonsRes, seriesRes] = await Promise.all([
        fetch('/api/admin/episodes'),
        fetch('/api/admin/seasons'),
        fetch('/api/admin/series')
      ]);

      const episodesData = await episodesRes.json();
      const seasonsData = await seasonsRes.json();
      const seriesData = await seriesRes.json();

      if (!episodesRes.ok) throw new Error(episodesData.error || 'Failed to load episodes');
      if (!seasonsRes.ok) throw new Error(seasonsData.error || 'Failed to load seasons');
      if (!seriesRes.ok) throw new Error(seriesData.error || 'Failed to load series');

      setEpisodesList(episodesData.episodes || []);
      setSeasonsList(seasonsData.seasons || []);
      setSeriesList(seriesData.series || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = (preselectedSeriesId?: string, preselectedSeasonId?: string) => {
    setEditingId(null);
    
    if (preselectedSeriesId) {
      setIsFormLocked(true);
      setFormSeriesId(preselectedSeriesId);
      
      const relevantSeasons = seasonsList.filter(s => s.series_id === preselectedSeriesId);
      const targetSeasonId = preselectedSeasonId || relevantSeasons[0]?.id || '';
      setFormSeasonId(targetSeasonId);
      
      const seriesEpisodes = episodesList.filter(e => {
        const season = seasonsList.find(s => s.id === e.season_id);
        return season && season.series_id === preselectedSeriesId;
      });
      const nextEpNum = seriesEpisodes.length > 0 ? Math.max(...seriesEpisodes.map(e => e.episode_number)) + 1 : 1;
      setEpisodeNumber(nextEpNum);
    } else {
      setIsFormLocked(false);
      const initialSeriesId = seriesList[0]?.id || '';
      setFormSeriesId(initialSeriesId);
      
      const relevantSeasons = seasonsList.filter(s => s.series_id === initialSeriesId);
      const initialSeasonId = relevantSeasons[0]?.id || '';
      setFormSeasonId(initialSeasonId);
      
      setEpisodeNumber(episodesList.length > 0 ? Math.max(...episodesList.map(e => e.episode_number)) + 1 : 1);
    }

    setIsPreview(false);
    setDescription('');
    setVideoKey('');
    setThumbnailKey('');
    setDurationSeconds(1440);
    setVideoFile(null);
    setIsGeneratingThumbnail(false);
    setSavedThumbnails([]);
    originalKeysRef.current = [];
    setSessionKeys([]);
    
    // Format current date for datetime-local (YYYY-MM-DDTHH:MM) at 12:00 AM default
    setReleaseDate(formatLocalDateToMidnight(new Date()));
    
    setIsPublished(false);
    setError(null);

    setIsModalOpen(true);
  };

  const handleOpenEdit = (ep: Episode) => {
    setEditingId(ep.id);
    setIsFormLocked(false);
    
    // Find season to determine series ID
    const season = seasonsList.find(s => s.id === ep.season_id);
    const sId = season ? season.series_id : (seriesList[0]?.id || '');
    
    setFormSeriesId(sId);
    setFormSeasonId(ep.season_id);
    setEpisodeNumber(ep.episode_number);
    setTitle(ep.title.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, ''));
    setIsPreview(ep.title.startsWith('[Preview]') || ep.title.startsWith('[Trailer]'));
    setDescription(ep.description || '');
    setVideoKey(ep.video_key);
    setThumbnailKey(ep.thumbnail_key || '');
    setDurationSeconds(ep.duration_seconds || 1440);
    setVideoFile(null);
    setIsGeneratingThumbnail(false);
    setSavedThumbnails(ep.thumbnail_options && ep.thumbnail_options.length > 0 ? ep.thumbnail_options : (ep.thumbnail_key ? [ep.thumbnail_key] : []));
    originalKeysRef.current = [ep.video_key, ep.thumbnail_key, ...(ep.thumbnail_options || [])].filter(Boolean);
    setSessionKeys([]);
    
    // Format release date for input at midnight
    setReleaseDate(formatLocalDateToMidnight(ep.release_date));
    
    setIsPublished(ep.is_published);
    setError(null);

    setIsModalOpen(true);
  };

  // When series is changed inside the form, update season choices
  const handleFormSeriesChange = (seriesIdVal: string) => {
    setFormSeriesId(seriesIdVal);
    const relevantSeasons = seasonsList.filter(s => s.series_id === seriesIdVal);
    setFormSeasonId(relevantSeasons[0]?.id || '');
  };



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!formSeasonId) {
      setError('You must select or create a season first.');
      setSaving(false);
      return;
    }

    const cleanTitle = title.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '');
    const finalTitle = isPreview ? `[Preview] ${cleanTitle}` : cleanTitle;

    const matchDate = (releaseDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    const finalReleaseDate = matchDate 
      ? `${matchDate[1]}-${matchDate[2]}-${matchDate[3]}T00:00:00.000Z` 
      : new Date().toISOString();

    const payload = {
      id: editingId,
      season_id: formSeasonId,
      episode_number: episodeNumber,
      title: finalTitle,
      description,
      video_key: videoKey,
      thumbnail_key: thumbnailKey,
      thumbnail_options: savedThumbnails,
      duration_seconds: durationSeconds,
      release_date: finalReleaseDate,
      is_published: isPublished,
      metadata_locks: {},
      metadata_provenance: {},
      metadata_versions: [],
      raw_provider_payload: {}
    };

    try {
      const url = '/api/admin/episodes';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save episode');

      // Clean up unused/discarded files from Cloudflare R2
      const finalKeysToKeep = new Set([videoKey, thumbnailKey, ...savedThumbnails]);
      const keysToCheck = [...originalKeysRef.current, ...sessionKeys];
      const keysToDelete = keysToCheck.filter((key) => key && !finalKeysToKeep.has(key));

      keysToDelete.forEach(async (key) => {
        try {
          await fetch('/api/admin/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
          });
        } catch (delErr) {
          console.error(`Failed to delete unused R2 key "${key}":`, delErr);
        }
      });

      localStorage.removeItem('episode_form_draft');
      setHasDraft(false);
      setIsModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Batch Upload Handlers ---
  const cleanFilenameToTitle = (filename: string, defaultEpNum: number): string => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    let cleaned = nameWithoutExt.replace(/[.\-_]+/g, ' ');
    const epMatch = cleaned.match(/(?:ep|episode|e|part|p)[ ]*(\d+)/i);
    if (epMatch && epMatch[1]) {
      return `Episode ${parseInt(epMatch[1], 10)}`;
    }
    const numMatch = cleaned.match(/\b(\d+)\b/);
    if (numMatch && numMatch[1]) {
      return `Episode ${parseInt(numMatch[1], 10)}`;
    }
    return `Episode ${defaultEpNum}`;
  };

  const extractEpisodeNumberFromFilename = (filename: string, defaultVal: number): number => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const cleaned = nameWithoutExt.replace(/[.\-_]+/g, ' ');
    const epMatch = cleaned.match(/(?:ep|episode|e|part|p)[ ]*(\d+)/i);
    if (epMatch && epMatch[1]) {
      return parseInt(epMatch[1], 10);
    }
    const numMatch = cleaned.match(/\b(\d+)\b/);
    if (numMatch && numMatch[1]) {
      return parseInt(numMatch[1], 10);
    }
    return defaultVal;
  };

  /**
   * Formats a Date object to YYYY-MM-DDT00:00 in local time (always 12:00 AM / 00:00)
   */
  const formatLocalDateToMidnight = (d?: Date | string | null): string => {
    if (!d) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T00:00`;
    }
    
    if (typeof d === 'string') {
      const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}T00:00`;
      }
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00`;
      }
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00`;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00`;
  };

  const setQuickReleaseDate = (preset: 'today' | 'yesterday' | 'week_ago' | 'month_ago' | 'next_week') => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (preset === 'yesterday') d.setDate(d.getDate() - 1);
    else if (preset === 'week_ago') d.setDate(d.getDate() - 7);
    else if (preset === 'month_ago') d.setMonth(d.getMonth() - 1);
    else if (preset === 'next_week') d.setDate(d.getDate() + 7);
    setReleaseDate(formatLocalDateToMidnight(d));
  };

  const extractVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration) || 1440;
        URL.revokeObjectURL(videoUrl);
        resolve(duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        resolve(1440);
      };
    });
  };

  const handleOpenBatchCreate = (preselectedSeriesId?: string, preselectedSeasonId?: string) => {
    const newBatchId = 'batch-group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const seriesId = preselectedSeriesId || (seriesList[0]?.id || '');
    const relevantSeasons = seasonsList.filter(s => s.series_id === seriesId);
    const seasonId = preselectedSeasonId || (relevantSeasons[0]?.id || '');

    const newBatch: UploadBatch = {
      id: newBatchId,
      seriesId,
      seasonId,
      files: [],
      schedulingType: 'none',
      baseReleaseDate: formatLocalDateToMidnight(new Date()),
      status: 'editing',
      isMinimized: false
    };

    setBatches(prev => [...prev, newBatch]);
    setActiveBatchId(newBatchId);
  };

  const calculateItemReleaseDate = (baseDateStr: string, schedulingType: string, index: number): string => {
    let year: number;
    let month: number;
    let day: number;

    const match = (baseDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
      day = now.getDate();
    }

    const targetDate = new Date(year, month, day, 0, 0, 0, 0);

    if (schedulingType === '1day') {
      targetDate.setDate(targetDate.getDate() + index);
    } else if (schedulingType === '3days') {
      targetDate.setDate(targetDate.getDate() + (index * 3));
    } else if (schedulingType === '1week') {
      targetDate.setDate(targetDate.getDate() + (index * 7));
    } else if (schedulingType === '2weeks') {
      targetDate.setDate(targetDate.getDate() + (index * 14));
    } else if (schedulingType === '1month') {
      targetDate.setMonth(targetDate.getMonth() + index);
    }

    return formatLocalDateToMidnight(targetDate);
  };

  const handleApplySmartDates = (schedType?: string) => {
    const targetType = schedType || activeSchedulingType;
    updateActiveBatch(b => {
      const updatedFiles = b.files.map((file, idx) => ({
        ...file,
        releaseDate: calculateItemReleaseDate(b.baseReleaseDate, targetType, idx)
      }));
      return {
        schedulingType: targetType as any,
        files: updatedFiles
      };
    });
  };

  const handleRenumberFiles = (startNum: number = 1) => {
    updateActiveBatch(b => {
      const updatedFiles = b.files.map((file, idx) => {
        const epNum = startNum + idx;
        return {
          ...file,
          episodeNumber: epNum,
          title: `Episode ${epNum}`
        };
      });
      return { files: updatedFiles };
    });
  };

  const handleApplyTitleTemplate = (template: 'episode' | 'ova' | 'special' | 'part') => {
    updateActiveBatch(b => {
      const updatedFiles = b.files.map((file) => {
        let prefix = 'Episode';
        if (template === 'ova') prefix = 'OVA';
        if (template === 'special') prefix = 'Special';
        if (template === 'part') prefix = 'Part';
        return {
          ...file,
          title: `${prefix} ${file.episodeNumber}`
        };
      });
      return { files: updatedFiles };
    });
  };

  const handleToggleAllPublish = (isPub: boolean) => {
    updateActiveBatch(b => ({
      files: b.files.map(f => ({ ...f, isPublished: isPub }))
    }));
  };

  const handleToggleAllPreview = (isPrev: boolean) => {
    updateActiveBatch(b => ({
      files: b.files.map(f => ({ ...f, isPreview: isPrev }))
    }));
  };

  const handleRemoveBatchFile = (fileId: string) => {
    updateActiveBatch(b => ({
      files: b.files.filter(f => f.id !== fileId)
    }));
  };

  const handleBatchItemSeriesChange = (itemId: string, newSeriesId: string) => {
    const relevantSeasons = seasonsList.filter(s => s.series_id === newSeriesId);
    const firstSeasonId = relevantSeasons[0]?.id || '';
    setBatches(prev => prev.map(b => ({
      ...b,
      files: b.files.map(f => f.id === itemId ? { ...f, seriesId: newSeriesId, seasonId: firstSeasonId } : f)
    })));
  };

  const handleBatchSeriesChange = (seriesIdVal: string) => {
    const relevantSeasons = seasonsList.filter(s => s.series_id === seriesIdVal);
    const seasonIdVal = relevantSeasons[0]?.id || '';
    
    updateActiveBatch(b => {
      let updatedFiles = b.files;
      if (b.files.length > 0) {
        const seriesEpisodes = episodesList.filter(e => {
          const season = seasonsList.find(s => s.id === e.season_id);
          return season && season.series_id === seriesIdVal;
        });
        const startEpNum = seriesEpisodes.length > 0 ? Math.max(...seriesEpisodes.map(e => e.episode_number)) + 1 : 1;
        updatedFiles = b.files.map((bf, idx) => {
          const parsedEp = extractEpisodeNumberFromFilename(bf.file.name, startEpNum + idx);
          return {
            ...bf,
            seriesId: seriesIdVal,
            seasonId: seasonIdVal,
            episodeNumber: parsedEp,
            title: cleanFilenameToTitle(bf.file.name, parsedEp)
          };
        });
      }
      return {
        seriesId: seriesIdVal,
        seasonId: seasonIdVal,
        files: updatedFiles
      };
    });
  };

  const updateActiveBatch = (updater: (b: UploadBatch) => Partial<UploadBatch>) => {
    if (!activeBatchId) return;
    setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, ...updater(b) } : b));
  };

  const processBatchSelectedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeBatchId) return;
    const active = batches.find(b => b.id === activeBatchId);
    if (!active) return;

    const newVideoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    if (newVideoFiles.length === 0) return;

    const seriesEpisodes = episodesList.filter(e => {
      const season = seasonsList.find(s => s.id === e.season_id);
      return season && season.series_id === active.seriesId;
    });
    const startEpNum = seriesEpisodes.length > 0 ? Math.max(...seriesEpisodes.map(e => e.episode_number)) + 1 : 1;

    const newItems: BatchEpisodeFile[] = newVideoFiles.map((file, idx) => {
      const totalIdx = (active.files?.length || 0) + idx;
      const epNum = extractEpisodeNumberFromFilename(file.name, startEpNum + idx);
      const computedDate = calculateItemReleaseDate(active.baseReleaseDate, active.schedulingType, totalIdx);
      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        seriesId: active.seriesId,
        seasonId: active.seasonId,
        episodeNumber: epNum,
        title: cleanFilenameToTitle(file.name, epNum),
        releaseDate: computedDate,
        durationSeconds: 1440,
        videoKey: '',
        thumbnailKey: '',
        status: 'pending',
        progress: 0,
        isPublished: false,
        isPreview: false
      };
    });

    setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, files: [...b.files, ...newItems] } : b));

    for (const item of newItems) {
      try {
        const duration = await extractVideoDuration(item.file);
        setBatches(prev => prev.map(b => b.id === activeBatchId ? {
          ...b,
          files: b.files.map(bf => bf.id === item.id ? { ...bf, durationSeconds: duration, thumbnailKey: '', status: 'pending' } : bf)
        } : b));
      } catch (err) {
        console.error('Error extracting video duration:', err);
      }
    }
  };

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    processBatchSelectedFiles(e.dataTransfer.files);
  };

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processBatchSelectedFiles(e.target.files);
  };

  const updateBatchItemField = (id: string, field: keyof BatchEpisodeFile, value: any) => {
    setBatches(prev => prev.map(b => {
      const hasItem = b.files.some(f => f.id === id);
      if (hasItem) {
        return {
          ...b,
          files: b.files.map(f => f.id === id ? { ...f, [field]: value } : f)
        };
      }
      return b;
    }));
  };

  const handleCloseBatchModal = () => {
    if (!activeBatchId) return;
    const active = batches.find(b => b.id === activeBatchId);
    if (!active) {
      setActiveBatchId(null);
      return;
    }
    if (active.status === 'uploading') return;

    if (active.status === 'pending' && active.files.length === 0) {
      setBatches(prev => prev.filter(b => b.id !== activeBatchId));
    }
    if (active.status === 'success' || active.status === 'error') {
      setBatches(prev => prev.filter(b => b.id !== activeBatchId));
    }
    setActiveBatchId(null);
  };

  const handleStartBatchUpload = () => {
    if (!activeBatchId) return;
    const active = batches.find(b => b.id === activeBatchId);
    if (!active || active.files.length === 0) return;

    setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, isMinimized: true, status: 'pending' } : b));
    setActiveBatchId(null);
  };

  const uploadSingleBatch = async (batchId: string) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: 'uploading' } : b));

    // Allow React state update to flush, then read from ref
    await new Promise(resolve => setTimeout(resolve, 50));

    const initialBatch = batchesRef.current.find(b => b.id === batchId);
    if (!initialBatch) return;

    const filesToUpload = initialBatch.files;

    for (let i = 0; i < filesToUpload.length; i++) {
      const currentBatch = batchesRef.current.find(b => b.id === batchId);
      const bf = currentBatch?.files?.[i];
      if (!bf || bf.status === 'success') continue;

      setBatches(prev => prev.map(b => b.id === batchId ? {
        ...b,
        files: b.files.map(item => item.id === bf.id ? { ...item, status: 'uploading', progress: 0 } : item)
      } : b));

      try {
        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: bf.file.name,
            contentType: bf.file.type
          })
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error || 'Failed to initialize video upload');

        const { url, key: videoKeyVal } = presignData;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', bf.file.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              setBatches(prev => prev.map(b => b.id === batchId ? {
                ...b,
                files: b.files.map(item => item.id === bf.id ? { ...item, progress: pct } : item)
              } : b));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204 || xhr.status === 201) {
              resolve();
            } else {
              reject(new Error(`Video upload failed (Status: ${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during video upload'));
          xhr.send(bf.file);
        });

        setBatches(prev => prev.map(b => b.id === batchId ? {
          ...b,
          files: b.files.map(item => item.id === bf.id ? { ...item, status: 'saving', videoKey: videoKeyVal } : item)
        } : b));

        const freshBatch = batchesRef.current.find(b => b.id === batchId);
        if (!freshBatch) throw new Error('Batch data lost during upload');

        const releaseDateStr = bf.releaseDate || calculateItemReleaseDate(freshBatch.baseReleaseDate, freshBatch.schedulingType, i);
        const match = (releaseDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        const finalReleaseDate = match 
          ? `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z` 
          : new Date().toISOString();

        const cleanTitle = bf.title.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '');
        const finalTitle = bf.isPreview ? `[Preview] ${cleanTitle}` : cleanTitle;
        const targetSeasonId = bf.seasonId || freshBatch.seasonId;

        const payload = {
          season_id: targetSeasonId,
          episode_number: bf.episodeNumber,
          title: finalTitle,
          description: '',
          video_key: videoKeyVal,
          thumbnail_key: bf.thumbnailKey || null,
          thumbnail_options: bf.thumbnailKey ? [bf.thumbnailKey] : [],
          duration_seconds: bf.durationSeconds,
          release_date: finalReleaseDate,
          is_published: bf.isPublished,
          metadata_locks: {},
          metadata_provenance: {},
          metadata_versions: [],
          raw_provider_payload: {}
        };

        const saveRes = await fetch('/api/admin/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save episode details');

        setBatches(prev => prev.map(b => b.id === batchId ? {
          ...b,
          files: b.files.map(item => item.id === bf.id ? { ...item, status: 'success' } : item)
        } : b));

      } catch (err: any) {
        console.error('Error uploading batch item:', err);
        setBatches(prev => prev.map(b => b.id === batchId ? {
          ...b,
          files: b.files.map(item => item.id === bf.id ? { ...item, status: 'error', errorMsg: err.message || 'Unknown error' } : item)
        } : b));
      }
    }

    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        const hasError = b.files.some(f => f.status === 'error');
        return {
          ...b,
          status: hasError ? 'error' : 'success'
        };
      }
      return b;
    }));

    fetchInitialData();
  };

  const handleDelete = async (id: string, titleName?: string) => {
    if (!confirm(`Are you sure you want to delete episode "${titleName || 'Episode'}"? Playback tracking and view logs will be removed!`)) return;

    const epToDelete = episodesList.find((e) => e.id === id);

    try {
      const res = await fetch(`/api/admin/episodes?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete episode');

      // If database delete was successful, remove R2 files
      if (epToDelete) {
        const keysToDelete = [
          epToDelete.video_key,
          epToDelete.thumbnail_key,
          ...(epToDelete.thumbnail_options || [])
        ].filter(Boolean);

        keysToDelete.forEach(async (key) => {
          try {
            await fetch('/api/admin/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key })
            });
          } catch (delErr) {
            console.error(`Failed to clean up R2 file on episode delete for key "${key}":`, delErr);
          }
        });
      }

      setSuccessMsg(`✓ Episode "${titleName || 'Episode'}" deleted successfully.`);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleOpenThumbnailModal = (ep: Episode) => {
    setThumbModalEpisode(ep);
    setThumbStudioActiveKey(ep.thumbnail_key || '');
    setThumbStudioSavedList(ep.thumbnail_options && ep.thumbnail_options.length > 0 ? ep.thumbnail_options : (ep.thumbnail_key ? [ep.thumbnail_key] : []));
    setBatchOptions([]);
    setVideoDuration(ep.duration_seconds || 0);
    setFocusedMinutes([]);
    setCapturedFrameUrl(null);
    setCapturedFrameSizeKb(null);
    setThumbActiveTab('auto');
    setThumbStudioError(null);
    setIsSavedGalleryOpen(false);
    setImageBrightness(100);
    setImageContrast(100);
    setImageSaturation(100);
    setIsThumbModalOpen(true);

    // Prioritize Local File as First Source!
    if (videoFile) {
      setLocalScrubFile(videoFile);
      setIsRemoteVideoLoaded(false);
      setTimeout(() => {
        generateBatchThumbnailsFromUrl(URL.createObjectURL(videoFile), []);
      }, 50);
    } else {
      setLocalScrubFile(null);
      setIsRemoteVideoLoaded(false);
    }
  };

  const getTargetDimensions = (video: HTMLVideoElement, resSetting = thumbResolution) => {
    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;
    if (resSetting === 'native') return { width: vWidth, height: vHeight };
    if (resSetting === '4k') return { width: 3840, height: 2160 };
    if (resSetting === '1080p') return { width: 1920, height: 1080 };
    if (resSetting === '720p') return { width: 1280, height: 720 };
    return { width: vWidth, height: vHeight };
  };

  const getQualityFloat = (qMode = thumbQualityMode) => {
    if (qMode === 'max') return 1.0;
    if (qMode === 'ultra') return 0.98;
    if (qMode === 'high') return 0.92;
    return 0.85;
  };

  const downloadThumbnailFile = async (key: string, filename = 'thumbnail.jpg') => {
    try {
      const url = getR2Url(key, 'thumbnail');
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(getR2Url(key, 'thumbnail'), '_blank');
    }
  };

  const formatVideoTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
  };

  const generateBatchThumbnailsFromUrl = async (
    videoUrl: string, 
    selectedMinutes: number[] = focusedMinutes,
    preset: 'smart' | '24fps' | '30fps' | '60fps' = fpsPreset,
    stepSec: number = serialStepSec,
    targetCpuMode: 'eco' | 'fast' = cpuMode,
    reqWindow: 'full' | 'first25' | 'first50' | 'first75' | 'middle50' | 'last75' | 'last50' | 'last25' = timeframeWindow
  ) => {
    cancelGenerationRef.current = false;
    setIsGeneratingBatch(true);
    setBatchOptions([]);
    setThumbStudioError(null);

    const fpsValue = preset === '30fps' ? 30 : preset === '60fps' ? 60 : 24;
    const FRAME_STEP = 1 / fpsValue;

    const isMinuteExcluded = (sec: number) => {
      const min = Math.floor(sec / 60);
      return excludedMinutes.includes(min);
    };

    // Single Reusable GPU-Accelerated Video Decoder Instance
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.preload = 'auto';

    let cacheBustUrl = videoUrl;
    if (!videoUrl.startsWith('blob:')) {
      cacheBustUrl = videoUrl + (videoUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    }
    tempVideo.src = cacheBustUrl;

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 270;
    // Explicitly tell Chromium/Edge that getImageData is called frequently to optimize buffer memory
    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });

    let effectiveCount = 60;

    try {
      // Wait for video metadata to load on GPU
      await new Promise<void>((resolve, reject) => {
        const handleMetadata = () => {
          tempVideo.removeEventListener('loadedmetadata', handleMetadata);
          setVideoDuration(tempVideo.duration);
          resolve();
        };
        const handleError = () => {
          tempVideo.removeEventListener('error', handleError);
          reject(new Error('Failed to load video metadata for GPU frame extraction.'));
        };
        tempVideo.addEventListener('loadedmetadata', handleMetadata);
        tempVideo.addEventListener('error', handleError);
      });

      // Recalculate timeframe counts based on exact loaded video duration
      const trueDuration = tempVideo.duration || 1440;
      let windowFraction = 1.0;
      if (reqWindow === 'first25' || reqWindow === 'last25') windowFraction = 0.25;
      else if (reqWindow === 'first50' || reqWindow === 'last50' || reqWindow === 'middle50') windowFraction = 0.50;
      else if (reqWindow === 'first75' || reqWindow === 'last75') windowFraction = 0.75;

      const activeSpan = selectedMinutes.length > 0
        ? selectedMinutes.length * 60 * windowFraction
        : trueDuration * windowFraction;

      if (stepSec > 0) {
        effectiveCount = Math.max(1, Math.floor(activeSpan / stepSec));
      } else {
        effectiveCount = preset === 'smart' ? 24 : 60;
      }

      setGenProgress({ current: 0, total: effectiveCount });

      const collected: { dataUrl: string; sizeKb: number; time: number }[] = [];

      // Helper to seek video using browser hardware fastSeek or GPU currentTime
      const seekToTime = (targetTime: number) => {
        return new Promise<number>((resolve) => {
          const handleSeeked = () => {
            tempVideo.removeEventListener('seeked', handleSeeked);
            resolve(tempVideo.currentTime);
          };
          tempVideo.addEventListener('seeked', handleSeeked);

          const clamped = Math.max(0.1, Math.min(tempVideo.duration - 0.5, targetTime));
          if ('fastSeek' in tempVideo && typeof (tempVideo as any).fastSeek === 'function') {
            try {
              (tempVideo as any).fastSeek(clamped);
            } catch (e) {
              tempVideo.currentTime = clamped;
            }
          } else {
            tempVideo.currentTime = clamped;
          }
        });
      };

      const isLocalBlob = videoUrl.startsWith('blob:');

      for (let idx = 0; idx < effectiveCount; idx++) {
        if (cancelGenerationRef.current) break;

        // Yield execution to browser event loop (2ms ultra-fast for local blob videos, 20ms for remote)
        const yieldMs = isLocalBlob ? 2 : (targetCpuMode === 'fast' ? 10 : 20);
        await new Promise((r) => setTimeout(r, yieldMs));

        let seekTime = 0;

        // Pure Uncapped Serial Stepping
        if (selectedMinutes.length === 0) {
          // Full Video Stepping
          let winStart = 0;
          let winEnd = tempVideo.duration || 1440;

          if (reqWindow === 'first25') winEnd = (tempVideo.duration || 1440) * 0.25;
          else if (reqWindow === 'first50') winEnd = (tempVideo.duration || 1440) * 0.50;
          else if (reqWindow === 'first75') winEnd = (tempVideo.duration || 1440) * 0.75;
          else if (reqWindow === 'middle50') { winStart = (tempVideo.duration || 1440) * 0.25; winEnd = (tempVideo.duration || 1440) * 0.75; }
          else if (reqWindow === 'last75') winStart = (tempVideo.duration || 1440) * 0.25;
          else if (reqWindow === 'last50') winStart = (tempVideo.duration || 1440) * 0.50;
          else if (reqWindow === 'last25') winStart = (tempVideo.duration || 1440) * 0.75;

          const activeWindowSpan = Math.max(0.5, winEnd - winStart);
          if (stepSec > 0) {
            const serialTime = winStart + (idx * stepSec);
            if (serialTime > winEnd) {
              break; // Fully stepped across entire video duration!
            }
            seekTime = serialTime;
          } else {
            const denom = effectiveCount > 1 ? effectiveCount - 1 : 1;
            seekTime = winStart + (idx / denom) * activeWindowSpan;
          }
        } else {
          // Multi-Minute Focus Stepping
          let windowFraction = 1.0;
          if (reqWindow === 'first25' || reqWindow === 'last25') windowFraction = 0.25;
          else if (reqWindow === 'first50' || reqWindow === 'last50' || reqWindow === 'middle50') windowFraction = 0.50;
          else if (reqWindow === 'first75' || reqWindow === 'last75') windowFraction = 0.75;

          const secPerMinWindow = 60 * windowFraction;
          if (stepSec > 0) {
            const stepsPerMin = Math.max(1, Math.floor(secPerMinWindow / stepSec));
            const minGroupIdx = Math.floor(idx / stepsPerMin);
            if (minGroupIdx >= selectedMinutes.length) {
              break; // Fully stepped across all selected focus minutes!
            }
            const targetMin = selectedMinutes[minGroupIdx];
            const stepWithinMin = idx % stepsPerMin;
            const baseStart = targetMin * 60;
            let winStart = baseStart;
            if (reqWindow === 'middle50' || reqWindow === 'last75') winStart = baseStart + 60 * 0.25;
            else if (reqWindow === 'last50') winStart = baseStart + 60 * 0.50;
            else if (reqWindow === 'last25') winStart = baseStart + 60 * 0.75;

            seekTime = winStart + (stepWithinMin * stepSec);
          } else {
            const itemsPerMin = Math.max(1, Math.ceil(effectiveCount / selectedMinutes.length));
            const minGroupIdx = Math.floor(idx / itemsPerMin);
            const targetMin = selectedMinutes[Math.min(minGroupIdx, selectedMinutes.length - 1)];
            const subIdx = idx % itemsPerMin;
            const baseStart = targetMin * 60;
            const baseSpan = Math.min(60, tempVideo.duration - baseStart);
            let winStart = baseStart;
            let winEnd = baseStart + baseSpan;

            if (reqWindow === 'first25') winEnd = baseStart + baseSpan * 0.25;
            else if (reqWindow === 'first50') winEnd = baseStart + baseSpan * 0.50;
            else if (reqWindow === 'first75') winEnd = baseStart + baseSpan * 0.75;
            else if (reqWindow === 'middle50') { winStart = baseStart + baseSpan * 0.25; winEnd = baseStart + baseSpan * 0.75; }
            else if (reqWindow === 'last75') winStart = baseStart + baseSpan * 0.25;
            else if (reqWindow === 'last50') winStart = baseStart + baseSpan * 0.50;
            else if (reqWindow === 'last25') winStart = baseStart + baseSpan * 0.75;

            const activeWindowSpan = Math.max(0.5, winEnd - winStart);
            const denom = itemsPerMin > 1 ? itemsPerMin - 1 : 1;
            seekTime = winStart + (subIdx / denom) * activeWindowSpan;
          }
        }

        seekTime = Math.round(seekTime * fpsValue) / fpsValue;

        if (excludedMinutes.length > 0) {
          let attempts = 0;
          while (isMinuteExcluded(seekTime) && attempts < 25) {
            seekTime = Math.round((Math.random() * (tempVideo.duration - 1)) * fpsValue) / fpsValue;
            attempts++;
          }
        }

        let currentTime = await seekToTime(seekTime);
        if (isMinuteExcluded(currentTime)) continue;

        // Subtitle Text Avoidance on GPU Canvas (Optimized Sub-sampled Pixel Math)
        if (skipSubtitles && ctx) {
          let subtitleRetries = 0;
          let hasText = true;

          while (hasText && subtitleRetries < 4) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);

            let textDetected = false;
            // Scan Bottom 33% Zone
            const bStartY = Math.floor(canvas.height * 0.65);
            const bBandH = Math.floor(canvas.height * 0.33);
            const bStartX = Math.floor(canvas.width * 0.05);
            const bBandW = Math.floor(canvas.width * 0.90);
            const bData = ctx.getImageData(bStartX, bStartY, bBandW, bBandH).data;

            let brightPixels = 0;
            let strokeEdges = 0;
            // Sub-sample every 4th pixel (p += 16) for 75% CPU calculation reduction
            for (let p = 0; p < bData.length; p += 16) {
              const r = bData[p];
              const g = bData[p + 1];
              const b = bData[p + 2];
              const isWhite = (r > 190 && g > 190 && b > 190);
              const isYellow = (r > 190 && g > 170 && b < 130);
              const isCyan = (r < 140 && g > 190 && b > 190);
              const isPink = (r > 200 && g < 160 && b > 190);

              if (isWhite || isYellow || isCyan || isPink) {
                brightPixels++;
                if (p + 19 < bData.length) {
                  const darkLum = (bData[p + 16] + bData[p + 17] + bData[p + 18]) / 3;
                  if (darkLum < 75) strokeEdges++;
                }
              }
            }

            if (brightPixels > 50 && strokeEdges > 6) {
              textDetected = true;
            }

            // Scan Top 20% Zone
            if (!textDetected) {
              const tBandH = Math.floor(canvas.height * 0.20);
              const tData = ctx.getImageData(bStartX, 0, bBandW, tBandH).data;
              let topPixels = 0;
              let topEdges = 0;
              for (let p = 0; p < tData.length; p += 16) {
                const r = tData[p];
                const g = tData[p + 1];
                const b = tData[p + 2];
                if ((r > 195 && g > 195 && b > 195) || (r > 195 && g > 175 && b < 130)) {
                  topPixels++;
                  if (p + 19 < tData.length) {
                    const darkLum = (tData[p + 16] + tData[p + 17] + tData[p + 18]) / 3;
                    if (darkLum < 75) topEdges++;
                  }
                }
              }
              if (topPixels > 70 && topEdges > 9) {
                textDetected = true;
              }
            }

            if (textDetected) {
              subtitleRetries++;
              const frameOffsets = [60, -48, 96, -72, 144];
              const frameJump = frameOffsets[subtitleRetries - 1] || 60;
              const targetSeek = Math.round((currentTime + frameJump * FRAME_STEP) * fpsValue) / fpsValue;
              const clampedTarget = Math.max(0.1, Math.min(tempVideo.duration - 0.5, targetSeek));
              currentTime = await seekToTime(clampedTarget);
            } else {
              hasText = false;
            }
          }
        }

        if (ctx) {
          // Draw high-resolution preview frame to collected options array matching selected resolution & quality
          const { width: targetW, height: targetH } = getTargetDimensions(tempVideo, thumbResolution);
          const highResCanvas = document.createElement('canvas');
          highResCanvas.width = targetW;
          highResCanvas.height = targetH;
          const hrCtx = highResCanvas.getContext('2d', { alpha: false });
          if (hrCtx) {
            hrCtx.imageSmoothingEnabled = true;
            hrCtx.imageSmoothingQuality = 'high';
            hrCtx.drawImage(tempVideo, 0, 0, targetW, targetH);
            const qualityFloat = getQualityFloat(thumbQualityMode);
            const dataUrl = thumbImageFormat === 'image/png'
              ? highResCanvas.toDataURL('image/png')
              : highResCanvas.toDataURL(thumbImageFormat, qualityFloat);
            const sizeInBytes = Math.round((dataUrl.split(',')[1].length * 3) / 4);
            const sizeKb = Math.round((sizeInBytes / 1024) * 10) / 10;
            collected.push({ dataUrl, sizeKb, time: currentTime });
          } else {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const sizeInBytes = Math.round((dataUrl.split(',')[1].length * 3) / 4);
            const sizeKb = Math.round((sizeInBytes / 1024) * 10) / 10;
            collected.push({ dataUrl, sizeKb, time: currentTime });
          }
          
          // Stream results into state continuously
          const sorted = [...collected].sort((a, b) => (a.time || 0) - (b.time || 0));
          setBatchOptions(sorted);
          setGenProgress({ current: collected.length, total: effectiveCount });
        }
      }
    } catch (err: any) {
      setThumbStudioError(
        'Could not extract frames automatically via CDN. This is usually due to CDN/CORS browser security. Try selecting your local video file for ultra-fast native GPU capture!'
      );
    } finally {
      setIsGeneratingBatch(false);
      setGenProgress(null);
    }
  };

  const handleLocalFileSelectForScrub = (file: File) => {
    setLocalScrubFile(file);
    setIsRemoteVideoLoaded(false);
    setThumbStudioError(null);
    const localUrl = URL.createObjectURL(file);
    generateBatchThumbnailsFromUrl(localUrl, focusedMinutes);
  };

  const handleLoadFromR2 = () => {
    if (!thumbModalEpisode?.video_key) return;
    setIsRemoteVideoLoaded(true);
    setLocalScrubFile(null);
    setThumbStudioError(null);
    generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
  };

  const saveThumbnailOptionToR2 = async (dataUrl: string, makeActive = false) => {
    if (!thumbModalEpisode) return;
    setSavingThumbStudio(true);
    setThumbStudioError(null);

    try {
      const blob = dataURItoBlob(dataUrl);
      const mime = blob.type || 'image/jpeg';
      const ext = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
      const filename = `thumb-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
      
      const presignRes = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: mime })
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || 'Failed to get presigned URL');

      const { url, key } = presignData;
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: blob
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image to R2');

      const updatedList = [...thumbStudioSavedList, key];
      setThumbStudioSavedList(updatedList);
      
      let finalActiveKey = thumbStudioActiveKey;
      if (makeActive || !thumbStudioActiveKey) {
        finalActiveKey = key;
        setThumbStudioActiveKey(key);
      }

      const updateRes = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: thumbModalEpisode.id,
          season_id: thumbModalEpisode.season_id,
          episode_number: thumbModalEpisode.episode_number,
          title: thumbModalEpisode.title,
          description: thumbModalEpisode.description,
          video_key: thumbModalEpisode.video_key,
          duration_seconds: thumbModalEpisode.duration_seconds,
          release_date: thumbModalEpisode.release_date,
          is_published: thumbModalEpisode.is_published,
          thumbnail_key: finalActiveKey,
          thumbnail_options: updatedList
        })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to update episode records');

      fetchInitialData();
    } catch (err: any) {
      setThumbStudioError(err.message || 'Failed to save option');
    } finally {
      setSavingThumbStudio(false);
    }
  };

  const handleCustomThumbnailUploadComplete = async (key: string) => {
    if (!thumbModalEpisode) return;
    setSavingThumbStudio(true);
    setThumbStudioError(null);

    try {
      const updatedList = [...thumbStudioSavedList, key];
      setThumbStudioSavedList(updatedList);
      setThumbStudioActiveKey(key);

      const updateRes = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: thumbModalEpisode.id,
          season_id: thumbModalEpisode.season_id,
          episode_number: thumbModalEpisode.episode_number,
          title: thumbModalEpisode.title,
          description: thumbModalEpisode.description,
          video_key: thumbModalEpisode.video_key,
          duration_seconds: thumbModalEpisode.duration_seconds,
          release_date: thumbModalEpisode.release_date,
          is_published: thumbModalEpisode.is_published,
          thumbnail_key: key,
          thumbnail_options: updatedList
        })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to update episode records');

      fetchInitialData();
    } catch (err: any) {
      setThumbStudioError(err.message || 'Failed to save custom thumbnail');
    } finally {
      setSavingThumbStudio(false);
    }
  };

  const handleMultipleCustomThumbnailsUploaded = async (keys: string[]) => {
    if (!thumbModalEpisode || keys.length === 0) return;
    setSavingThumbStudio(true);
    setThumbStudioError(null);

    try {
      const nextList = [...thumbStudioSavedList];
      keys.forEach(k => {
        if (!nextList.includes(k)) nextList.push(k);
      });
      
      setThumbStudioSavedList(nextList);
      const lastKey = keys[keys.length - 1];
      setThumbStudioActiveKey(lastKey);

      const updateRes = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: thumbModalEpisode.id,
          season_id: thumbModalEpisode.season_id,
          episode_number: thumbModalEpisode.episode_number,
          title: thumbModalEpisode.title,
          description: thumbModalEpisode.description,
          video_key: thumbModalEpisode.video_key,
          duration_seconds: thumbModalEpisode.duration_seconds,
          release_date: thumbModalEpisode.release_date,
          is_published: thumbModalEpisode.is_published,
          thumbnail_key: lastKey,
          thumbnail_options: nextList
        })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to update episode records');

      fetchInitialData();
    } catch (err: any) {
      setThumbStudioError(err.message || 'Failed to save custom thumbnails');
    } finally {
      setSavingThumbStudio(false);
    }
  };

  const deleteThumbnailOption = async (key: string) => {
    if (!thumbModalEpisode) return;
    setSavingThumbStudio(true);
    setThumbStudioError(null);

    try {
      await fetch('/api/admin/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const updatedList = thumbStudioSavedList.filter(k => k !== key);
      setThumbStudioSavedList(updatedList);

      let finalActiveKey = thumbStudioActiveKey;
      if (thumbStudioActiveKey === key) {
        finalActiveKey = updatedList[0] || '';
        setThumbStudioActiveKey(finalActiveKey);
      }

      const updateRes = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: thumbModalEpisode.id,
          season_id: thumbModalEpisode.season_id,
          episode_number: thumbModalEpisode.episode_number,
          title: thumbModalEpisode.title,
          description: thumbModalEpisode.description,
          video_key: thumbModalEpisode.video_key,
          duration_seconds: thumbModalEpisode.duration_seconds,
          release_date: thumbModalEpisode.release_date,
          is_published: thumbModalEpisode.is_published,
          thumbnail_key: finalActiveKey,
          thumbnail_options: updatedList
        })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to update episode records');

      fetchInitialData();
    } catch (err: any) {
      setThumbStudioError(err.message || 'Failed to delete option');
    } finally {
      setSavingThumbStudio(false);
    }
  };

  const selectActiveThumbnail = async (key: string) => {
    if (!thumbModalEpisode) return;
    setSavingThumbStudio(true);
    setThumbStudioError(null);

    try {
      setThumbStudioActiveKey(key);

      const updateRes = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: thumbModalEpisode.id,
          season_id: thumbModalEpisode.season_id,
          episode_number: thumbModalEpisode.episode_number,
          title: thumbModalEpisode.title,
          description: thumbModalEpisode.description,
          video_key: thumbModalEpisode.video_key,
          duration_seconds: thumbModalEpisode.duration_seconds,
          release_date: thumbModalEpisode.release_date,
          is_published: thumbModalEpisode.is_published,
          thumbnail_key: key,
          thumbnail_options: thumbStudioSavedList
        })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || 'Failed to update active thumbnail');

      fetchInitialData();
    } catch (err: any) {
      setThumbStudioError(err.message || 'Failed to update active thumbnail');
    } finally {
      setSavingThumbStudio(false);
    }
  };

  const launchYears = Array.from(new Set(seriesList.map(s => s.release_year).filter(Boolean))).map(String).sort().reverse();

  // 1-Click Toggle Status
  const handleToggleEpisodePublish = async (ep: Episode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingId(ep.id);
    const newStatus = !ep.is_published;
    
    // Optimistic UI update
    setEpisodesList(prev => prev.map(item => item.id === ep.id ? { ...item, is_published: newStatus } : item));

    try {
      const res = await fetch('/api/admin/episodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ep.id, is_published: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      setSuccessMsg(`✓ "${ep.title}" set to ${newStatus ? 'Published' : 'Draft'}.`);
    } catch (err: any) {
      // Revert optimistic update
      setEpisodesList(prev => prev.map(item => item.id === ep.id ? { ...item, is_published: ep.is_published } : item));
      alert(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // 1-Click Copy Key
  const handleCopyKey = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSeriesExpand = (seriesId: string) => {
    const next = new Set(expandedSeriesIds);
    if (next.has(seriesId)) {
      next.delete(seriesId);
    } else {
      next.add(seriesId);
    }
    setExpandedSeriesIds(next);
  };

  const handleExpandAll = () => {
    setExpandedSeriesIds(new Set(filteredSeries.map(s => s.id)));
  };

  const handleCollapseAll = () => {
    setExpandedSeriesIds(new Set());
  };

  // Top Metrics Calculation
  const stats = useMemo(() => {
    const totalEpisodes = episodesList.length;
    const publishedCount = episodesList.filter(e => e.is_published).length;
    const draftCount = totalEpisodes - publishedCount;
    const totalDurationSeconds = episodesList.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);
    const totalHours = (totalDurationSeconds / 3600).toFixed(1);
    
    const seriesWithEps = new Set(
      episodesList.map(e => {
        const s = seasonsList.find(season => season.id === e.season_id);
        return s?.series_id;
      }).filter(Boolean)
    );
    const coveredSeriesCount = seriesWithEps.size;
    const totalSeriesCount = seriesList.length;

    const missingVideoCount = episodesList.filter(e => !e.video_key || e.video_key.trim() === '').length;
    const missingThumbCount = episodesList.filter(e => !e.thumbnail_key || e.thumbnail_key.trim() === '').length;

    return { 
      totalEpisodes, 
      publishedCount, 
      draftCount, 
      totalHours, 
      coveredSeriesCount, 
      totalSeriesCount,
      missingVideoCount, 
      missingThumbCount 
    };
  }, [episodesList, seasonsList, seriesList]);

  // Filtered Series List for Accordion View
  const filteredSeries = useMemo(() => {
    return seriesList.filter((series) => {
      // Series dropdown filter
      if (selectedSeriesFilter !== 'all' && series.id !== selectedSeriesFilter) {
        return false;
      }

      // Launch year filter
      if (selectedLaunchYear !== 'all' && String(series.release_year) !== selectedLaunchYear) {
        return false;
      }

      const seriesSeasonIds = seasonsList.filter(s => s.series_id === series.id).map(s => s.id);
      let seriesEpisodes = episodesList.filter(ep => seriesSeasonIds.includes(ep.season_id));

      // Status filter
      if (statusFilter === 'published') {
        seriesEpisodes = seriesEpisodes.filter(e => e.is_published);
        if (seriesEpisodes.length === 0) return false;
      } else if (statusFilter === 'draft') {
        seriesEpisodes = seriesEpisodes.filter(e => !e.is_published);
        if (seriesEpisodes.length === 0) return false;
      }

      // Media health filter
      if (mediaFilter === 'missing_video') {
        seriesEpisodes = seriesEpisodes.filter(e => !e.video_key || e.video_key.trim() === '');
        if (seriesEpisodes.length === 0) return false;
      } else if (mediaFilter === 'missing_thumb') {
        seriesEpisodes = seriesEpisodes.filter(e => !e.thumbnail_key || e.thumbnail_key.trim() === '');
        if (seriesEpisodes.length === 0) return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const matchesSeries = (series.title || '').toLowerCase().includes(q) || (series.studio || '').toLowerCase().includes(q);
        const matchesEps = seriesEpisodes.some(ep => 
          (ep.title || '').toLowerCase().includes(q) || 
          `episode ${ep.episode_number}`.includes(q) || 
          `ep ${ep.episode_number}`.includes(q) ||
          (ep.video_key || '').toLowerCase().includes(q)
        );
        if (!matchesSeries && !matchesEps) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      }
      if (sortBy === 'episodes') {
        const aCount = episodesList.filter(e => seasonsList.filter(s => s.series_id === a.id).map(s => s.id).includes(e.season_id)).length;
        const bCount = episodesList.filter(e => seasonsList.filter(s => s.series_id === b.id).map(s => s.id).includes(e.season_id)).length;
        return sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [seriesList, seasonsList, episodesList, selectedSeriesFilter, selectedLaunchYear, statusFilter, mediaFilter, searchTerm, sortBy, sortOrder]);

  // Filtered Episodes List for Flat Table View
  const filteredEpisodesFlat = useMemo(() => {
    return episodesList.filter((ep) => {
      const season = seasonsList.find(s => s.id === ep.season_id);
      const series = seriesList.find(s => s.id === season?.series_id);

      if (selectedSeriesFilter !== 'all' && series?.id !== selectedSeriesFilter) return false;
      if (selectedLaunchYear !== 'all' && String(series?.release_year) !== selectedLaunchYear) return false;
      if (statusFilter === 'published' && !ep.is_published) return false;
      if (statusFilter === 'draft' && ep.is_published) return false;
      if (mediaFilter === 'missing_video' && ep.video_key && ep.video_key.trim() !== '') return false;
      if (mediaFilter === 'missing_thumb' && ep.thumbnail_key && ep.thumbnail_key.trim() !== '') return false;

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const matchTitle = (ep.title || '').toLowerCase().includes(q);
        const matchSeries = (series?.title || '').toLowerCase().includes(q);
        const matchKey = (ep.video_key || '').toLowerCase().includes(q);
        const matchEpNum = `episode ${ep.episode_number}`.includes(q) || `ep ${ep.episode_number}` === q || `${ep.episode_number}` === q;
        if (!matchTitle && !matchSeries && !matchKey && !matchEpNum) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [episodesList, seasonsList, seriesList, selectedSeriesFilter, selectedLaunchYear, statusFilter, mediaFilter, searchTerm, sortBy, sortOrder]);

  // Total pages and Paginated Slice based on active view mode
  const totalItems = viewMode === 'accordion' ? filteredSeries.length : filteredEpisodesFlat.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedSeries = useMemo(() => {
    return filteredSeries.slice(startIndex, startIndex + pageSize);
  }, [filteredSeries, startIndex, pageSize]);

  const paginatedEpisodesFlat = useMemo(() => {
    return filteredEpisodesFlat.slice(startIndex, startIndex + pageSize);
  }, [filteredEpisodesFlat, startIndex, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSeasonsFormList = seasonsList.filter(
    s => s.series_id === formSeriesId
  );

  // Auto-Process queue loop inside useEffect
  useEffect(() => {
    const processQueue = async () => {
      const activeUploadingBatch = batches.find(b => b.status === 'uploading');
      if (activeUploadingBatch) return;

      const nextBatch = batches.find(b => b.status === 'pending' && b.files.length > 0 && b.files.some(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'saving'));
      if (!nextBatch) return;

      await uploadSingleBatch(nextBatch.id);
    };

    processQueue();
  }, [batches]);

  // Prevent accidental navigation during uploads
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const anyUploading = batches.some(b => b.status === 'uploading');
      if (anyUploading) {
        e.preventDefault();
        e.returnValue = 'An upload is currently in progress. Leaving this page will abort the upload.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [batches]);

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Video size={24} />
          </div>
          <div>
            <h2>Manage Episodes</h2>
            <p>
              Upload video streams, generate high-definition thumbnails, configure episode metadata, and schedule releases.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            onClick={() => handleOpenBatchCreate()} 
            disabled={seasonsList.length === 0} 
            className={`${styles.createBtn} ${styles.createBtnGreen}`}
          >
            <UploadCloud size={16} />
            <span>Add Multiple Episodes</span>
          </button>
          
          <button 
            onClick={() => handleOpenCreate()} 
            disabled={seasonsList.length === 0} 
            className={styles.createBtn}
          >
            <Plus size={16} />
            <span>Add Episode</span>
          </button>
        </div>
      </div>

      {/* Top Metric Overview Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--primary)' }}>
            <Tv size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalEpisodes}</span>
            <span className={styles.statLabel}>
              {stats.publishedCount} Published • {stats.draftCount} Drafts
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Clock size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalHours} hrs</span>
            <span className={styles.statLabel}>Total Video Runtime</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Film size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.coveredSeriesCount} / {stats.totalSeriesCount}</span>
            <span className={styles.statLabel}>Shows with Episodes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: stats.missingVideoCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(124, 58, 237, 0.15)', color: stats.missingVideoCount > 0 ? '#f87171' : 'var(--primary)' }}>
            <Sparkles size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {stats.missingVideoCount === 0 && stats.missingThumbCount === 0 ? '100% Ready' : `${stats.missingVideoCount + stats.missingThumbCount} Alerts`}
            </span>
            <span className={styles.statLabel}>
              {stats.missingVideoCount} No Video • {stats.missingThumbCount} No Thumb
            </span>
          </div>
        </div>
      </div>

      {/* Unsaved Draft Alert */}
      {hasDraft && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#131722', border: '1px solid #23283b', padding: '1rem 1.25rem', borderRadius: '14px', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>💡</span>
            <div>
              <span style={{ fontWeight: 800, display: 'block', fontSize: '0.9rem', color: '#60a5fa' }}>Unsaved Episode Draft Detected</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)' }}>You have filled episode details from a previous session that were not saved.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={handleRestoreDraft} className={styles.actionPillBtn} style={{ background: 'var(--primary)', color: '#ffffff' }}>
              Restore Draft
            </button>
            <button onClick={handleDiscardDraft} className={styles.actionPillBtn} style={{ background: '#1a1e2f', color: 'var(--foreground-muted)', border: '1px solid #282e44' }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && !isModalOpen && (
        <div style={{ background: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTopRow}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by series, episode title, #, or video key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Controls */}
          <div className={styles.filterControls}>
            {/* Series Filter */}
            <select
              className={styles.selectInput}
              value={selectedSeriesFilter}
              onChange={(e) => setSelectedSeriesFilter(e.target.value)}
              title="Filter by Series"
            >
              <option value="all">All Series ({seriesList.length})</option>
              {seriesList.map((s) => {
                const sIds = seasonsList.filter(season => season.series_id === s.id).map(season => season.id);
                const epCount = episodesList.filter(ep => sIds.includes(ep.season_id)).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.title} ({epCount} eps)
                  </option>
                );
              })}
            </select>

            {/* Launch Year */}
            <select 
              className={styles.selectInput}
              value={selectedLaunchYear}
              onChange={(e) => setSelectedLaunchYear(e.target.value)}
              title="Filter by Launch Year"
            >
              <option value="all">All Years</option>
              {launchYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Status Filter Chips */}
            <div className={styles.statusFilterGroup}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'all' ? styles.statusFilterBtnActive : ''}`}
              >
                All ({episodesList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'published' ? styles.statusFilterBtnActive : ''}`}
              >
                ● Live ({stats.publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'draft' ? styles.statusFilterBtnActive : ''}`}
              >
                ● Drafts ({stats.draftCount})
              </button>
            </div>

            {/* Media Filter */}
            <select
              className={styles.selectInput}
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value as any)}
              title="Filter by Media Health"
            >
              <option value="all">All Media</option>
              <option value="missing_video">⚠️ Missing Video ({stats.missingVideoCount})</option>
              <option value="missing_thumb">⚠️ Missing Thumb ({stats.missingThumbCount})</option>
            </select>

            {/* Sort Dropdown */}
            <select 
              className={styles.selectInput}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              title="Sort items"
            >
              <option value="date">Release Date</option>
              <option value="name">Title Name</option>
              <option value="episodes">Most Episodes</option>
            </select>

            {/* Direction */}
            <select 
              className={styles.selectInput}
              style={{ maxWidth: '100px' }}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
            >
              <option value="desc">Desc ↓</option>
              <option value="asc">Asc ↑</option>
            </select>

            {/* View Mode Toggle */}
            <div className={styles.viewToggleGroup}>
              <button
                type="button"
                onClick={() => setViewMode('accordion')}
                className={`${styles.viewToggleBtn} ${viewMode === 'accordion' ? styles.viewToggleBtnActive : ''}`}
                title="Grouped by Show (Accordion View)"
              >
                <Layers size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleBtnActive : ''}`}
                title="Flat Table List View"
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub toolbar: Expand/Collapse All and Active Counters */}
        {viewMode === 'accordion' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1f2438', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
            <span>
              Showing <b>{filteredSeries.length}</b> shows with episodes matching filters
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleExpandAll}
                className={styles.actionPillBtn}
                style={{ background: '#141724', border: '1px solid #282e44', color: 'var(--foreground-secondary)' }}
              >
                <ChevronDown size={13} />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className={styles.actionPillBtn}
                style={{ background: '#141724', border: '1px solid #282e44', color: 'var(--foreground-secondary)' }}
              >
                <ChevronUp size={13} />
                <span>Collapse All</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: 'var(--primary)', width: '38px', height: '38px', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
          <p style={{ marginTop: '1rem', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Loading episodes catalog...</p>
        </div>
      ) : totalItems > 0 ? (
        <>
          {/* VIEW 1: GROUPED ACCORDION VIEW */}
          {viewMode === 'accordion' && (
            <div className={styles.seriesAccordionList}>
              {paginatedSeries.map((series) => {
                const isExpanded = expandedSeriesIds.has(series.id);
                const seriesSeasons = seasonsList.filter(s => s.series_id === series.id);
                const seriesSeasonIds = seriesSeasons.map(s => s.id);
                const posterKey = series.poster_image_key || series.cover_image_key;
                const posterUrl = posterKey ? getR2Url(posterKey, 'poster') : null;

                const seriesEpisodes = episodesList.filter(ep => 
                  seriesSeasonIds.includes(ep.season_id) &&
                  (searchTerm.trim() === '' || 
                   (ep.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (series.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (ep.video_key || '').toLowerCase().includes(searchTerm.toLowerCase()))
                );

                // Sort episodes: primary by season_number, secondary by episode_number
                seriesEpisodes.sort((a, b) => {
                  const aSeason = seasonsList.find(s => s.id === a.season_id);
                  const bSeason = seasonsList.find(s => s.id === b.season_id);
                  const aNum = aSeason ? aSeason.season_number : 1;
                  const bNum = bSeason ? bSeason.season_number : 1;
                  if (aNum !== bNum) return aNum - bNum;
                  return a.episode_number - b.episode_number;
                });

                const publishedEpCount = seriesEpisodes.filter(e => e.is_published).length;
                const draftEpCount = seriesEpisodes.length - publishedEpCount;

                return (
                  <div 
                    key={series.id} 
                    className={`${styles.seriesAccordionCard} ${isExpanded ? styles.seriesAccordionCardExpanded : ''}`}
                  >
                    {/* Series Accordion Header */}
                    <div 
                      className={styles.seriesAccordionHeader}
                      onClick={() => toggleSeriesExpand(series.id)}
                    >
                      <div className={styles.seriesHeaderLeft}>
                        {/* Series Poster Thumbnail */}
                        <div className={styles.seriesPosterWrap}>
                          {posterUrl ? (
                            <img 
                              src={posterUrl} 
                              alt="" 
                              className={styles.seriesPosterImg}
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Film size={20} style={{ color: 'var(--foreground-muted)' }} />
                          )}
                        </div>

                        {/* Series Meta Info */}
                        <div className={styles.seriesInfoBlock}>
                          <div className={styles.seriesTitleRow}>
                            <h3 className={styles.seriesTitleText}>
                              {series.title}
                            </h3>
                            {series.slug && (
                              <Link
                                href={`/series/${series.slug}`}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#a7f3d0', fontSize: '0.74rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                title="View public show page"
                              >
                                <span>/{series.slug}</span>
                                <ExternalLink size={10} />
                              </Link>
                            )}
                          </div>

                          <div className={styles.seriesMetaSubRow}>
                            <span>{series.studio || 'Unknown Studio'}</span>
                            <span>•</span>
                            <span>{series.release_year || '2026'}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--foreground-primary)', fontWeight: 700 }}>
                              {seriesEpisodes.length} Episodes ({publishedEpCount} Live • {draftEpCount} Draft)
                            </span>
                            {seriesSeasons.length > 0 && (
                              <>
                                <span>•</span>
                                <span style={{ color: '#c4b5fd' }}>
                                  {seriesSeasons.length} Season{seriesSeasons.length > 1 ? 's' : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className={styles.seriesHeaderActions} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenBatchCreate(series.id, seriesSeasons[0]?.id)}
                          disabled={seriesSeasons.length === 0}
                          className={`${styles.actionPillBtn} ${styles.createBtnGreen}`}
                          title="Add multiple video files to this show"
                        >
                          <UploadCloud size={13} />
                          <span>Add Multiple</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCreate(series.id, seriesSeasons[0]?.id)}
                          disabled={seriesSeasons.length === 0}
                          className={styles.actionPillBtn}
                          style={{ background: 'var(--primary)', color: '#ffffff' }}
                          title="Add a single episode to this show"
                        >
                          <Plus size={13} />
                          <span>Add Episode</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleSeriesExpand(series.id)}
                          className={`${styles.expandToggleBtn} ${isExpanded ? styles.expandToggleBtnActive : ''}`}
                          title={isExpanded ? "Collapse episodes" : "Expand episodes"}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Episode List */}
                    {isExpanded && (
                      <div className={styles.episodeRowsList}>
                        {seriesEpisodes.length > 0 ? (
                          seriesEpisodes.map((ep) => {
                            const season = seasonsList.find(s => s.id === ep.season_id);
                            const sTitle = season?.title || `Season ${season?.season_number || 1}`;
                            const isOva = /ova/i.test(sTitle);
                            const isToggling = togglingId === ep.id;
                            const isKeyCopied = copiedKey === ep.video_key;

                            return (
                              <div key={ep.id} className={styles.episodeRow}>
                                <div className={styles.episodeLeftInfo}>
                                  {/* 16:9 Thumbnail preview / Generator trigger */}
                                  <div 
                                    className={styles.epThumbContainer}
                                    onClick={() => handleOpenThumbnailModal(ep)}
                                    title="Click to open Thumbnail Studio"
                                  >
                                    {ep.thumbnail_key ? (
                                      <img 
                                        src={getR2Url(ep.thumbnail_key, 'thumbnail')} 
                                        alt="" 
                                        className={styles.epThumbImg}
                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className={styles.epThumbPlaceholder}>
                                        <Camera size={14} />
                                        <span>GENERATE</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Episode Info */}
                                  <div className={styles.episodeMetaBlock}>
                                    <div className={styles.episodeTitleRow}>
                                      <span className={styles.episodeNumberPill}>
                                        {isOva ? `OVA ${ep.episode_number}` : `Ep ${ep.episode_number}`}
                                      </span>

                                      <h4 className={styles.episodeTitleText}>
                                        {ep.title}
                                      </h4>

                                      <span className={styles.seasonTag}>
                                        {sTitle}
                                      </span>
                                    </div>

                                    <div className={styles.episodeSubRow}>
                                      <span className={styles.runtimePill}>
                                        <Clock size={12} />
                                        <span>{Math.floor((ep.duration_seconds || 1440) / 60)} min</span>
                                      </span>

                                      <span>•</span>

                                      {ep.video_key ? (
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopyKey(ep.video_key, e)}
                                          className={styles.r2KeyPill}
                                          title="Click to copy R2 video key"
                                          style={{ cursor: 'pointer' }}
                                        >
                                          {isKeyCopied ? <Check size={10} style={{ color: '#10b981' }} /> : <Copy size={10} />}
                                          <span>{ep.video_key}</span>
                                        </button>
                                      ) : (
                                        <span style={{ color: '#f87171', fontSize: '0.7rem', fontWeight: 700 }}>
                                          ⚠️ Missing Video Stream
                                        </span>
                                      )}

                                      <span>•</span>
                                      <span>Aired {ep.release_date ? new Date(ep.release_date).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Actions */}
                                <div className={styles.episodeRightActions}>
                                  {/* Live / Draft 1-Click Toggler */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleEpisodePublish(ep, e)}
                                    disabled={isToggling}
                                    className={`${styles.statusPill} ${ep.is_published ? styles.statusPublished : styles.statusDraft}`}
                                    title="Click to toggle published status"
                                  >
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ep.is_published ? '#10b981' : '#f59e0b' }} />
                                    <span>{ep.is_published ? 'Published' : 'Draft'}</span>
                                  </button>

                                  {/* Direct Player Watch Link */}
                                  <Link
                                    href={series.slug ? `/watch/${series.slug}-episode-${ep.episode_number}` : `/watch/${ep.id}`}
                                    target="_blank"
                                    className={styles.rowActionBtn}
                                    title="Preview in video player"
                                  >
                                    <Play size={12} fill="currentColor" />
                                    <span>Watch</span>
                                  </Link>

                                  {/* Thumbnail Studio Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenThumbnailModal(ep)}
                                    className={styles.rowActionBtn}
                                    title="Open Thumbnail Studio"
                                  >
                                    <Camera size={13} />
                                  </button>

                                  {/* Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(ep)}
                                    className={styles.rowActionBtn}
                                    title="Edit Episode Details"
                                  >
                                    <Edit2 size={13} />
                                    <span>Edit</span>
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(ep.id, ep.title)}
                                    className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                                    title="Delete Episode"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.84rem' }}>
                            No episodes uploaded for this series yet. Click <b>"Add Episode"</b> above to add one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: FLAT MODERN TABLE VIEW */}
          {viewMode === 'table' && (
            <div className={styles.tableContainer}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Thumbnail</th>
                    <th>Episode Title</th>
                    <th>Parent Series</th>
                    <th>Season</th>
                    <th>#</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Aired</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEpisodesFlat.map((ep) => {
                    const season = seasonsList.find(s => s.id === ep.season_id);
                    const series = seriesList.find(s => s.id === season?.series_id);
                    const isToggling = togglingId === ep.id;

                    return (
                      <tr key={ep.id}>
                        <td>
                          <div 
                            style={{ position: 'relative', width: '60px', height: '36px', borderRadius: '4px', overflow: 'hidden', background: '#1a1e2f', border: '1px solid #2a3148', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleOpenThumbnailModal(ep)}
                            title="Open Thumbnail Studio"
                          >
                            {ep.thumbnail_key ? (
                              <img src={getR2Url(ep.thumbnail_key, 'thumbnail')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Camera size={12} style={{ color: 'var(--primary)' }} />
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          {ep.title}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--foreground-primary)' }}>
                            {series?.title || 'Unknown Series'}
                          </div>
                        </td>
                        <td>
                          <span className={styles.seasonTag}>
                            {season?.title || 'Season 1'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.episodeNumberPill}>
                            {ep.episode_number}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {Math.floor((ep.duration_seconds || 1440) / 60)} min
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleEpisodePublish(ep)}
                            disabled={isToggling}
                            className={`${styles.statusPill} ${ep.is_published ? styles.statusPublished : styles.statusDraft}`}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ep.is_published ? '#10b981' : '#f59e0b' }} />
                            <span>{ep.is_published ? 'Published' : 'Draft'}</span>
                          </button>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)' }}>
                          {ep.release_date ? new Date(ep.release_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <Link
                              href={series?.slug ? `/watch/${series.slug}-episode-${ep.episode_number}` : `/watch/${ep.id}`}
                              target="_blank"
                              className={styles.rowActionBtn}
                              title="Watch Live"
                            >
                              <Play size={11} fill="currentColor" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenThumbnailModal(ep)}
                              className={styles.rowActionBtn}
                              title="Thumbnail Studio"
                            >
                              <Camera size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(ep)}
                              className={styles.rowActionBtn}
                              title="Edit Episode"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ep.id, ep.title)}
                              className={`${styles.rowActionBtn} ${styles.rowActionBtnDanger}`}
                              title="Delete Episode"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Navigation Bar */}
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              Showing <b>{startIndex + 1}</b>–<b>{endIndex}</b> of <b>{totalItems}</b> {viewMode === 'accordion' ? 'shows' : 'episodes'}
              {(selectedSeriesFilter !== 'all' || statusFilter !== 'all' || searchTerm) && ' (filtered)'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Page Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={styles.selectInput}
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Controls */}
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className={styles.pageBtn}
                  title="First Page"
                >
                  <ChevronsLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className={styles.pageBtn}
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Dynamic Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .map((pageNum, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && pageNum - prev > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span style={{ color: 'var(--foreground-muted)', padding: '0 0.2rem' }}>...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`${styles.pageBtn} ${safeCurrentPage === pageNum ? styles.pageBtnActive : ''}`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className={styles.pageBtn}
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className={styles.pageBtn}
                  title="Last Page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyStateBox}>
          <Video size={48} style={{ color: 'var(--foreground-muted)', opacity: 0.5 }} />
          <div className={styles.emptyStateTitle}>No episodes match your criteria</div>
          <div className={styles.emptyStateText}>
            {searchTerm || selectedSeriesFilter !== 'all' || statusFilter !== 'all' || mediaFilter !== 'all'
              ? 'Try adjusting your search query, series filter, or status chips.'
              : 'You haven\'t added any episodes yet. Click "Add Episode" or "Add Multiple Episodes" above to get started.'}
          </div>
          {(searchTerm || selectedSeriesFilter !== 'all' || statusFilter !== 'all' || mediaFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSeriesFilter('all');
                setStatusFilter('all');
                setMediaFilter('all');
                setSelectedLaunchYear('all');
              }}
              className={styles.actionPillBtn}
              style={{ marginTop: '0.5rem', background: '#141724', border: '1px solid #282e44', color: 'var(--foreground-secondary)' }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div 
            className={styles.modalContent} 
            style={{ maxWidth: '850px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Series Artwork & Context */}
            {(() => {
              const activeSeriesObj = seriesList.find(s => s.id === formSeriesId);
              const activeSeasonObj = seasonsList.find(s => s.id === formSeasonId);
              const posterKey = activeSeriesObj?.poster_image_key || activeSeriesObj?.cover_image_key;
              const posterUrl = posterKey ? getR2Url(posterKey, 'poster') : null;

              return (
                <div className={styles.modalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '40px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: '#1a1e2f', border: '1px solid #282e44', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {posterUrl ? (
                        <img src={posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Film size={18} style={{ color: 'var(--foreground-muted)' }} />
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                        {editingId ? 'Edit Episode Details' : 'Add New Episode'}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)', marginTop: '0.15rem', display: 'block' }}>
                        {activeSeriesObj?.title || 'Selected Show'} • <span style={{ color: '#c4b5fd' }}>{activeSeasonObj?.title || 'Season'}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className={styles.expandToggleBtn}
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })()}

            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                {error && (
                  <div className={styles.errorAlert}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Show & Season Pickers */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Parent Series</label>
                    <select
                      required
                      disabled={isFormLocked}
                      className={styles.selectField}
                      value={formSeriesId}
                      onChange={(e) => handleFormSeriesChange(e.target.value)}
                    >
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Parent Season</label>
                    <select
                      required
                      disabled={isFormLocked}
                      className={styles.selectField}
                      value={formSeasonId}
                      onChange={(e) => setFormSeasonId(e.target.value)}
                    >
                      {filteredSeasonsFormList.length === 0 && (
                        <option value="">-- No Seasons Available --</option>
                      )}
                      {filteredSeasonsFormList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Episode Number & Title with Quick Presets */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ maxWidth: '140px' }}>
                    <label>Episode #</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className={styles.inputField}
                      value={episodeNumber}
                      onChange={(e) => {
                        const num = parseInt(e.target.value) || 1;
                        setEpisodeNumber(num);
                        if (!title || /^Episode\s+\d+$/i.test(title)) {
                          setTitle(`Episode ${num}`);
                        }
                      }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ flex: '1 1 300px' }}>
                    <label>Episode Title</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="e.g. Episode Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />

                    {/* Quick Title Presets */}
                    <div className={styles.quickPresetsRow}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>Quick:</span>
                      <button
                        type="button"
                        onClick={() => setTitle(`Episode ${episodeNumber}`)}
                        className={styles.quickPillBtn}
                      >
                        ⚡ Ep {episodeNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTitle(`OVA ${episodeNumber}`)}
                        className={styles.quickPillBtn}
                      >
                        ⚡ OVA {episodeNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTitle(`Special ${episodeNumber}`)}
                        className={styles.quickPillBtn}
                      >
                        ⚡ Special {episodeNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTitle(`Part ${episodeNumber}`)}
                        className={styles.quickPillBtn}
                      >
                        ⚡ Part {episodeNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!title.includes('[Uncensored]')) {
                            setTitle(`${title.trim()} [Uncensored]`);
                          }
                        }}
                        className={styles.quickPillBtn}
                      >
                        ⚡ [Uncensored]
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Upload Area */}
                <div className={styles.formGroup}>
                  <FileUploader
                    label="Video Stream File (MP4, MKV, WebM)"
                    acceptedTypes="video/*"
                    maxSizeMb={2000}
                    initialValue={videoKey}
                    onUploadComplete={(key) => {
                      setVideoKey(key);
                      setSessionKeys((prev) => [...prev, key]);
                    }}
                    onClear={() => {
                      setVideoKey('');
                      setVideoFile(null);
                    }}
                    onFileSelect={async (file) => {
                      setVideoFile(file);
                      try {
                        const dur = await extractVideoDuration(file);
                        setDurationSeconds(dur);
                      } catch (err) {
                        console.error('Error reading video duration:', err);
                      }
                    }}
                  />
                </div>

                {/* Duration & Thumbnail Area */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: '1 1 260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Duration (Seconds)</label>
                      <span className={styles.videoBadge}>
                        ⏱️ {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      min={1}
                      className={styles.inputField}
                      placeholder="e.g. 1440"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ flex: '1 1 260px' }}>
                    <label>Thumbnail Image (16:9)</label>
                    <FileUploader
                      acceptedTypes="image/*"
                      maxSizeMb={10}
                      initialValue={thumbnailKey}
                      onUploadComplete={(key) => {
                        setThumbnailKey(key);
                        setSessionKeys((prev) => [...prev, key]);
                      }}
                      onClear={() => setThumbnailKey('')}
                      previewType="cover"
                    />
                  </div>
                </div>

                {/* Scheduled Release Date with Quick Presets */}
                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Scheduled Air / Release Date</label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                      Local time: {new Date(releaseDate || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    className={styles.inputField}
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />

                  {/* Quick Air Date Presets */}
                  <div className={styles.quickPresetsRow}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>Presets (12:00 AM):</span>
                    <button
                      type="button"
                      onClick={() => setQuickReleaseDate('today')}
                      className={styles.quickPillBtn}
                    >
                      ⚡ Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReleaseDate('yesterday')}
                      className={styles.quickPillBtn}
                    >
                      ⚡ Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReleaseDate('week_ago')}
                      className={styles.quickPillBtn}
                    >
                      ⚡ 1 Week Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReleaseDate('month_ago')}
                      className={styles.quickPillBtn}
                    >
                      ⚡ 1 Month Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReleaseDate('next_week')}
                      className={styles.quickPillBtn}
                    >
                      ⚡ Next Week
                    </button>
                  </div>
                </div>

                {/* Status & Options Row */}
                <div className={styles.formRow} style={{ alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1f2438', paddingTop: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label style={{ marginBottom: '0.3rem' }}>Catalog Visibility</label>
                    <div className={styles.statusToggleContainer}>
                      <button
                        type="button"
                        onClick={() => setIsPublished(true)}
                        className={`${styles.statusToggleOption} ${isPublished ? styles.statusToggleOptionActivePublished : ''}`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                        <span>● Published (Live)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPublished(false)}
                        className={`${styles.statusToggleOption} ${!isPublished ? styles.statusToggleOptionActiveDraft : ''}`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                        <span>● Draft (Hidden)</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ flex: '0 0 auto' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.2rem', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={isPreview}
                        onChange={(e) => setIsPreview(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                        🎬 Mark as Preview / Trailer
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={styles.modalFooter}>
                <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)', marginRight: 'auto' }}>
                  ⌨️ Press <kbd style={{ background: '#1e2438', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #2e3752' }}>Ctrl+S</kbd> to save
                </span>

                <button type="button" onClick={handleCloseModal} className={styles.actionPillBtn} style={{ background: '#1a1e2f', color: 'var(--foreground-secondary)', border: '1px solid #282e44', padding: '0.55rem 1.2rem' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !formSeasonId} 
                  className={styles.createBtn}
                  style={{ padding: '0.55rem 1.6rem' }}
                >
                  {saving ? 'Saving Episode...' : editingId ? 'Save Changes' : 'Create Episode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isThumbModalOpen && thumbModalEpisode && (
        <div className={styles.studioOverlay}>
          <div className={styles.studioModal}>
            {/* Header */}
            <div className={styles.studioHeader}>
              <div className={styles.studioHeaderLeft}>
                <h3 className={styles.studioHeaderTitle}>
                  <Camera size={22} style={{ color: 'var(--primary)' }} />
                  <span>Thumbnail Studio 2.0</span>
                </h3>
                <div className={styles.studioBreadcrumbs}>
                  <span>🎬 {thumbModalEpisode.seasons?.series?.title || 'Series'}</span>
                  <span>•</span>
                  <span>{thumbModalEpisode.seasons?.title || 'Season 1'}</span>
                  <span>•</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>Episode {thumbModalEpisode.episode_number}: {thumbModalEpisode.title}</span>
                </div>
              </div>

              <div className={styles.studioHeaderRight}>
                {/* Active Source Status Badge & Switcher */}
                {localScrubFile ? (
                  <div className={styles.studioSourceBadge} style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34d399' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontWeight: 800 }}>📁 Local Video (Native GPU)</span>
                    <label style={{ cursor: 'pointer', color: '#6ee7b7', textDecoration: 'underline', fontSize: '0.7rem', marginLeft: '0.2rem' }}>
                      <span>Change File</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLocalFileSelectForScrub(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {thumbModalEpisode.video_key && (
                      <>
                        <span style={{ color: '#4b5563' }}>•</span>
                        <button
                          type="button"
                          onClick={handleLoadFromR2}
                          style={{ background: 'transparent', border: 'none', color: '#c4b5fd', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.7rem' }}
                        >
                          Switch to Remote R2
                        </button>
                      </>
                    )}
                  </div>
                ) : isRemoteVideoLoaded ? (
                  <div className={styles.studioSourceBadge}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 2s infinite' }} />
                    <span>Streaming Cloudflare R2</span>
                    <label style={{ cursor: 'pointer', color: '#34d399', fontWeight: 700, textDecoration: 'underline', fontSize: '0.7rem', marginLeft: '0.3rem' }}>
                      <span>📁 Switch to Local File (Native HD)</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLocalFileSelectForScrub(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className={styles.studioSourceBadge} style={{ background: 'rgba(124, 58, 237, 0.15)', borderColor: 'rgba(124, 58, 237, 0.35)', color: '#c4b5fd' }}>
                    <span>📁 First Source: Local File</span>
                    <label style={{ cursor: 'pointer', color: '#ffffff', background: 'var(--primary)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.68rem', marginLeft: '0.3rem', fontWeight: 800 }}>
                      <span>+ Select Local Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLocalFileSelectForScrub(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {thumbModalEpisode.video_key && (
                      <button
                        type="button"
                        onClick={handleLoadFromR2}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.68rem', marginLeft: '0.2rem' }}
                      >
                        or Stream R2
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setIsThumbModalOpen(false)}
                  style={{ background: '#181d2e', border: '1px solid #2a334d', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: 'var(--foreground-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Close Thumbnail Studio"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {thumbStudioError && (
              <div className={styles.errorAlert} style={{ margin: '0.75rem 1.5rem 0', borderRadius: '10px' }}>
                <AlertCircle size={16} />
                <span>{thumbStudioError}</span>
              </div>
            )}

            {/* Tabs Strip */}
            <div className={styles.studioTabs}>
              <div className={styles.studioTabList}>
                <button
                  onClick={() => setThumbActiveTab('auto')}
                  className={`${styles.studioTabBtn} ${thumbActiveTab === 'auto' ? styles.studioTabBtnActive : ''}`}
                >
                  <Sparkles size={15} style={{ color: 'var(--primary)' }} />
                  <span>Auto-Generate Candidates</span>
                  {batchOptions.length > 0 && (
                    <span className={styles.studioTabBadge}>{batchOptions.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setThumbActiveTab('scrub')}
                  className={`${styles.studioTabBtn} ${thumbActiveTab === 'scrub' ? styles.studioTabBtnActive : ''}`}
                >
                  <Film size={15} />
                  <span>Precise Player Scrubbing & Snapper</span>
                </button>
                <button
                  onClick={() => setThumbActiveTab('upload')}
                  className={`${styles.studioTabBtn} ${thumbActiveTab === 'upload' ? styles.studioTabBtnActive : ''}`}
                >
                  <UploadCloud size={15} />
                  <span>Upload & Paste (Ctrl+V)</span>
                </button>
              </div>

              {/* Regenerate Action */}
              {thumbActiveTab === 'auto' && (localScrubFile || isRemoteVideoLoaded) && (
                <button
                  type="button"
                  disabled={isGeneratingBatch}
                  onClick={() => {
                    if (localScrubFile) {
                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                    } else if (thumbModalEpisode?.video_key) {
                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                    }
                  }}
                  style={{
                    background: '#1a1e2f',
                    border: '1px solid #2e3752',
                    color: '#c4b5fd',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                    opacity: isGeneratingBatch ? 0.5 : 1
                  }}
                >
                  <span>🔄 Regenerate Batch</span>
                </button>
              )}
            </div>

            {/* Studio Body Content */}
            <div className={styles.studioBody}>
              {thumbActiveTab === 'upload' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  {/* Shortcut Tip */}
                  <div style={{ background: '#121522', border: '1px solid #23283b', borderRadius: '12px', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', flexShrink: 0 }}>
                      <Copy size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc' }}>
                        📋 Quick Screenshot Paste (<kbd style={{ background: '#1e2438', border: '1px solid #2e3752', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem' }}>Ctrl + V</kbd>)
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        You can take a screenshot anywhere (<kbd style={{ background: '#1e2438', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Win+Shift+S</kbd>) and press <kbd style={{ background: '#1e2438', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Ctrl+V</kbd> right here to instantly upload it to Cloudflare R2!
                      </div>
                    </div>
                  </div>

                  {/* Multi-File Upload Box */}
                  <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#121522', borderRadius: '16px', border: '1px solid #23283b' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Upload Custom Thumbnail Images
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                      Select or drag 16:9 images (JPG, PNG, WebP) from your computer to add them to this episode.
                    </p>
                    <FileUploader
                      label="Select or Drag Image Files"
                      acceptedTypes="image/*"
                      maxSizeMb={10}
                      multiple={true}
                      onUploadComplete={handleCustomThumbnailUploadComplete}
                      onMultipleUploadComplete={handleMultipleCustomThumbnailsUploaded}
                      previewType="cover"
                    />
                  </div>
                </div>
              ) : !localScrubFile && !isRemoteVideoLoaded ? (
                /* Empty Video Source Picker */
                <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#121522', borderRadius: '16px', border: '1px dashed #282e44', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', margin: 'auto 0' }}>
                  <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd' }}>
                    <Video size={28} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.4rem 0' }}>Select Video Source to Generate Previews</h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto' }}>
                      Choose a local video file from your computer for instant zero-bandwidth GPU extraction or connect to Cloudflare R2 storage.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <label style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', color: 'white', border: 'none', padding: '0.6rem 1.4rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}>
                      <Plus size={16} />
                      <span>Choose Local Video File</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLocalFileSelectForScrub(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {thumbModalEpisode.video_key && (
                      <button
                        type="button"
                        onClick={handleLoadFromR2}
                        style={{ background: '#1a1e2f', color: '#f8fafc', border: '1px solid #2e3752', padding: '0.6rem 1.4rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <span>🌐 Stream Remote R2 Video</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* TAB 1: AUTO-GENERATE CANDIDATES */}
                  {thumbActiveTab === 'auto' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {/* Control Panel */}
                      <div className={styles.studioControlPanel}>
                        {/* Row 1: Mode Switches & Generation Toggles */}
                        <div className={styles.studioControlRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
                              TIMELINE MINUTES:
                            </span>
                            <div style={{ display: 'inline-flex', background: '#0f121d', borderRadius: '10px', padding: '0.2rem', border: '1px solid #23283b' }}>
                              <button
                                type="button"
                                onClick={() => setMinuteInteractionMode('focus')}
                                style={{
                                  background: minuteInteractionMode === 'focus' ? 'var(--primary)' : 'transparent',
                                  color: minuteInteractionMode === 'focus' ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🎯 Focus
                              </button>
                              <button
                                type="button"
                                onClick={() => setMinuteInteractionMode('exclude')}
                                style={{
                                  background: minuteInteractionMode === 'exclude' ? '#ef4444' : 'transparent',
                                  color: minuteInteractionMode === 'exclude' ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🚫 Exclude
                              </button>
                            </div>

                            {/* Minute timeline pills */}
                            <div className={styles.studioTimelinePills}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFocusedMinutes([]);
                                  handleStepChange(serialStepSec);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), []);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), []);
                                  }
                                }}
                                className={`${styles.studioPill} ${focusedMinutes.length === 0 ? styles.studioPillActive : ''}`}
                              >
                                Full Video
                              </button>
                              {Array.from({ length: Math.ceil(videoDuration / 60) || 12 }).map((_, i) => {
                                const isExcluded = excludedMinutes.includes(i);
                                const isFocused = focusedMinutes.includes(i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      if (minuteInteractionMode === 'exclude') {
                                        setExcludedMinutes((prev) =>
                                          prev.includes(i) ? prev.filter((m) => m !== i) : [...prev, i]
                                        );
                                      } else {
                                        const nextMins = focusedMinutes.includes(i)
                                          ? focusedMinutes.filter((m) => m !== i)
                                          : [...focusedMinutes, i];
                                        setFocusedMinutes(nextMins);
                                        handleStepChange(serialStepSec);
                                        if (autoGenerateOnClick) {
                                          if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), nextMins);
                                          else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), nextMins);
                                        }
                                      }
                                    }}
                                    className={`${styles.studioPill} ${isFocused ? styles.studioPillActive : ''}`}
                                    style={isExcluded ? { background: 'rgba(239, 68, 68, 0.25)', borderColor: '#ef4444', color: '#ef4444' } : {}}
                                  >
                                    {isExcluded ? `🚫 ${i}` : isFocused ? `🎯 ${i}` : i}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Toggles */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={autoGenerateOnClick}
                                onChange={(e) => setAutoGenerateOnClick(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                              />
                              <span>⚡ Auto-Generate</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }} title="Skip frames with burned-in subtitles">
                              <input
                                type="checkbox"
                                checked={skipSubtitles}
                                onChange={(e) => setSkipSubtitles(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                              />
                              <span>🛡️ Skip Subtitles</span>
                            </label>
                            {isGeneratingBatch ? (
                              <button
                                type="button"
                                onClick={() => {
                                  cancelGenerationRef.current = true;
                                  setIsGeneratingBatch(false);
                                }}
                                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.85rem', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                🛑 Stop
                              </button>
                            ) : (
                              !autoGenerateOnClick && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                  }}
                                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.35rem 0.95rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                  ⚡ Generate Now
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Row 2: Range, Quantity, Step & Quality Settings */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #1a1f2e', paddingTop: '0.7rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                            {/* Quantity Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Options:</span>
                              <select
                                value={targetOptionCount}
                                onChange={(e) => handleCountChange(parseInt(e.target.value))}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#141724', width: 'auto' }}
                              >
                                <option value={12}>12 Previews</option>
                                <option value={24}>24 Previews</option>
                                <option value={36}>36 Previews</option>
                                <option value={48}>48 Previews</option>
                                <option value={60}>60 Previews</option>
                              </select>
                            </div>

                            {/* Range Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Range:</span>
                              <select
                                value={timeframeWindow}
                                onChange={(e) => {
                                  const nextWindow = e.target.value as any;
                                  setTimeframeWindow(nextWindow);
                                  handleStepChange(serialStepSec);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes, fpsPreset, serialStepSec, cpuMode, nextWindow);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes, fpsPreset, serialStepSec, cpuMode, nextWindow);
                                  }
                                }}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#141724', width: 'auto' }}
                              >
                                <option value="full">Full Video 100%</option>
                                <option value="first25">First 25% (Intro)</option>
                                <option value="first50">First 50%</option>
                                <option value="middle50">Middle 50%</option>
                                <option value="last50">Last 50%</option>
                                <option value="last25">Last 25% (Outro)</option>
                              </select>
                            </div>

                            {/* Step Interval Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Interval:</span>
                              <select
                                value={serialStepSec}
                                onChange={(e) => {
                                  const nextStep = parseFloat(e.target.value);
                                  handleStepChange(nextStep);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes, fpsPreset, nextStep);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes, fpsPreset, nextStep);
                                  }
                                }}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#141724', width: 'auto' }}
                              >
                                <option value={0.5}>0.5s Step</option>
                                <option value={1.0}>1.0s Step</option>
                                <option value={2.0}>2.0s Step</option>
                                <option value={5.0}>5.0s Step</option>
                                <option value={10.0}>10.0s Step</option>
                                <option value={0}>Auto Uniform</option>
                              </select>
                            </div>

                            <span style={{ color: '#2e3752' }}>|</span>

                            {/* Resolution Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#c4b5fd', fontWeight: 800 }}>📐 Resolution:</span>
                              <select
                                value={thumbResolution}
                                onChange={(e) => {
                                  const nextRes = e.target.value as any;
                                  setThumbResolution(nextRes);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                  }
                                }}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#181b2c', borderColor: '#3b4363', color: '#f8fafc', width: 'auto', fontWeight: 700 }}
                              >
                                <option value="native">Native Video (Max Quality)</option>
                                <option value="1080p">1080p Full HD</option>
                                <option value="720p">720p HD</option>
                                <option value="4k">4K Ultra HD</option>
                              </select>
                            </div>

                            {/* Quality Mode Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 800 }}>💎 Quality:</span>
                              <select
                                value={thumbQualityMode}
                                onChange={(e) => {
                                  const nextQ = e.target.value as any;
                                  setThumbQualityMode(nextQ);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                  }
                                }}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#181b2c', borderColor: '#3b4363', color: '#f8fafc', width: 'auto', fontWeight: 700 }}
                              >
                                <option value="ultra">Ultra HD (98% Crisp)</option>
                                <option value="max">100% Maximum Quality</option>
                                <option value="high">High (92% Quality)</option>
                                <option value="standard">Standard Web (85%)</option>
                              </select>
                            </div>

                            {/* Format Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>Format:</span>
                              <select
                                value={thumbImageFormat}
                                onChange={(e) => {
                                  const nextFmt = e.target.value as any;
                                  setThumbImageFormat(nextFmt);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    else if (thumbModalEpisode?.video_key) generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                  }
                                }}
                                className={styles.selectField}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.76rem', background: '#141724', width: 'auto' }}
                              >
                                <option value="image/jpeg">JPEG (.jpg)</option>
                                <option value="image/webp">WebP (.webp)</option>
                                <option value="image/png">PNG (.png Lossless)</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            <span>Total Extracted: <b style={{ color: '#f8fafc' }}>{batchOptions.length}</b> candidates</span>
                          </div>
                        </div>
                      </div>

                      {/* Live Extraction Progress */}
                      {isGeneratingBatch && genProgress && (
                        <div style={{ background: '#121522', border: '1px solid #23283b', borderRadius: '12px', padding: '0.65rem 1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.76rem', fontWeight: 700, color: '#f8fafc' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                              Extracting Candidate Frames...
                            </span>
                            <span style={{ color: '#c4b5fd', fontFamily: 'monospace' }}>
                              {genProgress.current} / {genProgress.total} ({Math.round((genProgress.current / Math.max(1, genProgress.total)) * 100)}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#1e2438', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.round((genProgress.current / Math.max(1, genProgress.total)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)', transition: 'width 0.15s ease' }} />
                          </div>
                        </div>
                      )}

                      {/* Candidate Grid */}
                      {batchOptions.length > 0 || isGeneratingBatch ? (
                        <div className={styles.studioGrid}>
                          {batchOptions.map((opt, idx) => (
                            <div key={idx} className={styles.studioThumbCard}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={opt.dataUrl} alt={`Option ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                              <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: '#0f121d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, border: '1px solid #23283b' }}>
                                {opt.sizeKb} KB
                              </div>

                              {opt.time !== undefined && (
                                <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#0f121d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.62rem', color: '#f8fafc', fontWeight: 700, border: '1px solid #23283b', fontFamily: 'monospace' }}>
                                  ⏱️ {formatVideoTime(opt.time)}
                                </div>
                              )}

                              {/* Hover Action Overlay */}
                              <div className={styles.studioThumbOverlay}>
                                <button
                                  type="button"
                                  onClick={() => saveThumbnailOptionToR2(opt.dataUrl, true)}
                                  disabled={savingThumbStudio}
                                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', width: '90%', textAlign: 'center' }}
                                >
                                  ★ Set Active
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveThumbnailOptionToR2(opt.dataUrl, false)}
                                  disabled={savingThumbStudio}
                                  style={{ background: '#1e2438', color: '#f8fafc', border: '1px solid #2e3752', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', width: '90%', textAlign: 'center' }}
                                >
                                  💾 Save Option
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomImageUrl(opt.dataUrl);
                                  }}
                                  style={{ background: '#0f121d', color: '#94a3b8', border: '1px solid #23283b', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', width: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                >
                                  <Maximize2 size={11} />
                                  <span>Zoom HD</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          {isGeneratingBatch && Array.from({ length: Math.max(0, targetOptionCount - batchOptions.length) }).map((_, sIdx) => (
                            <div key={`skel-${sIdx}`} className={styles.studioThumbCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121522', border: '1px dashed #23283b' }}>
                              <div className={styles.loadingSpinner} style={{ width: '18px', height: '18px', border: '2px solid rgba(124, 58, 237, 0.2)', borderTopColor: 'var(--primary)' }} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '3rem 1rem', textAlign: 'center', background: '#121522', borderRadius: '12px', border: '1px dashed #23283b' }}>
                          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
                            Click "Generate Now" or choose a timeline minute to extract candidates.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PRECISE PLAYER SCRUBBING & SNAPPER */}
                  {thumbActiveTab === 'scrub' && (
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      {/* Left Player Panel */}
                      <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#121522', padding: '1rem', borderRadius: '16px', border: '1px solid #23283b' }}>
                        {/* Video Player Box */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid #23283b' }}>
                          <video
                            ref={scrubVideoRef}
                            crossOrigin="anonymous"
                            src={scrubVideoSrc}
                            controls
                            playsInline
                            onTimeUpdate={(e) => setScrubCurrentTime((e.target as HTMLVideoElement).currentTime)}
                            onLoadedMetadata={(e) => setVideoDuration((e.target as HTMLVideoElement).duration)}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#0d0f17', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, border: '1px solid #23283b', pointerEvents: 'none' }}>
                            🖱️ Wheel to scrub frames
                          </div>
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#0d0f17', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', color: '#f8fafc', fontWeight: 800, fontFamily: 'monospace', border: '1px solid #23283b', pointerEvents: 'none' }}>
                            ⏱️ {formatVideoTime(scrubCurrentTime)}
                          </div>
                        </div>

                        {/* Stepper Toolbar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: '#0f121d', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #23283b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700 }}>Intensity:</span>
                            <select
                              value={scrubIntensity}
                              onChange={(e) => setScrubIntensity(e.target.value as any)}
                              className={styles.selectField}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#141724', width: 'auto' }}
                            >
                              <option value="frame">🎯 1 Frame (0.04s)</option>
                              <option value="fine">⏱️ Fine (0.2s)</option>
                              <option value="jog">⚡ Jog (1.0s)</option>
                              <option value="turbo">🚀 Turbo (5.0s)</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(-5.0)}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#141724' }}
                            >
                              -5s
                            </button>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(-1.0)}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#141724' }}
                            >
                              -1s
                            </button>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(-getIntensityStepSec())}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800 }}
                            >
                              -{scrubIntensity === 'frame' ? '1 Frame' : `${getIntensityStepSec()}s`}
                            </button>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(getIntensityStepSec())}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800 }}
                            >
                              +{scrubIntensity === 'frame' ? '1 Frame' : `${getIntensityStepSec()}s`}
                            </button>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(1.0)}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#141724' }}
                            >
                              +1s
                            </button>
                            <button
                              type="button"
                              onClick={() => stepScrubVideo(5.0)}
                              className={styles.actionPillBtn}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#141724' }}
                            >
                              +5s
                            </button>
                          </div>
                        </div>

                        {/* Snapshot Capture Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const video = scrubVideoRef.current;
                            if (video) {
                              const { width: targetW, height: targetH } = getTargetDimensions(video, thumbResolution);
                              const canvas = document.createElement('canvas');
                              canvas.width = targetW;
                              canvas.height = targetH;
                              const ctx = canvas.getContext('2d', { alpha: false });
                              if (ctx) {
                                try {
                                  ctx.imageSmoothingEnabled = true;
                                  ctx.imageSmoothingQuality = 'high';
                                  ctx.drawImage(video, 0, 0, targetW, targetH);
                                  const qualityFloat = getQualityFloat(thumbQualityMode);
                                  const dataUrl = thumbImageFormat === 'image/png'
                                    ? canvas.toDataURL('image/png')
                                    : canvas.toDataURL(thumbImageFormat, qualityFloat);
                                  const sizeInBytes = Math.round((dataUrl.split(',')[1].length * 3) / 4);
                                  const sizeKb = Math.round((sizeInBytes / 1024) * 10) / 10;
                                  setCapturedFrameUrl(dataUrl);
                                  setCapturedFrameSizeKb(sizeKb);
                                  setThumbStudioError(null);
                                } catch (e) {
                                  setThumbStudioError('Failed to capture frame due to browser CORS security policies. Please choose the local video file for offline GPU capture.');
                                }
                              }
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.65rem 1.25rem',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
                          }}
                        >
                          <Camera size={16} />
                          <span>📸 Capture HD Frame ({thumbResolution.toUpperCase()})</span>
                        </button>
                      </div>

                      {/* Right Captured Frame Panel */}
                      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#121522', padding: '1rem', borderRadius: '16px', border: '1px solid #23283b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#f8fafc', letterSpacing: '0.04em' }}>
                            Captured Frame & Filters
                          </label>
                          {(imageBrightness !== 100 || imageContrast !== 100 || imageSaturation !== 100) && (
                            <button
                              type="button"
                              onClick={() => {
                                setImageBrightness(100);
                                setImageContrast(100);
                                setImageSaturation(100);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#c4b5fd', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <RotateCcw size={11} />
                              <span>Reset Filters</span>
                            </button>
                          )}
                        </div>

                        {capturedFrameUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #23283b', background: '#000' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={capturedFrameUrl}
                                alt="Captured frame"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setZoomImageUrl(capturedFrameUrl)}
                                style={{ position: 'absolute', bottom: '8px', right: '8px', background: '#0d0f17', border: '1px solid #23283b', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.68rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}
                              >
                                <Maximize2 size={11} />
                                <span>Zoom</span>
                              </button>
                            </div>

                            {/* Image Adjustment Sliders */}
                            <div style={{ background: '#0f121d', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #23283b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Sun size={12} /> Brightness</span>
                                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{imageBrightness}%</span>
                              </div>
                              <input
                                type="range"
                                min={50}
                                max={150}
                                value={imageBrightness}
                                onChange={(e) => setImageBrightness(parseInt(e.target.value))}
                                style={{ accentColor: 'var(--primary)', height: '4px', cursor: 'pointer' }}
                              />

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Contrast size={12} /> Contrast</span>
                                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{imageContrast}%</span>
                              </div>
                              <input
                                type="range"
                                min={50}
                                max={150}
                                value={imageContrast}
                                onChange={(e) => setImageContrast(parseInt(e.target.value))}
                                style={{ accentColor: 'var(--primary)', height: '4px', cursor: 'pointer' }}
                              />

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Sliders size={12} /> Saturation</span>
                                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{imageSaturation}%</span>
                              </div>
                              <input
                                type="range"
                                min={50}
                                max={200}
                                value={imageSaturation}
                                onChange={(e) => setImageSaturation(parseInt(e.target.value))}
                                style={{ accentColor: 'var(--primary)', height: '4px', cursor: 'pointer' }}
                              />
                            </div>

                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', padding: '0 0.2rem', fontWeight: 600 }}>
                              <span>Native HD Frame ({thumbResolution.toUpperCase()})</span>
                              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{capturedFrameSizeKb} KB</span>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={async () => {
                                  // Apply CSS filters on a high-res canvas before saving
                                  const img = new Image();
                                  img.src = capturedFrameUrl;
                                  await new Promise(r => { img.onload = r; });
                                  const c = document.createElement('canvas');
                                  c.width = img.naturalWidth || img.width || 1920;
                                  c.height = img.naturalHeight || img.height || 1080;
                                  const ctx = c.getContext('2d', { alpha: false });
                                  if (ctx) {
                                    ctx.imageSmoothingEnabled = true;
                                    ctx.imageSmoothingQuality = 'high';
                                    ctx.filter = `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`;
                                    ctx.drawImage(img, 0, 0, c.width, c.height);
                                    const qualityFloat = getQualityFloat(thumbQualityMode);
                                    const finalUrl = thumbImageFormat === 'image/png'
                                      ? c.toDataURL('image/png')
                                      : c.toDataURL(thumbImageFormat, qualityFloat);
                                    saveThumbnailOptionToR2(finalUrl, true);
                                  } else {
                                    saveThumbnailOptionToR2(capturedFrameUrl, true);
                                  }
                                }}
                                disabled={savingThumbStudio}
                                style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '0.55rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                              >
                                ★ Set Active
                              </button>
                              <button
                                onClick={async () => {
                                  const img = new Image();
                                  img.src = capturedFrameUrl;
                                  await new Promise(r => { img.onload = r; });
                                  const c = document.createElement('canvas');
                                  c.width = img.naturalWidth || img.width || 1920;
                                  c.height = img.naturalHeight || img.height || 1080;
                                  const ctx = c.getContext('2d', { alpha: false });
                                  if (ctx) {
                                    ctx.imageSmoothingEnabled = true;
                                    ctx.imageSmoothingQuality = 'high';
                                    ctx.filter = `brightness(${imageBrightness}%) contrast(${imageContrast}%) saturate(${imageSaturation}%)`;
                                    ctx.drawImage(img, 0, 0, c.width, c.height);
                                    const qualityFloat = getQualityFloat(thumbQualityMode);
                                    const finalUrl = thumbImageFormat === 'image/png'
                                      ? c.toDataURL('image/png')
                                      : c.toDataURL(thumbImageFormat, qualityFloat);
                                    saveThumbnailOptionToR2(finalUrl, false);
                                  } else {
                                    saveThumbnailOptionToR2(capturedFrameUrl, false);
                                  }
                                }}
                                disabled={savingThumbStudio}
                                style={{ flex: 1, background: '#1a1e2f', color: '#f8fafc', border: '1px solid #2e3752', padding: '0.55rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                💾 Save Option
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f121d', border: '1px dashed #23283b', borderRadius: '10px', fontSize: '0.76rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                            Scrub the video player on the left and click "Capture HD Frame" to generate an image!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Bar */}
            <div className={styles.studioFooter}>
              {thumbStudioSavedList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsSavedGalleryOpen(!isSavedGalleryOpen)}
                  style={{
                    background: isSavedGalleryOpen ? 'var(--primary)' : '#181d2e',
                    color: '#ffffff',
                    border: '1px solid #2e3752',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Layers size={14} />
                  <span>Saved Choice Gallery ({thumbStudioSavedList.length})</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{isSavedGalleryOpen ? '▲ Hide' : '▼ View Saved'}</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setIsThumbModalOpen(false)}
                className={styles.createBtn}
                style={{ padding: '0.55rem 2rem', background: '#1e2438', border: '1px solid #2e3752', color: '#f8fafc' }}
              >
                Close Thumbnail Studio
              </button>
            </div>

            {/* Collapsible Saved Gallery Drawer Panel */}
            {thumbStudioSavedList.length > 0 && isSavedGalleryOpen && (
              <div style={{ padding: '0.85rem 1.5rem', background: '#0f121d', borderTop: '1px solid #23283b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>
                    Saved Episode Thumbnails ({thumbStudioSavedList.length} Options) — Click to Set Active
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSavedGalleryOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.74rem' }}
                  >
                    ✕ Close
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', maxHeight: '150px', overflowY: 'auto' }}>
                  {thumbStudioSavedList.map((key) => {
                    const isActive = thumbStudioActiveKey === key;
                    return (
                      <div
                        key={key}
                        style={{
                          position: 'relative',
                          width: '120px',
                          height: '68px',
                          borderRadius: '8px',
                          border: isActive ? '2px solid var(--primary)' : '1px solid #23283b',
                          boxShadow: isActive ? '0 0 12px rgba(124, 58, 237, 0.4)' : 'none',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          background: '#000'
                        }}
                        onClick={() => selectActiveThumbnail(key)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getR2Url(key, 'thumbnail')} alt="Saved preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        {isActive && (
                          <div style={{ position: 'absolute', top: '3px', left: '3px', background: '#10b981', color: 'white', fontSize: '0.55rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                            ★ ACTIVE
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadThumbnailFile(key, `thumbnail-${key.slice(0, 8)}.jpg`);
                          }}
                          style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', padding: 0 }}
                          title="Download Image File"
                        >
                          <Download size={10} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomImageUrl(getR2Url(key, 'thumbnail'));
                          }}
                          style={{ position: 'absolute', bottom: '3px', left: '24px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', padding: 0 }}
                          title="Zoom preview"
                        >
                          <Maximize2 size={9} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThumbnailOption(key);
                          }}
                          style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', padding: 0 }}
                          title="Delete option"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeBatch && !activeBatch.isMinimized && (
        <div className={styles.modalOverlay} onClick={handleCloseBatchModal}>
          <div 
            className={styles.modalContent} 
            style={{ maxWidth: '1180px', width: '96%', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    Add Multiple Episodes (Batch Upload & Multi-Series)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)', marginTop: '0.15rem', display: 'block' }}>
                    Queue videos, customize individual release dates & parent shows, and batch publish to Cloudflare R2.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, isMinimized: true } : b));
                    setActiveBatchId(null);
                  }}
                  className={styles.expandToggleBtn}
                  title="Minimize upload panel (runs in background)"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleCloseBatchModal}
                  disabled={isActiveUploading}
                  className={styles.expandToggleBtn}
                  title="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className={styles.modalBody} style={{ padding: '1.25rem 1.75rem', gap: '1.15rem' }}>
              {/* Batch Defaults Card */}
              <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '14px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--foreground-muted)' }}>
                    ⚙️ Global Batch Defaults (Applies to newly queued files)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 600 }}>
                    You can also override series & release dates individually per file below
                  </span>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                    <label>Default Parent Series</label>
                    <select
                      required
                      disabled={isActiveUploading}
                      className={styles.selectField}
                      value={activeSeriesId}
                      onChange={(e) => handleBatchSeriesChange(e.target.value)}
                    >
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                    <label>Default Season</label>
                    <select
                      required
                      disabled={isActiveUploading}
                      className={styles.selectField}
                      value={activeSeasonId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        updateActiveBatch(b => ({
                          seasonId: sId,
                          files: b.files.map(f => ({ ...f, seasonId: sId }))
                        }));
                      }}
                    >
                      {seasonsList.filter(s => s.series_id === activeSeriesId).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ flex: '1 1 220px' }}>
                    <label>Base Release Date (12:00 AM)</label>
                    <input
                      type="datetime-local"
                      required
                      disabled={isActiveUploading}
                      className={styles.inputField}
                      value={activeBaseReleaseDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        const normalized = match ? `${match[1]}-${match[2]}-${match[3]}T00:00` : val;
                        updateActiveBatch(b => ({
                          baseReleaseDate: normalized,
                          files: b.files.map((f, idx) => ({
                            ...f,
                            releaseDate: calculateItemReleaseDate(normalized, b.schedulingType, idx)
                          }))
                        }));
                      }}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                    <label>Auto-Increment Rule</label>
                    <select
                      disabled={isActiveUploading}
                      className={styles.selectField}
                      value={activeSchedulingType}
                      onChange={(e) => {
                        const sched = e.target.value as any;
                        updateActiveBatch(b => ({ schedulingType: sched }));
                        handleApplySmartDates(sched);
                      }}
                    >
                      <option value="none">Same Base Date for all</option>
                      <option value="1day">+1 Day per subsequent episode</option>
                      <option value="3days">+3 Days per subsequent episode</option>
                      <option value="1week">+1 Week per subsequent episode</option>
                      <option value="2weeks">+2 Weeks per subsequent episode</option>
                      <option value="1month">+1 Month per subsequent episode</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dropper Area (When Empty) */}
              {activeBatchFiles.length === 0 && (
                <div
                  className={styles.dropzone}
                  style={{ minHeight: '220px', padding: '2.5rem' }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleBatchDrop}
                  onClick={() => batchInputRef.current?.click()}
                >
                  <input
                    ref={batchInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept="video/*"
                    multiple
                    onChange={handleBatchFileChange}
                  />
                  <UploadCloud size={42} style={{ color: 'var(--primary)', marginBottom: '0.9rem' }} />
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem', color: 'var(--foreground-primary)' }}>
                    Drag & Drop Multiple Video Files Here
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--foreground-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
                    Supports MP4, MKV, WebM, and AVI. File names with episode numbers (e.g. <code>show_ep01.mp4</code>) will be auto-detected!
                  </div>
                  <button
                    type="button"
                    className={styles.createBtn}
                    style={{ marginTop: '1.2rem', padding: '0.5rem 1.4rem', fontSize: '0.82rem' }}
                  >
                    Browse Video Files
                  </button>
                </div>
              )}

              {/* Queued Files Table & Smart Toolbar */}
              {activeBatchFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Smart Scheduling & Presets Toolbar */}
                  <div className={styles.batchToolbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>
                        📂 {activeBatchFiles.length} Episodes Queued
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>|</span>
                      
                      {/* Date presets */}
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>Schedule:</span>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplySmartDates('none')}
                        className={styles.quickPillBtn}
                        title="Set all episodes to base date"
                      >
                        ⚡ Same Date
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplySmartDates('1day')}
                        className={styles.quickPillBtn}
                        title="Schedule sequentially +1 Day apart"
                      >
                        ⚡ +1 Day Step
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplySmartDates('3days')}
                        className={styles.quickPillBtn}
                        title="Schedule sequentially +3 Days apart"
                      >
                        ⚡ +3 Days Step
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplySmartDates('1week')}
                        className={styles.quickPillBtn}
                        title="Schedule sequentially +1 Week apart"
                      >
                        ⚡ +1 Week Step
                      </button>
                    </div>

                    <div className={styles.batchToolbarActions}>
                      {/* Renumber & Title Presets */}
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleRenumberFiles(1)}
                        className={styles.quickPillBtn}
                        title="Renumber starting from 1"
                      >
                        🔢 Renumber 1..N
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplyTitleTemplate('episode')}
                        className={styles.quickPillBtn}
                        title="Set titles to Episode {N}"
                      >
                        ⚡ "Episode N"
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleApplyTitleTemplate('ova')}
                        className={styles.quickPillBtn}
                        title="Set titles to OVA {N}"
                      >
                        ⚡ "OVA N"
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleToggleAllPublish(true)}
                        className={styles.quickPillBtn}
                        style={{ color: '#34d399' }}
                        title="Publish all episodes immediately"
                      >
                        ✓ All Live
                      </button>
                      <button
                        type="button"
                        disabled={isActiveUploading}
                        onClick={() => handleToggleAllPublish(false)}
                        className={styles.quickPillBtn}
                        style={{ color: '#fbbf24' }}
                        title="Set all episodes as drafts"
                      >
                        ● All Drafts
                      </button>

                      {!isActiveUploading && (
                        <button
                          type="button"
                          onClick={() => updateActiveBatch(b => ({ files: [] }))}
                          className={styles.quickPillBtn}
                          style={{ color: '#ef4444', borderColor: '#450a0a' }}
                        >
                          ✕ Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Queued Files Table */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #23283b', borderRadius: '12px', background: '#0d0f17' }}>
                    <table className={styles.batchTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '48px', textAlign: 'center' }}>Type</th>
                          <th style={{ minWidth: '170px' }}>File Name</th>
                          <th style={{ minWidth: '150px' }}>Parent Show</th>
                          <th style={{ width: '75px' }}>Ep #</th>
                          <th style={{ minWidth: '140px' }}>Episode Title</th>
                          <th style={{ minWidth: '175px' }}>Release Date (12:00 AM)</th>
                          <th style={{ width: '85px', textAlign: 'center' }}>Live?</th>
                          <th style={{ width: '130px' }}>Status</th>
                          {!isActiveUploading && <th style={{ width: '40px' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {activeBatchFiles.map((bf) => {
                          const itemSeriesId = bf.seriesId || activeSeriesId;
                          const itemSeasonId = bf.seasonId || activeSeasonId;
                          const fileSizeMb = (bf.file.size / (1024 * 1024)).toFixed(1);
                          const durationMin = Math.floor(bf.durationSeconds / 60);
                          const durationSec = bf.durationSeconds % 60;

                          return (
                            <tr key={bf.id}>
                              {/* Media Icon */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd' }}>
                                  <Video size={16} />
                                </div>
                              </td>

                              {/* File name & size */}
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--foreground-primary)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bf.file.name}>
                                  {bf.file.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
                                  <span>{fileSizeMb} MB</span>
                                  <span>•</span>
                                  <span style={{ color: '#c4b5fd' }}>{durationMin}m {durationSec}s</span>
                                </div>
                              </td>

                              {/* Parent Show & Season */}
                              <td>
                                <select
                                  disabled={isActiveUploading}
                                  className={styles.selectField}
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', background: '#141724' }}
                                  value={itemSeriesId}
                                  onChange={(e) => handleBatchItemSeriesChange(bf.id, e.target.value)}
                                >
                                  {seriesList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Ep Number */}
                              <td>
                                <input
                                  type="number"
                                  required
                                  disabled={isActiveUploading}
                                  min={1}
                                  className={styles.inputField}
                                  style={{ padding: '0.3rem 0.4rem', textAlign: 'center', fontSize: '0.8rem', width: '100%', background: '#141724' }}
                                  value={bf.episodeNumber}
                                  onChange={(e) => updateBatchItemField(bf.id, 'episodeNumber', parseInt(e.target.value) || 1)}
                                />
                              </td>

                              {/* Title */}
                              <td>
                                <input
                                  type="text"
                                  required
                                  disabled={isActiveUploading}
                                  className={styles.inputField}
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: '100%', background: '#141724' }}
                                  value={bf.title}
                                  onChange={(e) => updateBatchItemField(bf.id, 'title', e.target.value)}
                                />
                              </td>

                              {/* Individual Release Date Picker */}
                              <td>
                                <input
                                  type="datetime-local"
                                  required
                                  disabled={isActiveUploading}
                                  className={styles.inputField}
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', background: '#141724' }}
                                  value={bf.releaseDate || activeBaseReleaseDate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                    const normalized = match ? `${match[1]}-${match[2]}-${match[3]}T00:00` : val;
                                    updateBatchItemField(bf.id, 'releaseDate', normalized);
                                  }}
                                />
                              </td>

                              {/* Publish Toggle */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  disabled={isActiveUploading}
                                  onClick={() => updateBatchItemField(bf.id, 'isPublished', !bf.isPublished)}
                                  style={{
                                    background: bf.isPublished ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    border: bf.isPublished ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                    color: bf.isPublished ? '#34d399' : '#fbbf24',
                                    borderRadius: '12px',
                                    padding: '0.2rem 0.55rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {bf.isPublished ? 'Live' : 'Draft'}
                                </button>
                              </td>

                              {/* Status & Progress */}
                              <td>
                                {bf.status === 'metadata' && (
                                  <span style={{ color: 'var(--foreground-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                                    Analyzing...
                                  </span>
                                )}
                                {bf.status === 'pending' && (
                                  <span style={{ color: 'var(--foreground-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                                    ⏳ Ready
                                  </span>
                                )}
                                {bf.status === 'uploading' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                                      Uploading: {bf.progress}%
                                    </span>
                                    <div style={{ height: '4px', background: '#23283b', borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ width: `${bf.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.1s ease' }} />
                                    </div>
                                  </div>
                                )}
                                {bf.status === 'saving' && (
                                  <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700 }}>
                                    💾 Saving...
                                  </span>
                                )}
                                {bf.status === 'success' && (
                                  <span style={{ color: '#10b981', fontSize: '0.74rem', fontWeight: 700 }}>
                                    ✓ Completed
                                  </span>
                                )}
                                {bf.status === 'error' && (
                                  <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }} title={bf.errorMsg}>
                                    ✗ Failed
                                  </span>
                                )}
                              </td>

                              {/* Remove action */}
                              {!isActiveUploading && (
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatchFile(bf.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                    title="Remove file from queue"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add more files secondary dropzone */}
                  {!isActiveUploading && (
                    <div
                      style={{ border: '1px dashed #282e44', borderRadius: '10px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', cursor: 'pointer', background: '#111420' }}
                      onClick={() => batchInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={handleBatchDrop}
                    >
                      <UploadCloud size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                        ➕ Drop additional video files or click here to add more to this batch
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className={styles.modalFooter}>
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--foreground-muted)' }}>
                  {activeBatchFiles.length} video{activeBatchFiles.length === 1 ? '' : 's'} queued
                </span>
                {activeBatchFiles.length > 0 && (
                  <span style={{ fontSize: '0.76rem', color: '#c4b5fd', fontWeight: 600 }}>
                    • Total: {(activeBatchFiles.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>

              {activeBatchFiles.length > 0 && activeBatchFiles.every(bf => bf.status === 'success') ? (
                <button
                  type="button"
                  onClick={handleCloseBatchModal}
                  className={styles.createBtn}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '0.55rem 2rem' }}
                >
                  ✓ Batch Upload Completed (Done)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseBatchModal}
                    disabled={isActiveUploading}
                    className={styles.actionPillBtn}
                    style={{ background: '#1a1e2f', color: 'var(--foreground-secondary)', border: '1px solid #282e44', padding: '0.55rem 1.2rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartBatchUpload}
                    disabled={isActiveUploading || activeBatchFiles.length === 0 || activeBatchFiles.some(bf => bf.status === 'metadata')}
                    className={styles.createBtn}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '0.55rem 1.8rem' }}
                  >
                    {isActiveUploading ? 'Uploading In Background...' : `Start Batch Upload (${activeBatchFiles.length})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {batches.filter(b => b.isMinimized).map((b, index) => {
        const completedCount = b.files.filter(f => f.status === 'success').length;
        const totalCount = b.files.length;
        const isSuccess = b.status === 'success';
        const isUploading = b.status === 'uploading';
        const isPending = b.status === 'pending';
        const bottomOffset = 20 + index * 125;

        return (
          <div
            key={b.id}
            style={{
              position: 'fixed',
              bottom: `${bottomOffset}px`,
              right: '20px',
              width: '340px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(8px)',
              border: isSuccess ? '1px solid #10b981' : '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '1rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              color: 'var(--foreground)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>
                {isUploading ? 'Uploading Episodes...' : isSuccess ? 'Upload Done' : isPending ? 'Queued in line...' : 'Upload Status'}
              </h4>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBatchId(b.id);
                    setBatches(prev => prev.map(item => item.id === b.id ? { ...item, isMinimized: false } : item));
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--foreground-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem' }}
                  title="Expand upload panel"
                >
                  <Maximize2 size={16} />
                </button>
                {(isSuccess || b.status === 'error') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBatches(prev => prev.filter(item => item.id !== b.id));
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem' }}
                    title="Close panel"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Parent Show: <strong>{seriesList.find(s => s.id === b.seriesId)?.title || 'Selected Show'}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                <span>
                  Progress: {completedCount} / {totalCount} done
                </span>
                {isUploading && (
                  <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Active: {b.files.find(f => f.status === 'uploading')?.file.name || 'Saving...'}
                  </span>
                )}
              </div>
              <div className={styles.track} style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                    height: '100%',
                    background: isSuccess ? '#10b981' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
            {isSuccess && (
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                <span>✓ All uploads completed successfully!</span>
              </div>
            )}
          </div>
        );
      })}

      {/* DYNAMIC LIGHTBOX MODAL FOR ZOOM PREVIEWS */}
      {zoomImageUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999,
            padding: '2rem'
          }}
          onClick={() => setZoomImageUrl(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomImageUrl(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-10px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <X size={20} />
              <span>Close</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={zoomImageUrl} 
              alt="Zoomed Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                borderRadius: '12px', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                objectFit: 'contain'
              }} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
