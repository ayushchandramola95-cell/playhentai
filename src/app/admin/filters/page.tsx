'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Layers, Tv, AlertCircle, RefreshCw } from 'lucide-react';
import { GENRES, STUDIOS } from '@/utils/constants';
import styles from '../admin.module.css';

interface DatabaseItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export default function AdminFiltersPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'studios'>('categories');
  
  // Data states
  const [categories, setCategories] = useState<DatabaseItem[]>([]);
  const [studios, setStudios] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch categories
      const catRes = await fetch('/api/admin/categories');
      const catData = await catRes.json();
      
      // Fetch studios
      const studioRes = await fetch('/api/admin/studios');
      const studioData = await studioRes.json();

      // If they failed because of DB empty, we will use mock structures based on constants
      let resolvedCats: DatabaseItem[] = [];
      let resolvedStudios: DatabaseItem[] = [];

      if (catRes.ok && catData.categories && catData.categories.length > 0) {
        resolvedCats = catData.categories;
      } else {
        // Generate mock items from constants for preview
        resolvedCats = GENRES.map((g, idx) => ({ id: `mock-g-${idx}`, name: g, slug: g.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
      }

      if (studioRes.ok && studioData.studios && studioData.studios.length > 0) {
        resolvedStudios = studioData.studios;
      } else {
        resolvedStudios = STUDIOS.map((s, idx) => ({ id: `mock-s-${idx}`, name: s, slug: s.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
      }

      setCategories(resolvedCats);
      setStudios(resolvedStudios);
    } catch (err: any) {
      console.warn('DB Fetch failed (normal in offline mode), loading mock constants:', err);
      // Fallback
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
      const endpoint = activeTab === 'categories' ? '/api/admin/categories' : '/api/admin/studios';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save item to database');

      // Add to state
      if (activeTab === 'categories') {
        setCategories(prev => [data.category, ...prev.filter(item => !item.id.startsWith('mock-'))]);
      } else {
        setStudios(prev => [data.studio, ...prev.filter(item => !item.id.startsWith('mock-'))]);
      }

      // Reset form
      setNameInput('');
      setSlugInput('');
    } catch (err: any) {
      setError(err.message);
      
      // Fallback local addition for offline preview
      const fallbackItem: DatabaseItem = {
        id: `local-temp-${Date.now()}`,
        name: payload.name,
        slug: payload.slug
      };
      if (activeTab === 'categories') {
        setCategories(prev => [fallbackItem, ...prev]);
      } else {
        setStudios(prev => [fallbackItem, ...prev]);
      }
      setNameInput('');
      setSlugInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id.startsWith('mock-')) {
      alert('This is a default preset category. Presets cannot be deleted until your live Supabase database is connected.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"? Any series associated with it will lose this tag/reference.`)) return;

    try {
      const endpoint = activeTab === 'categories' ? `/api/admin/categories?id=${id}` : `/api/admin/studios?id=${id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Update state
      if (activeTab === 'categories') {
        setCategories(prev => prev.filter(item => item.id !== id));
      } else {
        setStudios(prev => prev.filter(item => item.id !== id));
      }
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
      
      // Fallback delete for local temp items
      if (id.startsWith('local-temp-')) {
        if (activeTab === 'categories') {
          setCategories(prev => prev.filter(item => item.id !== id));
        } else {
          setStudios(prev => prev.filter(item => item.id !== id));
        }
      }
    }
  };

  const activeItems = activeTab === 'categories' ? categories : studios;

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader} style={{ marginBottom: '2rem' }}>
        <div>
          <h2>Manage Genres & Studios</h2>
          <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Add new categories, genres, or production studios dynamically to your catalog lists.
          </p>
        </div>
        <button onClick={fetchFilters} className={styles.editActionBtn} title="Refresh lists" style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Selector Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
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
          <span>Genres / Categories ({categories.length})</span>
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
      </div>

      {error && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Add New Item Form */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
        <h4 style={{ marginBottom: '1rem', fontWeight: 800 }}>
          Add New {activeTab === 'categories' ? 'Genre / Category' : 'Production Studio'}
        </h4>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className={styles.formGroup} style={{ flex: 2, minWidth: '220px', marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Name</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder={activeTab === 'categories' ? "e.g. Tsundere" : "e.g. Studio Eromatick"}
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
              placeholder={activeTab === 'categories' ? "tsundere" : "studio-eromatick"}
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
    </div>
  );
}
