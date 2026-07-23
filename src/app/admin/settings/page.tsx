'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, RefreshCw, Layers, Calendar, Clock, Tv, Shuffle, Sparkles, Sliders, Compass, Plus, X } from 'lucide-react';
import styles from '../admin.module.css';

const PRESET_CATEGORIES = [
  'Action', 'Sci-Fi', 'Fantasy', 'Adventure', 'Comedy', 'Drama', 
  'Mystery', 'Thriller', 'Uncensored', 'Ecchi', 'Harem', 'Supernatural', 
  'Demons', 'Historical', 'Romance', 'School', 'Tsundere', 'Vanilla',
  'Ahegao', 'BDSM', 'Blowjob', 'Bondage', 'Cosplay', 'Creampie', 'Cyberpunk',
  'Femdom', 'Glasses', 'Horror', 'Idol', 'Incest', 'Isekai', 'Maid', 'Mecha',
  'MILF', 'Mind Control', 'Monster', 'Neko', 'Nurse', 'Paizuri', 'Psychological',
  'Succubus', 'Super Power', 'Teacher', 'Tentacle', 'Toys', 'Yandere', '3D'
];

const DEFAULT_HOMEPAGE_CATEGORIES = [
  'Action', 'Sci-Fi', 'Fantasy', 'Adventure', 'Comedy', 'Drama', 
  'Mystery', 'Thriller', 'Uncensored', 'Ecchi', 'Harem', 'Supernatural', 
  'Demons', 'Historical', 'Romance', 'School', 'Tsundere', 'Vanilla'
];

