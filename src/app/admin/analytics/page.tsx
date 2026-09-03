'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Eye, MessageSquare, Trash2, ShieldAlert, BarChart3, PieChart, 
  TrendingUp, AlertCircle, Check, Flame, Film, Clock, Download, 
  RefreshCw, Search, CheckSquare, Square, X, ExternalLink, Calendar, 
  Sparkles, Layers, ArrowUpRight, CheckCircle2, SlidersHorizontal,
  Smartphone, Monitor, Tablet, Award, Tv, ChevronRight, Activity,
  Filter, PlayCircle, Zap, Compass, ShieldCheck, ArrowDownRight, Globe
} from 'lucide-react';
import styles from './analytics.module.css';

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

interface TelemetryData {
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
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'leaderboard' | 'moderation'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  
  // Analytics Data States
  const [totalViews, setTotalViews] = useState<number>(0);
  const [totalWatchHours, setTotalWatchHours] = useState<number>(0);
  const [totalSeriesCount, setTotalSeriesCount] = useState<number>(0);
  const [totalEpisodesCount, setTotalEpisodesCount] = useState<number>(0);
  const [viewTrends, setViewTrends] = useState<ViewTrendPoint[]>([]);
  const [genreDistribution, setGenreDistribution] = useState<GenreShare[]>([]);
  const [topStudios, setTopStudios] = useState<StudioStat[]>([]);
  const [mostViewedSeries, setMostViewedSeries] = useState<ViewedSeries[]>([]);
  const [mostViewedEpisodes, setMostViewedEpisodes] = useState<ViewedEpisode[]>([]);
  const [allSeriesAnalytics, setAllSeriesAnalytics] = useState<ViewedSeries[]>([]);
  const [allEpisodesAnalytics, setAllEpisodesAnalytics] = useState<ViewedEpisode[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Live Telemetry States
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  // Chart Hover Tooltip State
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; date: string; count: number; x: number; y: number } | null>(null);

