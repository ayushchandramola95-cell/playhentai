import React, { Suspense } from 'react';
import { getAllStudiosWithStats } from '@/utils/studiosData';
import StudiosDirectoryClient from '@/components/StudiosDirectory/StudiosDirectoryClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export async function generateMetadata() {
  return {
    title: 'Hentai Production Studios Directory — 118+ Studios | Play Hentai',
    description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on Play Hentai.',
    alternates: {
      canonical: '/studios',
    },
    openGraph: {
      title: 'Hentai Production Studios Directory — 118+ Studios | Play Hentai',
      description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on Play Hentai.',
      url: `${SITE_URL}/studios`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: `${SITE_URL}/hero-banner.png`,
          width: 1200,
          height: 630,
          alt: 'Play Hentai Hentai Production Studios Directory',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Hentai Production Studios Directory — 118+ Studios | Play Hentai',
      description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on Play Hentai.',
      images: [`${SITE_URL}/hero-banner.png`],
    },
  };
}

export default async function StudiosIndexPage() {
  const studios = await getAllStudiosWithStats();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Studios', 'item': `${SITE_URL}/studios` },
    ],
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Hentai Animation Production Studios Directory',
    'url': `${SITE_URL}/studios`,
    'itemListElement': studios.slice(0, 50).map((s, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.name,
      'url': `${SITE_URL}/studios/${s.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <Suspense fallback={null}>
        <StudiosDirectoryClient studios={studios} />
      </Suspense>
    </>
  );
}
