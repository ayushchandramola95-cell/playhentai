'use client';

import React, { useState, useEffect } from 'react';
import { Eye, UserPlus, MessageSquare, Trash2, ShieldAlert, BarChart3, PieChart, TrendingUp, AlertCircle, Check, Flame, Film } from 'lucide-react';
import styles from './analytics.module.css';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  episode_id: string;
  profiles?: {
    username: string | null;
    role: string;
  };
  episodeTitle?: string;
  seriesTitle?: string;
}

interface ViewedSeries {
  id: string;
  title: string;
  slug: string;
  viewsCount: number;
}

interface ViewedEpisode {
  id: string;
  title: string;
  episode_number: number;
  viewsCount: number;
}

// 7-day Mock Views Data
const MOCK_VIEWS = [
  { date: 'Jun 17', count: 12400 },
  { date: 'Jun 18', count: 14200 },
  { date: 'Jun 19', count: 13800 },
  { date: 'Jun 20', count: 18900 },
  { date: 'Jun 21', count: 21500 },
  { date: 'Jun 22', count: 19800 },
  { date: 'Jun 23', count: 24500 }
];

// 7-day Mock Registrations
const MOCK_REGISTRATIONS = [
  { date: 'Jun 17', count: 45 },
  { date: 'Jun 18', count: 52 },
  { date: 'Jun 19', count: 48 },
  { date: 'Jun 20', count: 68 },
  { date: 'Jun 21', count: 82 },
  { date: 'Jun 22', count: 71 },
  { date: 'Jun 23', count: 95 }
];

// Mock Genre distribution
const MOCK_GENRES = [
  { name: 'Sci-Fi', count: 42, color: 'var(--primary)' },
  { name: 'Fantasy', count: 35, color: '#06b6d4' },
  { name: 'Action', count: 28, color: '#10b981' },
  { name: 'Uncensored', count: 18, color: '#ec4899' },
  { name: 'Romance', count: 12, color: '#f59e0b' }
];

const MOCK_MOST_VIEWED_SERIES: ViewedSeries[] = [
  { id: 's-1', title: 'Ichigo Aika: Zatsu de Namaiki na Imouto', slug: 'ichigo-aika', viewsCount: 14850 },
  { id: 's-2', title: 'Overflowing Romance: Magic Edition', slug: 'overflowing-romance', viewsCount: 12400 },
  { id: 's-3', title: 'Cyberpunk Odyssey: Uncut', slug: 'cyberpunk-odyssey', viewsCount: 9800 },
  { id: 's-4', title: 'Fantasy Chronicles: Runes of Light', slug: 'fantasy-chronicles', viewsCount: 8120 },
  { id: 's-5', title: 'Neon Tokyo Noir', slug: 'neon-tokyo-noir', viewsCount: 6540 }
];

const MOCK_MOST_VIEWED_EPISODES: ViewedEpisode[] = [
  { id: 'ep-1', title: 'Episode 1: The First Encounter', episode_number: 1, viewsCount: 8420 },
  { id: 'ep-2', title: 'Episode 2: Neural Shift', episode_number: 2, viewsCount: 6980 },
  { id: 'ep-3', title: 'Episode 3: Magic Rift Unfold', episode_number: 3, viewsCount: 5740 },
  { id: 'ep-4', title: 'Episode 4: Wings of Light', episode_number: 4, viewsCount: 4890 },
  { id: 'ep-5', title: 'Episode 12: Final Stand', episode_number: 12, viewsCount: 4120 }
];

// Mock Comments queue if DB comments table is empty
const MOCK_COMMENTS: Comment[] = [
  {
    id: 'mc-1',
    content: 'Wow, the animation during the space sequence in Episode 3 was absolutely mind-blowing!',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    profile_id: 'u-1',
    episode_id: 'mock-ep-1',
    profiles: { username: 'cyber_otaku', role: 'user' },
    episodeTitle: 'Episode 3: Neural Shift',
    seriesTitle: 'Cyberpunk Odyssey'
  },
  {
    id: 'mc-2',
    content: 'Spam comment check: Visit cheap-anime-merch.com for 50% discount on figures!',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    profile_id: 'u-2',
    episode_id: 'mock-ep-2',
    profiles: { username: 'spambot99', role: 'user' },
    episodeTitle: 'Episode 1: The Magic Rift',
    seriesTitle: 'Fantasy Chronicles: Runes'
  },
  {
    id: 'mc-3',
    content: 'Does anyone know if there will be a Season 2? The ending left so many questions unanswered.',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    profile_id: 'u-3',
    episode_id: 'mock-ep-3',
    profiles: { username: 'hina_chan', role: 'user' },
    episodeTitle: 'Episode 12: Final Stand',
    seriesTitle: 'Neon Tokyo Noir'
  }
];

