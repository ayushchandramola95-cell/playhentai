'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Film, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  Image, 
  Key, 
  Maximize2, 
  Minimize2,
  ExternalLink,
  Eye,
  Play,
  Tv,
  ImageIcon,
  Sparkles,
  Building,
  Calendar,
  Globe,
  Clock,
  CheckCircle2,
  Wand2,
  FileText,
  Check,
  HelpCircle,
  RefreshCw,
  Hash,
  SlidersHorizontal,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  Copy,
  Info
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
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
  actual_episode_count?: number;
  views?: number;
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

  // Filtering & Pagination states
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedYear, selectedStudio, selectedTag, selectedStatus, itemsPerPage]);

  const handleFastTogglePublish = async (s: Series, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !s.is_published;
    try {
      const res = await fetch('/api/admin/series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: s.id,
          is_published: nextState,
        }),
      });
      if (res.ok) {
        setSeriesList((prev) =>
          prev.map((item) => (item.id === s.id ? { ...item, is_published: nextState } : item))
        );
      }
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
    }
  };



  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'genres' | 'specs' | 'about_faq' | 'seo' | 'tsv'>('general');
  const [showTsvDrawer, setShowTsvDrawer] = useState(false);
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

  // Smart Fill Helpers
  const handleAutoSlug = () => {
    if (!title) return;
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generated);
  };

  const handleToggleDubbedTag = () => {
    const current = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const hasDub = current.some(t => t.toLowerCase() === 'dub' || t.toLowerCase() === 'dubbed' || t.toLowerCase() === 'english dub');
    if (hasDub) {
      const filtered = current.filter(t => t.toLowerCase() !== 'dub' && t.toLowerCase() !== 'dubbed' && t.toLowerCase() !== 'english dub');
      setTagsInput(filtered.join(', '));
    } else {
      current.push('Dubbed', 'English Dub');
      setTagsInput(current.join(', '));
    }
  };

  const handleToggleSubbedTag = () => {
    const current = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const hasSub = current.some(t => t.toLowerCase() === 'sub' || t.toLowerCase() === 'english sub' || t.toLowerCase() === 'subbed');
    if (hasSub) {
      const filtered = current.filter(t => t.toLowerCase() !== 'sub' && t.toLowerCase() !== 'english sub' && t.toLowerCase() !== 'subbed');
      setTagsInput(filtered.join(', '));
    } else {
      current.push('English Sub', 'Subbed');
      setTagsInput(current.join(', '));
    }
  };

  const handleAutoFillSEO = () => {
    if (title) {
      setMetaTitle(`${title} - Watch English Sub HD | Play Hentai`);
      if (description) {
        const cleanDesc = description.replace(/<[^>]*>?/gm, '').slice(0, 155).trim() + '...';
        setMetaDescription(cleanDesc);
      } else {
        setMetaDescription(`Watch ${title} with English subtitles in HD. Stream all available episodes, releases, and check out similar anime on Play Hentai.`);
      }
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isModalOpen) {
        e.preventDefault();
        const form = document.getElementById('series-crud-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

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

  // Custom Gemini API Keys states
  interface CustomGeminiKey {
    id: string;
    nickname: string;
    key: string;
  }

  const [customKeys, setCustomKeys] = useState<CustomGeminiKey[]>([]);
  const [activeKeyId, setActiveKeyId] = useState<string>('default');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyNickname, setNewKeyNickname] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedKeys = localStorage.getItem('admin_gemini_keys');
        if (storedKeys) {
          setCustomKeys(JSON.parse(storedKeys));
        }
        const activeId = localStorage.getItem('admin_gemini_active_key_id');
        if (activeId) {
          setActiveKeyId(activeId);
        }
      } catch (e) {
        console.error('Failed to load Gemini keys from localStorage:', e);
      }
    }
  }, []);

  const handleSelectKey = (keyId: string) => {
    setActiveKeyId(keyId);
    localStorage.setItem('admin_gemini_active_key_id', keyId);
  };

  const handleAddCustomKey = () => {
    if (!newKeyNickname.trim() || !newKeyValue.trim()) return;
    const newKey: CustomGeminiKey = {
      id: 'key-' + Date.now(),
      nickname: newKeyNickname.trim(),
      key: newKeyValue.trim()
    };
    const updated = [...customKeys, newKey];
    setCustomKeys(updated);
    localStorage.setItem('admin_gemini_keys', JSON.stringify(updated));
    
    // Automatically select the new key
    handleSelectKey(newKey.id);

    // Reset inputs
    setNewKeyNickname('');
    setNewKeyValue('');
  };

  const handleDeleteCustomKey = (keyId: string) => {
    const updated = customKeys.filter(k => k.id !== keyId);
    setCustomKeys(updated);
    localStorage.setItem('admin_gemini_keys', JSON.stringify(updated));

    if (activeKeyId === keyId) {
      handleSelectKey('default');
    }
  };

  const getActiveApiKey = () => {
    if (activeKeyId === 'default') return '';
    const found = customKeys.find(k => k.id === activeKeyId);
    return found ? found.key : '';
  };

  // TSV Metadata Parser states
  const [tsvInput, setTsvInput] = useState('');
  const [tsvError, setTsvError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Record<string, any> | null>(null);

  const resetTsvParser = () => {
    setTsvInput('');
    setTsvError(null);
    setParsedPreview(null);
  };

  const formatFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      title: 'Series Title',
      synopsis: 'Synopsis',
      releaseYear: 'Release Year',
      studio: 'Production Studio',
      tagsInput: 'Tags / Genre',
      altTitleJapanese: 'Japanese Title',
      altTitleRomaji: 'Romaji Title',
      altTitleEnglish: 'English Title',
      status: 'Airing Status',
      episodeCountOverride: 'Planned Episode Count',
      firstAirDate: 'First Air Date',
      lastAirDate: 'Last Air Date',
      aliasesInput: 'Search Aliases',
      aboutOverview: 'Overview',
      aboutProduction: 'Production & Presentation',
      aboutThemes: 'Themes & Style',
      aboutRecommended: 'Recommended For'
    };
    return labels[key] || key;
  };

  const parseDateToYYYYMMDD = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return '';
    const trimmed = dateStr.trim();
    
    // Try MM/DD/YYYY
    const mdY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) {
      const month = mdY[1].padStart(2, '0');
      const day = mdY[2].padStart(2, '0');
      const year = mdY[3];
      return `${year}-${month}-${day}`;
    }

    // Try YYYY-MM-DD
    const yMd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yMd) {
      const year = yMd[1];
      const month = yMd[2].padStart(2, '0');
      const day = yMd[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try DD.MM.YYYY
    const dMy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dMy) {
      const day = dMy[1].padStart(2, '0');
      const month = dMy[2].padStart(2, '0');
      const year = dMy[3];
      return `${year}-${month}-${day}`;
    }

    return '';
  };

  const parseTSV = (text: string): string[][] => {
    // Normalize newlines
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split by lines
    const rawLines = normalized.split('\n');
    const reconstructedRows: string[] = [];
    let currentAccumulatedRow = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (currentAccumulatedRow === '') {
        currentAccumulatedRow = line;
      } else {
        currentAccumulatedRow += '\n' + line;
      }

      // Count the number of tab characters in the accumulated row, ignoring tabs inside quotes if quotes are balanced
      let tabCount = 0;
      let inQuotes = false;
      for (let j = 0; j < currentAccumulatedRow.length; j++) {
        const char = currentAccumulatedRow[j];
        if (char === '"') {
          if (inQuotes && currentAccumulatedRow[j + 1] === '"') {
            j++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === '\t' && !inQuotes) {
          tabCount++;
        }
      }

      // If we have at least 16 tabs (which means 17 columns), or if it's the last line, we commit the row
      if (tabCount >= 16 || i === rawLines.length - 1) {
        reconstructedRows.push(currentAccumulatedRow);
        currentAccumulatedRow = '';
      }
    }

    // Now parse each reconstructed row
    const finalRows: string[][] = [];
    for (const rowText of reconstructedRows) {
      const rowFields: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < rowText.length; i++) {
        const char = rowText[i];
        if (char === '"') {
          if (inQuotes && rowText[i + 1] === '"') {
            currentField += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === '\t' && !inQuotes) {
          rowFields.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      rowFields.push(currentField);
      finalRows.push(rowFields.map(cell => cell.trim()));
    }

    return finalRows;
  };

  const handleParseMetadata = () => {
    setTsvError(null);
    setParsedPreview(null);

    if (!tsvInput.trim()) {
      setTsvError('Please paste some tab-separated metadata.');
      return;
    }

    try {
      const parsedRows = parseTSV(tsvInput).filter(r => r.length > 0 && r.some(cell => cell !== ''));
      if (parsedRows.length === 0) {
        throw new Error('No valid rows found in pasted text.');
      }

      let dataRow: string[] | null = null;
      let hasHeader = false;

      // Check if first row is header
      const firstRow = parsedRows[0];
      const headerKeywords = ['series title', 'synopsis', 'release year', 'production studio', 'tags'];
      const isHeader = firstRow.some(cell => headerKeywords.includes(cell.toLowerCase().trim()));

      if (isHeader) {
        hasHeader = true;
        if (parsedRows.length < 2) {
          throw new Error('Header row detected, but no data row was found below it.');
        }
        dataRow = parsedRows[1];
      } else {
        dataRow = firstRow;
      }

      if (dataRow.length !== 17) {
        throw new Error(`Metadata parser found ${dataRow.length} columns. Expected exactly 17.`);
      }

      // Validation
      const errors: string[] = [];

      const titleVal = dataRow[0].trim();
      if (!titleVal) {
        errors.push('Series Title (Column 1) is required and cannot be empty.');
      }

      const yearVal = dataRow[2].trim();
      if (yearVal) {
        const yearNum = Number(yearVal);
        if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
          errors.push(`Invalid Release Year: "${yearVal}". Expected a valid year between 1900 and 2100.`);
        }
      }

      const rawStatus = dataRow[8].trim();
      const statusVal = rawStatus.toLowerCase();
      const allowedStatuses = ['ongoing (airing)', 'ongoing', 'completed (finalized)', 'completed', 'upcoming'];
      if (statusVal && !allowedStatuses.includes(statusVal)) {
        errors.push(`Invalid Airing Status: "${rawStatus}". Expected Ongoing (Airing), Completed (Finalized), or Upcoming.`);
      }

      const epCountVal = dataRow[9].trim();
      if (epCountVal) {
        const epNum = Number(epCountVal);
        if (isNaN(epNum) || epNum < 0) {
          errors.push(`Invalid Planned Episode Count: "${epCountVal}". Expected a non-negative number.`);
        }
      }

      const firstAirVal = dataRow[10].trim();
      if (firstAirVal) {
        const formatted = parseDateToYYYYMMDD(firstAirVal);
        if (!formatted) {
          errors.push(`Invalid First Air Date: "${firstAirVal}". Expected MM/DD/YYYY or YYYY-MM-DD.`);
        }
      }

      const lastAirVal = dataRow[11].trim();
      if (lastAirVal) {
        const formatted = parseDateToYYYYMMDD(lastAirVal);
        if (!formatted) {
          errors.push(`Invalid Last Air Date: "${lastAirVal}". Expected MM/DD/YYYY or YYYY-MM-DD.`);
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join(' | '));
      }

      // Map airing status value
      let mappedStatus = 'ongoing';
      if (statusVal.includes('completed')) {
        mappedStatus = 'completed';
      } else if (statusVal.includes('upcoming')) {
        mappedStatus = 'upcoming';
      }

      // Safe mapping preview
      const previewData = {
        title: titleVal,
        synopsis: dataRow[1].trim(),
        releaseYear: yearVal ? Number(yearVal) : '',
        studio: dataRow[3].trim(),
        tagsInput: dataRow[4].trim(),
        altTitleJapanese: dataRow[5].trim(),
        altTitleRomaji: dataRow[6].trim(),
        altTitleEnglish: dataRow[7].trim(),
        status: mappedStatus,
        episodeCountOverride: epCountVal ? Number(epCountVal) : '',
        firstAirDate: firstAirVal ? parseDateToYYYYMMDD(firstAirVal) : '',
        lastAirDate: lastAirVal ? parseDateToYYYYMMDD(lastAirVal) : '',
        aliasesInput: dataRow[12].trim(),
        aboutOverview: dataRow[13].trim(),
        aboutProduction: dataRow[14].trim(),
        aboutThemes: dataRow[15].trim(),
        aboutRecommended: dataRow[16].trim()
      };

      setParsedPreview(previewData);
    } catch (err: any) {
      setTsvError(err.message || 'Parsing failed.');
    }
  };

  const handleApplyMetadata = () => {
    if (!parsedPreview) return;

    setTitle(parsedPreview.title);
    
    // Auto-generate slug from title if not editing
    if (!editingId) {
      setSlug(
        parsedPreview.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }

    setDescription(parsedPreview.synopsis);
    setReleaseYear(parsedPreview.releaseYear);
    setStudio(parsedPreview.studio);
    setTagsInput(parsedPreview.tagsInput);
    setAltTitleJapanese(parsedPreview.altTitleJapanese);
    setAltTitleRomaji(parsedPreview.altTitleRomaji);
    setAltTitleEnglish(parsedPreview.altTitleEnglish);
    setStatus(parsedPreview.status);
    setEpisodeCountOverride(parsedPreview.episodeCountOverride);
    setFirstAirDate(parsedPreview.firstAirDate);
    setLastAirDate(parsedPreview.lastAirDate);
    setAliasesInput(parsedPreview.aliasesInput);
    setAboutOverview(parsedPreview.aboutOverview);
    setAboutProduction(parsedPreview.aboutProduction);
    setAboutThemes(parsedPreview.aboutThemes);
    setAboutRecommended(parsedPreview.aboutRecommended);

    // Close preview panel and keep textarea input so they know what was applied
    setParsedPreview(null);
    setTsvError(null);
  };

  const [savingTsv, setSavingTsv] = useState(false);

  const handleDownloadTSV = () => {
    if (!tsvInput) return;
    const blob = new Blob([tsvInput], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title ? title.replace(/[^a-z0-9]+/gi, '_').toLowerCase() : 'series'}_metadata.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveTsvOnly = async () => {
    if (!editingId) return;
    setSavingTsv(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Preserve any existing internal featured tags
      const originalSeries = seriesList.find((s) => s.id === editingId);
      let finalTags = tags;
      if (originalSeries && originalSeries.tags) {
        const internalTags = originalSeries.tags.filter(
          (t) => t.toLowerCase().startsWith('featured:') || t.toLowerCase() === 'featured'
        );
        finalTags = [...tags, ...internalTags];
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
        }
      } catch (e) {}

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
        tags: finalTags,
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
          recommended: aboutRecommended,
          tsv: tsvInput
        },
        faq_override: faqOverride,
        status,
        episode_count_override: episodeCountOverride !== '' ? Number(episodeCountOverride) : null,
        runtime: runtime !== '' ? Math.ceil(Number(runtime)) : 24,
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
        poster_position: (originalSeries?.poster_position) || '50% 50%',
        cover_position: (originalSeries?.cover_position) || '50% 50%',
        banner_position: (originalSeries?.banner_position) || '50% 50%',
        metadata_locks: {},
        metadata_provenance: {},
        metadata_versions: [],
        raw_provider_payload: {}
      };

      const res = await fetch('/api/admin/series', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update series metadata');

      fetchSeries();
      alert('✓ TSV Metadata saved and updated successfully inside the database!');
    } catch (err: any) {
      alert(`Error updating TSV: ${err.message}`);
    } finally {
      setSavingTsv(false);
    }
  };

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
  const [autoRuntimeInfo, setAutoRuntimeInfo] = useState<{ isAuto: boolean; episodeCount: number; avgMinutes: number } | null>(null);

  const calculateSeriesEpisodeRuntime = async (seriesId: string, currentRuntime?: number) => {
    try {
      const res = await fetch(`/api/admin/episodes?series_id=${seriesId}`);
      if (!res.ok) return;
      const data = await res.json();
      const eps = data.episodes || [];
      const validEps = eps.filter((ep: any) => ep.duration_seconds && ep.duration_seconds > 0);
      if (validEps.length > 0) {
        const totalSecs = validEps.reduce((acc: number, ep: any) => acc + ep.duration_seconds, 0);
        const avgMins = Math.ceil(totalSecs / validEps.length / 60);
        setRuntime(avgMins);
        setAutoRuntimeInfo({ isAuto: true, episodeCount: validEps.length, avgMinutes: avgMins });
      } else {
        setAutoRuntimeInfo(null);
        if (currentRuntime !== undefined && currentRuntime !== null) {
          setRuntime(Math.ceil(currentRuntime));
        }
      }
    } catch (err) {
      console.error('Error auto-calculating episode runtime:', err);
    }
  };

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
  const [isMediaModalFullscreen, setIsMediaModalFullscreen] = useState(false);
  const [mediaSeries, setMediaSeries] = useState<Series | null>(null);
  const [mediaSaving, setMediaSaving] = useState(false);

  // Focus position offsets (0-100)
  const [posterX, setPosterX] = useState<number>(50);
  const [posterY, setPosterY] = useState<number>(50);
  const [coverX, setCoverX] = useState<number>(50);
  const [coverY, setCoverY] = useState<number>(50);
  const [bannerX, setBannerX] = useState<number>(50);
  const [bannerY, setBannerY] = useState<number>(50);
  const [posterSqueeze, setPosterSqueeze] = useState<boolean>(false);

  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [activeCropRole, setActiveCropRole] = useState<'poster' | 'cover' | 'banner' | null>(null);

  // Episode Thumbnail Picker state for Manage Media Modal
  const [episodeThumbnails, setEpisodeThumbnails] = useState<{ episodeNumber: number; title: string; key: string }[]>([]);
  const [loadingEpisodeThumbs, setLoadingEpisodeThumbs] = useState(false);
  const [showEpisodePicker, setShowEpisodePicker] = useState(false);

  const fetchEpisodeThumbnails = async (seriesId: string) => {
    setLoadingEpisodeThumbs(true);
    try {
      const res = await fetch(`/api/admin/episodes?series_id=${seriesId}`);
      if (!res.ok) throw new Error('Failed to fetch episode thumbnails');
      const data = await res.json();
      const epData = data.episodes || [];

      const collected: { episodeNumber: number; title: string; key: string }[] = [];
      const seenKeys = new Set<string>();

      epData.forEach((ep: any) => {
        if (ep.thumbnail_key && !seenKeys.has(ep.thumbnail_key)) {
          seenKeys.add(ep.thumbnail_key);
          collected.push({
            episodeNumber: ep.episode_number,
            title: ep.title || `Episode ${ep.episode_number}`,
            key: ep.thumbnail_key,
          });
        }
        if (ep.thumbnail_options && Array.isArray(ep.thumbnail_options)) {
          ep.thumbnail_options.forEach((optKey: string) => {
            if (optKey && !seenKeys.has(optKey)) {
              seenKeys.add(optKey);
              collected.push({
                episodeNumber: ep.episode_number,
                title: ep.title || `Episode ${ep.episode_number}`,
                key: optKey,
              });
            }
          });
        }
      });

      setEpisodeThumbnails(collected);
    } catch (err) {
      console.error('Error fetching episode thumbnails:', err);
    } finally {
      setLoadingEpisodeThumbs(false);
    }
  };

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
          model: aboutModel,
          apiKey: getActiveApiKey()
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
          model: aboutModel,
          apiKey: getActiveApiKey()
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
    setPosterSqueeze(s.poster_position === 'squeeze');

    setShowEpisodePicker(false);
    setEpisodeThumbnails([]);
    setMediaModalOpen(true);

    fetchEpisodeThumbnails(s.id);
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
    setPosterSqueeze(false);
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
      poster_position: posterSqueeze ? 'squeeze' : `${posterX}% ${posterY}%`,
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
    resetTsvParser();
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
    setAutoRuntimeInfo(null);
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
    resetTsvParser();

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
    
    // Set initial rounded runtime and calculate from uploaded episodes
    setAutoRuntimeInfo(null);
    setRuntime(s.runtime !== undefined && s.runtime !== null ? Math.ceil(s.runtime) : 24);
    calculateSeriesEpisodeRuntime(s.id, s.runtime);

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
    resetTsvParser();
    if (s.about_data?.tsv) {
      setTsvInput(s.about_data.tsv);
    }

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
        recommended: aboutRecommended,
        tsv: tsvInput
      },
      faq_override: faqOverride,
      status,
      episode_count_override: episodeCountOverride !== '' ? Number(episodeCountOverride) : null,
      runtime: runtime !== '' ? Math.ceil(Number(runtime)) : 24,
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

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredList.length);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


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
              placeholder="Search series by title or slug..."
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

      {/* Quick Filter Status Chips */}
      <div className={styles.seriesQuickFilterRow}>
        <button
          type="button"
          onClick={() => setSelectedStatus('all')}
          className={`${styles.quickFilterPill} ${selectedStatus === 'all' ? styles.quickFilterPillActive : ''}`}
        >
          <span>All Series ({seriesList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedStatus('published')}
          className={`${styles.quickFilterPill} ${selectedStatus === 'published' ? styles.quickFilterPillActive : ''}`}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span>Live Published ({seriesList.filter(s => s.is_published).length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedStatus('draft')}
          className={`${styles.quickFilterPill} ${selectedStatus === 'draft' ? styles.quickFilterPillActive : ''}`}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
          <span>Drafts ({seriesList.filter(s => !s.is_published).length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px', display: 'inline-block' }} />
        </div>
      ) : filteredList.length > 0 ? (
        <div className={styles.seriesCardsList}>
          {paginatedList.map((s) => {
            const imageKey = s.poster_image_key || s.cover_image_key || s.banner_image_key;
            const hasBanner = !!(s.cover_image_key || s.banner_image_key);
            const galleryCount = Array.isArray(s.image_library) ? s.image_library.length : 0;
            const totalEpisodes = s.actual_episode_count || s.episode_count_override || 0;

            return (
              <div 
                key={s.id} 
                className={`${styles.seriesCardItem} ${s.is_published ? styles.seriesCardItemPublished : styles.seriesCardItemDraft}`}
              >
                {/* 1. Large High-Res Poster Thumbnail */}
                <div
                  onClick={() => handleOpenMediaModal(s)}
                  className={styles.seriesCardThumb}
                  title="Click to Manage Media, Posters, and Backdrops"
                >
                  {imageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getR2Url(imageKey, s.poster_image_key ? 'poster' : 'cover')}
                      alt={s.title}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(168, 85, 247, 0.06)' }}>
                      <Image size={22} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Add Image</span>
                    </div>
                  )}

                  <div className={styles.seriesCardThumbHover}>
                    <Image size={18} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>Media</span>
                  </div>
                </div>

                {/* 2. Rich Series Content Column */}
                <div className={styles.seriesCardContent}>
                  
                  {/* Top Row: Status Badges, Specs, and Metrics */}
                  <div className={styles.seriesCardTopRow}>
                    <div className={styles.seriesCardMetaBadges}>
                      {/* Live 1-Click Fast Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => handleFastTogglePublish(s, e)}
                        className={styles.badge}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.25rem 0.8rem',
                          borderRadius: '20px',
                          background: s.is_published ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: s.is_published ? '#10b981' : '#f59e0b',
                          border: s.is_published ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        title="Click to instantly toggle Live / Draft publication status"
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.is_published ? '#10b981' : '#f59e0b', boxShadow: s.is_published ? '0 0 8px #10b981' : 'none' }} />
                        <span>{s.is_published ? 'Published (Live)' : 'Draft (Hidden)'}</span>
                      </button>

                      {/* State Badge */}
                      <span
                        className={styles.badge}
                        style={{
                          textTransform: 'capitalize',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: s.status === 'completed' ? 'rgba(59, 130, 246, 0.12)' : s.status === 'upcoming' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                          color: s.status === 'completed' ? '#60a5fa' : s.status === 'upcoming' ? '#c084fc' : 'var(--foreground-muted)'
                        }}
                      >
                        {s.status || 'ongoing'}
                      </span>

                      {/* 16:9 Banner Ready Badge (only if available) */}
                      {hasBanner && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '12px' }} title="16:9 Banner Backdrops Ready">
                          🖼️ 16:9 Banner
                        </span>
                      )}

                      {/* Gallery Count */}
                      {galleryCount > 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '0.15rem 0.55rem', borderRadius: '12px' }}>
                          +{galleryCount} Gallery Imgs
                        </span>
                      )}
                    </div>

                    {/* Episodes & Views Metrics */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <Link 
                        href={`/admin/episodes?seriesId=${s.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          background: totalEpisodes > 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: totalEpisodes > 0 ? '#38bdf8' : 'var(--foreground-muted)',
                          border: totalEpisodes > 0 ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border)',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        title="Manage & Upload Episodes for this series"
                      >
                        <Film size={13} />
                        <span>{totalEpisodes} {totalEpisodes === 1 ? 'Episode' : 'Episodes'}</span>
                      </Link>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#c084fc', fontWeight: 700, background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                        <Eye size={13} />
                        <span>{(s.views || 0).toLocaleString()} Views</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Title, Japanese Aliases, and Link */}
                  <div>
                    <div className={styles.seriesCardTitleRow}>
                      <span className={styles.seriesCardTitle}>
                        {s.title}
                      </span>
                      <a 
                        href={`/series/${s.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#38bdf8', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}
                        title="Open Live Public Show Page in new tab"
                      >
                        <span>View Page</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {/* Alternate Japanese & Romaji Subtitles */}
                    {(s.alt_title_romaji || s.alt_title_japanese) && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                        {s.alt_title_romaji && <span>Romaji: {s.alt_title_romaji}</span>}
                        {s.alt_title_romaji && s.alt_title_japanese && <span>•</span>}
                        {s.alt_title_japanese && <span style={{ color: '#64748b' }}>{s.alt_title_japanese}</span>}
                      </div>
                    )}

                    {/* Synopsis Preview */}
                    {s.description && (
                      <p className={styles.seriesCardSynopsis} style={{ marginTop: '0.35rem' }}>
                        {s.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Studio, Specs, Tag Chips & Action Buttons */}
                  <div className={styles.seriesCardBottomRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {/* Studio */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                        <Building size={13} style={{ color: 'var(--primary)' }} />
                        <span>{s.studio || 'Studio N/A'}</span>
                      </div>

                      {/* Year */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: 'var(--foreground-secondary)' }}>
                        <Calendar size={12} />
                        <span>{s.release_year || 'Year N/A'}</span>
                      </div>

                      {/* Specs */}
                      <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.68rem', fontWeight: 900, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                        HD
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--foreground-secondary)', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                        {s.runtime || 24}m
                      </span>
                      <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                        {s.age_rating || '18+'}
                      </span>

                      {/* Slug */}
                      <code style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.35)', padding: '0.1rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border)', color: '#a7f3d0' }}>
                        /{s.slug}
                      </code>

                      {/* Tags */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(s.tags || []).slice(0, 4).map((tag) => (
                          <span 
                            key={tag} 
                            style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 600,
                              padding: '0.12rem 0.45rem', 
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
                            style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', background: 'var(--surface-hover)', borderRadius: '6px', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}
                          >
                            +{s.tags.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.seriesCardActions}>
                      <a
                        href={`/series/${s.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.editActionBtn}
                        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.25)' }}
                        title="View Live Public Show Page in new tab"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Link
                        href={`/admin/episodes?seriesId=${s.id}`}
                        className={styles.editActionBtn}
                        style={{ color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.25)' }}
                        title="Manage Show Episodes"
                      >
                        <Film size={15} />
                      </Link>
                      <button 
                        onClick={() => handleOpenEdit(s)} 
                        className={styles.editActionBtn} 
                        title="Edit Series Metadata"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)} 
                        className={styles.deleteActionBtn} 
                        title="Delete Series"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No series found matching your query. Click "Add Series" to register your first show.
        </div>
      )}

      {/* Pagination Controls */}
      {filteredList.length > 0 && (
        <div className={styles.paginationBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className={styles.paginationInfo}>
              Showing {startIndex + 1}–{endIndex} of {filteredList.length} titles (Page {safeCurrentPage} of {totalPages})
            </div>

            {/* Per-Page Limit Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-muted)' }}>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={10} style={{ background: '#1e293b' }}>10 / page</option>
                <option value={20} style={{ background: '#1e293b' }}>20 / page</option>
                <option value={50} style={{ background: '#1e293b' }}>50 / page</option>
                <option value={100} style={{ background: '#1e293b' }}>100 / page</option>
                <option value={1000} style={{ background: '#1e293b' }}>All</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
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
          )}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalFullscreen}`}>
            {/* Modal Header */}
            <div className={styles.modalHeader} style={{ marginBottom: '0.8rem', paddingBottom: '0.8rem', borderBottom: '1px solid #23283b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wand2 size={20} style={{ color: 'var(--primary)' }} />
                  <span>{editingId ? `Edit Series: ${title || 'Untitled'}` : 'Add New Series to Catalog'}</span>
                </h3>
                {editingId && slug && (
                  <code style={{ fontSize: '0.76rem', background: '#131722', padding: '0.15rem 0.55rem', borderRadius: '6px', border: '1px solid #23283b', color: '#a7f3d0' }}>
                    /{slug}
                  </code>
                )}
                <button 
                  type="button"
                  onClick={() => setIsPublished((prev) => !prev)}
                  style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    background: isPublished ? '#064e3b' : '#78350f',
                    color: isPublished ? '#6ee7b7' : '#fcd34d',
                    border: isPublished ? '1px solid #059669' : '1px solid #d97706',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Click to toggle between Published and Draft"
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPublished ? '#10b981' : '#f59e0b', boxShadow: isPublished ? '0 0 8px #10b981' : 'none' }} />
                  <span>{isPublished ? 'Live on Catalog' : 'Draft (Hidden)'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTsvDrawer((prev) => !prev)}
                  className={`${styles.modalTabBtn} ${showTsvDrawer ? styles.modalTabBtnActive : ''}`}
                  title="Quick-paste 17-column TSV metadata from ChatGPT or Google Sheets"
                >
                  <FileText size={14} />
                  <span>{showTsvDrawer ? 'Hide TSV Drawer' : '📋 TSV Auto-Fill'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className={styles.modalTabBtn}
                  title="Manage Gemini AI API Keys"
                >
                  <Key size={14} />
                  <span>AI Keys ({customKeys.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)', padding: '0.2rem' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorAlert} style={{ marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Collapsible TSV Auto-Fill Drawer */}
            {showTsvDrawer && (
              <div style={{
                background: '#131722',
                border: '1px solid #23283b',
                borderRadius: '14px',
                padding: '1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} />
                    <span>Paste 17-Column TSV Metadata Row</span>
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                    Copy row from ChatGPT/Sheets (Title, Slug, Studio, Tags, Year, Alt Titles, etc.)
                  </span>
                </div>

                <textarea
                  placeholder="Paste the 17-column TSV metadata here..."
                  value={tsvInput}
                  onChange={(e) => setTsvInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: '70px',
                    borderRadius: '8px',
                    border: '1px solid #282e44',
                    background: '#181c2b',
                    color: '#ffffff',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />

                {tsvError && (
                  <div style={{ color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={14} />
                    <span>{tsvError}</span>
                  </div>
                )}

                {parsedPreview ? (
                  <div style={{ background: '#181c2b', border: '1px solid #282e44', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#10b981' }}>
                      ✓ 17 / 17 fields detected successfully!
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.35rem', maxHeight: '90px', overflowY: 'auto' }}>
                      {Object.entries(parsedPreview).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                          <span style={{ color: 'var(--foreground-muted)' }}>{formatFieldLabel(key)}:</span>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={String(val)}>
                            {String(val) || <span style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>empty</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.6rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={resetTsvParser} className={styles.cancelBtn} style={{ padding: '0.35rem 0.9rem', fontSize: '0.76rem' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleApplyMetadata} className={styles.saveBtn} style={{ padding: '0.35rem 1.1rem', fontSize: '0.76rem' }}>
                        Apply to Form
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {tsvInput && (
                      <button type="button" onClick={resetTsvParser} className={styles.cancelBtn} style={{ padding: '0.35rem 0.9rem', fontSize: '0.76rem' }}>
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleParseMetadata}
                      disabled={!tsvInput.trim()}
                      className={styles.saveBtn}
                      style={{ padding: '0.35rem 1.25rem', fontSize: '0.76rem' }}
                    >
                      Parse Metadata
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Navigation Tabs Bar */}
            <div className={styles.modalNavTabs}>
              <button
                type="button"
                onClick={() => setModalTab('general')}
                className={`${styles.modalTabBtn} ${modalTab === 'general' ? styles.modalTabBtnActive : ''}`}
              >
                <Film size={15} />
                <span>1. General & Story</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('genres')}
                className={`${styles.modalTabBtn} ${modalTab === 'genres' ? styles.modalTabBtnActive : ''}`}
              >
                <Hash size={15} />
                <span>2. Genres & Tags</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('specs')}
                className={`${styles.modalTabBtn} ${modalTab === 'specs' ? styles.modalTabBtnActive : ''}`}
              >
                <SlidersHorizontal size={15} />
                <span>3. Specifications</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('about_faq')}
                className={`${styles.modalTabBtn} ${modalTab === 'about_faq' ? styles.modalTabBtnActive : ''}`}
              >
                <BookOpen size={15} />
                <span>4. About Wiki & FAQ</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('seo')}
                className={`${styles.modalTabBtn} ${modalTab === 'seo' ? styles.modalTabBtnActive : ''}`}
              >
                <Globe size={15} />
                <span>5. SEO & Google SERP</span>
              </button>
            </div>

            {/* Main Studio Form */}
            <form id="series-crud-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className={styles.modalWorkspaceLayout}>
                
                {/* Left Pane: Active Tab Editor */}
                <div className={styles.modalEditorPane}>
                  
                  {/* TAB 1: General & Story */}
                  {modalTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                        {/* Title */}
                        <div className={styles.formGroup}>
                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Series Title *</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>Main Display Name</span>
                          </label>
                          <input
                            type="text"
                            required
                            className={styles.inputField}
                            placeholder="e.g. 3D – Bonding Ritual"
                            value={title}
                            onChange={handleTitleChange}
                            style={{ fontSize: '0.95rem', fontWeight: 700 }}
                          />
                        </div>

                        {/* URL Slug */}
                        <div className={styles.formGroup}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <label style={{ margin: 0 }}>URL Slug *</label>
                            <button
                              type="button"
                              onClick={handleAutoSlug}
                              style={{ background: '#4c1d95', border: '1px solid #7c3aed', color: '#e9d5ff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                              title="Auto-generate clean kebab-case URL slug from Title"
                            >
                              ⚡ Auto-Slug
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            className={styles.inputField}
                            placeholder="e.g. 3d-bonding-ritual"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            style={{ fontFamily: 'monospace', color: '#a7f3d0' }}
                          />
                        </div>
                      </div>

                      {/* Alternate Multilingual Titles */}
                      <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>
                          Multilingual Alternate Titles
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                          <div className={styles.formGroup}>
                            <label style={{ fontSize: '0.75rem' }}>Japanese Title</label>
                            <input
                              type="text"
                              className={styles.inputField}
                              placeholder="e.g. オーバーフロー"
                              value={altTitleJapanese}
                              onChange={(e) => setAltTitleJapanese(e.target.value)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label style={{ fontSize: '0.75rem' }}>Romaji Title</label>
                            <input
                              type="text"
                              className={styles.inputField}
                              placeholder="e.g. Ōbāfurō"
                              value={altTitleRomaji}
                              onChange={(e) => setAltTitleRomaji(e.target.value)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label style={{ fontSize: '0.75rem' }}>English Title</label>
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

                      {/* Story Synopsis */}
                      <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>Synopsis Description (Story / Plot Summary) *</label>
                          <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
                            {description.split(/\s+/).filter(Boolean).length} words • {description.length} chars
                          </span>
                        </div>
                        <textarea
                          required
                          className={styles.textareaField}
                          placeholder="Write a comprehensive plot summary (recommended: 350-600 words mentioning story, main characters, themes, and subbed/dubbed info naturally)..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          style={{ height: '180px', resize: 'vertical', fontSize: '0.9rem', lineHeight: 1.5 }}
                        />
                      </div>

                      {/* Year & Studio */}
                      <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <label>Release Year</label>
                          <select
                            value={releaseYear}
                            onChange={(e) => setReleaseYear(e.target.value ? Number(e.target.value) : '')}
                            style={{ width: '100%', height: '42px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #282e44', background: '#181c2b', color: '#f1f5f9', fontWeight: 600, outline: 'none' }}
                          >
                            <option value="">-- Select Year --</option>
                            {RELEASE_YEARS.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.formGroup}>
                          <label>Production Studios (comma-separated)</label>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="e.g. PoRO, Bunnywalker, Pink Pineapple"
                            value={studio}
                            onChange={(e) => setStudio(e.target.value)}
                          />
                          {/* Quick Studio Cloud */}
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', maxHeight: '80px', overflowY: 'auto', padding: '0.4rem', border: '1px solid #23283b', borderRadius: '8px', background: '#131722' }}>
                            {dynamicStudios.slice(0, 16).map((s) => {
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
                                    fontWeight: 700,
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    border: isSelected ? '1px solid #8b5cf6' : '1px solid #282e44',
                                    cursor: 'pointer',
                                    background: isSelected ? '#7c3aed' : '#181c2b',
                                    color: isSelected ? '#ffffff' : '#cbd5e1',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Genres & Tags */}
                  {modalTab === 'genres' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label style={{ margin: 0 }}>Tags / Genres (comma-separated)</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={handleToggleDubbedTag}
                              style={{ background: '#0c4a6e', border: '1px solid #0284c7', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                              title="Toggle English Dubbed tag preset"
                            >
                              ⚡ English Dubbed
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleSubbedTag}
                              style={{ background: '#4c1d95', border: '1px solid #7c3aed', color: '#c084fc', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                              title="Toggle English Subbed tag preset"
                            >
                              ⚡ English Subbed
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder="e.g. 3D, Uncensored, Romance, Fantasy, Harem"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                        />
                      </div>

                      {/* Interactive Genre Cloud */}
                      <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>
                            1-Click Popular Genre Picker ({dynamicTags.length} Genres Available)
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>Click tag to toggle</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '200px', overflowY: 'auto', padding: '0.4rem' }}>
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
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  padding: '0.3rem 0.7rem',
                                  borderRadius: '8px',
                                  border: isSelected ? '1px solid #8b5cf6' : '1px solid #282e44',
                                  cursor: 'pointer',
                                  background: isSelected ? '#7c3aed' : '#181c2b',
                                  color: isSelected ? '#ffffff' : '#cbd5e1',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                #{genre}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Content Warnings & Source */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <label>Content Warnings (optional)</label>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="e.g. NTR, Mind Break, Gore (Leave blank if none)"
                            value={contentWarningsInput}
                            onChange={(e) => setContentWarningsInput(e.target.value)}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label>Original Source</label>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="e.g. Manga, Light Novel, Game, Original, Visual Novel"
                            value={originalSource}
                            onChange={(e) => setOriginalSource(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Specifications & Airing */}
                  {modalTab === 'specs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.formGroup}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <label style={{ margin: 0 }}>Average Runtime (Minutes)</label>
                            {autoRuntimeInfo && (
                              <span style={{ fontSize: '0.72rem', color: '#e9d5ff', fontWeight: 700, background: '#4c1d95', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #7c3aed' }}>
                                ⚡ Auto ({autoRuntimeInfo.episodeCount} ep{autoRuntimeInfo.episodeCount > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            className={styles.inputField}
                            value={runtime}
                            onChange={(e) => {
                              setAutoRuntimeInfo(null);
                              setRuntime(e.target.value ? Math.ceil(Number(e.target.value)) : '');
                            }}
                            placeholder="Auto-calculated from uploaded episodes"
                          />
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                          placeholder="e.g. overflow, overflow-hentai, bonding-ritual"
                          value={aliasesInput}
                          onChange={(e) => setAliasesInput(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: About Wiki & FAQ */}
                  {modalTab === 'about_faq' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                            Structured 4-Part Editorial Wiki
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                            Generates SEO-rich comprehensive editorial background for the public series page
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <select
                            value={aboutModel}
                            onChange={(e) => setAboutModel(e.target.value)}
                            style={{ background: '#181c2b', border: '1px solid #282e44', color: '#f1f5f9', fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderRadius: '6px' }}
                          >
                            <option value="gemini-3.6-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-3.6-pro">Gemini 2.5 Pro</option>
                          </select>

                          <button
                            type="button"
                            disabled={isGeneratingAll || !title}
                            onClick={handleGenerateAllAbout}
                            className={styles.saveBtn}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.78rem' }}
                          >
                            <Sparkles size={14} />
                            <span>{isGeneratingAll ? 'Generating...' : '✨ Generate All 4 Sections'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 Section Editors */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        {[
                          { key: 'overview', title: '1. Story & Setting Overview', desc: 'Narrative context, worldbuilding, and character dynamics.', value: aboutOverview, setter: setAboutOverview, min: 90, max: 130 },
                          { key: 'production', title: '2. Production & Animation Details', desc: 'Animation style, art direction, and release info.', value: aboutProduction, setter: setAboutProduction, min: 60, max: 90 },
                          { key: 'themes', title: '3. Notable Themes & Highlights', desc: 'Key themes, character relationships, and memorable elements.', value: aboutThemes, setter: setAboutThemes, min: 60, max: 90 },
                          { key: 'recommended', title: '4. Recommended For', desc: 'Target audience and related genre appeal.', value: aboutRecommended, setter: setAboutRecommended, min: 50, max: 80 }
                        ].map((sec) => {
                          const wCount = getWordCount(sec.value);
                          const status = getWordCountStatus(wCount, sec.min, sec.max);
                          const isSectionGenerating = !!isGeneratingSection[sec.key];

                          return (
                            <div key={sec.key} style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '10px', padding: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div>
                                  <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>{sec.title}</h5>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>{sec.desc}</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={isSectionGenerating || !title}
                                  onClick={() => handleGenerateSection(sec.key as any, false)}
                                  style={{ background: '#4c1d95', border: '1px solid #7c3aed', color: '#e9d5ff', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                                >
                                  {isSectionGenerating ? 'Generating...' : wCount > 0 ? '↻ Regenerate' : '✨ Generate'}
                                </button>
                              </div>

                              <textarea
                                className={styles.textareaField}
                                value={sec.value}
                                onChange={(e) => sec.setter(e.target.value)}
                                style={{ height: '80px', resize: 'vertical', fontSize: '0.84rem' }}
                                placeholder={`Enter ${sec.title} content...`}
                              />

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                                <span style={{ color: 'var(--foreground-muted)' }}>{wCount} words (Rec: {sec.min}–{sec.max})</span>
                                <span style={{ fontWeight: 800, color: status.color }}>{status.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Custom FAQ Override */}
                      <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>Custom FAQ Overrides (JSON array)</label>
                          <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>Optional custom Q&A items</span>
                        </div>
                        <textarea
                          className={styles.textareaField}
                          placeholder='[{"question": "Where can I watch?", "answer": "Stream in HD on Play Hentai"}]'
                          value={faqOverrideInput}
                          onChange={(e) => setFaqOverrideInput(e.target.value)}
                          style={{ height: '70px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SEO & Google SERP */}
                  {modalTab === 'seo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131722', border: '1px solid #23283b', padding: '0.85rem 1.25rem', borderRadius: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#38bdf8', display: 'block' }}>Google Search Engine Optimization</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>Customize the title and meta description indexed by search bots.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoFillSEO}
                          style={{ background: '#0c4a6e', border: '1px solid #0284c7', color: '#38bdf8', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          ⚡ Auto-Fill SEO Meta
                        </button>
                      </div>

                      <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>SEO Meta Title</label>
                          <span style={{ fontSize: '0.74rem', color: metaTitle.length > 60 ? '#ef4444' : 'var(--foreground-muted)' }}>
                            {metaTitle.length} / 60 chars
                          </span>
                        </div>
                        <input
                          type="text"
                          className={styles.inputField}
                          placeholder={autoTitlePlaceholder}
                          value={metaTitle}
                          onChange={(e) => setMetaTitle(e.target.value)}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ margin: 0 }}>SEO Meta Description</label>
                          <span style={{ fontSize: '0.74rem', color: metaDescription.length > 160 ? '#ef4444' : 'var(--foreground-muted)' }}>
                            {metaDescription.length} / 160 chars
                          </span>
                        </div>
                        <textarea
                          className={styles.textareaField}
                          placeholder={autoDescriptionPlaceholder}
                          value={metaDescription}
                          onChange={(e) => setMetaDescription(e.target.value)}
                          style={{ height: '90px', resize: 'vertical' }}
                        />
                      </div>

                      {/* Google Search Result Preview Card */}
                      <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
                          Live Google Search Result Preview
                        </span>
                        <div style={{ textAlign: 'left', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span>🌐</span>
                            <span style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              https://playhentai.net/series/{slug || 'series-slug'}
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', color: '#58a6ff', lineHeight: '1.2', marginBottom: '4px', fontWeight: 600 }}>
                            {metaTitle || autoTitlePlaceholder}
                          </div>
                          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {metaDescription || autoDescriptionPlaceholder}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Pane: Live Series Card & Completeness Inspector */}
                <div className={styles.modalPreviewPane} style={{ borderLeft: '1px solid #23283b' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', display: 'block' }}>
                    Live Series Card Preview
                  </span>

                  {/* Simulated Series Card */}
                  <div style={{
                    background: '#131722',
                    border: '1px solid #23283b',
                    borderLeft: isPublished ? '4px solid #10b981' : '4px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  }}>
                    {/* Top Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '20px',
                        background: isPublished ? '#064e3b' : '#78350f',
                        color: isPublished ? '#6ee7b7' : '#fcd34d',
                        border: isPublished ? '1px solid #059669' : '1px solid #d97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPublished ? '#10b981' : '#f59e0b' }} />
                        <span>{isPublished ? 'Published' : 'Draft'}</span>
                      </span>

                      <span style={{ textTransform: 'capitalize', fontSize: '0.66rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '10px', background: '#181c2b', color: '#cbd5e1', border: '1px solid #282e44' }}>
                        {status || 'ongoing'}
                      </span>
                    </div>

                    {/* Title & Aliases */}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--foreground-primary)', lineHeight: 1.3 }}>
                        {title || 'Untitled Series'}
                      </h4>
                      {slug && (
                        <code style={{ fontSize: '0.68rem', color: '#a7f3d0' }}>/{slug}</code>
                      )}
                      {(altTitleRomaji || altTitleJapanese) && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>
                          {altTitleRomaji || altTitleJapanese}
                        </div>
                      )}
                    </div>

                    {/* Truncated Synopsis */}
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--foreground-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {description || 'No synopsis added yet...'}
                    </p>

                    {/* Studio, Year & Specs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--foreground-muted)', borderTop: '1px solid #23283b', paddingTop: '0.5rem' }}>
                      <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.62rem', fontWeight: 900, padding: '0.05rem 0.35rem', borderRadius: '3px' }}>HD</span>
                      <span>{studio || 'Studio N/A'}</span>
                      <span>•</span>
                      <span>{releaseYear || 'Year N/A'}</span>
                    </div>

                    {/* Tags preview */}
                    <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                      {tagsInput ? tagsInput.split(',').slice(0, 3).map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: '#181c2b', borderRadius: '4px', color: '#cbd5e1', border: '1px solid #282e44' }}>
                          #{t.trim()}
                        </span>
                      )) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--foreground-muted)', fontStyle: 'italic' }}>No tags selected</span>
                      )}
                    </div>
                  </div>

                  {/* Completeness Meter */}
                  <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>Completeness Score</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {Math.round(
                          ([!!title, !!slug, description.length > 20, !!studio, !!tagsInput, !!releaseYear].filter(Boolean).length / 6) * 100
                        )}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.74rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: title ? '#10b981' : 'var(--foreground-muted)' }}>
                        {title ? '✓' : '○'} Title: {title ? 'Set' : 'Missing'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: slug ? '#10b981' : 'var(--foreground-muted)' }}>
                        {slug ? '✓' : '○'} Slug: {slug ? `/${slug}` : 'Missing'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: description.length > 20 ? '#10b981' : 'var(--foreground-muted)' }}>
                        {description.length > 20 ? '✓' : '○'} Synopsis: {description.length > 20 ? `${description.split(/\s+/).filter(Boolean).length} words` : 'Too short'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: studio ? '#10b981' : 'var(--foreground-muted)' }}>
                        {studio ? '✓' : '○'} Studio: {studio ? studio.split(',')[0] : 'None'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: tagsInput ? '#10b981' : 'var(--foreground-muted)' }}>
                        {tagsInput ? '✓' : '○'} Genres: {tagsInput.split(',').filter(Boolean).length} tags
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: releaseYear ? '#10b981' : 'var(--foreground-muted)' }}>
                        {releaseYear ? '✓' : '○'} Release Year: {releaseYear || 'Not set'}
                      </div>
                    </div>
                  </div>

                  {/* Fast Helper Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleAutoSlug}
                      style={{ background: '#181c2b', border: '1px solid #282e44', color: 'var(--foreground-primary)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Zap size={13} style={{ color: 'var(--primary)' }} />
                      <span>Auto-Generate Slug from Title</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoFillSEO}
                      style={{ background: '#181c2b', border: '1px solid #282e44', color: 'var(--foreground-primary)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Globe size={13} style={{ color: '#38bdf8' }} />
                      <span>Auto-Generate SEO Meta</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Locked Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #23283b', paddingTop: '0.9rem', marginTop: 'auto', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div className={styles.checkboxRow} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <label htmlFor="is_published" style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.88rem', color: isPublished ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {isPublished ? (
                        <>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                          <span>Live Published (Visible in Public Catalog)</span>
                        </>
                      ) : (
                        <>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                          <span>Draft Mode (Hidden from Public Catalog)</span>
                        </>
                      )}
                    </label>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Info size={13} />
                    <span>Press <b>Ctrl+S</b> to save</span>
                  </span>
                </div>

                <div className={styles.modalActions} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setIsPublished(false);
                      setTimeout(() => {
                        const form = document.getElementById('series-crud-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 50);
                    }}
                    style={{
                      background: '#1a1e2f',
                      border: '1px solid #d97706',
                      color: '#fcd34d',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '30px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>💾 Save as Draft</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setIsPublished(true);
                      setTimeout(() => {
                        const form = document.getElementById('series-crud-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 50);
                    }}
                    className={styles.saveBtn}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1.45rem',
                      fontSize: '0.84rem',
                      fontWeight: 800
                    }}
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>{isPublished ? 'Save & Keep Published' : 'Publish Series (Live)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Media Modal */}
      {mediaModalOpen && mediaSeries && (
        <div className={styles.modalOverlay} style={isMediaModalFullscreen ? { padding: 0, zIndex: 99999 } : {}}>
          <div 
            className={styles.modalContent} 
            style={{ 
              width: isMediaModalFullscreen ? '100vw' : '96vw', 
              maxWidth: isMediaModalFullscreen ? '100vw' : '1600px', 
              height: isMediaModalFullscreen ? '100vh' : '92vh', 
              maxHeight: isMediaModalFullscreen ? '100vh' : '94vh', 
              borderRadius: isMediaModalFullscreen ? 0 : '16px',
              border: isMediaModalFullscreen ? 'none' : '1px solid var(--border)',
              padding: isMediaModalFullscreen ? '1.5rem 2.5rem' : '1.5rem 2rem',
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--surface)', 
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                  Manage Series Media
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--foreground-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>
                  {mediaSeries.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMediaModalFullscreen((prev) => !prev)}
                  title={isMediaModalFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isMediaModalFullscreen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border)',
                    color: isMediaModalFullscreen ? '#ffffff' : 'var(--foreground-secondary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isMediaModalFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  <span>{isMediaModalFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseMediaModal}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)', padding: '0.2rem' }}
                  title="Close"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveMedia} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* Left Column: Image Library Upload & Grid */}
                <div style={{ width: isMediaModalFullscreen ? '420px' : '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto', paddingRight: '0.4rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', background: 'rgba(15, 23, 42, 0.35)', padding: '1.2rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                        Uploaded Media Library ({imageLibrary.length})
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Drag or Browse</span>
                    </div>
                    
                    <FileUploader
                      label="Add images to library"
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

                    {/* Select from Episode Thumbnails Button */}
                    <button
                      type="button"
                      onClick={() => setShowEpisodePicker((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        background: showEpisodePicker 
                          ? 'var(--primary)' 
                          : 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Film size={15} />
                      <span>{showEpisodePicker ? 'Hide Episode Picker' : `Import Episode Images (${episodeThumbnails.length})`}</span>
                    </button>

                    {/* Episode Thumbnails Selection Grid */}
                    {showEpisodePicker && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.8rem', background: 'var(--surface)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-light, #c084fc)' }}>
                          Click an episode thumbnail to import into library:
                        </span>
                        {loadingEpisodeThumbs ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', padding: '0.4rem' }}>
                            Fetching episode thumbnails...
                          </div>
                        ) : episodeThumbnails.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '0.5rem' }}>
                            {episodeThumbnails.map((epThumb, idx) => {
                              const isAdded = imageLibrary.includes(epThumb.key);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (!isAdded) {
                                      setImageLibrary((prev) => {
                                        const next = [...prev, epThumb.key];
                                        if (!posterKey) setPosterKey(epThumb.key);
                                        return next;
                                      });
                                    }
                                  }}
                                  style={{
                                    position: 'relative',
                                    aspectRatio: '16/9',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    border: isAdded ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    cursor: isAdded ? 'default' : 'pointer',
                                    opacity: isAdded ? 0.6 : 1,
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`Episode ${epThumb.episodeNumber}: ${epThumb.title}${isAdded ? ' (Already Added)' : ' (Click to Import)'}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(epThumb.key, 'thumbnail')} alt={epThumb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '0.55rem', padding: '1px 3px', borderRadius: '2px', fontWeight: 700 }}>
                                    EP {epThumb.episodeNumber}
                                  </span>
                                  {isAdded && (
                                    <span style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--primary)', color: '#fff', fontSize: '0.55rem', padding: '1px 3px', borderRadius: '2px', fontWeight: 800 }}>
                                      ✓
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', padding: '0.4rem', fontStyle: 'italic' }}>
                            No uploaded episode thumbnails found for this series.
                          </div>
                        )}
                      </div>
                    )}

                    {imageLibrary.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '0.6rem', marginTop: '0.4rem', maxHeight: isMediaModalFullscreen ? '450px' : '320px', overflowY: 'auto', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                        {imageLibrary.map((key, i) => (
                          <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-hover)', overflow: 'hidden' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={getR2Url(key, 'thumbnail')} 
                              alt={`Asset ${i}`} 
                              onClick={() => setLightboxKey(key)}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} 
                              title="Click to view full screen preview"
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
                                top: '4px',
                                right: '4px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                zIndex: 5,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                              }}
                              title="Remove image from library"
                            >
                              <X size={11} />
                            </button>
                            <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.8)', color: '#ffffff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                              #{i + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--foreground-muted)', fontSize: '0.78rem', padding: '2.5rem 1rem', textAlign: 'center' }}>
                        No images uploaded yet. Upload an image or import from episode frames.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Roles Assignment */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem', height: '100%', overflowY: 'auto', paddingRight: '0.6rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.2rem', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--foreground-primary)', letterSpacing: '0.05em' }}>
                        Assign Image Roles
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>Click an image to assign or replace its role</span>
                    </div>

                    {/* Poster Role */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground-primary)', letterSpacing: '0.03em' }}>
                          POSTER ROLE (Card Image - 2:3 Vertical)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {posterKey && !posterSqueeze && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('poster')}
                              style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: 'var(--primary-light, #c084fc)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Adjust Crop ({posterX}%)
                            </button>
                          )}
                          {posterKey && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>✓ Assigned</span>}
                        </div>
                      </div>

                      {posterKey && (
                        <div style={{ display: 'flex', gap: '1.2rem', margin: '0.2rem 0', fontSize: '0.78rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, color: 'var(--foreground-secondary)' }}>
                            <input
                              type="radio"
                              name="poster_fit"
                              checked={!posterSqueeze}
                              onChange={() => setPosterSqueeze(false)}
                              style={{ cursor: 'pointer' }}
                            />
                            Crop (Centered / Draggable)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, color: 'var(--foreground-secondary)' }}>
                            <input
                              type="radio"
                              name="poster_fit"
                              checked={posterSqueeze}
                              onChange={() => setPosterSqueeze(true)}
                              style={{ cursor: 'pointer' }}
                            />
                            Full Image (Squeezed to Fit)
                          </label>
                        </div>
                      )}
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.5rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.3rem 0.2rem 0.6rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = posterKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setPosterKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '85px',
                                    height: '128px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: isSelected ? '3px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'poster')} alt={`Poster Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: isSelected && posterSqueeze ? 'fill' : 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>✓</span>
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
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground-primary)', letterSpacing: '0.03em' }}>
                          COVER ROLE (Landscape - 16:9 Wide)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {coverKey && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('cover')}
                              style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: 'var(--primary-light, #c084fc)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Adjust Crop ({coverY}%)
                            </button>
                          )}
                          {coverKey && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>✓ Assigned</span>}
                        </div>
                      </div>
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.5rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.3rem 0.2rem 0.6rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = coverKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setCoverKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '140px',
                                    height: '79px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: isSelected ? '3px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'cover')} alt={`Cover Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>✓</span>
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
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--foreground-primary)', letterSpacing: '0.03em' }}>
                          BANNER ROLE (Hero Backdrop - 21:9 Ultra-Wide)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {bannerKey && (
                            <button
                              type="button"
                              onClick={() => setActiveCropRole('banner')}
                              style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: 'var(--primary-light, #c084fc)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                              title="Adjust Crop Alignment"
                            >
                              ✏️ Adjust Crop ({bannerY}%)
                            </button>
                          )}
                          {bannerKey && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>✓ Assigned</span>}
                        </div>
                      </div>
                      
                      {imageLibrary.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontStyle: 'italic', padding: '0.5rem' }}>Upload images to library first.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.3rem 0.2rem 0.6rem 0.2rem' }}>
                          {imageLibrary.map((key, i) => {
                            const isSelected = bannerKey === key;
                            return (
                              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setBannerKey(isSelected ? '' : key)}
                                  style={{
                                    position: 'relative',
                                    width: '180px',
                                    height: '77px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: isSelected ? '3px solid var(--primary)' : '1px solid var(--border)',
                                    boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.5)' : 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={getR2Url(key, 'banner')} alt={`Banner Choice ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isSelected && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ color: '#ffffff', background: 'var(--primary)', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>✓</span>
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
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(0,0,0,0.85)',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    cursor: 'zoom-in',
                                    zIndex: 10,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.6)'
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', flexShrink: 0 }}>
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

      {isKeyModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 99999 }}>
          <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0 }}>Manage Gemini API Keys</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', margin: '1.5rem 0' }}>
              
              {/* Stored Keys List */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.6rem' }}>
                  🔑 Stored API Keys ({customKeys.length})
                </label>
                
                {customKeys.length === 0 ? (
                  <div style={{ padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.82rem' }}>
                    No custom keys added yet. Using system environment key by default.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {customKeys.map(k => {
                      const isActive = activeKeyId === k.id;
                      return (
                        <div
                          key={k.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.8rem',
                            border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--surface-hover)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--foreground)' }}>
                              {k.nickname} {isActive && ' (Active)'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                              Key: {k.key.substring(0, 6)}...{k.key.substring(k.key.length - 4)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => handleSelectKey(k.id)}
                                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomKey(k.id)}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Key Form */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--foreground-secondary)', marginBottom: '0.8rem' }}>
                  ➕ Add New Gemini Key
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <input
                      type="text"
                      placeholder="Nickname (e.g. My Flash Key)"
                      className={styles.inputField}
                      value={newKeyNickname}
                      onChange={(e) => setNewKeyNickname(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ margin: 0 }}>
                    <input
                      type="password"
                      placeholder="AIzaSy... Gemini API Key Value"
                      className={styles.inputField}
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddCustomKey}
                    disabled={!newKeyNickname.trim() || !newKeyValue.trim()}
                    className={styles.saveBtn}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: 'white',
                      alignSelf: 'flex-end',
                      padding: '0.45rem 1.2rem',
                      fontSize: '0.8rem',
                      marginTop: '0.2rem'
                    }}
                  >
                    Save & Activate Key
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 0 }}>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className={styles.cancelBtn}
                style={{ width: '100%', textAlign: 'center' }}
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
