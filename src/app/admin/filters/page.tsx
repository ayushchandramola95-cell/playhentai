'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Layers, Tv, AlertCircle, RefreshCw, GitMerge, X, Info, HelpCircle } from 'lucide-react';
import { GENRES, STUDIOS } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import styles from '../admin.module.css';

interface DatabaseItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export default function AdminFiltersPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'studios' | 'groupings'>('categories');
  
  // Data states
  const [categories, setCategories] = useState<DatabaseItem[]>([]);
  const [studios, setStudios] = useState<DatabaseItem[]>([]);
  const [groupings, setGroupings] = useState<DatabaseItem[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Merge modal states
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceSlugs, setMergeSourceSlugs] = useState<string[]>([]);
  const [mergeDestSlug, setMergeDestSlug] = useState<string>('');
  const [merging, setMerging] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Fetch categories (Genres)
      const catRes = await fetch('/api/admin/categories');
      const catData = await catRes.json();
      
      // 2. Fetch studios
      const studioRes = await fetch('/api/admin/studios');
      const studioData = await studioRes.json();

      // 3. Fetch custom groupings (Categories) from site settings
      const settingsRes = await fetch('/api/admin/settings');
      let resolvedGroupings: DatabaseItem[] = [];
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.global_site_categories) {
          try {
            const parsed = JSON.parse(settingsData.settings.global_site_categories);
            if (Array.isArray(parsed)) {
              resolvedGroupings = parsed;
            }
          } catch (e) {}
        }
      }

      // 4. Fetch Series for dynamic overlap diagnostic previews
      try {
        const { data: dbSeries } = await supabase
          .from('series')
          .select('id, title, slug, tags');
        if (dbSeries) {
          setSeriesList(dbSeries);
        }
      } catch (err) {
        console.error('Error fetching series for merge previews:', err);
      }

      // DB fallbacks
      let resolvedCats: DatabaseItem[] = [];
      let resolvedStudios: DatabaseItem[] = [];

      if (catRes.ok && catData.categories && catData.categories.length > 0) {
        resolvedCats = catData.categories;
      } else {
        resolvedCats = GENRES.map((g, idx) => ({ id: `mock-g-${idx}`, name: g, slug: g.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
      }

      if (studioRes.ok && studioData.studios && studioData.studios.length > 0) {
        resolvedStudios = studioData.studios;
      } else {
        resolvedStudios = STUDIOS.map((s, idx) => ({ id: `mock-s-${idx}`, name: s, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
      }

      setCategories(resolvedCats);
      setStudios(resolvedStudios);
      setGroupings(resolvedGroupings);
    } catch (err: any) {
      console.warn('DB Fetch failed, loading defaults:', err);
      setCategories(GENRES.map((g, idx) => ({ id: `mock-g-${idx}`, name: g, slug: g.toLowerCase().replace(/[^a-z0-9]+/g, '-') })));
      setStudios(STUDIOS.map((s, idx) => ({ id: `mock-s-${idx}`, name: s, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-') })));
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    setSlugInput(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !slugInput.trim()) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      name: nameInput.trim(),
      slug: slugInput.trim()
    };

    try {
      if (activeTab === 'groupings') {
        // Add new category grouping in settings configurations
        const newGroup = { id: `cat-${Date.now()}`, name: payload.name, slug: payload.slug };
        const updatedGroupings = [newGroup, ...groupings];
        
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              global_site_categories: JSON.stringify(updatedGroupings)
            }
          })
        });
        if (!res.ok) throw new Error('Failed to update categories settings.');
        
        setGroupings(updatedGroupings);
        setNameInput('');
        setSlugInput('');
      } else {
        const endpoint = activeTab === 'categories' ? '/api/admin/categories' : '/api/admin/studios';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save item');

        if (activeTab === 'categories') {
          setCategories(prev => [data.category, ...prev.filter(item => !item.id.startsWith('mock-'))]);
        } else {
          setStudios(prev => [data.studio, ...prev.filter(item => !item.id.startsWith('mock-'))]);
        }

        setNameInput('');
        setSlugInput('');
      }
    } catch (err: any) {
      setError(err.message);
      
      // Fallback local preview state update
      const fallbackItem: DatabaseItem = {
        id: `local-temp-${Date.now()}`,
        name: payload.name,
        slug: payload.slug
      };
      if (activeTab === 'categories') {
        setCategories(prev => [fallbackItem, ...prev]);
      } else if (activeTab === 'studios') {
        setStudios(prev => [fallbackItem, ...prev]);
      } else {
        setGroupings(prev => [fallbackItem, ...prev]);
      }
      setNameInput('');
      setSlugInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id.startsWith('mock-')) {
      alert('This is a default preset. Presets cannot be deleted until your live Supabase database is connected.');
      return;
    }

    if (activeTab === 'groupings') {
      if (!confirm(`Are you sure you want to delete Category "${name}"?`)) return;
      try {
        const updated = groupings.filter(item => item.id !== id);
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              global_site_categories: JSON.stringify(updated)
            }
          })
        });
        if (!res.ok) throw new Error('Failed to delete category.');
        setGroupings(updated);
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    const itemLabel = activeTab === 'categories' ? 'genre' : 'studio';
    if (!confirm(`Are you sure you want to delete this ${itemLabel} "${name}"? Any series associated with it will lose this tag reference.`)) return;

    try {
      const endpoint = activeTab === 'categories' ? `/api/admin/categories?id=${id}` : `/api/admin/studios?id=${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      if (activeTab === 'categories') {
        setCategories(prev => prev.filter(item => item.id !== id));
      } else {
        setStudios(prev => prev.filter(item => item.id !== id));
      }
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
      if (id.startsWith('local-temp-')) {
        if (activeTab === 'categories') {
          setCategories(prev => prev.filter(item => item.id !== id));
        } else {
          setStudios(prev => prev.filter(item => item.id !== id));
        }
      }
    }
  };

  const handleMergeGenres = async () => {
    if (mergeSourceSlugs.length === 0 || !mergeDestSlug) {
      alert('Please select at least one source genre to merge and one destination target.');
      return;
    }
    
    const countText = `${mergeSourceSlugs.length} genre(s)`;
    const destName = categories.find(c => c.slug === mergeDestSlug)?.name || mergeDestSlug;
    
    if (!confirm(`Are you sure you want to merge ${countText} into "${destName}"? This updates all series tags automatically and deletes the source genres. This action is permanent!`)) {
      return;
    }

    setMerging(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/genres/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSlugs: mergeSourceSlugs,
          destinationSlug: mergeDestSlug
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge execution failed.');

      alert(`Merge complete! Successfully merged ${data.deletedCount} genres into "${data.mergedInto}". ${data.affectedCount} series tags updated!`);
      
      // Clean up modal states
      setShowMergeModal(false);
      setMergeSourceSlugs([]);
      setMergeDestSlug('');
      setSourceSearch('');
      
      // Reload active data
      await fetchFilters();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMerging(false);
    }
  };

  const toggleSourceSelection = (slug: string) => {
    if (mergeSourceSlugs.includes(slug)) {
      setMergeSourceSlugs(prev => prev.filter(s => s !== slug));
    } else {
      setMergeSourceSlugs(prev => [...prev, slug]);
    }
  };

  // ADVANCED REAL-TIME MERGE STATS & DIAGNOSTICS CALCULATION
  const sourceNamesLower = categories
    .filter(c => mergeSourceSlugs.includes(c.slug))
    .map(c => c.name.toLowerCase().trim());
  
  const destGenreObj = categories.find(c => c.slug === mergeDestSlug);
  const destNameLower = destGenreObj ? destGenreObj.name.toLowerCase().trim() : '';
  const destNameFormatted = destGenreObj ? destGenreObj.name : '';

  // 1. Series gaining destination tag
  const seriesGainingTag = seriesList.filter(s => {
    const currentTags = (s.tags || []).map((t: string) => t.toLowerCase().trim());
    const hasSource = currentTags.some((t: string) => sourceNamesLower.includes(t));
    const hasDest = currentTags.includes(destNameLower);
    return hasSource && !hasDest;
  });

  // 2. Series with duplicate tag cleanup only (already has destination tag)
  const seriesWithDuplicateCleanup = seriesList.filter(s => {
    const currentTags = (s.tags || []).map((t: string) => t.toLowerCase().trim());
    const hasSource = currentTags.some((t: string) => sourceNamesLower.includes(t));
    const hasDest = currentTags.includes(destNameLower);
    return hasSource && hasDest;
  });

  const totalAffectedCount = seriesGainingTag.length + seriesWithDuplicateCleanup.length;

  const activeItems = activeTab === 'categories' 
    ? categories 
    : activeTab === 'studios' 
      ? studios 
      : groupings;

  return (
    <div className={styles.panelCard} style={{ position: 'relative' }}>
      <div className={styles.panelHeader} style={{ marginBottom: '2rem' }}>
        <div>
          <h2>Manage Taxonomy, Genres &amp; Studios</h2>
          <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Configure active series genres, target search tags, production studios, and categories groupings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {activeTab === 'categories' && categories.filter(c => !c.id.startsWith('mock-')).length > 0 && (
            <button 
              onClick={() => setShowMergeModal(true)} 
              className={styles.createBtn}
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.5rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
            >
              <GitMerge size={15} />
              <span>Merge Genres/Tags</span>
            </button>
          )}
          <button onClick={fetchFilters} className={styles.editActionBtn} title="Refresh lists" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('categories'); setError(null); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.2rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'categories' ? 'var(--primary)' : 'var(--foreground-secondary)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Layers size={16} />
          <span>Genres &amp; Tags ({categories.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('studios'); setError(null); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.2rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'studios' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'studios' ? 'var(--primary)' : 'var(--foreground-secondary)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Tv size={16} />
          <span>Production Studios ({studios.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('groupings'); setError(null); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 1.2rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'groupings' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'groupings' ? 'var(--primary)' : 'var(--foreground-secondary)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Tag size={16} />
          <span>Categories ({groupings.length})</span>
        </button>
      </div>

      {error && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Info notice about custom category groupings */}
      {activeTab === 'groupings' && (
        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.1rem' }} />
          <p style={{ fontSize: '0.82rem', color: 'var(--foreground-secondary)', lineHeight: 1.4 }}>
            <strong>Internal Taxonomy Preview:</strong> Manage custom grouping formats (e.g. Subbed, Dubbed, HD, Uncensored) for future layout updates. Currently, no series values are changed on your public pages.
          </p>
        </div>
      )}

      {/* Add New Item Form */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
        <h4 style={{ marginBottom: '1rem', fontWeight: 800 }}>
          Add New {activeTab === 'categories' ? 'Genre / Tag' : activeTab === 'studios' ? 'Production Studio' : 'Category'}
        </h4>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className={styles.formGroup} style={{ flex: 2, minWidth: '220px', marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Name</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder={activeTab === 'categories' ? "e.g. Tsundere" : activeTab === 'studios' ? "e.g. Studio Eromatick" : "e.g. Uncensored / Subbed"}
              value={nameInput}
              onChange={handleNameChange}
            />
          </div>

          <div className={styles.formGroup} style={{ flex: 2, minWidth: '220px', marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>URL Slug (auto-generated)</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder={activeTab === 'categories' ? "tsundere" : activeTab === 'studios' ? "studio-eromatick" : "uncensored-subbed"}
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting} className={styles.createBtn} style={{ height: '42px', padding: '0 1.5rem' }}>
            <Plus size={16} />
            <span>Create</span>
          </button>
        </form>
      </div>

      {/* List Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px', display: 'inline-block' }} />
        </div>
      ) : activeItems.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {activeItems.map((item) => (
            <div 
              key={item.id} 
              className="glass" 
              style={{ 
                padding: '0.8rem 1.2rem', 
                borderRadius: '8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: 'var(--shadow)'
              }}
            >
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>/{item.slug}</div>
              </div>
              <button 
                onClick={() => handleDelete(item.id, item.name)} 
                className={styles.deleteActionBtn} 
                title={`Delete ${item.name}`}
                style={{ padding: '0.4rem', borderRadius: '50%', flexShrink: 0 }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          No items found. Create your first item above!
        </div>
      )}

      {/* INTERACTIVE MERGE MODAL POPUP */}
      {showMergeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass" style={{
            width: '100%',
            maxWidth: '850px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '2rem',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GitMerge size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Merge Duplicate Genres &amp; Tags</h3>
              </div>
              <button 
                onClick={() => { setShowMergeModal(false); setMergeSourceSlugs([]); setMergeDestSlug(''); setSourceSearch(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--foreground-secondary)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginBottom: '1.5rem', lineHeight: 1.45 }}>
              Choose duplicate tags/genres to combine. All series matching the selected source terms will be updated to point to the destination genre, and source records will be deleted.
            </p>

            {/* Checkboxes List of Sources */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.55rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground-secondary)' }}>
                  1. Select Duplicates to Merge From (Sources)
                </label>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = categories.filter(c => 
                        !c.id.startsWith('mock-') && 
                        (sourceSearch === '' || 
                         c.name.toLowerCase().includes(sourceSearch.toLowerCase()) || 
                         c.slug.toLowerCase().includes(sourceSearch.toLowerCase()))
                      );
                      const filteredSlugs = filtered.map(c => c.slug);
                      setMergeSourceSlugs(prev => Array.from(new Set([...prev, ...filteredSlugs])));
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                  >
                    Select All Filtered
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--border)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setMergeSourceSlugs([])}
                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Source Tags Search Input */}
              <div style={{ marginBottom: '0.8rem', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Type to filter list (e.g. ahegao, 3d)..."
                  className={styles.inputField}
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.8rem', fontSize: '0.82rem' }}
                />
                {sourceSearch && (
                  <button
                    type="button"
                    onClick={() => setSourceSearch('')}
                    style={{ 
                      position: 'absolute', 
                      right: '0.65rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--foreground-muted)', 
                      cursor: 'pointer', 
                      padding: '0.2rem' 
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <div style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1rem',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.6rem'
              }}>
                {categories
                  .filter(c => 
                    !c.id.startsWith('mock-') && 
                    (sourceSearch === '' || 
                     c.name.toLowerCase().includes(sourceSearch.toLowerCase()) || 
                     c.slug.toLowerCase().includes(sourceSearch.toLowerCase()))
                  )
                  .map(c => (
                    <label 
                      key={c.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        fontSize: '0.82rem', 
                        cursor: 'pointer',
                        color: mergeSourceSlugs.includes(c.slug) ? '#ffffff' : 'var(--foreground-secondary)'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={mergeSourceSlugs.includes(c.slug)}
                        onChange={() => toggleSourceSelection(c.slug)}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                      />
                      <span>{c.name} <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)' }}>/{c.slug}</span></span>
                    </label>
                  ))}
                {categories.filter(c => 
                  !c.id.startsWith('mock-') && 
                  (sourceSearch === '' || 
                   c.name.toLowerCase().includes(sourceSearch.toLowerCase()) || 
                   c.slug.toLowerCase().includes(sourceSearch.toLowerCase()))
                ).length === 0 && (
                  <span style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--foreground-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                    No genres match your search query.
                  </span>
                )}
              </div>

              {/* Selected tags list summary tray */}
              {mergeSourceSlugs.length > 0 && (
                <div style={{ marginTop: '0.8rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.45rem' }}>
                    Selected Source Tags ({mergeSourceSlugs.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {mergeSourceSlugs.map(slug => {
                      const name = categories.find(c => c.slug === slug)?.name || slug;
                      return (
                        <span 
                          key={slug} 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem', 
                            fontSize: '0.75rem', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            color: 'var(--primary)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 600
                          }}
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => setMergeSourceSlugs(prev => prev.filter(s => s !== slug))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown Select Destination */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.6rem', color: 'var(--foreground-secondary)' }}>
                2. Select Target Genre to Merge Into (Destination)
              </label>
              <select
                className={styles.inputField}
                value={mergeDestSlug}
                onChange={(e) => setMergeDestSlug(e.target.value)}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                <option value="">-- Choose destination genre --</option>
                {categories
                  .filter(c => !c.id.startsWith('mock-') && !mergeSourceSlugs.includes(c.slug))
                  .map(c => (
                    <option key={c.id} value={c.slug}>
                      {c.name} (/{c.slug})
                    </option>
                  ))}
              </select>
            </div>

            {/* ADVANCED STATS DIAGNOSTICS DISPLAY PANEL */}
            {mergeSourceSlugs.length > 0 && mergeDestSlug && (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--border)', 
                borderRadius: '12px', 
                padding: '1.2rem', 
                marginBottom: '1.5rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <Info size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-primary)' }}>
                    Merge Impact Diagnostics
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '120px', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-secondary)', display: 'block' }}>Affected Series</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: totalAffectedCount > 0 ? 'var(--primary)' : 'var(--foreground-muted)' }}>{totalAffectedCount}</span>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '120px', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-secondary)', display: 'block' }}>Gains "{destNameFormatted}" tag</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>{seriesGainingTag.length}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: '120px', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--foreground-secondary)', display: 'block' }}>Duplicate Cleanup Only</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b' }}>{seriesWithDuplicateCleanup.length}</span>
                  </div>
                </div>

                {/* Collapsible Details lists */}
                {totalAffectedCount > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {seriesGainingTag.length > 0 && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>
                          Show Series Gaining Tag ({seriesGainingTag.length})
                        </summary>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem', paddingLeft: '0.5rem' }}>
                          {seriesGainingTag.map(s => (
                            <span key={s.id} style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                              {s.title}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}

                    {seriesWithDuplicateCleanup.length > 0 && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', fontWeight: 700 }}>
                          Show Series with Duplicate Cleanup ({seriesWithDuplicateCleanup.length})
                        </summary>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem', paddingLeft: '0.5rem' }}>
                          {seriesWithDuplicateCleanup.map(s => (
                            <span key={s.id} style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                              {s.title}
                            </span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                    No series found containing any of the selected source tags. Tag records will be deleted with zero affected show rows.
                  </span>
                )}
              </div>
            )}

            {/* Actions panel */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
              <button
                type="button"
                onClick={() => { setShowMergeModal(false); setMergeSourceSlugs([]); setMergeDestSlug(''); setSourceSearch(''); }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground-primary)',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeGenres}
                disabled={merging || mergeSourceSlugs.length === 0 || !mergeDestSlug}
                className={styles.createBtn}
                style={{
                  padding: '0.6rem 1.8rem',
                  fontSize: '0.88rem',
                  gap: '0.5rem'
                }}
              >
                {merging ? (
                  <>
                    <RefreshCw className="animate-spin" size={15} />
                    <span>Merging Tags...</span>
                  </>
                ) : (
                  <>
                    <GitMerge size={15} />
                    <span>Execute Merge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
