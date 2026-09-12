import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
import fs from 'fs';
import path from 'path';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'),
    title: {
      default: "Play Hentai – Watch Hentai Anime Online Free in HD",
      template: "%s"
    },
    description: "Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.",
    keywords: [
      'playhentai',
      'play hentai',
      'hentai',
      'uncensored hentai',
      'hentai anime',
      'watch hentai online free',
      '3d hentai',
      'hd hentai episodes',
      'playhentai live',
    ],
    authors: [{ name: "Play Hentai Team" }],
    creator: "Play Hentai",
    publisher: "Play Hentai",
    openGraph: {
      title: "Play Hentai – Watch Hentai Anime Online Free in HD",
      description: "Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.",
      url: "https://playhentai.live",
      siteName: "Play Hentai",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Play Hentai – Watch Hentai Anime Online Free in HD",
      description: "Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.",
    },
    alternates: {
      canonical: 'https://playhentai.live',
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
      yandex: 'fe39af37bfe31147',
      other: {
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
  };
}

function getAdsSettings(): { settings: Record<string, boolean>; disabledZones: string[] } {
  const settings = {
    block_banners: false,
    block_popunder: false,
    block_instant_message: false,
    block_in_page_push: false,
  };
  let disabledZones: string[] = [];
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileData);
      if (data.ads_block_banners === 'true') settings.block_banners = true;
      if (data.ads_block_popunder === 'true') settings.block_popunder = true;
      if (data.ads_block_instant_message === 'true') settings.block_instant_message = true;
      if (data.ads_block_in_page_push === 'true') settings.block_in_page_push = true;
      if (data.ads_disabled_zones) {
        try {
          const parsed = typeof data.ads_disabled_zones === 'string' ? JSON.parse(data.ads_disabled_zones) : data.ads_disabled_zones;
          if (Array.isArray(parsed)) disabledZones = parsed;
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('Error reading local settings for ads layout:', err);
  }
  return { settings, disabledZones };
}

import AnalyticsTracker from "@/components/AnalyticsTracker/AnalyticsTracker";

function getSiteAnalytics(): { ga4Id?: string; cfToken?: string } {
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        ga4Id: data.ga4_measurement_id || undefined,
        cfToken: data.cloudflare_analytics_token || undefined,
      };
    }
  } catch (e) {}
  return {};
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings: ads, disabledZones } = getAdsSettings();
  const analytics = getSiteAnalytics();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://playhentai.live/#website',
    name: 'PlayHentai',
    alternateName: ['Play Hentai', 'playhentai.live', 'Play-Hentai', 'PlayHentai Live'],
    url: 'https://playhentai.live',
    inLanguage: 'en-US',
    description: 'Welcome to PlayHentai. Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular adult animation titles.',
    publisher: {
      '@type': 'Organization',
      name: 'PlayHentai',
      url: 'https://playhentai.live',
      logo: {
        '@type': 'ImageObject',
        url: 'https://playhentai.live/icon.png',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://playhentai.live/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="6a97888e-site-verification" content="ae5b610b0f4d1db35865d663bf9fa0ee" />
        <meta name="yandex-verification" content="fe39af37bfe31147" />
        {/* Optional Google Analytics 4 (GA4) Tag */}
        {analytics.ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics-init" strategy="afterInteractive">
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
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
