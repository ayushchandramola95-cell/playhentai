import React from 'react';
import Link from 'next/link';
import { Film, Calendar, MapPin, Star } from 'lucide-react';
import { getAllStudiosWithStats } from '@/utils/studiosData';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './studiosIndex.module.css';

export const metadata = {
  title: 'Hentai Production Studios Directory | PlayHentai',
  description: 'Browse all animation production studios, releases, stats, ratings, and series catalogs on PlayHentai.',
  alternates: {
    canonical: '/studios',
  },
  openGraph: {
    title: 'Hentai Production Studios Directory | PlayHentai',
    description: 'Browse all animation production studios, releases, stats, ratings, and series catalogs on PlayHentai.',
    url: 'https://playhentai.live/studios',
    type: 'website',
  },
};

export default async function StudiosIndexPage() {
  const studios = await getAllStudiosWithStats();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'Studios', 'item': `${siteUrl}/studios` },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Animation Production Studios Directory',
    'url': `${siteUrl}/studios`,
    'itemListElement': studios.map((s, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.name,
      'url': `${siteUrl}/studios/${s.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <div className="ambient-glow" />

      <div className={styles.titleSection}>
        <h1>Production Studios</h1>
        <p className={styles.subtitle}>
          Browse full profiles, ratings, release calendars, and watch catalogs of your favorite animation production houses on PlayHentai.
        </p>
      </div>

      <div className={styles.grid}>
        {studios.map((studio, idx) => (
          <Link href={`/studios/${studio.slug}`} key={studio.slug || `studio-${idx}`} className={`${styles.studioCard} glass`}>
            <div className={styles.cardBgGradient} style={{ '--accent-gradient': studio.gradient } as React.CSSProperties} />
            
            <div className={styles.cardHeader}>
              <div className={styles.logoAvatar} style={{ background: studio.gradient }}>
                {studio.logoChar}
              </div>
              <div className={styles.headerInfo}>
                <h2>{studio.name}</h2>
                <div className={styles.metaRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Calendar size={12} />
                    <span>Est. {studio.founded}</span>
                  </div>
                  <span>•</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <MapPin size={12} />
                    <span>{studio.country}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className={styles.bioText}>{studio.bio}</p>

            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Total Series</span>
                <span className={styles.statValue}>{studio.stats.totalSeries}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Avg Rating</span>
                <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
                  {typeof studio.stats.averageRating === 'number' 
                    ? studio.stats.averageRating.toFixed(1) 
                    : studio.stats.averageRating}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
