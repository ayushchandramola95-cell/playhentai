import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { getCollectionWithSeries } from '@/utils/collectionsData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from '../../collections/collections.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

interface PlaylistDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PlaylistDetailPageProps) {
  const { slug } = await params;
  const collection = await getCollectionWithSeries(slug);

  if (!collection) {
    return {
      title: 'Playlist Not Found | Play Hentai',
      description: 'The requested curated hentai playlist detail view was not found on Play Hentai.',
    };
  }

  const title = `${collection.name} — Curated Hentai Playlist | Play Hentai`;
  
  // Revised dynamic description fallback strategy from Screenshot 5
  const rawDesc = collection.description || '';
  const description = rawDesc.trim()
    ? `${rawDesc.trim()} Explore this curated hentai anime playlist on Play Hentai and discover the series and episodes included in the collection.`
    : `Explore the ${collection.name} hentai anime playlist on Play Hentai. Browse the curated series and available episodes in this collection.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/playlists/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/playlists/${slug}`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PlaylistDetailPage({ params }: PlaylistDetailPageProps) {
  const { slug } = await params;
  const collection = await getCollectionWithSeries(slug);

  if (!collection) {
    notFound();
  }

  // Inject BreadcrumbList and ItemList JSON-LD schemas
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Playlists', 'item': `${SITE_URL}/playlists` },
      { '@type': 'ListItem', 'position': 3, 'name': collection.name, 'item': `${SITE_URL}/playlists/${slug}` },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${collection.name} Hentai Playlist`,
    'url': `${SITE_URL}/playlists/${slug}`,
    'itemListElement': collection.series.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <div className="ambient-glow" />

      {/* Playlist Hero Banner */}
      <div className={styles.detailHeader} style={{ '--accent-gradient': collection.gradient } as React.CSSProperties}>
        <div className={styles.detailHeaderBg} />
        <div className={styles.detailHeaderContent}>
          <Link href="/playlists" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>All Playlists</span>
          </Link>
          
          <div className={styles.detailMeta}>
            <span className={styles.playlistBadge}>Curated Playlist</span>
            <span className={styles.detailMetaSpan}>
              {collection.series.length} {collection.series.length === 1 ? 'Title' : 'Titles'}
            </span>
          </div>

          {/* Dynamic single clean H1 according to Screenshot 6 */}
          <h1>{collection.name}</h1>
          <p className={styles.detailDescription}>{collection.description}</p>
        </div>
      </div>

      {/* Series Grid */}
      <section className={styles.detailGridSection}>
        <h2>Series in this Playlist</h2>

        {collection.series.length > 0 ? (
          <div className={styles.seriesGrid}>
            {collection.series.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Play size={36} style={{ marginBottom: '1rem', color: 'var(--foreground-muted)' }} />
            <p>No series match this collection in the database yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
