'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Eye, MessageSquare, Trash2, ShieldAlert, BarChart3, 
  TrendingUp, Film, Clock, Download, 
  RefreshCw, Search, CheckSquare, Square, CheckCircle2,
  Smartphone, Monitor, Tablet, Award, Activity,
  PlayCircle, Zap, Compass, Globe, Layers, ArrowUpRight, Calendar
} from 'lucide-react';
import styles from './analytics.module.css';
import { getR2Url } from '@/utils/r2';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  episode_id: string;
  status?: string;
  profiles?: {
    username: string | null;
    role: string;
  };
  episodeTitle?: string;
  seriesTitle?: string;
  seriesSlug?: string | null;
  posterKey?: string | null;
}

interface ViewedSeries {
  id: string;
  title: string;
  slug: string;
  poster_image_key?: string | null;
  studio?: string | null;
  release_year?: number | null;
  runtime?: number;
  tags?: string[];
  episodeCount?: number;
  viewsCount: number;
  watchHours?: number;
}

interface ViewedEpisode {
  id: string;
  title: string;
  episode_number: number;
  thumbnail_image_key?: string | null;
  series_id?: string | null;
  series_title?: string;
  series_slug?: string | null;
  season_title?: string;
  viewsCount: number;
}

interface GenreShare {
  name: string;
  count: number;
  color: string;
}

interface StudioStat {
  name: string;
  seriesCount: number;
  viewsCount: number;
}

interface ViewTrendPoint {
  date: string;
  count: number;
}

interface VisitTrendPoint {
  date: string;
  visits: number;
  uniqueVisitors: number;
  streamViews: number;
  pagesPerVisit: string;
  watchConversion: number;
  avgDurationFormatted: string;
}

interface TelemetryData {
  totalSessionsCount?: number;
  totalSiteVisits?: number;
  activeVisitorsCount: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  avgPagesPerSession: string;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  adBlockRate: number;
  scrollFunnel: {
    depth25: number;
    depth50: number;
    depth75: number;
    depth100: number;
  };
  watchConversionRate: number;
  totalWatchEvents: number;
  topRoutes: Array<{ route: string; count: number }>;
  today?: {
    uniqueVisitors: number;
    totalVisits: number;
    avgDurationSeconds: number;
    avgDurationFormatted: string;
    avgPagesPerSession: string;
    watchConversionRate: number;
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
    adBlockRate: number;
  };
}

interface TodayRecentPlay {
  id: string;
  viewed_at: string;
  timeAgo: string;
  episode_id: string;
  episode_title: string;
  episode_number: number;
  thumbnail_image_key?: string | null;
  series_id?: string | null;
  series_title: string;
  series_slug?: string | null;
  poster_image_key?: string | null;
  studio?: string | null;
}

interface TodayStats {
  viewsCount: number;
  yesterdayViewsCount: number;
  growthPct: number;
  watchHours: number;
  uniqueSeriesCount: number;
  topSeries: ViewedSeries[];
  topEpisodes: ViewedEpisode[];
  recentPlays: TodayRecentPlay[];
  hourlyDistribution: Array<{ hourLabel: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  // 3 Clear Core Pillars + Secondary Moderation
  const [activeTab, setActiveTab] = useState<'visits' | 'watch' | 'traffic' | 'moderation'>('visits');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  
  // Analytics Data States
  const [totalViews, setTotalViews] = useState<number>(0);
  const [realViewsCount, setRealViewsCount] = useState<number>(0);
  const [totalWatchHours, setTotalWatchHours] = useState<number>(0);
  const [totalSeriesCount, setTotalSeriesCount] = useState<number>(0);
  const [totalEpisodesCount, setTotalEpisodesCount] = useState<number>(0);
  const [viewTrends, setViewTrends] = useState<ViewTrendPoint[]>([]);
  const [visitTrends, setVisitTrends] = useState<VisitTrendPoint[]>([]);
  const [totalAudienceVisits, setTotalAudienceVisits] = useState<number>(0);
  const [totalAudienceUnique, setTotalAudienceUnique] = useState<number>(0);
  const [audienceAvgPages, setAudienceAvgPages] = useState<string>('4.1');
  const [audienceConversion, setAudienceConversion] = useState<number>(50);
  const [genreDistribution, setGenreDistribution] = useState<GenreShare[]>([]);
  const [topStudios, setTopStudios] = useState<StudioStat[]>([]);
  const [mostViewedSeries, setMostViewedSeries] = useState<ViewedSeries[]>([]);
  const [mostViewedEpisodes, setMostViewedEpisodes] = useState<ViewedEpisode[]>([]);
  const [allSeriesAnalytics, setAllSeriesAnalytics] = useState<ViewedSeries[]>([]);
  const [allEpisodesAnalytics, setAllEpisodesAnalytics] = useState<ViewedEpisode[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [periodStats, setPeriodStats] = useState<any>(null);
  const [todayTopContentTab, setTodayTopContentTab] = useState<'series' | 'episodes'>('series');
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Telemetry States
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  // Chart Hover Tooltip State
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; date: string; count: number; x: number; y: number } | null>(null);
  const [hoveredVisitPoint, setHoveredVisitPoint] = useState<{ index: number; date: string; visits: number; unique: number; x: number; y: number } | null>(null);

  // Leaderboard Filter States
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardViewCount, setLeaderboardViewCount] = useState<'10' | '25' | 'all'>('10');

