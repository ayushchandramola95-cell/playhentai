import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import { getSiteSettings } from "@/utils/siteSettings";

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'),
    title: {
      default: "Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage",
      template: "%s"
    },
    description: "Watch free hentai anime online in 1080p HD with English subtitles. Stream uncensored episodes, 3D releases, and trending series on mobile & desktop without ads.",
    keywords: [
      'hentaikage',
      'hentai kage',
      'hentai',
      'uncensored hentai',
      'hentai anime',
      'watch hentai online free',
      '3d hentai',
      'hd hentai episodes',
      'hentaikage live',
    ],
    authors: [{ name: "HentaiKage Team" }],
    creator: "HentaiKage",
    publisher: "HentaiKage",
    openGraph: {
      title: "Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage",
      description: "Watch free hentai anime online in 1080p HD with English subtitles. Stream uncensored episodes, 3D releases, and trending series on mobile & desktop without ads.",
      url: "https://hentaikage.cc",
      siteName: "HentaiKage",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'}/og-banner.png`,
          width: 1200,
          height: 630,
          alt: "Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Watch Free Hentai Anime Online in 1080p HD (English Subtitles) — HentaiKage",
      description: "Watch free hentai anime online in 1080p HD with English subtitles. Stream uncensored episodes, 3D releases, and trending series on mobile & desktop without ads.",
      images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc'}/og-banner.png`],
    },
    alternates: {
      canonical: 'https://hentaikage.cc',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon.png', type: 'image/png', sizes: '512x512' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
      shortcut: '/favicon.ico',
      apple: '/apple-icon.png',
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || 'OBYD4YfuuRaZC-yIlQcKuaxrhzXpkkrSHmtfeE4qRZ0',
      yandex: 'fe39af37bfe31147',
      other: {
        'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || 'OBYD4YfuuRaZC-yIlQcKuaxrhzXpkkrSHmtfeE4qRZ0',
        ...(process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : {}),
        '6a97888e-site-verification': 'ae5b610b0f4d1db35865d663bf9fa0ee',
        'yandex-verification': 'fe39af37bfe31147',
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'rating': 'adult',
      'RATING': 'RTA-5042-1996-1400-1579-RTA',
    },
  };
}

import AnalyticsTracker from "@/components/AnalyticsTracker/AnalyticsTracker";

function getSiteAnalytics(): { ga4Id?: string; cfToken?: string } {
  try {
    const data = getSiteSettings();
    return {
      ga4Id: data.ga4_measurement_id || undefined,
      cfToken: data.cloudflare_analytics_token || undefined,
    };
  } catch (e) {}
  return {};
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analytics = getSiteAnalytics();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://hentaikage.cc/#website',
    name: 'HentaiKage',
    alternateName: ['HentaiKage', 'hentaikage.cc', 'Hentai Kage', 'HentaiKage Live'],
    url: 'https://hentaikage.cc',
    inLanguage: 'en-US',
    description: 'Welcome to HentaiKage. Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular adult animation titles.',
    publisher: {
      '@type': 'Organization',
      name: 'HentaiKage',
      url: 'https://hentaikage.cc',
      logo: {
        '@type': 'ImageObject',
        url: 'https://hentaikage.cc/icon.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://hentaikage.cc/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://media.hentaikage.cc" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://media.hentaikage.cc" />
        <link rel="preconnect" href="https://media.playhentai.live" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://media.playhentai.live" />
        <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="HentaiKage" />
        <link rel="alternate" type="application/rss+xml" title="HentaiKage — Latest Anime Releases" href="/feed.xml" />
        <meta name="google-site-verification" content="OBYD4YfuuRaZC-yIlQcKuaxrhzXpkkrSHmtfeE4qRZ0" />
        <meta name="6a97888e-site-verification" content="ae5b610b0f4d1db35865d663bf9fa0ee" />
        <meta name="yandex-verification" content="fe39af37bfe31147" />
        {/* Optional Google Analytics 4 (GA4) Tag */}
        {analytics.ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4Id}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics-init" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${analytics.ga4Id}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <AnalyticsTracker />
          {children}
        </Providers>
        {/* Optional Cloudflare Web Analytics */}
        {analytics.cfToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${analytics.cfToken}"}`}
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  );
}
