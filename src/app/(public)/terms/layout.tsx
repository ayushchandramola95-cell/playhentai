import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const metadata: Metadata = {
  title: 'Terms of Service | HentaiKage',
  description: 'Terms of Service, acceptable use policies, age eligibility (18+), streaming licenses, and legal terms for HentaiKage.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | HentaiKage',
    description: 'Terms of Service, acceptable use policies, age eligibility (18+), streaming licenses, and legal terms for HentaiKage.',
    url: `${SITE_URL}/terms`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | HentaiKage',
    description: 'Terms of Service, acceptable use policies, age eligibility (18+), streaming licenses, and legal terms for HentaiKage.',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Terms of Service',
      'description': 'Terms of Service and legal agreement governing user access and streaming on HentaiKage.',
      'url': `${SITE_URL}/terms`,
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
        { '@type': 'ListItem', 'position': 2, 'name': 'Terms of Service', 'item': `${SITE_URL}/terms` },
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
