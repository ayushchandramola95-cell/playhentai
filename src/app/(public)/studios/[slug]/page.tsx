import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Film, Star, Award, Calendar, MapPin } from 'lucide-react';
import { getStudioDetails } from '@/utils/studiosData';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import styles from './studios.module.css';

interface StudioDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StudioDetailPageProps) {
  const { slug } = await params;
  const studio = await getStudioDetails(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const canonicalUrl = `${siteUrl}/studios/${slug}`;
  const title = studio ? `${studio.name} - Animation Studio` : 'Studio Not Found';
  const description = studio?.bio || 'Animation studio production profile and releases catalog.';
  return {
    title,
    description,
    alternates: {
      canonical: `/studios/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}

export default async function StudioDetailPage({ params }: StudioDetailPageProps) {
  const { slug } = await params;
  const studio = await getStudioDetails(slug);

  if (!studio) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const studioUrl = `${siteUrl}/studios/${slug}`;

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': studioUrl,
    'url': studioUrl,
    'name': studio.name,
    'description': studio.bio || `${studio.name} is an animation studio producing hentai series.`,
    'foundingDate': studio.founded ? String(studio.founded) : undefined,
    'foundingLocation': studio.country || undefined,
  };

  const itemListJsonLd = studio.series.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${studio.name} Series`,
    'url': studioUrl,
    'itemListElement': studio.series.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${siteUrl}/series/${s.slug}`,
    })),
  } : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'Studios', 'item': `${siteUrl}/studios` },
      { '@type': 'ListItem', 'position': 3, 'name': studio.name, 'item': studioUrl },
    ],
  };

  const schemas = itemListJsonLd
    ? [organizationJsonLd, itemListJsonLd, breadcrumbJsonLd]
    : [organizationJsonLd, breadcrumbJsonLd];

  return (
    <div className={styles.container}>
      <JsonLd data={schemas} />
      <div className="ambient-glow" />

      {/* Back link */}
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>

      {/* Studio Header Card */}
      <div className={`${styles.studioHero} glass`}>
        <div className={styles.heroBgGradient} style={{ '--accent-gradient': studio.gradient } as React.CSSProperties} />

        <div className={styles.heroLayout}>
          {/* Avatar Icon */}
          <div className={styles.logoCol}>
            <div className={styles.logoAvatar} style={{ background: studio.gradient }}>
              {studio.logoChar}
            </div>
          </div>

          {/* Details */}
          <div className={styles.infoCol}>
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <Calendar size={14} />
                <span>Est. {studio.founded}</span>
              </div>
              <div className={styles.metaItem}>
                <MapPin size={14} />
                <span>{studio.country}</span>
              </div>
            </div>

            <h1>{studio.name}</h1>
            <p className={styles.bioText}>{studio.bio}</p>
          </div>

          {/* Stats Column */}
          <div className={styles.statsCol}>
            <div className={styles.statBox}>
              <div className={styles.statHeader}>
                <Film size={16} className={styles.statIcon} />
                <span>Total Series</span>
              </div>
              <div className={styles.statValue}>{studio.stats.totalSeries}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statHeader}>
                <Star size={16} className={styles.statStarIcon} />
                <span>Avg Rating</span>
              </div>
              <div className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {studio.stats.averageRating}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Releases Grid */}
      <section className={styles.releasesSection}>
        <div className={styles.sectionHeader}>
          <Award size={20} style={{ color: 'var(--primary)' }} />
          <h2>Studio Releases</h2>
        </div>

        {studio.series.length > 0 ? (
          <div className={styles.seriesGrid}>
            {studio.series.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Film size={36} style={{ marginBottom: '1rem', color: 'var(--foreground-muted)' }} />
            <p>No active series matching this studio found in the database.</p>
          </div>
        )}
      </section>
    </div>
  );
}

