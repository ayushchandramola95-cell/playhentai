import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

export const metadata: Metadata = {
  title: 'Contact Support & Help Desk | HentaiKage',
  description: 'Reach HentaiKage customer support for video playback issues, account assistance, DMCA takedowns, and business partnerships.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Support & Help Desk | HentaiKage',
    description: 'Reach HentaiKage customer support for video playback issues, account assistance, DMCA takedowns, and business partnerships.',
    url: `${SITE_URL}/contact`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Support & Help Desk | HentaiKage',
    description: 'Reach HentaiKage customer support for video playback issues, account assistance, DMCA takedowns, and business partnerships.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact Support & Help Desk',
      'description': 'Customer support, technical playback help, and partnership channels for HentaiKage.',
      'url': `${SITE_URL}/contact`,
      'mainEntity': {
        '@type': 'Organization',
        'name': 'HentaiKage',
        'url': SITE_URL,
        'contactPoint': [
          {
            '@type': 'ContactPoint',
            'contactType': 'Customer Support',
            'email': 'support@hentaikage.cc',
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'Copyright & DMCA Agent',
            'email': 'takedown@hentaikage.cc',
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'Legal & Compliance',
            'email': 'legal@hentaikage.cc',
          },
        ],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Contact Support', 'item': `${SITE_URL}/contact` },
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
