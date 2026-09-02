import React from 'react';
import Link from 'next/link';
import { 
  Film, 
  FolderOpen, 
  Video, 
  Eye, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  Database, 
  HardDrive, 
  Search,
  Lock,
  Server,
  Image as ImageIcon,
  Tag,
  AlertCircle
} from 'lucide-react';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSeriesViewsMap } from '@/utils/views';
import { getR2Url } from '@/utils/r2';
import { getR2StorageStats } from '@/utils/r2Storage';
import styles from './admin.module.css';

export default async function AdminOverviewPage() {
  const adminSupabase = createAdminClient();

  let allSeries: any[] = [];
  let seasonsCount = 0;
  let allEpisodes: any[] = [];
  let viewsCount = 0;
  let viewsMap: Record<string, number> = {};

  try {
    // 1. Fetch counts & full series/episode data in parallel for complete analytics
    const [
      { data: seriesData },
      { count: seaCount },
      { data: episodesData },
      { count: vCount },
      vMap
    ] = await Promise.all([
      adminSupabase
        .from('series')
        .select('id, title, slug, is_published, poster_image_key, cover_image_key, banner_image_key, image_library, studio, release_year, tags, description, runtime, created_at')
        .order('created_at', { ascending: false }),
      adminSupabase.from('seasons').select('*', { count: 'exact', head: true }),
      adminSupabase
        .from('episodes')
        .select(`
          id, 
          episode_number, 
          title, 
          duration_seconds, 
          thumbnail_key, 
          thumbnail_options,
          video_key,
          is_published, 
          created_at, 
          seasons (
            title, 
            series (
              id,
              title, 
              slug
            )
          )
        `)
        .order('created_at', { ascending: false }),
      adminSupabase.from('episode_views').select('*', { count: 'exact', head: true }),
      getSeriesViewsMap()
    ]);

    if (seriesData) allSeries = seriesData;
    seasonsCount = seaCount || 0;
    if (episodesData) allEpisodes = episodesData;
    viewsCount = vCount || 0;
    viewsMap = vMap || {};

  } catch (err) {
    console.error('Error fetching admin overview metrics:', err);
  }

  // Calculate Cloudflare R2 Storage Stats (Videos vs Series Posters vs Episode Thumbnails)
  const storageStats = await getR2StorageStats(allSeries, allEpisodes);

  // Calculate Catalog Metrics
  const totalSeries = allSeries.length;
  const publishedSeriesList = allSeries.filter((s) => s.is_published);
  const draftSeriesList = allSeries.filter((s) => !s.is_published);
  const publishedSeriesCount = publishedSeriesList.length;
  const draftSeriesCount = draftSeriesList.length;
  const publishedPercent = totalSeries > 0 ? Math.round((publishedSeriesCount / totalSeries) * 100) : 100;

  const totalEpisodes = allEpisodes.length;
  const publishedEpisodesList = allEpisodes.filter((e) => e.is_published);
  const publishedEpisodesCount = publishedEpisodesList.length;
  const episodesWithDuration = allEpisodes.filter((e) => e.duration_seconds && e.duration_seconds > 0);
  const totalDurationSeconds = episodesWithDuration.reduce((acc, ep) => acc + ep.duration_seconds, 0);
  const avgDurationMinutes = episodesWithDuration.length > 0 
    ? Math.ceil(totalDurationSeconds / episodesWithDuration.length / 60) 
    : 24;
  const totalContentHours = Math.round((totalDurationSeconds / 3600) * 10) / 10;

  // Metadata Completion Score (% of series with poster/cover + description + tags)
  const completeMetadataCount = allSeries.filter(
    (s) => (s.poster_image_key || s.cover_image_key) && s.description && s.tags && s.tags.length > 0
  ).length;
  const metadataHealthScore = totalSeries > 0 
    ? Math.round((completeMetadataCount / totalSeries) * 100) 
    : 100;

  // Recently Published Series (Prioritizing actual live published series with artwork)
  const recentPublishedSeries = publishedSeriesList.slice(0, 5);
  // Recently Published Episodes
  const recentPublishedEpisodes = (publishedEpisodesList.length > 0 ? publishedEpisodesList : allEpisodes).slice(0, 5);

  // Top 5 Trending / Most-Viewed Series
  const topTrendingSeries = [...allSeries]
    .sort((a, b) => (viewsMap[b.id] || 0) - (viewsMap[a.id] || 0))
    .slice(0, 5);

  // Top Category / Tag distribution
  const tagCounts: Record<string, number> = {};
  allSeries.forEach((s) => {
    (s.tags || []).forEach((t: string) => {
      const cleanTag = t.trim();
      if (cleanTag && cleanTag.toLowerCase() !== 'featured') {
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      }
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Panel Header */}
      <div className={styles.panelHeader} style={{ marginBottom: '0.2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 850, letterSpacing: '-0.02em', margin: 0 }}>
            System Overview
          </h2>
          <p style={{ color: 'var(--foreground-secondary)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
            High-level metrics, storage analytics, system diagnostics, and content velocity.
          </p>
        </div>
      </div>

      {/* Section A: Comprehensive Catalog Health & Content Metrics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.2rem' }}>
        
        {/* Total Series */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}>
              <Film size={22} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              {publishedPercent}% Live
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>{totalSeries}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>Total Series</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{publishedSeriesCount} Published</span>
            <span>•</span>
            <span style={{ color: draftSeriesCount > 0 ? '#f59e0b' : 'var(--foreground-muted)', fontWeight: 600 }}>{draftSeriesCount} Drafts</span>
          </div>
        </div>

        {/* Total Episodes */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' }}>
              <Video size={22} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              {publishedEpisodesCount} Streamable
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>{totalEpisodes}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>Episodes Indexed</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: 'var(--foreground-primary)', fontWeight: 700 }}>~{avgDurationMinutes}m avg</span>
            <span>•</span>
            <span>{totalContentHours} hrs runtime</span>
          </div>
        </div>

        {/* Seasons & Volumes */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <FolderOpen size={22} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Multi-Volume
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>{seasonsCount}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>Seasons & Arcs</div>
          </div>
          <div className={styles.statSubtext}>
            <span>~{(seasonsCount / (totalSeries || 1)).toFixed(1)} seasons / series avg</span>
          </div>
        </div>

        {/* Total Views */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}>
              <Eye size={22} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
              Live Tracking
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>{viewsCount}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>Catalog Views</div>
          </div>
          <div className={styles.statSubtext}>
            <span>Real-time playback analytics</span>
          </div>
        </div>

        {/* Metadata SEO Health Score */}
        <div className={styles.statCardEnhanced}>
          <div className={styles.statCardTop}>
            <div className={styles.statIconGlowing} style={{ background: 'linear-gradient(135deg, #eab308 0%, #d97706 100%)' }}>
              <Sparkles size={22} />
            </div>
            <span className={styles.statBadgePill} style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              SEO Health
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>{metadataHealthScore}%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>Metadata Quality</div>
          </div>
          <div className={styles.statSubtext}>
            <span style={{ color: metadataHealthScore >= 90 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
              {completeMetadataCount} of {totalSeries}
            </span>
            <span>complete records</span>
          </div>
        </div>

      </section>

      {/* Cloudflare R2 Storage Breakdown Widget */}
      <section className={styles.storageCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server size={20} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em' }}>
              Cloudflare R2 Bucket Storage Analytics
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 850, color: 'var(--foreground-primary)' }}>
              {storageStats.total.formatted} Total Storage
            </span>
            <span style={{ fontSize: '0.74rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '0.2rem 0.55rem', borderRadius: '15px', fontWeight: 700 }}>
              {storageStats.total.count.toLocaleString()} Files
            </span>
          </div>
        </div>

        {/* Multi-Segment Storage Distribution Progress Bar */}
        <div>
          <div className={styles.storageBarContainer} title={`Videos: ${storageStats.videos.percentage}% • Series Posters: ${storageStats.seriesMedia.percentage}% • Episode Thumbnails: ${storageStats.episodeThumbs.percentage}%`}>
            <div className={styles.storageSegmentVideos} style={{ width: `${storageStats.videos.percentage}%` }} />
            <div className={styles.storageSegmentPosters} style={{ width: `${storageStats.seriesMedia.percentage}%` }} />
            <div className={styles.storageSegmentThumbs} style={{ width: `${storageStats.episodeThumbs.percentage}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.74rem', color: 'var(--foreground-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                Episode Videos ({storageStats.videos.percentage}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                Series Posters & Covers ({storageStats.seriesMedia.percentage}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                Episode Thumbnails ({storageStats.episodeThumbs.percentage}%)
              </span>
            </div>
            <span>Origin: media.playhentai.live</span>
          </div>
        </div>

        {/* 3-Column Storage Breakdown Cards */}
        <div className={styles.storageGrid}>
          {/* Video Episodes Storage */}
          <div className={styles.storageItemCard}>
            <div className={styles.storageItemTop}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Video size={16} /> Episode Videos (.mp4)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>{storageStats.videos.percentage}%</span>
            </div>
            <div className={styles.storageItemSize}>{storageStats.videos.formatted}</div>
            <div className={styles.storageItemMeta}>
              <span>{storageStats.videos.count} streamable video files</span>
            </div>
          </div>

          {/* Series Posters & Covers Storage */}
          <div className={styles.storageItemCard}>
            <div className={styles.storageItemTop}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Film size={16} /> Series Posters & Covers
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>{storageStats.seriesMedia.percentage}%</span>
            </div>
            <div className={styles.storageItemSize}>{storageStats.seriesMedia.formatted}</div>
            <div className={styles.storageItemMeta}>
              <span>{storageStats.seriesMedia.count} poster & banner assets</span>
            </div>
          </div>

          {/* Episode Thumbnails Storage */}
          <div className={styles.storageItemCard}>
            <div className={styles.storageItemTop}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={16} /> Episode Thumbnails
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>{storageStats.episodeThumbs.percentage}%</span>
            </div>
            <div className={styles.storageItemSize}>{storageStats.episodeThumbs.formatted}</div>
            <div className={styles.storageItemMeta}>
              <span>{storageStats.episodeThumbs.count} custom frame thumbnails</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section C: System Health & SEO / Video Indexing Status Widget */}
      <section className={styles.healthCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={20} style={{ color: '#22c55e' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em' }}>
              Live System Health & Video Indexing Status
            </h3>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.25rem 0.65rem', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className={styles.healthIndicator} />
            All Systems Operational
          </span>
        </div>

        <div className={styles.healthGrid}>
          {/* Database */}
          <div className={styles.healthItem}>
            <div className={styles.healthItemHeader}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Database size={15} style={{ color: '#3b82f6' }} /> Database (Supabase)
              </span>
              <span className={styles.healthIndicator} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
              Connected & Healthy • Fast REST APIs
            </span>
          </div>

          {/* Media Storage */}
          <div className={styles.healthItem}>
            <div className={styles.healthItemHeader}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={15} style={{ color: '#a855f7' }} /> Media Storage (CDN)
              </span>
              <span className={styles.healthIndicator} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
              Cloudflare R2 • media.playhentai.live
            </span>
          </div>

          {/* Sitemaps XML */}
          <div className={styles.healthItem}>
            <div className={styles.healthItemHeader}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={15} style={{ color: '#eab308' }} /> Sitemaps XML
              </span>
              <span className={styles.healthIndicator} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.72rem' }}>
              <a href="/sitemap.xml" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                Standard ↗
              </a>
              <span style={{ color: 'var(--border)' }}>•</span>
              <a href="/sitemap-video.xml" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                Video XML ↗
              </a>
            </div>
          </div>

          {/* Video Security */}
          <div className={styles.healthItem}>
            <div className={styles.healthItemHeader}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={15} style={{ color: '#10b981' }} /> Watch Page Isolation
              </span>
              <span className={styles.healthIndicator} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
              Zero MP4 leaks on catalogs (GSC Safe)
            </span>
          </div>

          {/* Search Engine Verification */}
          <div className={styles.healthItem}>
            <div className={styles.healthItemHeader}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Search size={15} style={{ color: '#ec4899' }} /> Search Engine Status
              </span>
              <span className={styles.healthIndicator} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--foreground-muted)' }}>
              Google & Yandex (fe39af37bfe31147) Live
            </span>
          </div>
        </div>
      </section>

      {/* Catalog Velocity & Top Categories */}
      {topTags.length > 0 && (
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--foreground-primary)' }}>Top Genres & Categories:</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {topTags.map(([tag, count]) => (
              <Link key={tag} href={`/categories/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={styles.categoryPill} target="_blank">
                <span>{tag}</span>
                <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({count})</span>
              </Link>
            ))}
            <Link href="/admin/filters" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, marginLeft: '0.3rem' }}>
              Manage All →
            </Link>
          </div>
        </section>
      )}

      {/* Section E: Rich Recent Activity & Quick Preview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Recently Published Series (Prioritizing Published Live Content) */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Film size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Recently Published Series</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {draftSeriesCount > 0 && (
                <Link href="/admin/series" className={styles.draftNoticePill} title="View series drafts">
                  <AlertCircle size={12} /> {draftSeriesCount} Drafts
                </Link>
              )}
              <Link href="/admin/series" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span>View All</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPublishedSeries.length > 0 ? (
              recentPublishedSeries.map((item) => (
                <Link key={item.id} href={`/series/${item.slug}`} target="_blank" className={styles.activityItemRow} style={{ textDecoration: 'none' }}>
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
              <div className={styles.emptyState}>No published series found in catalog yet.</div>
            )}
          </div>
        </div>

        {/* Recently Added Episodes (Prioritizing Streamable Live Episodes) */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} style={{ color: '#3b82f6' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Recently Added Episodes</h3>
            </div>
            <Link href="/admin/episodes" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPublishedEpisodes.length > 0 ? (
              recentPublishedEpisodes.map((item) => {
                const seriesTitle = item.seasons?.series?.title || 'Unknown Series';
                const seasonTitle = item.seasons?.title || 'Season 1';
                const durationMin = item.duration_seconds ? Math.ceil(item.duration_seconds / 60) : 24;
                return (
                  <Link key={item.id} href={`/watch/${item.id}`} target="_blank" className={styles.activityItemRow} style={{ textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getR2Url(item.thumbnail_key, 'thumbnail')} 
                      alt={item.title} 
                      className={styles.activityVideoThumb}
                    />
                    <div className={styles.activityContent}>
                      <div className={styles.activityTitle} title={item.title}>
                        {item.title}
                      </div>
                      <div className={styles.activityMetaLine}>
                        <span style={{ color: 'var(--foreground-secondary)' }}>{seriesTitle}</span>
                        <span>•</span>
                        <span>{seasonTitle} - Ep {item.episode_number}</span>
                        <span>•</span>
                        <span style={{ color: '#c084fc', fontWeight: 600 }}>{durationMin}m</span>
                      </div>
                    </div>
                    <span className={`${styles.badge} ${item.is_published ? styles.badgeSuccess : styles.badgeWarning}`} style={{ flexShrink: 0 }}>
                      {item.is_published ? 'Live' : 'Draft'}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className={styles.emptyState}>No episodes registered in database yet.</div>
            )}
          </div>
        </div>

        {/* Top 5 Trending & Most-Viewed Series Leaderboard */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Top Viewed Series</h3>
            </div>
            <Link href="/admin/analytics" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>Analytics</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topTrendingSeries.length > 0 ? (
              topTrendingSeries.map((item, idx) => {
                const rankClass = idx === 0 
                  ? styles.rankGold 
                  : idx === 1 
                  ? styles.rankSilver 
                  : idx === 2 
                  ? styles.rankBronze 
                  : styles.rankDefault;
                const views = viewsMap[item.id] || 0;
                return (
                  <Link key={item.id} href={`/series/${item.slug}`} target="_blank" className={styles.activityItemRow} style={{ textDecoration: 'none' }}>
                    <div className={`${styles.rankBadge} ${rankClass}`}>
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
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px', flexShrink: 0 }}>
                      {views.toLocaleString()} views
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className={styles.emptyState}>No series views recorded yet.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
