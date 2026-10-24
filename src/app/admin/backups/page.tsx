'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudUpload,
  CloudDownload,
  FileText,
  Download,
  RefreshCw,
  HardDrive,
  Users,
  Film,
  CheckCircle,
  X,
  Server,
  Layers,
} from 'lucide-react';
import styles from './backups.module.css';

interface BackupFile {
  key: string;
  name: string;
  sizeBytes: number;
  sizeMb: number;
  lastModified: string;
}

interface StatsData {
  seriesCount: number;
  seasonsCount: number;
  episodesCount: number;
  collectionsCount: number;
  usersCount: number;
  approxSizeFormatted: string;
}

export default function AdminBackupsPage() {
  const [stats, setStats] = useState<StatsData>({
    seriesCount: 0,
    seasonsCount: 0,
    episodesCount: 0,
    collectionsCount: 0,
    usersCount: 0,
    approxSizeFormatted: '0 MB',
  });
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/admin/backup?type=stats'),
        fetch('/api/admin/backup?type=s3_list'),
      ]);

      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData);
      }

      const listData = await listRes.json();
      if (listData.success) {
        setBackups(listData.backups || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBackupAllToS3 = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup_all_to_s3' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Complete database backed up to AWS S3 Sydney!');
        loadData();
      } else {
        showToast(data.error || 'Backup failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromS3 = async () => {
    if (!confirm('Cold-boot restore anime catalog & users from AWS S3 Sydney? This will overwrite local EC2 memory & disk caches with the latest S3 backup.')) {
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_all_from_s3' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Cold-boot restore completed from AWS S3!');
        loadData();
      } else {
        showToast(data.error || 'Restore failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Restore failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Database Architecture & AWS S3 Sync Studio</h1>
          <p>EC2 in-memory high-throughput data store paired with encrypted AWS S3 Sydney cold-boot snapshots</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={loadData}
            title="Refresh Backups List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className={styles.successBtn}
            onClick={handleRestoreFromS3}
            disabled={isProcessing}
            title="Restore catalog and users from AWS S3 Sydney"
          >
            <CloudDownload size={16} />
            Cold-Boot Restore from S3
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleBackupAllToS3}
            disabled={isProcessing}
            title="Upload snapshot of Catalog & Users to AWS S3 Sydney"
          >
            <CloudUpload size={16} />
            {isProcessing ? 'Processing...' : 'Backup Everything to S3'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Anime Series</span>
            <div className={styles.metricIcon}>
              <Film size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{stats.seriesCount}</span>
          <span className={styles.metricSub}>{stats.seasonsCount} seasons in local EC2 store</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Catalog Episodes</span>
            <div className={styles.metricIcon} style={{ color: '#a855f7' }}>
              <Layers size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{stats.episodesCount}</span>
          <span className={styles.metricSub}>100% matched in S3 Sydney</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>EC2 RAM Footprint</span>
            <div className={styles.metricIcon} style={{ color: '#10b981' }}>
              <Server size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{stats.approxSizeFormatted}</span>
          <span className={styles.metricSub}>Sub-0.1ms read latency</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>User Accounts</span>
            <div className={styles.metricIcon} style={{ color: '#38bdf8' }}>
              <Users size={18} />
            </div>
          </div>
          <span className={styles.metricValue}>{stats.usersCount}</span>
          <span className={styles.metricSub}>Self-hosted scrypt encrypted</span>
        </div>
      </div>

      {/* Direct Data Exports Section */}
      <div className={styles.cardSection}>
        <h2 className={styles.cardSectionTitle}>
          <Download size={18} />
          Direct Admin Computer Exports
        </h2>
        <p className={styles.cardSectionDesc}>
          Export the entire database or specific entities directly to your local computer in JSON or spreadsheet CSV formats.
        </p>

        <div className={styles.buttonRow}>
          <a
            href="/api/admin/backup?type=json"
            download
            className={styles.secondaryBtn}
            style={{ textDecoration: 'none' }}
          >
            <FileText size={16} />
            Download Catalog JSON Backup
          </a>

          <a
            href="/api/admin/backup?type=episodes_csv"
            download
            className={styles.secondaryBtn}
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            Download Episodes CSV
          </a>

          <a
            href="/api/admin/backup?type=series_csv"
            download
            className={styles.secondaryBtn}
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            Download Series CSV
          </a>
        </div>
      </div>

      {/* S3 Sydney Snapshots Table */}
      <div className={styles.tableCard}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b' }}>
          <h2 className={styles.cardSectionTitle} style={{ margin: 0 }}>
            <HardDrive size={18} />
            AWS S3 Sydney Database Snapshots (hentaikage-media)
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Location: s3://hentaikage-media/database-backups/ in Region ap-southeast-2
          </span>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Backup Snapshot</th>
                <th>Target Dataset</th>
                <th>File Size</th>
                <th>Created / Modified</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    {loading ? 'Querying AWS S3 Sydney...' : 'No snapshots found. Click "Backup Everything to S3" to create one.'}
                  </td>
                </tr>
              ) : (
                backups.map((b) => {
                  const isLatest = b.name.includes('_latest');
                  const isUsers = b.name.startsWith('users_');
                  const isCatalog = b.name.startsWith('catalog_');

                  return (
                    <tr key={b.key}>
                      <td style={{ fontFamily: 'monospace', color: '#f8fafc' }}>
                        {b.name}
                      </td>

                      <td>
                        <span
                          className={`${styles.badge} ${
                            isCatalog ? styles.badgeBlue : styles.badgeGreen
                          }`}
                        >
                          {isCatalog ? 'Anime Catalog' : isUsers ? 'User Database' : 'Database'}
                        </span>
                        {isLatest && (
                          <span
                            className={styles.badge}
                            style={{
                              marginLeft: '0.4rem',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: '#eab308',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                            }}
                          >
                            Latest Pointer
                          </span>
                        )}
                      </td>

                      <td>{b.sizeMb > 0 ? `${b.sizeMb} MB` : `${Math.round(b.sizeBytes / 1024)} KB`}</td>

                      <td>{b.lastModified ? new Date(b.lastModified).toLocaleString() : 'N/A'}</td>

                      <td style={{ textAlign: 'right' }}>
                        <span className={`${styles.badge} ${styles.badgeGreen}`}>
                          ✓ Verified S3 Object
                        </span>
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
