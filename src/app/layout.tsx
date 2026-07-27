import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'),
  title: {
    default: "PlayHentai - Watch Uncensored Hentai Anime Online in HD",
    template: "%s | PlayHentai"
  },
  description: "Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular uncensored titles on PlayHentai.",
  keywords: [
    "hentai",
    "hentai anime",
    "watch hentai",
    "uncensored hentai",
    "free hentai online",
    "hd hentai streaming",
    "playhentai",
    "playhentai.live",
    "anime hentai streaming",
    "hentai videos",
    "watch hentai online",
    "uncensored hentai anime",
    "uncensored hentai streaming",
    "watch uncensored hentai online",
    "english subbed hentai",
    "english dubbed hentai",
    "hentai english subtitles",
    "hentai dub online",
    "1080p hentai stream",
    "full hd hentai",
    "watch hentai episodes",
    "hentai series online",
    "recent hentai releases",
    "free uncensored hentai",
    "hentai streaming vids",
    "popular hentai shows"
  ],
  authors: [{ name: "PlayHentai Team" }],
  creator: "PlayHentai",
  publisher: "PlayHentai",
  openGraph: {
    title: "PlayHentai - Watch Uncensored Hentai Anime Online in HD",
    description: "Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular uncensored titles.",
    url: "https://playhentai.live",
    siteName: "PlayHentai",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayHentai - Watch Uncensored Hentai Anime Online in HD",
    description: "Stream high quality uncensored hentai anime series online for free.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PlayHentai',
    url: 'https://playhentai.live',
    description: 'Stream high quality uncensored hentai anime series online for free. Watch full HD episodes, trending playlists, and popular uncensored titles.',
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
