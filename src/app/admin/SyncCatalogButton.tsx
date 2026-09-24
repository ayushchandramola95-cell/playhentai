'use client';

import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import styles from './admin.module.css';

interface SyncCatalogButtonProps {
  variant?: 'compact' | 'full';
}

export default function SyncCatalogButton({ variant = 'full' }: SyncCatalogButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [syncStats, setSyncStats] = useState<{ seriesCount: number; episodesCount: number } | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setIsSuccess(false);

    try {
      const res = await fetch('/api/admin/sync-local-db', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync catalog');
      }

      if (data.stats) {
        setSyncStats({
          seriesCount: data.stats.seriesCount,
          episodesCount: data.stats.episodesCount
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error('Error syncing catalog:', err);
      alert(`Sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className={styles.backBtn}
        style={{
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          width: '100%',
          background: isSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(236, 72, 153, 0.12)',
          color: isSuccess ? '#4ade80' : '#f472b6',
          fontWeight: 700,
          transition: 'all 0.2s ease',
        }}
        title="Sync live catalog to public site"
      >
        {isSuccess ? (
          <Check size={16} />
        ) : (
          <RefreshCw size={16} className={isSyncing ? styles.spin : ''} />
        )}
        <span>{isSuccess ? 'Site Synced!' : isSyncing ? 'Syncing...' : 'Sync Live Catalog'}</span>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      {syncStats && isSuccess && (
        <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>
          {syncStats.seriesCount} series, {syncStats.episodesCount} episodes synced!
        </span>
      )}
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.1rem',
          borderRadius: '10px',
          border: isSuccess ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(236, 72, 153, 0.4)',
          background: isSuccess ? 'rgba(34, 197, 94, 0.15)' : 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
          color: isSuccess ? '#4ade80' : '#f472b6',
          fontWeight: 750,
          fontSize: '0.86rem',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          boxShadow: isSuccess ? '0 0 14px rgba(34, 197, 94, 0.3)' : '0 0 14px rgba(236, 72, 153, 0.15)',
          transition: 'all 0.25s ease',
        }}
        title="Forces an immediate refresh of the public website catalog from Supabase and purges page caches"
      >
        {isSuccess ? (
          <Check size={16} />
        ) : (
          <RefreshCw size={16} className={isSyncing ? styles.spin : ''} />
        )}
        <span>{isSuccess ? 'Live Site Synced!' : isSyncing ? 'Synchronizing...' : 'Sync Catalog to Site'}</span>
      </button>
    </div>
  );
}
