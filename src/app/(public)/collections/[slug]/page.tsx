import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { getCollectionWithSeries } from '@/utils/collectionsData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import styles from '../collections.module.css';

interface CollectionDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionDetailPageProps) {
  const { slug } = await params;
  const collection = await getCollectionWithSeries(slug);
  return {
    title: collection ? `${collection.name} - Playlists` : 'Playlist Not Found',
    description: collection?.description || 'The requested curated series playlist details.',
    alternates: {
      canonical: `/playlists/${slug}`,
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { slug } = await params;
  const collection = await getCollectionWithSeries(slug);

  if (!collection) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Playlist Hero Banner */}
      <div className={styles.detailHeader} style={{ '--accent-gradient': collection.gradient } as React.CSSProperties}>
        <div className={styles.detailHeaderBg} />
        <div className={styles.detailHeaderContent}>
          <Link href="/collections" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>All Playlists</span>
          </Link>
          
          <div className={styles.detailMeta}>
            <span className={styles.playlistBadge}>Curated Playlist</span>
            <span className={styles.detailMetaSpan}>
              {collection.series.length} {collection.series.length === 1 ? 'Title' : 'Titles'}
            </span>
          </div>

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
