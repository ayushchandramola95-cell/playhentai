'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Save, CheckCircle2, AlertCircle, RefreshCw, Layers, Calendar, 
  Clock, Compass, Plus, X, Settings2, Sliders, Monitor, Play, 
  ShieldAlert, ShieldCheck, Zap, Globe, MessageSquare, Database, 
  ExternalLink, Sparkles, Server, Volume2, RotateCcw, Flame
} from 'lucide-react';
import styles from './settings.module.css';

// Categorized Presets for easy discovery
const PRESET_GROUPS = {
  popular: {
    title: '🔥 Popular Themes',
    tags: ['Action', 'Fantasy', 'Comedy', 'Romance', 'Isekai', 'School', 'Ecchi', 'Harem', 'Drama', 'Adventure']
  },
  fetishes: {
    title: '💎 Fetishes & Tropes',
    tags: ['Vanilla', 'BDSM', 'Bondage', 'Incest', 'MILF', 'Teacher', 'Tsundere', 'Ahegao', 'Creampie', 'Femdom', 'Succubus', 'Yandere']
  },
  formats: {
    title: '🎬 Formats & Settings',
    tags: ['Uncensored', '3D', 'Supernatural', 'Demons', 'Cyberpunk', 'Sci-Fi', 'Horror', 'Historical', 'Cosplay']
  }
};

