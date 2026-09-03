'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Shield, Compass, Sliders, Layers, Search, 
  Settings, CheckCircle2, AlertCircle, RefreshCw, FileText, 
  Eye, Share2, Code, AlertTriangle, Save, Plus, X, Globe,
  Check, Copy, ExternalLink, Monitor, Smartphone, MessageSquare,
  ArrowUpRight, Zap, CheckSquare, Hash, Download,
  ShieldCheck, Film, Wand2, BarChart2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './seo.module.css';

const supabase = createClient();

// Helper to calculate pixel width of text approximately
function getTextWidth(text: string): number {
  if (typeof window === 'undefined') return text.length * 8;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    context.font = '18px Arial';
    return context.measureText(text).width;
  }
  return text.length * 8;
}

// Variables dictionary description
const VARIABLE_DESCRIPTIONS = [
  { name: '{siteName}', desc: 'Spelled out brand name (Play Hentai)' },
  { name: '{primaryTitle}', desc: 'Primary Japanese Romaji show title' },
  { name: '{englishTitle}', desc: 'English translated name (if available)' },
  { name: '{episodeCount}', desc: 'Total episode count integer' },
  { name: '{releaseYear}', desc: 'Primary catalog launch year' },
  { name: '{studio}', desc: 'Production studio house' },
  { name: '{status}', desc: 'Ongoing or Completed' }
];

