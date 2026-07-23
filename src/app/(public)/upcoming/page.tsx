import React from 'react';
import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import styles from '../recent/recent.module.css';

export const metadata = {
  title: 'Upcoming Titles - PlayHentai',
  description: 'See which titles are scheduled to air soon on PlayHentai. Stay tuned for previews and trailers!',
  alternates: {
    canonical: '/upcoming',
  },
};

export default async function UpcomingPage() {
  const supabase = await createClient();
  let dbSeries: any[] = [];
  let isDbEmpty = true;

  try {
    const { data: seriesData } = await supabase
      .from('series')
      .select(`
        *,
        seasons (
          is_published,
          episodes (
            is_published,
            release_date,
            created_at
          )
        )
      `)
      .eq('is_published', true)
      .eq('status', 'upcoming');

    if (seriesData && seriesData.length > 0) {
      dbSeries = seriesData.sort((a: any, b: any) => {
        // Sort by series created_at DESC or release_year DESC
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      isDbEmpty = false;
    }
  } catch (err) {
    console.error('Error fetching upcoming series from DB:', err);
  }

  return (
    <div className={styles.container}>
      {/* Ambient Glows */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <section className={styles.section}>
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.9rem', 
              color: 'var(--foreground-muted)', 
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            className="hover-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <Compass size={24} className={styles.sectionIcon} />
            <h1>Upcoming Titles</h1>
          </div>
        </div>

        {isDbEmpty ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: '12px'
          }} className="glass">
            <Compass size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Upcoming Titles</h3>
            <p style={{ color: 'var(--foreground-muted)', maxWidth: '400px', fontSize: '0.9rem' }}>
              We don\'t have any titles scheduled to release soon. Check back later for updates!
            </p>
          </div>
        ) : (
          <div className={styles.seriesGrid}>
            {dbSeries.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