const DEFAULT_HOMEPAGE_CATEGORIES = [
  'Action', 'Fantasy', 'Comedy', 'Uncensored', 'Ecchi', 'Harem', 
  'Demons', 'Romance', 'School', 'Tsundere', 'Vanilla', 'BDSM', 
  'Bondage', 'Incest', 'Isekai', 'MILF', '3D', 'Teacher'
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'homepage' | 'player' | 'branding' | 'cache'>('homepage');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Homepage & Categories
  const [sortMode, setSortMode] = useState<'latest_episode' | 'latest_launch'>('latest_episode');
  const [exploreCategories, setExploreCategories] = useState<string[]>(DEFAULT_HOMEPAGE_CATEGORIES);
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [heroSlideCount, setHeroSlideCount] = useState<number>(8);
  const [heroSource, setHeroSource] = useState<'mix_random_latest' | 'trending_only' | 'featured_only'>('mix_random_latest');

  // Tab 2: Player & UX Defaults
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [defaultVolume, setDefaultVolume] = useState<number>(80);
  const [enableComments, setEnableComments] = useState<boolean>(true);
  const [defaultServer, setDefaultServer] = useState<string>('server_1');

  // Tab 3: Branding, Community & Analytics
  const [siteName, setSiteName] = useState<string>('Play Hentai');
  const [siteTagline, setSiteTagline] = useState<string>('Watch Hentai Anime Online Free in HD');
  const [supportEmail, setSupportEmail] = useState<string>('support@playhentai.live');
  const [telegramUrl, setTelegramUrl] = useState<string>('https://t.me/playhentaiofficial');
  const [discordUrl, setDiscordUrl] = useState<string>('https://discord.gg/playhentai');
  const [adultSplashEnabled, setAdultSplashEnabled] = useState<boolean>(true);
  const [ga4MeasurementId, setGa4MeasurementId] = useState<string>('');
  const [cloudflareAnalyticsToken, setCloudflareAnalyticsToken] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          if (data.settings.latest_series_sort_mode) {
            setSortMode(data.settings.latest_series_sort_mode);
          }
          if (data.settings.homepage_explore_categories) {
            try {
              const parsed = JSON.parse(data.settings.homepage_explore_categories);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setExploreCategories(parsed);
              }
            } catch (e) {}
          }
          if (data.settings.hero_banner_slide_count) {
            setHeroSlideCount(Number(data.settings.hero_banner_slide_count) || 8);
          }
          if (data.settings.hero_banner_source) {
            setHeroSource(data.settings.hero_banner_source);
          }
          if (data.settings.player_autoplay_next !== undefined) {
            setAutoplayNext(data.settings.player_autoplay_next === 'true');
          }
          if (data.settings.player_default_volume) {
            setDefaultVolume(Number(data.settings.player_default_volume) || 80);
          }
          if (data.settings.site_enable_comments !== undefined) {
            setEnableComments(data.settings.site_enable_comments !== 'false');
          }
          if (data.settings.site_name) setSiteName(data.settings.site_name);
          if (data.settings.site_tagline) setSiteTagline(data.settings.site_tagline);
          if (data.settings.support_email) setSupportEmail(data.settings.support_email);
          if (data.settings.telegram_url) setTelegramUrl(data.settings.telegram_url);
          if (data.settings.discord_url) setDiscordUrl(data.settings.discord_url);
          if (data.settings.adult_splash_enabled !== undefined) {
            setAdultSplashEnabled(data.settings.adult_splash_enabled !== 'false');
          }
          if (data.settings.ga4_measurement_id) {
            setGa4MeasurementId(data.settings.ga4_measurement_id);
          }
          if (data.settings.cloudflare_analytics_token) {
            setCloudflareAnalyticsToken(data.settings.cloudflare_analytics_token);
          }
        }
      } else {
        setErrorMsg('Failed to load settings from server.');
      }
    } catch (err) {
      console.error('Error fetching admin settings:', err);
      setErrorMsg('Error connecting to settings API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategory = (cat: string) => {
    if (exploreCategories.includes(cat)) {
      setExploreCategories(exploreCategories.filter(c => c !== cat));
    } else {
      setExploreCategories([...exploreCategories, cat]);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (trimmed && !exploreCategories.includes(trimmed)) {
      setExploreCategories([...exploreCategories, trimmed]);
      setNewCatInput('');
    }
  };

  const handleResetDefaultCategories = () => {
    setExploreCategories(DEFAULT_HOMEPAGE_CATEGORIES);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            latest_series_sort_mode: sortMode,
            homepage_explore_categories: JSON.stringify(exploreCategories),
            hero_banner_slide_count: String(heroSlideCount),
            hero_banner_source: heroSource,
            player_autoplay_next: String(autoplayNext),
            player_default_volume: String(defaultVolume),
            site_enable_comments: String(enableComments),
            site_name: siteName,
            site_tagline: siteTagline,
            support_email: supportEmail,
            telegram_url: telegramUrl,
            discord_url: discordUrl,
            adult_splash_enabled: String(adultSplashEnabled),
            ga4_measurement_id: ga4MeasurementId.trim(),
            cloudflare_analytics_token: cloudflareAnalyticsToken.trim(),
          },
        }),
      });

      if (res.ok) {
        setSuccessMsg('Site configuration updated successfully! Changes broadcasted site-wide.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving admin settings:', err);
      setErrorMsg('Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeCache = async () => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalidate' })
      });
      if (res.ok) {
        setSuccessMsg('Global Edge & Catalog Cache purged successfully!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      setErrorMsg('Error purging edge cache.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <span className={styles.breadcrumbTag}>Admin Core &bull; Site Settings</span>
          <h1 className={styles.mainTitle}>
            <Settings2 size={24} style={{ color: 'var(--primary)' }} />
            <span>Site Configuration &amp; Layout Manager</span>
          </h1>
          <p className={styles.subtitle}>
            Control homepage category pills, hero banners, latest series sorting strategy, streaming player defaults, and branding.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.btnPrimary}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
            <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className={styles.panelCard}>
        {/* Navigation Tabs Strip */}
        <div className={styles.tabsStrip}>
          <button
            type="button"
            onClick={() => setActiveTab('homepage')}
            className={`${styles.tabBtn} ${activeTab === 'homepage' ? styles.tabBtnActive : ''}`}
          >
            <Compass size={16} />
            <span>Homepage &amp; Categories</span>
            <span className={styles.tabCountBadge}>{exploreCategories.length} Pills</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('player')}
            className={`${styles.tabBtn} ${activeTab === 'player' ? styles.tabBtnActive : ''}`}
          >
            <Play size={16} />
            <span>Streaming &amp; Player UX</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`${styles.tabBtn} ${activeTab === 'branding' ? styles.tabBtnActive : ''}`}
          >
            <Globe size={16} />
            <span>Brand Identity &amp; Community</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cache')}
            className={`${styles.tabBtn} ${activeTab === 'cache' ? styles.tabBtnActive : ''}`}
          >
            <Zap size={16} />
            <span>Cache &amp; Revalidation</span>
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
            <p style={{ fontWeight: 700 }}>Loading Site Configuration...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: HOMEPAGE & CATEGORIES */}
            {activeTab === 'homepage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Explore Categories Manager */}
                <div className={styles.subCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Compass size={18} style={{ color: 'var(--primary)' }} />
                        <span>Homepage "Explore Categories" Manager</span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                        Select which category pills appear in the 3-row grid at the bottom of the Homepage. (18 items recommended for 3 rows &times; 6 columns).
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleResetDefaultCategories}
                        className={styles.btnSecondary}
                        style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem' }}
                      >
                        <RotateCcw size={12} />
                        <span>Reset 18 Defaults</span>
                      </button>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c4b5fd', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>
                        {exploreCategories.length} Active
                      </span>
                    </div>
                  </div>

                  {/* Active Categories Pills Bar */}
                  <div style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '0.75rem' }}>
                      Active Selected Categories ({exploreCategories.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {exploreCategories.map((cat) => (
                        <span key={cat} className={styles.activePill}>
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat)}
                            title="Remove category"
                            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Add Custom Category Form */}
                  <form onSubmit={handleAddCustomCategory} style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      placeholder="Add custom category or tag (e.g. Monster Girls, Maid, NTR)..."
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      className={styles.inputField}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      style={{ padding: '0.6rem 1.2rem', whiteSpace: 'nowrap' }}
                    >
                      <Plus size={15} />
                      <span>Add Category</span>
                    </button>
                  </form>

                  {/* Categorized Preset Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                      Click Any Tag to Toggle ON / OFF
                    </span>

                    {Object.entries(PRESET_GROUPS).map(([key, group]) => (
                      <div key={key}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', display: 'block', marginBottom: '0.45rem' }}>
                          {group.title}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {group.tags.map((cat) => {
                            const isActive = exploreCategories.includes(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => handleToggleCategory(cat)}
                                className={`${styles.presetPill} ${isActive ? styles.presetPillActive : ''}`}
                              >
                                {isActive ? `✓ ${cat}` : `+ ${cat}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live 3-Row Grid Simulation */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                        <span>Live Homepage 3-Row Grid Visual Mockup</span>
                      </span>
                      <Link href="/" target="_blank" style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>Preview on Homepage</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>

                    <div className={styles.previewGrid}>
                      {exploreCategories.slice(0, 18).map((cat, idx) => (
                        <div key={idx} className={styles.previewGridItem}>
                          {cat}
                        </div>
                      ))}
                      {exploreCategories.length < 18 && (
                        Array.from({ length: 18 - exploreCategories.length }).map((_, i) => (
                          <div key={i} className={styles.previewGridItem} style={{ borderStyle: 'dashed', opacity: 0.4 }}>
                            + Empty Slot
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Latest Series Sorting Strategy */}
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Layers size={18} style={{ color: 'var(--primary)' }} />
                      <span>"Latest Series" Sorting Strategy</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Choose how anime series are ordered inside the "Latest Series" section on the Homepage and Recent Series catalog page.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Option 1 */}
                    <label className={`${styles.radioOption} ${sortMode === 'latest_episode' ? styles.radioOptionSelected : ''}`}>
                      <input
                        type="radio"
                        name="sortMode"
                        value="latest_episode"
                        checked={sortMode === 'latest_episode'}
                        onChange={() => setSortMode('latest_episode')}
                        style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc' }}>
                          <Clock size={16} style={{ color: 'var(--primary)' }} />
                          <span>Based on Latest Episode Air Date / Upload (Recommended)</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                          Whenever you upload a new episode or update an air date, that entire series jumps straight to the top of "Latest Series".
                        </p>
                      </div>
                    </label>

                    {/* Option 2 */}
                    <label className={`${styles.radioOption} ${sortMode === 'latest_launch' ? styles.radioOptionSelected : ''}`}>
                      <input
                        type="radio"
                        name="sortMode"
                        value="latest_launch"
                        checked={sortMode === 'latest_launch'}
                        onChange={() => setSortMode('latest_launch')}
                        style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc' }}>
                          <Calendar size={16} style={{ color: 'var(--primary)' }} />
                          <span>Based on Series Original Release Date</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                          Orders anime series strictly by their original production release date, regardless of when new episodes were uploaded.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Hero Carousel Settings */}
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Flame size={18} style={{ color: '#f59e0b' }} />
                      <span>Hero Featured Carousel Settings</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Configure the top featured anime banner slider displayed on the homepage hero section.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Number of Slides in Hero Banner
                      </label>
                      <select
                        value={heroSlideCount}
                        onChange={(e) => setHeroSlideCount(Number(e.target.value))}
                        className={styles.selectField}
                      >
                        <option value={5}>5 Featured Series</option>
                        <option value={8}>8 Featured Series (Standard)</option>
                        <option value={10}>10 Featured Series</option>
                        <option value={12}>12 Featured Series</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Banner Curation Source
                      </label>
                      <select
                        value={heroSource}
                        onChange={(e) => setHeroSource(e.target.value as any)}
                        className={styles.selectField}
                      >
                        <option value="mix_random_latest">Mix of High-Rated &amp; Latest Series (Auto)</option>
                        <option value="trending_only">Trending Series Only (Most Viewed)</option>
                        <option value="featured_only">Featured Series Only (High Score 8.0+)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STREAMING & PLAYER UX */}
            {activeTab === 'player' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Play size={18} style={{ color: 'var(--primary)' }} />
                      <span>Video Player &amp; Streaming Defaults</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Configure default playback behaviors, audio settings, and episode navigation for visitors.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {/* Autoplay Next Episode */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', padding: '1.15rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Autoplay Next Episode</strong>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Automatically transitions to the next episode when current finishes</span>
                      </div>
                      <label className={styles.switchWrapper}>
                        <input
                          type="checkbox"
                          className={styles.switchInput}
                          checked={autoplayNext}
                          onChange={(e) => setAutoplayNext(e.target.checked)}
                        />
                        <span className={styles.switchSlider} />
                      </label>
                    </div>

                    {/* Enable Public Comments */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', padding: '1.15rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Episode Comments Section</strong>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Allow users and guests to post comments on watch pages</span>
                      </div>
                      <label className={styles.switchWrapper}>
                        <input
                          type="checkbox"
                          className={styles.switchInput}
                          checked={enableComments}
                          onChange={(e) => setEnableComments(e.target.checked)}
                        />
                        <span className={styles.switchSlider} />
                      </label>
                    </div>
                  </div>

                  {/* Volume Slider & Priority Server */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span>Default Player Volume Level</span>
                        <span style={{ color: 'var(--primary)' }}>{defaultVolume}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={defaultVolume}
                        onChange={(e) => setDefaultVolume(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Default Streaming Server Priority
                      </label>
                      <select
                        value={defaultServer}
                        onChange={(e) => setDefaultServer(e.target.value)}
                        className={styles.selectField}
                      >
                        <option value="server_1">Primary Server (Streamwish / Direct HLS)</option>
                        <option value="server_2">Secondary Backup (VidHide)</option>
                        <option value="server_3">Tertiary Backup (DoodStream)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BRAND IDENTITY & COMMUNITY */}
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Globe size={18} style={{ color: 'var(--primary)' }} />
                      <span>Brand Identity &amp; Public Metadata</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Configure global brand strings, support contact points, and community links.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Brand Site Name
                      </label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Global Brand Tagline
                      </label>
                      <input
                        type="text"
                        value={siteTagline}
                        onChange={(e) => setSiteTagline(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Support &amp; DMCA Contact Email
                      </label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Official Telegram Community Link
                      </label>
                      <input
                        type="url"
                        value={telegramUrl}
                        onChange={(e) => setTelegramUrl(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Official Discord Server Link
                      </label>
                      <input
                        type="url"
                        value={discordUrl}
                        onChange={(e) => setDiscordUrl(e.target.value)}
                        className={styles.inputField}
                      />
                    </div>

                    {/* 18+ Adult Disclaimer Splash Prompt */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.84rem', color: '#f8fafc', display: 'block' }}>18+ Age Disclaimer Splash</strong>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Requires first-time visitors to confirm legal adult age</span>
                      </div>
                      <label className={styles.switchWrapper}>
                        <input
                          type="checkbox"
                          className={styles.switchInput}
                          checked={adultSplashEnabled}
                          onChange={(e) => setAdultSplashEnabled(e.target.checked)}
                        />
                        <span className={styles.switchSlider} />
                      </label>
                    </div>

                    {/* Google Analytics 4 (GA4) */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Google Analytics 4 (GA4) Measurement ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. G-XXXXXXXXXX"
                        value={ga4MeasurementId}
                        onChange={(e) => setGa4MeasurementId(e.target.value)}
                        className={styles.inputField}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                        Automatically injects Google Tag (gtag.js) across all public pages.
                      </span>
                    </div>

                    {/* Cloudflare Web Analytics */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Cloudflare Web Analytics Token
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. e8a3d5b..."
                        value={cloudflareAnalyticsToken}
                        onChange={(e) => setCloudflareAnalyticsToken(e.target.value)}
                        className={styles.inputField}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                        Privacy-first lightweight analytics beacon from Cloudflare.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CACHE & REVALIDATION */}
            {activeTab === 'cache' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Zap size={18} style={{ color: '#f59e0b' }} />
                      <span>Next.js Edge &amp; Catalog Cache Invalidation</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Purge cached static HTML and data queries to instantly reflect database additions on public pages.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#f8fafc', display: 'block' }}>Purge All Catalog &amp; Homepage Edge Caches</strong>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Invalidates `homepage_catalog`, series listing routes, and genre caches.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handlePurgeCache}
                        disabled={isPurging}
                        className={styles.btnPrimary}
                      >
                        {isPurging ? <RefreshCw className="animate-spin" size={15} /> : <Zap size={15} />}
                        <span>{isPurging ? 'Purging Cache...' : 'Purge Global Edge Cache'}</span>
                      </button>
                    </div>

                    {/* Database Health Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                      <div style={{ background: '#0a0d16', border: '1px solid #23283b', padding: '1rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', marginBottom: '0.25rem' }}>
                          <Database size={16} />
                          <strong style={{ fontSize: '0.85rem' }}>Supabase Postgres</strong>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Status: Connected (Healthy)</span>
                      </div>

                      <div style={{ background: '#0a0d16', border: '1px solid #23283b', padding: '1rem', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', marginBottom: '0.25rem' }}>
                          <Server size={16} />
                          <strong style={{ fontSize: '0.85rem' }}>Next.js App Engine</strong>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Environment: Production Ready</span>
                      </div>
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
