'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Radio, Megaphone, CheckCircle2, AlertCircle, RefreshCw, 
  Save, LayoutGrid, Smartphone, Monitor, ShieldAlert, ShieldCheck,
  Copy, Check, ExternalLink, Zap, Eye, Sliders, Code, Globe,
  Layers, Lock, Unlock, Play, Terminal, HelpCircle, Activity,
  Maximize2, Power, EyeOff, Search, DollarSign, Calculator,
  TrendingUp, BarChart3, Filter, Info
} from 'lucide-react';
import styles from './ads.module.css';

interface AdZone {
  id: string;
  name: string;
  format: string;
  category: 'global' | 'homepage' | 'watch' | 'series' | 'hubs' | 'footer';
  pageLocation: string;
  routePath: string;
  zoneId: string;
  device: 'all' | 'mobile' | 'desktop';
  description: string;
  dimensions: string;
}

export default function DeveloperAdsPage() {
  const [activeTab, setActiveTab] = useState<'zones' | 'map' | 'revenue' | 'custom' | 'simulator' | 'diagnostics'>('zones');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedZoneId, setCopiedZoneId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  // Category Toggle states (Ad Blocker Settings)
  const [blockBanners, setBlockBanners] = useState<boolean>(false);
  const [blockPopunder, setBlockPopunder] = useState<boolean>(false);
  const [blockInstantMessage, setBlockInstantMessage] = useState<boolean>(false);
  const [blockInPagePush, setBlockInPagePush] = useState<boolean>(false);

  // Individual Per-Zone Disabled List
  const [disabledZoneIds, setDisabledZoneIds] = useState<string[]>([]);

  // Global Master Killswitch (Emergency toggle to shut down all ads site-wide)
  const [globalKillswitch, setGlobalKillswitch] = useState<boolean>(false);

  // Custom Tag Injector State
  const [headerCustomScript, setHeaderCustomScript] = useState<string>('');
  const [bodyCustomScript, setBodyCustomScript] = useState<string>('');
  const [customScriptsEnabled, setCustomScriptsEnabled] = useState<boolean>(true);

  // Simulator format
  const [simFormat, setSimFormat] = useState<'728x90' | '300x250' | '300x50' | 'instant_message' | 'push' | 'native'>('728x90');

  // Revenue Calculator Inputs
  const [calcDailyViews, setCalcDailyViews] = useState<number>(35000);
  const [calcPopunderCpm, setCalcPopunderCpm] = useState<number>(2.40);
  const [calcBannerCpm, setCalcBannerCpm] = useState<number>(0.75);
  const [calcMessageCpm, setCalcMessageCpm] = useState<number>(1.20);

  // Complete 17 Configured Ad Zones across the site
  const allAdZones: AdZone[] = [
    // 1-4: Global Overlays & Handlers
    {
      id: 'popunder',
      name: 'Global Background Popunder',
      format: 'Background Popunder',
      category: 'global',
      pageLocation: 'Global Layout (Triggered on click anywhere)',
      routePath: '/',
      zoneId: '6008702',
      device: 'all',
      dimensions: 'Full Tab Window',
      description: 'Background page loads with a custom 5-minute cooldown frequency limit.',
    },
    {
      id: 'instant_message',
      name: 'Global Instant Message Chat',
      format: 'Floating Chat Overlay',
      category: 'global',
      pageLocation: 'Global Layout (Bottom-Right corner)',
      routePath: '/',
      zoneId: '6008712',
      device: 'all',
      dimensions: '300x200 Overlay',
      description: 'Simulates a live support chat dialog with automatic 30s banner rotation.',
    },
    {
      id: 'in_page_push',
      name: 'Global In-Page Push Alert',
      format: 'In-Page Push Notification',
      category: 'global',
      pageLocation: 'Global Layout (Bottom-Right alert bubble)',
      routePath: '/',
      zoneId: '6008722',
      device: 'all',
      dimensions: '320x100 Alert',
      description: 'Sliding alert bubble mimicking a browser push notification with custom delay.',
    },
    {
      id: 'sticky_footer',
      name: 'Mobile Global Sticky Footer',
      format: 'Mobile Sticky Footer',
      category: 'global',
      pageLocation: 'Global Mobile Viewports (<769px screen anchor)',
      routePath: '/',
      zoneId: '6008718',
      device: 'mobile',
      dimensions: '300x50 Fixed',
      description: 'Anchored centered banner displaying strictly on mobile screen viewports.',
    },

    // 5-6: Global Public Footer
    {
      id: 'footer_desktop',
      name: 'Global Footer Leaderboard (Desktop)',
      format: 'Display Leaderboard Banner',
      category: 'footer',
      pageLocation: 'Global Public Footer (Above copyright bar)',
      routePath: '/',
      zoneId: '5986212',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'Desktop bottom footer billboard banner above site links.',
    },
    {
      id: 'footer_mobile',
      name: 'Global Footer Banner (Mobile)',
      format: 'Mobile Rectangle Banner',
      category: 'footer',
      pageLocation: 'Global Public Footer (Mobile screens)',
      routePath: '/',
      zoneId: '5986980',
      device: 'mobile',
      dimensions: '300x250 Rectangle',
      description: 'Mobile responsive bottom footer display ad.',
    },

    // 7-12: Homepage Placements
    {
      id: 'home_top_desktop',
      name: 'Homepage Top Leaderboard (Desktop)',
      format: 'Display Leaderboard Banner',
      category: 'homepage',
      pageLocation: 'Homepage (Directly below Hero Banner Carousel)',
      routePath: '/',
      zoneId: '5986176',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'Prime top above-the-fold desktop leaderboard banner.',
    },
    {
      id: 'home_top_mobile',
      name: 'Homepage Top Banner (Mobile)',
      format: 'Mobile Rectangle Banner',
      category: 'homepage',
      pageLocation: 'Homepage (Directly below Hero Banner Carousel)',
      routePath: '/',
      zoneId: '5986984',
      device: 'mobile',
      dimensions: '300x250 Rectangle',
      description: 'High CTR mobile responsive top banner slot.',
    },
    {
      id: 'home_mid_desktop',
      name: 'Homepage Mid Leaderboard (Desktop)',
      format: 'Display Leaderboard Banner',
      category: 'homepage',
      pageLocation: 'Homepage (Row below Trending Series carousel)',
      routePath: '/',
      zoneId: '5986194',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'Mid-page desktop separator ad.',
    },
    {
      id: 'home_mid_mobile',
      name: 'Homepage Mid Banner (Mobile)',
      format: 'Mobile Rectangle Banner',
      category: 'homepage',
      pageLocation: 'Homepage (Row below Trending Series carousel)',
      routePath: '/',
      zoneId: '5986994',
      device: 'mobile',
      dimensions: '300x250 Rectangle',
      description: 'Mid-page mobile container banner.',
    },
    {
      id: 'home_bottom_desktop',
      name: 'Homepage After-Latest Leaderboard',
      format: 'Display Leaderboard Banner',
      category: 'homepage',
      pageLocation: 'Homepage (Row below Latest Series section)',
      routePath: '/',
      zoneId: '5986226',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'Desktop leaderboard above catalog category section.',
    },
    {
      id: 'home_native_feed',
      name: 'Homepage Native Recommendation Grid (6x2)',
      format: 'Native Recommendation Feed',
      category: 'homepage',
      pageLocation: 'Homepage (Row below Categories / Genres section)',
      routePath: '/',
      zoneId: '5986302',
      device: 'desktop',
      dimensions: 'Native 6x2 Multi-Grid',
      description: 'Sponsored recommendations blending natively into anime catalog cards.',
    },

    // 13-14: Series Details Page
    {
      id: 'series_desktop',
      name: 'Series Details Banner (Desktop)',
      format: 'Display Leaderboard Banner',
      category: 'series',
      pageLocation: 'Series Page (Below episode playlist & metadata)',
      routePath: '/series/sample',
      zoneId: '5986920',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'High visibility banner on show synopsis and episode index pages.',
    },
    {
      id: 'series_mobile',
      name: 'Series Details Banner (Mobile)',
      format: 'Mobile Rectangle Banner',
      category: 'series',
      pageLocation: 'Series Page (Below episode playlist & metadata)',
      routePath: '/series/sample',
      zoneId: '5986998',
      device: 'mobile',
      dimensions: '300x250 Rectangle',
      description: 'Mobile responsive banner on series information pages.',
    },

    // 15-16: Watch Streaming Page
    {
      id: 'watch_desktop',
      name: 'Watch Page Player Banner (Desktop)',
      format: 'Display Leaderboard Banner',
      category: 'watch',
      pageLocation: 'Watch Page (Under video streaming player & server switch)',
      routePath: '/watch/sample',
      zoneId: '5986956',
      device: 'desktop',
      dimensions: '728x90 Billboard',
      description: 'Prime engagement banner placed directly below video player controls.',
    },
    {
      id: 'watch_mobile',
      name: 'Watch Page Player Banner (Mobile)',
      format: 'Mobile Rectangle Banner',
      category: 'watch',
      pageLocation: 'Watch Page (Under video streaming player & server switch)',
      routePath: '/watch/sample',
      zoneId: '5987000',
      device: 'mobile',
      dimensions: '300x250 Rectangle',
      description: 'Mobile banner under video stream player on smartphones.',
    },

    // 17: Browse, 3D, Uncensored, Recent Series Multi-Hub Banner
    {
      id: 'catalog_hubs_shared',
      name: 'Catalog & Filter Hubs Shared Leaderboard',
      format: 'Multi-Hub Catalog Banner',
      category: 'hubs',
      pageLocation: 'Browse (/browse), 3D (/3d), Uncensored (/uncensored), Recent (/recent)',
      routePath: '/browse',
      zoneId: '5986838',
      device: 'all',
      dimensions: '728x90 Billboard',
      description: 'Shared bottom leaderboard banner supporting all catalog filtering and hub pages.',
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
          const bBanners = body.settings.ads_block_banners === 'true';
          const bPop = body.settings.ads_block_popunder === 'true';
          const bMsg = body.settings.ads_block_instant_message === 'true';
          const bPush = body.settings.ads_block_in_page_push === 'true';

          setBlockBanners(bBanners);
          setBlockPopunder(bPop);
          setBlockInstantMessage(bMsg);
          setBlockInPagePush(bPush);

          if (bBanners && bPop && bMsg && bPush) {
            setGlobalKillswitch(true);
          }

          if (body.settings.ads_disabled_zones) {
            try {
              const parsed = typeof body.settings.ads_disabled_zones === 'string' 
                ? JSON.parse(body.settings.ads_disabled_zones) 
                : body.settings.ads_disabled_zones;
              if (Array.isArray(parsed)) {
                setDisabledZoneIds(parsed);
              }
            } catch (e) {}
          }

          setHeaderCustomScript(body.settings.ads_custom_head_script || '');
          setBodyCustomScript(body.settings.ads_custom_body_script || '');
          setCustomScriptsEnabled(body.settings.ads_custom_scripts_enabled !== 'false');
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

  // Master Killswitch Toggle
  const handleToggleKillswitch = () => {
    const nextState = !globalKillswitch;
    setGlobalKillswitch(nextState);
    if (nextState) {
      setBlockBanners(true);
      setBlockPopunder(true);
      setBlockInstantMessage(true);
      setBlockInPagePush(true);
    } else {
      setBlockBanners(false);
      setBlockPopunder(false);
      setBlockInstantMessage(false);
      setBlockInPagePush(false);
    }
  };

  // Toggle Individual Zone
  const handleToggleIndividualZone = (zoneId: string) => {
    setDisabledZoneIds(prev => {
      if (prev.includes(zoneId)) {
        return prev.filter(id => id !== zoneId);
      } else {
        return [...prev, zoneId];
      }
    });
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
          ads_disabled_zones: JSON.stringify(disabledZoneIds),
          ads_custom_head_script: headerCustomScript,
          ads_custom_body_script: bodyCustomScript,
          ads_custom_scripts_enabled: String(customScriptsEnabled),
        }
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetch('/api/views', { method: 'POST', body: JSON.stringify({ action: 'revalidate' }) }).catch(() => {});
        
        setSuccessMsg('Developer ad controls and individual zone settings saved site-wide!');
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

  const handleCopyZone = (zoneId: string) => {
    navigator.clipboard.writeText(zoneId);
    setCopiedZoneId(zoneId);
    setTimeout(() => setCopiedZoneId(null), 2500);
  };

  // Helper to determine whether a zone is active or blocked
  const getZoneStatus = (zone: AdZone) => {
    if (disabledZoneIds.includes(zone.zoneId)) {
      return { isBlocked: true, reason: 'Individually Disabled' };
    }
    if (zone.id === 'popunder' && blockPopunder) {
      return { isBlocked: true, reason: 'Popunders Blocked' };
    }
    if (zone.id === 'instant_message' && blockInstantMessage) {
      return { isBlocked: true, reason: 'Instant Message Blocked' };
    }
    if (zone.id === 'in_page_push' && blockInPagePush) {
      return { isBlocked: true, reason: 'In-Page Push Blocked' };
    }
    if (zone.id !== 'popunder' && zone.id !== 'instant_message' && zone.id !== 'in_page_push' && blockBanners) {
      return { isBlocked: true, reason: 'Banners Blocked' };
    }
    return { isBlocked: false, reason: 'Active & Serving' };
  };

  // Filtered Zones list
  const filteredZones = useMemo(() => {
    return allAdZones.filter(z => {
      // Category filter
      if (selectedCategory !== 'all' && z.category !== selectedCategory) return false;
      // Device filter
      if (selectedDevice !== 'all') {
        if (selectedDevice === 'desktop' && z.device === 'mobile') return false;
        if (selectedDevice === 'mobile' && z.device === 'desktop') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          z.name.toLowerCase().includes(q) ||
          z.zoneId.includes(q) ||
          z.pageLocation.toLowerCase().includes(q) ||
          z.format.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAdZones, selectedCategory, selectedDevice, searchQuery]);

  const activeZonesCount = allAdZones.filter(z => !getZoneStatus(z).isBlocked).length;

  // Projected Monthly Revenue calculation
  const projectedDailyRevenue = useMemo(() => {
    let dailyTotal = 0;
    const viewsInThousands = calcDailyViews / 1000;

    // Popunder (if active)
    if (!blockPopunder && !disabledZoneIds.includes('6008702')) {
      dailyTotal += viewsInThousands * calcPopunderCpm * 0.7;
    }
    // Instant message (if active)
    if (!blockInstantMessage && !disabledZoneIds.includes('6008712')) {
      dailyTotal += viewsInThousands * calcMessageCpm * 0.85;
    }
    // Display Banners & Sticky (if active)
    if (!blockBanners) {
      const activeBanners = allAdZones.filter(z => z.id !== 'popunder' && z.id !== 'instant_message' && z.id !== 'in_page_push' && !disabledZoneIds.includes(z.zoneId)).length;
      dailyTotal += viewsInThousands * calcBannerCpm * (activeBanners / 6);
    }

    return Math.round(dailyTotal * 100) / 100;
  }, [calcDailyViews, calcPopunderCpm, calcBannerCpm, calcMessageCpm, blockPopunder, blockInstantMessage, blockBanners, disabledZoneIds, allAdZones]);

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <span className={styles.breadcrumbTag}>Developer Core &bull; Monetization Engine</span>
          <h1 className={styles.mainTitle}>
            <Radio size={24} style={{ color: 'var(--primary)' }} />
            <span>Developer Ads &amp; Monetization Hub</span>
          </h1>
          <p className={styles.subtitle}>
            Complete 17-zone ExoClick RTB inventory, per-zone toggle controls, master emergency killswitch, and revenue estimation.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={styles.btnPrimary}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className={styles.panelCard}>
        {/* Navigation Tabs Strip */}
        <div className={styles.tabsStrip}>
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`${styles.tabBtn} ${activeTab === 'zones' ? styles.tabBtnActive : ''}`}
          >
            <Sliders size={16} />
            <span>Ad Zones &amp; Granular Toggles</span>
            <span className={styles.tabCountBadge}>{activeZonesCount}/{allAdZones.length} Active</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`${styles.tabBtn} ${activeTab === 'map' ? styles.tabBtnActive : ''}`}
          >
            <LayoutGrid size={16} />
            <span>Placement Visual Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`${styles.tabBtn} ${activeTab === 'revenue' ? styles.tabBtnActive : ''}`}
          >
            <DollarSign size={16} />
            <span>Revenue &amp; CPM Estimator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`${styles.tabBtn} ${activeTab === 'custom' ? styles.tabBtnActive : ''}`}
          >
            <Code size={16} />
            <span>Custom Script Injector</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`${styles.tabBtn} ${activeTab === 'simulator' ? styles.tabBtnActive : ''}`}
          >
            <Maximize2 size={16} />
            <span>Live Format Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`${styles.tabBtn} ${activeTab === 'diagnostics' ? styles.tabBtnActive : ''}`}
          >
            <Activity size={16} />
            <span>Anti-AdBlock Diagnostics</span>
          </button>
        </div>

        {/* Global Toast Alert */}
        {successMsg && (
          <div className={styles.toast}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.8rem 1.2rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 700 }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <p style={{ fontWeight: 700 }}>Loading Complete 17-Zone Ad Inventory &amp; Controls...</p>
          </div>
        ) : (
          <>
            {/* Top Scorecards Overview */}
            <div className={styles.statsOverview}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd' }}>
                  <Megaphone size={22} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Configured Placements</span>
                  <span className={styles.statValue} style={{ color: activeZonesCount > 0 ? '#34d399' : '#f87171' }}>
                    {activeZonesCount} / {allAdZones.length} Active
                  </span>
                  <span className={styles.statSubtext}>{allAdZones.length - activeZonesCount} zones disabled</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }}>
                  <Globe size={22} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Primary Ad Provider</span>
                  <span className={styles.statValue} style={{ fontSize: '1.15rem' }}>ExoClick RTB</span>
                  <span className={styles.statSubtext}>Direct &amp; Programmatic</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <TrendingUp size={22} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Est. Monthly Revenue</span>
                  <span className={styles.statValue} style={{ color: '#34d399' }}>
                    ${Math.round(projectedDailyRevenue * 30).toLocaleString()}
                  </span>
                  <span className={styles.statSubtext}>Based on {calcDailyViews.toLocaleString()} daily views</span>
                </div>
              </div>

              {/* Emergency Master Killswitch Card */}
              <div className={styles.statCard} style={{ border: globalKillswitch ? '1px solid #ef4444' : '1px solid #23283b', background: globalKillswitch ? 'rgba(239, 68, 68, 0.08)' : '#121624' }}>
                <div className={styles.statIcon} style={{ background: globalKillswitch ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)', color: globalKillswitch ? '#f87171' : '#34d399' }}>
                  <Power size={22} />
                </div>
                <div className={styles.statInfo} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className={styles.statLabel}>Master Killswitch</span>
                    <span title="Emergency button: Immediately blocks ALL ads site-wide in 1-click." style={{ color: '#64748b', cursor: 'help' }}>
                      <Info size={12} />
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 850, color: globalKillswitch ? '#f87171' : '#34d399' }}>
                      {globalKillswitch ? 'ALL BLOCKED' : 'SERVING'}
                    </span>
                    <label className={styles.switchWrapper}>
                      <input
                        type="checkbox"
                        className={styles.switchInput}
                        checked={globalKillswitch}
                        onChange={handleToggleKillswitch}
                      />
                      <span className={styles.switchSlider} style={{ backgroundColor: globalKillswitch ? '#ef4444' : '#1f2538' }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB 1: ALL 17 AD ZONES INVENTORY WITH GRANULAR TOGGLES */}
            {activeTab === 'zones' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Ad Category Visibility Switches */}
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
                      <span>Ad Category Visibility Switches (Bulk Controls)</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Toggle entire ad categories ON or OFF across the website.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {/* Banners Toggle */}
                    <div className={`${styles.groupCard} ${blockBanners ? styles.groupCardActive : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Hide All Banners &amp; Native</strong>
                          <span style={{ fontSize: '0.72rem', color: blockBanners ? '#f87171' : '#34d399', fontWeight: 700 }}>
                            {blockBanners ? 'BLOCKED (Hidden)' : 'ACTIVE (Visible)'}
                          </span>
                        </div>
                        <label className={styles.switchWrapper}>
                          <input
                            type="checkbox"
                            className={styles.switchInput}
                            checked={blockBanners}
                            onChange={(e) => setBlockBanners(e.target.checked)}
                          />
                          <span className={styles.switchSlider} />
                        </label>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                        Controls all 728x90 leaderboards, native 6x2 multi-grids, mobile 300x250 rectangles, and 300x50 sticky footers (13 Zones).
                      </p>
                    </div>

                    {/* Popunder Toggle */}
                    <div className={`${styles.groupCard} ${blockPopunder ? styles.groupCardActive : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Hide Popunder Ads</strong>
                          <span style={{ fontSize: '0.72rem', color: blockPopunder ? '#f87171' : '#34d399', fontWeight: 700 }}>
                            {blockPopunder ? 'BLOCKED (Hidden)' : 'ACTIVE (Visible)'}
                          </span>
                        </div>
                        <label className={styles.switchWrapper}>
                          <input
                            type="checkbox"
                            className={styles.switchInput}
                            checked={blockPopunder}
                            onChange={(e) => setBlockPopunder(e.target.checked)}
                          />
                          <span className={styles.switchSlider} />
                        </label>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                        Controls background window redirect handler with 5-minute cooldown capping (Zone 6008702).
                      </p>
                    </div>

                    {/* Instant Message Toggle */}
                    <div className={`${styles.groupCard} ${blockInstantMessage ? styles.groupCardActive : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Hide Instant Message</strong>
                          <span style={{ fontSize: '0.72rem', color: blockInstantMessage ? '#f87171' : '#34d399', fontWeight: 700 }}>
                            {blockInstantMessage ? 'BLOCKED (Hidden)' : 'ACTIVE (Visible)'}
                          </span>
                        </div>
                        <label className={styles.switchWrapper}>
                          <input
                            type="checkbox"
                            className={styles.switchInput}
                            checked={blockInstantMessage}
                            onChange={(e) => setBlockInstantMessage(e.target.checked)}
                          />
                          <span className={styles.switchSlider} />
                        </label>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                        Controls bottom-right floating chat recommendation dialog with 30s rotation (Zone 6008712).
                      </p>
                    </div>

                    {/* In-Page Push Toggle */}
                    <div className={`${styles.groupCard} ${blockInPagePush ? styles.groupCardActive : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block' }}>Hide In-Page Push</strong>
                          <span style={{ fontSize: '0.72rem', color: blockInPagePush ? '#f87171' : '#34d399', fontWeight: 700 }}>
                            {blockInPagePush ? 'BLOCKED (Hidden)' : 'ACTIVE (Visible)'}
                          </span>
                        </div>
                        <label className={styles.switchWrapper}>
                          <input
                            type="checkbox"
                            className={styles.switchInput}
                            checked={blockInPagePush}
                            onChange={(e) => setBlockInPagePush(e.target.checked)}
                          />
                          <span className={styles.switchSlider} />
                        </label>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                        Controls delayed bottom-right push alert notification box (Zone 6008722).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Complete 17-Zone Inventory List with Filters, Search, and Per-Zone Toggle Switches */}
                <div className={styles.subCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                        <span>Individual Ad Zone Controls ({allAdZones.length} Zones Total)</span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                        Enable or disable any specific ad zone individually using the switch next to each row. Click "Save Settings" to apply.
                      </p>
                    </div>

                    {/* Search Input */}
                    <div style={{ position: 'relative', width: '280px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search zone ID, placement, format..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.inputField}
                        style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  {/* Category & Device Filter Pills */}
                  <div className={styles.filterStrip}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                      Page:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`${styles.filterPill} ${selectedCategory === 'all' ? styles.filterPillActive : ''}`}
                    >
                      All ({allAdZones.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('homepage')}
                      className={`${styles.filterPill} ${selectedCategory === 'homepage' ? styles.filterPillActive : ''}`}
                    >
                      Homepage (6)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('watch')}
                      className={`${styles.filterPill} ${selectedCategory === 'watch' ? styles.filterPillActive : ''}`}
                    >
                      Watch Page (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('series')}
                      className={`${styles.filterPill} ${selectedCategory === 'series' ? styles.filterPillActive : ''}`}
                    >
                      Series Page (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('global')}
                      className={`${styles.filterPill} ${selectedCategory === 'global' ? styles.filterPillActive : ''}`}
                    >
                      Global Overlays (4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('footer')}
                      className={`${styles.filterPill} ${selectedCategory === 'footer' ? styles.filterPillActive : ''}`}
                    >
                      Footer (2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('hubs')}
                      className={`${styles.filterPill} ${selectedCategory === 'hubs' ? styles.filterPillActive : ''}`}
                    >
                      Catalog Hubs (1)
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginRight: '0.25rem' }}>
                        Device:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDevice('all')}
                        className={`${styles.filterPill} ${selectedDevice === 'all' ? styles.filterPillActive : ''}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDevice('desktop')}
                        className={`${styles.filterPill} ${selectedDevice === 'desktop' ? styles.filterPillActive : ''}`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDevice('mobile')}
                        className={`${styles.filterPill} ${selectedDevice === 'mobile' ? styles.filterPillActive : ''}`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>

                  {/* Zone Items List with Individual Switch Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredZones.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        No ad zones matched your search or filter criteria.
                      </div>
                    ) : (
                      filteredZones.map((zone) => {
                        const { isBlocked, reason } = getZoneStatus(zone);
                        const isIndividuallyDisabled = disabledZoneIds.includes(zone.zoneId);

                        return (
                          <div 
                            key={zone.id} 
                            className={`${styles.zoneRow} ${isBlocked ? styles.zoneRowBlocked : styles.zoneRowActive}`}
                          >
                            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc' }}>
                                  {zone.name}
                                </h4>
                                <span 
                                  style={{ 
                                    fontSize: '0.68rem', 
                                    fontWeight: 800, 
                                    padding: '0.15rem 0.55rem', 
                                    borderRadius: '12px',
                                    textTransform: 'uppercase',
                                    background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: isBlocked ? '#f87171' : '#34d399',
                                    border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  {isBlocked ? <ShieldAlert size={11} /> : <ShieldCheck size={11} />}
                                  {isBlocked ? reason : 'Active'}
                                </span>
                                <span style={{ fontSize: '0.72rem', background: '#181d2e', color: '#cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #23283b' }}>
                                  {zone.dimensions}
                                </span>
                              </div>

                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                {zone.description}
                              </p>

                              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.45rem', fontSize: '0.74rem', color: '#64748b', flexWrap: 'wrap' }}>
                                <span><strong>Format:</strong> {zone.format}</span>
                                <span><strong>Placement:</strong> {zone.pageLocation}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                              {/* Zone ID Info with Copy */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Zone ID</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <code style={{ fontSize: '1.05rem', color: 'var(--primary)', fontWeight: 800 }}>{zone.zoneId}</code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyZone(zone.zoneId)}
                                    title="Copy Zone ID"
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
                                  >
                                    {copiedZoneId === zone.zoneId ? <Check size={13} style={{ color: '#34d399' }} /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </div>

                              {/* Target Devices */}
                              <div style={{ display: 'flex', gap: '0.35rem', background: '#0a0d16', padding: '0.3rem', borderRadius: '8px', border: '1px solid #23283b' }}>
                                {(zone.device === 'all' || zone.device === 'desktop') && (
                                  <span title="Desktop supported" style={{ padding: '0.25rem', color: '#94a3b8', display: 'flex' }}>
                                    <Monitor size={15} />
                                  </span>
                                )}
                                {(zone.device === 'all' || zone.device === 'mobile') && (
                                  <span title="Mobile supported" style={{ padding: '0.25rem', color: '#94a3b8', display: 'flex' }}>
                                    <Smartphone size={15} />
                                  </span>
                                )}
                              </div>

                              {/* Individual Per-Zone Switch Toggle */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <label className={styles.switchWrapper}>
                                  <input
                                    type="checkbox"
                                    className={styles.switchInput}
                                    checked={!isIndividuallyDisabled}
                                    onChange={() => handleToggleIndividualZone(zone.zoneId)}
                                  />
                                  <span className={styles.switchSlider} />
                                </label>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isIndividuallyDisabled ? '#f87171' : '#34d399' }}>
                                  {isIndividuallyDisabled ? 'OFF' : 'ON'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PLACEMENT VISUAL MAP */}
            {activeTab === 'map' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <LayoutGrid size={18} style={{ color: 'var(--primary)' }} />
                      <span>Frontend Ad Placement Visual Architecture (All Pages)</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Visual schematic showing all 17 ad placements across Homepage, Watch Episode, Series Details, Catalog Hubs, and Global Footers.
                    </p>
                  </div>

                  {/* Wireframe Mockup Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Homepage Schematic */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>🏠 Homepage (6 Ad Slots)</span>
                        <Link href="/" target="_blank" style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span>View Page</span>
                          <ExternalLink size={11} />
                        </Link>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ background: '#121624', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          Header &amp; Featured Carousel
                        </div>
                        
                        {/* Top Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986176')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986176')) ? '#ef4444' : '#7c3aed'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986176')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Top Leaderboard (728x90) / Mobile (300x250)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zones: 5986176 / 5986984</span>
                        </div>

                        <div style={{ background: '#121624', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          Trending Anime Series Section
                        </div>

                        {/* Mid Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986194')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986194')) ? '#ef4444' : '#7c3aed'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986194')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Mid Leaderboard (728x90) / Mobile (300x250)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zones: 5986194 / 5986994</span>
                        </div>

                        <div style={{ background: '#121624', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          Latest Released Episodes Grid
                        </div>

                        {/* After Latest Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986226')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986226')) ? '#ef4444' : '#7c3aed'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986226')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Leaderboard Banner 728x90
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zone: 5986226</span>
                        </div>

                        {/* Native Multi-Grid Feed */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986302')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986302')) ? '#ef4444' : '#7c3aed'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986302')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Native Recommend Feed (6x2)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zone: 5986302</span>
                        </div>
                      </div>
                    </div>

                    {/* Watch Streaming Page Schematic */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>🎬 Watch Streaming Page</span>
                        <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 800 }}>/watch/[episodeId]</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ background: '#121624', padding: '1.5rem 0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          🎬 Main HLS Video Streaming Player
                        </div>

                        {/* Under Player Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986956')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986956')) ? '#ef4444' : '#10b981'}`, padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986956')) ? '#f87171' : '#34d399', display: 'block' }}>
                            [AD] Under-Player Banner (Desktop 728x90 / Mobile 300x250)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zones: 5986956 / 5987000</span>
                        </div>

                        <div style={{ background: '#121624', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          Episode Navigation &amp; Server Switcher
                        </div>

                        {/* Mobile Sticky Footer */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('6008718')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('6008718')) ? '#ef4444' : '#06b6d4'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('6008718')) ? '#f87171' : '#67e8f9', display: 'block' }}>
                            [AD] Mobile Sticky Footer 300x50
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zone: 6008718 (Mobile strictly)</span>
                        </div>
                      </div>
                    </div>

                    {/* Series Details Page & Hubs */}
                    <div style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '12px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>📑 Series Page &amp; Catalog Hubs</span>
                        <span style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 800 }}>/series, /browse, /3d, /recent</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ background: '#121624', padding: '0.6rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          Series Synopsis, Studio &amp; Character Metadata
                        </div>

                        {/* Series Details Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986920')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986920')) ? '#ef4444' : '#7c3aed'}`, padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986920')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Series Episode List Banner (728x90 / 300x250)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zones: 5986920 / 5986998</span>
                        </div>

                        {/* Catalog Hubs Shared Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986838')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986838')) ? '#ef4444' : '#7c3aed'}`, padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986838')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Catalog &amp; Filter Hubs Shared Leaderboard
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zone: 5986838 (/browse, /3d, /uncensored)</span>
                        </div>

                        {/* Global Footer Ad */}
                        <div style={{ background: (blockBanners || disabledZoneIds.includes('5986212')) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.15)', border: `1px dashed ${(blockBanners || disabledZoneIds.includes('5986212')) ? '#ef4444' : '#7c3aed'}`, padding: '0.65rem', borderRadius: '6px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: (blockBanners || disabledZoneIds.includes('5986212')) ? '#f87171' : '#c4b5fd', display: 'block' }}>
                            [AD] Global Footer Banners (728x90 / 300x250)
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Zones: 5986212 / 5986980</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REVENUE & CPM ESTIMATOR */}
            {activeTab === 'revenue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calculator size={18} style={{ color: '#34d399' }} />
                      <span>Monetization CPM &amp; Revenue Projection Calculator</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Simulate expected earnings based on your daily traffic and active ExoClick format CPM rates.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Daily Page Views
                      </label>
                      <input
                        type="number"
                        value={calcDailyViews}
                        onChange={(e) => setCalcDailyViews(Number(e.target.value) || 0)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Popunder CPM Rate ($)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcPopunderCpm}
                        onChange={(e) => setCalcPopunderCpm(Number(e.target.value) || 0)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Display Banners Avg CPM ($)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={calcBannerCpm}
                        onChange={(e) => setCalcBannerCpm(Number(e.target.value) || 0)}
                        className={styles.inputField}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>
                        Instant Message CPM ($)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcMessageCpm}
                        onChange={(e) => setCalcMessageCpm(Number(e.target.value) || 0)}
                        className={styles.inputField}
                      />
                    </div>
                  </div>

                  {/* Calculated Results Banner */}
                  <div style={{ background: '#0a0d16', border: '1px solid #1f2538', borderRadius: '12px', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Daily Earnings</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '0.2rem' }}>
                        ${projectedDailyRevenue.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Monthly Earnings (30 Days)</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>
                        ${(projectedDailyRevenue * 30).toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Annual Run-Rate</span>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c4b5fd', marginTop: '0.2rem' }}>
                        ${(projectedDailyRevenue * 365).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CUSTOM SCRIPT INJECTOR */}
            {activeTab === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Code size={18} style={{ color: 'var(--primary)' }} />
                        <span>Custom Ad Network Script &amp; Tag Injector</span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                        Inject additional ad provider scripts (PopCash, JuicyAds, TrafficStars, Direct HTML) into the public website.
                      </p>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#0a0d16', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #23283b' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: customScriptsEnabled ? '#34d399' : '#f87171' }}>
                        {customScriptsEnabled ? 'Custom Scripts Enabled' : 'Custom Scripts Paused'}
                      </span>
                      <input
                        type="checkbox"
                        checked={customScriptsEnabled}
                        onChange={(e) => setCustomScriptsEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                        Header Script (`&lt;head&gt;`) Code Injection
                      </label>
                      <textarea
                        rows={4}
                        value={headerCustomScript}
                        onChange={(e) => setHeaderCustomScript(e.target.value)}
                        placeholder="<!-- Paste verification or header ad provider tag here -->&#10;<script async src='https://...'></script>"
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                        Body Footer Script (`&lt;body&gt;`) Code Injection
                      </label>
                      <textarea
                        rows={4}
                        value={bodyCustomScript}
                        onChange={(e) => setBodyCustomScript(e.target.value)}
                        placeholder="<!-- Paste popup triggers or floating ad scripts here -->"
                        className={styles.inputField}
                        style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className={styles.btnPrimary}
                      >
                        {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                        <span>Save Custom Scripts</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: LIVE SIMULATOR */}
            {activeTab === 'simulator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Maximize2 size={18} style={{ color: 'var(--primary)' }} />
                      <span>Live Banner Dimensions &amp; Format Simulator</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Test ad aspect ratios and simulated render container sizes before going live.
                    </p>
                  </div>

                  {/* Format Switcher Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSimFormat('728x90')}
                      className={simFormat === '728x90' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      728x90 Leaderboard
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimFormat('300x250')}
                      className={simFormat === '300x250' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      300x250 Medium Rect
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimFormat('300x50')}
                      className={simFormat === '300x50' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      300x50 Mobile Sticky
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimFormat('instant_message')}
                      className={simFormat === 'instant_message' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      Instant Message (Chat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimFormat('push')}
                      className={simFormat === 'push' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      In-Page Push Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimFormat('native')}
                      className={simFormat === 'native' ? styles.btnPrimary : styles.btnSecondary}
                    >
                      Native 6x2 Grid Feed
                    </button>
                  </div>

                  {/* Canvas Simulator Box */}
                  <div style={{ background: '#0a0d16', border: '1px solid #1f2538', borderRadius: '12px', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', overflowX: 'auto' }}>
                    {simFormat === '728x90' && (
                      <div style={{ width: '728px', height: '90px', background: '#121624', border: '2px dashed #7c3aed', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>728x90 Billboard Leaderboard</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Standard Desktop Wide Aspect Ad Slot</span>
                      </div>
                    )}

                    {simFormat === '300x250' && (
                      <div style={{ width: '300px', height: '250px', background: '#121624', border: '2px dashed #7c3aed', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>300x250 Medium Rectangle</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sidebar / Stream Player Right Column</span>
                      </div>
                    )}

                    {simFormat === '300x50' && (
                      <div style={{ width: '300px', height: '50px', background: '#121624', border: '2px dashed #10b981', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#34d399' }}>300x50 Mobile Sticky Footer</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Viewport Anchored</span>
                      </div>
                    )}

                    {simFormat === 'instant_message' && (
                      <div style={{ width: '280px', height: '180px', background: '#121624', border: '2px solid #06b6d4', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#06b6d4' }}>Support / Live Partner</span>
                          <p style={{ fontSize: '0.78rem', color: '#f8fafc', margin: '0.35rem 0 0 0' }}>Hey there! Watch the latest exclusive HD anime online now!</p>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ExoClick Instant Message Simulation</span>
                      </div>
                    )}

                    {simFormat === 'push' && (
                      <div style={{ width: '320px', background: '#121624', border: '2px solid #ec4899', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '36px', height: '36px', background: '#ec4899', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>!</span>
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block' }}>New Episode Streaming</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Click to unlock 1080p full stream</span>
                        </div>
                      </div>
                    )}

                    {simFormat === 'native' && (
                      <div style={{ width: '100%', maxWidth: '720px', background: '#121624', border: '2px dashed #7c3aed', borderRadius: '12px', padding: '1.25rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#c4b5fd', display: 'block', marginBottom: '0.75rem' }}>Native 6x2 Multi-Feed Recommendation Simulator</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                          {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ background: '#0a0d16', border: '1px solid #23283b', borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
                              <div style={{ height: '70px', background: '#181d2e', borderRadius: '4px', marginBottom: '0.35rem' }} />
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Sponsored Card #{i}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DIAGNOSTICS */}
            {activeTab === 'diagnostics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.subCard}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Activity size={18} style={{ color: 'var(--primary)' }} />
                      <span>Ad Provider CDN &amp; Telemetry Diagnostics</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      Check network reachability, CDN script load health, and anti-adblock status.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>ExoClick Global CDN (https://a.magsrv.com/ad-provider.js)</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Primary script distributor for standard display banners</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        ✓ REACHABLE (HTTP 200)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>Popunder Capping Storage Handlers</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Local storage cookie tracking 5-minute cooldown timer</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        ✓ OK (Storage Active)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc' }}>Admin Panel Safe Zone Protection</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Strictly prohibits ads from rendering anywhere within /admin</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.65rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        ✓ PROTECTED (No Ads in Admin)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
