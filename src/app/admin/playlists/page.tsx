'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Search,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Pin,
  Compass,
  Flame,
  Globe,
  Film,
  TrendingUp,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './playlists.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  poster_image_key?: string;
  tags?: string[];
}

interface Playlist {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryTag?: string;
  gradient: string;
  seriesSlugs: string[];
  isPinned?: boolean;
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', // Pink to Purple
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan to Blue
  'linear-gradient(135deg, #10b981 0%, #6366f1 100%)', // Green to Indigo
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', // Orange to Red
  'linear-gradient(135deg, #ff5e00 0%, #ec4899 100%)', // Neon Orange to Pink
  'linear-gradient(135deg, #8b5cf6 0%, #4338ca 100%)', // Indigo to Violet
  'linear-gradient(135deg, #eab308 0%, #f97316 100%)', // Yellow to Orange
  'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)', // Teal to Cyan
];

const PRESET_TAGS = ['Featured', 'Genre Specials', 'Most Popular'];

export default function AdminPlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allSeries, setAllSeries] = useState<SeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  // Form Modal State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategoryTag, setFormCategoryTag] = useState<string>('Featured');
  const [formGradient, setFormGradient] = useState<string>(PRESET_GRADIENTS[0]);
  const [formSeriesSlugs, setFormSeriesSlugs] = useState<string[]>([]);
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  
  // Inside form catalog search
  const [seriesSearch, setSeriesSearch] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const [playlistsRes, seriesRes] = await Promise.all([
        fetch('/api/admin/playlists'),
        fetch('/api/admin/series'),
      ]);

      if (playlistsRes.ok && seriesRes.ok) {
        const playlistsData = await playlistsRes.json();
        const seriesData = await seriesRes.json();
        setPlaylists(playlistsData.playlists || []);
        setAllSeries(seriesData.series || []);
      } else {
        setErrorMsg('Failed to load playlists or database series.');
      }
    } catch (err) {
      console.error('Error fetching admin playlists initial data:', err);
      setErrorMsg('Error connecting to playlists management API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    // Auto-generate slug from name if creating a new one
    if (!formId) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormSlug(generated);
    }
  };

  const handleOpenCreate = () => {
    setFormId(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormCategoryTag('Featured');
    setFormGradient(PRESET_GRADIENTS[0]);
    setFormSeriesSlugs([]);
    setFormIsPinned(false);
    setSeriesSearch('');
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    setFormId(playlist.id);
    setFormName(playlist.name);
    setFormSlug(playlist.slug);
    setFormDescription(playlist.description);
    setFormCategoryTag(playlist.categoryTag || 'Featured');
    setFormGradient(playlist.gradient);
    setFormSeriesSlugs(playlist.seriesSlugs || []);
    setFormIsPinned(Boolean(playlist.isPinned));
    setSeriesSearch('');
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setFormId(null);
  };

  // Reordering in Modal
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const list = [...formSeriesSlugs];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setFormSeriesSlugs(list);
  };

  const handleMoveDown = (index: number) => {
    if (index === formSeriesSlugs.length - 1) return;
    const list = [...formSeriesSlugs];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setFormSeriesSlugs(list);
  };

  const handleRemoveSeries = (slug: string) => {
    setFormSeriesSlugs(formSeriesSlugs.filter((s) => s !== slug));
  };

  const handleAddSeries = (slug: string) => {
    if (!formSeriesSlugs.includes(slug)) {
      setFormSeriesSlugs([...formSeriesSlugs, slug]);
    }
  };

  // Quick Auto-Curate Presets (1-Click Tag Importers)
  const handleAutoCurateTag = (tag: string) => {
    const matchingSlugs = allSeries
      .filter((s) => (s.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()))
      .map((s) => s.slug);
    
    const merged = Array.from(new Set([...formSeriesSlugs, ...matchingSlugs]));
    setFormSeriesSlugs(merged);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setErrorMsg('Name and slug are required fields.');
      return;
    }

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload = {
      id: formId,
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase(),
      description: formDescription.trim(),
      categoryTag: formCategoryTag,
      gradient: formGradient,
      seriesSlugs: formSeriesSlugs,
      isPinned: formIsPinned,
    };

    try {
      const method = formId ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/playlists', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg(formId ? 'Playlist updated successfully!' : 'New playlist created successfully!');
        setIsEditing(false);
        setFormId(null);
        await fetchInitialData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save playlist.');
      }
    } catch (err) {
      console.error('Error saving playlist:', err);
      setErrorMsg('Error connecting to playlists management API.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the playlist "${name}"?`)) {
      return;
    }

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/playlists?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMsg(`Playlist "${name}" was deleted successfully.`);
        await fetchInitialData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete playlist.');
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setErrorMsg('Error connecting to playlists management API.');
    } finally {
      setIsSaving(false);
    }
  };

  // Top Metrics Aggregations
  const totalPlaylists = playlists.length;
  
  const uniqueShowsGrouped = useMemo(() => {
    const set = new Set<string>();
    playlists.forEach((p) => {
      (p.seriesSlugs || []).forEach((s) => set.add(s));
    });
    return set.size;
  }, [playlists]);

  const seoCoveragePercent = useMemo(() => {
    if (allSeries.length === 0) return 100;
    return Math.min(100, Math.round((uniqueShowsGrouped / allSeries.length) * 100));
  }, [uniqueShowsGrouped, allSeries.length]);

  const featuredCount = useMemo(() => {
    return playlists.filter((p) => p.categoryTag === 'Featured' || p.isPinned).length;
  }, [playlists]);

  // Series Lookup Map by Slug for Rapid Poster Rendering
  const seriesBySlug = useMemo(() => {
    const map = new Map<string, SeriesItem>();
    allSeries.forEach((s) => map.set(s.slug, s));
    return map;
  }, [allSeries]);

  // Filtered Playlists list based on search and category tab
  const filteredPlaylists = useMemo(() => {
    return playlists.filter((p) => {
      // Category tab
      if (activeCategoryTab === 'pinned') {
        if (!p.isPinned) return false;
      } else if (activeCategoryTab !== 'all') {
        if (p.categoryTag !== activeCategoryTab) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesShow = (p.seriesSlugs || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesSlug && !matchesDesc && !matchesShow) return false;
      }

      return true;
    });
  }, [playlists, activeCategoryTab, searchQuery]);

  // Inside Modal: Filter series catalog
  const filteredCatalogForModal = useMemo(() => {
    return allSeries.filter((series) => {
      if (formSeriesSlugs.includes(series.slug)) return false; // hide already added
      if (!seriesSearch.trim()) return true;
      const q = seriesSearch.toLowerCase();
      return series.title.toLowerCase().includes(q) || series.slug.toLowerCase().includes(q);
    });
  }, [allSeries, formSeriesSlugs, seriesSearch]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={40} />
        <p>Loading curated playlists manager...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Title Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Layers size={24} />
          </div>
          <div>
            <h2>Curated Playlists & Collections</h2>
            <p>Group series into thematic collections to boost internal linking SEO and increase audience discovery.</p>
          </div>
        </div>
        <button onClick={handleOpenCreate} className={styles.createBtn}>
          <Plus size={16} />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="glass" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '1rem 1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="glass" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '1rem 1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Top Metrics & Catalog SEO Coverage Bar */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ color: 'var(--primary)' }}>
            <Layers size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Playlists</span>
            <span className={styles.statValue}>{totalPlaylists}</span>
            <span className={styles.statSubtext}>Active collections</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ color: '#38bdf8' }}>
            <Film size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Shows Grouped</span>
            <span className={styles.statValue}>{uniqueShowsGrouped}</span>
            <span className={styles.statSubtext}>Unique series curated</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ color: '#10b981' }}>
            <Globe size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>SEO Coverage</span>
            <span className={styles.statValue}>{seoCoveragePercent}%</span>
            <span className={styles.statSubtext}>Catalog in playlists</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ color: '#ec4899' }}>
            <Sparkles size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Featured / Pinned</span>
            <span className={styles.statValue}>{featuredCount}</span>
            <span className={styles.statSubtext}>Priority collections</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('all')}
            className={`${styles.filterTabBtn} ${activeCategoryTab === 'all' ? styles.filterTabActive : ''}`}
          >
            All Playlists ({playlists.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('Featured')}
            className={`${styles.filterTabBtn} ${activeCategoryTab === 'Featured' ? styles.filterTabActive : ''}`}
          >
            <Sparkles size={13} /> Featured
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('Genre Specials')}
            className={`${styles.filterTabBtn} ${activeCategoryTab === 'Genre Specials' ? styles.filterTabActive : ''}`}
          >
            <Compass size={13} /> Genre Specials
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('Most Popular')}
            className={`${styles.filterTabBtn} ${activeCategoryTab === 'Most Popular' ? styles.filterTabActive : ''}`}
          >
            <Flame size={13} /> Most Popular
          </button>
          <button
            type="button"
            onClick={() => setActiveCategoryTab('pinned')}
            className={`${styles.filterTabBtn} ${activeCategoryTab === 'pinned' ? styles.filterTabActive : ''}`}
          >
            <Pin size={13} /> Pinned
          </button>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} style={{ color: 'var(--foreground-muted)' }} />
          <input
            type="text"
            placeholder="Search playlists or shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* 3. Glassmorphic Playlist Cards Grid */}
      <div className={styles.playlistsGrid}>
        {filteredPlaylists.map((playlist) => {
          const linkedSeries = (playlist.seriesSlugs || [])
            .map((slug) => seriesBySlug.get(slug))
            .filter(Boolean) as SeriesItem[];

          const previewPosters = linkedSeries.slice(0, 4);
          const remainingCount = linkedSeries.length - previewPosters.length;

          return (
            <div key={playlist.id} className={styles.playlistCard}>
              {/* Vibrant Top Glow Gradient */}
              <div 
                className={styles.cardBannerGlow}
                style={{ background: playlist.gradient }}
              />

              <div className={styles.cardBody}>
                <div className={styles.cardTopRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={styles.categoryBadge}>
                      {playlist.categoryTag || 'Featured'}
                    </span>
                    {playlist.isPinned && (
                      <span className={styles.pinnedBadge}>
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                  </div>
                  <span className={styles.countBadge}>
                    {playlist.seriesSlugs.length} Series
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{playlist.name}</h3>
                
                <p className={styles.cardDesc}>
                  {playlist.description || 'No curated description provided.'}
                </p>

                {/* Multi-Poster Fan/Stack */}
                <div className={styles.posterStack}>
                  {previewPosters.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className={styles.stackItem}
                      title={item.title}
                      style={{ zIndex: idx + 1 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getR2Url(item.poster_image_key, 'poster')}
                        alt={item.title}
                      />
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <span className={styles.stackCountPill}>
                      +{remainingCount} more
                    </span>
                  )}
                  {previewPosters.length === 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                      No series linked yet.
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div className={styles.cardActions}>
                  <Link
                    href={`/playlists/${playlist.slug}`}
                    target="_blank"
                    className={`${styles.actionBtn} ${styles.actionLiveBtn}`}
                    title="View live playlist page in new tab"
                  >
                    <ExternalLink size={13} />
                    <span>View Live</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(playlist)}
                    className={styles.actionBtn}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                    className={`${styles.actionBtn} ${styles.actionDeleteBtn}`}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPlaylists.length === 0 && (
          <div className={styles.emptyState}>
            No curated playlists match your active category filter or search query.
          </div>
        )}
      </div>

      {/* 4. Spacious 2-Column Create / Edit Modal */}
      {isEditing && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleSavePlaylist} className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{formId ? 'Edit Playlist & Curate Sequence' : 'Create New Thematic Playlist'}</h2>
              <button type="button" onClick={handleCancelForm} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Left Column: Metadata & Gradient Colors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Playlist Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Uncensored Legends"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={styles.textInput}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>URL Slug *</label>
                  <input
                    type="text"
                    placeholder="e.g. uncensored-legends"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className={styles.textInput}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Category Group</label>
                  <select
                    value={formCategoryTag}
                    onChange={(e) => setFormCategoryTag(e.target.value)}
                    className={styles.selectInput}
                  >
                    {PRESET_TAGS.map((t) => (
                      <option key={t} value={t} style={{ background: '#1e293b' }}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>SEO Description *</label>
                  <textarea
                    placeholder="Curated synopsis explaining the thematic focus and anime series included in this playlist..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className={styles.textareaInput}
                    required
                  />
                </div>

                {/* Gradient Palette Selection */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Gradient Accent Color</label>
                  <div className={styles.gradientPalette}>
                    {PRESET_GRADIENTS.map((g, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFormGradient(g)}
                        className={`${styles.gradientChoice} ${formGradient === g ? styles.gradientChoiceActive : ''}`}
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                </div>

                {/* Pinned Switch */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                    Pin to Top of Playlists Page
                  </span>
                </label>
              </div>

              {/* Right Column: Sequence Arranger & Catalog Picker */}
              <div className={styles.sequencePanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.inputLabel}>
                    Selected Series Sequence ({formSeriesSlugs.length})
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                    Arrange public display order
                  </span>
                </div>

                {/* Selected Shows Ordered List */}
                <div className={styles.seriesScrollList} style={{ height: '160px' }}>
                  {formSeriesSlugs.map((slug, idx) => {
                    const item = seriesBySlug.get(slug);
                    return (
                      <div key={slug} className={styles.seriesItemRow}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', width: '20px' }}>
                          #{idx + 1}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getR2Url(item?.poster_image_key, 'poster')}
                          alt={item?.title || slug}
                          className={styles.seriesMiniThumb}
                        />
                        <span className={styles.seriesItemTitle}>
                          {item?.title || slug}
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            style={{ background: 'transparent', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 4px' }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === formSeriesSlugs.length - 1}
                            style={{ background: 'transparent', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 4px' }}
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSeries(slug)}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', padding: '2px 4px' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {formSeriesSlugs.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--foreground-muted)', fontSize: '0.82rem' }}>
                      No series selected. Add titles from catalog below.
                    </div>
                  )}
                </div>

                {/* 1-Click Auto-Curate Presets */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                    ⚡ 1-Click Auto-Add:
                  </span>
                  <div className={styles.quickPresetsBar}>
                    <button
                      type="button"
                      onClick={() => handleAutoCurateTag('Uncensored')}
                      className={styles.quickPresetBtn}
                    >
                      + Uncensored
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoCurateTag('3D')}
                      className={styles.quickPresetBtn}
                    >
                      + 3D Anime
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoCurateTag('Romance')}
                      className={styles.quickPresetBtn}
                    >
                      + Romance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoCurateTag('Fantasy')}
                      className={styles.quickPresetBtn}
                    >
                      + Fantasy
                    </button>
                  </div>
                </div>

                {/* Catalog Search & Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search catalog to add shows..."
                    value={seriesSearch}
                    onChange={(e) => setSeriesSearch(e.target.value)}
                    className={styles.textInput}
                    style={{ padding: '0.5rem 0.8rem', fontSize: '0.82rem' }}
                  />

                  <div className={styles.seriesScrollList} style={{ height: '150px' }}>
                    {filteredCatalogForModal.map((series) => (
                      <div key={series.id} className={styles.seriesItemRow}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getR2Url(series.poster_image_key, 'poster')}
                          alt={series.title}
                          className={styles.seriesMiniThumb}
                        />
                        <span className={styles.seriesItemTitle}>
                          {series.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddSeries(series.slug)}
                          className={styles.quickPresetBtn}
                          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    ))}
                    {filteredCatalogForModal.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--foreground-muted)', fontSize: '0.82rem' }}>
                        No more matching shows found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button type="button" onClick={handleCancelForm} className={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className={styles.createBtn}>
                <Save size={16} />
                <span>{isSaving ? 'Saving Playlist...' : 'Save Playlist'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