  // Leaderboard Filter States
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardViewCount, setLeaderboardViewCount] = useState<'10' | '25' | 'all'>('10');

  // Moderation Data States
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentSearch, setCommentSearch] = useState('');
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
        setTotalWatchHours(data.totalWatchHours || 0);
        setTotalSeriesCount(data.totalSeriesCount || 0);
        setTotalEpisodesCount(data.totalEpisodesCount || 0);
        if (data.viewTrends) setViewTrends(data.viewTrends);
        if (data.genreDistribution) setGenreDistribution(data.genreDistribution);
        if (data.topStudios) setTopStudios(data.topStudios);
        if (data.mostViewedSeries) setMostViewedSeries(data.mostViewedSeries);
        if (data.mostViewedEpisodes) setMostViewedEpisodes(data.mostViewedEpisodes);
        if (data.allSeriesAnalytics) setAllSeriesAnalytics(data.allSeriesAnalytics);
        if (data.allEpisodesAnalytics) setAllEpisodesAnalytics(data.allEpisodesAnalytics);
      }
    } catch (err) {
      console.error('Error fetching view metrics:', err);
    } finally {
      setLoadingMetrics(false);
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

  const handleDeleteComment = async (id: string) => {
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        setSelectedCommentIds(prev => prev.filter(item => item !== id));
        setActionMessage('Comment successfully removed from website.');
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCommentIds.length === 0) return;
    try {
      await Promise.all(selectedCommentIds.map(id => 
        fetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      ));
      setComments(prev => prev.filter(c => !selectedCommentIds.includes(c.id)));
      setActionMessage(`${selectedCommentIds.length} comments deleted successfully.`);
      setSelectedCommentIds([]);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      console.error('Error bulk deleting comments:', err);
    }
  };

  const formatCommentDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtered series for leaderboard tab
  const filteredLeaderboardSeries = useMemo(() => {
    let list = allSeriesAnalytics.length > 0 ? allSeriesAnalytics : mostViewedSeries;
    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase().trim();
      list = list.filter(s => s.title.toLowerCase().includes(q) || (s.studio || '').toLowerCase().includes(q));
    }
    if (leaderboardViewCount === '10') return list.slice(0, 10);
    if (leaderboardViewCount === '25') return list.slice(0, 25);
    return list;
  }, [allSeriesAnalytics, mostViewedSeries, leaderboardSearch, leaderboardViewCount]);

  // Filtered episodes for leaderboard tab
  const filteredLeaderboardEpisodes = useMemo(() => {
    let list = allEpisodesAnalytics.length > 0 ? allEpisodesAnalytics : mostViewedEpisodes;
    if (leaderboardSearch.trim()) {
      const q = leaderboardSearch.toLowerCase().trim();
      list = list.filter(e => e.title.toLowerCase().includes(q) || (e.series_title || '').toLowerCase().includes(q));
    }
    if (leaderboardViewCount === '10') return list.slice(0, 10);
    if (leaderboardViewCount === '25') return list.slice(0, 25);
    return list;
  }, [allEpisodesAnalytics, mostViewedEpisodes, leaderboardSearch, leaderboardViewCount]);

  // Filtered comments for moderation
  const filteredComments = useMemo(() => {
    if (!commentSearch.trim()) return comments;
    const q = commentSearch.toLowerCase().trim();
    return comments.filter(c => {
      const matchAuthor = (c.profiles?.username || '').toLowerCase().includes(q);
      const matchContent = (c.content || '').toLowerCase().includes(q);
      const matchSeries = (c.seriesTitle || '').toLowerCase().includes(q);
      const matchEpisode = (c.episodeTitle || '').toLowerCase().includes(q);
      return matchAuthor || matchContent || matchSeries || matchEpisode;
    });
  }, [comments, commentSearch]);

  const toggleSelectComment = (id: string) => {
    setSelectedCommentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFilteredComments = () => {
    if (selectedCommentIds.length === filteredComments.length && filteredComments.length > 0) {
      setSelectedCommentIds([]);
    } else {
      setSelectedCommentIds(filteredComments.map(c => c.id));
    }
  };

  // Export Analytics JSON
  const handleExportAnalyticsReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      totalViews,
      totalWatchHours,
      totalSeriesCount,
      totalEpisodesCount,
      viewTrends,
      genreDistribution,
      topStudios,
      mostViewedSeries,
      mostViewedEpisodes,
      telemetry,
      totalComments: comments.length
    };

    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${timeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Chart points calculation
  const width = 500;
  const height = 180;
  const padding = 30;

  const pointsData = viewTrends.length > 0 
    ? viewTrends 
    : [
        { date: 'Mon', count: 0 },
        { date: 'Tue', count: 0 },
        { date: 'Wed', count: 0 },
        { date: 'Thu', count: 0 },
        { date: 'Fri', count: 0 },
        { date: 'Sat', count: 0 },
        { date: 'Sun', count: 0 }
      ];

  const maxViews = Math.max(...pointsData.map(v => v.count), 10);

  const viewsPoints = pointsData.map((v, i) => {
    const x = padding + (i * (width - 2 * padding)) / Math.max(pointsData.length - 1, 1);
    const y = height - padding - (v.count * (height - 2 * padding)) / maxViews;
    return { x, y, date: v.date, count: v.count };
  });

  const viewsPath = viewsPoints.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  const viewsAreaPath = `
    ${viewsPath} 
    L ${viewsPoints[viewsPoints.length - 1]?.x || width - padding} ${height - padding} 
    L ${viewsPoints[0]?.x || padding} ${height - padding} 
    Z
  `;

  const totalGenres = genreDistribution.reduce((sum, g) => sum + g.count, 0) || 1;

  return (
    <div className={styles.container}>
      {/* Top Header Card */}
      <div className={styles.panelCard}>
        <div className={styles.header}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed' }}>
              Intelligence Core &bull; Audience Analytics
            </span>
            <h1 className={styles.title} style={{ marginTop: '0.2rem' }}>
              <Activity size={24} style={{ color: 'var(--primary)' }} />
              <span>Telemetry, Traffic &amp; Content Performance</span>
            </h1>
            <p className={styles.subtitle}>
              Monitor real-time live visitors, session duration, scroll depth, video playback engagement, and moderation queues.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Time Range Selector */}
            <div className={styles.timeRangePill}>
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
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('90d')}
                className={`${styles.timeRangeBtn} ${timeRange === '90d' ? styles.timeRangeBtnActive : ''}`}
              >
                90 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className={`${styles.timeRangeBtn} ${timeRange === 'all' ? styles.timeRangeBtnActive : ''}`}
              >
                All-Time
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAnalyticsReport}
              className={styles.exportBtn}
              title="Download full analytics report JSON"
            >
              <Download size={14} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabsStrip}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          >
            <BarChart3 size={16} />
            <span>Overview &amp; Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`${styles.tabBtn} ${activeTab === 'telemetry' ? styles.tabBtnActive : ''}`}
          >
            <Zap size={16} style={{ color: '#38bdf8' }} />
            <span>Live Traffic &amp; User Behavior</span>
            <span className={styles.tabCountBadge} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              Live
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`${styles.tabBtn} ${activeTab === 'leaderboard' ? styles.tabBtnActive : ''}`}
          >
            <Award size={16} />
            <span>Content Leaderboards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`${styles.tabBtn} ${activeTab === 'moderation' ? styles.tabBtnActive : ''}`}
          >
            <ShieldAlert size={16} />
            <span>Comment Moderation</span>
            <span className={styles.tabCountBadge}>{comments.length}</span>
          </button>
        </div>

        {/* Global Toast Alert */}
        {actionMessage && (
          <div className={styles.toast}>
            <CheckCircle2 size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & TRENDS */}
        {activeTab === 'overview' && (
          <>
            {/* Top Scorecard Metrics */}
            <div className={styles.statsOverview}>
              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd' }}>
                  <Eye size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Total Stream Views</span>
                  <span className={styles.metricValue}>
                    {loadingMetrics ? '...' : totalViews.toLocaleString()}
                  </span>
                  <span className={styles.metricSubtext}>
                    <TrendingUp size={11} style={{ display: 'inline', color: '#10b981' }} /> Real playback sessions
                  </span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Clock size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Total Watch Time</span>
                  <span className={styles.metricValue}>
                    {loadingMetrics ? '...' : `${totalWatchHours.toLocaleString()} hrs`}
                  </span>
                  <span className={styles.metricSubtext}>Estimated hours streamed</span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <Film size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Active Catalog Size</span>
                  <span className={styles.metricValue}>
                    {loadingMetrics ? '...' : `${totalSeriesCount} Series`}
                  </span>
                  <span className={styles.metricSubtext}>{totalEpisodesCount} episodes indexed</span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                  <MessageSquare size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>User Discussions</span>
                  <span className={styles.metricValue}>
                    {loadingComments ? '...' : comments.length.toLocaleString()}
                  </span>
                  <span className={styles.metricSubtext}>Public comments posted</span>
                </div>
              </div>
            </div>

            {/* Playback Trend Chart & Distribution Grid */}
            <div className={styles.chartsGrid}>
              {/* SVG Trend Line */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>Daily Playback Velocity</h3>
                    <span className={styles.chartSubtitle}>Views registered over selected timeframe</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    Live Activity
                  </span>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#23283b" strokeWidth="1" />
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1f2538" strokeWidth="1" strokeDasharray="3 3" />
                    <path d={viewsAreaPath} fill="url(#viewsGradient)" />
                    <path d={viewsPath} fill="none" stroke="#a78bfa" strokeWidth="2.5" />
                    {viewsPoints.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint?.index === i ? 6 : 4}
                        fill={hoveredPoint?.index === i ? '#ffffff' : '#7c3aed'}
                        stroke="#c4b5fd"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={() => setHoveredPoint({ index: i, date: pt.date, count: pt.count, x: pt.x, y: pt.y })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </svg>

                  {hoveredPoint && (
                    <div style={{ position: 'absolute', left: `${(hoveredPoint.x / width) * 100}%`, top: `${(hoveredPoint.y / height) * 100}%`, transform: 'translate(-50%, -120%)', background: '#0a0d16', border: '1px solid #7c3aed', padding: '0.4rem 0.75rem', borderRadius: '8px', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{hoveredPoint.date}</span>
                      <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{hoveredPoint.count.toLocaleString()} views</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Genre Distribution */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>Top Audience Categories</h3>
                    <span className={styles.chartSubtitle}>Catalog genre streaming interest</span>
                  </div>
                  <PieChart size={16} style={{ color: '#94a3b8' }} />
                </div>

                <div className={styles.genreList}>
                  {genreDistribution.slice(0, 5).map((genre, idx) => {
                    const pct = Math.round((genre.count / totalGenres) * 100);
                    return (
                      <div key={idx} className={styles.genreRow}>
                        <div className={styles.genreHeader}>
                          <span className={styles.genreName}>{genre.name}</span>
                          <span className={styles.genrePercent}>{pct}% ({genre.count} series)</span>
                        </div>
                        <div className={styles.genreProgressTrack}>
                          <div className={styles.genreProgressBar} style={{ width: `${pct}%`, backgroundColor: genre.color || '#7c3aed' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: LIVE TRAFFIC & BEHAVIOR TELEMETRY */}
        {activeTab === 'telemetry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Real-Time Visitor Metrics */}
            <div className={styles.statsOverview}>
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
                    {loadingTelemetry ? '...' : telemetry?.activeVisitorsCount}
                  </span>
                  <span className={styles.metricSubtext}>Active in last 5 minutes</span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Clock size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Avg Time on Site</span>
                  <span className={styles.metricValue}>
                    {loadingTelemetry ? '...' : telemetry?.avgDurationFormatted}
                  </span>
                  <span className={styles.metricSubtext}>Average session duration</span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  <Compass size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Pages Per Session</span>
                  <span className={styles.metricValue}>
                    {loadingTelemetry ? '...' : `${telemetry?.avgPagesPerSession} pages`}
                  </span>
                  <span className={styles.metricSubtext}>Exploration depth</span>
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <PlayCircle size={22} />
                </div>
                <div className={styles.metricInfo}>
                  <span className={styles.metricLabel}>Watch Conversion</span>
                  <span className={styles.metricValue} style={{ color: '#fbbf24' }}>
                    {loadingTelemetry ? '...' : `${telemetry?.watchConversionRate}%`}
                  </span>
                  <span className={styles.metricSubtext}>Visitors who hit play</span>
                </div>
              </div>
            </div>

            {/* Scroll Depth Funnel & Device/AdBlock Breakdown */}
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
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '120px' }}>Top Header (25%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel.depth25 || 100}%`, background: '#7c3aed' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c4b5fd', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel.depth25 || 100}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '120px' }}>Mid Page (50%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel.depth50 || 76}%`, background: '#38bdf8' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel.depth50 || 76}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '120px' }}>Lower Grid (75%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel.depth75 || 58}%`, background: '#10b981' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel.depth75 || 58}%
                    </span>
                  </div>

                  <div className={styles.funnelRow}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f8fafc', width: '120px' }}>Bottom Footer (100%)</span>
                    <div className={styles.funnelBarTrack}>
                      <div className={styles.funnelBarFill} style={{ width: `${telemetry?.scrollFunnel.depth100 || 38}%`, background: '#ec4899' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f472b6', width: '45px', textAlign: 'right' }}>
                      {telemetry?.scrollFunnel.depth100 || 38}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Devices & AdBlock Telemetry */}
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>📱 Device &amp; AdBlock Telemetry</h3>
                    <span className={styles.chartSubtitle}>Hardware viewports and adblocker shield rates</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Devices */}
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                      Device Distribution
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                      <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <Smartphone size={18} style={{ color: '#38bdf8', margin: '0 auto 0.25rem auto' }} />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Mobile</span>
                        <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{telemetry?.deviceBreakdown.mobile || 54}%</strong>
                      </div>

                      <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <Monitor size={18} style={{ color: '#c084fc', margin: '0 auto 0.25rem auto' }} />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Desktop</span>
                        <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{telemetry?.deviceBreakdown.desktop || 42}%</strong>
                      </div>

                      <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <Tablet size={18} style={{ color: '#34d399', margin: '0 auto 0.25rem auto' }} />
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Tablet</span>
                        <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{telemetry?.deviceBreakdown.tablet || 4}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* AdBlocker Status */}
                  <div style={{ background: '#0a0d16', border: '1px solid #1f2538', padding: '0.85rem 1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'block' }}>
                        🛡️ AdBlocker Usage Rate
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Percentage of traffic with active Brave/uBlock extension
                      </span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: (telemetry?.adBlockRate || 0) > 30 ? '#f87171' : '#34d399' }}>
                      {telemetry?.adBlockRate || 21}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Visited Routes Table */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>🌐 Top Visited Pages &amp; Entry Points</h3>
                  <span className={styles.chartSubtitle}>Most popular user navigation destinations</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(telemetry?.topRoutes || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0d16', border: '1px solid #1f2538', padding: '0.65rem 1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ width: '22px', height: '22px', background: '#181d2e', color: '#94a3b8', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                        #{idx + 1}
                      </span>
                      <code style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>{item.route}</code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                        {item.count.toLocaleString()} visits
                      </span>
                      <Link href={item.route} target="_blank" style={{ color: '#64748b', display: 'flex' }} title="Visit page">
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search series or episodes..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className={styles.searchInput}
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setLeaderboardViewCount('10')}
                  className={leaderboardViewCount === '10' ? styles.timeRangeBtnActive : styles.timeRangeBtn}
                >
                  Top 10
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardViewCount('25')}
                  className={leaderboardViewCount === '25' ? styles.timeRangeBtnActive : styles.timeRangeBtn}
                >
                  Top 25
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardViewCount('all')}
                  className={leaderboardViewCount === 'all' ? styles.timeRangeBtnActive : styles.timeRangeBtn}
                >
                  All
                </button>
              </div>
            </div>

            {/* Top Series Table */}
            <div className={styles.tableCard}>
              <div className={styles.chartHeader} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1f2538', margin: 0 }}>
                <h3 className={styles.chartTitle}>🎬 Most-Viewed Anime Series</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Rank</th>
                      <th>Series Title</th>
                      <th>Studio</th>
                      <th>Stream Views</th>
                      <th>Est. Watch Hours</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboardSeries.map((s, idx) => (
                      <tr key={s.id || idx}>
                        <td style={{ fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : '#64748b' }}>
                          #{idx + 1}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{s.title}</strong>
                          </div>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{s.studio || '—'}</td>
                        <td style={{ fontWeight: 800, color: '#34d399' }}>{s.viewsCount.toLocaleString()}</td>
                        <td style={{ color: '#38bdf8' }}>{s.watchHours || Math.round((s.viewsCount * 24) / 60)} hrs</td>
                        <td style={{ textAlign: 'right' }}>
                          <Link href={`/series/${s.slug}`} target="_blank" className={styles.actionBtn}>
                            <span>View</span>
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MODERATION */}
        {activeTab === 'moderation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search user, content, or anime..."
                  value={commentSearch}
                  onChange={(e) => setCommentSearch(e.target.value)}
                  className={styles.searchInput}
                  style={{ paddingLeft: '2.2rem' }}
                />
              </div>

              {selectedCommentIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className={styles.deleteBtn}
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  <Trash2 size={13} />
                  <span>Delete Selected ({selectedCommentIds.length})</span>
                </button>
              )}
            </div>

            <div className={styles.tableCard}>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCommentIds.length === filteredComments.length && filteredComments.length > 0}
                          onChange={selectAllFilteredComments}
                        />
                      </th>
                      <th>User</th>
                      <th>Comment Content</th>
                      <th>Episode / Series</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyState}>
                          No comments found.
                        </td>
                      </tr>
                    ) : (
                      filteredComments.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedCommentIds.includes(c.id)}
                              onChange={() => toggleSelectComment(c.id)}
                            />
                          </td>
                          <td>
                            <strong style={{ color: '#f8fafc', fontSize: '0.82rem' }}>
                              {c.profiles?.username || 'Guest'}
                            </strong>
                          </td>
                          <td style={{ maxWidth: '320px' }}>
                            <p className={styles.commentContentText}>{c.content}</p>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className={styles.showTitleText}>{c.seriesTitle || 'Anime Episode'}</span>
                              <span className={styles.epTitleText}>{c.episodeTitle || ''}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {formatCommentDate(c.created_at)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className={styles.deleteBtn}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
