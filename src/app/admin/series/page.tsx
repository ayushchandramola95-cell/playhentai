'use client';

import React, { useState, useEffect } from 'react';
import { Film, Plus, Search, Edit2, Trash2, X, AlertCircle, Image } from 'lucide-react';
import FileUploader from '@/components/FileUploader/FileUploader';
import { GENRES, STUDIOS, RELEASE_YEARS } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';
import styles from '../admin.module.css';

interface Series {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_image_key: string;
  cover_image_key: string;
  banner_image_key: string;
  tags: string[];
  studio?: string;
  release_year?: number;
  is_published: boolean;
  created_at: string;
  alt_title_japanese?: string;
  alt_title_romaji?: string;
  alt_title_english?: string;
  original_language?: string;
  status?: string;
  episode_count_override?: number | null;
  runtime?: number;
  age_rating?: string;
  content_rating?: string;
  country?: string;
  aliases?: string[];
  featured_type?: string;
  meta_title?: string;
  meta_description?: string;
  first_air_date?: string;
  last_air_date?: string;
  image_library?: string[];
  poster_position?: string;
  cover_position?: string;
  banner_position?: string;
  original_source?: string;
  content_warnings?: string[];
  about_text?: string;
  about_data?: any;
  faq_override?: any;
}

export default function AdminSeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbStudios, setDbStudios] = useState<string[]>([]);

  // Filtering states
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');



  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [posterKey, setPosterKey] = useState('');
  const [coverKey, setCoverKey] = useState('');
  const [bannerKey, setBannerKey] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [studio, setStudio] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | ''>('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  // New form states
  const [altTitleJapanese, setAltTitleJapanese] = useState('');
  const [altTitleRomaji, setAltTitleRomaji] = useState('');
  const [altTitleEnglish, setAltTitleEnglish] = useState('');
  
  // Series page SEO enhancement fields
  const [originalSource, setOriginalSource] = useState('');
  const [contentWarningsInput, setContentWarningsInput] = useState('');
  
  // Structured About Series states
  const [aboutOverview, setAboutOverview] = useState('');
  const [aboutProduction, setAboutProduction] = useState('');
  const [aboutThemes, setAboutThemes] = useState('');
  const [aboutRecommended, setAboutRecommended] = useState('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingSection, setIsGeneratingSection] = useState<Record<string, boolean>>({});
  const [aboutModel, setAboutModel] = useState('gemini-3.6-flash');

  // Parsing helper to support Option A and legacy plaintext fallback
  function parseAboutText(aboutData: any, aboutTextLegacy: string) {
    const sections = {
      overview: '',
      production: '',
      themes: '',
      recommended: ''
    };

    if (aboutData && typeof aboutData === 'object') {
      sections.overview = aboutData.overview || '';
      sections.production = aboutData.production || '';
      sections.themes = aboutData.themes || '';
      sections.recommended = aboutData.recommended || '';
    } else if (aboutTextLegacy) {
      // Legacy fallback: put all legacy plain text in Overview
      sections.overview = aboutTextLegacy;
    }

    return sections;
  }

  const [faqOverrideInput, setFaqOverrideInput] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('Japanese');
  const [status, setStatus] = useState('ongoing');
  const [episodeCountOverride, setEpisodeCountOverride] = useState<number | ''>('');
  const [runtime, setRuntime] = useState<number | ''>(24);
  const [ageRating, setAgeRating] = useState('18+');
  const [contentRating, setContentRating] = useState('explicit');
  const [country, setCountry] = useState('Japan');
  const [aliasesInput, setAliasesInput] = useState('');
  const [featuredType, setFeaturedType] = useState('none');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [firstAirDate, setFirstAirDate] = useState('');
  const [lastAirDate, setLastAirDate] = useState('');
  const [imageLibrary, setImageLibrary] = useState<string[]>([]);

  // Separate Manage Media Modal states
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaSeries, setMediaSeries] = useState<Series | null>(null);
  const [mediaSaving, setMediaSaving] = useState(false);

  // Focus position offsets (0-100)
  const [posterX, setPosterX] = useState<number>(50);
  const [posterY, setPosterY] = useState<number>(50);
  const [coverX, setCoverX] = useState<number>(50);
  const [coverY, setCoverY] = useState<number>(50);
  const [bannerX, setBannerX] = useState<number>(50);
  const [bannerY, setBannerY] = useState<number>(50);

  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [activeCropRole, setActiveCropRole] = useState<'poster' | 'cover' | 'banner' | null>(null);

  // Word counter helper
  const getWordCount = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  const getWordCountStatus = (count: number, min: number, max: number) => {
    if (count === 0) return { label: 'Empty', color: 'var(--foreground-muted)', isError: false };
    if (count < min) return { label: `⚠️ Too short (min ${min} words)`, color: '#f59e0b', isError: true };
    if (count > max) return { label: `⚠️ Too long (max ${max} words)`, color: '#ef4444', isError: true };
    return { label: '✅ Excellent', color: '#10b981', isError: false };
  };

  // Load drafts if editing id matches or when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const draft = localStorage.getItem('about_editor_drafts');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.editingId === editingId) {
            if (parsed.overview) setAboutOverview(parsed.overview);
            if (parsed.production) setAboutProduction(parsed.production);
            if (parsed.themes) setAboutThemes(parsed.themes);
            if (parsed.recommended) setAboutRecommended(parsed.recommended);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [isModalOpen, editingId]);

  // Save drafts automatically
  useEffect(() => {
    if (isModalOpen) {
      const drafts = {
        editingId,
        overview: aboutOverview,
        production: aboutProduction,
        themes: aboutThemes,
        recommended: aboutRecommended
      };
      localStorage.setItem('about_editor_drafts', JSON.stringify(drafts));
    }
  }, [aboutOverview, aboutProduction, aboutThemes, aboutRecommended, isModalOpen, editingId]);

  const handleGenerateSection = async (sectionKey: 'overview' | 'production' | 'themes' | 'recommended', isImprove = false) => {
    setIsGeneratingSection(prev => ({ ...prev, [sectionKey]: true }));
    setError(null);

    const existingText = {
      overview: aboutOverview,
      production: aboutProduction,
      themes: aboutThemes,
      recommended: aboutRecommended
    }[sectionKey];

    const metadata = {
      title,
      alt_title_japanese: altTitleJapanese,
      alt_title_romaji: altTitleRomaji,
      alt_title_english: altTitleEnglish,
      studio,
      original_source: originalSource,
      release_year: releaseYear,
      runtime,
      country,
      original_language: originalLanguage,
      status,
      content_rating: contentRating,
      age_rating: ageRating,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      description
    };

    try {
      const res = await fetch('/api/admin/generate-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isImprove ? 'improve' : 'single',
          section: sectionKey,
          existingText: isImprove ? existingText : undefined,
          metadata,
          model: aboutModel
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to generate content');
      }

      const data = resData.data;
      if (sectionKey === 'overview') setAboutOverview(data);
      else if (sectionKey === 'production') setAboutProduction(data);
      else if (sectionKey === 'themes') setAboutThemes(data);
      else if (sectionKey === 'recommended') setAboutRecommended(data);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsGeneratingSection(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  const handleGenerateAllAbout = async () => {
    setIsGeneratingAll(true);
    setError(null);

    const metadata = {
      title,
      alt_title_japanese: altTitleJapanese,
      alt_title_romaji: altTitleRomaji,
      alt_title_english: altTitleEnglish,
      studio,
      original_source: originalSource,
      release_year: releaseYear,
      runtime,
      country,
      original_language: originalLanguage,
      status,
      content_rating: contentRating,
      age_rating: ageRating,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      description
    };

    try {
      const res = await fetch('/api/admin/generate-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'all',
          metadata,
          model: aboutModel
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to generate all sections');
      }

      const data = resData.data;
      if (data.overview) setAboutOverview(data.overview);
      if (data.production) setAboutProduction(data.production);
      if (data.themes) setAboutThemes(data.themes);
      if (data.recommended) setAboutRecommended(data.recommended);
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const parsePercent = (posStr: string | undefined, index: number, defaultVal: number): number => {
    if (!posStr) return defaultVal;
    const matches = posStr.match(/(\d+)%/g);
    if (matches && matches[index]) {
      return parseInt(matches[index], 10);
    }
    const singleMatch = posStr.match(/(\d+)%/);
    return singleMatch ? parseInt(singleMatch[1], 10) : defaultVal;
  };

  const handleOpenMediaModal = (s: Series) => {
    setMediaSeries(s);
    setPosterKey(s.poster_image_key || '');
    setCoverKey(s.cover_image_key || '');
    setBannerKey(s.banner_image_key || '');
    setImageLibrary(s.image_library || []);
    
    // Parse existing positions
    setPosterX(parsePercent(s.poster_position, 0, 50));
    setPosterY(parsePercent(s.poster_position, 1, 50));
    setCoverX(parsePercent(s.cover_position, 0, 50));
    setCoverY(parsePercent(s.cover_position, 1, 50));
    setBannerX(parsePercent(s.banner_position, 0, 50));
    setBannerY(parsePercent(s.banner_position, 1, 50));

    setMediaModalOpen(true);
  };

  const handleCloseMediaModal = () => {
    setMediaSeries(null);
    setPosterKey('');
    setCoverKey('');
    setBannerKey('');
    setImageLibrary([]);
    setPosterX(50);
    setPosterY(50);
    setCoverX(50);
    setCoverY(50);
    setBannerX(50);
    setBannerY(50);
    setActiveCropRole(null);
    setMediaModalOpen(false);
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaSeries) return;
    setMediaSaving(true);
    setError(null);

    let finalPoster = posterKey;
    let finalCover = coverKey;
    let finalBanner = bannerKey;

    // Smart Fallbacks
    if (finalPoster && !finalCover && !finalBanner) {
      finalCover = finalPoster;
      finalBanner = finalPoster;
    } else if (finalCover && !finalPoster && !finalBanner) {
      finalPoster = finalCover;
      finalBanner = finalCover;
    } else if (finalBanner && !finalPoster && !finalCover) {
      finalPoster = finalBanner;
      finalCover = finalBanner;
    }

    const payload = {
      id: mediaSeries.id,
      title: mediaSeries.title,
      slug: mediaSeries.slug,
      description: mediaSeries.description,
      poster_image_key: finalPoster || null,
      cover_image_key: finalCover || null,
      banner_image_key: finalBanner || null,
      image_library: imageLibrary,
      poster_position: `${posterX}% ${posterY}%`,
      cover_position: `${coverX}% ${coverY}%`,
      banner_position: `${bannerX}% ${bannerY}%`
    };

    try {
      const res = await fetch('/api/admin/series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update images');

      // Refresh list
      const updatedSeries = data.series || data.data;
      if (updatedSeries) {
        setSeriesList(seriesList.map((item) => (item && item.id === mediaSeries.id ? updatedSeries : item)));
      } else {
        fetchSeries();
      }
      handleCloseMediaModal();
    } catch (err: any) {
      setError(err.message || 'Error saving media changes.');
    } finally {
      setMediaSaving(false);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, role: 'poster' | 'cover' | 'banner') => {
    e.preventDefault();
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const startValX = role === 'poster' ? posterX : role === 'cover' ? coverX : bannerX;
    const startValY = role === 'poster' ? posterY : role === 'cover' ? coverY : bannerY;
    
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = 'touches' in moveEvent;
      const currentX = isMoveTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isMoveTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = currentX - clientX;
      const deltaY = currentY - clientY;

      // Sensitivity factor: 0.35 for smooth 2D movement
      const newValX = Math.max(0, Math.min(100, startValX - deltaX * 0.35));
      const newValY = Math.max(0, Math.min(100, startValY - deltaY * 0.35));

      if (role === 'poster') {
        setPosterX(Math.round(newValX));
        setPosterY(Math.round(newValY));
      } else if (role === 'cover') {
        setCoverX(Math.round(newValX));
        setCoverY(Math.round(newValY));
      } else if (role === 'banner') {
        setBannerX(Math.round(newValX));
        setBannerY(Math.round(newValY));
      }
    };

    const handleDragEnd = () => {
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);
  };



  // Dynamically compute unique tags from database seriesList + default GENRES + dbCategories
  const dynamicTags = React.useMemo(() => {
    const allTags = new Set<string>(GENRES);
    dbCategories.forEach((cat) => allTags.add(cat));
    seriesList.forEach((s) => {
      if (s && s.tags) {
        s.tags.forEach((tag) => {
          if (tag.toLowerCase() !== 'featured' && !tag.toLowerCase().startsWith('featured:')) {
            allTags.add(tag);
          }
        });
      }
    });
    return Array.from(allTags).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbCategories]);

  // Dynamically compute unique studios from database seriesList + default STUDIOS + dbStudios
  const dynamicStudios = React.useMemo(() => {
    const allStudios = new Set<string>(STUDIOS);
    dbStudios.forEach((s) => allStudios.add(s));
    seriesList.forEach((s) => {
      if (s && s.studio) {
        s.studio.split(',').forEach((name) => {
          const clean = name.trim();
          if (clean.length > 0) {
            allStudios.add(clean);
          }
        });
      }
    });
    return Array.from(allStudios).sort((a, b) => a.localeCompare(b));
  }, [seriesList, dbStudios]);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/series');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load series');
      setSeriesList(data.series || []);

      // Fetch categories from DB
      const catRes = await fetch('/api/admin/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.categories) {
          setDbCategories(catData.categories.map((c: any) => c.name));
        }
      }

      // Fetch studios from DB
      const studioRes = await fetch('/api/admin/studios');
      if (studioRes.ok) {
        const studioData = await studioRes.json();
        if (studioData.studios) {
          setDbStudios(studioData.studios.map((s: any) => s.name));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [hasDraft, setHasDraft] = useState(false);

  // Load draft check on mount
  useEffect(() => {
    const saved = localStorage.getItem('series_form_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.description || parsed.posterKey || parsed.coverKey || parsed.bannerKey) {
          setHasDraft(true);
        } else {
          localStorage.removeItem('series_form_draft');
        }
      } catch (e) {
        localStorage.removeItem('series_form_draft');
      }
    }
  }, []);

  // Save draft on state change
  useEffect(() => {
    if (isModalOpen) {
      const draft = {
        editingId,
        title,
        slug,
        description,
        posterKey,
        coverKey,
        bannerKey,
        tagsInput,
        studio,
        releaseYear,
        isPublished,
        altTitleJapanese,
        altTitleRomaji,
        altTitleEnglish,
        originalLanguage,
        status,
        episodeCountOverride,
        runtime,
        ageRating,
        contentRating,
        country,
        aliasesInput,
        featuredType,
        metaTitle,
        metaDescription,
        firstAirDate,
        lastAirDate,
        imageLibrary
      };
      localStorage.setItem('series_form_draft', JSON.stringify(draft));
    }
  }, [
    isModalOpen, editingId, title, slug, description, posterKey, coverKey, bannerKey,
    tagsInput, studio, releaseYear, isPublished, altTitleJapanese, altTitleRomaji,
    altTitleEnglish, originalLanguage, status, episodeCountOverride, runtime,
    ageRating, contentRating, country, aliasesInput, featuredType, metaTitle, metaDescription,
    firstAirDate, lastAirDate, imageLibrary
  ]);

  const handleRestoreDraft = () => {
    const saved = localStorage.getItem('series_form_draft');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setEditingId(d.editingId || null);
        setTitle(d.title || '');
        setSlug(d.slug || '');
        setDescription(d.description || '');
        setPosterKey(d.posterKey || '');
        setCoverKey(d.coverKey || '');
        setBannerKey(d.bannerKey || '');
        setTagsInput(d.tagsInput || '');
        setStudio(d.studio || '');
        setReleaseYear(d.releaseYear || '');
        setIsPublished(d.isPublished || false);
        setAltTitleJapanese(d.altTitleJapanese || '');
        setAltTitleRomaji(d.altTitleRomaji || '');
        setAltTitleEnglish(d.altTitleEnglish || '');
        setOriginalLanguage(d.originalLanguage || 'Japanese');
        setStatus(d.status || 'ongoing');
        setEpisodeCountOverride(d.episodeCountOverride || '');
        setRuntime(d.runtime !== undefined ? d.runtime : 24);
        setAgeRating(d.ageRating || '18+');
        setContentRating(d.contentRating || 'explicit');
        setCountry(d.country || 'Japan');
        setAliasesInput(d.aliasesInput || '');
        setFeaturedType(d.featuredType || 'none');
        setMetaTitle(d.metaTitle || '');
        setMetaDescription(d.metaDescription || '');
        setFirstAirDate(d.firstAirDate || '');
        setLastAirDate(d.lastAirDate || '');
        setImageLibrary(d.imageLibrary || []);
        
        setIsModalOpen(true);
        setHasDraft(false);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('series_form_draft');
    localStorage.removeItem('about_editor_drafts');
    setHasDraft(false);
  };

  const handleCloseModal = () => {
    localStorage.removeItem('series_form_draft');
    localStorage.removeItem('about_editor_drafts');
    setHasDraft(false);
    setFirstAirDate('');
    setLastAirDate('');
    setImageLibrary([]);
    setIsModalOpen(false);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setPosterKey('');
    setCoverKey('');
    setBannerKey('');
    setTagsInput('');
    setStudio('');
    setReleaseYear('');
    setIsPublished(false);
    setAltTitleJapanese('');
    setAltTitleRomaji('');
    setAltTitleEnglish('');
    setOriginalLanguage('Japanese');
    setOriginalSource('');
    setContentWarningsInput('');
    setAboutOverview('');
    setAboutProduction('');
    setAboutThemes('');
    setAboutRecommended('');
    setFaqOverrideInput('[]');
    setStatus('ongoing');
    setEpisodeCountOverride('');
    setRuntime(24);
    setAgeRating('18+');
    setContentRating('explicit');
    setCountry('Japan');
    setAliasesInput('');
    setFeaturedType('none');
    setMetaTitle('');
    setMetaDescription('');
    setFirstAirDate('');
    setLastAirDate('');
    setImageLibrary([]);



    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Series) => {
    setEditingId(s.id);
    setTitle(s.title);
    setSlug(s.slug);
    setDescription(s.description);
    setPosterKey(s.poster_image_key || '');
    setCoverKey(s.cover_image_key || '');
    setBannerKey(s.banner_image_key || '');
    const cleanTags = s.tags ? s.tags.filter(t => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:')) : [];
    setTagsInput(cleanTags.join(', '));
    setStudio(s.studio || '');
    setReleaseYear(s.release_year || '');
    setIsPublished(s.is_published);
    setAltTitleJapanese(s.alt_title_japanese || '');
    setAltTitleRomaji(s.alt_title_romaji || '');
    setAltTitleEnglish(s.alt_title_english || '');
    setOriginalLanguage(s.original_language || 'Japanese');
    setOriginalSource(s.original_source || '');
    setContentWarningsInput(s.content_warnings ? s.content_warnings.join(', ') : '');
    const parsedAbout = parseAboutText(s.about_data, s.about_text || '');
    setAboutOverview(parsedAbout.overview);
    setAboutProduction(parsedAbout.production);
    setAboutThemes(parsedAbout.themes);
    setAboutRecommended(parsedAbout.recommended);
    setFaqOverrideInput(s.faq_override ? JSON.stringify(s.faq_override, null, 2) : '[]');
    setStatus(s.status || 'ongoing');
    setEpisodeCountOverride(s.episode_count_override !== null && s.episode_count_override !== undefined ? s.episode_count_override : '');
    setRuntime(s.runtime !== undefined && s.runtime !== null ? s.runtime : 24);
    setAgeRating(s.age_rating || '18+');
    setContentRating(s.content_rating || 'explicit');
    setCountry(s.country || 'Japan');
    setAliasesInput(s.aliases ? s.aliases.join(', ') : '');
    setFeaturedType(s.featured_type || 'none');
    setMetaTitle(s.meta_title || '');
    setMetaDescription(s.meta_description || '');
    setFirstAirDate(s.first_air_date ? s.first_air_date.substring(0, 10) : '');
    setLastAirDate(s.last_air_date ? s.last_air_date.substring(0, 10) : '');
    setImageLibrary(s.image_library || []);



    setError(null);
    setIsModalOpen(true);
  };

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!editingId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Preserve any existing internal featured tags
    if (editingId) {
      const originalSeries = seriesList.find((s) => s.id === editingId);
      if (originalSeries && originalSeries.tags) {
        const internalTags = originalSeries.tags.filter(
          (t) => t.toLowerCase().startsWith('featured:') || t.toLowerCase() === 'featured'
        );
        tags = [...tags, ...internalTags];
      }
    }

    const aliases = aliasesInput
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const contentWarnings = contentWarningsInput
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    let faqOverride = [];
    try {
      if (faqOverrideInput.trim()) {
        faqOverride = JSON.parse(faqOverrideInput);
        if (!Array.isArray(faqOverride)) {
          throw new Error('FAQ Override must be a JSON array of objects');
        }
      }
    } catch (parseErr: any) {
      setError(`FAQ Override JSON Error: ${parseErr.message}`);
      setSaving(false);
      return;
    }

    let finalPoster = posterKey;
    let finalCover = coverKey;
    let finalBanner = bannerKey;

    if (finalPoster && !finalCover && !finalBanner) {
      finalCover = finalPoster;
      finalBanner = finalPoster;
    } else if (finalCover && !finalPoster && !finalBanner) {
      finalPoster = finalCover;
      finalBanner = finalCover;
    } else if (finalBanner && !finalPoster && !finalCover) {
      finalPoster = finalBanner;
      finalCover = finalBanner;
    }

    const payload = {
      id: editingId,
      title,
      slug,
      description,
      poster_image_key: finalPoster || null,
      cover_image_key: finalCover || null,
      banner_image_key: finalBanner || null,
      tags,
      studio: studio || null,
      release_year: releaseYear ? Number(releaseYear) : null,
      is_published: isPublished,
      alt_title_japanese: altTitleJapanese || null,
      alt_title_romaji: altTitleRomaji || null,
      alt_title_english: altTitleEnglish || null,
      original_language: originalLanguage,
      original_source: originalSource || null,
      content_warnings: contentWarnings,
      about_text: [
        aboutOverview.trim() ? `## Overview\n${aboutOverview.trim()}` : '',
        aboutProduction.trim() ? `## Production & Presentation\n${aboutProduction.trim()}` : '',
        aboutThemes.trim() ? `## Themes & Style\n${aboutThemes.trim()}` : '',
        aboutRecommended.trim() ? `## Recommended For\n${aboutRecommended.trim()}` : ''
      ].filter(Boolean).join('\n\n') || null,
      about_data: {
        overview: aboutOverview,
        production: aboutProduction,
        themes: aboutThemes,
        recommended: aboutRecommended
      },
      faq_override: faqOverride,
      status,
      episode_count_override: episodeCountOverride !== '' ? Number(episodeCountOverride) : null,
      runtime: runtime !== '' ? Number(runtime) : 24,
      age_rating: ageRating,
      content_rating: contentRating,
      country,
      aliases,
      featured_type: featuredType,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      first_air_date: firstAirDate || null,
      last_air_date: lastAirDate || null,
      image_library: imageLibrary,
      poster_position: (editingId ? seriesList.find((s) => s.id === editingId)?.poster_position : null) || '50% 50%',
      cover_position: (editingId ? seriesList.find((s) => s.id === editingId)?.cover_position : null) || '50% 50%',
      banner_position: (editingId ? seriesList.find((s) => s.id === editingId)?.banner_position : null) || '50% 50%',
      metadata_locks: {},
      metadata_provenance: {},
      metadata_versions: [],
      raw_provider_payload: {}
    };

    try {
      const url = '/api/admin/series';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save series');

      localStorage.removeItem('series_form_draft');
      localStorage.removeItem('about_editor_drafts');
      setHasDraft(false);
      setIsModalOpen(false);
      fetchSeries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this series? All seasons and episodes associated with it will be deleted!')) return;

    try {
      const res = await fetch(`/api/admin/series?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete series');
      fetchSeries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Unique Years in the database
  const uniqueYears = React.useMemo(() => {
    const years = new Set<string>();
    seriesList.forEach((s) => {
      if (s && s.release_year) {
        years.add(String(s.release_year));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [seriesList]);

  // Unique Studios present in the current database list
  const uniqueStudiosList = React.useMemo(() => {
    const studios = new Set<string>();
    seriesList.forEach((s) => {
      if (s && s.studio) {
        s.studio.split(',').forEach((st) => {
          const clean = st.trim();
          if (clean) studios.add(clean);
        });
      }
    });
    return Array.from(studios).sort((a, b) => a.localeCompare(b));
  }, [seriesList]);

  // Unique Tags present in the current database list
  const uniqueTagsList = React.useMemo(() => {
    const tags = new Set<string>();
    seriesList.forEach((s) => {
      if (s && s.tags) {
        s.tags.forEach((t) => {
          if (t) tags.add(t);
        });
      }
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [seriesList]);

  const filteredList = seriesList.filter((s) => {
    if (!s) return false;
    const matchesSearch = !searchQuery || (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesYear = selectedYear === 'all' || String(s.release_year) === selectedYear;
    const matchesStudio = selectedStudio === 'all' || (s.studio && s.studio.split(',').map(x => x.trim().toLowerCase()).includes(selectedStudio.toLowerCase()));
    const matchesTag = selectedTag === 'all' || (s.tags && s.tags.map(x => x.toLowerCase()).includes(selectedTag.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'published' && s.is_published) || 
      (selectedStatus === 'draft' && !s.is_published);
    return matchesSearch && matchesYear && matchesStudio && matchesTag && matchesStatus;
  });

  const currentFormTags = tagsInput.split(',').map((t) => t.trim().toLowerCase());
  const isFormDubbed = currentFormTags.includes('dub') || currentFormTags.includes('dubbed');
  const autoTitlePlaceholder = `${title || 'Series Title'} - Watch English Sub HD | PlayHentai`;
  const autoDescriptionPlaceholder = `Watch ${title || 'Series Title'} with English subtitles in HD. Stream all available episodes, releases, and check out similar titles on PlayHentai.`;

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2>Manage Series Catalog</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', color: 'var(--primary)' }}>
              {filteredList.length} {filteredList.length === 1 ? 'Title' : 'Titles'}
            </span>
          </div>
          <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Add, update or publish show titles and meta details.
          </p>
        </div>
        <button onClick={handleOpenCreate} className={styles.createBtn}>
          <Plus size={16} />
          <span>Add Series</span>
        </button>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div className={styles.searchBarRow} style={{ flex: '1 1 300px', maxWidth: 'none', margin: 0 }}>
            <Search size={16} style={{ color: 'var(--foreground-muted)' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search series by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--foreground-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Studio:</span>
            <select
              value={selectedStudio}
              onChange={(e) => setSelectedStudio(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--foreground-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '150px'
              }}
            >
              <option value="all">All Studios</option>
              {uniqueStudiosList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Genre:</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--foreground-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '150px'
              }}
            >
              <option value="all">All Genres</option>
              {uniqueTagsList.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--foreground-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {(selectedYear !== 'all' || selectedStudio !== 'all' || selectedTag !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setSelectedYear('all');
                setSelectedStudio('all');
                setSelectedTag('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && !isModalOpen && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px', display: 'inline-block' }} />
        </div>
      ) : filteredList.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th style={{ width: '64px' }}>Cover</th>
                <th>Title & Meta</th>
                <th>URL Slug</th>
                <th>Status</th>
                <th>Genres & Tags</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((s) => {
                const imageKey = s.poster_image_key || s.cover_image_key || s.banner_image_key;
                return (
                  <tr key={s.id}>
                    <td style={{ width: '64px', padding: '0.75rem 0.5rem 0.75rem 1rem' }}>
                      {imageKey ? (
                        <div
                          onClick={() => handleOpenMediaModal(s)}
                          className={styles.seriesThumbBox}
                          title="Manage Media & Images"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getR2Url(imageKey, s.poster_image_key ? 'poster' : 'cover')}
                            alt={s.title}
                            className={styles.seriesThumbImg}
                          />
                          <div className={styles.seriesThumbHover}>
                            <Image size={14} />
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleOpenMediaModal(s)}
                          className={styles.seriesThumbBoxEmpty}
                          title="Upload Cover / Poster Image"
                        >
                          <Image size={14} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Add</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--foreground-primary)' }}>
                          {s.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                          {s.release_year && (
                            <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.05rem 0.4rem', borderRadius: '4px', fontWeight: 600, color: 'var(--foreground-secondary)' }}>
                              {s.release_year}
                            </span>
                          )}
                          {s.studio && (
                            <span style={{ color: 'var(--foreground-secondary)', fontWeight: 500 }}>
                              {s.studio}
                            </span>
                          )}
                          {s.episode_count_override ? (
                            <span style={{ color: 'var(--foreground-muted)' }}>• {s.episode_count_override} Eps</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid var(--border)', color: '#a7f3d0' }}>
                        /{s.slug}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                        <span 
                          className={styles.badge} 
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.65rem',
                            borderRadius: '20px',
                            background: s.is_published ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: s.is_published ? '#10b981' : '#f59e0b',
                            border: s.is_published ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.is_published ? '#10b981' : '#f59e0b', boxShadow: s.is_published ? '0 0 6px #10b981' : 'none' }} />
                          {s.is_published ? 'Published' : 'Draft'}
                        </span>

                        <span 
                          className={styles.badge} 
                          style={{ 
                            textTransform: 'capitalize',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '12px',
                            background: s.status === 'completed' ? 'rgba(59, 130, 246, 0.1)' : s.status === 'upcoming' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                            color: s.status === 'completed' ? '#60a5fa' : s.status === 'upcoming' ? '#c084fc' : 'var(--foreground-muted)'
                          }}
                        >
                          {s.status || 'ongoing'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxWidth: '260px' }}>
                        {s.tags?.slice(0, 4).map((tag) => (
                          <span 
                            key={tag} 
                            style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem', 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: 'var(--foreground-secondary)'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                        {s.tags && s.tags.length > 4 && (
                          <span 
                            title={s.tags.slice(4).join(', ')} 
                            style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem', background: 'var(--surface-hover)', borderRadius: '6px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                          >
                            +{s.tags.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleOpenEdit(s)} 
                          className={styles.editActionBtn} 
                          title="Edit Series Details"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id)} 
                          className={styles.deleteActionBtn} 
                          title="Delete Series"
                        >
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
        <div className={styles.emptyState}>
          No series found matching your query. Click "Add Series" to register your first show.
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalFullscreen}`}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'Edit Series Meta' : 'Add New Series'}</h3>
              <button
                onClick={handleCloseModal}
                style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
                <div className={styles.formGridWidescreen}>
                {/* Column 1: Core details & Media Uploads */}
                <div>
                  <div className={styles.formGroup}>
                    <label>Series Title</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="e.g. Cyberpunk Odyssey"
                      value={title}
                      onChange={handleTitleChange}
                    />
                  </div>

                   <div className={styles.formGroup}>
                     <label>URL Slug</label>
                     <input
                       type="text"
                       required
                       className={styles.inputField}
                       placeholder="e.g. cyberpunk-odyssey"
                       value={slug}
                       onChange={(e) => setSlug(e.target.value)}
                     />
                   </div>

                   <div className={styles.formGroup}>
                      <label>Synopsis Description (Story / Plot Summary)</label>
                      <textarea
                        required
                        className={styles.textareaField}
                        placeholder="Write a comprehensive plot summary (recommended: 350-600 words mentioning story, main characters, themes, and subbed/dubbed info naturally)..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ height: '240px', resize: 'vertical' }}
                      />
                    </div>

                  <div className={styles.formRow} style={{ marginBottom: '1.2rem', display: 'flex', gap: '1rem' }}>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label>Release Year</label>
                      <select
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value ? Number(e.target.value) : '')}
                        style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground-primary)', fontWeight: 500, outline: 'none' }}
                      >
                        <option value="">-- Select Year --</option>
                        {RELEASE_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                    <label>Production Studios (comma-separated)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="e.g. PoRO, Bunnywalker"
                      value={studio}
                      onChange={(e) => setStudio(e.target.value)}
                    />
                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-hover)' }}>
                      {dynamicStudios.map((s) => {
                        const currentStudios = studio.split(',').map(name => name.trim().toLowerCase());
                        const isSelected = currentStudios.includes(s.toLowerCase());
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const cleaned = studio.split(',').map(name => name.trim()).filter(name => name.length > 0);
                              if (isSelected) {
                                const filtered = cleaned.filter(name => name.toLowerCase() !== s.toLowerCase());
                                setStudio(filtered.join(', '));
                              } else {
                                cleaned.push(s);
                                setStudio(cleaned.join(', '));
                              }
                            }}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--primary)' : 'var(--surface)',
                              color: isSelected ? '#ffffff' : 'var(--foreground-primary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                    <label>Tags / Genres (comma-separated)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="e.g. Sci-Fi, Action, Cyberpunk"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-hover)' }}>
                      {dynamicTags.map((genre) => {
                        const currentTags = tagsInput.split(',').map(t => t.trim().toLowerCase());
                        const isSelected = currentTags.includes(genre.toLowerCase());
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              const cleaned = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
                              if (isSelected) {
                                const filtered = cleaned.filter(t => t.toLowerCase() !== genre.toLowerCase());
                                setTagsInput(filtered.join(', '));
                              } else {
                                cleaned.push(genre);
                                setTagsInput(cleaned.join(', '));
                              }
                            }}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--primary)' : 'var(--surface)',
                              color: isSelected ? '#ffffff' : 'var(--foreground-primary)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Column 2: Specs, Tags & SEO */}
                <div>
                  {/* Alternative Titles */}
                  <div style={{ paddingTop: '0.2rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem' }}>Alternative Titles</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>Japanese Title</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. オーバーフロー"
                          value={altTitleJapanese}
                          onChange={(e) => setAltTitleJapanese(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Romaji Title</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. Ōbāfurō"
                          value={altTitleRomaji}
                          onChange={(e) => setAltTitleRomaji(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>English Title</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. Overflow"
                          value={altTitleEnglish}
                          onChange={(e) => setAltTitleEnglish(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Show Specifications */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem' }}>Show Specifications</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>Original Language</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. Japanese"
                          value={originalLanguage}
                          onChange={(e) => setOriginalLanguage(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Airing Status</label>
                        <select
                          className={styles.selectField}
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="ongoing">Ongoing (Airing)</option>
                          <option value="completed">Completed (Finalized)</option>
                          <option value="upcoming">Upcoming</option>
                        </select>
                      </div>
                    </div>

                    {status === 'upcoming' && (
                      <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                        <label>Upcoming Series Preview/Trailer Video (Optional - Backwards Compatibility)</label>
                        <FileUploader
                          label="Upload Trailer Video"
                          acceptedTypes="video/*"
                          maxSizeMb={500}
                          initialValue={metaTitle}
                          onUploadComplete={(newKey) => {
                            setMetaTitle(newKey);
                          }}
                          onClear={() => {
                            setMetaTitle('');
                          }}
                          previewType="video"
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>Age Rating</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          value={ageRating}
                          onChange={(e) => setAgeRating(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Content Rating</label>
                        <select
                          className={styles.selectField}
                          value={contentRating}
                          onChange={(e) => setContentRating(e.target.value)}
                        >
                          <option value="soft">Soft</option>
                          <option value="explicit">Explicit</option>
                          <option value="extreme">Extreme</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Country of Origin</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>Average Runtime</label>
                        <input
                          type="number"
                          className={styles.inputField}
                          value={runtime}
                          onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '0.2rem', display: 'block' }}>(minutes)</span>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Featured Section</label>
                        <select
                          className={styles.selectField}
                          value={featuredType}
                          onChange={(e) => setFeaturedType(e.target.value)}
                        >
                          <option value="none">Not Featured</option>
                          <option value="banner">Hero Banner (Top)</option>
                          <option value="trending">Trending Now</option>
                          <option value="editors_pick">Editor's Pick</option>
                        </select>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Planned Episode Count</label>
                        <input
                          type="number"
                          className={styles.inputField}
                          placeholder="e.g. 12 (blank for auto)"
                          value={episodeCountOverride}
                          onChange={(e) => setEpisodeCountOverride(e.target.value ? Number(e.target.value) : '')}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>First Air Date</label>
                        <input
                          type="date"
                          className={styles.inputField}
                          value={firstAirDate}
                          onChange={(e) => setFirstAirDate(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Last Air Date</label>
                        <input
                          type="date"
                          className={styles.inputField}
                          value={lastAirDate}
                          onChange={(e) => setLastAirDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Search Aliases / Alternate Slugs</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. overflow, overflow-hentai"
                        value={aliasesInput}
                        onChange={(e) => setAliasesInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Additional SEO Metadata (Original Source, Content Warnings, About Series, FAQ Override) */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem' }}>Additional SEO Metadata</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className={styles.formGroup}>
                        <label>Original Source</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. Manga, Light Novel, Game, Original"
                          value={originalSource}
                          onChange={(e) => setOriginalSource(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Content Warnings (comma-separated, optional)</label>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. NTR, Gore, Violence"
                          value={contentWarningsInput}
                          onChange={(e) => setContentWarningsInput(e.target.value)}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '0.2rem', display: 'block' }}>Left blank if none exist. Empty warnings are hidden.</span>
                      </div>
                    </div>

                    {/* Upgraded Structured About Series Builder */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>About This Series Builder</h4>
                          <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>Write or auto-generate structured, encyclopedic editorial content to complement the synopsis.</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>AI Model:</span>
                            <select
                              value={aboutModel}
                              onChange={(e) => setAboutModel(e.target.value)}
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-hover)',
                                color: 'var(--foreground-primary)',
                                fontSize: '0.78rem',
                                outline: 'none',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Default)</option>
                              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                              <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateAllAbout}
                            disabled={isGeneratingAll || !title}
                            className={styles.actionBtn}
                            style={{
                              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.55rem 1.1rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.78rem',
                              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                            }}
                          >
                            {isGeneratingAll ? (
                              <>
                                <span className={styles.loadingSpinner} style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                <span>Generate Entire About Article</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {[
                          {
                            key: 'overview',
                            title: '1. Overview',
                            desc: 'Explain what kind of anime this is, general focus, genre, and adaptation source. (No plot spoilers or summary)',
                            value: aboutOverview,
                            setter: setAboutOverview,
                            min: 120,
                            max: 180
                          },
                          {
                            key: 'production',
                            title: '2. Production & Presentation',
                            desc: 'Describe animation style, studio visual quality, voice acting, and adaptation quality naturally. (Do not write list metadata)',
                            value: aboutProduction,
                            setter: setAboutProduction,
                            min: 80,
                            max: 120
                          },
                          {
                            key: 'themes',
                            title: '3. Themes & Style',
                            desc: 'Describe themes (e.g. romance, vanilla, school life), tone, pacing, and character focus.',
                            value: aboutThemes,
                            setter: setAboutThemes,
                            min: 80,
                            max: 120
                          },
                          {
                            key: 'recommended',
                            title: '4. Recommended For',
                            desc: 'Describe which viewer preferences or fans would enjoy this series.',
                            value: aboutRecommended,
                            setter: setAboutRecommended,
                            min: 50,
                            max: 80
                          }
                        ].map((sec) => {
                          const wCount = getWordCount(sec.value);
                          const status = getWordCountStatus(wCount, sec.min, sec.max);
                          const progressPercent = Math.min((wCount / sec.max) * 100, 100);
                          const isSectionGenerating = !!isGeneratingSection[sec.key];

                          return (
                            <div
                              key={sec.key}
                              style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '1.25rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                  <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>{sec.title}</h5>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)', display: 'block', marginTop: '0.1rem' }}>{sec.desc}</span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                  {wCount > 0 ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isSectionGenerating}
                                        onClick={() => handleGenerateSection(sec.key as any, false)}
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--foreground-primary)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                                      >
                                        {isSectionGenerating ? 'Wait...' : '↻ Regenerate'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSectionGenerating}
                                        onClick={() => handleGenerateSection(sec.key as any, true)}
                                        style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                                      >
                                        {isSectionGenerating ? 'Wait...' : '✨ Improve'}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isSectionGenerating || !title}
                                      onClick={() => handleGenerateSection(sec.key as any, false)}
                                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--foreground-primary)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                      {isSectionGenerating ? 'Wait...' : '✨ Generate'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <textarea
                                className={styles.textareaField}
                                value={sec.value}
                                onChange={(e) => sec.setter(e.target.value)}
                                style={{ height: '90px', resize: 'vertical', fontSize: '0.85rem', marginBottom: '0.4rem' }}
                                placeholder={`Enter ${sec.title} description...`}
                              />

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--foreground-muted)' }}>
                                  {wCount} / Rec: {sec.min}–{sec.max} words
                                </span>
                                <span style={{ fontWeight: 800, color: status.color }}>{status.label}</span>
                              </div>

                              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.3rem' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', background: status.color, borderRadius: '3px', transition: 'width 0.2s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Visual Live Preview matching public page styling */}
                      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>
                          Live Editorial Preview ({(() => {
                            const totalWords = getWordCount(aboutOverview) + getWordCount(aboutProduction) + getWordCount(aboutThemes) + getWordCount(aboutRecommended);
                            const estSeconds = Math.ceil((totalWords / 200) * 60);
                            return estSeconds < 60 ? `${estSeconds} sec` : `${Math.floor(estSeconds / 60)} min ${estSeconds % 60} sec`;
                          })()} read)
                        </span>
                        
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.5rem' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '1.2rem', textAlign: 'left' }}>About {title || 'Series Title'}</h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                            {aboutOverview.trim() && (
                              <div>
                                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overview</h5>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>{aboutOverview}</p>
                              </div>
                            )}

                            {aboutProduction.trim() && (
                              <div>
                                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Production & Presentation</h5>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>{aboutProduction}</p>
                              </div>
                            )}

                            {aboutThemes.trim() && (
                              <div>
                                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Themes & Style</h5>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>{aboutThemes}</p>
                              </div>
                            )}

                            {aboutRecommended.trim() && (
                              <div>
                                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended For</h5>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>{aboutRecommended}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Custom FAQ Override JSON (Optional)</label>
                      <textarea
                        className={styles.textareaField}
                        placeholder='[{"q": "Is this show subbed?", "a": "Yes, it contains english subtitles..."}]'
                        value={faqOverrideInput}
                        onChange={(e) => setFaqOverrideInput(e.target.value)}
                        style={{ height: '100px', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '0.2rem', display: 'block' }}>If empty, the system automatically generates FAQs using database facts. Paste JSON array of Q&As only to override.</span>
                    </div>
                  </div>

                  {/* SEO Settings & Google Live Preview */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem' }}>SEO Settings (Meta Tags)</h4>
                    
                    <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                      <label>Custom Meta Title</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder={`Leave blank for automatic: ${autoTitlePlaceholder}`}
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: '1.2rem' }}>
                      <label>Custom Meta Description</label>
                      <textarea
                        className={styles.textareaField}
                        placeholder={`Leave blank for automatic: ${autoDescriptionPlaceholder}`}
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        style={{ height: '80px', resize: 'vertical' }}
                      />
                    </div>

                    {/* Live Google Search Preview */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Google Search Result Preview</span>
                      <div style={{ textAlign: 'left', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                        <div style={{ fontSize: '12px', color: 'var(--foreground-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span>🌐</span>
                          <span style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            https://playhentai.live/series/{slug || 'url-slug'}
                          </span>
                        </div>
                        <div style={{ fontSize: '18px', color: '#58a6ff', textDecoration: 'none', cursor: 'pointer', lineHeight: '1.2', marginBottom: '4px', fontWeight: 500 }}>
                          {metaTitle || autoTitlePlaceholder}
                        </div>
                        <div style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: '1.4', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {metaDescription || autoDescriptionPlaceholder}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Locked Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                <div className={styles.checkboxRow} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="is_published" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground-primary)' }}>Publish immediately (visible in public catalog)</label>
                </div>

                <div className={styles.modalActions} style={{ margin: 0, display: 'flex', gap: '0.8rem' }}>
                  <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className={styles.saveBtn}>
                    {saving ? 'Saving...' : 'Save Series'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Manage Media Modal */}
      {mediaModalOpen && mediaSeries && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '1050px', width: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                Manage Series Media
              </h3>
              <button
                type="button"
                onClick={handleCloseMediaModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: 'var(--foreground-muted)' }}>
              Manage uploaded images and assign poster, cover, or banner roles for <strong>{mediaSeries.title}</strong>.
            </p>

            <form onSubmit={handleSaveMedia} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                
                {/* Left Column: Image Library Upload & Grid (Fixed width) */}
                <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(15, 23, 42, 0.25)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                      Series Uploaded Media Library ({imageLibrary.length} Images)
                    </h4>
                    
                    <FileUploader
                      label="Add image to library"
                      acceptedTypes="image/*"
                      maxSizeMb={5}
                      multiple={true}
                      onUploadComplete={(newKey) => {
                        setImageLibrary((prev) => {
                          const next = [...prev, newKey];
                          if (!posterKey) {
                            setPosterKey(newKey);
                          }
                          return next;
                        });
                      }}
                      previewType="thumbnail"
                    />

                    {imageLibrary.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '240px', overflowY: 'auto', padding: '0.2rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)' }}>
                        {imageLibrary.map((key, i) => (
                          <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-hover)', overflow: 'hidden' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={getR2Url(key, 'thumbnail')} 
                              alt={`Asset ${i}`} 
                              onClick={() => setLightboxKey(key)}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} 
                              title="Click to view full screen"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newLib = imageLibrary.filter((_, idx) => idx !== i);
                                setImageLibrary(newLib);
                                if (posterKey === key) setPosterKey('');
                                if (coverKey === key) setCoverKey('');
                                if (bannerKey === key) setBannerKey('');
                              }}
                              style={{
                                position: 'absolute',
                                top: '3px',
                                right: '3px',
                                background: 'rgba(0,0,0,0.85)',
                                border: 'none',
                                color: '#ef4444',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Remove image from library"
                            >
                              <X size={10} />
                            </button>
                            <span style={{ position: 'absolute', bottom: '3px', left: '3px', background: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: '0.55rem', padding: '1px 3px', borderRadius: '2px', fontWeight: 600 }}>
                              #{i + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--foreground-muted)', fontSize: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                        No images uploaded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Roles Assignment */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--foreground-primary)', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                      Assign Image Roles
                    </h4>

                    {/* Poster Role */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>POSTER ROLE (Card Image - 2:3)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {posterKey && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('poster')}
                              style={{ background: 'transparent', border: 'none', color: activeCropRole === 'poster' ? 'var(--primary)' : 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 600 }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Crop ({posterX}%)
                            </button>
                          )}
                          {posterKey && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>✓ Assigned</span>}
                        </div>
                      </div>
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.4rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0.2rem 0.5rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = posterKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setPosterKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '55px',
                                    height: '82px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'poster')} alt={`Poster Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                                    </div>
                                  )}
                                </button>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxKey(key);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '3px',
                                    right: '3px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                                  }}
                                  title="View Fullscreen Preview"
                                >
                                  🔍
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Cover Role */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>COVER ROLE (Landscape - 16:9)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {coverKey && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('cover')}
                              style={{ background: 'transparent', border: 'none', color: activeCropRole === 'cover' ? 'var(--primary)' : 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 600 }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Crop ({coverY}%)
                            </button>
                          )}
                          {coverKey && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>✓ Assigned</span>}
                        </div>
                      </div>
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.4rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0.2rem 0.5rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = coverKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setCoverKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '90px',
                                    height: '50px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'cover')} alt={`Cover Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                                    </div>
                                  )}
                                </button>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxKey(key);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '3px',
                                    right: '3px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                                  }}
                                  title="View Fullscreen Preview"
                                >
                                  🔍
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Banner Role */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>BANNER ROLE (Backdrop - 21:9)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {bannerKey && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('banner')}
                              style={{ background: 'transparent', border: 'none', color: activeCropRole === 'banner' ? 'var(--primary)' : 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', fontWeight: 600 }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Crop ({bannerY}%)
                            </button>
                          )}
                          {bannerKey && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>✓ Assigned</span>}
                        </div>
                      </div>
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.4rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0.2rem 0.5rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = bannerKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setBannerKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '105px',
                                    height: '45px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 10px rgba(168, 85, 247, 0.4)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'banner')} alt={`Banner Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✓</span>
                                    </div>
                                  )}
                                </button>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxKey(key);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '3px',
                                    right: '3px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '9px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                                  }}
                                  title="View Fullscreen Preview"
                                >
                                  🔍
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={handleCloseMediaModal} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={mediaSaving} className={styles.saveBtn}>
                  {mediaSaving ? 'Saving...' : 'Save Media'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxKey && (
        <div 
          onClick={() => setLightboxKey(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxKey(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={getR2Url(lightboxKey, 'cover')} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                borderRadius: '8px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }} 
            />
            <div style={{ color: '#ffffff', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.8rem', opacity: 0.8, wordBreak: 'break-all' }}>
              {lightboxKey}
            </div>
          </div>
        </div>
      )}

      {/* Visual Crop Modal Overlay */}
      {activeCropRole && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div 
            style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)', 
              padding: '2rem', 
              width: '100%', 
              maxWidth: activeCropRole === 'poster' ? '400px' : activeCropRole === 'cover' ? '700px' : '760px',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '1.2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                Adjust Crop Focus - {activeCropRole.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setActiveCropRole(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--foreground-muted)', textAlign: 'center' }}>
              🖱️ <strong>Drag the image</strong> in any direction inside the dashed frame to set the focus area.
            </p>

            {/* Draggable Frame Container */}
            {activeCropRole === 'poster' && posterKey && (
              <div 
                onMouseDown={(e) => handleDragStart(e, 'poster')}
                onTouchStart={(e) => handleDragStart(e, 'poster')}
                style={{
                  position: 'relative',
                  width: '280px',
                  height: '420px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: '#090d16',
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getR2Url(posterKey, 'poster')}
                  alt="Poster Crop Canvas"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${posterX}% ${posterY}%`,
                    pointerEvents: 'none'
                  }}
                />
                
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxKey(posterKey);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    cursor: 'zoom-in',
                    zIndex: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                  title="View Fullscreen Preview"
                >
                  🔍
                </span>

                <div style={{ position: 'absolute', inset: '16px', border: '2px dashed #ffffff', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', right: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', right: '-6px' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  Focus: {posterX}% X / {posterY}% Y
                </div>
              </div>
            )}

            {activeCropRole === 'cover' && coverKey && (
              <div 
                onMouseDown={(e) => handleDragStart(e, 'cover')}
                onTouchStart={(e) => handleDragStart(e, 'cover')}
                style={{
                  position: 'relative',
                  width: '600px',
                  height: '337.5px',
                  maxWidth: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: '#090d16',
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getR2Url(coverKey, 'cover')}
                  alt="Cover Crop Canvas"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${coverX}% ${coverY}%`,
                    pointerEvents: 'none'
                  }}
                />

                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxKey(coverKey);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    cursor: 'zoom-in',
                    zIndex: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                  title="View Fullscreen Preview"
                >
                  🔍
                </span>

                <div style={{ position: 'absolute', inset: '16px', border: '2px dashed #ffffff', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', right: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', right: '-6px' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  Focus: {coverX}% X / {coverY}% Y
                </div>
              </div>
            )}

            {activeCropRole === 'banner' && bannerKey && (
              <div 
                onMouseDown={(e) => handleDragStart(e, 'banner')}
                onTouchStart={(e) => handleDragStart(e, 'banner')}
                style={{
                  position: 'relative',
                  width: '640px',
                  height: '274px',
                  maxWidth: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: '#090d16',
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getR2Url(bannerKey, 'banner')}
                  alt="Banner Crop Canvas"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${bannerX}% ${bannerY}%`,
                    pointerEvents: 'none'
                  }}
                />

                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxKey(bannerKey);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    cursor: 'zoom-in',
                    zIndex: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                  title="View Fullscreen Preview"
                >
                  🔍
                </span>

                <div style={{ position: 'absolute', inset: '16px', border: '2px dashed #ffffff', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', top: '-6px', right: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', left: '-6px' }} />
                  <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#ffffff', border: '1px solid #000000', bottom: '-6px', right: '-6px' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '0.7rem', padding: '4px 10px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  Focus: {bannerX}% X / {bannerY}% Y
                </div>
              </div>
            )}

            {/* Fine Tuning Position Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '500px', marginTop: '0.5rem' }}>
              {/* Horizontal Slider */}
              <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', width: '60px', textAlign: 'right' }}>Left</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeCropRole === 'poster' ? posterX : activeCropRole === 'cover' ? coverX : bannerX}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeCropRole === 'poster') setPosterX(val);
                    if (activeCropRole === 'cover') setCoverX(val);
                    if (activeCropRole === 'banner') setBannerX(val);
                  }}
                  style={{
                    flex: 1,
                    cursor: 'ew-resize',
                    accentColor: 'var(--primary)'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', width: '60px' }}>Right</span>
              </div>

              {/* Vertical Slider */}
              <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', width: '60px', textAlign: 'right' }}>Top</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeCropRole === 'poster' ? posterY : activeCropRole === 'cover' ? coverY : bannerY}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (activeCropRole === 'poster') setPosterY(val);
                    if (activeCropRole === 'cover') setCoverY(val);
                    if (activeCropRole === 'banner') setBannerY(val);
                  }}
                  style={{
                    flex: 1,
                    cursor: 'ns-resize',
                    accentColor: 'var(--primary)'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', width: '60px' }}>Bottom</span>
              </div>
            </div>

            {/* Apply Button */}
            <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setActiveCropRole(null)}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '30px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                }}
              >
                Apply Alignment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