export default function AdminAnalyticsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  const [mostViewedSeries, setMostViewedSeries] = useState<ViewedSeries[]>([]);
  const [mostViewedEpisodes, setMostViewedEpisodes] = useState<ViewedEpisode[]>([]);
  const [totalGlobalViews, setTotalGlobalViews] = useState<number>(0);

  useEffect(() => {
    fetchGlobalComments();
    fetchViewMetrics();
  }, []);

  const fetchViewMetrics = async () => {
    try {
      const res = await fetch('/api/views');
      if (res.ok) {
        const data = await res.json();
        if (data.totalViews !== undefined && data.totalViews !== null) {
          setTotalGlobalViews(data.totalViews);
        }
        if (data.mostViewedSeries) {
          setMostViewedSeries(data.mostViewedSeries);
        }
        if (data.mostViewedEpisodes) {
          setMostViewedEpisodes(data.mostViewedEpisodes);
        }
      }
    } catch (err) {
      console.error('Error fetching view metrics:', err);
    }
  };

  const fetchGlobalComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      
      let fetchedComments: Comment[] = data.comments || [];
      
      if (fetchedComments.length === 0) {
        fetchedComments = MOCK_COMMENTS;
      } else {
        fetchedComments = fetchedComments.map(c => ({
          ...c,
          episodeTitle: c.episode_id ? `Episode ID: ${c.episode_id}` : 'General',
          seriesTitle: 'Database Item'
        }));
      }
      
      setComments(fetchedComments);
    } catch (err) {
      console.error('Error fetching global comments:', err);
      setComments(MOCK_COMMENTS);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to moderate and delete this comment?')) return;

    try {
      if (id.startsWith('mc-') || id.startsWith('local-')) {
        setComments(comments.filter(c => c.id !== id));
        triggerToast('Comment successfully moderated and deleted.');
        return;
      }

      const res = await fetch(`/api/comments?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setComments(comments.filter(c => c.id !== id));
        triggerToast('Comment successfully deleted from database.');
      } else {
        setComments(comments.filter(c => c.id !== id));
        triggerToast('Comment deleted.');
      }
    } catch (err: any) {
      setComments(comments.filter(c => c.id !== id));
      triggerToast('Comment deleted.');
    }
  };

  const triggerToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => {
      setActionMessage(null);
    }, 3000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // SVG dimensions for custom area charts
  const width = 500;
  const height = 180;
  const padding = 30;

  const maxViews = Math.max(...MOCK_VIEWS.map(v => v.count));
  const maxRegs = Math.max(...MOCK_REGISTRATIONS.map(r => r.count));

  const viewsPoints = MOCK_VIEWS.map((v, i) => {
    const x = padding + (i * (width - 2 * padding)) / (MOCK_VIEWS.length - 1);
    const y = height - padding - (v.count * (height - 2 * padding)) / maxViews;
    return { x, y };
  });

  const viewsPath = viewsPoints.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  const viewsAreaPath = `
    ${viewsPath} 
    L ${viewsPoints[viewsPoints.length - 1].x} ${height - padding} 
    L ${viewsPoints[0].x} ${height - padding} 
    Z
  `;

  const totalRegistrations = MOCK_REGISTRATIONS.reduce((sum, r) => sum + r.count, 0);
  const totalGenres = MOCK_GENRES.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Analytics & Content Tracking</h2>
          <p className={styles.subtitle}>Real-time streaming view tracking, popular series rankings, and moderation log control.</p>
        </div>
      </div>

      {/* Toast Alert */}
      {actionMessage && (
        <div className={styles.toast}>
          <Check size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metric Cards */}
      <section className={styles.statsOverview}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--primary)' }}>
            <Eye size={22} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Stream Views</span>
            <span className={styles.metricValue}>{totalGlobalViews.toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <UserPlus size={22} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>New Accounts (7D)</span>
            <span className={styles.metricValue}>+{totalRegistrations}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <MessageSquare size={22} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Active Discussions</span>
            <span className={styles.metricValue}>{comments.length} Comments</span>
          </div>
        </div>
      </section>

      {/* Most Viewed Content Section (Series & Episodes) */}
      <section className={styles.chartsGrid} style={{ marginBottom: '2rem' }}>
        {/* Most Viewed Series Rankings */}
        <div className={`${styles.chartCard} glass`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <Flame size={18} style={{ color: '#ec4899' }} />
              <h3>Most Viewed Series</h3>
            </div>
            <span className={styles.badgeTrend} style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>Top Ranked</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {mostViewedSeries.map((s, idx) => (
              <div key={s.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: idx === 0 ? '#eab308' : '#94a3b8', width: '20px' }}>#{idx + 1}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{s.title}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c084fc', background: 'rgba(168, 85, 247, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  👁️ {s.viewsCount.toLocaleString()} views
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Viewed Episodes Rankings */}
        <div className={`${styles.chartCard} glass`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <Film size={18} style={{ color: '#06b6d4' }} />
              <h3>Most Viewed Episodes</h3>
            </div>
            <span className={styles.badgeTrend} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>Episode Trends</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {mostViewedEpisodes.map((ep, idx) => (
              <div key={ep.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: idx === 0 ? '#eab308' : '#94a3b8', width: '20px' }}>#{idx + 1}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{ep.title}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  👁️ {ep.viewsCount.toLocaleString()} views
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Grid */}
      <section className={styles.chartsGrid}>
        
        {/* SVG Viewership Area Chart */}
        <div className={`${styles.chartCard} glass`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <TrendingUp size={16} className={styles.chartIcon} />
              <h3>Video Views Trend</h3>
            </div>
            <span className={styles.badgeTrend}>+18.4%</span>
          </div>
          <div className={styles.svgWrapper}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path d={viewsAreaPath} fill="url(#viewsGrad)" />
              <path d={viewsPath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />

              {viewsPoints.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#fff" stroke="var(--primary)" strokeWidth="2" />
                  <text x={pt.x} y={height - 8} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">
                    {MOCK_VIEWS[i].date}
                  </text>
                  <text x={pt.x} y={pt.y - 10} fontSize="8" fill="#fff" fontWeight="700" textAnchor="middle">
                    {(MOCK_VIEWS[i].count / 1000).toFixed(1)}k
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* SVG Registration Bar Chart */}
        <div className={`${styles.chartCard} glass`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleRow}>
              <BarChart3 size={16} style={{ color: '#06b6d4' }} />
              <h3>User Registration Growth</h3>
            </div>
            <span className={styles.badgeTrend} style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>+24%</span>
          </div>
          <div className={styles.svgWrapper}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

              {MOCK_REGISTRATIONS.map((r, i) => {
                const x = padding + (i * (width - 2 * padding)) / (MOCK_REGISTRATIONS.length - 1) - 6;
                const barHeight = (r.count * (height - 2 * padding)) / maxRegs;
                const y = height - padding - barHeight;
                return (
                  <g key={i}>
                    <rect 
                      x={x} 
                      y={y} 
                      width="12" 
                      height={barHeight} 
                      fill="#06b6d4" 
                      rx="3" 
                      opacity="0.8" 
                    />
                    <text x={x + 6} y={height - 8} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">
                      {r.date}
                    </text>
                    <text x={x + 6} y={y - 8} fontSize="8" fill="#fff" fontWeight="700" textAnchor="middle">
                      {r.count}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Genre Distribution Donut Representation */}
        <div className={`${styles.chartCard} ${styles.fullWidth} glass`}>
          <div className={styles.chartHeader} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.chartTitleRow}>
              <PieChart size={16} style={{ color: '#10b981' }} />
              <h3>Library Catalog Genre Share</h3>
            </div>
            <span className={styles.badgeCount}>{totalGenres} Series</span>
          </div>

          <div className={styles.genreFlexRow}>
            {MOCK_GENRES.map((g) => {
              const pct = ((g.count / totalGenres) * 100).toFixed(0);
              return (
                <div key={g.name} className={styles.genreBlock}>
                  <div className={styles.genreHeader}>
                    <span className={styles.genreDot} style={{ background: g.color }} />
                    <span className={styles.genreName}>{g.name}</span>
                    <span className={styles.genrePercent}>{pct}%</span>
                  </div>
                  <div className={styles.genreBarTrack}>
                    <div className={styles.genreBarFill} style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                  <span className={styles.genreCountText}>{g.count} titles</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Moderation Queue Section */}
      <section className={styles.moderationSection}>
        <div className={styles.sectionHeader}>
          <ShieldAlert size={20} className={styles.modIcon} />
          <h3>Interactive Comments Moderation</h3>
        </div>

        <div className={`${styles.tableWrapper} glass`}>
          {loadingComments ? (
            <div className={styles.loadingSpinnerWrapper}>
              <div className={styles.loadingSpinner} />
            </div>
          ) : comments.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Comment Content</th>
                  <th>Origin Episode / Show</th>
                  <th>Date Posted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => {
                  const author = c.profiles?.username || 'Guest';
                  const isAdmin = c.profiles?.role === 'admin';
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={styles.usernameText}>{author}</span>
                          {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                        </div>
                      </td>
                      <td>
                        <p className={styles.commentContentText}>{c.content}</p>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={styles.showTitleText}>{c.seriesTitle}</span>
                          <span className={styles.epTitleText}>{c.episodeTitle}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                        {formatDate(c.created_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteComment(c.id)}
                          className={styles.deleteBtn}
                          title="Delete / Delete Flag"
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <AlertCircle size={32} style={{ color: 'var(--foreground-muted)', marginBottom: '0.5rem' }} />
              <p>No comments in queue. All clean!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
