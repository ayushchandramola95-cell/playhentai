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
    default: "PlayHentai - Watch High Quality Uncensored Anime Online",
    template: "%s | PlayHentai"
  },
  description: "Watch high-definition uncensored anime series and episodes online for free. Explore curated categories, daily episode updates, and fast streaming on PlayHentai.",
  keywords: ["anime", "playhentai", "playhentai.live", "uncensored anime", "watch anime online", "anime streaming", "hd anime"],
  authors: [{ name: "PlayHentai Team" }],
  creator: "PlayHentai",
  publisher: "PlayHentai",
  openGraph: {
    title: "PlayHentai - Premium Video Streaming",
    description: "Watch high-definition uncensored anime series and episodes online for free.",
    url: "/",
    siteName: "PlayHentai",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayHentai - Premium Video Streaming",
    description: "Watch high-definition uncensored anime series and episodes online for free.",
  },
  alternates: {
    canonical: './',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
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
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
