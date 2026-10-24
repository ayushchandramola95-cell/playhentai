'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  Film,
  X,
  CheckCircle,
} from 'lucide-react';
import styles from './studios.module.css';

interface StudioItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  seriesCount?: number;
}

export default function AdminStudiosPage() {
  const [studios, setStudios] = useState<StudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', slug: '' });

  const [editingStudio, setEditingStudio] = useState<StudioItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const fetchStudios = async () => {
    try {
      setLoading(true);
      const [studiosRes, seriesRes] = await Promise.all([
        fetch('/api/admin/studios'),
        fetch('/api/admin/backup?type=stats'),
      ]);

      const data = await studiosRes.json();
      const studioList: StudioItem[] = data.studios || [];

      setStudios(studioList);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch studios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  const handleAddStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.slug) return;

    try {
      const res = await fetch('/api/admin/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          slug: addForm.slug.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        showToast('Studio added successfully');
        setShowAddModal(false);
        setAddForm({ name: '', slug: '' });
        fetchStudios();
      } else {
        showToast(data.error || 'Failed to add studio', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio || !editForm.name || !editForm.slug) return;

    try {
      const res = await fetch('/api/admin/studios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudio.id,
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        showToast('Studio updated successfully');
        setEditingStudio(null);
        fetchStudios();
      } else {
        showToast(data.error || 'Failed to update studio', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteStudio = async (studio: StudioItem) => {
    if (!confirm(`Are you sure you want to delete studio "${studio.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/studios?id=${studio.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        showToast('Studio removed');
        setStudios((prev) => prev.filter((s) => s.id !== studio.id));
      } else {
        showToast(data.error || 'Failed to delete studio', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredStudios = studios.filter((s) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.slug.toLowerCase().includes(query);
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Anime Studios Management</h1>
          <p>Organize, create, and maintain Japanese animation studios and production company metadata</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={fetchStudios}
            title="Refresh Studio List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setAddForm({ name: '', slug: '' });
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            Add New Studio
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Building2 size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Studios</span>
            <span className={styles.metricValue}>{studios.length}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)' }}
          >
            <Film size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Verified Catalog Entities</span>
            <span className={styles.metricValue}>Production Level</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search studios by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Studios Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Studio Name</th>
                <th>URL Slug</th>
                <th>Public Page</th>
                <th>Date Added</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudios.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    {loading ? 'Loading studio catalog...' : 'No studios found.'}
                  </td>
                </tr>
              ) : (
                filteredStudios.map((s) => {
                  const dateStr = s.created_at
                    ? new Date(s.created_at).toLocaleDateString()
                    : 'N/A';

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              background: '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#c084fc',
                            }}
                          >
                            {(s.name || 'S')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{s.name}</span>
                        </div>
                      </td>

                      <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                        {s.slug}
                      </td>

                      <td>
                        <Link
                          href={`/studios/${s.slug}`}
                          target="_blank"
                          style={{
                            fontSize: '0.8rem',
                            color: '#38bdf8',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>/studios/{s.slug}</span>
                          <ExternalLink size={11} />
                        </Link>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{dateStr}</td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => {
                              setEditingStudio(s);
                              setEditForm({ name: s.name, slug: s.slug });
                            }}
                            title="Edit Studio"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleDeleteStudio(s)}
                            title="Delete Studio"
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Studio */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Register New Anime Studio</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudio}>
              <div className={styles.formGroup}>
                <label>Studio Name</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. PoRo, Pink Pineapple, Mary Jane"
                  value={addForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setAddForm({
                      name,
                      slug: toSlug(name),
                    });
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label>URL Slug</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. pink-pineapple"
                  value={addForm.slug}
                  onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Save Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Studio */}
      {editingStudio && (
        <div className={styles.modalOverlay} onClick={() => setEditingStudio(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Studio: {editingStudio.name}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setEditingStudio(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditStudio}>
              <div className={styles.formGroup}>
                <label>Studio Name</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>URL Slug</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setEditingStudio(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Update Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.type === 'error' ? (
            <X size={16} color="#ef4444" />
          ) : (
            <CheckCircle size={16} color="#10b981" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