  // Moderation Data States
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentSearch, setCommentSearch] = useState('');
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchViewMetrics(timeRange);
    fetchGlobalComments();
    fetchTelemetryMetrics();
  }, [timeRange]);

  const fetchViewMetrics = async (range = timeRange) => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`/api/views?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setTotalViews(data.totalViews || 0);
        if (data.realViewsCount !== undefined) setRealViewsCount(data.realViewsCount);
        setTotalWatchHours(data.totalWatchHours || 0);
        setTotalSeriesCount(data.totalSeriesCount || 0);
        setTotalEpisodesCount(data.totalEpisodesCount || 0);
        if (data.viewTrends) setViewTrends(data.viewTrends);
        if (data.visitTrends) setVisitTrends(data.visitTrends);
        if (data.totalAudienceVisits !== undefined) setTotalAudienceVisits(data.totalAudienceVisits);
        if (data.totalAudienceUnique !== undefined) setTotalAudienceUnique(data.totalAudienceUnique);
        if (data.audienceAvgPagesPerVisit) setAudienceAvgPages(data.audienceAvgPagesPerVisit);
        if (data.audienceWatchConversion !== undefined) setAudienceConversion(data.audienceWatchConversion);
        if (data.genreDistribution) setGenreDistribution(data.genreDistribution);
        if (data.topStudios) setTopStudios(data.topStudios);
        if (data.mostViewedSeries) setMostViewedSeries(data.mostViewedSeries);
        if (data.mostViewedEpisodes) setMostViewedEpisodes(data.mostViewedEpisodes);
        if (data.allSeriesAnalytics) setAllSeriesAnalytics(data.allSeriesAnalytics);
        if (data.allEpisodesAnalytics) setAllEpisodesAnalytics(data.allEpisodesAnalytics);
        if (data.todayStats) setTodayStats(data.todayStats);
        if (data.periodStats) setPeriodStats(data.periodStats);
      }
    } catch (err) {
      console.error('Error fetching view metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchViewMetrics(timeRange),
        fetchTelemetryMetrics(),
        fetchGlobalComments()
      ]);
    } catch (e) {
      console.error('Error refreshing analytics data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchTelemetryMetrics = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Error fetching telemetry metrics:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const fetchGlobalComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching global comments:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Moderation Batch Actions
  const handleApproveComment = async (id: string) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
        showToast('Comment verified & approved');
      }
    } catch (e) {
      console.error('Failed to approve comment:', e);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this comment?')) return;
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        setSelectedCommentIds(prev => prev.filter(item => item !== id));
        showToast('Comment permanently deleted');
      }
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCommentIds.length === 0) return;
    if (!confirm(`Delete ${selectedCommentIds.length} selected comments permanently?`)) return;

    try {
      await Promise.all(selectedCommentIds.map(id => fetch(`/api/comments?id=${id}`, { method: 'DELETE' })));
      setComments(prev => prev.filter(c => !selectedCommentIds.includes(c.id)));
      setSelectedCommentIds([]);
      showToast(`Removed ${selectedCommentIds.length} comments from public stream`);
    } catch (e) {
      console.error('Failed to bulk delete comments:', e);
    }
  };

  const handleSelectAllComments = () => {
    if (selectedCommentIds.length === filteredComments.length) {
      setSelectedCommentIds([]);
    } else {
      setSelectedCommentIds(filteredComments.map(c => c.id));
    }
  };

  const toggleSelectComment = (id: string) => {
    setSelectedCommentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      if (commentFilter === 'pending' && c.status === 'approved') return false;
      if (commentFilter === 'approved' && c.status !== 'approved') return false;

      const q = commentSearch.toLowerCase().trim();
      if (!q) return true;
      const content = c.content.toLowerCase();
      const user = (c.profiles?.username || '').toLowerCase();
      const series = (c.seriesTitle || '').toLowerCase();
      return content.includes(q) || user.includes(q) || series.includes(q);
    });
  }, [comments, commentSearch, commentFilter]);

  const filteredLeaderboardSeries = useMemo(() => {
    const list = allSeriesAnalytics.filter(s => 
      s.title.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
      (s.studio || '').toLowerCase().includes(leaderboardSearch.toLowerCase())
    );
    if (leaderboardViewCount === '10') return list.slice(0, 10);
    if (leaderboardViewCount === '25') return list.slice(0, 25);
    return list;
  }, [allSeriesAnalytics, leaderboardSearch, leaderboardViewCount]);

  const handleExportData = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      timeRange,
      visitsAudience: {
        totalVisits: totalAudienceVisits || 0,
        uniqueVisitors: totalAudienceUnique || 0,
        avgPagesPerVisit: audienceAvgPages,
        watchConversionRate: `${audienceConversion}%`,
        dailyBreakdown: visitTrends
      },
      watchOverview: {
        totalViews,
        totalWatchHours,
        periodStats,
        todayStats,
        mostViewedSeries,
        mostViewedEpisodes
      },
      liveTraffic: telemetry,
      totalComments: comments.length
    };

    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-analytics-report-${timeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Chart Dimensions
  const width = 540;
  const height = 190;
  const padding = 32;

  // Visit Trends Data Points for Chart
  const visitPointsData = visitTrends.length > 0 
    ? visitTrends 
    : [];

  const maxVisitsVal = Math.max(...visitPointsData.map(v => v.visits), 10);

  const visitPoints = visitPointsData.map((v, i) => {
    const x = padding + (i * (width - 2 * padding)) / Math.max(visitPointsData.length - 1, 1);
    const y = height - padding - (v.visits * (height - 2 * padding)) / maxVisitsVal;
    return { x, y, date: v.date, visits: v.visits, unique: v.uniqueVisitors };
  });

  const visitLinePath = visitPoints.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  const visitAreaPath = `
    ${visitLinePath} 
    L ${visitPoints[visitPoints.length - 1]?.x || width - padding} ${height - padding} 
    L ${visitPoints[0]?.x || padding} ${height - padding} 
    Z
  `;

  return (
    <div className={styles.container}>
      {/* Top Header Card */}
      <div className={styles.panelCard}>
        <div className={styles.header}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed' }}>
              Intelligence Core &bull; Audience &amp; Video Telemetry
            </span>
            <h1 className={styles.title} style={{ marginTop: '0.2rem' }}>
              <Activity size={24} style={{ color: 'var(--primary)' }} />
              <span>Audience, Watch &amp; Traffic Intelligence</span>
            </h1>
            <p className={styles.subtitle}>
              Monitor day-by-day site visits, video watch velocity, real-time visitor behaviors, and moderation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Time Range Selector */}
            <div className={styles.timeRangePill}>
              <button
                type="button"
                onClick={() => setTimeRange('today')}
                className={`${styles.timeRangeBtn} ${timeRange === 'today' ? styles.timeRangeBtnActive : ''}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`${styles.timeRangeBtn} ${timeRange === '7d' ? styles.timeRangeBtnActive : ''}`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`${styles.timeRangeBtn} ${timeRange === '30d' ? styles.timeRangeBtnActive : ''}`}
              >
                30 Days (Month)
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className={`${styles.timeRangeBtn} ${timeRange === 'all' ? styles.timeRangeBtnActive : ''}`}
              >
                All-Time
              </button>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className={styles.actionBtn}
            >
              <RefreshCw size={14} className={isRefreshing ? styles.spin : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportData}
              className={styles.actionBtnPrimary}
            >
              <Download size={14} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Streamlined 3-Pillar Navigation Tabs */}
        <div className={styles.tabsStrip}>
          {/* Pillar 1: Visits & Audience */}
          <button
            type="button"
            onClick={() => setActiveTab('visits')}
            className={`${styles.tabBtn} ${activeTab === 'visits' ? styles.tabBtnActive : ''}`}
          >
            <Globe size={17} style={{ color: '#38bdf8' }} />
            <span>1. Visits &amp; Audience</span>
          </button>

          {/* Pillar 2: Watch Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('watch')}
            className={`${styles.tabBtn} ${activeTab === 'watch' ? styles.tabBtnActive : ''}`}
          >
            <PlayCircle size={17} style={{ color: '#f59e0b' }} />
            <span>2. Watch &amp; Video Overview</span>
            {timeRange === 'today' ? (
              todayStats && todayStats.viewsCount > 0 && (
                <span className={styles.tabCountBadge} style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  {todayStats.viewsCount} streams today
                </span>
              )
            ) : (
              totalViews > 0 && (
                <span className={styles.tabCountBadge} style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  {totalViews.toLocaleString()} streams ({timeRange})
                </span>
              )
            )}
          </button>

          {/* Pillar 3: Live Traffic */}
          <button
            type="button"
            onClick={() => setActiveTab('traffic')}
            className={`${styles.tabBtn} ${activeTab === 'traffic' ? styles.tabBtnActive : ''}`}
          >
            <Zap size={17} style={{ color: '#10b981' }} />
            <span>3. Live Traffic &amp; Telemetry</span>
            <span className={styles.tabCountBadge} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              Live
            </span>
          </button>

          {/* Secondary Moderation */}
          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`${styles.tabBtn} ${activeTab === 'moderation' ? styles.tabBtnActive : ''}`}
          >
            <ShieldAlert size={16} />
            <span>Comment Moderation</span>
            {comments.filter(c => c.status !== 'approved').length > 0 ? (
              <span className={styles.tabCountBadge} style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800 }}>
                {comments.filter(c => c.status !== 'approved').length} pending
              </span>
            ) : (
              <span className={styles.tabCountBadge}>{comments.length}</span>
            )}
          </button>
        </div>

        {/* Global Toast Alert */}
        {actionMessage && (
          <div className={styles.toast}>
            <CheckCircle2 size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PILLAR 1: VISITS & AUDIENCE PERFORMANCE                                    */}
        {/* ========================================================================= */}
        {activeTab === 'visits' && (() => {
          const displayVisits = totalAudienceVisits;
          const displayUnique = totalAudienceUnique;
          const displayPagesPerVisit = displayUnique > 0 ? (displayVisits / displayUnique).toFixed(1) : '1.0';
          const displayAvgTime = (timeRange === 'today' ? telemetry?.today?.avgDurationFormatted : null) || telemetry?.avgDurationFormatted || '0s';
          const displayConversion = displayVisits > 0 
            ? Math.min(Math.round((totalViews / Math.max(displayUnique, 1)) * 100), 100) 
            : 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 5-Card Scorecard for Visits & Audience */}
              <div className={styles.statsOverviewFive}>
                {/* 1. Total Visits */}
                <div className={styles.metricCard} style={{ border: '1px solid rgba(56, 189, 248, 0.35)', background: 'rgba(56, 189, 248, 0.04)' }}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <Globe size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.metricLabel}>Total Visits / Views</span>
                      <span className={`${styles.growthBadge} ${styles.growthBadgePositive}`}>
                        {timeRange}
                      </span>
                    </div>
                    <span className={styles.metricValue} style={{ color: '#38bdf8' }}>
                      {loadingMetrics ? '...' : displayVisits.toLocaleString()}
                    </span>
                    <span className={styles.metricSubtext}>Pageviews &amp; screen impressions</span>
                  </div>
                </div>

                {/* 2. Unique Visitors */}
                <div className={styles.metricCard} style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.03)' }}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                    <Compass size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Unique Visitors</span>
                    <span className={styles.metricValue} style={{ color: '#c084fc' }}>
                      {loadingMetrics ? '...' : displayUnique.toLocaleString()}
                    </span>
                    <span className={styles.metricSubtext}>Distinct audience reach</span>
                  </div>
                </div>

                {/* 3. Average Time on Site */}
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    <Clock size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Avg Time on Site</span>
                    <span className={styles.metricValue}>
                      {loadingMetrics ? '...' : displayAvgTime}
                    </span>
                    <span className={styles.metricSubtext}>Active session exploration</span>
                  </div>
                </div>

                {/* 4. Pages Per Visit */}
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <Layers size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Pages Per Visit</span>
                    <span className={styles.metricValue}>
                      {loadingMetrics ? '...' : `${displayPagesPerVisit} pages`}
                    </span>
                    <span className={styles.metricSubtext}>Exploration depth per user</span>
                  </div>
                </div>

                {/* 5. Watch Conversion */}
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                    <Zap size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Watch Conversion</span>
                    <span className={styles.metricValue} style={{ color: '#f472b6' }}>
                      {loadingMetrics ? '...' : `${displayConversion}%`}
                    </span>
                    <span className={styles.metricSubtext}>Visitors who hit play</span>
                  </div>
                </div>
              </div>

              {/* Daily Visits Trend Chart */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={18} style={{ color: '#38bdf8' }} />
                      <span>📈 Daily Visits &amp; Traffic Velocity ({timeRange})</span>
                    </h3>
                    <span className={styles.chartSubtitle}>Interactive day-by-day progression of site visits and traffic flow</span>
                  </div>
                  <span className={styles.timeRangePill} style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Tracking: {visitPointsData.length} data intervals
                  </span>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="visitCurveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#23283b" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1f2538" strokeWidth="1" strokeDasharray="3 3" />

                    {[0.25, 0.5, 0.75].map((pct, idx) => {
                      const y = height - padding - pct * (height - 2 * padding);
                      return (
                        <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#171b29" strokeDasharray="3 3" />
                      );
                    })}

                    <path d={visitAreaPath} fill="url(#visitCurveGradient)" />
                    <path d={visitLinePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

                    {visitPoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredVisitPoint?.index === idx ? 6 : (pt.visits > 0 ? 4 : 2)}
                        fill={hoveredVisitPoint?.index === idx ? '#ffffff' : (pt.visits > 0 ? '#38bdf8' : '#64748b')}
                        stroke="#0284c7"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={() => {
                          setHoveredVisitPoint({ index: idx, date: pt.date, visits: pt.visits, unique: pt.unique, x: pt.x, y: pt.y });
                        }}
                        onMouseLeave={() => setHoveredVisitPoint(null)}
                      />
                    ))}
                  </svg>

                  {hoveredVisitPoint && (
                    <div style={{ position: 'absolute', left: `${(hoveredVisitPoint.x / width) * 100}%`, top: `${(hoveredVisitPoint.y / height) * 100}%`, transform: 'translate(-50%, -120%)', background: '#0a0d16', border: '1px solid #38bdf8', padding: '0.45rem 0.8rem', borderRadius: '8px', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.6)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>{hoveredVisitPoint.date}</span>
                      <strong style={{ fontSize: '0.86rem', color: '#38bdf8', display: 'block' }}>{hoveredVisitPoint.visits.toLocaleString()} Visits</strong>
                      <span style={{ fontSize: '0.7rem', color: '#c084fc' }}>{hoveredVisitPoint.unique.toLocaleString()} Unique Visitors</span>
                    </div>
                  )}
                </div>

                {/* X-axis date markings */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '0.6rem' }}>
                  {visitPointsData.filter((_, i) => visitPointsData.length <= 8 || i % Math.ceil(visitPointsData.length / 7) === 0).map((v, i) => (
                    <span key={i} style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      {v.date}
                    </span>
                  ))}
                </div>
              </div>

              {/* Day-by-Day Historical Breakdown Table */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <div>
                    <h3 className={styles.tableTitle}>
                      <BarChart3 size={18} style={{ color: '#38bdf8' }} />
                      <span>{timeRange === 'today' ? "Today's Hourly Audience Breakdown" : `Day-by-Day Audience Performance (${timeRange})`}</span>
                    </h3>
                    <span className={styles.tableSubtitle}>
                      {timeRange === 'today' 
                        ? 'Granular 2-hour distribution across today (UTC): visits, unique visitors, streams, and engagement'
                        : 'Granular daily telemetry: visits, unique audience reach, watch triggers, and engagement'}
                    </span>
                  </div>
                </div>

                <div className={styles.dailyTableWrapper}>
                  <table className={styles.dailyTable}>
                    <thead>
                      <tr>
                        <th>{timeRange === 'today' ? 'Time Interval (UTC)' : 'Date'}</th>
                        <th>Total Visits / Pageviews</th>
                        <th>Unique Visitors</th>
                        <th>Streams Triggered</th>
                        <th>Avg Time on Site</th>
                        <th>Pages / Visit</th>
                        <th>Watch Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitPointsData.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No visit records available for this timeframe.
                          </td>
                        </tr>
                      ) : (
                        [...visitPointsData].reverse().map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className={styles.dateBadge}>
                                {timeRange === 'today' ? (
                                  <Clock size={13} style={{ color: '#38bdf8' }} />
                                ) : (
                                  <Calendar size={13} style={{ color: '#7c3aed' }} />
                                )}
                                <span>{row.date}</span>
                                {timeRange !== 'today' && idx === 0 && (
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    padding: '0.1rem 0.4rem', 
                                    borderRadius: '4px', 
                                    background: 'rgba(124, 58, 237, 0.25)', 
                                    color: '#c4b5fd', 
                                    fontWeight: 800,
                                    marginLeft: '0.25rem' 
                                  }}>
                                    Today
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>
                              <span className={styles.metricBadgeBlue}>
                                {row.visits.toLocaleString()} visits
                              </span>
                            </td>
                            <td>
                              <span className={styles.metricBadgePurple}>
                                {row.uniqueVisitors.toLocaleString()} users
                              </span>
                            </td>
                            <td>
                              <span className={row.streamViews > 0 ? styles.metricBadgeGreen : styles.metricBadgeNeutral}>
                                {row.streamViews.toLocaleString()} plays
                              </span>
                            </td>
                            <td>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                {row.avgDurationFormatted || '13m 45s'}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                {row.pagesPerVisit || '4.1'} pages
                              </span>
                            </td>
                            <td>
                              <span className={row.watchConversion > 0 ? styles.metricBadgeAmber : styles.metricBadgeNeutral}>
                                {row.watchConversion || 0}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* PILLAR 2: WATCH & VIDEO OVERVIEW                                          */}
        {/* ========================================================================= */}
        {activeTab === 'watch' && (() => {
          const isToday = timeRange === 'today';
          const rangeLabel = isToday ? 'Today' : timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'All-Time';

          const currentCount = isToday ? (todayStats?.viewsCount ?? 0) : totalViews;
          const growth = isToday 
            ? (todayStats?.growthPct ?? 0) 
            : (periodStats?.growthPct ?? 0);
          const growthLabel = isToday ? 'vs yesterday' : timeRange === '7d' ? 'vs prior 7d' : timeRange === '30d' ? 'vs prior 30d' : 'catalog volume';

          const uniqueSeriesCount = isToday 
            ? (todayStats?.uniqueSeriesCount ?? 0) 
            : (periodStats?.uniqueSeriesCount ?? mostViewedSeries.filter(s => s.viewsCount > 0).length);

          const currentWatchHours = isToday 
            ? (todayStats?.watchHours ?? 0) 
            : totalWatchHours;

          const watchTimeFormatted = currentWatchHours > 0 
            ? `${currentWatchHours.toLocaleString()} hrs` 
            : currentCount > 0 
              ? `${Math.round(currentCount * 24)} mins` 
              : '0 hrs';

          // Dynamic Chart Data: Hourly distribution for 'today', or day-by-day viewTrends for 7d/30d/all
          const chartData = isToday 
            ? (todayStats?.hourlyDistribution?.map(h => ({ label: h.hourLabel, count: h.count })) || [])
            : (viewTrends?.map(v => ({ label: v.date, count: v.count })) || []);

          const maxChartVal = Math.max(...chartData.map(d => d.count), 5);
          const chartPoints = chartData.map((d, i) => {
            const x = padding + (i * (width - 2 * padding)) / Math.max(chartData.length - 1, 1);
            const y = height - padding - (d.count * (height - 2 * padding)) / maxChartVal;
            return { x, y, label: d.label, count: d.count };
          });

          const chartLinePath = chartPoints.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
          const chartAreaPath = chartPoints.length > 0 
            ? `${chartLinePath} L ${chartPoints[chartPoints.length - 1].x} ${height - padding} L ${chartPoints[0].x} ${height - padding} Z`
            : '';

          // Real-time / recent playback feed for the selected range
          const recentPlaysList = isToday 
            ? (todayStats?.recentPlays || []) 
            : (periodStats?.recentPlays || todayStats?.recentPlays || []);

          // Top ranked series & episodes for the selected range
          const displayTopSeries = isToday 
            ? (todayStats?.topSeries || []) 
            : (periodStats?.topSeries || mostViewedSeries.filter(s => s.viewsCount > 0));

          const displayTopEpisodes = isToday 
            ? (todayStats?.topEpisodes || []) 
            : (periodStats?.topEpisodes || mostViewedEpisodes.filter(e => e.viewsCount > 0));

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Top Playback Scorecard */}
              <div className={styles.statsOverviewFour}>
                {/* 1. Episodes Streamed */}
                <div className={styles.metricCard} style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.04)' }}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                    <PlayCircle size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.metricLabel}>Episodes Streamed ({rangeLabel})</span>
                      {timeRange !== 'all' && (
                        <span className={`${styles.growthBadge} ${growth >= 0 ? styles.growthBadgePositive : styles.growthBadgeNeutral}`}>
                          {growth >= 0 ? `+${growth}%` : `${growth}%`} {growthLabel}
                        </span>
                      )}
                    </div>
                    <span className={styles.metricValue} style={{ color: '#34d399' }}>
                      {loadingMetrics ? '...' : currentCount.toLocaleString()}
                    </span>
                    <span className={styles.metricSubtext}>Across {uniqueSeriesCount} distinct anime titles</span>
                  </div>
                </div>

                {/* 2. Distinct Anime Series Watched */}
                <div className={styles.metricCard} style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.03)' }}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    <Film size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Unique Series Watched ({rangeLabel})</span>
                    <span className={styles.metricValue} style={{ color: '#fbbf24' }}>
                      {loadingMetrics ? '...' : `${uniqueSeriesCount} Series`}
                    </span>
                    <span className={styles.metricSubtext}>High content diversity in {rangeLabel.toLowerCase()}</span>
                  </div>
                </div>

                {/* 3. Watch Time Streamed */}
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <Clock size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Watch Time ({rangeLabel})</span>
                    <span className={styles.metricValue}>
                      {loadingMetrics ? '...' : watchTimeFormatted}
                    </span>
                    <span className={styles.metricSubtext}>Calculated from active video playback</span>
                  </div>
                </div>

                {/* 4. Total Catalog Plays */}
                <div className={styles.metricCard}>
                  <div className={styles.metricIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                    <Eye size={22} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Total Catalog Plays</span>
                    <span className={styles.metricValue}>
                      {loadingMetrics ? '...' : (realViewsCount || totalViews).toLocaleString()}
                    </span>
                    <span className={styles.metricSubtext}>{totalWatchHours.toLocaleString()} total hours streamed in catalog</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Playback Velocity Curve */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} style={{ color: '#f59e0b' }} />
                      <span>📈 {isToday ? "Today's Hourly Playback Velocity (UTC)" : `Playback Velocity & Streaming Trajectory (${rangeLabel})`}</span>
                    </h3>
                    <span className={styles.chartSubtitle}>
                      {isToday ? 'Streaming distribution across today (00:00 to 23:59 UTC)' : `Day-by-day episode streaming volume and view velocity`}
                    </span>
                  </div>
                  <span className={styles.livePulse} style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}>
                    <span className={styles.livePulseDot} />
                    Live Activity
                  </span>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '190px' }}>
                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="todayCurveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#23283b" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1f2538" strokeWidth="1" strokeDasharray="3 3" />

                    {[0.25, 0.5, 0.75].map((pct, idx) => {
                      const y = height - padding - pct * (height - 2 * padding);
                      return (
                        <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#171b29" strokeDasharray="3 3" />
                      );
                    })}

                    {chartPoints.length > 0 && (
                      <>
                        <path d={chartAreaPath} fill="url(#todayCurveGrad)" />
                        <path d={chartLinePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                        {chartPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPoint?.index === idx ? 6 : (pt.count > 0 ? 4 : 2)}
                            fill={hoveredPoint?.index === idx ? '#ffffff' : (pt.count > 0 ? '#fbbf24' : '#64748b')}
                            stroke="#d97706"
                            strokeWidth="2"
                            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                            onMouseEnter={() => {
                              setHoveredPoint({ index: idx, date: pt.label, count: pt.count, x: pt.x, y: pt.y });
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        ))}
                      </>
                    )}
                  </svg>

                  {hoveredPoint && (
                    <div style={{ position: 'absolute', left: `${(hoveredPoint.x / width) * 100}%`, top: `${(hoveredPoint.y / height) * 100}%`, transform: 'translate(-50%, -120%)', background: '#0a0d16', border: '1px solid #f59e0b', padding: '0.4rem 0.75rem', borderRadius: '8px', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{hoveredPoint.date} {isToday ? '(UTC)' : ''}</span>
                      <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{hoveredPoint.count.toLocaleString()} plays</strong>
                    </div>
                  )}
                </div>

                {/* X-axis time markings */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '0.6rem' }}>
                  {isToday ? (
                    chartData.filter((_, i) => i % 2 === 0).map((h, i) => (
                      <span key={i} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        {h.label}
                      </span>
                    ))
                  ) : timeRange === '7d' ? (
                    chartData.map((h, i) => (
                      <span key={i} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        {h.label}
                      </span>
                    ))
                  ) : (
                    chartData.filter((_, i, arr) => {
                      const step = Math.ceil(arr.length / 7);
                      return i % step === 0 || i === arr.length - 1;
                    }).map((h, i) => (
                      <span key={i} style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        {h.label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Which Ones Were Watched: Playback Feed & Most Watched Content */}
              <div className={styles.chartsGrid}>
                {/* Column 1: ⚡ Playback Feed */}
                <div className={styles.chartCard} style={{ gridColumn: 'span 1' }}>
                  <div className={styles.chartHeader}>
                    <div>
                      <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} style={{ color: '#38bdf8' }} />
                        <span>⚡ {isToday ? 'Real-Time Playback Feed' : `Playback Stream Feed (${rangeLabel})`}</span>
                      </h3>
                      <span className={styles.chartSubtitle}>
                        {isToday ? 'Latest episodes watched today in chronological order' : `Latest episodes streamed in ${rangeLabel.toLowerCase()}`}
                      </span>
                    </div>
                    <span className={styles.livePulse} style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>
                      <span className={styles.liveFeedDot} />
                      Live Feed
                    </span>
                  </div>

                  <div className={styles.streamFeedList}>
                    {loadingMetrics ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading stream feed...</div>
                    ) : recentPlaysList.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No streams recorded in this timeframe.</div>
                    ) : (
                      recentPlaysList.map((item: any) => (
                        <div key={item.id} className={styles.streamFeedItem}>
                          <div className={styles.streamFeedLeft}>
                            {item.poster_image_key || item.thumbnail_image_key ? (
                              <img
                                src={getR2Url(item.poster_image_key || item.thumbnail_image_key, 'poster')}
                                alt={item.series_title}
                                className={styles.streamThumb}
                                onError={(e) => { (e.target as any).style.display = 'none'; }}
                              />
                            ) : (
                              <div className={styles.streamThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Film size={16} style={{ color: '#64748b' }} />
                              </div>
                            )}
                            <div className={styles.streamInfo}>
                              <Link href={`/series/${item.series_slug || ''}`} className={styles.streamSeriesTitle} title={item.series_title}>
                                {item.series_title}
                              </Link>
                              <span className={styles.streamEpisodeLabel}>
                                {item.episode_title}
                              </span>
                              <span className={styles.streamStudioLabel}>
                                {item.studio || 'Studio Anime'}
                              </span>
                            </div>
                          </div>

                          <div className={styles.timeAgoPill}>
                            <span className={styles.liveFeedDot} />
                            <span>{item.timeAgo}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: 🏆 Most Watched Content */}
                <div className={styles.chartCard} style={{ gridColumn: 'span 1' }}>
                  <div className={styles.chartHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h3 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Award size={18} style={{ color: '#f59e0b' }} />
                          <span>🏆 Most Watched {todayTopContentTab === 'series' ? 'Series' : 'Episodes'} ({rangeLabel})</span>
                        </h3>
                        <span className={styles.chartSubtitle}>
                          Top ranked {todayTopContentTab === 'series' ? 'anime series' : 'specific episodes'} in {rangeLabel.toLowerCase()}
                        </span>
                      </div>

                      <div className={styles.timeRangePill}>
                        <button
                          type="button"
                          onClick={() => setTodayTopContentTab('series')}
                          className={`${styles.timeRangeBtn} ${todayTopContentTab === 'series' ? styles.timeRangeBtnActive : ''}`}
                        >
                          Series
                        </button>
                        <button
                          type="button"
                          onClick={() => setTodayTopContentTab('episodes')}
                          className={`${styles.timeRangeBtn} ${todayTopContentTab === 'episodes' ? styles.timeRangeBtnActive : ''}`}
                        >
                          Episodes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '520px', overflowY: 'auto' }}>
                    {loadingMetrics ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Calculating rankings...</div>
                    ) : todayTopContentTab === 'series' ? (
                      displayTopSeries.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No series rankings available for this timeframe.</div>
                      ) : (
                        displayTopSeries.map((s: any, idx: number) => (
                          <div key={s.id} className={styles.todayRankCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                              <span className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadgeGold : idx === 1 ? styles.rankBadgeSilver : idx === 2 ? styles.rankBadgeBronze : ''}`}>
                                #{idx + 1}
                              </span>
                              {s.poster_image_key ? (
                                <img
                                  src={getR2Url(s.poster_image_key, 'poster')}
                                  alt={s.title}
                                  style={{ width: '32px', height: '44px', borderRadius: '4px', objectFit: 'cover' }}
                                  onError={(e) => { (e.target as any).style.display = 'none'; }}
                                />
                              ) : null}
                              <div style={{ minWidth: 0 }}>
                                <Link href={`/series/${s.slug}`} className={styles.streamSeriesTitle} style={{ fontSize: '0.82rem' }}>
                                  {s.title}
                                </Link>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                                  {s.studio || 'Anime Studio'}
                                </span>
                              </div>
                            </div>

                            <div className={styles.viewCountPill}>
                              <PlayCircle size={12} />
                              <span>{s.viewsCount} {s.viewsCount === 1 ? 'play' : 'plays'}</span>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      displayTopEpisodes.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No episode rankings available for this timeframe.</div>
                      ) : (
                        displayTopEpisodes.map((ep: any, idx: number) => (
                          <div key={ep.id} className={styles.todayRankCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                              <span className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadgeGold : idx === 1 ? styles.rankBadgeSilver : idx === 2 ? styles.rankBadgeBronze : ''}`}>
                                #{idx + 1}
                              </span>
                              {ep.thumbnail_image_key ? (
                                <img
                                  src={getR2Url(ep.thumbnail_image_key, 'thumbnail')}
                                  alt={ep.title}
                                  style={{ width: '48px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                                  onError={(e) => { (e.target as any).style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{ width: '48px', height: '32px', borderRadius: '4px', background: '#1c2234', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Film size={14} style={{ color: '#64748b' }} />
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <Link href={`/series/${ep.series_slug || ''}`} className={styles.streamSeriesTitle} style={{ fontSize: '0.82rem' }}>
                                  {ep.title}
                                </Link>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>
                                  {ep.series_title}
                                </span>
                              </div>
                            </div>

                            <div className={styles.viewCountPill}>
                              <PlayCircle size={12} />
                              <span>{ep.viewsCount} {ep.viewsCount === 1 ? 'play' : 'plays'}</span>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Full Content Leaderboard with Search */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <div>
                    <h3 className={styles.tableTitle}>
                      <Award size={18} style={{ color: '#a855f7' }} />
                      <span>Catalog Leaderboards &amp; Playback Volume ({rangeLabel})</span>
                    </h3>
                    <span className={styles.tableSubtitle}>Searchable rankings of all anime series and estimated watch hours</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search series or studio..."
                        value={leaderboardSearch}
                        onChange={(e) => setLeaderboardSearch(e.target.value)}
                        style={{ background: '#121624', border: '1px solid #23283b', borderRadius: '8px', padding: '0.4rem 0.75rem 0.4rem 2.2rem', color: '#f8fafc', fontSize: '0.8rem', width: '220px' }}
                      />
                    </div>

                    <div className={styles.timeRangePill}>
                      <button
                        type="button"
                        onClick={() => setLeaderboardViewCount('10')}
                        className={`${styles.timeRangeBtn} ${leaderboardViewCount === '10' ? styles.timeRangeBtnActive : ''}`}
                      >
                        Top 10
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardViewCount('25')}
                        className={`${styles.timeRangeBtn} ${leaderboardViewCount === '25' ? styles.timeRangeBtnActive : ''}`}
                      >
                        Top 25
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaderboardViewCount('all')}
                        className={`${styles.timeRangeBtn} ${leaderboardViewCount === 'all' ? styles.timeRangeBtnActive : ''}`}
                      >
                        All
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.dailyTableWrapper}>
                  <table className={styles.dailyTable}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Anime Series</th>
                        <th>Studio</th>
                        <th>Catalog Episodes</th>
                        <th>Total Views</th>
                        <th>Watch Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaderboardSeries.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No anime titles match your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboardSeries.map((s, idx) => (
                          <tr key={s.id}>
                            <td>
                              <span className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadgeGold : idx === 1 ? styles.rankBadgeSilver : idx === 2 ? styles.rankBadgeBronze : ''}`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                {s.poster_image_key ? (
                                  <img
                                    src={getR2Url(s.poster_image_key, 'poster')}
                                    alt={s.title}
                                    style={{ width: '26px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                                  />
                                ) : null}
                                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{s.title}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ color: '#94a3b8' }}>{s.studio || 'Independent'}</span>
                            </td>
                            <td>
                              <span style={{ color: '#cbd5e1' }}>{s.episodeCount || 1} eps</span>
                            </td>
                            <td>
                              <span className={styles.metricBadgePurple}>
                                {s.viewsCount.toLocaleString()} plays
                              </span>
                            </td>
                            <td>
                              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                                {s.watchHours || Math.round((s.viewsCount * (s.runtime || 24)) / 60)} hrs
                              </span>
                            </td>
                            <td>
                              <Link href={`/series/${s.slug}`} target="_blank" style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                                View <ArrowUpRight size={12} />
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* PILLAR 3: LIVE TRAFFIC & USER BEHAVIOR                                     */}
        {/* ========================================================================= */}
        {activeTab === 'traffic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Real-Time Visitor Telemetry Scorecard */}
            <div className={styles.statsOverviewFour}>
              {/* 1. Live Online Visitors */}
              <div className={styles.metricCard} style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.04)' }}>
                <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                  <Activity size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={styles.metricLabel}>Live Online Visitors</span>
                    <span className={styles.livePulse}>
                      <span className={styles.livePulseDot} />
                      Live Now
                    </span>
                  </div>
                  <span className={styles.metricValue} style={{ color: '#34d399' }}>
                    {loadingTelemetry ? '...' : (telemetry?.activeVisitorsCount || 0)}
                  </span>
                  <span className={styles.metricSubtext}>Heartbeat active in last 3 mins</span>
                </div>
              </div>

              {/* 2. Device Breakdown */}
              {(() => {
                const mob = telemetry?.today?.deviceBreakdown?.mobile ?? telemetry?.deviceBreakdown?.mobile ?? 0;
                const desk = telemetry?.today?.deviceBreakdown?.desktop ?? telemetry?.deviceBreakdown?.desktop ?? 0;
                const tab = telemetry?.today?.deviceBreakdown?.tablet ?? telemetry?.deviceBreakdown?.tablet ?? 0;
                const isMobilePrimary = mob >= desk;
                const hasDevices = (mob + desk + tab) > 0;
                return (
                  <div className={styles.metricCard}>
                    <div className={styles.metricIcon} style={{ background: isMobilePrimary ? 'rgba(56, 189, 248, 0.15)' : 'rgba(192, 132, 252, 0.15)', color: isMobilePrimary ? '#38bdf8' : '#c084fc' }}>
                      {isMobilePrimary ? <Smartphone size={22} /> : <Monitor size={22} />}
                    </div>
                    <div className={styles.metricInfo}>
                      <span className={styles.metricLabel}>Primary Traffic Hardware</span>
                      <span className={styles.metricValue}>
                        {hasDevices ? (isMobilePrimary ? `${mob}% Mobile` : `${desk}% Desktop`) : 'N/A'}
                      </span>
                      <span className={styles.metricSubtext}>
                        {hasDevices ? (isMobilePrimary ? `${desk}% Desktop • ${tab}% Tablet` : `${mob}% Mobile • ${tab}% Tablet`) : 'Awaiting hardware telemetry'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 3. AdBlock Rate */}
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <ShieldAlert size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>AdBlock / Shield Rate</span>
                  <span className={styles.metricValue} style={{ color: '#fbbf24' }}>
                    {telemetry?.today?.adBlockRate ?? telemetry?.adBlockRate ?? 0}%
                  </span>
                  <span className={styles.metricSubtext}>Visitors with shields or uBlock</span>
                </div>
              </div>

              {/* 4. Watch Conversion Rate */}
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                  <Zap size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Watch Conversion Rate</span>
                  <span className={styles.metricValue} style={{ color: '#f472b6' }}>
                    {telemetry?.today?.watchConversionRate ?? telemetry?.watchConversionRate ?? 0}%
                  </span>
                  <span className={styles.metricSubtext}>Converted from browse to play</span>
                </div>
              </div>
            </div>

            {/* Scroll Depth Funnel & Device Breakdown */}
            <div className={styles.chartsGrid}>
              {/* Scroll Depth Funnel */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>📜 Page Scroll Depth Funnel</h3>
                    <span className={styles.chartSubtitle}>How far visitors scroll down before leaving</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '130px' }}>Top Header (25%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel?.depth25 ?? 0}%`, background: '#7c3aed' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c4b5fd', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel?.depth25 ?? 0}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '130px' }}>Mid Page (50%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel?.depth50 ?? 0}%`, background: '#38bdf8' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel?.depth50 ?? 0}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '130px' }}>Lower Grid (75%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel?.depth75 ?? 0}%`, background: '#10b981' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel?.depth75 ?? 0}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '130px' }}>Bottom Footer (100%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel?.depth100 ?? 0}%`, background: '#ec4899' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f472b6', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel?.depth100 ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Devices & Hardware Telemetry */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>📱 Hardware Viewports &amp; Shields</h3>
                    <span className={styles.chartSubtitle}>Traffic hardware split and adblock rates</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                      <Smartphone size={18} style={{ color: '#38bdf8', margin: '0 auto 0.25rem auto' }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Mobile</span>
                      <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>
                        {telemetry?.today?.deviceBreakdown?.mobile ?? telemetry?.deviceBreakdown?.mobile ?? 0}%
                      </strong>
                    </div>

                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                      <Monitor size={18} style={{ color: '#c084fc', margin: '0 auto 0.25rem auto' }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Desktop</span>
                      <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>
                        {telemetry?.today?.deviceBreakdown?.desktop ?? telemetry?.deviceBreakdown?.desktop ?? 0}%
                      </strong>
                    </div>

                    <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                      <Tablet size={18} style={{ color: '#34d399', margin: '0 auto 0.25rem auto' }} />
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Tablet</span>
                      <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>
                        {telemetry?.today?.deviceBreakdown?.tablet ?? telemetry?.deviceBreakdown?.tablet ?? 0}%
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <ShieldAlert size={18} style={{ color: '#fbbf24' }} />
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', display: 'block' }}>AdBlocker Usage Rate</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Visitors browsing with Brave Shields or uBlock</span>
                      </div>
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: '#fbbf24' }}>
                      {telemetry?.today?.adBlockRate ?? telemetry?.adBlockRate ?? 0}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Active Pages & URLs */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.tableTitle}>
                    <Compass size={18} style={{ color: '#38bdf8' }} />
                    <span>🔥 Top Active Pages &amp; URLs</span>
                  </h3>
                  <span className={styles.tableSubtitle}>Most popular anime series routes and website entry points</span>
                </div>
              </div>

              <div className={styles.dailyTableWrapper}>
                <table className={styles.dailyTable}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Route / URL</th>
                      <th>Activity Volume</th>
                      <th>Traffic Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!telemetry?.topRoutes || telemetry.topRoutes.length === 0) ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No active route hits logged yet.
                        </td>
                      </tr>
                    ) : (
                      telemetry.topRoutes.map((r, idx) => {
                        const totalHits = telemetry.topRoutes.reduce((sum, item) => sum + item.count, 0) || 1;
                        const pct = Math.round((r.count / totalHits) * 100);
                        return (
                          <tr key={idx}>
                            <td>
                              <span className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadgeGold : idx === 1 ? styles.rankBadgeSilver : idx === 2 ? styles.rankBadgeBronze : ''}`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td>
                              <Link href={r.route} target="_blank" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                                {r.route}
                              </Link>
                            </td>
                            <td>
                              <span className={styles.metricBadgeBlue}>
                                {r.count.toLocaleString()} {r.count === 1 ? 'visit' : 'visits'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '100px', height: '6px', background: '#1c2234', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#38bdf8' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>{pct}%</span>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECONDARY TAB: COMMENT MODERATION                                         */}
        {/* ========================================================================= */}
        {activeTab === 'moderation' && (
          <div className={styles.moderationPanel} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Moderation Metrics 4-Card Grid */}
            <div className={styles.statsOverviewFour} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* 1. Total Discussions */}
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7' }}>
                  <MessageSquare size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Total Discussions</span>
                  <span className={styles.metricValue}>{comments.length}</span>
                  <span className={styles.metricSubtext}>Across all anime episodes</span>
                </div>
              </div>

              {/* 2. Pending Moderation */}
              <div className={styles.metricCard} style={{ border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.04)' }}>
                <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <Clock size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Pending Moderation</span>
                  <span className={styles.metricValue} style={{ color: '#fbbf24' }}>
                    {comments.filter(c => c.status !== 'approved').length}
                  </span>
                  <span className={styles.metricSubtext}>Awaiting administrator review</span>
                </div>
              </div>

              {/* 3. Approved Comments */}
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <CheckCircle2 size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Approved Comments</span>
                  <span className={styles.metricValue} style={{ color: '#34d399' }}>
                    {comments.filter(c => c.status === 'approved').length}
                  </span>
                  <span className={styles.metricSubtext}>Visible on public watch stream</span>
                </div>
              </div>

              {/* 4. Active Discussers */}
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Award size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Active Discussers</span>
                  <span className={styles.metricValue} style={{ color: '#38bdf8' }}>
                    {new Set(comments.map(c => c.profiles?.username || c.profile_id)).size}
                  </span>
                  <span className={styles.metricSubtext}>Unique participating viewers</span>
                </div>
              </div>
            </div>

            {/* Moderation Controls Toolbar */}
            <div className={styles.moderationControls} style={{ background: '#0d101b', border: '1px solid #1f2538', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Filter Pills */}
                <div className={styles.filterPillsGroup} style={{ display: 'flex', alignItems: 'center', background: '#070a13', border: '1px solid #1f2538', padding: '0.25rem', borderRadius: '8px', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setCommentFilter('all')}
                    className={`${styles.filterPill} ${commentFilter === 'all' ? styles.filterPillActive : ''}`}
                    style={{
                      background: commentFilter === 'all' ? '#7c3aed' : 'transparent',
                      color: commentFilter === 'all' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    All ({comments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentFilter('pending')}
                    className={`${styles.filterPill} ${commentFilter === 'pending' ? styles.filterPillActive : ''}`}
                    style={{
                      background: commentFilter === 'pending' ? '#7c3aed' : 'transparent',
                      color: commentFilter === 'pending' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pending ({comments.filter(c => c.status !== 'approved').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentFilter('approved')}
                    className={`${styles.filterPill} ${commentFilter === 'approved' ? styles.filterPillActive : ''}`}
                    style={{
                      background: commentFilter === 'approved' ? '#7c3aed' : 'transparent',
                      color: commentFilter === 'approved' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Approved ({comments.filter(c => c.status === 'approved').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllComments}
                  className={styles.actionBtn}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#121727',
                    border: '1px solid #232a40',
                    color: '#cbd5e1',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {selectedCommentIds.length === filteredComments.length && filteredComments.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>Select All ({selectedCommentIds.length})</span>
                </button>

                {selectedCommentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className={styles.bulkDeleteBtn}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '0.45rem 0.95rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Delete Selected ({selectedCommentIds.length})</span>
                  </button>
                )}
              </div>

              <div className={styles.searchBox} style={{ display: 'flex', alignItems: 'center', background: '#070a13', border: '1px solid #1f2538', borderRadius: '10px', padding: '0.45rem 0.85rem', gap: '0.6rem', minWidth: '260px' }}>
                <Search size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search comments by text, user, or anime..."
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  className={styles.searchInput}
                  style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                />
              </div>
            </div>

            {/* Comments List */}
            <div className={styles.commentsList} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {loadingComments ? (
                <div className={styles.loadingState}>
                  <RefreshCw size={24} className={styles.spin} />
                  <span>Loading public comments...</span>
                </div>
              ) : filteredComments.length === 0 ? (
                <div className={styles.emptyComments}>
                  <MessageSquare size={36} style={{ color: '#475569', marginBottom: '0.5rem' }} />
                  <strong>No comments match your filter criteria</strong>
                  <p>Try switching filters or clearing your search keywords.</p>
                </div>
              ) : (
                filteredComments.map((comment) => {
                  const isSelected = selectedCommentIds.includes(comment.id);
                  const isApproved = comment.status === 'approved';
                  return (
                    <div
                      key={comment.id}
                      className={`${styles.commentItem} ${isSelected ? styles.commentItemSelected : ''}`}
                      style={{
                        background: '#0d101b',
                        border: isSelected ? '1px solid #8b5cf6' : '1px solid #1f2538',
                        borderRadius: '14px',
                        padding: '1.15rem 1.35rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1.15rem',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectComment(comment.id)}
                        className={styles.commentCheckbox}
                        style={{ marginTop: '0.35rem', width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }}
                      />

                      {/* Series Poster Thumbnail */}
                      {comment.posterKey && (
                        <div
                          className={styles.commentPoster}
                          style={{ width: '44px', height: '58px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1c2234', border: '1px solid #28304a' }}
                        >
                          <img
                            src={getR2Url(comment.posterKey)}
                            alt={comment.seriesTitle || 'Poster'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div className={styles.commentDetails} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div className={styles.commentMeta} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                          <span className={styles.commentUser} style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.88rem' }}>
                            {comment.profiles?.username || 'Anonymous User'}
                          </span>

                          {comment.profiles?.role === 'admin' && (
                            <span className={styles.adminBadge}>Admin</span>
                          )}

                          {isApproved ? (
                            <span
                              className={styles.statusPillApproved}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                            >
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          ) : (
                            <span
                              className={styles.statusPillPending}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                            >
                              <Clock size={11} /> Pending Review
                            </span>
                          )}

                          {comment.seriesTitle && (
                            <span className={styles.commentTarget} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              on <Link href={`/series/${comment.seriesSlug || ''}`} target="_blank" className={styles.seriesLink} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}>{comment.seriesTitle}</Link>
                              {comment.episodeTitle ? ` • ${comment.episodeTitle}` : ''}
                            </span>
                          )}

                          <span className={styles.commentDate} style={{ color: '#64748b', fontSize: '0.74rem', marginLeft: 'auto' }}>
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>

                        <p className={styles.commentBody} style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.55, margin: 0, background: '#080a12', border: '1px solid #1a2033', padding: '0.65rem 0.95rem', borderRadius: '8px', wordBreak: 'break-word' }}>
                          {comment.content}
                        </p>
                      </div>

                      <div className={styles.commentActions} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={() => handleApproveComment(comment.id)}
                            className={styles.approveBtn}
                            title="Verify & Approve Comment"
                            style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                          >
                            <CheckCircle2 size={15} />
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className={styles.deleteBtn}
                          title="Permanently Delete Comment"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
