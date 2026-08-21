'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radio, Megaphone, CheckCircle2, AlertCircle, RefreshCw, 
  Save, LayoutGrid, Smartphone, Monitor, ShieldAlert, ShieldCheck
} from 'lucide-react';
import styles from '../../admin.module.css';

interface AdZone {
  id: string;
  name: string;
  format: string;
  placement: string;
  zoneId: string;
  device: 'all' | 'mobile' | 'desktop';
  description: string;
}

export default function DeveloperAdsPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toggle states
  const [blockBanners, setBlockBanners] = useState<boolean>(false);
  const [blockPopunder, setBlockPopunder] = useState<boolean>(false);
  const [blockInstantMessage, setBlockInstantMessage] = useState<boolean>(false);
  const [blockInPagePush, setBlockInPagePush] = useState<boolean>(false);

  // List of active integrated ad zones
  const adZones: AdZone[] = [
    {
      id: 'popunder',
      name: 'global-popunder',
      format: 'Background Popunder',
      placement: 'Global Layout (Triggered on click anywhere)',
      zoneId: '6008702',
      device: 'all',
      description: 'Background page loads with a custom 5-minute capping limit.',
    },
    {
      id: 'instant_message',
      name: 'global-instant-message',
      format: 'Instant Message Overlay',
      placement: 'Global Bottom-Right floating chat overlay',
      zoneId: '6008712',
      device: 'all',
      description: 'Simulates a support chat window with automatic 30s banner rotation.',
    },
    {
      id: 'sticky_footer',
      name: 'mobile-sticky-footer',
      format: 'Sticky Footer Banner (300x50)',
      placement: 'Global Mobile Screen anchored footer',
      zoneId: '6008718',
      device: 'mobile',
      description: 'Anchored centered banner displaying strictly under 769px viewports.',
    },
    {
      id: 'in_page_push',
      name: 'global-in-page-push',
      format: 'In-Page Push Alert',
      placement: 'Global Bottom-Right sliding notification',
      zoneId: '6008722',
      device: 'all',
      description: 'Sliding alert bubble mimicking a browser push message with a custom delay.',
    },
    {
      id: 'inline_leaderboard',
      name: 'homepage-after-latest-series728x90',
      format: 'Display Leaderboard Banner (728x90)',
      placement: 'Homepage (Row below Latest Series section)',
      zoneId: '5986226',
      device: 'desktop',
      description: 'Traditional flat desktop banner layout.',
    },
    {
      id: 'native_feed',
      name: 'homepage-native-feed',
      format: 'Native Recommendation Grid (6x2)',
      placement: 'Homepage (Row below Categories grid)',
      zoneId: '5986302',
      device: 'desktop',
      description: 'Sponsored recommendations blending directly with series catalogs.',
    }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const body = await res.json();
        if (body.settings) {
          setBlockBanners(body.settings.ads_block_banners === 'true');
          setBlockPopunder(body.settings.ads_block_popunder === 'true');
          setBlockInstantMessage(body.settings.ads_block_instant_message === 'true');
          setBlockInPagePush(body.settings.ads_block_in_page_push === 'true');
        }
      } else {
        setErrorMsg('Failed to load ad blocker settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error querying developer settings api.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload = {
        settings: {
          ads_block_banners: String(blockBanners),
          ads_block_popunder: String(blockPopunder),
          ads_block_instant_message: String(blockInstantMessage),
          ads_block_in_page_push: String(blockInPagePush),
        }
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Trigger site settings revalidation on frontend if caching
        await fetch('/api/views', { method: 'POST', body: JSON.stringify({ action: 'revalidate' }) }).catch(() => {});
        
        setSuccessMsg('Developer ad controls successfully saved site-wide!');
        // Automatically hide notification after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg('Failed to save settings to server.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error posting settings to API.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.spinIcon} size={32} />
        <p>Loading Developer Ad Configurations...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminContent}>
      {/* Page Header */}
      <div className={styles.contentHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Radio className={styles.headerIcon} size={28} /> Developer Ads Management
          </h1>
          <p className={styles.pageSubtitle}>
            Audit your Exoclick zone configurations, toggle individual placements, or temporarily disable ads for site maintenance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`${styles.actionBtn} ${styles.saveBtn}`}
        >
          {isSaving ? (
            <RefreshCw className={styles.spinIcon} size={16} />
          ) : (
            <Save size={16} />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Message Banners */}
      {successMsg && (
        <div className={`${styles.alert} ${styles.alertSuccess} glass`}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className={`${styles.alert} ${styles.alertError} glass`}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Ads Visibility Settings (Toggles) */}
      <div className={`${styles.card} glass`} style={{ marginBottom: '2rem' }}>
        <h2 className={styles.sectionTitle} style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} className={styles.textPrimary} /> Ad Blocker & Visibility Toggles
        </h2>
        <p className={styles.sectionSubtitle} style={{ marginBottom: '1.5rem' }}>
          Turn switches ON to hide specific ad groups from rendering on the frontend.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {/* Banner Toggle */}
          <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span>Hide Banners & Native Grid</span>
              <input
                type="checkbox"
                checked={blockBanners}
                onChange={(e) => setBlockBanners(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
            <p className={styles.fieldHelp} style={{ marginTop: '0.5rem' }}>
              Disables standard leaderboards, native recommend grids, and sticky footers.
            </p>
          </div>

          {/* Popunder Toggle */}
          <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span>Hide Popunder Ads</span>
              <input
                type="checkbox"
                checked={blockPopunder}
                onChange={(e) => setBlockPopunder(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
            <p className={styles.fieldHelp} style={{ marginTop: '0.5rem' }}>
              Hides the background popunder redirection handler.
            </p>
          </div>

          {/* Instant Message Toggle */}
          <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span>Hide Instant Message</span>
              <input
                type="checkbox"
                checked={blockInstantMessage}
                onChange={(e) => setBlockInstantMessage(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
            <p className={styles.fieldHelp} style={{ marginTop: '0.5rem' }}>
              Hides the bottom-right chat box recommendation overlay.
            </p>
          </div>

          {/* In-Page Push Toggle */}
          <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label className={styles.formLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span>Hide In-Page Push</span>
              <input
                type="checkbox"
                checked={blockInPagePush}
                onChange={(e) => setBlockInPagePush(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </label>
            <p className={styles.fieldHelp} style={{ marginTop: '0.5rem' }}>
              Prevents the delayed bottom-right push notifications alert box.
            </p>
          </div>
        </div>
      </div>

      {/* Integrated Zones List */}
      <h2 className={styles.sectionTitle} style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Megaphone size={20} className={styles.textPrimary} /> Configured Exoclick Ad Zones
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        {adZones.map((zone) => {
          const isBlocked = 
            (zone.id === 'popunder' && blockPopunder) ||
            (zone.id === 'instant_message' && blockInstantMessage) ||
            (zone.id === 'in_page_push' && blockInPagePush) ||
            ((zone.id === 'sticky_footer' || zone.id === 'inline_leaderboard' || zone.id === 'native_feed') && blockBanners);

          return (
            <div 
              key={zone.id} 
              className={`${styles.card} glass`} 
              style={{ 
                borderLeft: isBlocked ? '4px solid #ef4444' : '4px solid #10b981',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ flex: '1', minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{zone.name}</h3>
                  <span 
                    style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      padding: '0.15rem 0.5rem', 
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      background: isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: isBlocked ? '#f87171' : '#34d399',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {isBlocked ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
                    {isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>{zone.description}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                  <span><strong>Format:</strong> {zone.format}</span>
                  <span><strong>Placement:</strong> {zone.placement}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Zone ID Info */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Zone ID</div>
                  <code style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 600 }}>{zone.zoneId}</code>
                </div>

                {/* Target Devices */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(zone.device === 'all' || zone.device === 'desktop') && (
                    <span title="Desktop supported" style={{ padding: '0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)' }}>
                      <Monitor size={16} />
                    </span>
                  )}
                  {(zone.device === 'all' || zone.device === 'mobile') && (
                    <span title="Mobile supported" style={{ padding: '0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)' }}>
                      <Smartphone size={16} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
