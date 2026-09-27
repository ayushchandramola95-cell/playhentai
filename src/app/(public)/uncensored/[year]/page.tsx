import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import { getLocalAllPublishedSeries } from '@/utils/localCatalogStore';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import JsonLd from '@/components/JsonLd/JsonLd';
import { isUncensoredSeries } from '@/utils/constants';
import styles from '../uncensored.module.css';

interface UncensoredYearPageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export const revalidate = 120;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export async function generateMetadata({ params, searchParams }: UncensoredYearPageProps): Promise<Metadata> {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) {
    return {
      title: 'Not Found | Play Hentai',
    };
  }

  const { page } = await searchParams;
  const canonicalPath = page && parseInt(page, 10) > 1
    ? `/uncensored/${year}?page=${page}`
    : `/uncensored/${year}`;

  const title = `Best Uncensored Hentai Anime (${year}) — Watch Online | Play Hentai`;
  const description = `Watch the best uncensored hentai anime series released in ${year} in full 1080p HD with English subtitles. Complete episodes, high bitrate, free on Play Hentai.`;

  const ogApiUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(`Uncensored Anime (${year})`)}&subtitle=${encodeURIComponent(`Watch the best uncensored anime releases from ${year}`)}&badge=${encodeURIComponent(year)}&image=${encodeURIComponent(`${SITE_URL}/hero-banner.png`)}`;

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
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: ogApiUrl,
          width: 1200,
          height: 630,
          alt: `Uncensored Hentai Anime (${year})`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogApiUrl],
    },
  };
}

export default async function UncensoredYearPage({ params, searchParams }: UncensoredYearPageProps) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) {
    notFound();
  }

  const yearNum = parseInt(year, 10);
  const allPublished = await getLocalAllPublishedSeries();

  // All uncensored series
  const allUncensored = allPublished.filter(isUncensoredSeries);

  // Distinct uncensored years for navigation pills
  const yearSet = new Set<number>();
  allUncensored.forEach((s: any) => {
    const y = s.release_year || s.releaseYear;
    if (typeof y === 'number' && y > 1990 && y <= 2030) {
      yearSet.add(y);
    }
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  // Filter series for the target year
  const filteredSeries = allUncensored.filter((s: any) => {
    const sYear = s.release_year || s.releaseYear;
    return sYear === yearNum;
  });

  const canonicalPath = `/uncensored/${year}`;
  const h1Text = `Uncensored Hentai Anime (${year})`;
  const introText = `Browse all uncensored hentai anime series released in ${year}. Stream high-definition 1080p episodes with English subtitles free on Play Hentai.`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Uncensored', 'item': `${SITE_URL}/uncensored` },
      { '@type': 'ListItem', 'position': 3, 'name': year, 'item': `${SITE_URL}${canonicalPath}` },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': h1Text,
    'description': introText,
    'url': `${SITE_URL}${canonicalPath}`,
    'mainEntity': {
      '@type': 'ItemList',
      'itemListElement': filteredSeries.slice(0, 25).map((s: any, idx: number) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': s.title,
        'url': `${SITE_URL}/series/${s.slug}`,
      })),
    },
  };

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <a href="/uncensored">Uncensored</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>{year}</span>
      </nav>

      {/* Dynamic Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTopMeta}>
          <span className={styles.uncensoredHighlightPill}>
            <ShieldCheck size={13} className={styles.uncensoredIconPill} /> UNCENSORED • {year}
          </span>
          <span className={styles.uncensoredHighlightPill}>
            <Sparkles size={13} className={styles.uncensoredIconPill} /> {filteredSeries.length} RELEASES
          </span>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.mainTitle}>{h1Text}</h1>
        </div>
        <p className={styles.subtext}>{introText}</p>

        {/* Year Fast Switcher Pills */}
        <div className={styles.filterPillsRow} aria-label="Filter by release year">
          <Link href="/uncensored" className={styles.filterPill}>
            All Years
          </Link>
          {availableYears.map((yr) => (
            <Link
              key={yr}
              href={`/uncensored/${yr}`}
              className={yr === yearNum ? styles.filterPillActive : styles.filterPill}
            >
              <Calendar size={12} />
              <span>{yr}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tailored Uncensored Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub
          initialSeries={filteredSeries}
          isDbEmpty={filteredSeries.length === 0}
          basePath={canonicalPath}
          isUncensoredPage={true}
          searchPlaceholder={`Search ${year} uncensored releases...`}
        />
      </Suspense>

      {/* SEO Information Section */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Watch {year} Uncensored Hentai Anime Releases in Full HD</h2>
          <p>
            Explore the complete lineup of {year} uncensored anime series and OVAs on Play Hentai. All titles in this collection are completely unpixelated, featuring authentic high-bitrate visual presentations, original Japanese voice tracks, and accurate English subtitles.
          </p>
          <div className={styles.seoGrid}>
            <div className={styles.seoFeature}>
              <h3>1080p High-Bitrate Quality</h3>
              <p>Every {year} release is encoded in crisp high definition with uncompressed audio for an immersive visual experience.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Complete Episode Streams</h3>
              <p>Stream every episode back-to-back without intrusive interruptions or broken streams.</p>
            </div>
            <div className={styles.seoFeature}>
              <h3>Uncut Japanese Visuals</h3>
              <p>Authentic creator cuts preserved with zero pixelation or censorship bars.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
