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
      template: "%s | Play Hentai"
    },
    description: "Watch hentai anime online free in HD on Play Hentai. Stream uncensored hentai series and episodes with English subtitles, discover new releases, and explore popular titles by genre and studio.",
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
      other: {
        '6a97888e-site-verification': 'ae5b610b0f4d1db35865d663bf9fa0ee',
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

function getAdsSettings(): Record<string, boolean> {
  const settings = {
    block_banners: false,
    block_popunder: false,
    block_instant_message: false,
    block_in_page_push: false,
  };
  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileData);
      if (data.ads_block_banners === 'true') settings.block_banners = true;
      if (data.ads_block_popunder === 'true') settings.block_popunder = true;
      if (data.ads_block_instant_message === 'true') settings.block_instant_message = true;
      if (data.ads_block_in_page_push === 'true') settings.block_in_page_push = true;
    }
  } catch (err) {
    console.error('Error reading local settings for ads layout:', err);
  }
  return settings;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ads = getAdsSettings();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Play Hentai',
    alternateName: ['PlayHentai', 'Play-Hentai'],
    url: 'https://playhentai.live',
    description: 'Welcome to Play Hentai. Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular adult animation titles.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://playhentai.live/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="6a97888e-site-verification" content="ae5b610b0f4d1db35865d663bf9fa0ee" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Exoclick Global Popunder (1 ad every 5 minutes in background) */}
        {!ads.block_popunder && (
          <Script src="/js/popunder.js" strategy="afterInteractive" />
        )}

        {/* Exoclick Ad Provider Script (Loaded if any zone requires it) */}
        {(!ads.block_instant_message || !ads.block_banners || !ads.block_in_page_push) && (
          <Script src="https://a.magsrv.com/ad-provider.js" strategy="afterInteractive" />
        )}

        {/* Exoclick Floating Instant Message Chat Box Ad (Zone 6008712) */}
        {!ads.block_instant_message && (
          <>
            <ins className="eas6a97888e6" data-zoneid="6008712"></ins>
            <Script id="exoclick-instant-message" strategy="afterInteractive">
              {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
            </Script>
          </>
        )}
        {/* Exoclick Mobile-Only Sticky Footer Ad (Zone 6008718) */}
        {!ads.block_banners && (
          <div className="mobile-sticky-ad">
            <ins className="eas6a97888e10" data-zoneid="6008718"></ins>
            <Script id="exoclick-mobile-sticky" strategy="afterInteractive">
              {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
            </Script>
          </div>
        )}
        {/* Exoclick Global In-Page Push Notifications Ad (Zone 6008722) */}
        {!ads.block_in_page_push && (
          <>
            <ins className="eas6a97888e42" data-zoneid="6008722"></ins>
            <Script id="exoclick-in-page-push" strategy="afterInteractive">
              {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
            </Script>
          </>
        )}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
