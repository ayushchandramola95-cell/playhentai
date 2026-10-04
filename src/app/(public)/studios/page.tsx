import React, { Suspense } from 'react';
import { getAllStudiosWithStats } from '@/utils/studiosData';
import StudiosDirectoryClient from '@/components/StudiosDirectory/StudiosDirectoryClient';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const revalidate = 120;

export async function generateMetadata() {
  return {
    title: 'Hentai Animation Studios Directory | HentaiKage',
    description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on HentaiKage.',
    keywords: [
      'hentai studios',
      'hentai animation studios',
      'anime production companies',
      'hentai creators',
      'hentaikage'
    ],
    alternates: {
      canonical: '/studios',
    },
    openGraph: {
      title: 'Hentai Animation Studios Directory | HentaiKage',
      description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on HentaiKage.',
      url: `${SITE_URL}/studios`,
      siteName: 'HentaiKage',
      locale: 'en_US',
      type: 'website' as const,
      images: [
        {
          url: `${SITE_URL}/og-banner.png`,
          width: 1200,
          height: 630,
          alt: 'HentaiKage Hentai Production Studios Directory',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Hentai Production Studios Directory — 118+ Studios | HentaiKage',
      description: 'Browse 118+ hentai animation production studios, releases, stats, ratings, and series catalogs on HentaiKage.',
      images: [`${SITE_URL}/og-banner.png`],
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
