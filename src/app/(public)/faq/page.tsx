import FAQClient from '@/components/FAQClient/FAQClient';
import { FAQ_DATA } from '@/utils/faqData';
import JsonLd from '@/components/JsonLd/JsonLd';

export const metadata = {
  title: 'Frequently Asked Questions (FAQ) | HentaiKage',
  description: 'Find comprehensive answers about 1080p HD streaming, uncensored releases, account settings, Chromecast casting, and 18+ age verification on HentaiKage.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions (FAQ) | HentaiKage',
    description: 'Find comprehensive answers about 1080p HD streaming, uncensored releases, account settings, Chromecast casting, and 18+ age verification on HentaiKage.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'}/faq`,
    siteName: 'HentaiKage',
    locale: 'en_US',
    type: 'website' as const,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'}/og-banner.png`,
        width: 1200,
        height: 630,
        alt: 'HentaiKage FAQ',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frequently Asked Questions (FAQ) | HentaiKage',
    description: 'Find comprehensive answers about 1080p HD streaming, uncensored releases, account settings, Chromecast casting, and 18+ age verification on HentaiKage.',
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'}/og-banner.png`],
  },
};

export default function FAQPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQ_DATA.map((item) => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
      { '@type': 'ListItem', 'position': 2, 'name': 'FAQ', 'item': `${siteUrl}/faq` },
    ],
  };

  return (
    <>
      <JsonLd data={[faqJsonLd, breadcrumbJsonLd]} />
      <FAQClient />
    </>
  );
}
