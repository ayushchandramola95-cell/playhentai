import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Film, Star, Award, Calendar, MapPin, CheckCircle2, PlayCircle, ShieldCheck } from 'lucide-react';
import { getStudioDetails } from '@/utils/studiosData';
import { getR2Url } from '@/utils/r2';
import SeriesCard from '@/components/SeriesCard/SeriesCard';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isUncensoredSeries } from '@/utils/constants';
import styles from '../studios.module.css';

interface StudioStatusPageProps {
  params: Promise<{
    slug: string;
    status: string;
  }>;
}

export const revalidate = 120;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

function parseStudioSubfilter(status: string) {
  const clean = decodeURIComponent(status).toLowerCase().trim();
  const isYear = /^\d{4}$/.test(clean);
  const isCompleted = clean === 'completed';
  const isOngoing = clean === 'ongoing';
  const isUncensored = clean === 'uncensored';

  if (!isYear && !isCompleted && !isOngoing && !isUncensored) {
    return null;
  }

  let label = clean;
  if (isCompleted) label = 'Completed';
  else if (isOngoing) label = 'Ongoing';
  else if (isUncensored) label = 'Uncensored';
  else if (isYear) label = clean;

  return {
    raw: clean,
    label,
    isYear,
    isCompleted,
    isOngoing,
    isUncensored,
  };
}