export default function AdminSettingsPage() {
  const [sortMode, setSortMode] = useState<'latest_episode' | 'latest_launch'>('latest_episode');
  const [bannerSource, setBannerSource] = useState<string>('featured_tags');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [exploreCategories, setExploreCategories] = useState<string[]>(DEFAULT_HOMEPAGE_CATEGORIES);
  const [newCatInput, setNewCatInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          if (data.settings.hero_banner_source) {
            setBannerSource(data.settings.hero_banner_source);
          }
          if (data.settings.hero_banner_slide_count) {
            const count = parseInt(data.settings.hero_banner_slide_count, 10);
            if (!isNaN(count) && count > 0) {
              setSlideCount(count);
            }
          }
          if (data.settings.homepage_explore_categories) {
            try {
              const parsed = JSON.parse(data.settings.homepage_explore_categories);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setExploreCategories(parsed);
              }
            } catch (e) {}
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
            hero_banner_source: bannerSource,
            hero_banner_slide_count: String(slideCount),
            homepage_explore_categories: JSON.stringify(exploreCategories),
          },
        }),
      });

      if (res.ok) {
        setSuccessMsg('Site settings updated successfully! Changes will take effect immediately on the homepage.');
        setTimeout(() => setSuccessMsg(null), 5000);
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

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.breadcrumb}>ADMIN / SITE SETTINGS</span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.2rem' }}>Site Configuration</h1>
        </div>
        <span className={styles.statusBadge}>Live Control</span>
      </div>

      <div className={styles.contentBody} style={{ maxWidth: '850px' }}>
        {/* Success Alert */}
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

        {/* Error Alert */}
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
          <div className={styles.panelCard} style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
            <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 0.8rem auto' }} />
            <p>Loading current site configuration...</p>
          </div>
        ) : (
          <>
            {/* 1. Hero Carousel Banner Configuration */}
            <div className={styles.panelCard} style={{ marginBottom: '2rem' }}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.statIcon} style={{ padding: '0.6rem' }}>
                    <Tv size={22} />
                  </div>
                  <div>
                    <h2>Hero Banner Carousel Controls</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                      Configure content selection logic and slide count limit for the homepage Hero Banner.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.2rem' }}>
                {/* Banner Content Source Selection */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-secondary)', display: 'block', marginBottom: '0.8rem' }}>
                    Banner Selection Source Mode
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.85rem' }}>
                    {/* Source 1: Featured Tags (Manual) */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'featured_tags' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'featured_tags' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="featured_tags"
                        checked={bannerSource === 'featured_tags'}
                        onChange={() => setBannerSource('featured_tags')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sparkles size={15} style={{ color: 'var(--primary)' }} />
                          <span>Manual Featured Tags (Default)</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Uses series assigned with <code>featured:1</code>, <code>featured:2</code> tags in the Hero Carousel Admin.
                        </p>
                      </div>
                    </label>

                    {/* Source 2: Latest Series */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'latest_series' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'latest_series' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="latest_series"
                        checked={bannerSource === 'latest_series'}
                        onChange={() => setBannerSource('latest_series')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={15} style={{ color: 'var(--primary)' }} />
                          <span>Latest Series Releases</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Automatically features the newest series added to the site.
                        </p>
                      </div>
                    </label>

                    {/* Source 3: Latest Episode Releases */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'latest_episodes' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'latest_episodes' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="latest_episodes"
                        checked={bannerSource === 'latest_episodes'}
                        onChange={() => setBannerSource('latest_episodes')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={15} style={{ color: 'var(--primary)' }} />
                          <span>Latest Episode Updates</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Features series with the most recent episode release dates.
                        </p>
                      </div>
                    </label>

                    {/* Source 4: Mix of Latest Series & Episodes */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'mix_latest' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'mix_latest' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="mix_latest"
                        checked={bannerSource === 'mix_latest'}
                        onChange={() => setBannerSource('mix_latest')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Layers size={15} style={{ color: 'var(--primary)' }} />
                          <span>Mix of Latest Series & Episodes</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Interleaves newly added series and recently updated episode series.
                        </p>
                      </div>
                    </label>

                    {/* Source 5: Random Selection */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'random' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'random' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="random"
                        checked={bannerSource === 'random'}
                        onChange={() => setBannerSource('random')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Shuffle size={15} style={{ color: 'var(--primary)' }} />
                          <span>Random Selection</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Randomly selects active series from your catalog for fresh banner rotation.
                        </p>
                      </div>
                    </label>

                    {/* Source 6: Mix of Random & Latest */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: bannerSource === 'mix_random_latest' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                      border: `2px solid ${bannerSource === 'mix_random_latest' ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="radio"
                        name="bannerSource"
                        value="mix_random_latest"
                        checked={bannerSource === 'mix_random_latest'}
                        onChange={() => setBannerSource('mix_random_latest')}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--primary)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sliders size={15} style={{ color: 'var(--primary)' }} />
                          <span>Mix of Random & Latest</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                          Combines latest releases with random surprise titles.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Banner Slide Count Control */}
                <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1.2rem 1.5rem', borderRadius: '14px', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'block' }}>
                        Maximum Banner Slide Limit
                      </label>
                      <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                        Set how many series items rotate in the Hero Banner (between 1 and 15 slides).
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setSlideCount(prev => Math.max(1, prev - 1))}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--foreground-primary)',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={slideCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setSlideCount(Math.min(15, Math.max(1, val)));
                        }}
                        className={styles.inputField}
                        style={{ width: '70px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, padding: '0.4rem' }}
                      />

                      <button
                        type="button"
                        onClick={() => setSlideCount(prev => Math.min(15, prev + 1))}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--foreground-primary)',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Homepage Explore Categories Manager (3-Row Grid) */}
            <div className={styles.panelCard} style={{ marginBottom: '2rem' }}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.statIcon} style={{ padding: '0.6rem' }}>
                    <Compass size={22} />
                  </div>
                  <div>
                    <h2>Homepage "Explore Categories" Manager</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                      Select which category pills appear in the 3-row "Explore Categories" section at the bottom of the Homepage.
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.2)', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
                  {exploreCategories.length} Categories Active
                </span>
              </div>

              <div style={{ marginTop: '1.2rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  Toggle preset categories below or add custom tags to customize the homepage grid. (18 items fit nicely into 3 rows of 6 columns).
                </p>

                {/* Selected Active Categories Pills */}
                <div style={{ marginBottom: '1.5rem', background: 'var(--surface-hover)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-muted)', display: 'block', marginBottom: '0.75rem' }}>
                    Active Homepage Categories ({exploreCategories.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {exploreCategories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          background: 'var(--primary)',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: 0 }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Add Custom Category Form */}
                <form onSubmit={handleAddCustomCategory} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Add custom category or tag..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className={styles.inputField}
                    style={{ flex: 1, padding: '0.6rem 1rem' }}
                  />
                  <button
                    type="submit"
                    className={styles.createBtn}
                    style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem', gap: '0.4rem' }}
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Preset Categories List */}
                <div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                    Available Category Presets
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PRESET_CATEGORIES.map((cat) => {
                      const isActive = exploreCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(var(--primary-rgb), 0.15)' : 'var(--surface-hover)',
                            border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                            color: isActive ? 'var(--primary)' : 'var(--foreground-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isActive ? `✓ ${cat}` : `+ ${cat}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Sorting Settings Card */}
            <div className={styles.panelCard} style={{ marginBottom: '2rem' }}>
              <div className={styles.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.statIcon} style={{ padding: '0.6rem' }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <h2>"Latest Series" Sorting Strategy</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
                      Choose how series are ordered in the "Latest Series" section on the Homepage and Recent Series catalog page.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.2rem' }}>
                {/* Option 1: Latest Episode Air Date */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    background: sortMode === 'latest_episode' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                    border: `2px solid ${sortMode === 'latest_episode' ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="sortMode"
                    value="latest_episode"
                    checked={sortMode === 'latest_episode'}
                    onChange={() => setSortMode('latest_episode')}
                    style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
                      <Clock size={16} style={{ color: 'var(--primary)' }} />
                      <span>Based on Latest Episode Air Date / Upload (Default)</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                      Whenever you upload or set a new episode release date for a series, that entire series moves to the top of "Latest Series".
                    </p>
                  </div>
                </label>

                {/* Option 2: Latest Launch Date */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    background: sortMode === 'latest_launch' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                    border: `2px solid ${sortMode === 'latest_launch' ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="sortMode"
                    value="latest_launch"
                    checked={sortMode === 'latest_launch'}
                    onChange={() => setSortMode('latest_launch')}
                    style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
                      <Calendar size={16} style={{ color: 'var(--primary)' }} />
                      <span>Based on Series Original Release / Creation Date</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                      Orders series strictly by the series' own Release Date or Creation Date.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Bottom Floating/Sticky Save Action Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '1.2rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              marginBottom: '2rem'
            }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={styles.createBtn}
                style={{ padding: '0.8rem 2.2rem', fontSize: '1rem', gap: '0.6rem' }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save All Settings
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
