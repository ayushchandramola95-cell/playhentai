'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Search, Filter, ExternalLink, Trash2, Check,
  Clock, ShieldAlert, ArrowUpDown, Download,
  Film, Eye, AlertCircle, FileText, CheckCheck
} from 'lucide-react';
import styles from './reports.module.css';

interface IssueReport {
  id: string;
  series_title: string;
  series_slug: string;
  episode_id: string;
  episode_number: number;
  reason: string;
  notes?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  user_agent?: string;
}

export default function DeveloperReportsPage() {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'pending' | 'resolved' | 'dismissed') => {
    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        setActionSuccessMsg(`Report marked as ${status}`);
        setTimeout(() => setActionSuccessMsg(null), 2500);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this report?')) return;
    try {
      const res = await fetch(`/api/reports?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        setActionSuccessMsg('Report deleted successfully');
        setTimeout(() => setActionSuccessMsg(null), 2500);
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['ID', 'Series Title', 'Series Slug', 'Episode Number', 'Reason', 'Status', 'Notes', 'Created At'];
    const rows = reports.map(r => [
      r.id,
      `"${r.series_title.replace(/"/g, '""')}"`,
      r.series_slug,
      r.episode_number,
      `"${r.reason.replace(/"/g, '""')}"`,
      r.status,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.created_at
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `playback-reports-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;
  const dismissedReports = reports.filter((r) => r.status === 'dismissed').length;

  // Filtered List
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = r.series_title?.toLowerCase().includes(q);
        const matchesReason = r.reason?.toLowerCase().includes(q);
        const matchesNotes = r.notes?.toLowerCase().includes(q);
        const matchesEp = String(r.episode_number).includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        return matchesTitle || matchesReason || matchesNotes || matchesEp || matchesId;
      }
      return true;
    });
  }, [reports, statusFilter, reasonFilter, searchQuery]);

  const uniqueReasons = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.reason) set.add(r.reason);
    });
    return Array.from(set);
  }, [reports]);

  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (_) {
      return isoDate;
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconCircle}>
            <AlertTriangle size={24} className={styles.headerIcon} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Playback Issue Reports</h1>
            <p className={styles.pageSubtitle}>
              Monitor, diagnose, and resolve user-reported playback failures, audio sync bugs, and missing subtitles in real time.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={fetchReports}
            className={styles.refreshBtn}
            title="Refresh Reports"
          >
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className={styles.exportBtn}
            title="Export Reports to CSV"
            disabled={reports.length === 0}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className={styles.toastSuccess}>
          <Check size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Summary KPI Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <FileText size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Reports</span>
            <span className={styles.statValue}>{totalReports}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <ShieldAlert size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Open / Pending</span>
            <span className={styles.statValue} style={{ color: '#f87171' }}>{pendingReports}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
            <CheckCheck size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Resolved Issues</span>
            <span className={styles.statValue} style={{ color: '#4ade80' }}>{resolvedReports}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' }}>
            <XCircle size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Dismissed</span>
            <span className={styles.statValue}>{dismissedReports}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className={styles.toolbarCard}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by series title, episode number, report ID..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filtersRow}>
          {/* Status Tabs */}
          <div className={styles.statusTabs}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.tabActive : ''}`}
            >
              All ({totalReports})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`${styles.tabBtn} ${statusFilter === 'pending' ? styles.tabActivePending : ''}`}
            >
              Pending ({pendingReports})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`${styles.tabBtn} ${statusFilter === 'resolved' ? styles.tabActiveResolved : ''}`}
            >
              Resolved ({resolvedReports})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('dismissed')}
              className={`${styles.tabBtn} ${statusFilter === 'dismissed' ? styles.tabActive : ''}`}
            >
              Dismissed ({dismissedReports})
            </button>
          </div>

          {/* Reason Select Filter */}
          {uniqueReasons.length > 0 && (
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className={styles.reasonSelect}
            >
              <option value="all">All Issue Categories</option>
              {uniqueReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Reports Table / List */}
      <div className={styles.reportsTableCard}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <RefreshCw size={28} className={styles.spinning} color="#c084fc" />
            <p>Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle2 size={40} color="#22c55e" />
            <h3>No reports found</h3>
            <p>
              {searchQuery || statusFilter !== 'all' || reasonFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'All playback streams are healthy with 0 user-reported issues!'}
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.reportsTable}>
              <thead>
                <tr>
                  <th>Series & Episode</th>
                  <th>Issue Category</th>
                  <th>Notes</th>
                  <th>Reported</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const watchUrl = report.series_slug
                    ? `/watch/${report.series_slug}-episode-${report.episode_number}`
                    : `/watch/${report.episode_id}`;

                  return (
                    <tr key={report.id} className={report.status === 'pending' ? styles.pendingRow : ''}>
                      {/* Series & Episode */}
                      <td className={styles.seriesCell}>
                        <div className={styles.seriesInfo}>
                          <span className={styles.seriesTitleText}>{report.series_title}</span>
                          <div className={styles.epPillRow}>
                            <span className={styles.epPill}>Episode {report.episode_number}</span>
                            <span className={styles.reportIdText}>#{report.id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Issue Category */}
                      <td>
                        <span
                          className={`${styles.reasonBadge} ${
                            report.reason.toLowerCase().includes('fail') || report.reason.toLowerCase().includes('black')
                              ? styles.reasonBadgeRed
                              : report.reason.toLowerCase().includes('audio')
                              ? styles.reasonBadgeAmber
                              : report.reason.toLowerCase().includes('subtitle')
                              ? styles.reasonBadgeBlue
                              : styles.reasonBadgePurple
                          }`}
                        >
                          {report.reason}
                        </span>
                      </td>

                      {/* Notes / Details */}
                      <td className={styles.notesCell}>
                        {report.notes ? (
                          <span className={styles.notesText}>{report.notes}</span>
                        ) : (
                          <span className={styles.noNotes}>None</span>
                        )}
                      </td>

                      {/* Reported Time */}
                      <td className={styles.timeCell}>
                        <span className={styles.timeAgo} title={new Date(report.created_at).toLocaleString()}>
                          {formatTimeAgo(report.created_at)}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            report.status === 'pending'
                              ? styles.statusPending
                              : report.status === 'resolved'
                              ? styles.statusResolved
                              : styles.statusDismissed
                          }`}
                        >
                          {report.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtonsGroup}>
                          {/* Direct Watch Link */}
                          <Link
                            href={watchUrl}
                            target="_blank"
                            className={styles.iconActionBtn}
                            title="Inspect Episode Watch Page"
                          >
                            <ExternalLink size={15} />
                          </Link>

                          {/* Resolve Button */}
                          {report.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'resolved')}
                              className={`${styles.iconActionBtn} ${styles.actionBtnResolve}`}
                              title="Mark as Resolved"
                            >
                              <Check size={15} />
                            </button>
                          )}

                          {/* Dismiss Button */}
                          {report.status !== 'dismissed' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                              className={`${styles.iconActionBtn} ${styles.actionBtnDismiss}`}
                              title="Dismiss Report"
                            >
                              <XCircle size={15} />
                            </button>
                          )}

                          {/* Reopen Button */}
                          {report.status !== 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(report.id, 'pending')}
                              className={`${styles.iconActionBtn} ${styles.actionBtnReopen}`}
                              title="Re-open Report"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id)}
                            className={`${styles.iconActionBtn} ${styles.actionBtnDelete}`}
                            title="Delete Report"
                          >
                            <Trash2 size={15} />
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
      </div>
    </div>
  );
}
