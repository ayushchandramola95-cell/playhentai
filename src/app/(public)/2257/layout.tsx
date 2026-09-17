import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const metadata: Metadata = {
  title: '18 U.S.C. § 2257 Record-Keeping Compliance Statement | PlayHentai',
  description: '18 U.S.C. § 2257 statutory exemption and compliance statement for 2D/3D animated and illustrated fiction on PlayHentai.',
  alternates: {
    canonical: '/2257',
  },
  openGraph: {
    title: '18 U.S.C. § 2257 Record-Keeping Compliance Statement | PlayHentai',
    description: '18 U.S.C. § 2257 statutory exemption and compliance statement for 2D/3D animated and illustrated fiction on PlayHentai.',
    url: `${SITE_URL}/2257`,
    siteName: 'PlayHentai',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '18 U.S.C. § 2257 Record-Keeping Compliance Statement | PlayHentai',
    description: '18 U.S.C. § 2257 statutory exemption and compliance statement for 2D/3D animated and illustrated fiction on PlayHentai.',
  },
};

export default function Exemption2257Layout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': '18 U.S.C. § 2257 Notice & Compliance',
      'description': 'Statutory record-keeping compliance statement and exemption notice for animated and illustrated media.',
      'url': `${SITE_URL}/2257`,
      'publisher': {
        '@type': 'Organization',
        'name': 'PlayHentai',
        'url': SITE_URL,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': '18 U.S.C. 2257 Notice', 'item': `${SITE_URL}/2257` },
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
