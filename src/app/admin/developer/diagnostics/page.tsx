'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw,
  Search, Download, ExternalLink, Edit3, ShieldAlert, Film,
  Video, Image as ImageIcon, Zap, Filter
} from 'lucide-react';
import styles from './diagnostics.module.css';

interface DiagnosticIssue {
  id: string;
  type: 'episode' | 'series';
  severity: 'critical' | 'warning' | 'info';
  code: string;
  title: string;
  message: string;
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  episodeId?: string;
  episodeNumber?: number;
  videoKey?: string;
  thumbnailKey?: string;
  suggestedAction: string;
  editUrl: string;
  publicUrl?: string;
}

interface DiagnosticSummary {
  totalEpisodes: number;
  totalSeries: number;
  healthyEpisodes: number;
  healthScore: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalIssues: number;
}

export default function DiagnosticScannerPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeepScan, setIsDeepScan] = useState<boolean>(false);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const runScan = async (deep: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/diagnostics?deepCheck=${deep ? 'true' : 'false'}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setIssues(data.issues || []);
        setScannedAt(data.scannedAt);
      }
    } catch (err) {
      console.error('Error running diagnostics scan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runScan(false);
  }, []);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Severity filter
      if (severityFilter !== 'all' && issue.severity !== severityFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = issue.seriesTitle.toLowerCase().includes(q);
        const matchesSlug = issue.seriesSlug.toLowerCase().includes(q);
        const matchesCode = issue.code.toLowerCase().includes(q);
        const matchesMsg = issue.message.toLowerCase().includes(q);
        const matchesEp = issue.episodeNumber !== undefined && String(issue.episodeNumber) === q;
        return matchesTitle || matchesSlug || matchesCode || matchesMsg || matchesEp;
      }
      return true;
    });
  }, [issues, severityFilter, searchQuery]);

  const handleExportCSV = () => {
    if (issues.length === 0) return;
    const headers = ['Severity', 'Issue Code', 'Series Title', 'Series Slug', 'Episode Number', 'Details', 'Suggested Action', 'Edit Link'];
    const rows = issues.map((i) => [
      i.severity.toUpperCase(),
      i.code,
      `"${i.seriesTitle.replace(/"/g, '""')}"`,
      i.seriesSlug,
      i.episodeNumber ?? 'N/A',
      `"${i.message.replace(/"/g, '""')}"`,
      `"${i.suggestedAction.replace(/"/g, '""')}"`,
      `"https://playhentai.live${i.editUrl}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalog_diagnostics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!summary) return;
    const exportData = {
      scannedAt,
      summary,
      issues,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalog_diagnostics_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const healthScore = summary?.healthScore ?? 100;
  const healthColor = healthScore >= 95 ? '#34d399' : healthScore >= 80 ? '#fbbf24' : '#ef4444';

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <Activity size={24} style={{ color: '#38bdf8' }} />
            <span>Broken Link &amp; Dead Video Diagnostic Scanner</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Automated crawler analyzing catalog video keys, Cloudflare R2 endpoints, and missing artwork.
            {scannedAt && ` Last scanned: ${new Date(scannedAt).toLocaleTimeString()}`}
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => runScan(false)}
            disabled={isLoading}
            className={styles.btnPrimary}
          >
            {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
            <span>{isLoading ? 'Scanning Catalog...' : '1-Click Fast Scan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDeepScan(true);
              runScan(true);
            }}
            disabled={isLoading}
            className={styles.btnSecondary}
            title="Performs live HTTP HEAD probes on R2 video endpoints to catch 404s"
          >
            <Video size={16} style={{ color: '#f59e0b' }} />
            <span>Deep CDN Probe</span>
          </button>

          {issues.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                className={styles.btnSecondary}
                title="Export issues list as CSV spreadsheet"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className={styles.btnSecondary}
                title="Export complete report as JSON"
              >
                <Download size={15} />
                <span>Export JSON</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className={styles.metricsGrid}>
        {/* 1. Overall Health Score */}
        <div className={styles.metricCard} style={{ borderLeft: `4px solid ${healthColor}` }}>
          <div className={styles.metricIconBox} style={{ background: `${healthColor}20`, color: healthColor }}>
            <Activity size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Catalog Health Score</span>
            <strong className={styles.metricValue} style={{ color: healthColor }}>
              {isLoading ? '...' : `${healthScore}%`}
            </strong>
            <span className={styles.metricSub}>
              {summary ? `${summary.healthyEpisodes} of ${summary.totalEpisodes} eps healthy` : 'Analyzing'}
            </span>
          </div>
        </div>

        {/* 2. Critical Dead Video Links */}
        <div className={styles.metricCard} style={{ borderLeft: '4px solid #ef4444' }}>
          <div className={styles.metricIconBox} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertCircle size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Dead Video Files</span>
            <strong className={styles.metricValue} style={{ color: '#ef4444' }}>
              {isLoading ? '...' : (summary?.criticalCount ?? 0)}
            </strong>
            <span className={styles.metricSub}>Empty keys or 404 stream URLs</span>
          </div>
        </div>

        {/* 3. Missing Thumbnails (Warnings) */}
        <div className={styles.metricCard} style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className={styles.metricIconBox} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Missing Thumbnails</span>
            <strong className={styles.metricValue} style={{ color: '#f59e0b' }}>
              {isLoading ? '...' : (summary?.warningCount ?? 0)}
            </strong>
            <span className={styles.metricSub}>Episodes without preview art</span>
          </div>
        </div>

        {/* 4. Missing Posters / Artwork (Info) */}
        <div className={styles.metricCard} style={{ borderLeft: '4px solid #38bdf8' }}>
          <div className={styles.metricIconBox} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <ImageIcon size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Missing Posters</span>
            <strong className={styles.metricValue} style={{ color: '#38bdf8' }}>
              {isLoading ? '...' : (summary?.infoCount ?? 0)}
            </strong>
            <span className={styles.metricSub}>Series without cover art</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by series name, slug, episode # or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className={severityFilter === 'all' ? styles.filterBtnActive : styles.filterBtn}
          >
            All Issues ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('critical')}
            className={severityFilter === 'critical' ? styles.filterBtnActive : styles.filterBtn}
            style={severityFilter === 'critical' ? { borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)' } : {}}
          >
            Critical ({summary?.criticalCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('warning')}
            className={severityFilter === 'warning' ? styles.filterBtnActive : styles.filterBtn}
            style={severityFilter === 'warning' ? { borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' } : {}}
          >
            Warnings ({summary?.warningCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('info')}
            className={severityFilter === 'info' ? styles.filterBtnActive : styles.filterBtn}
            style={severityFilter === 'info' ? { borderColor: '#38bdf8', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)' } : {}}
          >
            Info ({summary?.infoCount ?? 0})
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.cleanState}>
            <RefreshCw className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
            <h3 style={{ color: '#f8fafc', margin: 0 }}>Scanning Full Catalog...</h3>
            <p>Evaluating video endpoints, Cloudflare R2 file existence, and media assets.</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className={styles.cleanState}>
            <CheckCircle2 size={44} style={{ color: '#34d399' }} />
            <h3 className={styles.cleanTitle}>
              {issues.length === 0
                ? 'All Media Streams & Catalog Assets Are 100% Healthy!'
                : 'No issues match your active search or severity filter.'}
            </h3>
            <p>
              {issues.length === 0
                ? 'Every published episode contains a valid streaming video key and thumbnail preview.'
                : 'Try adjusting your search criteria or switching to "All Issues".'}
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Severity</th>
                  <th>Target Media Item</th>
                  <th>Diagnostic Issue &amp; Details</th>
                  <th>Suggested Action</th>
                  <th style={{ width: '220px', textAlign: 'right' }}>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      {issue.severity === 'critical' && (
                        <span className={styles.badgeCritical}>
                          <AlertCircle size={12} /> CRITICAL
                        </span>
                      )}
                      {issue.severity === 'warning' && (
                        <span className={styles.badgeWarning}>
                          <AlertTriangle size={12} /> WARNING
                        </span>
                      )}
                      {issue.severity === 'info' && (
                        <span className={styles.badgeInfo}>
                          <ImageIcon size={12} /> INFO
                        </span>
                      )}
                    </td>

                    <td>
                      <div>
                        <strong style={{ color: '#f8fafc', fontSize: '0.88rem', display: 'block' }}>
                          {issue.seriesTitle}
                        </strong>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {issue.type === 'episode'
                            ? `Episode ${issue.episodeNumber}`
                            : 'Series Asset'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '0.15rem' }}>
                          {issue.title}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          {issue.message}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 600 }}>
                        {issue.suggestedAction}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionLinks} style={{ justifyContent: 'flex-end' }}>
                        <Link href={issue.editUrl} className={styles.actionBtn}>
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </Link>
                        {issue.publicUrl && (
                          <Link href={issue.publicUrl} target="_blank" className={styles.actionBtn}>
                            <ExternalLink size={13} />
                            <span>Preview</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
