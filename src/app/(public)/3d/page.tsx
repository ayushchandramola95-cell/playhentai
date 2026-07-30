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
        id, title, slug, description, poster_image_key, cover_image_key,
        banner_image_key, tags, category, views, status, rating,
        release_year, studio, episode_count_override, poster_position,
        seasons (
          is_published,
          episodes (
            is_published
          )
        )
      `)
      .eq('is_published', true)
      .order('title', { ascending: true });

    if (error || !data) {
      return { series: [], isDbEmpty: true };
    }

    return { series: data, isDbEmpty: false };
  } catch {
    return { series: [], isDbEmpty: true };
  }
}

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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd]} />

      {/* Hero Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '20px',
        padding: '2rem 2.5rem',
        marginBottom: '2.5rem',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
            padding: '0.45rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
          }}>
            <Box size={22} />
          </div>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#06b6d4'
          }}>
            3D CGI Catalog
          </span>
        </div>

        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: 900,
          color: '#ffffff',
          marginBottom: '0.6rem',
          letterSpacing: '-0.02em'
        }}>
          3D Hentai & CGI Animations
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--foreground-secondary)',
          maxWidth: '750px',
          lineHeight: '1.6',
          margin: 0
        }}>
          Explore our dedicated collection of high quality 3D CGI anime series, smooth 60fps CGI animation releases, and 3D titles available to stream in 1080p HD.
        </p>
      </div>

      {/* Main 3D Catalog Hub */}
      <ThreeDHub initialSeries={series} isDbEmpty={isDbEmpty} />
    </div>
  );
}