export async function generateMetadata({ params }: StudioStatusPageProps) {
  const { slug, status } = await params;
  const parsed = parseStudioSubfilter(status);
  const studio = await getStudioDetails(slug);

  if (!studio || !parsed) {
    return {
      title: 'Studio Releases Not Found | Play Hentai',
      description: 'The requested studio releases catalog could not be found.',
    };
  }

  let title = `${studio.name} (${parsed.label}) Hentai Anime Releases | Play Hentai`;
  let description = `Stream ${parsed.label.toLowerCase()} hentai anime series and OVAs produced by ${studio.name} in full 1080p HD with English subtitles free on Play Hentai.`;

  if (parsed.isCompleted) {
    title = `${studio.name} Completed Hentai Anime Series — Watch Online | Play Hentai`;
    description = `Watch all completed anime series and OVAs produced by ${studio.name}. Binge watch full episodes in 1080p HD on Play Hentai.`;
  } else if (parsed.isOngoing) {
    title = `${studio.name} Ongoing Hentai Anime Releases — Watch Online | Play Hentai`;
    description = `Watch ongoing and currently releasing anime series produced by ${studio.name}. Catch the newest episodes in HD on Play Hentai.`;
  } else if (parsed.isUncensored) {
    title = `Uncensored ${studio.name} Hentai Anime Releases — 1080p HD | Play Hentai`;
    description = `Stream 100% uncensored anime series produced by ${studio.name} in high definition with English subtitles on Play Hentai.`;
  } else if (parsed.isYear) {
    title = `${studio.name} Anime Releases (${parsed.label}) — Watch Online | Play Hentai`;
    description = `Browse and stream all anime releases from ${studio.name} published in ${parsed.label} in HD on Play Hentai.`;
  }

  const canonicalPath = `/studios/${slug}/${parsed.raw}`;
  const topSeriesImg = studio.series?.[0]?.cover_image_key || studio.series?.[0]?.poster_image_key;
  const ogImageUrl = topSeriesImg ? getR2Url(topSeriesImg, 'cover') : `${SITE_URL}/og-banner.png`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonicalPath}`,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${studio.name} ${parsed.label} Releases`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function StudioStatusPage({ params }: StudioStatusPageProps) {
  const { slug, status } = await params;
  const parsed = parseStudioSubfilter(status);

  if (!parsed) {
    notFound();
  }

  const studio = await getStudioDetails(slug);
  if (!studio) {
    notFound();
  }

  const allStudioSeries = studio.series || [];

  // Filter series according to subfilter
  const filteredSeries = allStudioSeries.filter((s: any) => {
    if (parsed.isCompleted) {
      const st = (s.status || '').toLowerCase();
      return st === 'completed' || st === 'finalized';
    }
    if (parsed.isOngoing) {
      const st = (s.status || '').toLowerCase();
      return st === 'ongoing' || st === 'releasing';
    }
    if (parsed.isUncensored) {
      return isUncensoredSeries(s);
    }
    if (parsed.isYear) {
      const yr = parseInt(parsed.label, 10);
      return (s.release_year || s.releaseYear) === yr;
    }
    return true;
  });

  // Calculate counts for subfilters
  const completedCount = allStudioSeries.filter((s: any) => {
    const st = (s.status || '').toLowerCase();
    return st === 'completed' || st === 'finalized';
  }).length;

  const ongoingCount = allStudioSeries.filter((s: any) => {
    const st = (s.status || '').toLowerCase();
    return st === 'ongoing' || st === 'releasing';
  }).length;

  const uncensoredCount = allStudioSeries.filter((s: any) => isUncensoredSeries(s)).length;

  const canonicalPath = `/studios/${slug}/${parsed.raw}`;
  const studioUrl = `${SITE_URL}/studios/${slug}`;

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Studios', 'item': `${SITE_URL}/studios` },
      { '@type': 'ListItem', 'position': 3, 'name': studio.name, 'item': studioUrl },
      { '@type': 'ListItem', 'position': 4, 'name': parsed.label, 'item': `${SITE_URL}${canonicalPath}` },
    ],
  };

  const itemListJsonLd = filteredSeries.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${studio.name} (${parsed.label}) Releases`,
    'url': `${SITE_URL}${canonicalPath}`,
    'itemListElement': filteredSeries.slice(0, 25).map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  } : null;

  const schemas = itemListJsonLd
    ? [organizationJsonLd, itemListJsonLd, breadcrumbJsonLd]
    : [organizationJsonLd, breadcrumbJsonLd];

  return (
    <div className={styles.container}>
      <JsonLd data={schemas} />
      <div className="ambient-glow" />

      {/* Back link */}
      <Link href={`/studios/${slug}`} className={styles.backLink}>
        <ArrowLeft size={15} />
        <span>Back to {studio.name} Profile</span>
      </Link>

      {/* Studio Header Card */}
      <div className={styles.studioHero}>
        <div className={styles.heroBgGradient} style={{ '--accent-gradient': studio.gradient } as React.CSSProperties} />

        <div className={styles.heroLayout}>
          <div className={styles.logoCol}>
            <div className={styles.logoAvatar} style={{ background: studio.gradient }}>
              {studio.logoChar}
            </div>
          </div>

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

            <h1>{studio.name} — {parsed.label} Releases</h1>
            <p className={styles.bioText}>{studio.bio}</p>

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

          <div className={styles.statsCol}>
            <div className={styles.statBox}>
              <div className={styles.statHeader}>
                <Film size={14} className={styles.statIcon} />
                <span>{parsed.label} Matches</span>
              </div>
              <div className={styles.statValue}>{filteredSeries.length}</div>
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

      {/* Subfilter Nav Pills */}
      <nav className={styles.subfilterNav} aria-label="Studio release filters">
        <Link href={`/studios/${slug}`} className={styles.subfilterPill}>
          <Film size={14} />
          <span>All Releases</span>
          <span className={styles.subfilterCount}>{allStudioSeries.length}</span>
        </Link>
        <Link
          href={`/studios/${slug}/completed`}
          className={parsed.isCompleted ? styles.subfilterPillActive : styles.subfilterPill}
        >
          <CheckCircle2 size={14} />
          <span>Completed</span>
          <span className={styles.subfilterCount}>{completedCount}</span>
        </Link>
        <Link
          href={`/studios/${slug}/ongoing`}
          className={parsed.isOngoing ? styles.subfilterPillActive : styles.subfilterPill}
        >
          <PlayCircle size={14} />
          <span>Ongoing</span>
          <span className={styles.subfilterCount}>{ongoingCount}</span>
        </Link>
        <Link
          href={`/studios/${slug}/uncensored`}
          className={parsed.isUncensored ? styles.subfilterPillActive : styles.subfilterPill}
        >
          <ShieldCheck size={14} />
          <span>Uncensored</span>
          <span className={styles.subfilterCount}>{uncensoredCount}</span>
        </Link>
      </nav>

      {/* Filtered Releases Grid */}
      <section className={styles.releasesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleRow}>
            <Award size={20} style={{ color: 'var(--primary)' }} />
            <h2>{parsed.label} Releases ({filteredSeries.length})</h2>
          </div>
          <span className={styles.seriesCountBadge}>
            Showing {filteredSeries.length} of {allStudioSeries.length} series
          </span>
        </div>

        {filteredSeries.length > 0 ? (
          <div className={styles.seriesGrid}>
            {filteredSeries.map((item) => (
              <SeriesCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Film size={40} style={{ color: 'var(--foreground-muted)' }} />
            <h3>No {parsed.label.toLowerCase()} series found</h3>
            <p>
              There are currently no series from {studio.name} matching the &quot;{parsed.label}&quot; filter.
            </p>
            <Link href={`/studios/${slug}`} className={styles.browseAllBtn}>
              View All {studio.name} Releases
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
