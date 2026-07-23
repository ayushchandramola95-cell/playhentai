import React from 'react';
import Link from 'next/link';
import { Film, FolderOpen, Video, Eye, Shield, Plus, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import styles from './admin.module.css';

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  let seriesCount = 0;
  let seasonsCount = 0;
  let episodesCount = 0;
  let viewsCount = 0;
  let recentSeries: any[] = [];
  let recentEpisodes: any[] = [];

  try {
    // 1. Fetch counts in parallel
    const [
      { count: sCount },
      { count: seaCount },
      { count: epCount },
      { count: vCount }
    ] = await Promise.all([
      supabase.from('series').select('*', { count: 'exact', head: true }),
      supabase.from('seasons').select('*', { count: 'exact', head: true }),
      supabase.from('episodes').select('*', { count: 'exact', head: true }),
      supabase.from('episode_views').select('*', { count: 'exact', head: true })
    ]);

    seriesCount = sCount || 0;
    seasonsCount = seaCount || 0;
    episodesCount = epCount || 0;
    viewsCount = vCount || 0;

    // 2. Fetch recent series
    const { data: recSeries } = await supabase
      .from('series')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recSeries) recentSeries = recSeries;

    // 3. Fetch recent episodes
    const { data: recEpisodes } = await supabase
      .from('episodes')
      .select(`
        *,
        seasons (
          title,
          series (
            title
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recEpisodes) recentEpisodes = recEpisodes;

  } catch (err) {
    console.error('Error fetching admin overview metrics:', err);
  }

  return (
    <div>
      <div className={styles.panelHeader} style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 850 }}>System Overview</h2>
          <p style={{ color: 'var(--foreground-secondary)', marginTop: '0.2rem' }}>
            High-level metrics and statistics of your streaming database.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/series" className={styles.createBtn}>
            <Plus size={16} />
            <span>Manage Content</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <section className={styles.dashboardGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Film size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{seriesCount}</span>
            <span className={styles.statLabel}>Total Series</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FolderOpen size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{seasonsCount}</span>
            <span className={styles.statLabel}>Seasons</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Video size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{episodesCount}</span>
            <span className={styles.statLabel}>Episodes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Eye size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{viewsCount}</span>
            <span className={styles.statLabel}>Total Views</span>
          </div>
        </div>
      </section>

      {/* Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2.5rem' }}>
        
        {/* Recent Series Card */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recently Added Series</h3>
            <Link href="/admin/series" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {recentSeries.length > 0 ? (
              recentSeries.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                      Slug: {item.slug}
                    </div>
                  </div>
                  <span className={`${styles.badge} ${item.is_published ? styles.badgeSuccess : styles.badgeWarning}`}>
                    {item.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No series registered in database yet.</div>
            )}
          </div>
        </div>

        {/* Recent Episodes Card */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recently Added Episodes</h3>
            <Link href="/admin/episodes" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {recentEpisodes.length > 0 ? (
              recentEpisodes.map((item) => {
                const seriesTitle = item.seasons?.series?.title || 'Unknown Series';
                const seasonTitle = item.seasons?.title || 'Season 1';
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--foreground-secondary)', marginTop: '0.1rem' }}>
                        {seriesTitle} • {seasonTitle} - Ep {item.episode_number}
                      </div>
                    </div>
                    <span className={`${styles.badge} ${item.is_published ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>No episodes registered in database yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
