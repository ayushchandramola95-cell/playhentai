import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { MOCK_SERIES } from '@/utils/mockData';
import ThreeDHub from '@/components/ThreeDHub/ThreeDHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { Box } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Watch 3D Hentai Anime Series & CGI Animations in HD | PlayHentai',
  description: 'Browse and stream 1080p high quality 3D CGI hentai anime series, 3D animations, and top CGI releases online for free on PlayHentai.',
  alternates: {
    canonical: '/3d',
  },
  openGraph: {
    title: 'Watch 3D Hentai Anime Series & CGI Animations in HD | PlayHentai',
    description: 'Browse and stream 1080p high quality 3D CGI hentai anime series, 3D animations, and top CGI releases online for free on PlayHentai.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}/3d`,
    type: 'website' as const,
  },
};

async function getSeriesFromDb() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('series')
      .select(`
        *,
        seasons (
          is_published,
          episodes (
            is_published
          )
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { series: [], isDbEmpty: true };
    }

    return { series: data, isDbEmpty: false };
  } catch {
    return { series: [], isDbEmpty: true };
  }
}

import styles from './ThreeD.module.css';

export default async function ThreeDPage() {
  const { series, isDbEmpty } = await getSeriesFromDb();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '3D Hentai & CGI Animations Catalog',
    url: `${siteUrl}/3d`,
    description: 'Browse and stream 1080p high quality 3D CGI hentai anime series and CGI animation releases.',
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': '3D Animations', 'item': `${siteUrl}/3d` },
    ],
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd]} />

      {/* Hero Banner Header */}
      <div className={styles.heroBanner}>
        <div className={styles.glowSphere} />

        <div className={styles.badgeRow}>
          <div className={styles.badgeIcon}>
            <Box size={20} />
          </div>
          <span className={styles.badgeText}>
            3D CGI Catalog
          </span>
        </div>

        <h1 className={styles.heroTitle}>
          3D Hentai & CGI Animations
        </h1>
        <p className={styles.heroDescription}>
          Explore our dedicated collection of high quality 3D CGI anime series, smooth 60fps CGI animation releases, and 3D titles available to stream in 1080p HD.
        </p>
      </div>

      {/* Main 3D Catalog Hub */}
      <ThreeDHub initialSeries={series} isDbEmpty={isDbEmpty} />
    </div>
  );
}
