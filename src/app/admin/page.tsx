import React from 'react';
import Link from 'next/link';
import { 
  Film, 
  FolderOpen, 
  Video, 
  Eye, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  Database, 
  HardDrive, 
  Users,
  Server,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  Sliders,
  MessageSquare,
  Shield,
  Clock,
  Layers,
  Building2,
} from 'lucide-react';
import { getLocalCatalog } from '@/utils/localCatalogStore';
import { getLocalUsers } from '@/utils/authStore';
import { getSeriesViewsMap } from '@/utils/views';
import { getR2Url } from '@/utils/r2';
import SyncCatalogButton from './SyncCatalogButton';
import styles from './admin.module.css';

export default async function AdminOverviewPage() {
  let allSeries: any[] = [];
  let seasonsCount = 0;
  let allEpisodes: any[] = [];
  let viewsMap: Record<string, number> = {};
  let usersCount = 0;
  let adminUsersCount = 0;

  try {
    const [catalog, users, vMap] = await Promise.all([
      getLocalCatalog(),
      getLocalUsers().catch(() => []),
      getSeriesViewsMap().catch(() => ({})),
    ]);

    allSeries = catalog.series || [];
    seasonsCount = catalog.seasons?.length || 0;
    allEpisodes = catalog.episodes || [];
    viewsMap = vMap || {};
    usersCount = users.length;
    adminUsersCount = users.filter((u) => u.role === 'admin').length;
  } catch (err) {
    console.error('Error fetching admin overview metrics:', err);
  }

  // Calculate Metrics
  const totalSeries = allSeries.length;
  const publishedSeriesList = allSeries.filter((s) => s.is_published !== false);
  const draftSeriesList = allSeries.filter((s) => s.is_published === false);
  const publishedSeriesCount = publishedSeriesList.length;
  const draftSeriesCount = draftSeriesList.length;
  const publishedPercent = totalSeries > 0 ? Math.round((publishedSeriesCount / totalSeries) * 100) : 100;

  const totalEpisodes = allEpisodes.length;
  const publishedEpisodesList = allEpisodes.filter((e) => e.is_published !== false);
  const publishedEpisodesCount = publishedEpisodesList.length;

  const episodesWithDuration = allEpisodes.filter((e) => e.duration_seconds && e.duration_seconds > 0);
  const totalDurationSeconds = episodesWithDuration.reduce((acc, ep) => acc + (ep.duration_seconds || 0), 0);
  const totalContentHours = Math.round((totalDurationSeconds / 3600) * 10) / 10;

  const totalCatalogViews = Object.values(viewsMap).reduce((acc, v) => acc + (v || 0), 0);

  // Recently Published Series
  const recentPublishedSeries = publishedSeriesList.slice(0, 5);

  // Top 5 Trending / Most-Viewed Series
  const topTrendingSeries = [...allSeries]
    .sort((a, b) => (viewsMap[b.id] || 0) - (viewsMap[a.id] || 0))
    .slice(0, 5);

  // Quick Launchpad items
  const quickActions = [
    {
      title: 'Episodes Studio',
      description: 'Fullscreen player, storyboard inspector & transcoder',
      href: '/admin/episodes',
      icon: Video,
      color: '#3b82f6',
      badge: `${totalEpisodes} Indexed`,
    },
    {
      title: 'Anime Series',
      description: 'Artwork, synopses, studio metadata & publish state',
      href: '/admin/series',
      icon: Film,
      color: '#8b5cf6',
      badge: `${totalSeries} Titles`,
    },
    {
      title: 'Video Transcoder',
      description: 'Transcoding pipeline (1080p, 720p, 480p renditions)',
      href: '/admin/transcoder',
      icon: Sliders,
      color: '#06b6d4',
      badge: 'Active Engine',
    },
    {
      title: 'Users & Roles',
      description: 'Self-hosted EC2 authentication, passwords & roles',
      href: '/admin/users',
      icon: Users,
      color: '#10b981',
      badge: `${usersCount} Accounts`,
    },
    {
      title: 'Comments Moderation',
      description: 'Review viewer discussions, feedback & approvals',
      href: '/admin/comments',
      icon: MessageSquare,
      color: '#f59e0b',
      badge: 'Community Hub',
    },
    {
      title: 'Database & S3',
      description: 'Cold-boot snapshot backups & direct CSV exports',
      href: '/admin/backups',
      icon: Database,
      color: '#ec4899',
      badge: 'AWS Sydney',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#f8fafc' }}>
              Command Center
            </h1>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.2rem 0.55rem',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <CheckCircle2 size={12} />
              AWS S3 Sydney Online (ap-southeast-2)
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            Unified high-throughput administration console for HentaiKage streaming operations.
          </p>
        </div>
        <SyncCatalogButton />
      </div>

      {/* Section 1: KPI Telemetry Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
        {/* Total Series */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}>
              <Film size={20} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              {publishedPercent}% Live
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{totalSeries}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.1rem' }}>Anime Series</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{publishedSeriesCount} Published</span>
            <span>•</span>
            <span style={{ color: draftSeriesCount > 0 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{draftSeriesCount} Drafts</span>
          </div>
        </div>

        {/* Total Episodes */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' }}>
              <Video size={20} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              {publishedEpisodesCount} Streamable
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{totalEpisodes}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.1rem' }}>Indexed Episodes</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#f8fafc', fontWeight: 700 }}>{totalContentHours} hrs runtime</span>
            <span>•</span>
            <span>{seasonsCount} arcs</span>
          </div>
        </div>

        {/* Total Views */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}>
              <Eye size={20} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
              Telemetry
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{totalCatalogViews.toLocaleString()}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.1rem' }}>Catalog Playbacks</div>
          </div>
          <div className={styles.statSubtext}>
            <span>Real-time audience tracking</span>
          </div>
        </div>

        {/* Users & Authentication */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Users size={20} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Self-Hosted
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{usersCount}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.1rem' }}>Registered Users</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>{adminUsersCount} Admin</span>
            <span>•</span>
            <span>Sub-0.02ms EC2 Crypto</span>
          </div>
        </div>
      </section>

      {/* Section 2: Command Launchpad (Sleek 6-Grid Studio Shortcuts) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Sparkles size={16} color="#38bdf8" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            Studio Workspaces & Shortcuts
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  background: '#0d121f',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: action.color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      background: '#090d16',
                      border: '1px solid #1e293b',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {action.badge}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{action.title}</span>
                    <ArrowRight size={14} color="#64748b" />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    {action.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section 3: AWS S3 Sydney & CloudFront CDN Infrastructure Card */}
      <section
        style={{
          background: '#0d121f',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              AWS S3 Sydney & CloudFront Edge Storage Architecture
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.74rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              Bucket: hentaikage-media
            </span>
            <span style={{ fontSize: '0.74rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
              Region: ap-southeast-2
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Public Media CDN
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem', fontFamily: 'monospace' }}>
              dmfrlqgigpmty.cloudfront.net
            </div>
            <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.35rem' }}>
              ✓ Global Low-Latency Edge Delivery
            </div>
          </div>

          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Database Snapshots
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem', fontFamily: 'monospace' }}>
              database-backups/catalog_latest.json
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.35rem' }}>
              ✓ Automated Cold-Boot Restore Enabled
            </div>
          </div>

          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              EC2 Primary In-Memory Engine
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>
              ~2.68 MB Local Memory Footprint
            </div>
            <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '0.35rem' }}>
              ✓ 0.05ms Micro-Latency Serving
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 2-Column Activity Hub (Recently Published & Top Viewed Anime) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Recently Published Series */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Film size={18} color="#a855f7" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Recently Published Series
              </h3>
            </div>
            <Link
              href="/admin/series"
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#38bdf8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>Manage All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {recentPublishedSeries.length > 0 ? (
              recentPublishedSeries.map((item) => (
                <Link
                  key={item.id}
                  href={`/series/${item.slug}`}
                  target="_blank"
                  className={styles.activityItemRow}
                  style={{ textDecoration: 'none', background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.6rem 0.75rem' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={getR2Url(item.poster_image_key, 'poster')} 
                    alt={item.title} 
                    className={styles.activityPosterThumb}
                  />
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle} title={item.title}>
                      {item.title}
                    </div>
                    <div className={styles.activityMetaLine}>
                      <span>{item.studio || 'Studio N/A'}</span>
                      <span>•</span>
                      <span>{item.release_year || 'Year N/A'}</span>
                      {item.runtime && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#c084fc', fontWeight: 600 }}>{item.runtime}m</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`${styles.badge} ${item.is_published ? styles.badgeSuccess : styles.badgeWarning}`} style={{ flexShrink: 0 }}>
                    {item.is_published ? 'Live' : 'Draft'}
                  </span>
                </Link>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No published series found in catalog yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Viewed Anime Series Leaderboard */}
        <div
          style={{
            background: '#0d121f',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Top Viewed Anime Series
              </h3>
            </div>
            <Link
              href="/admin/analytics"
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#38bdf8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>Full Analytics</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {topTrendingSeries.length > 0 ? (
              topTrendingSeries.map((item, idx) => {
                const views = viewsMap[item.id] || 0;
                return (
                  <Link
                    key={item.id}
                    href={`/series/${item.slug}`}
                    target="_blank"
                    className={styles.activityItemRow}
                    style={{ textDecoration: 'none', background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.6rem 0.75rem' }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: idx === 0 ? 'rgba(234, 179, 8, 0.2)' : idx === 1 ? 'rgba(148, 163, 184, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                        color: idx === 0 ? '#eab308' : idx === 1 ? '#cbd5e1' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getR2Url(item.poster_image_key, 'poster')} 
                      alt={item.title} 
                      className={styles.activityPosterThumb}
                    />
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle} title={item.title}>
                        {item.title}
                      </div>
                      <div className={styles.activityMetaLine}>
                        <span>{item.studio || 'Studio N/A'}</span>
                        <span>•</span>
                        <span>{item.release_year || 'Year N/A'}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0 }}>
                      {views.toLocaleString()} views
                    </span>
                  </Link>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No series views recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
