'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Tag, Plus, Trash2, Layers, Tv, AlertCircle, RefreshCw, GitMerge, 
  X, Info, Search, Edit3, ExternalLink, Check, Copy, CheckSquare, 
  Square, ArrowUpDown, Filter, Sparkles, Download, Eye, ArrowRight,
  List, Grid, FileText, CheckCircle2, SlidersHorizontal, HelpCircle
} from 'lucide-react';
import { GENRES, STUDIOS } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '../admin.module.css';
import styles from './filters.module.css';

interface DatabaseItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  tags?: string[];
  studio?: string;
  poster_image_key?: string;
}

export default function AdminFiltersPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'studios' | 'groupings'>('categories');
  
  // Data states
  const [categories, setCategories] = useState<DatabaseItem[]>([]);
  const [studios, setStudios] = useState<DatabaseItem[]>([]);
  const [groupings, setGroupings] = useState<DatabaseItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search, Filter, Sort & Alphabet Jump States
  const [searchQuery, setSearchQuery] = useState('');
  const [alphaFilter, setAlphaFilter] = useState<string>('ALL');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'usage_desc' | 'usage_asc'>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Creation & Bulk Import States
  const [createMode, setCreateMode] = useState<'single' | 'bulk'>('single');
  const [nameInput, setNameInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Edit / Rename Modal States
  const [editingItem, setEditingItem] = useState<DatabaseItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCascade, setEditCascade] = useState(true);
  const [editingSaving, setEditingSaving] = useState(false);

  // Tagged Series Inspector Modal
  const [inspectItem, setInspectItem] = useState<{ item: DatabaseItem; type: 'categories' | 'studios' } | null>(null);

  // Merge Modal States
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceSlugs, setMergeSourceSlugs] = useState<string[]>([]);
  const [mergeDestSlug, setMergeDestSlug] = useState<string>('');
  const [merging, setMerging] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');

  // Duplicate Cleaner Modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, []);

  // Clear selection on tab change
  useEffect(() => {
    setSelectedIds([]);
    setSearchQuery('');
    setAlphaFilter('ALL');
  }, [activeTab]);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Fetch categories (Genres/Tags)
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

      // 4. Fetch Series for dynamic usage counting and merge previews
      try {
        const { data: dbSeries } = await supabase
          .from('series')
          .select('id, title, slug, tags, studio, poster_image_key');
        if (dbSeries) {
          setSeriesList(dbSeries);
        }
      } catch (err) {
        console.error('Error fetching series for taxonomy usage:', err);
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

  // Helper: Get series count for an item
  const getItemUsageCount = (item: DatabaseItem, type = activeTab): number => {
    if (type === 'categories') {
      const targetNameLower = item.name.toLowerCase().trim();
      return seriesList.filter(s => 
        (s.tags || []).some((t: string) => t.toLowerCase().trim() === targetNameLower)
      ).length;
    }
    if (type === 'studios') {
      const targetNameLower = item.name.toLowerCase().trim();
      return seriesList.filter(s => 
        s.studio && s.studio.toLowerCase().trim() === targetNameLower
      ).length;
    }
    return 0;
  };

  // Helper: Get list of series tagged with an item
  const getTaggedSeries = (item: DatabaseItem, type = activeTab): SeriesItem[] => {
    if (type === 'categories') {
      const targetNameLower = item.name.toLowerCase().trim();
      return seriesList.filter(s => 
        (s.tags || []).some((t: string) => t.toLowerCase().trim() === targetNameLower)
      );
    }
    if (type === 'studios') {
      const targetNameLower = item.name.toLowerCase().trim();
      return seriesList.filter(s => 
        s.studio && s.studio.toLowerCase().trim() === targetNameLower
      );
    }
    return [];
  };

  // Detect Potential Duplicates / Near-Matches
  const detectedDuplicates = useMemo(() => {
    const dups: { canonical: DatabaseItem; duplicates: DatabaseItem[] }[] = [];
    const normalizedMap = new Map<string, DatabaseItem[]>();

    categories.forEach(cat => {
      // Normalize: strip non-alphanumeric, lowercase
      const norm = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalizedMap.has(norm)) {
        normalizedMap.set(norm, []);
      }
      normalizedMap.get(norm)!.push(cat);
    });

    normalizedMap.forEach((items) => {
      if (items.length > 1) {
        // Pick the one with highest series usage or the shortest name as canonical
        const sorted = [...items].sort((a, b) => {
          const aCount = getItemUsageCount(a, 'categories');
          const bCount = getItemUsageCount(b, 'categories');
          if (bCount !== aCount) return bCount - aCount;
          return a.name.length - b.name.length;
        });
        dups.push({
          canonical: sorted[0],
          duplicates: sorted.slice(1)
        });
      }
    });

    return dups;
  }, [categories, seriesList]);

  // Current Active Raw Items
  const activeItems = activeTab === 'categories' 
    ? categories 
    : activeTab === 'studios' 
      ? studios 
      : groupings;

  // Filtered & Sorted Items
  const processedItems = useMemo(() => {
    return activeItems
      .filter(item => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.name.toLowerCase().includes(q);
          const matchSlug = item.slug.toLowerCase().includes(q);
          if (!matchName && !matchSlug) return false;
        }

        // 2. Alphabet Filter
        if (alphaFilter !== 'ALL') {
          const firstChar = item.name.trim().charAt(0).toUpperCase();
          if (alphaFilter === '#') {
            if (/[A-Z]/.test(firstChar)) return false;
          } else {
            if (firstChar !== alphaFilter) return false;
          }
        }

        // 3. Usage Status Filter
        if (usageFilter !== 'all' && activeTab !== 'groupings') {
          const count = getItemUsageCount(item);
          if (usageFilter === 'used' && count === 0) return false;
          if (usageFilter === 'unused' && count > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (sortBy === 'usage_desc') {
          return getItemUsageCount(b) - getItemUsageCount(a);
        }
        if (sortBy === 'usage_asc') {
          return getItemUsageCount(a) - getItemUsageCount(b);
        }
        return 0;
      });
  }, [activeItems, searchQuery, alphaFilter, usageFilter, sortBy, activeTab, seriesList]);

  // Alphabetical Index Counts
  const alphabetCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: activeItems.length, '#': 0 };
    for (let i = 65; i <= 90; i++) {
      counts[String.fromCharCode(i)] = 0;
    }
    activeItems.forEach(item => {
      const first = item.name.trim().charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) {
        counts[first] = (counts[first] || 0) + 1;
      } else {
        counts['#'] = (counts['#'] || 0) + 1;
      }
    });
    return counts;
  }, [activeItems]);

  // Add Single Item
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !slugInput.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: nameInput.trim(),
      slug: slugInput.trim()
    };

    try {
      if (activeTab === 'groupings') {
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
        setSuccessMsg(`Created category "${payload.name}" successfully.`);
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
          setSuccessMsg(`Created genre "${payload.name}" successfully.`);
        } else {
          setStudios(prev => [data.studio, ...prev.filter(item => !item.id.startsWith('mock-'))]);
          setSuccessMsg(`Created studio "${payload.name}" successfully.`);
        }

        setNameInput('');
        setSlugInput('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk / Batch Import Items
  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Parse comma, newline or TSV separated names
      const rawLines = bulkInput
        .split(/[\n,]+/)
        .map(line => line.trim())
        .filter(Boolean);

      // Deduplicate & generate valid slugs
      const uniqueNames = Array.from(new Set(rawLines));
      const itemsToInsert = uniqueNames.map(name => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      }));

      if (itemsToInsert.length === 0) {
        throw new Error('No valid items found in the input.');
      }

      if (activeTab === 'groupings') {
        const newGroups = itemsToInsert.map(item => ({ id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, ...item }));
        const updated = [...newGroups, ...groupings];
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { global_site_categories: JSON.stringify(updated) }
          })
        });
        if (!res.ok) throw new Error('Failed to batch save categories.');
        setGroupings(updated);
      } else {
        const endpoint = activeTab === 'categories' ? '/api/admin/categories' : '/api/admin/studios';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToInsert })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Batch import failed');

        await fetchFilters();
      }

      setSuccessMsg(`Batch import complete! Added ${itemsToInsert.length} ${activeTab === 'categories' ? 'genres' : 'studios'}.`);
      setBulkInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Single Item
  const handleDelete = async (id: string, name: string) => {
    if (id.startsWith('mock-')) {
      alert('This is a default preset.');
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
            settings: { global_site_categories: JSON.stringify(updated) }
          })
        });
        if (!res.ok) throw new Error('Failed to delete category.');
        setGroupings(updated);
        setSuccessMsg(`Deleted category "${name}".`);
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    const itemLabel = activeTab === 'categories' ? 'genre' : 'studio';
    const usage = getItemUsageCount({ id, name, slug: '' });
    const usageWarning = usage > 0 ? `\n\n⚠️ NOTE: ${usage} series in your catalog are currently tagged with this ${itemLabel}!` : '';

    if (!confirm(`Are you sure you want to delete "${name}"?${usageWarning}`)) return;

    try {
      const endpoint = activeTab === 'categories' ? `/api/admin/categories?id=${id}` : `/api/admin/studios?id=${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      if (activeTab === 'categories') {
        setCategories(prev => prev.filter(item => item.id !== id));
      } else {
        setStudios(prev => prev.filter(item => item.id !== id));
      }
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      setSuccessMsg(`Deleted ${itemLabel} "${name}".`);
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const itemLabel = activeTab === 'categories' ? 'genres' : activeTab === 'studios' ? 'studios' : 'categories';
    
    if (!confirm(`Are you sure you want to delete all ${count} selected ${itemLabel}? This action cannot be undone!`)) {
      return;
    }

    try {
      if (activeTab === 'groupings') {
        const updated = groupings.filter(item => !selectedIds.includes(item.id));
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { global_site_categories: JSON.stringify(updated) }
          })
        });
        if (!res.ok) throw new Error('Failed to delete categories.');
        setGroupings(updated);
      } else {
        const endpoint = activeTab === 'categories' 
          ? `/api/admin/categories?ids=${selectedIds.join(',')}` 
          : `/api/admin/studios?ids=${selectedIds.join(',')}`;
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (!res.ok) throw new Error('Bulk delete failed');

        if (activeTab === 'categories') {
          setCategories(prev => prev.filter(item => !selectedIds.includes(item.id)));
        } else {
          setStudios(prev => prev.filter(item => !selectedIds.includes(item.id)));
        }
      }

      setSelectedIds([]);
      setSuccessMsg(`Successfully deleted ${count} ${itemLabel}.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Quick Edit / Rename
  const handleOpenEdit = (item: DatabaseItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditCascade(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim() || !editSlug.trim()) return;

    setEditingSaving(true);
    setError(null);

    try {
      if (activeTab === 'groupings') {
        const updated = groupings.map(item => 
          item.id === editingItem.id ? { ...item, name: editName.trim(), slug: editSlug.trim() } : item
        );
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { global_site_categories: JSON.stringify(updated) }
          })
        });
        if (!res.ok) throw new Error('Failed to update category.');
        setGroupings(updated);
      } else {
        const endpoint = activeTab === 'categories' ? '/api/admin/categories' : '/api/admin/studios';
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            name: editName.trim(),
            slug: editSlug.trim(),
            oldName: editingItem.name,
            cascadeSeries: editCascade
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update');

        if (activeTab === 'categories') {
          setCategories(prev => prev.map(item => item.id === editingItem.id ? data.category : item));
        } else {
          setStudios(prev => prev.map(item => item.id === editingItem.id ? data.studio : item));
        }

        if (data.affectedSeriesCount > 0) {
          // Refresh series list for updated tags
          const supabase = createClient();
          const { data: dbSeries } = await supabase.from('series').select('id, title, slug, tags, studio, poster_image_key');
          if (dbSeries) setSeriesList(dbSeries);
        }
      }

      setSuccessMsg(`Updated "${editName.trim()}" successfully.`);
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditingSaving(false);
    }
  };

  // Execute Merge
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

      setSuccessMsg(`Merge complete! Successfully merged ${data.deletedCount} genres into "${data.mergedInto}". ${data.affectedCount} series tags updated!`);
      
      setShowMergeModal(false);
      setMergeSourceSlugs([]);
      setMergeDestSlug('');
      setSourceSearch('');
      
      await fetchFilters();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMerging(false);
    }
  };

  // Toggle selection for bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === processedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedItems.map(item => item.id));
    }
  };

  // Copy slug helper
  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1800);
  };

  // Export Selected or All
  const handleExportData = () => {
    const exportList = selectedIds.length > 0 
      ? activeItems.filter(item => selectedIds.includes(item.id))
      : processedItems;
    
    const jsonStr = JSON.stringify(exportList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate Real-time Merge Diagnostic Stats
  const sourceNamesLower = categories
    .filter(c => mergeSourceSlugs.includes(c.slug))
    .map(c => c.name.toLowerCase().trim());
  
  const destGenreObj = categories.find(c => c.slug === mergeDestSlug);
  const destNameLower = destGenreObj ? destGenreObj.name.toLowerCase().trim() : '';

  const seriesGainingTag = seriesList.filter(s => {
    const currentTags = (s.tags || []).map((t: string) => t.toLowerCase().trim());
    const hasSource = currentTags.some((t: string) => sourceNamesLower.includes(t));
    const hasDest = currentTags.includes(destNameLower);
    return hasSource && !hasDest;
  });

  const seriesWithDuplicateCleanup = seriesList.filter(s => {
    const currentTags = (s.tags || []).map((t: string) => t.toLowerCase().trim());
    const hasSource = currentTags.some((t: string) => sourceNamesLower.includes(t));
    const hasDest = currentTags.includes(destNameLower);
    return hasSource && hasDest;
  });

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.panelCard}>
        {/* Panel Header */}
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>
              <Layers size={24} style={{ color: 'var(--primary)' }} />
              <span>Manage Taxonomy, Genres &amp; Studios</span>
            </h2>
            <p className={styles.panelSubtitle}>
              Configure active series genres, target search tags, production studios, and custom category groupings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {detectedDuplicates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDuplicateModal(true)}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Sparkles size={14} />
                <span>Clean Duplicates ({detectedDuplicates.length})</span>
              </button>
            )}

            <button 
              onClick={() => {
                if (selectedIds.length > 0) {
                  const selectedSlugs = activeItems
                    .filter(item => selectedIds.includes(item.id))
                    .map(item => item.slug);
                  setMergeSourceSlugs(selectedSlugs);
                }
                setShowMergeModal(true);
              }} 
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
              }}
            >
              <GitMerge size={15} />
              <span>Merge Studio</span>
            </button>

            <button
              onClick={handleExportData}
              title="Export Taxonomy JSON"
              style={{
                background: '#121624',
                border: '1px solid #23283b',
                color: '#cbd5e1',
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Download size={14} />
              <span>Export</span>
            </button>

            <button 
              onClick={fetchFilters} 
              title="Refresh lists" 
              style={{
                background: '#121624',
                border: '1px solid #23283b',
                color: '#94a3b8',
                padding: '0.5rem',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Top Stats Overview Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd' }}>
              <Layers size={20} />
            </div>
            <div>
              <div className={styles.statValue}>{categories.length}</div>
              <div className={styles.statLabel}>
                Genres &amp; Tags ({categories.filter(c => getItemUsageCount(c, 'categories') > 0).length} in use)
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}>
              <Tv size={20} />
            </div>
            <div>
              <div className={styles.statValue}>{studios.length}</div>
              <div className={styles.statLabel}>
                Studios ({studios.filter(s => getItemUsageCount(s, 'studios') > 0).length} in use)
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
              <Tag size={20} />
            </div>
            <div>
              <div className={styles.statValue}>{groupings.length}</div>
              <div className={styles.statLabel}>Custom Groupings</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <FilmIcon size={20} />
            </div>
            <div>
              <div className={styles.statValue}>{seriesList.length}</div>
              <div className={styles.statLabel}>Total Series Grounded</div>
            </div>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className={styles.tabsStrip}>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.tabBtnActive : ''}`}
          >
            <Layers size={16} />
            <span>Genres &amp; Tags</span>
            <span className={styles.tabCountBadge}>{categories.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('studios')}
            className={`${styles.tabBtn} ${activeTab === 'studios' ? styles.tabBtnActive : ''}`}
          >
            <Tv size={16} />
            <span>Production Studios</span>
            <span className={styles.tabCountBadge}>{studios.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groupings')}
            className={`${styles.tabBtn} ${activeTab === 'groupings' ? styles.tabBtnActive : ''}`}
          >
            <Tag size={16} />
            <span>Categories &amp; Groupings</span>
            <span className={styles.tabCountBadge}>{groupings.length}</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className={adminStyles.errorAlert} style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Add & Batch Import System */}
        <div className={styles.createCard}>
          <div className={styles.createCardHeader}>
            <h4 className={styles.createTitle}>
              <Plus size={17} style={{ color: 'var(--primary)' }} />
              <span>Add {activeTab === 'categories' ? 'Genre / Tag' : activeTab === 'studios' ? 'Production Studio' : 'Category'}</span>
            </h4>

            <div className={styles.toggleModePill}>
              <button
                type="button"
                onClick={() => setCreateMode('single')}
                className={`${styles.toggleModeBtn} ${createMode === 'single' ? styles.toggleModeBtnActive : ''}`}
              >
                Single Item
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('bulk')}
                className={`${styles.toggleModeBtn} ${createMode === 'bulk' ? styles.toggleModeBtnActive : ''}`}
              >
                ⚡ Batch Import
              </button>
            </div>
          </div>

          {createMode === 'single' ? (
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 220px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Name</label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'categories' ? "e.g. Tsundere" : activeTab === 'studios' ? "e.g. Studio Eromatick" : "e.g. Uncensored"}
                  value={nameInput}
                  onChange={handleNameChange}
                  style={{ width: '100%', background: '#0d101b', border: '1px solid #23283b', borderRadius: '8px', padding: '0.55rem 0.85rem', color: '#f8fafc', fontSize: '0.84rem', outline: 'none' }}
                />
              </div>

              <div style={{ flex: '2 1 220px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>URL Slug (Auto-Generated)</label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'categories' ? "tsundere" : activeTab === 'studios' ? "studio-eromatick" : "uncensored"}
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  style={{ width: '100%', background: '#0d101b', border: '1px solid #23283b', borderRadius: '8px', padding: '0.55rem 0.85rem', color: '#f8fafc', fontSize: '0.84rem', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  height: '38px',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                }}
              >
                <Plus size={16} />
                <span>{submitting ? 'Creating...' : 'Create'}</span>
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                Paste names separated by commas, newlines, or TSV rows. Slugs and deduplication are handled automatically.
              </p>
              <textarea
                placeholder={activeTab === 'categories' ? "Milf\nNetorare\nBig Boobs\nYandere\nTentacles" : "PoRo\nPink Pineapple\nBunnywalker\nMS Pictures"}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '80px',
                  background: '#0d101b',
                  border: '1px solid #23283b',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setBulkInput('')}
                  style={{ background: '#181d2e', border: '1px solid #23283b', color: '#94a3b8', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={submitting || !bulkInput.trim()}
                  onClick={handleBulkImport}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.45rem 1.4rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Sparkles size={14} />
                  <span>{submitting ? 'Importing...' : 'Batch Insert Items'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar: Search, Filters, A-Z Jump, Sort & View Mode */}
        <div className={styles.toolbarCard}>
          {/* Row 1: Search, Usage Status Filter, Sorting & View Toggle */}
          <div className={styles.toolbarRow}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search ${activeItems.length} ${activeTab === 'categories' ? 'genres & tags' : activeTab === 'studios' ? 'studios' : 'categories'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className={styles.searchClearBtn}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Usage Filter */}
              {activeTab !== 'groupings' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0d101b', border: '1px solid #23283b', padding: '0.2rem', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setUsageFilter('all')}
                    style={{
                      background: usageFilter === 'all' ? '#1e263d' : 'transparent',
                      color: usageFilter === 'all' ? '#f8fafc' : '#94a3b8',
                      border: 'none',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All ({activeItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsageFilter('used')}
                    style={{
                      background: usageFilter === 'used' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: usageFilter === 'used' ? '#34d399' : '#94a3b8',
                      border: 'none',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    In Use ({activeItems.filter(i => getItemUsageCount(i) > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsageFilter('unused')}
                    style={{
                      background: usageFilter === 'unused' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: usageFilter === 'unused' ? '#fbbf24' : '#94a3b8',
                      border: 'none',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Unused ({activeItems.filter(i => getItemUsageCount(i) === 0).length})
                  </button>
                </div>
              )}

              {/* Sorting Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    background: '#0d101b',
                    border: '1px solid #23283b',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                  <option value="usage_desc">Most Series (Popular)</option>
                  <option value="usage_asc">Fewest Series</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: '#0d101b', border: '1px solid #23283b', padding: '0.15rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? '#7c3aed' : 'transparent',
                    color: viewMode === 'grid' ? 'white' : '#94a3b8',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Grid Cards"
                >
                  <Grid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    background: viewMode === 'table' ? '#7c3aed' : 'transparent',
                    color: viewMode === 'table' ? 'white' : '#94a3b8',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Compact Table"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Alphabet Quick Jump Bar */}
          <div className={styles.alphaBar}>
            <button
              type="button"
              onClick={() => setAlphaFilter('ALL')}
              className={`${styles.alphaBtn} ${alphaFilter === 'ALL' ? styles.alphaBtnActive : ''}`}
            >
              All ({alphabetCounts['ALL'] || 0})
            </button>
            <button
              type="button"
              onClick={() => setAlphaFilter('#')}
              className={`${styles.alphaBtn} ${alphaFilter === '#' ? styles.alphaBtnActive : ''}`}
            >
              # ({alphabetCounts['#'] || 0})
            </button>
            {Object.keys(alphabetCounts)
              .filter(k => k !== 'ALL' && k !== '#')
              .map(letter => {
                const count = alphabetCounts[letter] || 0;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setAlphaFilter(letter)}
                    className={`${styles.alphaBtn} ${alphaFilter === letter ? styles.alphaBtnActive : ''}`}
                    style={count === 0 ? { opacity: 0.35 } : {}}
                  >
                    {letter}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Selection / Quick Action Sub-bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={selectAllFiltered}
              style={{ background: 'transparent', border: 'none', color: '#c4b5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700 }}
            >
              {selectedIds.length === processedItems.length && processedItems.length > 0 ? (
                <>
                  <CheckSquare size={15} />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square size={15} />
                  <span>Select All Filtered ({processedItems.length})</span>
                </>
              )}
            </button>
          </div>

          <div>
            Showing <b style={{ color: '#f8fafc' }}>{processedItems.length}</b> of {activeItems.length} items
          </div>
        </div>

        {/* Main Content: Grid vs Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading taxonomy data...</div>
          </div>
        ) : processedItems.length > 0 ? (
          viewMode === 'grid' ? (
            /* Grid View */
            <div className={styles.itemsGrid}>
              {processedItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const usageCount = getItemUsageCount(item);
                const isCopied = copiedSlug === item.slug;

                return (
                  <div 
                    key={item.id} 
                    className={`${styles.itemCard} ${isSelected ? styles.itemCardSelected : ''}`}
                  >
                    <div className={styles.itemCardTop}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.itemName} title={item.name}>{item.name}</div>
                          <div className={styles.itemSlug}>
                            <span>/{item.slug}</span>
                            <button
                              type="button"
                              onClick={() => copySlug(item.slug)}
                              style={{ background: 'transparent', border: 'none', color: isCopied ? '#10b981' : '#64748b', cursor: 'pointer', padding: '0.1rem' }}
                              title="Copy Slug"
                            >
                              {isCopied ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemMetaRow}>
                      {/* Usage Badge (Clickable to inspect tagged series) */}
                      {activeTab !== 'groupings' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (usageCount > 0) {
                              setInspectItem({ item, type: activeTab === 'categories' ? 'categories' : 'studios' });
                            }
                          }}
                          className={`${styles.seriesCountBadge} ${usageCount > 0 ? styles.seriesCountActive : styles.seriesCountZero}`}
                          style={{ cursor: usageCount > 0 ? 'pointer' : 'default', border: 'none' }}
                          title={usageCount > 0 ? `Click to view ${usageCount} tagged series` : 'Not assigned to any series'}
                        >
                          <Tv size={11} />
                          <span>{usageCount} {usageCount === 1 ? 'Series' : 'Series'}</span>
                        </button>
                      ) : (
                        <span className={styles.seriesCountBadge} style={{ background: '#181d2e', color: '#94a3b8' }}>
                          Custom Grouping
                        </span>
                      )}

                      {/* Card Action Buttons */}
                      <div className={styles.cardActionGroup}>
                        {activeTab !== 'groupings' && (
                          <Link
                            href={activeTab === 'categories' ? `/genre/${item.slug}` : `/studio/${item.slug}`}
                            target="_blank"
                            className={styles.iconBtn}
                            title="View Public Catalog Page"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className={styles.iconBtn}
                          title="Rename / Edit"
                        >
                          <Edit3 size={12} />
                        </button>

                        {activeTab === 'categories' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMergeSourceSlugs([item.slug]);
                              setShowMergeModal(true);
                            }}
                            className={styles.iconBtn}
                            title="Merge this tag into another"
                          >
                            <GitMerge size={12} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.name)}
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          title="Delete item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0a0d16', borderBottom: '1px solid #23283b', color: '#94a3b8', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === processedItems.length && processedItems.length > 0}
                        onChange={selectAllFiltered}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </th>
                    <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>URL Slug</th>
                    {activeTab !== 'groupings' && <th style={{ padding: '0.75rem 1rem' }}>Series Usage</th>}
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedItems.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const usageCount = getItemUsageCount(item);

                    return (
                      <tr 
                        key={item.id} 
                        style={{ borderBottom: '1px solid #1a2033', background: isSelected ? 'rgba(124, 58, 237, 0.06)' : 'transparent' }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#f8fafc' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>
                          /{item.slug}
                        </td>
                        {activeTab !== 'groupings' && (
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (usageCount > 0) {
                                  setInspectItem({ item, type: activeTab === 'categories' ? 'categories' : 'studios' });
                                }
                              }}
                              className={`${styles.seriesCountBadge} ${usageCount > 0 ? styles.seriesCountActive : styles.seriesCountZero}`}
                              style={{ border: 'none', cursor: usageCount > 0 ? 'pointer' : 'default' }}
                            >
                              {usageCount} Series
                            </button>
                          </td>
                        )}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className={styles.iconBtn}
                              title="Edit"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.name)}
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#121624', borderRadius: '12px', border: '1px dashed #23283b' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: '#c4b5fd' }}>
              <Search size={22} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.35rem 0' }}>No items match your filter</h4>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '360px', margin: '0 auto 1rem auto' }}>
              Try adjusting your search query, alphabetical letter filter, or usage filter.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setAlphaFilter('ALL'); setUsageFilter('all'); }}
              style={{ background: '#1e263d', border: '1px solid #3b4566', color: '#f8fafc', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ background: '#7c3aed', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
              Bulk actions available for active selection
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {activeTab === 'categories' && (
              <button
                type="button"
                onClick={() => {
                  const selectedSlugs = activeItems
                    .filter(item => selectedIds.includes(item.id))
                    .map(item => item.slug);
                  setMergeSourceSlugs(selectedSlugs);
                  setShowMergeModal(true);
                }}
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <GitMerge size={14} />
                <span>Merge Selected ({selectedIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBulkDelete}
              style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Trash2 size={14} />
              <span>Bulk Delete ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              onClick={handleExportData}
              style={{ background: '#1a2033', border: '1px solid #2e3752', color: '#cbd5e1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '0.45rem', cursor: 'pointer' }}
              title="Deselect all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit / Rename Modal */}
      {editingItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} style={{ color: 'var(--primary)' }} />
                <span>Edit {activeTab === 'categories' ? 'Genre / Tag' : activeTab === 'studios' ? 'Studio' : 'Category'}</span>
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                  }}
                  style={{ width: '100%', background: '#0a0d16', border: '1px solid #23283b', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>URL Slug</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  style={{ width: '100%', background: '#0a0d16', border: '1px solid #23283b', borderRadius: '8px', padding: '0.6rem 0.85rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              {activeTab !== 'groupings' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#121624', padding: '0.75rem', borderRadius: '8px', border: '1px solid #23283b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editCascade}
                    onChange={(e) => setEditCascade(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <strong>Cascade Update:</strong> Automatically rename all references across {getItemUsageCount(editingItem)} series in your catalog.
                  </span>
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ background: '#181d2e', border: '1px solid #23283b', color: '#94a3b8', padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editingSaving || !editName.trim()}
                  onClick={handleSaveEdit}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1.45rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {editingSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tagged Series Inspector Modal */}
      {inspectItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tv size={18} style={{ color: 'var(--primary)' }} />
                  <span>Series Tagged with &ldquo;{inspectItem.item.name}&rdquo;</span>
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  Total {getTaggedSeries(inspectItem.item, inspectItem.type).length} Series found in your database
                </span>
              </div>
              <button type="button" onClick={() => setInspectItem(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {getTaggedSeries(inspectItem.item, inspectItem.type).map(s => (
                <div 
                  key={s.id}
                  style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>/{s.slug}</div>
                  </div>
                  <Link
                    href={`/admin/series?edit=${s.id}`}
                    target="_blank"
                    style={{ background: '#1e263d', border: '1px solid #3b4566', color: '#c4b5fd', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>Edit Series</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                style={{ background: '#181d2e', border: '1px solid #23283b', color: '#cbd5e1', padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate & Near-Match Cleaner Modal */}
      {showDuplicateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} />
                  <span>Smart Duplicate &amp; Variation Detector</span>
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  The following tags appear to be variations of the same genre. You can merge them into their primary tag.
                </span>
              </div>
              <button type="button" onClick={() => setShowDuplicateModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {detectedDuplicates.map(({ canonical, duplicates }, idx) => (
                <div 
                  key={idx}
                  style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Target Canonical:</span>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc' }}>
                        {canonical.name} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({getItemUsageCount(canonical)} series)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMergeSourceSlugs(duplicates.map(d => d.slug));
                        setMergeDestSlug(canonical.slug);
                        setShowDuplicateModal(false);
                        setShowMergeModal(true);
                      }}
                      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', color: 'white', border: 'none', padding: '0.35rem 0.9rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <GitMerge size={13} />
                      <span>Review &amp; Merge</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Detected Duplicate Variations to Absorb:</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {duplicates.map(d => (
                      <span key={d.id} style={{ background: '#1a1f33', border: '1px solid #2e3752', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', color: '#cbd5e1' }}>
                        {d.name} <span style={{ color: '#64748b' }}>({getItemUsageCount(d)} series)</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                style={{ background: '#181d2e', border: '1px solid #23283b', color: '#cbd5e1', padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Merge Studio Modal */}
      {showMergeModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GitMerge size={22} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                    Taxonomy Merge Studio
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                    Consolidate multiple duplicate tags into a single canonical target.
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowMergeModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Step 1: Select Destination Target */}
              <div style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#34d399', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  🎯 Step 1: Choose Target Destination (The tag to keep)
                </label>
                <select
                  value={mergeDestSlug}
                  onChange={(e) => setMergeDestSlug(e.target.value)}
                  style={{ width: '100%', background: '#0a0d16', border: '1px solid #2e3752', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#f8fafc', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                >
                  <option value="">-- Select Destination Genre --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug} disabled={mergeSourceSlugs.includes(c.slug)}>
                      {c.name} (/{c.slug}) — {getItemUsageCount(c, 'categories')} series
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Source Genres to Absorb */}
              <div style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#c4b5fd', letterSpacing: '0.04em' }}>
                    📦 Step 2: Select Source Tags to Absorb &amp; Delete ({mergeSourceSlugs.length} selected)
                  </label>
                  <input
                    type="text"
                    placeholder="Search source tags..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '6px', padding: '0.3rem 0.65rem', color: '#f8fafc', fontSize: '0.74rem', outline: 'none', width: '180px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', padding: '0.4rem', background: '#0a0d16', borderRadius: '8px', border: '1px solid #1f2538' }}>
                  {categories
                    .filter(c => c.slug !== mergeDestSlug)
                    .filter(c => !sourceSearch.trim() || c.name.toLowerCase().includes(sourceSearch.toLowerCase()) || c.slug.toLowerCase().includes(sourceSearch.toLowerCase()))
                    .map(c => {
                      const isChecked = mergeSourceSlugs.includes(c.slug);
                      const usage = getItemUsageCount(c, 'categories');
                      return (
                        <label 
                          key={c.id} 
                          style={{
                            background: isChecked ? 'rgba(124, 58, 237, 0.2)' : '#121624',
                            border: isChecked ? '1px solid #7c3aed' : '1px solid #1f2538',
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            color: isChecked ? '#f8fafc' : '#cbd5e1'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setMergeSourceSlugs(prev => prev.filter(s => s !== c.slug));
                              } else {
                                setMergeSourceSlugs(prev => [...prev, c.slug]);
                              }
                            }}
                            style={{ accentColor: '#7c3aed' }}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name} <span style={{ color: '#64748b' }}>({usage})</span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Step 3: Diagnostic Preview */}
              {mergeSourceSlugs.length > 0 && mergeDestSlug && (
                <div style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                    ⚡ Impact Diagnostics Preview
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.65rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{seriesGainingTag.length} Series</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Will gain target tag &ldquo;{destNameLower}&rdquo;</div>
                    </div>
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.65rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>{seriesWithDuplicateCleanup.length} Series</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Duplicate tags removed</div>
                    </div>
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.65rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>{mergeSourceSlugs.length} Tags</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Source tags permanently deleted</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  style={{ background: '#181d2e', border: '1px solid #23283b', color: '#94a3b8', padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={merging || mergeSourceSlugs.length === 0 || !mergeDestSlug}
                  onClick={handleMergeGenres}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.55rem 1.6rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: merging || mergeSourceSlugs.length === 0 || !mergeDestSlug ? 0.5 : 1
                  }}
                >
                  <GitMerge size={15} />
                  <span>{merging ? 'Merging Tags...' : `Execute Merge (${mergeSourceSlugs.length} → 1)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilmIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}
