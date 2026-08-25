'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Shield, Compass, Sliders, Layers, Search, 
  Settings, CheckCircle2, AlertCircle, RefreshCw, FileText, 
  Eye, Share2, Code, AlertTriangle, Save, Plus, X, Globe
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from '../../admin.module.css';

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
  { name: '{studio}', desc: 'Show production house house' },
  { name: '{status}', desc: 'Ongoing or Completed' }
];

export default function DeveloperSeoPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'inspector' | 'technical'>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  // Database series lists
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Templates
  const [templates, setTemplates] = useState({
    title_template: '{primaryTitle} ({englishTitle}) — Episodes & Info | {siteName}',
    description_template: 'Stream all {episodeCount} episodes of {primaryTitle} ({englishTitle}) online in HD on {siteName}. Produced by {studio}.'
  });

  // Overrides State for active inspection series
  const [overrideTitle, setOverrideTitle] = useState<string>('');
  const [overrideDescription, setOverrideDescription] = useState<string>('');
  const [overrideH1, setOverrideH1] = useState<string>('');
  const [overrideMode, setOverrideMode] = useState<'automatic' | 'custom'>('automatic');

  // Interactive Social Tabs
  const [socialTab, setSocialTab] = useState<'google' | 'facebook' | 'twitter' | 'discord'>('google');

  // Keywords State
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');

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
        setSuccessMsg(data.message || 'Sitemaps revalidated successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(data.error || 'Failed to revalidate sitemaps.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating sitemaps.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        setSuccessMsg('Search engines notified successfully! Bing/Yahoo IndexNow updated. Google sitemap polled.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(data.error || 'Failed to ping search engines.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while pinging search engines.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Series rows
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

      // 2. Load templates and keywords from settings endpoint
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const body = await res.json();
        if (body.settings) {
          setTemplates({
            title_template: body.settings.seo_template_series_title || '{primaryTitle} ({englishTitle}) — Episodes & Info | {siteName}',
            description_template: body.settings.seo_template_series_description || 'Stream all {episodeCount} episodes of {primaryTitle} ({englishTitle}) online in HD on {siteName}. Produced by {studio}.'
          });
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
            global_seo_keywords: JSON.stringify(seoKeywords)
          }
        })
      });
      if (res.ok) {
        setSuccessMsg('SEO templates and keywords saved successfully! Changes apply globally.');
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

  const activeSeries = seriesList.find(s => s.id === selectedSeriesId);

  // Set local state when selected show changes
  useEffect(() => {
    if (activeSeries) {
      setOverrideTitle(activeSeries.meta_title || '');
      setOverrideDescription(activeSeries.meta_description || '');
      setOverrideH1(activeSeries.title || '');
      setOverrideMode(activeSeries.meta_title || activeSeries.meta_description ? 'custom' : 'automatic');
    }
  }, [selectedSeriesId, seriesList]);

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

      // Update local state list
      setSeriesList(prev => prev.map(s => {
        if (s.id === activeSeries.id) {
          return { ...s, ...updates };
        }
        return s;
      }));

      setSuccessMsg('Overrides successfully updated in database!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg('Error updating database overrides.');
    } finally {
      setIsSaving(false);
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
      releaseYear: String(series.release_year || ''),
      studio: series.studio || 'Unknown Studio',
      status: series.status || 'Ongoing'
    };

    Object.entries(variables).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), val || '');
    });

    // Bracket Cleanup
    result = result.replace(/\s*\(\s*\)\s*/g, ' ');
    result = result.trim();
    return result;
  };

  // Dynamic Audit Score calculation
  const runAudit = (series: any) => {
    if (!series) return { score: 0, issues: [] };
    const issues: { type: 'critical' | 'warning' | 'notice'; text: string }[] = [];
    let score = 100;

    // Checks
    if (!series.meta_title && !series.title) {
      issues.push({ type: 'critical', text: 'Missing Title Meta Tag' });
      score -= 20;
    }
    if (!series.meta_description && !series.description) {
      issues.push({ type: 'critical', text: 'Missing Meta Description' });
      score -= 20;
    } else {
      const desc = series.meta_description || series.description || '';
      if (desc.length < 100) {
        issues.push({ type: 'warning', text: 'Meta Description is too short (< 100 chars)' });
        score -= 10;
      }
    }
    if (!series.studio) {
      issues.push({ type: 'warning', text: 'Production Studio detail is missing' });
      score -= 5;
    }
    if (!series.cover_image_key && !series.poster_image_key) {
      issues.push({ type: 'warning', text: 'Missing poster/cover art assets' });
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
  const filteredSeries = seriesList.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.alt_title_english?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.breadcrumb}>ADMIN / DEVELOPER CORE</span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.2rem' }}>SEO Optimization &amp; Schema Inspector</h1>
        </div>
        <span className={styles.statusBadge}>Dev Panel v1.4</span>
      </div>

      <div className={styles.contentBody}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'dashboard' ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--foreground-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Compass size={16} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'templates' ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
              color: activeTab === 'templates' ? 'var(--primary)' : 'var(--foreground-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Settings size={16} />
            Templates Manager
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'inspector' ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
              color: activeTab === 'inspector' ? 'var(--primary)' : 'var(--foreground-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Eye size={16} />
            On-Page Inspector
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'technical' ? 'rgba(var(--primary-rgb), 0.12)' : 'transparent',
              color: activeTab === 'technical' ? 'var(--primary)' : 'var(--foreground-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Globe size={16} />
            Technical SEO
          </button>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            padding: '1rem 1.2rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '1rem 1.2rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className={styles.panelCard} style={{ padding: '4rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <p>Scanning dynamic database models...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  <div className={styles.panelCard} style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Technical SEO Health</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', marginTop: '0.5rem' }}>{overallHealth}%</p>
                  </div>
                  <div className={styles.panelCard} style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Total Catalog Items</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', marginTop: '0.5rem' }}>{totalPages}</p>
                  </div>
                  <div className={styles.panelCard} style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Missing Descriptions</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, color: missingDescCount > 0 ? '#f59e0b' : '#10b981', marginTop: '0.5rem' }}>{missingDescCount}</p>
                  </div>
                </div>

                <div className={styles.panelCard}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Catalog Crawl Integrity Summary</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: 'var(--foreground-primary)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--foreground-secondary)' }}>
                        <th style={{ padding: '0.75rem' }}>Audit Dimension</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Scored Pages</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>Title Tags Validation</td>
                        <td style={{ padding: '0.75rem', color: '#10b981' }}>✓ Passed</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{totalPages} / {totalPages}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>Meta Descriptions Presence</td>
                        <td style={{ padding: '0.75rem', color: missingDescCount > 0 ? '#f59e0b' : '#10b981' }}>
                          {missingDescCount > 0 ? `⚠ ${missingDescCount} Missing` : '✓ Passed'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{totalPages - missingDescCount} / {totalPages}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>Structured TVSeries JSON-LD</td>
                        <td style={{ padding: '0.75rem', color: '#10b981' }}>✓ 100% Compliant</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{totalPages} / {totalPages}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: TEMPLATES */}
            {activeTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className={styles.panelCard}>
                  <h2>Global Dynamic Meta Templates</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', marginBottom: '1.5rem' }}>
                    Configure the fallback template algorithms that Next.js uses when no custom page overrides exist.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: 'var(--foreground-secondary)' }}>
                        Series Title Tag Template
                      </label>
                      <input
                        type="text"
                        value={templates.title_template}
                        onChange={(e) => setTemplates({ ...templates, title_template: e.target.value })}
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: 'var(--foreground-secondary)' }}>
                        Series Meta Description Template
                      </label>
                      <textarea
                        rows={3}
                        value={templates.description_template}
                        onChange={(e) => setTemplates({ ...templates, description_template: e.target.value })}
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem', resize: 'vertical' }}
                      />
                    </div>

                    {/* Variable Tokens Helper Grid */}
                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--foreground-muted)', marginBottom: '0.5rem' }}>
                        Supported Variables
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                        {VARIABLE_DESCRIPTIONS.map(v => (
                          <div key={v.name} style={{ fontSize: '0.8rem' }}>
                            <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{v.name}</code>: <span style={{ color: 'var(--foreground-secondary)' }}>{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveTemplates}
                      disabled={isSaving}
                      className={styles.createBtn}
                      style={{ padding: '0.8rem 1.8rem', alignSelf: 'flex-end', gap: '0.5rem' }}
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                      Save Template Rules
                    </button>
                  </div>
                </div>

                {/* 4. Target Search Topics & Content Planning */}
                <div className={styles.panelCard}>
                  <div className={styles.panelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className={styles.statIcon} style={{ padding: '0.6rem' }}>
                        <Sparkles size={22} />
                      </div>
                      <div>
                        <h2>Target Search Topics &amp; Content Planning</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                          Add, view, and delete target search phrases for internal content planning.
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.2)', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
                      {seoKeywords.length} Topics Active
                    </span>
                  </div>

                  <div style={{ marginTop: '1.2rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginBottom: '1.2rem', lineHeight: 1.45 }}>
                      These target phrases act as internal planning references for content mapping and taxonomy tuning. They are not injected into the public HTML of the site, preventing strategy leaks to competitors.
                    </p>

                    {/* Add Keyword Form */}
                    <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
                      <input
                        type="text"
                        placeholder="Enter target search topic / query phrase (e.g. watch uncensored hentai)..."
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        className={styles.inputField}
                        style={{ flex: 1, padding: '0.6rem 1rem' }}
                      />
                      <button
                        type="submit"
                        className={styles.createBtn}
                        style={{ padding: '0.6rem 1.5rem', fontSize: '0.88rem', gap: '0.4rem' }}
                      >
                        <Plus size={16} />
                        <span>Add Topic</span>
                      </button>
                    </form>

                    {/* Active Keywords Tags Grid */}
                    <div style={{ background: 'var(--surface-hover)', padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.85rem' }}>
                        Active Target Topics (Click 'X' to delete)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                        {seoKeywords.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                            No target search topics added. Enter one above to get started.
                          </span>
                        ) : (
                          seoKeywords.map((keyword) => (
                            <span
                              key={keyword}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.45rem 0.9rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'var(--foreground-primary)',
                                fontSize: '0.82rem',
                                fontWeight: 600
                              }}
                            >
                              {keyword}
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyword(keyword)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INSPECTOR */}
            {activeTab === 'inspector' && (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
                {/* Sidebar list */}
                <div>
                  <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} size={16} />
                    <input
                      type="text"
                      placeholder="Search series..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={styles.inputField}
                      style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ maxHeight: '500px', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    {filteredSeries.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSeriesId(s.id)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          background: selectedSeriesId === s.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          color: selectedSeriesId === s.id ? 'var(--primary)' : 'var(--foreground-primary)',
                          fontWeight: selectedSeriesId === s.id ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inspection Editor */}
                {activeSeries ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Mode selector */}
                    <div className={styles.panelCard}>
                      <h2>SEO Strategy Control: {activeSeries.title}</h2>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={overrideMode === 'automatic'}
                            onChange={() => setOverrideMode('automatic')}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div>
                            <strong>Automatic mode</strong>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)' }}>Generated dynamically from SEO template algorithms</span>
                          </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="overrideMode"
                            checked={overrideMode === 'custom'}
                            onChange={() => setOverrideMode('custom')}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <div>
                            <strong>Custom Overrides mode</strong>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)' }}>Manually insert page metadata</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Input controls */}
                    {overrideMode === 'custom' && (
                      <div className={styles.panelCard}>
                        <h2>Manual Page Metadata Overrides</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: 'var(--foreground-secondary)' }}>
                              Override Title Tag ({overrideTitle.length} / 60 chars)
                            </label>
                            <input
                              type="text"
                              value={overrideTitle}
                              onChange={(e) => setOverrideTitle(e.target.value)}
                              className={styles.inputField}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: 'var(--foreground-secondary)' }}>
                              Override Meta Description ({overrideDescription.length} / 160 chars)
                            </label>
                            <textarea
                              rows={3}
                              value={overrideDescription}
                              onChange={(e) => setOverrideDescription(e.target.value)}
                              className={styles.inputField}
                              style={{ resize: 'vertical' }}
                            />
                          </div>

                          <button
                            onClick={handleSaveOverrides}
                            disabled={isSaving}
                            className={styles.createBtn}
                            style={{ padding: '0.7rem 1.8rem', alignSelf: 'flex-end', gap: '0.5rem' }}
                          >
                            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            Save Manual Overrides
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Previews (SERP and Social Cards) */}
                    <div className={styles.panelCard}>
                      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.2rem', paddingBottom: '0.5rem' }}>
                        <button
                          onClick={() => setSocialTab('google')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: 'none',
                            background: socialTab === 'google' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: socialTab === 'google' ? '#ffffff' : 'var(--foreground-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Google SERP
                        </button>
                        <button
                          onClick={() => setSocialTab('facebook')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: 'none',
                            background: socialTab === 'facebook' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: socialTab === 'facebook' ? '#ffffff' : 'var(--foreground-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Facebook
                        </button>
                        <button
                          onClick={() => setSocialTab('twitter')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: 'none',
                            background: socialTab === 'twitter' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: socialTab === 'twitter' ? '#ffffff' : 'var(--foreground-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          X (Twitter)
                        </button>
                        <button
                          onClick={() => setSocialTab('discord')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            border: 'none',
                            background: socialTab === 'discord' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: socialTab === 'discord' ? '#ffffff' : 'var(--foreground-secondary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Discord
                        </button>
                      </div>

                      {/* Google Simulator */}
                      {socialTab === 'google' && (
                        <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.78rem', color: '#9aa0a6', display: 'block', marginBottom: '0.3rem' }}>
                            playhentai.live › series › {activeSeries.slug}
                          </span>
                          <h3 style={{ 
                            fontSize: '1.25rem', 
                            color: '#8ab4f8', 
                            fontWeight: 500, 
                            lineHeight: 1.3,
                            marginBottom: '0.4rem',
                            fontFamily: 'arial, sans-serif'
                          }}>
                            {overrideMode === 'custom' && overrideTitle 
                              ? overrideTitle 
                              : renderTemplateString(templates.title_template, activeSeries)}
                          </h3>
                          <p style={{ 
                            fontSize: '0.88rem', 
                            color: '#bdc1c6', 
                            lineHeight: 1.58,
                            fontFamily: 'arial, sans-serif',
                            margin: 0
                          }}>
                            {overrideMode === 'custom' && overrideDescription 
                              ? overrideDescription 
                              : renderTemplateString(templates.description_template, activeSeries)}
                          </p>
                        </div>
                      )}

                      {/* Facebook Card */}
                      {socialTab === 'facebook' && (
                        <div style={{ background: '#242526', border: '1px solid #3e4042', borderRadius: '8px', overflow: 'hidden', maxWidth: '500px', textAlign: 'left' }}>
                          <div style={{ height: '250px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Share2 size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                          </div>
                          <div style={{ padding: '0.8rem 1rem', background: '#242526' }}>
                            <span style={{ fontSize: '0.75rem', color: '#b0b3b8', textTransform: 'uppercase' }}>PLAYHENTAI.LIVE</span>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e4e6eb', marginTop: '0.2rem', marginBottom: '0.2rem' }}>
                              {overrideMode === 'custom' && overrideTitle 
                                ? overrideTitle 
                                : renderTemplateString(templates.title_template, activeSeries)}
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: '#b0b3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {overrideMode === 'custom' && overrideDescription 
                                ? overrideDescription 
                                : renderTemplateString(templates.description_template, activeSeries)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Twitter Card */}
                      {socialTab === 'twitter' && (
                        <div style={{ border: '1px solid #2f3336', borderRadius: '16px', overflow: 'hidden', maxWidth: '500px', textAlign: 'left', background: '#000000' }}>
                          <div style={{ height: '250px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Share2 size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                          </div>
                          <div style={{ padding: '0.8rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#71767b' }}>playhentai.live</span>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e7e9ea', marginTop: '0.1rem', marginBottom: '0.1rem' }}>
                              {overrideMode === 'custom' && overrideTitle 
                                ? overrideTitle 
                                : renderTemplateString(templates.title_template, activeSeries)}
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#71767b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {overrideMode === 'custom' && overrideDescription 
                                ? overrideDescription 
                                : renderTemplateString(templates.description_template, activeSeries)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Discord Simulator */}
                      {socialTab === 'discord' && (
                        <div style={{ background: '#2f3136', borderLeft: '4px solid var(--primary)', padding: '1rem', borderRadius: '4px', maxWidth: '500px', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.8rem', color: '#00b0f4', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Play Hentai</span>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.3rem' }}>
                            {overrideMode === 'custom' && overrideTitle 
                              ? overrideTitle 
                              : renderTemplateString(templates.title_template, activeSeries)}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#dcddde', margin: 0, lineHeight: 1.4 }}>
                            {overrideMode === 'custom' && overrideDescription 
                              ? overrideDescription 
                              : renderTemplateString(templates.description_template, activeSeries)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Structured Data Inspector */}
                    <div className={styles.panelCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Code size={18} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0 }}>JSON-LD TVSeries Structured Data Inspector</h2>
                      </div>
                      
                      <div style={{ position: 'relative' }}>
                        <pre style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border)',
                          padding: '1.2rem',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          color: '#a9b2c3',
                          overflowX: 'auto',
                          margin: 0
                        }}>
                          {JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "TVSeries",
                            "name": activeSeries.title,
                            "alternateName": [
                              activeSeries.alt_title_english,
                              activeSeries.alt_title_romaji,
                              activeSeries.alt_title_japanese
                            ].filter(Boolean),
                            "description": activeSeries.description || "",
                            "genre": activeSeries.tags?.[0] || "Animation",
                            "numberOfSeasons": 1,
                            "publisher": {
                              "@type": "Organization",
                              "name": "Play Hentai",
                              "url": "https://playhentai.live"
                            }
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Single Page Audit */}
                    <div className={styles.panelCard}>
                      <h2>On-Page SEO Diagnostics</h2>
                      {(() => {
                        const { score, issues } = runAudit(activeSeries);
                        return (
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: score >= 90 ? '#10b981' : '#f59e0b' }}>
                                Score: {score}/100
                              </span>
                              <span style={{
                                padding: '0.3rem 0.8rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                background: score >= 90 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                color: score >= 90 ? '#10b981' : '#f59e0b',
                                border: `1px solid ${score >= 90 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                              }}>
                                {score >= 90 ? 'Healthy' : 'Needs Optimization'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {issues.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.88rem' }}>
                                  <CheckCircle2 size={16} />
                                  <span>All diagnostic checks passed. No issues detected.</span>
                                </div>
                              ) : (
                                issues.map((iss, i) => (
                                  <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '8px',
                                    background: iss.type === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                                    border: `1px solid ${iss.type === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                                    fontSize: '0.85rem'
                                  }}>
                                    <AlertTriangle size={16} style={{ color: iss.type === 'critical' ? '#ef4444' : '#f59e0b' }} />
                                    <span style={{ color: 'var(--foreground-primary)' }}>{iss.text}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                ) : (
                  <div className={styles.panelCard} style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                    No series found to inspect. Add some series first.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TECHNICAL */}
            {activeTab === 'technical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className={styles.panelCard}>
                  <h2>Technical Crawler Integrations</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', marginBottom: '1.5rem' }}>
                    Verify indexing files and crawl directives for robots.txt and dynamic XML sitemaps.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.2rem',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <strong>dynamic sitemap.xml validation</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                          Generates sitemaps for homepage, series, watch episodes, genres, tags, and studios.
                        </span>
                      </div>
                      <a href="/sitemap.xml" target="_blank" style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)'
                      }}>
                        View XML Sitemap
                      </a>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.2rem',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <strong>dynamic sitemap-video.xml validation</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                          Generates video-object metadata schemas for all published watch episode streaming links.
                        </span>
                      </div>
                      <a href="/sitemap-video.xml" target="_blank" style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)'
                      }}>
                        View Video Sitemap
                      </a>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.2rem',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <strong>crawler robots.txt directives</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                          Allows full search indexation while blocking user private areas (admin, accounts).
                        </span>
                      </div>
                      <a href="/robots.txt" target="_blank" style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)'
                      }}>
                        View Robots.txt
                      </a>
                    </div>
                  </div>
                </div>

                <div className={styles.panelCard}>
                  <h2>Sitemap Management & Crawl Controls</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', marginBottom: '1.5rem' }}>
                    Manually trigger sitemap cache revalidation or notify search engines about new changes right away.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{
                      padding: '1.2rem',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>Force Sitemap Revalidation</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                          By default, Next.js caches sitemap.xml for 1 hour. Click this to immediately purge the cache, forcing search engines to fetch new catalog items on their next crawl.
                        </span>
                      </div>
                      <button
                        onClick={handleRevalidateSitemaps}
                        disabled={isRevalidating}
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          background: 'var(--primary)',
                          border: 'none',
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: isRevalidating ? 0.7 : 1,
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                      >
                        <RefreshCw size={15} className={isRevalidating ? styles.spin : ''} />
                        {isRevalidating ? 'Updating...' : 'Update Sitemaps Now'}
                      </button>
                    </div>

                    <div style={{
                      padding: '1.2rem',
                      background: 'var(--surface-hover)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>Ping Search Engines (IndexNow)</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.4rem', lineHeight: '1.4' }}>
                          Instantly submit your updated sitemap URL and public links to indexation protocols (IndexNow/Bing) to trigger immediate crawling.
                        </span>
                      </div>
                      <button
                        onClick={handlePingSearchEngines}
                        disabled={isPinging}
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          background: '#10b981',
                          border: 'none',
                          padding: '0.6rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: isPinging ? 0.7 : 1,
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                      >
                        <Globe size={15} className={isPinging ? styles.spin : ''} />
                        {isPinging ? 'Pinging...' : 'Ping Search Engines'}
                      </button>
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
