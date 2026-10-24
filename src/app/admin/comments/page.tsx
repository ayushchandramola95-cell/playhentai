'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Shield,
  Film,
  User,
  AlertCircle,
} from 'lucide-react';
import styles from './comments.module.css';

interface CommentItem {
  id: string;
  episode_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  status: 'approved' | 'pending';
  profiles?: {
    username: string | null;
    role: string;
  };
  seriesTitle?: string;
  seriesSlug?: string | null;
  episodeTitle?: string;
  posterKey?: string | null;
  gif_url?: string | null;
  likes?: number;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load comments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Comment approved successfully');
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
        );
      } else {
        showToast(data.error || 'Failed to approve', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Comment deleted successfully');
        setComments((prev) => prev.filter((c) => c.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch('/api/comments', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'approved' }),
          })
        )
      );
      showToast(`Approved ${selectedIds.length} comments!`);
      setComments((prev) =>
        prev.map((c) => (selectedIds.includes(c.id) ? { ...c, status: 'approved' } : c))
      );
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} comments?`)) return;

    try {
      const res = await fetch(`/api/comments?ids=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted ${selectedIds.length} comments!`);
        setComments((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
        setSelectedIds([]);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredComments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredComments.map((c) => c.id));
    }
  };

  const filteredComments = comments.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      const contentMatch = c.content.toLowerCase().includes(query);
      const userMatch = (c.profiles?.username || '').toLowerCase().includes(query);
      const seriesMatch = (c.seriesTitle || '').toLowerCase().includes(query);
      const episodeMatch = (c.episodeTitle || '').toLowerCase().includes(query);
      return contentMatch || userMatch || seriesMatch || episodeMatch;
    }
    return true;
  });

  const totalCount = comments.length;
  const pendingCount = comments.filter((c) => c.status === 'pending').length;
  const approvedCount = comments.filter((c) => c.status === 'approved').length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Community Comments Moderation</h1>
          <p>Review, approve, and moderate viewer discussions and feedback across all episodes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={fetchComments}
            title="Refresh Comments"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MessageSquare size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Comments</span>
            <span className={styles.metricValue}>{totalCount}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.15)' }}
          >
            <Clock size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Pending Review</span>
            <span className={styles.metricValue}>{pendingCount}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.15)' }}
          >
            <CheckCircle size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Approved Comments</span>
            <span className={styles.metricValue}>{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by comment text, username, series, or episode..."
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

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All Comments ({totalCount})</option>
          <option value="pending">Pending Only ({pendingCount})</option>
          <option value="approved">Approved Only ({approvedCount})</option>
        </select>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {selectedIds.length} selected:
            </span>
            <button
              type="button"
              className={styles.successBtn}
              onClick={handleBulkApprove}
            >
              <Check size={14} /> Approve Selected
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={handleBulkDelete}
            >
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Comments Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={
                      filteredComments.length > 0 &&
                      selectedIds.length === filteredComments.length
                    }
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th>Author</th>
                <th>Episode / Series</th>
                <th>Comment Content</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    {loading ? 'Loading comments...' : 'No comments found matching current filter.'}
                  </td>
                </tr>
              ) : (
                filteredComments.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const isPending = c.status === 'pending';
                  const dateStr = c.created_at
                    ? new Date(c.created_at).toLocaleString()
                    : 'N/A';

                  return (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                        />
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#38bdf8',
                            }}
                          >
                            {(c.profiles?.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {c.profiles?.username || 'Guest Viewer'}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {c.profiles?.role || 'visitor'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {c.seriesTitle || 'Anime Series'}
                          </div>
                          <Link
                            href={`/watch/${c.episode_id}`}
                            target="_blank"
                            style={{
                              fontSize: '0.75rem',
                              color: '#38bdf8',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <span>{c.episodeTitle || 'Watch Page'}</span>
                            <ExternalLink size={10} />
                          </Link>
                        </div>
                      </td>

                      <td style={{ maxWidth: '380px' }}>
                        <div style={{ color: '#cbd5e1', wordBreak: 'break-word' }}>
                          {c.content}
                        </div>
                        {c.gif_url && (
                          <div style={{ marginTop: '0.4rem' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.gif_url}
                              alt="Comment GIF"
                              style={{ maxHeight: '80px', borderRadius: '4px' }}
                            />
                          </div>
                        )}
                      </td>

                      <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{dateStr}</td>

                      <td>
                        <span
                          className={`${styles.badge} ${
                            isPending ? styles.badgePending : styles.badgeApproved
                          }`}
                        >
                          {isPending ? '● Pending' : '✓ Approved'}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          {isPending && (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleApprove(c.id)}
                              title="Approve Comment"
                            >
                              <CheckCircle size={15} color="#34d399" />
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleDelete(c.id)}
                            title="Delete Comment"
                          >
                            <Trash2 size={15} color="#ef4444" />
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
