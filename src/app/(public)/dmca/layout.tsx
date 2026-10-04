import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const metadata: Metadata = {
  title: 'DMCA Copyright Infringement & Takedown Policy | HentaiKage',
  description: 'Submit copyright takedown notices under the Digital Millennium Copyright Act (17 U.S.C. § 512) to the HentaiKage designated agent.',
  alternates: {
    canonical: '/dmca',
  },
  openGraph: {
    title: 'DMCA Copyright Infringement & Takedown Policy | HentaiKage',
    description: 'Submit copyright takedown notices under the Digital Millennium Copyright Act (17 U.S.C. § 512) to the HentaiKage designated agent.',
    url: `${SITE_URL}/dmca`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DMCA Copyright Infringement & Takedown Policy | HentaiKage',
    description: 'Submit copyright takedown notices under the Digital Millennium Copyright Act (17 U.S.C. § 512) to the HentaiKage designated agent.',
  },
};

export default function DmcaLayout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'DMCA Takedown Policy',
      'description': 'Digital Millennium Copyright Act statutory compliance and notice filing guidelines.',
      'url': `${SITE_URL}/dmca`,
      'publisher': {
        '@type': 'Organization',
        'name': 'HentaiKage',
        'url': SITE_URL,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'DMCA Takedown Policy', 'item': `${SITE_URL}/dmca` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLdData} />
      {children}
    </>
  );
}
