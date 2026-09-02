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
  CheckCircle2,
  Shuffle,
  ArrowUpDown,
  Tag,
  Building,
  Eye,
  ChevronsUp
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './playlists.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  poster_image_key?: string;
  cover_image_key?: string;
  banner_image_key?: string;
  image_library?: any[];
  tags?: string[];
  studio?: string;
  release_year?: number;
  is_published?: boolean;
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

const PRESET_CATEGORIES = [
  'Featured',
  'Genre Specials',
  'Most Popular',
  'Seasonal Hits',
  'Studio Spotlights',
  'Staff Picks'
];

export default function AdminPlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allSeries, setAllSeries] = useState<SeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Main Page Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  // Form Modal State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategoryTag, setFormCategoryTag] = useState<string>('Featured');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [formGradient, setFormGradient] = useState<string>(PRESET_GRADIENTS[0]);
  const [formSeriesSlugs, setFormSeriesSlugs] = useState<string[]>([]);
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  
  // Inside Modal: Catalog Filter & Multi-Select states
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalSelectedGenre, setModalSelectedGenre] = useState<string>('all');
  const [modalSelectedStudio, setModalSelectedStudio] = useState<string>('all');
  const [checkedCatalogSlugs, setCheckedCatalogSlugs] = useState<string[]>([]);

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
        
        // Ensure image library fallback
        const formattedSeries = (seriesData.series || []).map((s: any) => {
          let poster = s.poster_image_key;
          if (!poster && Array.isArray(s.image_library)) {
            const p = s.image_library.find((img: any) => img.role === 'poster');
            if (p?.key) poster = p.key;
          }
          return {
            ...s,
            poster_image_key: poster || s.poster_image_key,
          };
        });

        setAllSeries(formattedSeries);
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

  // Distinct Genres List extracted from catalog tags
  const distinctGenres = useMemo(() => {
    const map = new Map<string, number>();
    allSeries.forEach((s) => {
      (s.tags || []).forEach((t) => {
        const clean = t.trim();
        if (clean && !clean.toLowerCase().startsWith('featured:')) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }));
  }, [allSeries]);

  // Distinct Studios List extracted from catalog
  const distinctStudios = useMemo(() => {
    const set = new Set<string>();
    allSeries.forEach((s) => {
      if (s.studio) set.add(s.studio.trim());
    });
    return Array.from(set).sort();
  }, [allSeries]);

  // Series Lookup Map by Slug for Rapid Rendering
  const seriesBySlug = useMemo(() => {
    const map = new Map<string, SeriesItem>();
    allSeries.forEach((s) => map.set(s.slug, s));
    return map;
  }, [allSeries]);

  const handleNameChange = (name: string) => {
    setFormName(name);
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
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormGradient(PRESET_GRADIENTS[0]);
    setFormSeriesSlugs([]);
    setFormIsPinned(false);
    setModalSearchQuery('');
    setModalSelectedGenre('all');
    setModalSelectedStudio('all');
    setCheckedCatalogSlugs([]);
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    setFormId(playlist.id);
    setFormName(playlist.name);
    setFormSlug(playlist.slug);
    setFormDescription(playlist.description);
    
    const tag = playlist.categoryTag || 'Featured';
    if (PRESET_CATEGORIES.includes(tag)) {
      setFormCategoryTag(tag);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } else {
      setFormCategoryTag('custom');
      setIsCustomCategory(true);
      setCustomCategoryInput(tag);
    }

    setFormGradient(playlist.gradient);
    setFormSeriesSlugs(playlist.seriesSlugs || []);
    setFormIsPinned(Boolean(playlist.isPinned));
    setModalSearchQuery('');
    setModalSelectedGenre('all');
    setModalSelectedStudio('all');
    setCheckedCatalogSlugs([]);
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setFormId(null);
  };

  // Reordering Sequence Actions
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

  const handleMoveToTop = (index: number) => {
    if (index === 0) return;
    const list = [...formSeriesSlugs];
    const item = list.splice(index, 1)[0];
    list.unshift(item);
    setFormSeriesSlugs(list);
  };

  const handleRemoveSeries = (slug: string) => {
    setFormSeriesSlugs(formSeriesSlugs.filter((s) => s !== slug));
  };

  const handleAddSingleSeries = (slug: string) => {
    if (!formSeriesSlugs.includes(slug)) {
      setFormSeriesSlugs([...formSeriesSlugs, slug]);
    }
  };

  // Sequence Arranger Batch Tools
  const handleShuffleSequence = () => {
    const shuffled = [...formSeriesSlugs].sort(() => 0.5 - Math.random());
    setFormSeriesSlugs(shuffled);
  };

  const handleSortAZSequence = () => {
    const items = formSeriesSlugs.map((slug) => ({
      slug,
      title: seriesBySlug.get(slug)?.title || slug,
    }));
    items.sort((a, b) => a.title.localeCompare(b.title));
    setFormSeriesSlugs(items.map((i) => i.slug));
  };

  const handleClearSequence = () => {
    if (window.confirm('Are you sure you want to clear all series from this playlist?')) {
      setFormSeriesSlugs([]);
    }
  };

  // Catalog Multi-Select Actions
  const handleToggleCheckCatalog = (slug: string) => {
    setCheckedCatalogSlugs((prev) => 
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleAddCheckedCatalog = () => {
    const merged = Array.from(new Set([...formSeriesSlugs, ...checkedCatalogSlugs]));
    setFormSeriesSlugs(merged);
    setCheckedCatalogSlugs([]);
  };

  const handleAddAllFilteredCatalog = () => {
    const matchingSlugs = filteredCatalogForModal.map((s) => s.slug);
    const merged = Array.from(new Set([...formSeriesSlugs, ...matchingSlugs]));
    setFormSeriesSlugs(merged);
    setCheckedCatalogSlugs([]);
  };

  // Save Playlist
  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setErrorMsg('Name and slug are required fields.');
      return;
    }

    const finalCategoryTag = isCustomCategory ? customCategoryInput.trim() || 'Featured' : formCategoryTag;

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload = {
      id: formId,
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase(),
      description: formDescription.trim(),
      categoryTag: finalCategoryTag,
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

  // Main Page Filtered Playlists
  const filteredPlaylists = useMemo(() => {
    return playlists.filter((p) => {
      if (activeCategoryTab === 'pinned') {
        if (!p.isPinned) return false;
      } else if (activeCategoryTab !== 'all') {
        if (p.categoryTag !== activeCategoryTab) return false;
      }

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

  // Modal Catalog Filtered Items
  const filteredCatalogForModal = useMemo(() => {
    return allSeries.filter((series) => {
      if (formSeriesSlugs.includes(series.slug)) return false; // Hide already added

      // Genre filter
      if (modalSelectedGenre !== 'all') {
        const hasGenre = (series.tags || []).some(
          (t) => t.toLowerCase() === modalSelectedGenre.toLowerCase()
        );
        if (!hasGenre) return false;
      }

      // Studio filter
      if (modalSelectedStudio !== 'all' && series.studio !== modalSelectedStudio) {
        return false;
      }

      // Search query
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        const matches = series.title.toLowerCase().includes(q) || series.slug.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allSeries, formSeriesSlugs, modalSelectedGenre, modalSelectedStudio, modalSearchQuery]);

  // Live Card Preview Items in Modal
  const previewMiniPosters = useMemo(() => {
    return formSeriesSlugs
      .slice(0, 4)
      .map((slug) => seriesBySlug.get(slug))
      .filter(Boolean) as SeriesItem[];
  }, [formSeriesSlugs, seriesBySlug]);

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

      {/* 4. Spacious Full-Width Create / Edit Modal */}
      {isEditing && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleSavePlaylist} className={styles.modalContent}>
            
            {/* Modal Top Header */}
            <div className={styles.modalHeader}>
              <h2>
                <Layers size={22} style={{ color: 'var(--primary)' }} />
                <span>{formId ? 'Edit Playlist & Curate Sequence' : 'Create New Thematic Playlist'}</span>
              </h2>
              <button type="button" onClick={handleCancelForm} className={styles.closeBtn}>
                <X size={22} />
              </button>
            </div>

            <div className={styles.modalBody}>
              
              {/* =========================================================
                  Left Sidebar: Playlist Metadata & Live Mini Card Preview
                  ========================================================= */}
              <div className={styles.sidebarColumn}>
                
                {/* Live Mini Card Preview */}
                <div className={styles.liveCardPreviewBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Eye size={12} /> Live Card Preview
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>
                      {formSeriesSlugs.length} Shows
                    </span>
                  </div>

                  <div style={{ background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '4px', background: formGradient }} />
                    <div style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'var(--surface-hover)', padding: '0.15rem 0.5rem', borderRadius: '10px', color: 'var(--foreground-secondary)' }}>
                          {isCustomCategory ? customCategoryInput || 'Custom' : formCategoryTag}
                        </span>
                        {formIsPinned && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ec4899' }}>
                            📌 Pinned
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                        {formName || 'Untitled Playlist'}
                      </div>
                      
                      {/* Mini Artwork Fan */}
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.6rem', paddingLeft: '0.3rem' }}>
                        {previewMiniPosters.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            style={{
                              width: '30px',
                              height: '42px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              border: '1.5px solid #0f172a',
                              marginLeft: idx === 0 ? 0 : '-8px',
                              zIndex: idx + 1,
                              background: '#1e293b'
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getR2Url(item.poster_image_key, 'poster')}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                        {formSeriesSlugs.length > 4 && (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>
                            +{formSeriesSlugs.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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

                {/* Category Group Selector / Custom Tag */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <span>Category Group</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {isCustomCategory ? '← Choose Preset' : '+ Custom Tag'}
                    </button>
                  </label>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      placeholder="Enter custom category name..."
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className={styles.textInput}
                    />
                  ) : (
                    <select
                      value={formCategoryTag}
                      onChange={(e) => setFormCategoryTag(e.target.value)}
                      className={styles.selectInput}
                    >
                      {PRESET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} style={{ background: '#1e293b' }}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>SEO Synopsis / Description *</label>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginTop: '0.4rem', padding: '0.4rem 0' }}>
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

              {/* =========================================================
                  Right Workspace: Selected Sequence Arranger + Filterable Catalog
                  ========================================================= */}
              <div className={styles.workspaceColumn}>
                
                {/* 1. Selected Shows Sequence Arranger */}
                <div className={styles.sectionBox}>
                  <div className={styles.sectionHeaderRow}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Film size={16} style={{ color: 'var(--primary)' }} />
                        <span>Selected Series Sequence ({formSeriesSlugs.length})</span>
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', margin: '0.15rem 0 0 0' }}>
                        Arrange the exact chronological display sequence seen by website visitors.
                      </p>
                    </div>

                    <div className={styles.sequenceTools}>
                      <button
                        type="button"
                        onClick={handleShuffleSequence}
                        disabled={formSeriesSlugs.length <= 1}
                        className={styles.tinyToolBtn}
                        title="Shuffle sequence randomly"
                      >
                        <Shuffle size={12} /> Shuffle
                      </button>
                      <button
                        type="button"
                        onClick={handleSortAZSequence}
                        disabled={formSeriesSlugs.length <= 1}
                        className={styles.tinyToolBtn}
                        title="Sort alphabetically A-Z"
                      >
                        <ArrowUpDown size={12} /> Sort A-Z
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSequence}
                        disabled={formSeriesSlugs.length === 0}
                        className={styles.tinyToolBtn}
                        style={{ color: '#ef4444' }}
                        title="Clear all series from playlist"
                      >
                        <Trash2 size={12} /> Clear All
                      </button>
                    </div>
                  </div>

                  {/* Selected Sequence Scroll List */}
                  <div className={styles.sequenceList}>
                    {formSeriesSlugs.map((slug, idx) => {
                      const item = seriesBySlug.get(slug);
                      return (
                        <div key={slug} className={styles.sequenceItemRow}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--primary)', width: '26px' }}>
                            #{idx + 1}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getR2Url(item?.poster_image_key, 'poster')}
                            alt={item?.title || slug}
                            className={styles.sequenceThumb}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flexGrow: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item?.title || slug}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                              <span>{item?.studio || 'Studio N/A'}</span>
                              <span>•</span>
                              <span>{(item?.tags || []).slice(0, 3).join(', ') || 'No tags'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(idx)}
                              disabled={idx === 0}
                              className={styles.tinyToolBtn}
                              title="Move to First Position (#1)"
                            >
                              <ChevronsUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className={styles.tinyToolBtn}
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === formSeriesSlugs.length - 1}
                              className={styles.tinyToolBtn}
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSeries(slug)}
                              className={styles.tinyToolBtn}
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {formSeriesSlugs.length === 0 && (
                      <div className={styles.emptyState}>
                        No series selected yet. Select and add series from the catalog below.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Full Catalog Browser with Genre & Studio Filters */}
                <div className={styles.sectionBox}>
                  <div className={styles.sectionHeaderRow}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Compass size={16} style={{ color: '#38bdf8' }} />
                        <span>Browse Catalog & Filter by Genre / Studio</span>
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', margin: '0.15rem 0 0 0' }}>
                        {filteredCatalogForModal.length} available series matching your filters.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {checkedCatalogSlugs.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAddCheckedCatalog}
                          className={styles.tinyToolBtn}
                          style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
                        >
                          <Plus size={12} /> Add {checkedCatalogSlugs.length} Checked
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddAllFilteredCatalog}
                        disabled={filteredCatalogForModal.length === 0}
                        className={styles.tinyToolBtn}
                      >
                        <Plus size={12} /> Add All Filtered ({filteredCatalogForModal.length})
                      </button>
                    </div>
                  </div>

                  {/* Search and Dropdowns Row */}
                  <div className={styles.catalogFilterRow}>
                    <div style={{ flexGrow: 1, minWidth: '200px' }}>
                      <input
                        type="text"
                        placeholder="Search series title, Japanese name, or slug..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className={styles.textInput}
                        style={{ width: '100%', padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                      />
                    </div>

                    {/* Studio Selector */}
                    {distinctStudios.length > 0 && (
                      <select
                        value={modalSelectedStudio}
                        onChange={(e) => setModalSelectedStudio(e.target.value)}
                        className={styles.selectInput}
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}
                      >
                        <option value="all">🏢 All Studios ({distinctStudios.length})</option>
                        {distinctStudios.map((st) => (
                          <option key={st} value={st} style={{ background: '#1e293b' }}>
                            {st}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Dynamic Genre / Tag Filter Chips */}
                  <div className={styles.genreChipList}>
                    <button
                      type="button"
                      onClick={() => setModalSelectedGenre('all')}
                      className={`${styles.genreChip} ${modalSelectedGenre === 'all' ? styles.genreChipActive : ''}`}
                    >
                      All Genres
                    </button>
                    {distinctGenres.slice(0, 18).map(({ genre, count }) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setModalSelectedGenre(genre)}
                        className={`${styles.genreChip} ${modalSelectedGenre.toLowerCase() === genre.toLowerCase() ? styles.genreChipActive : ''}`}
                      >
                        {genre} <span style={{ opacity: 0.65, fontSize: '0.68rem' }}>({count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Catalog Cards Grid */}
                  <div className={styles.catalogGrid}>
                    {filteredCatalogForModal.map((series) => {
                      const isChecked = checkedCatalogSlugs.includes(series.slug);

                      return (
                        <div
                          key={series.id}
                          className={`${styles.catalogItemCard} ${isChecked ? styles.catalogItemCardSelected : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCheckCatalog(series.slug)}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getR2Url(series.poster_image_key, 'poster')}
                            alt={series.title}
                            className={styles.catalogThumb}
                          />
                          <div className={styles.catalogItemInfo}>
                            <span className={styles.catalogTitle} title={series.title}>
                              {series.title}
                            </span>
                            <div className={styles.catalogMeta}>
                              <span>{series.studio || 'Studio N/A'}</span>
                              {series.release_year && (
                                <>
                                  <span>•</span>
                                  <span>{series.release_year}</span>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                              {(series.tags || []).slice(0, 2).map((t) => (
                                <span key={t} style={{ fontSize: '0.65rem', background: 'var(--surface-hover)', padding: '0.05rem 0.35rem', borderRadius: '4px', color: 'var(--foreground-muted)' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSingleSeries(series.slug)}
                            className={styles.tinyToolBtn}
                            style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', flexShrink: 0 }}
                            title="Add to Playlist"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {filteredCatalogForModal.length === 0 && (
                      <div className={styles.emptyState}>
                        No series match your search, genre, or studio filters.
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