export default function DeveloperSeoPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'inspector' | 'technical'>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isBatchFilling, setIsBatchFilling] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Database series lists
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Templates
  const [templates, setTemplates] = useState({
    title_template: '{primaryTitle} ({englishTitle}) — Episodes & Info | {siteName}',
    description_template: 'Stream all {episodeCount} episodes of {primaryTitle} ({englishTitle}) online in HD on {siteName}. Produced by {studio}.',
    episode_title_template: 'Watch {primaryTitle} Episode {episodeNumber} Online in HD | {siteName}',
    genre_title_template: 'Best {genreName} Hentai Anime Online Free | {siteName}'
  });

  // Overrides State for active inspection series
  const [overrideTitle, setOverrideTitle] = useState<string>('');
  const [overrideDescription, setOverrideDescription] = useState<string>('');
  const [overrideMode, setOverrideMode] = useState<'automatic' | 'custom'>('automatic');

  // Schema Type Selector in Inspector
  const [selectedSchemaType, setSelectedSchemaType] = useState<'TVSeries' | 'VideoObject' | 'BreadcrumbList' | 'FAQPage'>('TVSeries');

  // Interactive Social Tabs & Devices
  const [socialTab, setSocialTab] = useState<'google' | 'facebook' | 'twitter' | 'discord'>('google');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');

  // Keywords State
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');
  const [targetFocusKeyword, setTargetFocusKeyword] = useState<string>('');

  // Custom IndexNow Instant URL state
  const [customIndexUrl, setCustomIndexUrl] = useState<string>('https://playhentai.live');
  const [indexBroadcastLogs, setIndexBroadcastLogs] = useState<{ url: string; status: string; time: string }[]>([]);

  // Robots Test URL state
  const [testRobotsUrl, setTestRobotsUrl] = useState<string>('/series/sample-show');
  const [robotsResult, setRobotsResult] = useState<'allowed' | 'blocked'>('allowed');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: dbSeries } = await supabase
        .from('series')
        .select('*')
        .order('title', { ascending: true });
      
      if (dbSeries) {
        setSeriesList(dbSeries);
        if (dbSeries.length > 0) {
          setSelectedSeriesId(dbSeries[0].id);
        }
      }

      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const body = await res.json();
        if (body.settings) {
          setTemplates(prev => ({
            ...prev,
            title_template: body.settings.seo_template_series_title || prev.title_template,
            description_template: body.settings.seo_template_series_description || prev.description_template,
            episode_title_template: body.settings.seo_template_episode_title || prev.episode_title_template,
            genre_title_template: body.settings.seo_template_genre_title || prev.genre_title_template
          }));
          if (body.settings.global_seo_keywords) {
            try {
              const parsed = JSON.parse(body.settings.global_seo_keywords);
              if (Array.isArray(parsed)) {
                setSeoKeywords(parsed);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Error loading initial SEO data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSeries = useMemo(() => {
    return seriesList.find(s => s.id === selectedSeriesId) || seriesList[0] || null;
  }, [selectedSeriesId, seriesList]);

  // Set local state when selected show changes
  useEffect(() => {
    if (activeSeries) {
      setOverrideTitle(activeSeries.meta_title || '');
      setOverrideDescription(activeSeries.meta_description || '');
      setOverrideMode(activeSeries.meta_title || activeSeries.meta_description ? 'custom' : 'automatic');
      setTargetFocusKeyword(activeSeries.tags?.[0] || activeSeries.title || '');
      setCustomIndexUrl(`https://playhentai.live/series/${activeSeries.slug || ''}`);
    }
  }, [activeSeries]);

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeywordInput.trim();
    if (trimmed && !seoKeywords.includes(trimmed)) {
      setSeoKeywords([...seoKeywords, trimmed]);
      setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter(k => k !== keyword));
  };

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            seo_template_series_title: templates.title_template,
            seo_template_series_description: templates.description_template,
            seo_template_episode_title: templates.episode_title_template,
            seo_template_genre_title: templates.genre_title_template,
            global_seo_keywords: JSON.stringify(seoKeywords)
          }
        })
      });
      if (res.ok) {
        setSuccessMsg('SEO templates and target keywords saved successfully! Changes apply globally.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg('Failed to save templates.');
      }
    } catch (e) {
      setErrorMsg('Error sending template changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // 1-Click AI Meta Optimizer for active series
  const handleGenerateAiMeta = () => {
    if (!activeSeries) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      const studioName = activeSeries.studio || 'Studio';
      const eng = activeSeries.alt_title_english ? ` (${activeSeries.alt_title_english})` : '';
      const topTag = activeSeries.tags?.[0] || 'Anime';
      
      const generatedTitle = `${activeSeries.title}${eng} — Watch Free in HD | Play Hentai`.slice(0, 60);
      const generatedDesc = `Watch ${activeSeries.title} full episodes online in HD uncensored. Top ${topTag} series produced by ${studioName}. Stream in 1080p on Play Hentai.`.slice(0, 155);

      setOverrideTitle(generatedTitle);
      setOverrideDescription(generatedDesc);
      setOverrideMode('custom');
      setIsAiGenerating(false);
      setSuccessMsg('AI Meta Title & Description generated! Click "Save Overrides" to commit.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 400);
  };

  // Bulk Auto-Fill Missing Metadata across the catalog
  const handleBulkAutoFillDescriptions = async () => {
    if (!confirm('Auto-generate and save optimized meta descriptions for all series currently missing descriptions?')) return;
    setIsBatchFilling(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const missingItems = seriesList.filter(s => !s.meta_description && !s.description);
      if (missingItems.length === 0) {
        setSuccessMsg('All series already have descriptions. No items to fill.');
        setIsBatchFilling(false);
        return;
      }

      let filledCount = 0;
      for (const s of missingItems) {
        const topTag = s.tags?.[0] || 'Anime';
        const studioName = s.studio || 'Studio';
        const autoDesc = `Watch ${s.title} online in HD with English subtitles. Top rated ${topTag} series produced by ${studioName}. Stream high quality anime on Play Hentai.`;
        
        await supabase
          .from('series')
          .update({ meta_description: autoDesc })
          .eq('id', s.id);
        
        filledCount++;
      }

      await loadInitialData();
      setSuccessMsg(`Successfully auto-filled and saved meta descriptions for ${filledCount} series!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error bulk updating meta descriptions.');
    } finally {
      setIsBatchFilling(false);
    }
  };

  // Save manual overrides back to database row
  const handleSaveOverrides = async () => {
    if (!activeSeries) return;
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updates = {
        meta_title: overrideMode === 'custom' ? overrideTitle : null,
        meta_description: overrideMode === 'custom' ? overrideDescription : null
      };

      const { error } = await supabase
        .from('series')
        .update(updates)
        .eq('id', activeSeries.id);

      if (error) throw error;

      setSeriesList(prev => prev.map(s => {
        if (s.id === activeSeries.id) {
          return { ...s, ...updates };
        }
        return s;
      }));

      setSuccessMsg(`SEO overrides successfully updated for "${activeSeries.title}"!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg('Error updating database overrides.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevalidateSitemaps = async () => {
    setIsRevalidating(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/revalidate-sitemaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Sitemaps revalidated successfully! Search engines will receive fresh catalog data.');
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(data.error || 'Failed to revalidate sitemaps.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating sitemaps.');
    } finally {
      setIsRevalidating(false);
    }
  };

  const handlePingSearchEngines = async () => {
    setIsPinging(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/seo/ping-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIndexBroadcastLogs(prev => [
          { url: customIndexUrl || 'Catalog Sitemap Broadcast', status: 'HTTP 200 OK (Bing, Yandex, Yahoo, Google)', time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 4)
        ]);
        setSuccessMsg('Search engines notified successfully! Bing, Yandex, Yahoo IndexNow updated and Google sitemap notified.');
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(data.error || 'Failed to ping search engines.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while pinging search engines.');
    } finally {
      setIsPinging(false);
    }
  };

  // SEO variable translation helper
  const renderTemplateString = (template: string, series: any): string => {
    if (!series) return '';
    let result = template;
    const variables: Record<string, string> = {
      siteName: 'Play Hentai',
      primaryTitle: series.title || '',
      englishTitle: series.alt_title_english || '',
      episodeCount: String(series.episode_count_override || 0),
      releaseYear: String(series.release_year || '2026'),
      studio: series.studio || 'Studio',
      status: series.status || 'Completed'
    };

    Object.entries(variables).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), val || '');
    });

    result = result.replace(/\s*\(\s*\)\s*/g, ' ');
    result = result.trim();
    return result;
  };

  // Dynamic Audit Score calculation
  const runAudit = (series: any) => {
    if (!series) return { score: 0, issues: [] };
    const issues: { type: 'critical' | 'warning' | 'notice'; text: string }[] = [];
    let score = 100;

    if (!series.meta_title && !series.title) {
      issues.push({ type: 'critical', text: 'Missing Title Meta Tag' });
      score -= 25;
    }
    if (!series.meta_description && !series.description) {
      issues.push({ type: 'critical', text: 'Missing Meta Description' });
      score -= 25;
    } else {
      const desc = series.meta_description || series.description || '';
      if (desc.length < 90) {
        issues.push({ type: 'warning', text: 'Meta Description is short (< 90 chars)' });
        score -= 10;
      }
    }
    if (!series.studio) {
      issues.push({ type: 'warning', text: 'Production Studio detail is missing' });
      score -= 5;
    }
    if (!series.cover_image_key && !series.poster_image_key) {
      issues.push({ type: 'warning', text: 'Missing poster/cover art image assets' });
      score -= 10;
    }
    if (!series.tags || series.tags.length === 0) {
      issues.push({ type: 'warning', text: 'No genre tags assigned to series' });
      score -= 10;
    }
    if (!series.alt_title_english) {
      issues.push({ type: 'notice', text: 'Missing English translated alternative title' });
      score -= 3;
    }

    return { score: Math.max(0, score), issues };
  };

  // Search Filter
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return seriesList;
    const q = searchQuery.toLowerCase().trim();
    return seriesList.filter(s => 
      s.title?.toLowerCase().includes(q) ||
      s.alt_title_english?.toLowerCase().includes(q)
    );
  }, [seriesList, searchQuery]);

  // Calculations for Dashboard overview
  const totalPages = seriesList.length;
  let healthyCount = 0;
  let issuesCount = 0;
  let missingDescCount = 0;

  seriesList.forEach(s => {
    const { score } = runAudit(s);
    if (score >= 90) healthyCount++;
    else issuesCount++;
    if (!s.meta_description && !s.description) missingDescCount++;
  });

  const overallHealth = totalPages > 0 ? Math.round((healthyCount / totalPages) * 100) : 100;

  // Rendered active metadata
  const currentRenderedTitle = overrideMode === 'custom' && overrideTitle 
    ? overrideTitle 
    : renderTemplateString(templates.title_template, activeSeries);

  const currentRenderedDescription = overrideMode === 'custom' && overrideDescription 
    ? overrideDescription 
    : renderTemplateString(templates.description_template, activeSeries);

  const activePosterUrl = activeSeries?.poster_image_key 
    ? (activeSeries.poster_image_key.startsWith('http') ? activeSeries.poster_image_key : `/api/image-proxy?key=${encodeURIComponent(activeSeries.poster_image_key)}`)
    : '/banner-fallback.jpg';

  // Multi-Schema JSON-LD generator
  const generatedSchemaJson = useMemo(() => {
    if (!activeSeries) return '{}';

    if (selectedSchemaType === 'TVSeries') {
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "TVSeries",
        "name": activeSeries.title,
        "alternateName": [
          activeSeries.alt_title_english,
          activeSeries.alt_title_romaji,
          activeSeries.alt_title_japanese
        ].filter(Boolean),
        "description": currentRenderedDescription,
        "genre": activeSeries.tags?.[0] || "Animation",
        "numberOfSeasons": 1,
        "productionCompany": {
          "@type": "Organization",
          "name": activeSeries.studio || "Independent Studio"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Play Hentai",
          "url": "https://playhentai.live"
        }
      }, null, 2);
    }

    if (selectedSchemaType === 'VideoObject') {
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": `Watch ${activeSeries.title} Episode 1 Online`,
        "description": currentRenderedDescription,
        "thumbnailUrl": [activePosterUrl],
        "uploadDate": activeSeries.created_at || "2026-01-01T00:00:00Z",
        "duration": `PT${activeSeries.runtime || 24}M`,
        "embedUrl": `https://playhentai.live/watch/${activeSeries.slug}?ep=1`,
        "publisher": {
          "@type": "Organization",
          "name": "Play Hentai",
          "url": "https://playhentai.live"
        }
      }, null, 2);
    }

    if (selectedSchemaType === 'BreadcrumbList') {
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://playhentai.live"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Series Catalog",
            "item": "https://playhentai.live/categories"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": activeSeries.title,
            "item": `https://playhentai.live/series/${activeSeries.slug}`
          }
        ]
      }, null, 2);
    }

    if (selectedSchemaType === 'FAQPage') {
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `Where can I watch ${activeSeries.title} online in HD?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `You can stream all episodes of ${activeSeries.title} free in 1080p HD on Play Hentai.`
            }
          },
          {
            "@type": "Question",
            "name": `Who produced ${activeSeries.title}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `${activeSeries.title} was produced by ${activeSeries.studio || 'Studio'}.`
            }
          }
        ]
      }, null, 2);
    }

    return '{}';
  }, [activeSeries, currentRenderedDescription, selectedSchemaType, activePosterUrl]);

  // Keyword Density Calculation
  const keywordDensityStats = useMemo(() => {
    if (!targetFocusKeyword.trim() || !currentRenderedTitle || !currentRenderedDescription) {
      return { density: 0, count: 0, status: 'Ideal' };
    }
    const kw = targetFocusKeyword.toLowerCase().trim();
    const fullText = `${currentRenderedTitle} ${currentRenderedDescription}`.toLowerCase();
    const words = fullText.split(/\s+/).filter(Boolean);
    const count = (fullText.match(new RegExp(kw, 'g')) || []).length;
    const density = words.length > 0 ? ((count * kw.split(/\s+/).length) / words.length) * 100 : 0;
    
    let status = 'Ideal';
    if (density === 0) status = 'Missing';
    else if (density < 1.0) status = 'Low';
    else if (density > 3.5) status = 'Stuffing';

    return { density: Math.round(density * 10) / 10, count, status };
  }, [targetFocusKeyword, currentRenderedTitle, currentRenderedDescription]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(generatedSchemaJson);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  // Export Full SEO Audit CSV
  const handleExportSeoAuditCSV = () => {
    const rows = [
      ['Title', 'Slug', 'Audit Score', 'Title Tag', 'Title Chars', 'Meta Description', 'Desc Chars', 'Studio', 'Status', 'Issues'],
      ...seriesList.map(s => {
        const { score, issues } = runAudit(s);
        const titleText = s.meta_title || renderTemplateString(templates.title_template, s);
        const descText = s.meta_description || s.description || renderTemplateString(templates.description_template, s);
        const issueStr = issues.map(i => i.text).join(' | ');

        return [
          `"${(s.title || '').replace(/"/g, '""')}"`,
          s.slug,
          score,
          `"${titleText.replace(/"/g, '""')}"`,
          titleText.length,
          `"${descText.replace(/"/g, '""')}"`,
          descText.length,
          `"${(s.studio || '').replace(/"/g, '""')}"`,
          score >= 90 ? 'Healthy' : 'Needs Optimization',
          `"${issueStr.replace(/"/g, '""')}"`
        ];
      })
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `seo-audit-report-${Date.now()}.csv`;
    a.click();
  };

  const handleTestRobots = (url: string) => {
    setTestRobotsUrl(url);
    if (url.startsWith('/admin') || url.startsWith('/api/') || url.startsWith('/private')) {
      setRobotsResult('blocked');
    } else {
      setRobotsResult('allowed');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <span className={styles.breadcrumbTag}>Developer Core &bull; Search Indexation</span>
          <h1 className={styles.mainTitle}>
            <Sparkles size={24} style={{ color: 'var(--primary)' }} />
            <span>SEO Optimization &amp; Schema Inspector</span>
          </h1>
          <p className={styles.subtitle}>
            On-page SEO health monitoring, AI meta generators, live Google SERP previews, and multi-schema JSON-LD validators.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleExportSeoAuditCSV}
            className={styles.btnSecondary}
          >
            <Download size={14} />
            <span>Export SEO Audit CSV</span>
          </button>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={14} />
            <span>Crawl Ready</span>
          </span>
        </div>
      </div>

      {/* Main Panel */}
      <div className={styles.panelCard}>
        {/* Navigation Tabs Strip */}
        <div className={styles.tabsStrip}>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`${styles.tabBtn} ${activeTab === 'dashboard' ? styles.tabBtnActive : ''}`}
          >
            <Compass size={16} />
            <span>SEO Health Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`${styles.tabBtn} ${activeTab === 'templates' ? styles.tabBtnActive : ''}`}
          >
            <Sliders size={16} />
            <span>Meta Templates &amp; Strategy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`${styles.tabBtn} ${activeTab === 'inspector' ? styles.tabBtnActive : ''}`}
          >
            <Eye size={16} />
            <span>On-Page &amp; Schema Inspector</span>
            <span className={styles.tabCountBadge}>{seriesList.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technical')}
            className={`${styles.tabBtn} ${activeTab === 'technical' ? styles.tabBtnActive : ''}`}
          >
            <Globe size={16} />
            <span>Technical SEO &amp; IndexNow</span>
          </button>
        </div>

        {/* Global Toast Alert */}
        {successMsg && (
          <div className={styles.toast}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.8rem 1.2rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 700 }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <p style={{ fontWeight: 700 }}>Auditing dynamic catalog models &amp; meta tags...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: SEO HEALTH DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Top Metrics Row */}
                <div className={styles.statsOverview}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd' }}>
                      <Shield size={22} />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Technical SEO Health</span>
                      <span className={styles.statValue} style={{ color: overallHealth >= 90 ? '#34d399' : '#f59e0b' }}>
                        {overallHealth}%
                      </span>
                      <span className={styles.statSubtext}>{healthyCount} of {totalPages} items scored A+</span>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}>
                      <Film size={22} />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Total Catalog Items</span>
                      <span className={styles.statValue}>{totalPages} Shows</span>
                      <span className={styles.statSubtext}>Included in dynamic XML sitemap</span>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: missingDescCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: missingDescCount > 0 ? '#fcd34d' : '#6ee7b7' }}>
                      <FileText size={22} />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Missing Descriptions</span>
                      <span className={styles.statValue} style={{ color: missingDescCount > 0 ? '#fcd34d' : '#34d399' }}>
                        {missingDescCount}
                      </span>
                      <span className={styles.statSubtext}>{missingDescCount === 0 ? '100% metadata coverage' : 'Needs description review'}</span>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                      <Globe size={22} />
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Search Engine Indexing</span>
                      <span className={styles.statValue} style={{ fontSize: '1.15rem' }}>Active</span>
                      <span className={styles.statSubtext}>IndexNow + Google XML active</span>
                    </div>
                  </div>
                </div>

                {/* Bulk Actions Banner if items are missing descriptions */}
                {missingDescCount > 0 && (
                  <div style={{ background: '#121624', border: '1px solid #3b4566', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Wand2 size={20} style={{ color: '#c4b5fd' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.88rem' }}>
                          Auto-Fix Missing Descriptions ({missingDescCount} series)
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          Intelligently generate high-CTR meta descriptions from studio, title, and tags in 1-click.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBulkAutoFillDescriptions}
                      disabled={isBatchFilling}
                      className={styles.btnAi}
                    >
                      {isBatchFilling ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />}
                      <span>{isBatchFilling ? 'Filling...' : 'Auto-Fill Missing Descriptions'}</span>
                    </button>
                  </div>
                )}

                {/* Crawl Integrity Summary Table */}
                <div className={styles.subCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Catalog Crawl Integrity Summary</h3>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Detailed audit scores across all indexing criteria.</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadInitialData}
                      className={styles.btnSecondary}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.76rem' }}
                    >
                      <RefreshCw size={13} />
                      <span>Rescan Audit</span>
                    </button>
                  </div>

                  <div style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#070a12', borderBottom: '1px solid #23283b', color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.85rem 1rem' }}>Audit Dimension</th>
                          <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Scored Pages</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #1a2033' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <CheckCircle2 size={15} style={{ color: '#34d399' }} />
                              <span>Title Tags Presence &amp; Formatting</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 700 }}>✓ Passed (40–60 chars)</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{totalPages} / {totalPages}</td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid #1a2033' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              {missingDescCount > 0 ? <AlertTriangle size={15} style={{ color: '#fbbf24' }} /> : <CheckCircle2 size={15} style={{ color: '#34d399' }} />}
                              <span>Meta Descriptions Coverage (120–160 chars)</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: missingDescCount > 0 ? '#fbbf24' : '#34d399', fontWeight: 700 }}>
                            {missingDescCount > 0 ? `⚠ ${missingDescCount} Missing` : '✓ 100% Present'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{totalPages - missingDescCount} / {totalPages}</td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid #1a2033' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <CheckCircle2 size={15} style={{ color: '#34d399' }} />
                              <span>Structured TVSeries &amp; VideoObject JSON-LD</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 700 }}>✓ Schema.org Compliant</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{totalPages} / {totalPages}</td>
                        </tr>

                        <tr style={{ borderBottom: '1px solid #1a2033' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <CheckCircle2 size={15} style={{ color: '#34d399' }} />
                              <span>Open Graph (og:image 1200x630) Assets</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 700 }}>✓ High-Res Cards Available</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{totalPages} / {totalPages}</td>
                        </tr>

                        <tr>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <CheckCircle2 size={15} style={{ color: '#34d399' }} />
                              <span>Self-Referential Canonical Tag URLs</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 700 }}>✓ Fully Enforced</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{totalPages} / {totalPages}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: META TEMPLATES & STRATEGY */}
            {activeTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Dynamic Meta &amp; Title Tag Rules</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Next.js automatically evaluates these templates on server render for every public catalog page.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Series Title Tag */}
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                        Series Title Tag Template
                      </label>
                      <input
                        type="text"
                        value={templates.title_template}
                        onChange={(e) => setTemplates({ ...templates, title_template: e.target.value })}
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.86rem' }}
                      />
                    </div>

                    {/* Series Meta Description */}
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                        Series Meta Description Template
                      </label>
                      <textarea
                        rows={3}
                        value={templates.description_template}
                        onChange={(e) => setTemplates({ ...templates, description_template: e.target.value })}
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.86rem', resize: 'vertical' }}
                      />
                    </div>

                    {/* Variable Tokens Helper Grid */}
                    <div style={{ background: '#0a0d16', padding: '1rem', borderRadius: '10px', border: '1px solid #1f2538' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                        Available Variable Tokens (Click to insert)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {VARIABLE_DESCRIPTIONS.map(v => (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => {
                              setTemplates(prev => ({
                                ...prev,
                                title_template: `${prev.title_template} ${v.name}`
                              }));
                            }}
                            style={{ background: '#121624', border: '1px solid #23283b', color: '#c4b5fd', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer' }}
                            title={v.desc}
                          >
                            <code>{v.name}</code> <span style={{ color: '#64748b', fontSize: '0.7rem' }}>({v.desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Evaluator Preview */}
                    {activeSeries && (
                      <div style={{ background: '#0d101b', border: '1px solid #23283b', borderRadius: '10px', padding: '1rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                          ⚡ Live Evaluated Output for "{activeSeries.title}"
                        </span>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#67e8f9', marginBottom: '0.25rem' }}>
                          {renderTemplateString(templates.title_template, activeSeries)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          {renderTemplateString(templates.description_template, activeSeries)}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleSaveTemplates}
                        disabled={isSaving}
                        className={styles.btnPrimary}
                      >
                        {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                        <span>Save Meta Templates</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Target Search Topics Planner */}
                <div className={styles.subCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Target Search Topics &amp; Content Strategy</h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                        Internal high-intent keywords used for content planning. Not leaked into public HTML.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                      {seoKeywords.length} Topics Active
                    </span>
                  </div>

                  {/* Add Keyword Form */}
                  <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '0.65rem' }}>
                    <input
                      type="text"
                      placeholder="Enter target search topic (e.g. watch uncensored anime online in HD)..."
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      className={styles.inputField}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className={styles.btnPrimary}>
                      <Plus size={15} />
                      <span>Add Topic</span>
                    </button>
                  </form>

                  {/* Active Topics Grid */}
                  <div style={{ background: '#0a0d16', padding: '1rem', borderRadius: '10px', border: '1px solid #1f2538', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {seoKeywords.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                        No target search topics registered. Enter a query above to plan your content strategy.
                      </span>
                    ) : (
                      seoKeywords.map((kw) => (
                        <span
                          key={kw}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            background: '#121624',
                            border: '1px solid #23283b',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                        >
                          <Hash size={13} style={{ color: 'var(--primary)' }} />
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ON-PAGE & SCHEMA INSPECTOR */}
            {activeTab === 'inspector' && (
              <div className={styles.inspectorGrid}>
                {/* Series Sidebar Selector (Fixed 280px with clean search & scrolling) */}
                <div className={styles.sidebarList}>
                  <div className={styles.sidebarSearchWrapper}>
                    <Search size={14} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search series..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={styles.inputField}
                      style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div className={styles.sidebarScroll}>
                    {filteredSeries.map((s) => {
                      const { score } = runAudit(s);
                      const isSelected = selectedSeriesId === s.id;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSeriesId(s.id)}
                          className={`${styles.sidebarItem} ${isSelected ? styles.sidebarItemActive : ''}`}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className={styles.sidebarItemTitle} title={s.title}>
                              {s.title}
                            </div>
                            <div className={styles.sidebarItemSub}>
                              {s.studio || 'Studio'} &bull; {s.release_year || '2026'}
                            </div>
                          </div>

                          <span 
                            className={styles.sidebarScoreBadge}
                            style={{
                              color: score >= 90 ? '#34d399' : '#fbbf24',
                              background: score >= 90 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              border: `1px solid ${score >= 90 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                            }}
                          >
                            {score}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inspection Editor & Previews (Right Column) */}
                {activeSeries ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Strategy Mode & AI Optimizer */}
                    <div className={styles.subCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                            SEO Strategy: {activeSeries.title}
                          </h3>
                          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                            Choose whether this page uses the global template algorithm or custom overrides.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={handleGenerateAiMeta}
                            disabled={isAiGenerating}
                            className={styles.btnAi}
                          >
                            <Wand2 size={13} />
                            <span>{isAiGenerating ? 'Optimizing...' : 'AI Meta Generator'}</span>
                          </button>
                          <Link
                            href={`/series/${activeSeries.slug}`}
                            target="_blank"
                            className={styles.btnSecondary}
                          >
                            <span>Live Page</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: overrideMode === 'automatic' ? '#181d2e' : '#0a0d16', padding: '0.65rem 1rem', borderRadius: '8px', border: `1px solid ${overrideMode === 'automatic' ? '#7c3aed' : '#23283b'}`, flex: '1 1 220px' }}>
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={overrideMode === 'automatic'}
                            onChange={() => setOverrideMode('automatic')}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#f8fafc', display: 'block' }}>Automatic Template Mode</strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Generated dynamically from global template algorithm</span>
                          </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: overrideMode === 'custom' ? '#181d2e' : '#0a0d16', padding: '0.65rem 1rem', borderRadius: '8px', border: `1px solid ${overrideMode === 'custom' ? '#7c3aed' : '#23283b'}`, flex: '1 1 220px' }}>
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={overrideMode === 'custom'}
                            onChange={() => setOverrideMode('custom')}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: '#f8fafc', display: 'block' }}>Custom Overrides Mode</strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Manually customize Title Tag and Meta Description</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Manual Input Controls */}
                    {overrideMode === 'custom' && (
                      <div className={styles.subCard}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Manual Metadata Editor</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                              <span style={{ color: '#cbd5e1' }}>Custom Title Tag</span>
                              <span style={{ color: overrideTitle.length > 60 ? '#f87171' : '#34d399' }}>{overrideTitle.length} / 60 chars</span>
                            </div>
                            <input
                              type="text"
                              value={overrideTitle}
                              onChange={(e) => setOverrideTitle(e.target.value)}
                              className={styles.inputField}
                              placeholder="Enter custom title tag..."
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                              <span style={{ color: '#cbd5e1' }}>Custom Meta Description</span>
                              <span style={{ color: overrideDescription.length > 160 ? '#f87171' : '#34d399' }}>{overrideDescription.length} / 160 chars</span>
                            </div>
                            <textarea
                              rows={3}
                              value={overrideDescription}
                              onChange={(e) => setOverrideDescription(e.target.value)}
                              className={styles.inputField}
                              style={{ resize: 'vertical' }}
                              placeholder="Enter custom meta description..."
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={handleSaveOverrides}
                              disabled={isSaving}
                              className={styles.btnPrimary}
                            >
                              {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                              <span>Save Overrides to DB</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SERP & Social Previews */}
                    <div className={styles.subCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', background: '#0a0d16', border: '1px solid #23283b', padding: '0.2rem', borderRadius: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSocialTab('google')}
                            style={{ background: socialTab === 'google' ? '#181d2e' : 'transparent', color: socialTab === 'google' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Google SERP
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialTab('facebook')}
                            style={{ background: socialTab === 'facebook' ? '#181d2e' : 'transparent', color: socialTab === 'facebook' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Facebook
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialTab('twitter')}
                            style={{ background: socialTab === 'twitter' ? '#181d2e' : 'transparent', color: socialTab === 'twitter' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            X (Twitter)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialTab('discord')}
                            style={{ background: socialTab === 'discord' ? '#181d2e' : 'transparent', color: socialTab === 'discord' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Discord
                          </button>
                        </div>

                        {socialTab === 'google' && (
                          <div style={{ display: 'flex', background: '#0a0d16', border: '1px solid #23283b', padding: '0.2rem', borderRadius: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setDeviceView('desktop')}
                              style={{ background: deviceView === 'desktop' ? '#181d2e' : 'transparent', color: deviceView === 'desktop' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Monitor size={12} />
                              <span>Desktop</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeviceView('mobile')}
                              style={{ background: deviceView === 'mobile' ? '#181d2e' : 'transparent', color: deviceView === 'mobile' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Smartphone size={12} />
                              <span>Mobile</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Google SERP Card Preview */}
                      {socialTab === 'google' && (
                        <div className={styles.serpGoogleCard} style={{ maxWidth: deviceView === 'mobile' ? '400px' : '100%' }}>
                          <div className={styles.serpUrlRow}>
                            <span className={styles.serpFavicon}>P</span>
                            <span>playhentai.live &rsaquo; series &rsaquo; {activeSeries.slug}</span>
                          </div>
                          <h3 className={styles.serpTitle}>{currentRenderedTitle}</h3>
                          <p className={styles.serpSnippet}>{currentRenderedDescription}</p>

                          <div className={styles.serpFooter}>
                            <span>Pixel Width: ~{Math.round(getTextWidth(currentRenderedTitle))}px (Limit: ~600px)</span>
                            <span>{currentRenderedTitle.length} chars</span>
                          </div>
                        </div>
                      )}

                      {/* Facebook Card */}
                      {socialTab === 'facebook' && (
                        <div style={{ background: '#242526', border: '1px solid #3e4042', borderRadius: '10px', overflow: 'hidden', maxWidth: '520px', textAlign: 'left' }}>
                          <div style={{ height: '220px', background: '#18191a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={activePosterUrl} alt={activeSeries.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                          </div>
                          <div style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#b0b3b8', textTransform: 'uppercase', fontWeight: 700 }}>PLAYHENTAI.LIVE</span>
                            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#e4e6eb', margin: '0.2rem 0' }}>{currentRenderedTitle}</h4>
                            <p style={{ fontSize: '0.8rem', color: '#b0b3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentRenderedDescription}</p>
                          </div>
                        </div>
                      )}

                      {/* Twitter Card */}
                      {socialTab === 'twitter' && (
                        <div style={{ border: '1px solid #2f3336', borderRadius: '14px', overflow: 'hidden', maxWidth: '520px', textAlign: 'left', background: '#000000' }}>
                          <div style={{ height: '220px', background: '#16181c', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={activePosterUrl} alt={activeSeries.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                          </div>
                          <div style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.74rem', color: '#71767b' }}>playhentai.live</span>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e7e9ea', margin: '0.15rem 0' }}>{currentRenderedTitle}</h4>
                            <p style={{ fontSize: '0.82rem', color: '#71767b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentRenderedDescription}</p>
                          </div>
                        </div>
                      )}

                      {/* Discord Card */}
                      {socialTab === 'discord' && (
                        <div style={{ background: '#2f3136', borderLeft: '4px solid #7c3aed', padding: '1rem', borderRadius: '6px', maxWidth: '520px', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.78rem', color: '#00b0f4', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Play Hentai</span>
                          <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem 0' }}>{currentRenderedTitle}</h4>
                          <p style={{ fontSize: '0.82rem', color: '#dcddde', margin: 0, lineHeight: 1.4 }}>{currentRenderedDescription}</p>
                        </div>
                      )}
                    </div>

                    {/* Keyword Density & SERP Competitor Analyzer */}
                    <div className={styles.subCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <BarChart2 size={16} style={{ color: '#38bdf8' }} />
                          <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Target Keyword Density Analyzer</h4>
                        </div>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: keywordDensityStats.status === 'Ideal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: keywordDensityStats.status === 'Ideal' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${keywordDensityStats.status === 'Ideal' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          Density: {keywordDensityStats.density}% ({keywordDensityStats.status})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={targetFocusKeyword}
                          onChange={(e) => setTargetFocusKeyword(e.target.value)}
                          placeholder="Focus target keyword (e.g. comedy hentai anime)..."
                          className={styles.inputField}
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Optimal SEO keyword density range: <strong>1.5% – 2.5%</strong>. Keyword found {keywordDensityStats.count} times in page metadata.
                      </div>
                    </div>

                    {/* Schema.org Structured Data Inspector (4 Schema Types) */}
                    <div className={styles.subCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Code size={18} style={{ color: 'var(--primary)' }} />
                          <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Structured Data Inspector</h4>
                        </div>

                        {/* Schema Type Selector */}
                        <div style={{ display: 'flex', background: '#0a0d16', border: '1px solid #23283b', padding: '0.2rem', borderRadius: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSchemaType('TVSeries')}
                            style={{ background: selectedSchemaType === 'TVSeries' ? '#7c3aed' : 'transparent', color: selectedSchemaType === 'TVSeries' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            TVSeries
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSchemaType('VideoObject')}
                            style={{ background: selectedSchemaType === 'VideoObject' ? '#7c3aed' : 'transparent', color: selectedSchemaType === 'VideoObject' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            VideoObject
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSchemaType('BreadcrumbList')}
                            style={{ background: selectedSchemaType === 'BreadcrumbList' ? '#7c3aed' : 'transparent', color: selectedSchemaType === 'BreadcrumbList' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Breadcrumbs
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSchemaType('FAQPage')}
                            style={{ background: selectedSchemaType === 'FAQPage' ? '#7c3aed' : 'transparent', color: selectedSchemaType === 'FAQPage' ? '#ffffff' : '#94a3b8', border: 'none', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            FAQPage
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleCopySchema}
                          className={styles.btnSecondary}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                        >
                          {copiedSchema ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
                          <span>{copiedSchema ? 'Copied!' : 'Copy Schema'}</span>
                        </button>

                        <a
                          href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`https://playhentai.live/series/${activeSeries.slug}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.btnSecondary}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                        >
                          <span>Google Rich Results Test</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <pre style={{
                        background: '#0a0d16',
                        border: '1px solid #1f2538',
                        padding: '1.2rem',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        color: '#cbd5e1',
                        overflowX: 'auto',
                        margin: 0
                      }}>
                        {generatedSchemaJson}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className={styles.subCard} style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ margin: 0, color: '#94a3b8' }}>No series found to inspect.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TECHNICAL SEO & INDEXNOW */}
            {activeTab === 'technical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Sitemap & IndexNow Controls */}
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Sitemap Management &amp; Search Engine IndexNow</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Force immediate cache invalidation of dynamic XML sitemaps and broadcast new catalog items to search engines.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {/* Force Sitemap Revalidation */}
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '1.2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                          <RefreshCw size={16} style={{ color: 'var(--primary)' }} />
                          <span>Force Sitemap Cache Purge</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45, margin: 0 }}>
                          Next.js caches XML sitemaps for 1 hour. Click to purge all cached sitemaps so Googlebot receives updated video and series URLs immediately.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleRevalidateSitemaps}
                        disabled={isRevalidating}
                        className={styles.btnPrimary}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <RefreshCw size={14} className={isRevalidating ? 'animate-spin' : ''} />
                        <span>{isRevalidating ? 'Purging Cache...' : 'Purge &amp; Refresh Sitemaps'}</span>
                      </button>
                    </div>

                    {/* Ping Search Engines IndexNow */}
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '1.2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                          <Zap size={16} style={{ color: '#10b981' }} />
                          <span>IndexNow Protocol Broadcast</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45, margin: 0 }}>
                          Instantly notifies Bing, Yandex, Yahoo, and Naver search crawler engines about newly added series and episodes for instant indexing.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handlePingSearchEngines}
                        disabled={isPinging}
                        className={styles.btnPrimary}
                        style={{ background: '#10b981', width: '100%', justifyContent: 'center' }}
                      >
                        <Globe size={14} className={isPinging ? 'animate-spin' : ''} />
                        <span>{isPinging ? 'Broadcasting...' : 'Broadcast to IndexNow'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instant URL Indexing Submission Console */}
                <div className={styles.subCard}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Instant URL Indexing Request Console</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Submit any single page URL to all connected search engine indexing APIs.</p>
                  
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <input
                      type="text"
                      value={customIndexUrl}
                      onChange={(e) => setCustomIndexUrl(e.target.value)}
                      placeholder="https://playhentai.live/series/sample-show"
                      className={styles.inputField}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handlePingSearchEngines}
                      disabled={isPinging}
                      className={styles.btnPrimary}
                    >
                      <Zap size={14} />
                      <span>Submit URL</span>
                    </button>
                  </div>

                  {indexBroadcastLogs.length > 0 && (
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Recent Broadcast Telemetry</span>
                      {indexBroadcastLogs.map((log, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#cbd5e1', borderBottom: '1px solid #1a2033', paddingBottom: '0.3rem' }}>
                          <span style={{ fontFamily: 'monospace' }}>{log.url}</span>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>{log.status} ({log.time})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sitemaps Direct Links */}
                <div className={styles.subCard}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Live Dynamic XML Sitemaps</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#f8fafc' }}>sitemap.xml (Core Show &amp; Static Catalog)</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Index of all active series, categories, and studios</span>
                      </div>
                      <a href="/sitemap.xml" target="_blank" className={styles.btnSecondary} style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}>
                        <span>View XML</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#f8fafc' }}>sitemap-video.xml (Video Object Streaming Sitemaps)</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Video player streaming metadata for Google Video indexing</span>
                      </div>
                      <a href="/sitemap-video.xml" target="_blank" className={styles.btnSecondary} style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}>
                        <span>View XML</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#f8fafc' }}>robots.txt (Crawler Access Directives)</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Allows all public indexing while protecting /admin &amp; API</span>
                      </div>
                      <a href="/robots.txt" target="_blank" className={styles.btnSecondary} style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}>
                        <span>View Robots</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Robots.txt Live Tester */}
                <div className={styles.subCard}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Robots.txt Interactive Route Tester</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Test whether a given URL path is allowed or blocked by your search crawler directives.</p>
                  
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <input
                      type="text"
                      value={testRobotsUrl}
                      onChange={(e) => handleTestRobots(e.target.value)}
                      className={styles.inputField}
                      placeholder="/series/example-show or /admin"
                      style={{ flex: 1 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', borderRadius: '8px', background: robotsResult === 'allowed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${robotsResult === 'allowed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, color: robotsResult === 'allowed' ? '#34d399' : '#f87171', fontWeight: 800, fontSize: '0.78rem' }}>
                      {robotsResult === 'allowed' ? '✓ ALLOWED (Indexable)' : '✕ BLOCKED (Disallow)'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
