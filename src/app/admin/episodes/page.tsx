'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Video, Plus, Search, Edit2, Trash2, X, AlertCircle, Clock, Camera, Image as ImageIcon, UploadCloud, Minimize2, Maximize2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader/FileUploader';
import { getR2Url } from '@/utils/r2';
import styles from '../admin.module.css';

interface Series {
  id: string;
  title: string;
  release_year?: number;
  poster_image_key?: string;
  studio?: string;
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
  episodeNumber: number;
  title: string;
  durationSeconds: number;
  videoKey: string;
  thumbnailKey: string;
  status: 'metadata' | 'pending' | 'uploading' | 'saving' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
  isPublished: boolean;
  isPreview: boolean;
}

export default function AdminEpisodesPage() {
  const [episodesList, setEpisodesList] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLaunchYear, setSelectedLaunchYear] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 15;

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLaunchYear, sortBy, sortOrder]);

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
    schedulingType: 'none' | '1day' | '1week';
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
  const [isThumbStudioSaving, setIsThumbStudioSaving] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

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
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setReleaseDate(now.toISOString().slice(0, 16));
    
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
    
    // Format release date for input
    const rDate = ep.release_date ? new Date(ep.release_date) : new Date();
    rDate.setMinutes(rDate.getMinutes() - rDate.getTimezoneOffset());
    setReleaseDate(rDate.toISOString().slice(0, 16));
    
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
      release_date: new Date(releaseDate).toISOString(),
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

  const extractVideoMetadataAndUploadThumb = (file: File): Promise<{ duration: number; thumbnailKey: string }> => {
    return new Promise((resolve) => {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        const randomPercent = 0.15 + Math.random() * 0.7;
        video.currentTime = video.duration * randomPercent;

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
              canvas.toBlob(async (blob) => {
                if (!blob) {
                  URL.revokeObjectURL(videoUrl);
                  resolve({ duration, thumbnailKey: '' });
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
                      URL.revokeObjectURL(videoUrl);
                      resolve({ duration, thumbnailKey: key });
                      return;
                    }
                  }
                } catch (e) {
                  console.error('Failed to upload batch auto thumbnail:', e);
                }
                URL.revokeObjectURL(videoUrl);
                resolve({ duration, thumbnailKey: '' });
              }, 'image/jpeg', 0.95);
            } catch (canvasErr) {
              console.error('Canvas error in batch metadata:', canvasErr);
              URL.revokeObjectURL(videoUrl);
              resolve({ duration, thumbnailKey: '' });
            }
          } else {
            URL.revokeObjectURL(videoUrl);
            resolve({ duration, thumbnailKey: '' });
          }
        };
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        resolve({ duration: 1440, thumbnailKey: '' });
      };
    });
  };
  const handleOpenBatchCreate = (preselectedSeriesId?: string, preselectedSeasonId?: string) => {
    const newBatchId = 'batch-group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const seriesId = preselectedSeriesId || (seriesList[0]?.id || '');
    const relevantSeasons = seasonsList.filter(s => s.series_id === seriesId);
    const seasonId = preselectedSeasonId || (relevantSeasons[0]?.id || '');

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    const newBatch: UploadBatch = {
      id: newBatchId,
      seriesId,
      seasonId,
      files: [],
      schedulingType: 'none',
      baseReleaseDate: now.toISOString().slice(0, 16),
      status: 'editing',
      isMinimized: false
    };

    setBatches(prev => [...prev, newBatch]);
    setActiveBatchId(newBatchId);
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
      const epNum = extractEpisodeNumberFromFilename(file.name, startEpNum + idx);
      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        episodeNumber: epNum,
        title: cleanFilenameToTitle(file.name, epNum),
        durationSeconds: 1440,
        videoKey: '',
        thumbnailKey: '',
        status: 'metadata',
        progress: 0,
        isPublished: false,
        isPreview: false
      };
    });

    setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, files: [...b.files, ...newItems] } : b));

    for (const item of newItems) {
      try {
        const meta = await extractVideoMetadataAndUploadThumb(item.file);
        setBatches(prev => prev.map(b => b.id === activeBatchId ? {
          ...b,
          files: b.files.map(bf => bf.id === item.id ? { ...bf, durationSeconds: meta.duration, thumbnailKey: meta.thumbnailKey, status: 'pending' } : bf)
        } : b));
      } catch (err) {
        console.error('Error generating batch item metadata:', err);
        setBatches(prev => prev.map(b => b.id === activeBatchId ? {
          ...b,
          files: b.files.map(bf => bf.id === item.id ? { ...bf, status: 'pending' } : bf)
        } : b));
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
      // Find which batch contains this item
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

        const baseDate = new Date(freshBatch.baseReleaseDate);
        if (freshBatch.schedulingType === '1day') {
          baseDate.setDate(baseDate.getDate() + i);
        } else if (freshBatch.schedulingType === '1week') {
          baseDate.setDate(baseDate.getDate() + (i * 7));
        }
        const finalReleaseDate = baseDate.toISOString();

        const cleanTitle = bf.title.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '');
        const finalTitle = bf.isPreview ? `[Preview] ${cleanTitle}` : cleanTitle;

        const payload = {
          season_id: freshBatch.seasonId,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this episode? Playback tracking and view logs will be removed!')) return;

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
    setThumbStudioSavedList(ep.thumbnail_options || []);
    setBatchOptions([]);
    setVideoDuration(0);
    setFocusedMinutes([]);
    setLocalScrubFile(null);
    setIsRemoteVideoLoaded(false);
    setCapturedFrameUrl(null);
    setCapturedFrameSizeKb(null);
    setThumbActiveTab('auto');
    setThumbStudioError(null);
    setIsThumbModalOpen(true);
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
          // Draw high-resolution preview frame to collected options array
          const highResCanvas = document.createElement('canvas');
          const hWidth = tempVideo.videoWidth || 1280;
          const hHeight = tempVideo.videoHeight || 720;
          highResCanvas.width = hWidth;
          highResCanvas.height = hHeight;
          const hrCtx = highResCanvas.getContext('2d');
          if (hrCtx) {
            hrCtx.drawImage(tempVideo, 0, 0, highResCanvas.width, highResCanvas.height);
            const dataUrl = highResCanvas.toDataURL('image/jpeg', 0.94);
            const sizeInBytes = Math.round((dataUrl.split(',')[1].length * 3) / 4);
            const sizeKb = Math.round((sizeInBytes / 1024) * 10) / 10;
            collected.push({ dataUrl, sizeKb, time: currentTime });
          } else {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
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
        'Could not extract frames automatically via CDN. This is usually due to CDN/CORS browser security. Try dropping your local episode video file below to enable full offline GPU frame capture!'
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
      const filename = `thumb-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
      
      const presignRes = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: 'image/jpeg' })
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error || 'Failed to get presigned URL');

      const { url, key } = presignData;
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
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

  const toggleSeriesExpand = (seriesId: string) => {
    const next = new Set(expandedSeriesIds);
    if (next.has(seriesId)) {
      next.delete(seriesId);
    } else {
      next.add(seriesId);
    }
    setExpandedSeriesIds(next);
  };

  const filteredSeries = seriesList.filter((series) => {
    if (selectedLaunchYear !== 'all' && String(series.release_year) !== selectedLaunchYear) {
      return false;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchesSeries = series.title.toLowerCase().includes(term);
      const sIds = seasonsList.filter(s => s.series_id === series.id).map(s => s.id);
      const matchesEpisodes = episodesList.some(ep => 
        sIds.includes(ep.season_id) && ep.title.toLowerCase().includes(term)
      );
      return matchesSeries || matchesEpisodes;
    }

    return true;
  });

  filteredSeries.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      comp = a.title.localeCompare(b.title);
    } else {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      comp = timeA - timeB;
      if (comp === 0) {
        comp = (a.release_year || 0) - (b.release_year || 0);
      }
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const totalPages = Math.ceil(filteredSeries.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredSeries.length);
  const paginatedSeries = filteredSeries.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSeasonsFormList = seasonsList.filter(
    s => s.series_id === formSeriesId
  );  // Auto-Process queue loop inside useEffect
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
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Manage Episodes</h2>
          <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Upload content routes, thumbnail previews, video length, and schedule releases.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleOpenBatchCreate()} disabled={seasonsList.length === 0} className={styles.createBtn} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Plus size={16} />
            <span>Add Multiple Episodes</span>
          </button>
          <button onClick={() => handleOpenCreate()} disabled={seasonsList.length === 0} className={styles.createBtn}>
            <Plus size={16} />
            <span>Add Episode</span>
          </button>
        </div>
      </div>

      {hasDraft && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.3rem' }}>💡</span>
            <div>
              <span style={{ fontWeight: 700, display: 'block', fontSize: '0.9rem', color: '#60a5fa' }}>Unsaved Draft Detected</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--foreground-secondary)' }}>You have filled form details from a previous session that were not saved.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={handleRestoreDraft} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>
              Restore Draft
            </button>
            <button onClick={handleDiscardDraft} style={{ background: 'transparent', color: 'var(--foreground-muted)', border: '1px solid var(--border)', padding: '0.45rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 300px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Search Episodes or Series</label>
          <div className={styles.searchBarRow} style={{ width: '100%', margin: 0 }}>
            <Search size={16} style={{ color: 'var(--foreground-muted)' }} />
            <input
              type="text"
              placeholder="Type series name or episode title to filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', width: '100%', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '180px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Launch Year</label>
          <select 
            className={styles.selectField}
            style={{ background: 'var(--surface-hover)', padding: '0.5rem 1rem' }}
            value={selectedLaunchYear}
            onChange={(e) => setSelectedLaunchYear(e.target.value)}
          >
            <option value="all">All Years</option>
            {launchYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '180px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Sort By</label>
          <select 
            className={styles.selectField}
            style={{ background: 'var(--surface-hover)', padding: '0.5rem 1rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
          >
            <option value="date">Launch Date</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '160px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Direction</label>
          <select 
            className={styles.selectField}
            style={{ background: 'var(--surface-hover)', padding: '0.5rem 1rem' }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px', display: 'inline-block' }} />
        </div>
      ) : filteredSeries.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedSeries.map((series) => {
              const isExpanded = expandedSeriesIds.has(series.id);
              const seriesSeasons = seasonsList.filter(s => s.series_id === series.id);
              const seriesSeasonIds = seriesSeasons.map(s => s.id);
              const seriesEpisodes = episodesList.filter(ep => 
                seriesSeasonIds.includes(ep.season_id) &&
                (searchTerm.trim() === '' || 
                 ep.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 series.title.toLowerCase().includes(searchTerm.toLowerCase()))
              );

              // Sort episodes: primary by season_id, secondary by episode_number
              seriesEpisodes.sort((a, b) => {
                const aSeason = seasonsList.find(s => s.id === a.season_id);
                const bSeason = seasonsList.find(s => s.id === b.season_id);
                const aNum = aSeason ? aSeason.season_number : 1;
                const bNum = bSeason ? bSeason.season_number : 1;
                if (aNum !== bNum) return aNum - bNum;
                return a.episode_number - b.episode_number;
              });

              return (
                <div 
                  key={series.id} 
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Series Header Card */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                    onClick={() => toggleSeriesExpand(series.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Small Poster preview */}
                      <div style={{ width: '40px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-hover)', border: '1px solid var(--border)', flexShrink: 0 }}>
                        {series.poster_image_key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={getR2Url(series.poster_image_key, 'poster')} 
                            alt="Poster" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'var(--surface-hover)' }} />
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>{series.title}</h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)' }}>
                          {series.studio || 'Unknown Studio'} • {series.release_year || '2026'} • {seriesEpisodes.length} Episodes
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenBatchCreate(series.id, seriesSeasons[0]?.id)}
                        disabled={seriesSeasons.length === 0}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.45rem 1rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Add multiple episodes to this show at once"
                      >
                        <Plus size={12} />
                        <span>Add Multiple</span>
                      </button>

                      <button
                        onClick={() => handleOpenCreate(series.id, seriesSeasons[0]?.id)}
                        disabled={seriesSeasons.length === 0}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '0.45rem 1rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Directly add new episode to this show"
                      >
                        <Plus size={12} />
                        <span>Add Episode</span>
                      </button>

                      <button
                        onClick={() => toggleSeriesExpand(series.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--foreground-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          padding: '0.2rem'
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Closable Episode List table */}
                  {isExpanded && (
                    <div style={{ padding: '0.8rem 1rem' }}>
                      {seriesEpisodes.length > 0 ? (
                        <div className={styles.tableContainer} style={{ margin: 0, boxShadow: 'none', border: 'none' }}>
                          <table className={styles.adminTable} style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '80px' }}>Preview</th>
                                <th>Episode Title</th>
                                <th>Season</th>
                                <th>Number</th>
                                <th>Video Key (R2)</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Air Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {seriesEpisodes.map((ep) => {
                                const sTitle = seasonsList.find(s => s.id === ep.season_id)?.title || 'Season 1';
                                return (
                                  <tr key={ep.id}>
                                    <td>
                                      <div 
                                        style={{ position: 'relative', width: '70px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'var(--surface-hover)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => handleOpenThumbnailModal(ep)}
                                        title="Manage Episode Thumbnails"
                                      >
                                        {ep.thumbnail_key ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img 
                                            src={getR2Url(ep.thumbnail_key, 'thumbnail')} 
                                            alt="Thumb" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                        ) : (
                                          <div style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 800, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                            <Camera size={10} />
                                            <span>GENERATE</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{ep.title}</td>
                                    <td>{sTitle}</td>
                                    <td>{ep.episode_number}</td>
                                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--foreground-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {ep.video_key}
                                    </td>
                                    <td style={{ fontSize: '0.8rem' }}>
                                      {Math.floor(ep.duration_seconds / 60)}m
                                    </td>
                                    <td>
                                      <span className={`${styles.badge} ${ep.is_published ? styles.badgeSuccess : styles.badgeWarning}`}>
                                        {ep.is_published ? 'Published' : 'Draft'}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                                      {new Date(ep.release_date).toLocaleDateString()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                                        <button 
                                          onClick={() => handleOpenThumbnailModal(ep)} 
                                          className={styles.editActionBtn} 
                                          style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                          title="Manage Episode Thumbnails"
                                        >
                                          <Camera size={14} />
                                        </button>
                                        <button onClick={() => handleOpenEdit(ep)} className={styles.editActionBtn} title="Edit Episode Details">
                                          <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(ep.id)} className={styles.deleteActionBtn} title="Delete Episode">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '1rem', color: 'var(--foreground-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          No episodes found for this show matching your search.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filteredSeries.length > 0 && totalPages > 1 && (
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                Showing {startIndex + 1}–{endIndex} of {filteredSeries.length} series (Page {safeCurrentPage} of {totalPages})
              </div>

              <div className={styles.paginationNav}>
                <button
                  className={styles.pageNavBtn}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages <= 7 ||
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= safeCurrentPage - 2 && pageNum <= safeCurrentPage + 2)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        className={`${styles.pageNumberBtn} ${pageNum === safeCurrentPage ? styles.pageNumberActive : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === safeCurrentPage - 3 ||
                    pageNum === safeCurrentPage + 3
                  ) {
                    return (
                      <span key={pageNum} style={{ color: 'var(--foreground-muted)', padding: '0 0.2rem' }}>
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  className={styles.pageNavBtn}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          {seasonsList.length === 0 
            ? 'You need to create a Season first before you can manage episodes!' 
            : 'No series or episodes found matching your filter criteria.'}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '850px', width: '95%' }}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'Edit Episode Details' : 'Add New Episode'}</h3>
              <button
                onClick={handleCloseModal}
                style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {error && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
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

              <div className={styles.formRow} style={{ marginTop: '0.5rem' }}>
                <div className={styles.formGroup} style={{ flex: '1' }}>
                  <label>Episode Number</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className={styles.inputField}
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

               <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                 <label>Episode Title</label>
                 <input
                   type="text"
                   required
                   className={styles.inputField}
                   placeholder="e.g. Episode Title"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                 />
               </div>



              <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                <FileUploader
                  label="Video File"
                  acceptedTypes="video/*"
                  maxSizeMb={500}
                  initialValue={videoKey}
                  onUploadComplete={(key) => {
                    setVideoKey(key);
                    setSessionKeys((prev) => [...prev, key]);
                  }}
                  onClear={() => {
                    setVideoKey('');
                    setVideoFile(null);
                  }}
                  onFileSelect={(file) => {
                    setVideoFile(file);
                    generateThumbnailFromSource(file);
                  }}
                />
              </div>

              <div className={styles.formRow} style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 0 50%' }}>
                  <FileUploader
                    label="Thumbnail Image (16:9)"
                    acceptedTypes="image/*"
                    maxSizeMb={5}
                    initialValue={thumbnailKey}
                    onUploadComplete={(key) => {
                      setThumbnailKey(key);
                      setSessionKeys((prev) => [...prev, key]);
                    }}
                    onClear={() => setThumbnailKey('')}
                    previewType="cover"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                    💡 You can also generate random thumbnails or pick an exact frame from the video player after saving this episode by clicking the image button on the list row.
                  </span>
                </div>
                <div className={styles.formGroup} style={{ flex: '1 0 50%' }}>
                  <label>Duration (in seconds)</label>
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
              </div>

              <div className={styles.formGroup}>
                <label>Scheduled Air / Release Date</label>
                <input
                  type="datetime-local"
                  required
                  className={styles.inputField}
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>

              <div className={styles.checkboxRow} style={{ marginTop: '1rem' }}>
                <input
                  type="checkbox"
                  id="is_preview"
                  checked={isPreview}
                  onChange={(e) => setIsPreview(e.target.checked)}
                />
                <label htmlFor="is_preview">This is a Preview/Trailer Video (marked as preview on public pages)</label>
              </div>


              <div className={styles.checkboxRow} style={{ marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <label htmlFor="is_published">Publish immediately (visible in public catalog)</label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !formSeasonId} className={styles.saveBtn}>
                  {saving ? 'Saving...' : 'Save Episode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isThumbModalOpen && thumbModalEpisode && (
        <div className={styles.modalOverlay}>
          <div 
            className={styles.modalContent} 
            style={{ 
              maxWidth: '96vw', 
              width: '96vw', 
              height: '96vh', 
              maxHeight: '96vh', 
              display: 'flex', 
              flexDirection: 'column',
              padding: '1.5rem',
              margin: 'auto'
            }}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={20} style={{ color: 'var(--primary)' }} />
                  <span>Thumbnail Studio</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', display: 'block' }}>
                  {thumbModalEpisode.seasons?.series?.title || 'Unknown Show'} • {thumbModalEpisode.seasons?.title || 'Season 1'} • Episode {thumbModalEpisode.episode_number}: {thumbModalEpisode.title}
                </span>
              </div>
              <button
                onClick={() => setIsThumbModalOpen(false)}
                style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {thumbStudioError && (
              <div className={styles.errorAlert} style={{ marginBottom: '1.2rem' }}>
                <AlertCircle size={16} />
                <span>{thumbStudioError}</span>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => setThumbActiveTab('auto')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: thumbActiveTab === 'auto' ? '2px solid var(--primary)' : 'none',
                    color: thumbActiveTab === 'auto' ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    padding: '0.6rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  ⚡ Auto-Generate 24 Options
                </button>
                <button
                  onClick={() => setThumbActiveTab('scrub')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: thumbActiveTab === 'scrub' ? '2px solid var(--primary)' : 'none',
                    color: thumbActiveTab === 'scrub' ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    padding: '0.6rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  🎞️ Precise Player Scrubbing
                </button>
                <button
                  onClick={() => setThumbActiveTab('upload')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: thumbActiveTab === 'upload' ? '2px solid var(--primary)' : 'none',
                    color: thumbActiveTab === 'upload' ? 'var(--foreground)' : 'var(--foreground-secondary)',
                    padding: '0.6rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  📤 Upload Custom Thumbnail
                </button>
              </div>

              {/* Generate New Batch Button (Only active when tab is 'auto' and source is loaded) */}
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
                    background: 'rgba(var(--primary-rgb), 0.1)',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    color: 'var(--primary)',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.15s ease',
                    opacity: isGeneratingBatch ? 0.5 : 1,
                    marginBottom: '0.2rem'
                  }}
                >
                  <span>🔄 Regenerate Stepped Batch</span>
                </button>
              )}
            </div>

            {/* Tab contents */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.4rem', minHeight: 0, marginBottom: '1rem' }}>
              {thumbActiveTab === 'upload' ? (
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(15, 23, 42, 0.25)', borderRadius: '12px', border: '1px solid var(--border)', maxWidth: '500px', margin: '2rem auto', width: '100%' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Upload Custom Thumbnail Image
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', margin: 0 }}>
                    Choose or drag a 16:9 image file (JPG, PNG, WebP) from your computer to directly set it as the thumbnail for this episode.
                  </p>
                  <FileUploader
                    label="Upload Custom Thumbnail Image"
                    acceptedTypes="image/*"
                    maxSizeMb={5}
                    onUploadComplete={handleCustomThumbnailUploadComplete}
                    previewType="cover"
                  />
                </div>
              ) : !localScrubFile && !isRemoteVideoLoaded ? (
                <div 
                  style={{ 
                    padding: '3rem 2rem', 
                    textAlign: 'center', 
                    background: 'rgba(255, 255, 255, 0.01)', 
                    borderRadius: '12px', 
                    border: '1px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.2rem',
                    marginBottom: '1.2rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.4rem 0' }}>Load Video Source to Generate Previews</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--foreground-secondary)', maxWidth: '480px', margin: '0 auto' }}>
                      Select a local video file from your computer (instant offline extraction, saves bandwidth) or stream the remote file from Cloudflare R2 storage.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '0.5rem' }}>
                    <label 
                      style={{
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.55rem 1.2rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)'
                      }}
                    >
                      <Plus size={14} />
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

                    <button
                      type="button"
                      onClick={handleLoadFromR2}
                      disabled={!thumbModalEpisode?.video_key}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        padding: '0.55rem 1.2rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        opacity: thumbModalEpisode?.video_key ? 1 : 0.5
                      }}
                    >
                      <span>🌐 Stream Remote R2 Video</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                    {thumbActiveTab === 'auto' && (
                  <div>
                    {/* Re-designed 2-Row Control Header */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '0.85rem', background: 'rgba(15, 23, 42, 0.75)', padding: '0.8rem 1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        
                        {/* Row 1: Mode Switches & Generation Toggles */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.6px' }}>
                              TIMELINE CONTROL:
                            </span>

                            {/* Focus vs Exclude Switcher */}
                            <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '18px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                              <button
                                type="button"
                                onClick={() => setMinuteInteractionMode('focus')}
                                title="Click minutes to FOCUS candidate generation"
                                style={{
                                  background: minuteInteractionMode === 'focus' ? 'var(--primary)' : 'transparent',
                                  color: minuteInteractionMode === 'focus' ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '16px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                🎯 Focus Mode
                              </button>
                              <button
                                type="button"
                                onClick={() => setMinuteInteractionMode('exclude')}
                                title="Click minutes to EXCLUDE them from candidate generation"
                                style={{
                                  background: minuteInteractionMode === 'exclude' ? '#ef4444' : 'transparent',
                                  color: minuteInteractionMode === 'exclude' ? 'white' : '#94a3b8',
                                  border: 'none',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '16px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                🚫 Exclude Mode
                              </button>
                            </div>

                          </div>

                          {/* Toggles & Generation Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                            {focusedMinutes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFocusedMinutes([]);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), []);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), []);
                                    }
                                  }
                                }}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(99, 102, 241, 0.4)',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '14px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Clear Focus ({focusedMinutes.length})
                              </button>
                            )}

                            {excludedMinutes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExcludedMinutes([]);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                    }
                                  }
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '14px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Clear Exclusions ({excludedMinutes.length})
                              </button>
                            )}

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={autoGenerateOnClick}
                                onChange={(e) => setAutoGenerateOnClick(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                              />
                              <span>Auto-Generate</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }} title="Automatically detects and shifts past frames containing burned-in subtitle text">
                              <input
                                type="checkbox"
                                checked={skipSubtitles}
                                onChange={(e) => setSkipSubtitles(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
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
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.3rem 0.85rem',
                                  borderRadius: '16px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🛑 Stop Generation
                              </button>
                            ) : (
                              !autoGenerateOnClick && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes);
                                    }
                                  }}
                                  style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.3rem 0.85rem',
                                    borderRadius: '16px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⚡ Generate Now
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Row 2: Minute Timeline & Option Configuration Dropdowns */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                          {/* Minute Pills Selector (Multi-Select Focus) */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedMinutes([]);
                                handleStepChange(serialStepSec);
                                if (autoGenerateOnClick) {
                                  if (localScrubFile) {
                                    generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), []);
                                  } else if (thumbModalEpisode?.video_key) {
                                    generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), []);
                                  }
                                }
                              }}
                              style={{
                                background: focusedMinutes.length === 0 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)',
                                color: focusedMinutes.length === 0 ? 'white' : '#94a3b8',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                padding: '0.22rem 0.65rem',
                                borderRadius: '12px',
                                fontSize: '0.76rem',
                                fontWeight: focusedMinutes.length === 0 ? 700 : 500,
                                cursor: 'pointer'
                              }}
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
                                        if (localScrubFile) {
                                          generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), nextMins);
                                        } else if (thumbModalEpisode?.video_key) {
                                          generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), nextMins);
                                        }
                                      }
                                    }
                                  }}
                                  style={{
                                    background: isExcluded
                                      ? 'rgba(239, 68, 68, 0.25)'
                                      : isFocused
                                      ? 'var(--primary)'
                                      : 'rgba(255, 255, 255, 0.06)',
                                    color: isExcluded
                                      ? '#ef4444'
                                      : isFocused
                                      ? 'white'
                                      : '#94a3b8',
                                    border: isExcluded
                                      ? '1px solid #ef4444'
                                      : isFocused
                                      ? '1px solid var(--primary)'
                                      : '1px solid rgba(255, 255, 255, 0.12)',
                                    padding: '0.22rem 0.55rem',
                                    borderRadius: '12px',
                                    fontSize: '0.76rem',
                                    fontWeight: isFocused ? 700 : 500,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isExcluded ? `🚫 ${i}` : isFocused ? `🎯 ${i}` : i}
                                </button>
                              );
                            })}
                          </div>

                          {/* Configuration Dropdowns: Range, Step, Preset */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            {/* Timeframe Range Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Choose segment range within focus minute or video">
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Range:</span>
                              <select
                                value={timeframeWindow}
                                onChange={(e) => {
                                  const nextWindow = e.target.value as any;
                                  setTimeframeWindow(nextWindow);
                                  handleStepChange(serialStepSec);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes, fpsPreset, serialStepSec, cpuMode, nextWindow);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes, fpsPreset, serialStepSec, cpuMode, nextWindow);
                                    }
                                  }
                                }}
                                style={{
                                  background: '#1e293b',
                                  color: '#f8fafc',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="full" style={{ background: '#1e293b', color: '#f8fafc' }}>
                                  Full 100% ({focusedMinutes.length === 0 ? `00:00 - ${formatVideoTime(videoDuration || 1440)}` : `${focusedMinutes.length * 60}s`})
                                </option>
                                <option value="first25" style={{ background: '#1e293b', color: '#f8fafc' }}>First 25% Range</option>
                                <option value="first50" style={{ background: '#1e293b', color: '#f8fafc' }}>First 50% Range</option>
                                <option value="first75" style={{ background: '#1e293b', color: '#f8fafc' }}>First 75% Range</option>
                                <option value="middle50" style={{ background: '#1e293b', color: '#f8fafc' }}>Middle 50% Range</option>
                                <option value="last75" style={{ background: '#1e293b', color: '#f8fafc' }}>Last 75% Range</option>
                                <option value="last50" style={{ background: '#1e293b', color: '#f8fafc' }}>Last 50% Range</option>
                                <option value="last25" style={{ background: '#1e293b', color: '#f8fafc' }}>Last 25% Range</option>
                              </select>
                            </div>

                            {/* Serial Step Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Set step time interval between sequential frames">
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Step:</span>
                              <select
                                value={serialStepSec}
                                onChange={(e) => {
                                  const nextStep = parseFloat(e.target.value);
                                  handleStepChange(nextStep);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes, fpsPreset, nextStep);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes, fpsPreset, nextStep);
                                    }
                                  }
                                }}
                                style={{
                                  background: '#1e293b',
                                  color: '#f8fafc',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value={1.0} style={{ background: '#1e293b', color: '#f8fafc' }}>1.0s Step</option>
                                <option value={0.5} style={{ background: '#1e293b', color: '#f8fafc' }}>0.5s Half-sec</option>
                                <option value={0.25} style={{ background: '#1e293b', color: '#f8fafc' }}>0.25s Quarter-sec</option>
                                <option value={2.0} style={{ background: '#1e293b', color: '#f8fafc' }}>2.0s 2-sec</option>
                                <option value={5.0} style={{ background: '#1e293b', color: '#f8fafc' }}>5.0s 5-sec</option>
                                <option value={10.0} style={{ background: '#1e293b', color: '#f8fafc' }}>10.0s 10-sec</option>
                                <option value={0} style={{ background: '#1e293b', color: '#f8fafc' }}>Auto Uniform</option>
                              </select>
                            </div>

                            {/* Preset Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Choose FPS Frame Rate Alignment">
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Preset:</span>
                              <select
                                value={fpsPreset}
                                onChange={(e) => {
                                  const nextPreset = e.target.value as 'smart' | '24fps' | '30fps' | '60fps';
                                  setFpsPreset(nextPreset);
                                  if (autoGenerateOnClick) {
                                    if (localScrubFile) {
                                      generateBatchThumbnailsFromUrl(URL.createObjectURL(localScrubFile), focusedMinutes, nextPreset);
                                    } else if (thumbModalEpisode?.video_key) {
                                      generateBatchThumbnailsFromUrl(getR2Url(thumbModalEpisode.video_key, 'video'), focusedMinutes, nextPreset);
                                    }
                                  }
                                }}
                                style={{
                                  background: '#1e293b',
                                  color: '#f8fafc',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="24fps" style={{ background: '#1e293b', color: '#f8fafc' }}>🎯 Auto Default</option>
                                <option value="30fps" style={{ background: '#1e293b', color: '#f8fafc' }}>🎬 30 FPS Standard</option>
                                <option value="60fps" style={{ background: '#1e293b', color: '#f8fafc' }}>🚀 60 FPS High Motion</option>
                                <option value="smart" style={{ background: '#1e293b', color: '#f8fafc' }}>⚡ Fast Preview</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* Live Progress Bar during Candidate Extraction */}
                    {isGeneratingBatch && genProgress && (
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: '12px',
                        padding: '0.65rem 1rem',
                        marginBottom: '0.85rem',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span> Extracting Candidates...
                          </span>
                          <span style={{ color: 'var(--primary-light)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {genProgress.current} / {genProgress.total} Images ({Math.round((genProgress.current / Math.max(1, genProgress.total)) * 100)}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.round((genProgress.current / Math.max(1, genProgress.total)) * 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
                            borderRadius: '4px',
                            transition: 'width 0.15s ease'
                          }} />
                        </div>
                      </div>
                    )}

                    {batchOptions.length > 0 || isGeneratingBatch ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.6rem' }}>
                        {/* Live Extracted Candidates */}
                        {batchOptions.map((opt, idx) => (
                          <div
                            key={idx}
                            className={styles.studioThumbCard}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opt.dataUrl} alt={`Option ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            <div style={{
                              position: 'absolute',
                              bottom: '6px',
                              left: '6px',
                              background: 'rgba(15, 23, 42, 0.75)',
                              backdropFilter: 'blur(4px)',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              color: 'var(--foreground)',
                              fontWeight: 700,
                              border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                              {opt.sizeKb} KB
                            </div>

                            {opt.time !== undefined && (
                              <div style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                backdropFilter: 'blur(4px)',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.58rem',
                                color: 'white',
                                fontWeight: 700,
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                              }}>
                                ⏱️ {formatVideoTime(opt.time)}
                              </div>
                            )}

                            <div className={styles.studioThumbOverlay}>
                              <button
                                onClick={() => saveThumbnailOptionToR2(opt.dataUrl, true)}
                                disabled={savingThumbStudio}
                                style={{
                                  background: 'var(--primary)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: '85%',
                                  textAlign: 'center'
                                }}
                              >
                                Set Active
                              </button>
                              <button
                                onClick={() => saveThumbnailOptionToR2(opt.dataUrl, false)}
                                disabled={savingThumbStudio}
                                style={{
                                  background: 'rgba(255,255,255,0.1)',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: '85%',
                                  textAlign: 'center'
                                }}
                              >
                                Save Option
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImageUrl(opt.dataUrl);
                                }}
                                style={{
                                  background: 'rgba(15, 23, 42, 0.85)',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  padding: '0.3rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: '85%',
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Maximize2 size={11} />
                                <span>Zoom Preview</span>
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Remaining Placeholder Loaders */}
                        {isGeneratingBatch && Array.from({ length: Math.max(0, targetOptionCount - batchOptions.length) }).map((_, sIdx) => (
                          <div
                            key={`skel-${sIdx}`}
                            style={{
                              aspectRatio: '16/9',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px dashed rgba(255, 255, 255, 0.1)',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <div className={styles.loadingSpinner} style={{ width: '18px', height: '18px', border: '2px solid rgba(var(--primary-rgb), 0.2)', borderTopColor: 'var(--primary)' }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
                          No auto-generated previews loaded yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {thumbActiveTab === 'scrub' && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Player & Controls Panel */}
                    <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(15, 23, 42, 0.75)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                      
                      {/* Video Player Container */}
                      <div style={{ position: 'relative', width: '100%', maxHeight: '280px', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid var(--border)', margin: '0 auto' }}>
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
                        {/* Wheel Hint Badge */}
                        <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
                          🖱️ Scroll wheel to scrub
                        </div>
                        {/* Timestamp Badge */}
                        <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.15)', pointerEvents: 'none' }}>
                          ⏱️ {formatVideoTime(scrubCurrentTime)}
                        </div>
                      </div>

                      {/* Stepper Controls & Intensity Selector Toolbar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: '#0f172a', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        
                        {/* Intensity Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700 }}>Intensity:</span>
                          <select
                            value={scrubIntensity}
                            onChange={(e) => setScrubIntensity(e.target.value as any)}
                            style={{
                              background: '#1e293b',
                              color: '#f8fafc',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              padding: '0.22rem 0.5rem',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="frame" style={{ background: '#1e293b', color: '#818cf8', fontWeight: 800 }}>🎯 Micro Precision (0.04s / 1 Frame)</option>
                            <option value="fine" style={{ background: '#1e293b', color: '#f8fafc' }}>⏱️ Fine Step (0.2s)</option>
                            <option value="jog" style={{ background: '#1e293b', color: '#f8fafc' }}>⚡ Jog Step (1.0s)</option>
                            <option value="turbo" style={{ background: '#1e293b', color: '#f8fafc' }}>🚀 Turbo Shuttle (5.0s)</option>
                          </select>
                        </div>

                        {/* Precision Stepper Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => stepScrubVideo(-5.0)}
                            title="Jump back 5.0 seconds"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.22rem 0.45rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            -5s
                          </button>
                          <button
                            type="button"
                            onClick={() => stepScrubVideo(-1.0)}
                            title="Jump back 1.0 second"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.22rem 0.45rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => stepScrubVideo(-getIntensityStepSec())}
                            title={`Jump back ${getIntensityStepSec() === 0.0416 ? '1 Frame (0.04s)' : `${getIntensityStepSec()}s`}`}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.22rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            🏎️ -{scrubIntensity === 'frame' ? '1 Frame' : `${getIntensityStepSec()}s`}
                          </button>

                          <button
                            type="button"
                            onClick={() => stepScrubVideo(getIntensityStepSec())}
                            title={`Jump forward ${getIntensityStepSec() === 0.0416 ? '1 Frame (0.04s)' : `${getIntensityStepSec()}s`}`}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.22rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            🏎️ +{scrubIntensity === 'frame' ? '1 Frame' : `${getIntensityStepSec()}s`}
                          </button>
                          <button
                            type="button"
                            onClick={() => stepScrubVideo(1.0)}
                            title="Jump forward 1.0 second"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.22rem 0.45rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            +1s
                          </button>
                          <button
                            type="button"
                            onClick={() => stepScrubVideo(5.0)}
                            title="Jump forward 5.0 seconds"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.22rem 0.45rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            +5s
                          </button>
                        </div>
                      </div>

                      {/* 1-Click Capture Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const video = scrubVideoRef.current;
                          if (video) {
                            const canvas = document.createElement('canvas');
                            const width = video.videoWidth || 1280;
                            const height = video.videoHeight || 720;
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              try {
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
                                const sizeInBytes = Math.round((dataUrl.split(',')[1].length * 3) / 4);
                                const sizeKb = Math.round((sizeInBytes / 1024) * 10) / 10;
                                setCapturedFrameUrl(dataUrl);
                                setCapturedFrameSizeKb(sizeKb);
                                setThumbStudioError(null);
                              } catch (e) {
                                setThumbStudioError('Failed to capture frame due to browser CORS configuration.');
                              }
                            }
                          }
                        }}
                        style={{
                          background: 'linear-gradient(90deg, var(--primary), #8b5cf6)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 0.9rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        📸 Capture Current Player Frame (HD)
                      </button>
                    </div>

                    {/* Captured Frame Preview Panel */}
                    <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(15, 23, 42, 0.75)', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#f8fafc' }}>Captured Frame Preview</label>
                      {capturedFrameUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#0f172a' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={capturedFrameUrl} alt="Captured preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => setZoomImageUrl(capturedFrameUrl)}
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                borderRadius: '4px',
                                padding: '0.2rem 0.5rem',
                                fontSize: '0.65rem',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: 700
                              }}
                            >
                              <Maximize2 size={11} />
                              <span>Zoom</span>
                            </button>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', padding: '0 0.2rem', fontWeight: 600 }}>
                            <span>Resolution: Native HD</span>
                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>Size: {capturedFrameSizeKb} KB</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => saveThumbnailOptionToR2(capturedFrameUrl, true)}
                              disabled={savingThumbStudio}
                              style={{
                                flex: 1,
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Set Active
                            </button>
                            <button
                              onClick={() => saveThumbnailOptionToR2(capturedFrameUrl, false)}
                              disabled={savingThumbStudio}
                              style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.08)',
                                color: 'var(--foreground)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Save Option
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                          Scrub the player and click the capture button to generate a custom frame!
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* Offline Fallback Dropzone (Hidden when localScrubFile is set) */}
                {!localScrubFile && (
                  <div style={{ marginTop: '1.2rem', padding: '0.75rem 1rem', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem' }}>🛡️</span>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Offline Frame Capture Helper (CORS Fallback)</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--foreground-secondary)' }}>If auto-extraction fails due to security policies, select the local video file. It never uploads.</span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLocalFileSelectForScrub(file);
                        }}
                        style={{ fontSize: '0.7rem' }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

            {/* Modal Footer Bar */}
            <div 
              style={{ 
                marginTop: '0.8rem', 
                borderTop: '1px solid var(--border)', 
                paddingTop: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              {thumbStudioSavedList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsSavedGalleryOpen(!isSavedGalleryOpen)}
                  style={{
                    background: isSavedGalleryOpen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    border: '1px solid var(--border)',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🖼️ Saved Gallery ({thumbStudioSavedList.length})</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{isSavedGalleryOpen ? '▲ Hide' : '▼ View Saved'}</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setIsThumbModalOpen(false)}
                className={styles.saveBtn}
                style={{ padding: '0.55rem 2rem', textAlign: 'center', margin: 0 }}
              >
                Close Thumbnail Studio
              </button>
            </div>

            {/* Collapsible Saved Gallery Drawer Panel (At the bottom, non-blocking) */}
            {thumbStudioSavedList.length > 0 && isSavedGalleryOpen && (
              <div 
                style={{ 
                  marginTop: '0.8rem', 
                  padding: '0.8rem 1rem', 
                  background: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(8px)',
                  borderRadius: '10px', 
                  border: '1px solid var(--border)',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--foreground-secondary)' }}>
                    Saved Choice Gallery ({thumbStudioSavedList.length} options) - Click to Set Active
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSavedGalleryOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    ✕ Close Panel
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
                  {thumbStudioSavedList.map((key) => {
                    const isActive = thumbStudioActiveKey === key;
                    return (
                      <div
                        key={key}
                        style={{
                          position: 'relative',
                          width: '110px',
                          height: '62px',
                          borderRadius: '6px',
                          border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                          boxShadow: isActive ? '0 0 10px rgba(var(--primary-rgb), 0.5)' : 'none',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        onClick={() => selectActiveThumbnail(key)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getR2Url(key, 'thumbnail')} alt="Saved preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThumbnailOption(key);
                          }}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Delete option"
                        >
                          <X size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomImageUrl(getR2Url(key, 'thumbnail'));
                          }}
                          style={{
                            position: 'absolute',
                            bottom: '3px',
                            left: '3px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Zoom preview"
                        >
                          <Maximize2 size={9} />
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '1000px', width: '95%' }}>
            <div className={styles.modalHeader}>
              <h3>Add Multiple Episodes (Batch Upload)</h3>
              <button
                type="button"
                onClick={() => {
                  setBatches(prev => prev.map(b => b.id === activeBatchId ? { ...b, isMinimized: true } : b));
                  setActiveBatchId(null);
                }}
                style={{ position: 'absolute', top: '2rem', right: '4.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
                title="Minimize upload panel"
              >
                <Minimize2 size={20} />
              </button>
              <button
                onClick={handleCloseBatchModal}
                disabled={isActiveUploading}
                style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>Parent Series</label>
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

              <div className={styles.formGroup}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>Parent Season</label>
                <select
                  required
                  disabled={isActiveUploading}
                  className={styles.selectField}
                  value={activeSeasonId}
                  onChange={(e) => updateActiveBatch(b => ({ seasonId: e.target.value }))}
                >
                  {seasonsList.filter(s => s.series_id === activeSeriesId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow} style={{ marginTop: '0.5rem', marginBottom: '1.2rem' }}>
              <div className={styles.formGroup} style={{ flex: '1 0 50%' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>Base Release Date</label>
                <input
                  type="datetime-local"
                  required
                  disabled={isActiveUploading}
                  className={styles.inputField}
                  value={activeBaseReleaseDate}
                  onChange={(e) => updateActiveBatch(b => ({ baseReleaseDate: e.target.value }))}
                />
              </div>

              <div className={styles.formGroup} style={{ flex: '1 0 50%' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.4rem' }}>Incremental Scheduling</label>
                <select
                  disabled={isActiveUploading}
                  className={styles.selectField}
                  value={activeSchedulingType}
                  onChange={(e) => updateActiveBatch(b => ({ schedulingType: e.target.value as any }))}
                >
                  <option value="none">No Increment (All air at base date)</option>
                  <option value="1day">Add 1 Day per subsequent episode</option>
                  <option value="1week">Add 1 Week per subsequent episode</option>
                </select>
              </div>
            </div>

            {/* Dropper Area */}
            {activeBatchFiles.length === 0 && (
              <div
                className={styles.dropzone}
                style={{ height: '200px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: '12px', cursor: 'pointer', background: 'var(--surface-hover)', padding: '2rem' }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleBatchDrop}
                onClick={() => batchInputRef.current?.click()}
              >
                <input
                  ref={batchInputRef}
                  type="file"
                  className="hidden"
                  style={{ display: 'none' }}
                  accept="video/*"
                  multiple
                  onChange={handleBatchFileChange}
                />
                <UploadCloud size={32} style={{ color: 'var(--primary)', marginBottom: '0.8rem' }} />
                <div style={{ fontWeight: 700, marginBottom: '0.2rem', color: 'var(--foreground)' }}>Drag & drop multiple video files or click to browse</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)' }}>Supported format: video/*</div>
              </div>
            )}

            {/* Selected Files List / Progress */}
            {activeBatchFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                    📂 Queued Video Files ({activeBatchFiles.length})
                  </span>
                  {!isActiveUploading && (
                    <button
                      onClick={() => updateActiveBatch(b => ({ files: [] }))}
                      style={{ fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className={styles.tableContainer} style={{ margin: 0, border: '1px solid var(--border)' }}>
                  <table className={styles.adminTable} style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Thumbnail</th>
                        <th>File Name</th>
                        <th style={{ width: '100px' }}>Ep #</th>
                        <th>Episode Title</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Is Preview?</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Publish?</th>
                        <th style={{ width: '160px' }}>Status / Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBatchFiles.map((bf) => {
                        return (
                          <tr key={bf.id}>
                            <td>
                              <div style={{ width: '70px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                {bf.thumbnailKey ? (
                                  <img
                                    src={getR2Url(bf.thumbnailKey, 'thumbnail')}
                                    alt="Auto-Thumb"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : bf.status === 'metadata' ? (
                                  <div className={styles.loadingSpinner} style={{ width: '12px', height: '12px', border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <Camera size={12} style={{ color: 'var(--foreground-muted)' }} />
                                )}
                              </div>
                            </td>
                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bf.file.name}>
                              {bf.file.name}
                            </td>
                            <td>
                              <input
                                type="number"
                                required
                                disabled={isActiveUploading}
                                min={1}
                                className={styles.inputField}
                                style={{ padding: '0.3rem 0.5rem', textAlign: 'center', background: 'var(--surface-hover)' }}
                                value={bf.episodeNumber}
                                onChange={(e) => updateBatchItemField(bf.id, 'episodeNumber', parseInt(e.target.value) || 1)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                required
                                disabled={isActiveUploading}
                                className={styles.inputField}
                                style={{ padding: '0.3rem 0.5rem', background: 'var(--surface-hover)' }}
                                value={bf.title}
                                onChange={(e) => updateBatchItemField(bf.id, 'title', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                disabled={isActiveUploading}
                                checked={bf.isPreview}
                                onChange={(e) => updateBatchItemField(bf.id, 'isPreview', e.target.checked)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                disabled={isActiveUploading}
                                checked={bf.isPublished}
                                onChange={(e) => updateBatchItemField(bf.id, 'isPublished', e.target.checked)}
                              />
                            </td>
                            <td>
                              {bf.status === 'metadata' && (
                                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem' }}>Analyzing...</span>
                              )}
                              {bf.status === 'pending' && (
                                <span style={{ color: 'var(--foreground-secondary)', fontSize: '0.75rem' }}>Queued</span>
                              )}
                              {bf.status === 'uploading' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>Uploading: {bf.progress}%</span>
                                  <div className={styles.track} style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div className={styles.bar} style={{ width: `${bf.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.1s ease' }} />
                                  </div>
                                </div>
                              )}
                              {bf.status === 'saving' && (
                                <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>Saving show...</span>
                              )}
                              {bf.status === 'success' && (
                                <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>✓ Done</span>
                              )}
                              {bf.status === 'error' && (
                                <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }} title={bf.errorMsg}>
                                  ✗ Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              {activeBatchFiles.length > 0 && activeBatchFiles.every(bf => bf.status === 'success') ? (
                <button
                  type="button"
                  onClick={handleCloseBatchModal}
                  className={styles.saveBtn}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: 'white', width: '100%', textAlign: 'center' }}
                >
                  Done / Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseBatchModal}
                    disabled={isActiveUploading}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartBatchUpload}
                    disabled={isActiveUploading || activeBatchFiles.length === 0 || activeBatchFiles.some(bf => bf.status === 'metadata')}
                    className={styles.saveBtn}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: 'white' }}
                  >
                    {isActiveUploading ? 'Uploading Batch...' : 'Start Batch Upload'}
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
