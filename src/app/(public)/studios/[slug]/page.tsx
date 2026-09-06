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
  const title = studio ? `${studio.name} Hentai Anime Series & Releases | Play Hentai` : 'Studio Not Found | Play Hentai';
  const description = studio?.bio || 'Animation studio production profile, ratings, and series releases catalog on Play Hentai.';
  
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
      images: [
        {
          url: `${siteUrl}/hero-banner.png`,
          width: 1200,
          height: 630,
          alt: `${studio?.name || 'Studio'} Releases`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/hero-banner.png`],
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
    'description': studio.bio || `${studio.name} is an animation studio producing anime series on Play Hentai.`,
    'foundingDate': studio.founded ? String(studio.founded) : undefined,
    'foundingLocation': studio.country || undefined,
  };

  const itemListJsonLd = studio.series.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${studio.name} Releases`,
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
      <Link href="/studios" className={styles.backLink}>
        <ArrowLeft size={15} />
        <span>Back to Studios</span>
      </Link>

      {/* Studio Header Card */}
      <div className={styles.studioHero}>
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
                <Calendar size={13} />
                <span>Est. {studio.founded}</span>
              </div>
              <div className={styles.metaItem}>
                <MapPin size={13} />
                <span>{studio.country}</span>
              </div>
            </div>

            <h1>{studio.name}</h1>
            <p className={styles.bioText}>{studio.bio}</p>

            {/* Primary Genres Badges */}
            {studio.tags && studio.tags.length > 0 && (
              <div className={styles.genresRow}>
                {studio.tags
                  .filter((t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:'))
                  .slice(0, 6)
                  .map((tag: string) => {
                    const cleanSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    return (
                      <Link href={`/tag/${cleanSlug}`} key={tag} className={styles.genreBadge}>
                        {tag}
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Stats Column */}
          <div className={styles.statsCol}>
            <div className={styles.statBox}>
              <div className={styles.statHeader}>
                <Film size={14} className={styles.statIcon} />
                <span>Total Series</span>
              </div>
              <div className={styles.statValue}>{studio.stats.totalSeries}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statHeader}>
                <Star size={14} className={styles.statStarIcon} />
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
          <div className={styles.sectionTitleRow}>
            <Award size={20} style={{ color: 'var(--primary)' }} />
            <h2>Studio Releases</h2>
          </div>
          <span className={styles.seriesCountBadge}>
            {studio.series.length} {studio.series.length === 1 ? 'Release' : 'Releases'}
          </span>
        </div>

        {studio.series.length > 0 ? (
          <div className={styles.seriesGrid}>
            {studio.series.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Film size={40} style={{ color: 'var(--foreground-muted)' }} />
            <h3>No series uploaded yet</h3>
            <p>
              We are actively digitizing and indexing the complete catalog for {studio.name}. Check back soon for new high-definition releases!
            </p>
            <Link href="/studios" className={styles.browseAllBtn}>
              Browse All Studios
            </Link>
          </div>
        )}
      </section>

      {/* Related Studios Section */}
      {studio.relatedStudios && studio.relatedStudios.length > 0 && (
        <section className={styles.relatedSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleRow}>
              <Film size={18} style={{ color: 'var(--primary)' }} />
              <h2>Similar Studios</h2>
            </div>
          </div>
          <div className={styles.relatedGrid}>
            {studio.relatedStudios.map((other: any) => (
              <Link href={`/studios/${other.slug}`} key={other.slug} className={styles.relatedCard}>
                <div className={styles.relatedAvatar} style={{ background: other.gradient }}>
                  {other.logoChar}
                </div>
                <div className={styles.relatedInfo}>
                   <h3>{other.name}</h3>
                   <span className={styles.relatedMeta}>
                     {other.totalSeries} Series • ★ {other.averageRating}
                   </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
