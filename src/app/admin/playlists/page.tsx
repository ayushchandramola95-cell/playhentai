'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Save, X, Check, RefreshCw, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import styles from '../admin.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
}

interface Playlist {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryTag?: string;
  gradient: string;
  seriesSlugs: string[];
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

  // Form State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategoryTag, setFormCategoryTag] = useState<string>('Featured');
  const [formGradient, setFormGradient] = useState<string>(PRESET_GRADIENTS[0]);
  const [formSeriesSlugs, setFormSeriesSlugs] = useState<string[]>([]);
  
  // Search and filter inside form series list picker
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
    setSeriesSearch('');
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setFormId(null);
  };

  const handleToggleSeriesInForm = (slug: string) => {
    if (formSeriesSlugs.includes(slug)) {
      setFormSeriesSlugs(formSeriesSlugs.filter(s => s !== slug));
    } else {
      setFormSeriesSlugs([...formSeriesSlugs, slug]);
    }
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

  // Filter series options dynamically based on form search query
  const filteredSeriesOptions = allSeries.filter((series) =>
    series.title.toLowerCase().includes(seriesSearch.toLowerCase()) ||
    series.slug.toLowerCase().includes(seriesSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinner} size={40} />
        <p>Loading curated playlists manager...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      {/* Title Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <Layers size={24} className={styles.headerIcon} />
          <h1>Curated Playlists & Collections</h1>
        </div>
        <p className={styles.description}>
          Create and manage thematic playlists to group series and boost internal linking SEO.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className={styles.alertSuccess}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className={styles.alertError}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      {!isEditing ? (
        <div className={styles.contentSection}>
          <div className={styles.sectionHeader}>
            <h2>Active Playlists ({playlists.length})</h2>
            <button onClick={handleOpenCreate} className={styles.saveBtn} style={{ padding: '8px 16px' }}>
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {playlists.map((playlist) => (
              <div key={playlist.id} className={styles.card} style={{ display: 'flex', flexDirection: 'column', minHeight: '180px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
                {/* Gradient Visual Preview */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: playlist.gradient }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px', background: 'var(--background-soft)', border: '1px solid var(--border-color)', fontWeight: 'semibold', color: 'var(--foreground-muted)' }}>
                    {playlist.categoryTag || 'Featured'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--foreground-muted)' }}>
                    {playlist.seriesSlugs.length} Series linked
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0 8px 0', color: 'var(--foreground-color)' }}>
                  {playlist.name}
                </h3>
                
                <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', flexGrow: 1, margin: '0 0 16px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {playlist.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', marginTop: 'auto' }}>
                  <button onClick={() => handleOpenEdit(playlist)} className={styles.saveBtn} style={{ background: 'var(--background-soft)', color: 'var(--foreground-color)', border: '1px solid var(--border-color)', padding: '6px 12px' }}>
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button onClick={() => handleDeletePlaylist(playlist.id, playlist.name)} className={styles.saveBtn} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px' }}>
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Edit/Create Form View */
        <form onSubmit={handleSavePlaylist} className={styles.card} style={{ marginTop: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <h2>{formId ? 'Edit Playlist' : 'Create New Playlist'}</h2>
            <button type="button" onClick={handleCancelForm} className={styles.closeBtn} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.inputGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'semibold' }}>Playlist Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Action Masterpieces"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={styles.textInput}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'semibold' }}>URL Slug *</label>
                <input
                  type="text"
                  placeholder="e.g. action-masterpieces"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className={styles.textInput}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'semibold' }}>Description Context (SEO Text) *</label>
                <textarea
                  placeholder="Provide curated description of themes, genres, and specific series included in this collection..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={styles.textInput}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'semibold' }}>Category Tag</label>
                <select
                  value={formCategoryTag}
                  onChange={(e) => setFormCategoryTag(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'var(--background-soft)', border: '1px solid var(--border-color)', color: 'var(--foreground-color)' }}
                >
                  {PRESET_TAGS.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'semibold' }}>Banner Background Gradient</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {PRESET_GRADIENTS.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormGradient(grad)}
                      style={{ height: '36px', background: grad, borderRadius: '4px', border: formGradient === grad ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Custom CSS Gradient..."
                  value={formGradient}
                  onChange={(e) => setFormGradient(e.target.value)}
                  className={styles.textInput}
                />
              </div>
            </div>

            {/* Right Series Picker Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'semibold', marginBottom: '4px' }}>
                  Link Series to Playlist ({formSeriesSlugs.length} selected)
                </label>
                <span style={{ fontSize: '12px', color: 'var(--foreground-muted)' }}>
                  Check series cards to include them inside this curated collection group.
                </span>
              </div>

              {/* Series Search input */}
              <input
                type="text"
                placeholder="Search series by title..."
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                className={styles.textInput}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />

              <div style={{ flexGrow: 1, maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--background-soft)' }}>
                {filteredSeriesOptions.length > 0 ? (
                  filteredSeriesOptions.map((series) => {
                    const isSelected = formSeriesSlugs.includes(series.slug);
                    return (
                      <div
                        key={series.id}
                        onClick={() => handleToggleSeriesInForm(series.slug)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '4px', border: '1px solid', borderColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent', background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                      >
                        <div style={{ width: '16px', height: '16px', borderRadius: '3px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#3b82f6' : 'var(--background-color)', borderColor: isSelected ? '#3b82f6' : 'var(--border-color)' }}>
                          {isSelected && <Check size={11} style={{ color: '#fff', strokeWidth: 3 }} />}
                        </div>
                        <span style={{ fontSize: '13px', color: isSelected ? 'var(--foreground-color)' : 'var(--foreground-muted)' }}>
                          {series.title}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--foreground-muted)', textAlign: 'center', padding: '20px' }}>
                    No series found.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', width: '100%' }}>
            <button
              type="button"
              onClick={handleCancelForm}
              className={styles.saveBtn}
              style={{ background: 'var(--background-soft)', color: 'var(--foreground-color)', border: '1px solid var(--border-color)', padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={styles.saveBtn}
              style={{ padding: '10px 20px' }}
            >
              {isSaving ? (
                <>
                  <RefreshCw className={styles.spinner} size={14} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Playlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
