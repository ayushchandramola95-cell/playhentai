import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

export const metadata: Metadata = {
  title: 'Privacy Policy | PlayHentai',
  description: 'Privacy Policy, data collection practices, cookie management, user privacy rights (GDPR/CCPA), and security measures at PlayHentai.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | PlayHentai',
    description: 'Privacy Policy, data collection practices, cookie management, user privacy rights (GDPR/CCPA), and security measures at PlayHentai.',
    url: `${SITE_URL}/privacy`,
    siteName: 'PlayHentai',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | PlayHentai',
    description: 'Privacy Policy, data collection practices, cookie management, user privacy rights (GDPR/CCPA), and security measures at PlayHentai.',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Privacy Policy',
      'description': 'User privacy rights, GDPR/CCPA compliance, and transparent data handling practices on PlayHentai.',
      'url': `${SITE_URL}/privacy`,
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
        { '@type': 'ListItem', 'position': 2, 'name': 'Privacy Policy', 'item': `${SITE_URL}/privacy` },
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
