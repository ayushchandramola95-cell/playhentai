'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Film, 
  Tv, 
  Layers, 
  Eye, 
  SlidersHorizontal, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  LayoutGrid, 
  Table as TableIcon,
  Zap,
  Info,
  ArrowUpDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { getR2Url } from '@/utils/r2';
import styles from './seasons.module.css';

interface Series {
  id: string;
  title: string;
  slug?: string;
  poster_image_key?: string;
  cover_image_key?: string;
}

interface Season {
  id: string;
  series_id: string;
  season_number: number;
  title: string;
  is_published: boolean;
  created_at: string;
  episode_count?: number;
  series?: {
    id?: string;
    title: string;
    slug?: string;
    poster_image_key?: string;
    cover_image_key?: string;
    is_published?: boolean;
  };
}

export default function AdminSeasonsPage() {
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'series_asc' | 'season_num' | 'episodes'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Quick Next Season Helper Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickSeriesId, setQuickSeriesId] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  // Toggling status in progress IDs
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [seasonsRes, seriesRes] = await Promise.all([
        fetch('/api/admin/seasons'),
        fetch('/api/admin/series')
      ]);

      const seasonsData = await seasonsRes.json();
      const seriesData = await seriesRes.json();

      if (!seasonsRes.ok) throw new Error(seasonsData.error || 'Failed to load seasons');
      if (!seriesRes.ok) throw new Error(seriesData.error || 'Failed to load series');

      setSeasonsList(seasonsData.seasons || []);
      setSeriesList(seriesData.series || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (isModalOpen) {
          e.preventDefault();
          const form = document.getElementById('season-crud-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Handle open create modal
  const handleOpenCreate = (preselectedSeriesId?: string) => {
    setEditingId(null);
    const chosenSeriesId = preselectedSeriesId || (selectedSeriesFilter !== 'all' ? selectedSeriesFilter : seriesList[0]?.id || '');
    setSeriesId(chosenSeriesId);
    
    // Auto-calculate next season number for chosen series
    const seriesSeasons = seasonsList.filter(s => s.series_id === chosenSeriesId);
    const nextNum = seriesSeasons.length > 0 ? Math.max(...seriesSeasons.map(s => s.season_number)) + 1 : 1;
    
    setSeasonNumber(nextNum);
    setTitle(`Season ${nextNum}`);
    setIsPublished(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Handle series change in modal -> update season number suggestions
  const handleSeriesChange = (newSeriesId: string) => {
    setSeriesId(newSeriesId);
    if (!editingId) {
      const seriesSeasons = seasonsList.filter(s => s.series_id === newSeriesId);
      const nextNum = seriesSeasons.length > 0 ? Math.max(...seriesSeasons.map(s => s.season_number)) + 1 : 1;
      setSeasonNumber(nextNum);
      setTitle(`Season ${nextNum}`);
    }
  };

  const handleOpenEdit = (s: Season) => {
    setEditingId(s.id);
    setSeriesId(s.series_id);
    setSeasonNumber(s.season_number);
    setTitle(s.title);
    setIsPublished(s.is_published);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSeasonNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    setSeasonNumber(val);
    if (!editingId || title === `Season ${seasonNumber}`) {
      setTitle(`Season ${val}`);
    }
  };

  const handleApplyPresetTitle = (preset: string) => {
    setTitle(preset);
  };

  // Save season via modal
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const payload = {
      id: editingId,
      series_id: seriesId,
      season_number: seasonNumber,
      title: title.trim() || `Season ${seasonNumber}`,
      is_published: isPublished
    };

    try {
      const url = '/api/admin/seasons';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save season');

      setIsModalOpen(false);
      setSuccessMsg(editingId ? `✓ Season "${payload.title}" updated successfully.` : `✓ Season "${payload.title}" created successfully.`);
      fetchInitialData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 1-Click quick toggle publish status
  const handleToggleStatus = async (s: Season) => {
    setTogglingId(s.id);
    const newStatus = !s.is_published;
    
    // Optimistic update
    setSeasonsList(prev => prev.map(item => item.id === s.id ? { ...item, is_published: newStatus } : item));

    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, is_published: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setSuccessMsg(`✓ Season "${s.title}" set to ${newStatus ? 'Published' : 'Draft'}.`);
    } catch (err: any) {
      // Revert optimistic update on failure
      setSeasonsList(prev => prev.map(item => item.id === s.id ? { ...item, is_published: s.is_published } : item));
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // Quick Auto-Add Next Season
  const handleQuickAddNextSeason = async () => {
    if (!quickSeriesId) return;
    setQuickSaving(true);
    
    try {
      const seriesSeasons = seasonsList.filter(s => s.series_id === quickSeriesId);
      const nextNum = seriesSeasons.length > 0 ? Math.max(...seriesSeasons.map(s => s.season_number)) + 1 : 1;
      const targetSeries = seriesList.find(s => s.id === quickSeriesId);

      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: quickSeriesId,
          season_number: nextNum,
          title: `Season ${nextNum}`,
          is_published: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-create next season');

      setIsQuickAddOpen(false);
      setSuccessMsg(`✓ Created Season ${nextNum} for "${targetSeries?.title || 'Series'}"!`);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuickSaving(false);
    }
  };

  // Delete Season
  const handleDelete = async (id: string, titleName: string, epCount: number = 0) => {
    const warningMsg = epCount > 0 
      ? `⚠️ WARNING: This season contains ${epCount} episode${epCount > 1 ? 's' : ''}!\n\nDeleting "${titleName}" will permanently remove the season and ALL associated episodes, views, and comments.\n\nAre you sure you want to proceed?`
      : `Are you sure you want to delete "${titleName}"?`;

    if (!confirm(warningMsg)) return;

    try {
      const res = await fetch(`/api/admin/seasons?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete season');

      setSuccessMsg(`✓ Season "${titleName}" deleted successfully.`);
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered & Sorted Seasons List
  const filteredAndSortedList = useMemo(() => {
    return seasonsList
      .filter((s) => {
        // Series Filter
        if (selectedSeriesFilter !== 'all' && s.series_id !== selectedSeriesFilter) {
          return false;
        }

        const isLive = s.is_published && s.series?.is_published !== false;

        // Status Filter: 'live' means both season AND series are published
        if (statusFilter === 'live' && !isLive) return false;
        // 'draft' means either season is draft OR parent series is draft
        if (statusFilter === 'draft' && isLive) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (s.title || '').toLowerCase().includes(q);
          const matchSeries = (s.series?.title || '').toLowerCase().includes(q);
          const matchSeasonNum = `season ${s.season_number}`.includes(q) || `s${s.season_number}` === q || `${s.season_number}` === q;
          if (!matchTitle && !matchSeries && !matchSeasonNum) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'series_asc') {
          const tA = (a.series?.title || '').toLowerCase();
          const tB = (b.series?.title || '').toLowerCase();
          return tA.localeCompare(tB);
        }
        if (sortBy === 'season_num') {
          return a.season_number - b.season_number;
        }
        if (sortBy === 'episodes') {
          return (b.episode_count || 0) - (a.episode_count || 0);
        }
        return 0;
      });
  }, [seasonsList, selectedSeriesFilter, statusFilter, searchQuery, sortBy]);

  // Total pages and Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedList.slice(start, start + pageSize);
  }, [filteredAndSortedList, currentPage, pageSize]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSeriesFilter, statusFilter, sortBy, pageSize]);

  // Top Metrics Calculation
  const stats = useMemo(() => {
    const totalSeasons = seasonsList.length;
    // Live requires BOTH season and parent series to be live published
    const liveOnSiteCount = seasonsList.filter(s => s.is_published && s.series?.is_published !== false).length;
    const seriesDraftCount = seasonsList.filter(s => s.series?.is_published === false).length;
    const seasonDraftCount = seasonsList.filter(s => !s.is_published).length;
    const totalDraftsOrHidden = totalSeasons - liveOnSiteCount;

    const uniqueSeriesCount = new Set(seasonsList.map(s => s.series_id)).size;
    const totalEpisodes = seasonsList.reduce((acc, s) => acc + (s.episode_count || 0), 0);
    const avgEpisodes = totalSeasons > 0 ? (totalEpisodes / totalSeasons).toFixed(1) : '0';

    return { totalSeasons, liveOnSiteCount, seriesDraftCount, seasonDraftCount, totalDraftsOrHidden, uniqueSeriesCount, totalEpisodes, avgEpisodes };
  }, [seasonsList]);

  // Currently selected series for modal preview
  const selectedSeriesPreview = useMemo(() => {
    return seriesList.find(s => s.id === seriesId);
  }, [seriesList, seriesId]);

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <FolderOpen size={24} />
          </div>
          <div>
            <h2>Manage Seasons</h2>
            <p>
              Organize series episodes into structured seasons (Season 1, Season 2, OVAs, Specials).
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            onClick={() => {
              setQuickSeriesId(seriesList[0]?.id || '');
              setIsQuickAddOpen(true);
            }} 
            disabled={seriesList.length === 0} 
            className={styles.cardActionBtn}
            style={{ background: '#141724', border: '1px solid #282e44', padding: '0.65rem 1.1rem' }}
            title="Auto-calculate and add the next season for any series in 1-click"
          >
            <Zap size={15} style={{ color: 'var(--primary)' }} />
            <span>⚡ Quick Next Season</span>
          </button>

          <button 
            type="button" 
            onClick={() => handleOpenCreate()} 
            disabled={seriesList.length === 0} 
            className={styles.createBtn}
          >
            <Plus size={16} />
            <span>Add Season</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--primary)' }}>
            <FolderOpen size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalSeasons}</span>
            <span className={styles.statLabel}>
              {stats.liveOnSiteCount} Live on Site • {stats.totalDraftsOrHidden} Hidden ({stats.seriesDraftCount} Series in Draft)
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Film size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.uniqueSeriesCount}</span>
            <span className={styles.statLabel}>Unique Shows Covered</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconBox} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Tv size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.totalEpisodes}</span>
            <span className={styles.statLabel}>Total Linked Episodes ({stats.avgEpisodes} ep/season)</span>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '0.85rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search, Filters & View Mode Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTopRow}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by season title, parent series, or season number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Controls */}
          <div className={styles.filterControls}>
            {/* Series Filter Dropdown */}
            <select
              className={styles.selectInput}
              value={selectedSeriesFilter}
              onChange={(e) => setSelectedSeriesFilter(e.target.value)}
              title="Filter by parent series"
            >
              <option value="all">All Series ({seriesList.length})</option>
              {seriesList.map((s) => {
                const count = seasonsList.filter(item => item.series_id === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.title} {count > 0 ? `(${count} season${count > 1 ? 's' : ''})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Status Filter Group */}
            <div className={styles.statusFilterGroup}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'all' ? styles.statusFilterBtnActive : ''}`}
              >
                All ({seasonsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('live')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'live' ? styles.statusFilterBtnActive : ''}`}
                title="Seasons where both Season AND Parent Series are Live Published"
              >
                ● Live on Site ({stats.liveOnSiteCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`${styles.statusFilterBtn} ${statusFilter === 'draft' ? styles.statusFilterBtnActive : ''}`}
                title="Seasons that are Drafts or whose Parent Series is in Draft"
              >
                ● Hidden / Drafts ({stats.totalDraftsOrHidden})
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              className={styles.selectInput}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              title="Sort seasons"
            >
              <option value="newest">Latest Created</option>
              <option value="oldest">Oldest Created</option>
              <option value="series_asc">Series Title (A-Z)</option>
              <option value="season_num">Season Number (1 → N)</option>
              <option value="episodes">Most Episodes</option>
            </select>

            {/* View Mode Toggle */}
            <div className={styles.viewToggleGroup}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`}
                title="Cards Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleBtnActive : ''}`}
                title="Table List View"
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ border: '3px solid rgba(124, 58, 237, 0.2)', borderTopColor: 'var(--primary)', width: '38px', height: '38px', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
          <p style={{ marginTop: '1rem', color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Loading seasons catalog...</p>
        </div>
      ) : paginatedList.length > 0 ? (
        <>
          {/* VIEW 1: LUXURY CARDS GRID */}
          {viewMode === 'grid' && (
            <div className={styles.seasonsGrid}>
              {paginatedList.map((s) => {
                const posterKey = s.series?.poster_image_key || s.series?.cover_image_key;
                const posterUrl = posterKey ? getR2Url(posterKey, 'poster') : null;
                const isToggling = togglingId === s.id;
                const isSeriesDraft = s.series?.is_published === false;
                const isSeasonDraft = !s.is_published;
                const isLive = s.is_published && !isSeriesDraft;

                return (
                  <div key={s.id} className={styles.seasonCard}>
                    {/* Header Row with Artwork & Details */}
                    <div className={styles.seasonCardHeader}>
                      {/* Parent Series Thumbnail */}
                      <div className={styles.seriesThumbWrapper}>
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={s.series?.title || s.title}
                            className={styles.seriesThumbImg}
                            loading="lazy"
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={styles.seriesThumbPlaceholder}>
                            <Film size={22} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className={styles.seasonCardInfo}>
                        <div className={styles.seasonBadgeRow}>
                          <span className={styles.seasonNumberPill}>
                            Season {s.season_number}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            disabled={isToggling}
                            className={`${styles.seasonStatusPill} ${
                              isLive 
                                ? styles.seasonStatusPublished 
                                : isSeriesDraft 
                                  ? styles.seasonStatusDraft 
                                  : styles.seasonStatusDraft
                            }`}
                            title={isSeriesDraft ? "Parent Series is in Draft (Hidden from visitors). Click to toggle season publish state." : "Click to toggle season publish status"}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b' }} />
                            <span>
                              {isLive 
                                ? 'Live on Site' 
                                : isSeriesDraft 
                                  ? 'Series in Draft' 
                                  : 'Season Draft'}
                            </span>
                          </button>
                        </div>

                        <h3 className={styles.seasonTitle} title={s.title}>
                          {s.title}
                        </h3>

                        {s.series && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <Link 
                              href={s.series.slug ? `/series/${s.series.slug}` : `/admin/series`}
                              target={s.series.slug ? "_blank" : "_self"}
                              className={styles.parentSeriesLink}
                              title={`Parent Show: ${s.series.title}`}
                            >
                              <span>{s.series.title}</span>
                              {s.series.slug && <ExternalLink size={11} style={{ opacity: 0.7 }} />}
                            </Link>
                            {isSeriesDraft && (
                              <span style={{ fontSize: '0.66rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.05rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                Draft Show
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Body: Episode Indicator & Created Date */}
                    <div className={styles.seasonCardBody}>
                      <Link
                        href={`/admin/episodes?series_id=${s.series_id}&season_id=${s.id}`}
                        className={styles.episodeCountPill}
                        title="Jump to episodes management for this season"
                      >
                        <Tv size={13} />
                        <span>{s.episode_count || 0} Episode{s.episode_count !== 1 ? 's' : ''}</span>
                      </Link>

                      <span className={styles.createdDateText}>
                        Added {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Footer: Fast Action Controls */}
                    <div className={styles.seasonCardFooter}>
                      <Link
                        href={`/admin/episodes?series_id=${s.series_id}&season_id=${s.id}`}
                        className={styles.cardActionBtn}
                        title="Manage Episodes in this Season"
                      >
                        <Tv size={13} />
                        <span>Episodes</span>
                      </Link>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className={styles.cardActionBtn}
                          title="Edit Season Details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.title, s.episode_count || 0)}
                          className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                          title="Delete Season"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: MODERN TABLE VIEW */}
          {viewMode === 'table' && (
            <div className={styles.tableContainer}>
              <table className={styles.seasonsTable}>
                <thead>
                  <tr>
                    <th>Season Title</th>
                    <th>Parent Series</th>
                    <th>Season #</th>
                    <th>Episodes</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((s) => {
                    const posterKey = s.series?.poster_image_key || s.series?.cover_image_key;
                    const posterUrl = posterKey ? getR2Url(posterKey, 'poster') : null;
                    const isSeriesDraft = s.series?.is_published === false;
                    const isLive = s.is_published && !isSeriesDraft;

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                          {s.title}
                        </td>
                        <td>
                          <div className={styles.tableSeriesCell}>
                            {posterUrl && (
                              <img src={posterUrl} alt="" className={styles.tableThumb} />
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>{s.series?.title || 'Unknown Series'}</span>
                                {isSeriesDraft && (
                                  <span style={{ fontSize: '0.64rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.05rem 0.35rem', borderRadius: '4px' }}>
                                    Draft
                                  </span>
                                )}
                              </div>
                              {s.series?.slug && (
                                <Link
                                  href={`/series/${s.series.slug}`}
                                  target="_blank"
                                  style={{ fontSize: '0.74rem', color: '#a7f3d0', textDecoration: 'none' }}
                                >
                                  /{s.series.slug}
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.seasonNumberPill}>
                            Season {s.season_number}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/episodes?series_id=${s.series_id}&season_id=${s.id}`}
                            className={styles.episodeCountPill}
                          >
                            <Tv size={12} />
                            <span>{s.episode_count || 0} eps</span>
                          </Link>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            className={`${styles.seasonStatusPill} ${isLive ? styles.seasonStatusPublished : styles.seasonStatusDraft}`}
                            title={isSeriesDraft ? "Parent Series is in Draft (Hidden from visitors). Click to toggle season." : "Click to toggle season status"}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b' }} />
                            <span>
                              {isLive 
                                ? 'Live on Site' 
                                : isSeriesDraft 
                                  ? 'Series in Draft' 
                                  : 'Season Draft'}
                            </span>
                          </button>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)' }}>
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <Link
                              href={`/admin/episodes?series_id=${s.series_id}&season_id=${s.id}`}
                              className={styles.cardActionBtn}
                              title="Manage episodes"
                            >
                              <Tv size={13} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(s)}
                              className={styles.cardActionBtn}
                              title="Edit Season"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id, s.title, s.episode_count || 0)}
                              className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                              title="Delete Season"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Navigation Bar */}
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              Showing <b>{Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedList.length)}</b>–<b>{Math.min(currentPage * pageSize, filteredAndSortedList.length)}</b> of <b>{filteredAndSortedList.length}</b> seasons
              {selectedSeriesFilter !== 'all' && ' (filtered)'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Page Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={styles.selectInput}
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                </select>
              </div>

              {/* Controls */}
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                  title="First Page"
                >
                  <ChevronsLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Dynamic Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && pageNum - prev > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span style={{ color: 'var(--foreground-muted)', padding: '0 0.2rem' }}>...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`${styles.pageBtn} ${currentPage === pageNum ? styles.pageBtnActive : ''}`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                  title="Last Page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyStateBox}>
          <FolderOpen size={48} style={{ color: 'var(--foreground-muted)', opacity: 0.5 }} />
          <div className={styles.emptyStateTitle}>No seasons match your query</div>
          <div className={styles.emptyStateText}>
            {searchQuery || selectedSeriesFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search filters, parent series selection, or status pills.'
              : 'You haven\'t added any seasons yet. Click "Add Season" above to organize your catalog.'}
          </div>
          {(searchQuery || selectedSeriesFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSeriesFilter('all');
                setStatusFilter('all');
              }}
              className={styles.cardActionBtn}
              style={{ marginTop: '0.5rem', background: '#141724', border: '1px solid #282e44' }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* QUICK ADD NEXT SEASON MODAL */}
      {isQuickAddOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0d0f17', border: '1px solid #23283b', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>
                  Quick Next Season Generator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--foreground-secondary)', lineHeight: 1.4 }}>
              Select a series below. The system will automatically check existing seasons, compute the next season number (Season N+1), and create it live.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                Target Parent Series
              </label>
              <select
                value={quickSeriesId}
                onChange={(e) => setQuickSeriesId(e.target.value)}
                style={{ background: '#141724', border: '1px solid #282e44', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' }}
              >
                {seriesList.map((s) => {
                  const existingCount = seasonsList.filter(item => item.series_id === s.id).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.title} ({existingCount} existing season{existingCount !== 1 ? 's' : ''} → next will be Season {existingCount + 1})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                style={{ background: '#141724', border: '1px solid #282e44', color: 'var(--foreground-secondary)', padding: '0.6rem 1.2rem', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={quickSaving || !quickSeriesId}
                onClick={handleQuickAddNextSeason}
                className={styles.createBtn}
              >
                <Zap size={14} />
                <span>{quickSaving ? 'Generating...' : '⚡ Generate Next Season'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOLID DARK CRUD MODAL (100% Solid Dark Theme) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0d0f17', border: '1px solid #23283b', borderRadius: '22px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #23283b', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FolderOpen size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>
                  {editingId ? `Edit Season: ${title || 'Untitled'}` : 'Add New Season'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Error in modal */}
            {modalError && (
              <div style={{ background: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form id="season-crud-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Parent Series Selection with Live Artwork Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                  Parent Series *
                </label>
                <select
                  required
                  value={seriesId}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  style={{ background: '#181c2b', border: '1px solid #282e44', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', outline: 'none' }}
                >
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>

                {/* Series Live Preview Badge */}
                {selectedSeriesPreview && (
                  <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    {selectedSeriesPreview.poster_image_key || selectedSeriesPreview.cover_image_key ? (
                      <img
                        src={getR2Url(selectedSeriesPreview.poster_image_key || selectedSeriesPreview.cover_image_key, 'poster')}
                        alt=""
                        style={{ width: '38px', height: '52px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #282e44' }}
                      />
                    ) : (
                      <div style={{ width: '38px', height: '52px', borderRadius: '6px', background: '#181c2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground-muted)' }}>
                        <Film size={18} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>
                        {selectedSeriesPreview.title}
                      </div>
                      {selectedSeriesPreview.slug && (
                        <span style={{ fontSize: '0.72rem', color: '#a7f3d0', fontFamily: 'monospace' }}>
                          /{selectedSeriesPreview.slug}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Season Number & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                    Season # *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={seasonNumber}
                    onChange={handleSeasonNumberChange}
                    style={{ background: '#181c2b', border: '1px solid #282e44', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-primary)' }}>
                    Season Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Season 1, Specials, OVAs"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ background: '#181c2b', border: '1px solid #282e44', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Quick Title Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--foreground-primary)', fontWeight: 700 }}>
                    ⚡ Quick Title Presets (1-Click Fill):
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>
                    Click preset to auto-fill title input
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[`Season ${seasonNumber}`, 'OVAs', 'Specials', 'Movies', 'Director’s Cut', 'Side Stories'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPresetTitle(preset)}
                      style={{
                        background: title === preset ? '#7c3aed' : '#141724',
                        color: title === preset ? '#ffffff' : 'var(--foreground-secondary)',
                        border: title === preset ? '1px solid #8b5cf6' : '1px solid #282e44',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title={`Click to fill Season Title as "${preset}"`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Published Toggle Switch */}
              <div style={{ background: '#131722', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: isPublished ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isPublished ? '#10b981' : '#f59e0b', boxShadow: isPublished ? '0 0 8px #10b981' : 'none' }} />
                    <span>{isPublished ? 'Live Published (Visible in Catalog)' : 'Draft Mode (Hidden from Public)'}</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
                    Published seasons and their episodes are visible to catalog visitors
                  </span>
                </div>

                <input
                  type="checkbox"
                  id="season_is_published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#10b981' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #23283b', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Info size={13} />
                  <span>Press <b>Ctrl+S</b> to save</span>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ background: '#141724', border: '1px solid #282e44', color: 'var(--foreground-secondary)', padding: '0.55rem 1.25rem', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setIsPublished(false);
                      setTimeout(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
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
                      gap: '0.4rem'
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
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 50);
                    }}
                    className={styles.createBtn}
                    style={{ padding: '0.55rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', fontWeight: 800 }}
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>{isPublished ? 'Save & Keep Published' : 'Publish Season (Live)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
