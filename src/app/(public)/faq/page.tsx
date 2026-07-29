import React from 'react';
import FAQClient from '@/components/FAQClient/FAQClient';
import JsonLd from '@/components/JsonLd/JsonLd';

export const metadata = {
  title: 'Frequently Asked Questions (FAQ) - PlayHentai',
  description: 'Find comprehensive answers about 1080p HD streaming, uncensored releases, account settings, Chromecast casting, and 18+ age verification on PlayHentai.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions (FAQ) - PlayHentai',
    description: 'Find comprehensive answers about 1080p HD streaming, uncensored releases, account settings, Chromecast casting, and 18+ age verification on PlayHentai.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}/faq`,
    type: 'website' as const,
  },
};

const FAQ_DATA = [
  {
    q: 'Is PlayHentai completely free to use?',
    a: 'Yes! All anime series, 1080p HD episodes, category hubs, and streaming features on PlayHentai are 100% free with unlimited access.'
  },
  {
    q: 'What is the age requirement to access PlayHentai?',
    a: 'You must be at least 18 years of age (or the legal age of majority in your country) to access or view content on PlayHentai.'
  },
  {
    q: 'What is the difference between Censored and Uncensored releases?',
    a: 'Uncensored titles present original unedited animation without pixelation or mosaic overlays. Censored releases feature standard broadcast pixelation.'
  },
  {
    q: 'Why is a video buffering or failing to load?',
    a: 'Video playback issues are usually caused by browser ad-block extensions or network congestion. Try switching video server mirrors below the player or clearing browser cache.'
  },
  {
    q: 'Do I need an account to watch episodes on PlayHentai?',
    a: 'No account is required to stream any video on PlayHentai. However, creating a free account unlocks saving titles to your Watchlist and tracking Watch History.'
  },
  {
    q: 'Can I watch PlayHentai on mobile devices or Smart TVs?',
    a: 'Yes! PlayHentai is fully responsive and supports casting to Apple AirPlay and Google Chromecast directly from the video player.'
  }
];

export default function FAQPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQ_DATA.map((item) => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.a,
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
