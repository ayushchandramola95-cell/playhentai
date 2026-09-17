import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const metadata: Metadata = {
  title: 'Content Removal & Creator Takedowns | PlayHentai',
  description: 'Expedited fast-track content removal for indie animators, doujin circles, and creators without formal statutory DMCA paperwork.',
  alternates: {
    canonical: '/content-removal',
  },
  openGraph: {
    title: 'Content Removal & Creator Takedowns | PlayHentai',
    description: 'Expedited fast-track content removal for indie animators, doujin circles, and creators without formal statutory DMCA paperwork.',
    url: `${SITE_URL}/content-removal`,
    siteName: 'PlayHentai',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Content Removal & Creator Takedowns | PlayHentai',
    description: 'Expedited fast-track content removal for indie animators, doujin circles, and creators without formal statutory DMCA paperwork.',
  },
};

export default function ContentRemovalLayout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Content Removal & Creator Takedowns',
      'description': 'Expedited courtesy takedown portal designed for indie creators and doujinshi circles.',
      'url': `${SITE_URL}/content-removal`,
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
        { '@type': 'ListItem', 'position': 2, 'name': 'Content Removal', 'item': `${SITE_URL}/content-removal` },
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
