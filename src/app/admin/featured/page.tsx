'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Tv, 
  Search, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Sparkles,
  Calendar,
  Clock,
  Layers,
  Shuffle,
  Sliders,
  Check,
  Eye,
  Star,
  Monitor,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Play,
  Flame,
  Zap,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './featured.module.css';

interface Series {
  id: string;
  title: string;
  slug: string;
  poster_image_key: string;
  cover_image_key?: string;
  banner_image_key?: string;
  image_library?: any[];
  synopsis?: string;
  tags: string[];
  is_published: boolean;
  views?: number;
  rating?: number;
  studio?: string;
}

type FilterTab = 'all' | 'has_banner' | 'uncensored' | '3d';
type ViewportMode = 'desktop' | 'mobile';

export default function AdminFeaturedPage() {
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [bannerSource, setBannerSource] = useState<string>('featured_tags');
  const [slideCount, setSlideCount] = useState<number>(8);
  const [autoplaySpeed, setAutoplaySpeed] = useState<number>(6000);
  const [taglines, setTaglines] = useState<Record<string, string>>({});

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [selectedStudio, setSelectedStudio] = useState<string>('all');

  // Preview Simulator states
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [previewIndex, setPreviewIndex] = useState(0);

  // Status & loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFeaturedConfig();
  }, []);

  const fetchFeaturedConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [featRes, setRes] = await Promise.all([
        fetch('/api/admin/featured'),
        fetch('/api/admin/settings')
      ]);

      if (!featRes.ok) throw new Error('Failed to load featured series configuration');
      const featData = await featRes.json();
      setAllSeries(featData.series || []);
      setFeaturedIds(featData.featured || []);

      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.settings) {
          if (setData.settings.hero_banner_source) {
            setBannerSource(setData.settings.hero_banner_source);
          }
          if (setData.settings.hero_banner_slide_count) {
            const count = parseInt(setData.settings.hero_banner_slide_count, 10);
            if (!isNaN(count) && count > 0) setSlideCount(count);
          }
          if (setData.settings.hero_banner_autoplay_speed) {
            const speed = parseInt(setData.settings.hero_banner_autoplay_speed, 10);
            if (!isNaN(speed)) setAutoplaySpeed(speed);
          }
          if (setData.settings.hero_banner_taglines) {
            try {
              const parsed = typeof setData.settings.hero_banner_taglines === 'string'
                ? JSON.parse(setData.settings.hero_banner_taglines)
                : setData.settings.hero_banner_taglines;
              if (parsed && typeof parsed === 'object') setTaglines(parsed);
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const [featRes, setRes] = await Promise.all([
        fetch('/api/admin/featured', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seriesIds: featuredIds }),
        }),
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              hero_banner_source: bannerSource,
              hero_banner_slide_count: String(slideCount),
              hero_banner_autoplay_speed: String(autoplaySpeed),
              hero_banner_taglines: JSON.stringify(taglines),
            }
          }),
        })
      ]);

      if (!featRes.ok) {
        const err = await featRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save featured series order');
      }
      if (!setRes.ok) {
        const err = await setRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save banner carousel settings');
      }

      setMessage({ type: 'success', text: 'Hero Carousel settings, rotation order, and taglines saved successfully!' });
      setTimeout(() => setMessage(null), 5000);
      fetchFeaturedConfig();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (id: string) => {
    if (!featuredIds.includes(id)) {
      setFeaturedIds([...featuredIds, id]);
    }
  };

  const handleRemove = (id: string) => {
    setFeaturedIds(featuredIds.filter((fid) => fid !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...featuredIds];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setFeaturedIds(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === featuredIds.length - 1) return;
    const newList = [...featuredIds];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setFeaturedIds(newList);
  };

  // Smart Sorting Actions
  const handleSortByViews = () => {
    const listWithObj = featuredIds.map((id) => allSeries.find((s) => s.id === id)).filter(Boolean) as Series[];
    listWithObj.sort((a, b) => (b.views || 0) - (a.views || 0));
    setFeaturedIds(listWithObj.map((s) => s.id));
  };

  const handleSortByRating = () => {
    const listWithObj = featuredIds.map((id) => allSeries.find((s) => s.id === id)).filter(Boolean) as Series[];
    listWithObj.sort((a, b) => (b.views || 0) - (a.views || 0));
    setFeaturedIds(listWithObj.map((s) => s.id));
  };

  const handleShuffle = () => {
    const shuffled = [...featuredIds].sort(() => 0.5 - Math.random());
    setFeaturedIds(shuffled);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all active featured items?')) {
      setFeaturedIds([]);
    }
  };

  const handleTaglineChange = (id: string, text: string) => {
    setTaglines((prev) => {
      if (!text.trim()) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: text };
    });
  };

  // Distinct studios list for filtering
  const distinctStudios = useMemo(() => {
    const set = new Set<string>();
    allSeries.forEach((s) => {
      if (s.studio) set.add(s.studio);
    });
    return Array.from(set).sort();
  }, [allSeries]);

  // Get active featured series details in order
  const featuredSeries = useMemo(() => {
    return featuredIds
      .map((fid) => allSeries.find((s) => s.id === fid))
      .filter((s): s is Series => !!s);
  }, [featuredIds, allSeries]);

  // Simulation of active slides based on bannerSource (prioritizes shows with real artwork)
  const activeSimulatorSlides = useMemo(() => {
    const publishedWithArtwork = allSeries.filter((s) => s.is_published && (s.poster_image_key || s.cover_image_key));
    const fallbackPool = publishedWithArtwork.length > 0 ? publishedWithArtwork : allSeries.filter((s) => s.is_published);

    if (bannerSource === 'featured_tags') {
      return featuredSeries.length > 0 ? featuredSeries.slice(0, slideCount) : fallbackPool.slice(0, slideCount);
    }
    return fallbackPool.slice(0, slideCount);
  }, [bannerSource, featuredSeries, allSeries, slideCount]);

  // Filter available series based on search query, filter tabs, and studio
  const filteredAvailable = useMemo(() => {
    return allSeries.filter((s) => {
      if (!s.is_published) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Studio filter
      if (selectedStudio !== 'all' && s.studio !== selectedStudio) {
        return false;
      }

      // Filter tabs
      if (activeFilterTab === 'has_banner') {
        if (!s.cover_image_key && !s.banner_image_key) return false;
      } else if (activeFilterTab === 'uncensored') {
        if (!s.tags.some((t) => t.toLowerCase() === 'uncensored')) return false;
      } else if (activeFilterTab === '3d') {
        if (!s.tags.some((t) => t.toLowerCase() === '3d')) return false;
      }

      return true;
    });
  }, [allSeries, searchQuery, activeFilterTab, selectedStudio]);

  // Handle preview auto-advance in simulator
  useEffect(() => {
    if (activeSimulatorSlides.length <= 1) return;
    if (autoplaySpeed <= 0) return;

    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % activeSimulatorSlides.length);
    }, autoplaySpeed);

    return () => clearInterval(timer);
  }, [activeSimulatorSlides.length, autoplaySpeed]);

  const currentPreviewSlide = activeSimulatorSlides[previewIndex] || activeSimulatorSlides[0];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Tv size={24} />
          </div>
          <div>
            <h2>Hero Carousel Command Center</h2>
            <p>Simulate, configure selection modes, manage rotation speeds, and curate promotional featured titles for the Homepage.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={styles.saveBtn}
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {message && (
        <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className={styles.loaderWrapper}>
          <div className={styles.loadingSpinner} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 1. Live Interactive Hero Carousel Preview Simulator */}
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={20} style={{ color: 'var(--primary)' }} />
                  <span>Live Hero Carousel Simulator</span>
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', margin: 0 }}>
                  Live visual rendering of the homepage banner based on your active slides and settings.
                </p>
              </div>

              {/* Viewport Switcher */}
              <div className={styles.deviceToggleGroup}>
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  className={`${styles.deviceBtn} ${viewportMode === 'desktop' ? styles.deviceBtnActive : ''}`}
                >
                  <Monitor size={15} />
                  <span>Desktop 16:9</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={`${styles.deviceBtn} ${viewportMode === 'mobile' ? styles.deviceBtnActive : ''}`}
                >
                  <Smartphone size={15} />
                  <span>Mobile Screen</span>
                </button>
              </div>
            </div>

            {/* Simulator Stage */}
            <div className={styles.simulatorContainer}>
              {currentPreviewSlide ? (
                <div className={viewportMode === 'desktop' ? styles.simulatorStageDesktop : styles.simulatorStageMobile}>
                  {/* Background Artwork */}
                  <div className={styles.stageBackground}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getR2Url(currentPreviewSlide.banner_image_key || currentPreviewSlide.cover_image_key || currentPreviewSlide.poster_image_key, 'banner')}
                      alt={currentPreviewSlide.title}
                      className={styles.stageBgImage}
                      onError={(e) => {
                        // Fallback gracefully on image error
                        (e.target as HTMLElement).style.opacity = '0.3';
                      }}
                    />
                    <div className={styles.stageOverlay} />
                  </div>

                  {/* Desktop Stage Content */}
                  {viewportMode === 'desktop' ? (
                    <div className={styles.stageContentDesktop}>
                      <div className={styles.stagePoster}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getR2Url(currentPreviewSlide.poster_image_key || currentPreviewSlide.cover_image_key, 'poster')}
                          alt={currentPreviewSlide.title}
                        />
                      </div>
                      <div className={styles.stageInfo}>
                        {taglines[currentPreviewSlide.id] && (
                          <div className={styles.stageTagline}>
                            <Flame size={12} fill="currentColor" />
                            <span>{taglines[currentPreviewSlide.id]}</span>
                          </div>
                        )}
                        <h2 className={styles.stageTitle}>{currentPreviewSlide.title}</h2>
                        <div className={styles.stageTags}>
                          <span style={{ background: 'var(--primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>HD</span>
                          {currentPreviewSlide.tags.slice(0, 4).map((t) => (
                            <span key={t} className={styles.stageTag}>{t}</span>
                          ))}
                        </div>
                        {currentPreviewSlide.synopsis && (
                          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0.2rem 0 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {currentPreviewSlide.synopsis}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Mobile Stage Content */
                    <div className={styles.stageContentMobile}>
                      {taglines[currentPreviewSlide.id] && (
                        <div className={styles.stageTagline}>
                          <Flame size={12} fill="currentColor" />
                          <span>{taglines[currentPreviewSlide.id]}</span>
                        </div>
                      )}
                      <h2 className={styles.stageTitle} style={{ fontSize: '1.25rem' }}>{currentPreviewSlide.title}</h2>
                      <div className={styles.stageTags}>
                        <span style={{ background: 'var(--primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>HD</span>
                        {currentPreviewSlide.tags.slice(0, 2).map((t) => (
                          <span key={t} className={styles.stageTag}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {activeSimulatorSlides.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev - 1 + activeSimulatorSlides.length) % activeSimulatorSlides.length)}
                        className={`${styles.stageNavBtn} ${styles.stageNavPrev}`}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((prev) => (prev + 1) % activeSimulatorSlides.length)}
                        className={`${styles.stageNavBtn} ${styles.stageNavNext}`}
                      >
                        <ChevronRight size={20} />
                      </button>

                      {/* Dots */}
                      <div className={styles.stageDots}>
                        {activeSimulatorSlides.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewIndex(i)}
                            className={`${styles.stageDot} ${i === previewIndex ? styles.stageDotActive : ''}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>No slides to simulate. Select series below.</div>
              )}
            </div>
          </div>

          {/* 2. Banner Selection Source Mode & Timing Controls */}
          <div className={`${styles.columnCard} glass`} style={{ height: 'auto', padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Banner Selection Source Mode & Rotation Timing
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', margin: 0 }}>
                  Configure rotation behavior, maximum slide count, and automatic transition speed.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Autoplay Speed Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.35rem 0.8rem', borderRadius: '12px' }}>
                  <Clock size={15} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                    Speed:
                  </span>
                  <select
                    value={autoplaySpeed}
                    onChange={(e) => setAutoplaySpeed(parseInt(e.target.value, 10))}
                    style={{ background: 'transparent', border: 'none', color: '#c084fc', fontWeight: 800, fontSize: '0.88rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value={4000} style={{ background: '#1e293b' }}>4s (Fast)</option>
                    <option value={6000} style={{ background: '#1e293b' }}>6s (Standard)</option>
                    <option value={8000} style={{ background: '#1e293b' }}>8s (Relaxed)</option>
                    <option value={10000} style={{ background: '#1e293b' }}>10s (Slow)</option>
                    <option value={0} style={{ background: '#1e293b' }}>Paused (Manual Swipe)</option>
                  </select>
                </div>

                {/* Max Slide Count Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.35rem 0.8rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                    Max Slides:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlideCount((prev) => Math.max(1, prev - 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground-primary)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc', minWidth: '24px', textAlign: 'center' }}>
                    {slideCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlideCount((prev) => Math.min(15, prev + 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--foreground-primary)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 6-Option Selection Source Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              
              {/* Source 1: Featured Tags (Manual) */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8rem',
                padding: '1rem',
                borderRadius: '12px',
                background: bannerSource === 'featured_tags' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'featured_tags' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
                    Uses series assigned in the curated catalog list below.
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
                background: bannerSource === 'latest_series' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'latest_series' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
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
                background: bannerSource === 'latest_episodes' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'latest_episodes' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
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
                background: bannerSource === 'mix_latest' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'mix_latest' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
                    Interleaves newly added series and recently updated series.
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
                background: bannerSource === 'random' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'random' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
                    Randomly selects active series from your catalog for fresh rotation.
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
                background: bannerSource === 'mix_random_latest' ? 'rgba(168, 85, 247, 0.12)' : 'var(--surface-hover)',
                border: `2px solid ${bannerSource === 'mix_random_latest' ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-secondary)', marginTop: '0.2rem', lineHeight: 1.35, margin: 0 }}>
                    Combines latest releases with random surprise titles.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Curate Featured Titles, Artwork Validation & Smart Sort */}
          <div>
            <div className={styles.grid}>
              
              {/* Left Column: Catalog Selection with Filter Tabs & Studio Dropdown */}
              <div className={`${styles.columnCard} glass`}>
                <div className={styles.cardHeader}>
                  <h3>Select Show Titles</h3>
                  <span className={styles.badgeCount}>{filteredAvailable.length} Published</span>
                </div>
                
                {/* Filter Tabs */}
                <div className={styles.filterTabs}>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('all')}
                    className={`${styles.filterTabBtn} ${activeFilterTab === 'all' ? styles.filterTabActive : ''}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('has_banner')}
                    className={`${styles.filterTabBtn} ${activeFilterTab === 'has_banner' ? styles.filterTabActive : ''}`}
                  >
                    🖼️ Wide Banner Ready
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('uncensored')}
                    className={`${styles.filterTabBtn} ${activeFilterTab === 'uncensored' ? styles.filterTabActive : ''}`}
                  >
                    🔞 Uncensored
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab('3d')}
                    className={`${styles.filterTabBtn} ${activeFilterTab === '3d' ? styles.filterTabActive : ''}`}
                  >
                    🎮 3D Anime
                  </button>
                  
                  {/* Studio Selector */}
                  {distinctStudios.length > 0 && (
                    <select
                      value={selectedStudio}
                      onChange={(e) => setSelectedStudio(e.target.value)}
                      className={styles.studioSelect}
                    >
                      <option value="all">🏢 All Studios</option>
                      {distinctStudios.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Search Input */}
                <div className={styles.searchRow}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search titles or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                {/* Series List */}
                <div className={styles.seriesList}>
                  {filteredAvailable.map((s) => {
                    const isAdded = featuredIds.includes(s.id);
                    const hasWideBanner = !!(s.cover_image_key || s.banner_image_key);

                    return (
                      <div key={s.id} className={styles.seriesRow}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getR2Url(s.poster_image_key, 'poster')}
                          alt={s.title}
                          className={styles.posterThumb}
                        />
                        <div className={styles.seriesInfo}>
                          <span className={styles.seriesTitle}>{s.title}</span>
                          <div className={styles.metaRow}>
                            {hasWideBanner ? (
                              <span className={styles.badgeWideReady}>
                                <ImageIcon size={10} /> 16:9 Banner Ready
                              </span>
                            ) : (
                              <span className={styles.badgePosterWarning}>
                                <AlertTriangle size={10} /> Poster Only
                              </span>
                            )}
                            {s.studio && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                                {s.studio}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(s.id)}
                          disabled={isAdded}
                          className={`${styles.actionBtn} ${isAdded ? styles.addedBtn : styles.addBtn}`}
                          title={isAdded ? "Already Featured" : "Add to Carousel"}
                        >
                          {isAdded ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                      </div>
                    );
                  })}
                  {filteredAvailable.length === 0 && (
                    <div className={styles.emptyState}>No series match your search & filter criteria.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Featured Order with Smart Sorting & Tagline Editor */}
              <div className={`${styles.columnCard} glass`}>
                <div className={styles.cardHeader}>
                  <h3>Active Featured Rotation</h3>
                  <span className={`${styles.badgeCount} ${styles.badgeActive}`}>
                    {featuredSeries.length} Selected
                  </span>
                </div>

                {/* Smart Sort Action Bar */}
                <div className={styles.sortToolbar}>
                  <button
                    type="button"
                    onClick={handleSortByViews}
                    disabled={featuredSeries.length <= 1}
                    className={styles.sortActionBtn}
                    title="Sort active slides by highest database views"
                  >
                    <Eye size={12} /> Most Viewed
                  </button>
                  <button
                    type="button"
                    onClick={handleSortByRating}
                    disabled={featuredSeries.length <= 1}
                    className={styles.sortActionBtn}
                    title="Sort active slides by highest rating"
                  >
                    <Star size={12} /> Top Rated
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffle}
                    disabled={featuredSeries.length <= 1}
                    className={styles.sortActionBtn}
                    title="Shuffle sequence randomly"
                  >
                    <Shuffle size={12} /> Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={featuredSeries.length === 0}
                    className={styles.sortActionBtn}
                    style={{ marginLeft: 'auto', color: '#ef4444' }}
                    title="Clear all active items"
                  >
                    <RotateCcw size={12} /> Clear
                  </button>
                </div>

                {/* Active Series List with Tagline Inputs */}
                <div className={styles.seriesList}>
                  {featuredSeries.map((s, index) => {
                    const hasWideBanner = !!(s.cover_image_key || s.banner_image_key);

                    return (
                      <div key={s.id} className={`${styles.seriesRow} ${styles.featuredRow}`}>
                        <div className={styles.orderNumber}>#{index + 1}</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getR2Url(s.poster_image_key, 'poster')}
                          alt={s.title}
                          className={styles.posterThumb}
                        />
                        <div className={styles.seriesInfo}>
                          <span className={styles.seriesTitle}>{s.title}</span>
                          <div className={styles.metaRow}>
                            {hasWideBanner ? (
                              <span className={styles.badgeWideReady}>
                                <ImageIcon size={10} /> 16:9 Banner
                              </span>
                            ) : (
                              <span className={styles.badgePosterWarning}>
                                <AlertTriangle size={10} /> Poster Only
                              </span>
                            )}
                          </div>
                          
                          {/* Inline Promotional Tagline Input */}
                          <div className={styles.taglineEditor}>
                            <Flame size={12} style={{ color: '#ec4899' }} />
                            <input
                              type="text"
                              placeholder="Promotional Tagline (e.g. ⭐ Uncensored Premiere)"
                              value={taglines[s.id] || ''}
                              onChange={(e) => handleTaglineChange(s.id, e.target.value)}
                              className={styles.taglineInput}
                            />
                          </div>
                        </div>
                        
                        <div className={styles.controls}>
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className={styles.reorderBtn}
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === featuredSeries.length - 1}
                            className={styles.reorderBtn}
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
                            className={styles.removeBtn}
                            title="Remove from Carousel"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {featuredSeries.length === 0 && (
                    <div className={styles.emptyState}>
                      No series selected. Add titles from the left catalog to feature them.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
