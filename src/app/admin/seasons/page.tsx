'use client';

import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import styles from '../admin.module.css';

interface Series {
  id: string;
  title: string;
}

interface Season {
  id: string;
  series_id: string;
  season_number: number;
  title: string;
  is_published: boolean;
  created_at: string;
  series?: {
    title: string;
  };
}

export default function AdminSeasonsPage() {
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seriesId, setSeriesId] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
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
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setSeriesId(seriesList[0]?.id || '');
    setSeasonNumber(seasonsList.length > 0 ? Math.max(...seasonsList.map(s => s.season_number)) + 1 : 1);
    setTitle('Season 1');
    setIsPublished(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Season) => {
    setEditingId(s.id);
    setSeriesId(s.series_id);
    setSeasonNumber(s.season_number);
    setTitle(s.title);
    setIsPublished(s.is_published);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSeasonNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    setSeasonNumber(val);
    if (!editingId || title === `Season ${seasonNumber}`) {
      setTitle(`Season ${val}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      id: editingId,
      series_id: seriesId,
      season_number: seasonNumber,
      title,
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
      // Reload initial data to fetch with joins
      fetchInitialData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this season? All episodes associated with this season will be deleted!')) return;

    try {
      const res = await fetch(`/api/admin/seasons?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete season');
      fetchInitialData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredList = seasonsList.filter((s) => {
    if (selectedSeriesFilter === 'all') return true;
    return s.series_id === selectedSeriesFilter;
  });

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Manage Seasons</h2>
          <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Group series episodes into organized seasons (e.g. Season 1, Season 2, Specials).
          </p>
        </div>
        <button onClick={handleOpenCreate} disabled={seriesList.length === 0} className={styles.createBtn}>
          <Plus size={16} />
          <span>Add Season</span>
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--foreground-secondary)', textTransform: 'uppercase' }}>Filter by Series</label>
          <select 
            className={styles.selectField}
            style={{ width: '250px', background: 'var(--surface-hover)', padding: '0.5rem 1rem' }}
            value={selectedSeriesFilter}
            onChange={(e) => setSelectedSeriesFilter(e.target.value)}
          >
            <option value="all">All Series</option>
            {seriesList.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px', display: 'inline-block' }} />
        </div>
      ) : filteredList.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Season Title</th>
                <th>Parent Series</th>
                <th>Season Number</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.title}</td>
                  <td>{s.series?.title || 'Unknown Series'}</td>
                  <td>{s.season_number}</td>
                  <td>
                    <span className={`${styles.badge} ${s.is_published ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {s.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(s)} className={styles.editActionBtn} title="Edit Season">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className={styles.deleteActionBtn} title="Delete Season">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          {seriesList.length === 0 
            ? 'You need to create a Series first before you can manage seasons!' 
            : 'No seasons found for the selected series filter.'}
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'Edit Season Meta' : 'Add New Season'}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label>Parent Series</label>
                <select
                  required
                  className={styles.selectField}
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                >
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Season Number</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className={styles.inputField}
                    value={seasonNumber}
                    onChange={handleSeasonNumberChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Season Name/Title</label>
                  <input
                    type="text"
                    required
                    className={styles.inputField}
                    placeholder="e.g. Season 1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.checkboxRow} style={{ marginTop: '1rem' }}>
                <input
                  type="checkbox"
                  id="is_published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <label htmlFor="is_published">Publish immediately (visible in public catalog)</label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={styles.saveBtn}>
                  {saving ? 'Saving...' : 'Save Season'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
