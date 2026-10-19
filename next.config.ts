import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hentaikage.cc",
      },
      {
        protocol: "https",
        hostname: "*.hentaikage.cc",
      },
      {
        protocol: "https",
        hostname: "media.playhentai.live",
      },
      {
        protocol: "https",
        hostname: "*.playhentai.live",
      },
      {
        protocol: "https",
        hostname: "playhentai.live",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "dmfrlqgigpmty.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "mock-r2.streamnexus.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/(favicon.ico|icon.png|icon.svg|apple-icon.png|og-banner.png|hero-banner.png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)\\.(mp4|webm|m4s|ts|m3u8)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/8f074d2b270a442e9fb05b0d6b9d62ab.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.hentaikage.cc',
          },
        ],
        destination: 'https://hentaikage.cc/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'playhentai.live',
          },
        ],
        destination: 'https://hentaikage.cc/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.playhentai.live',
          },
        ],
        destination: 'https://hentaikage.cc/:path*',
        permanent: true,
      },
      {
        source: '/video-sitemap.xml',
        destination: '/sitemap-video.xml',
        permanent: true,
      },
      {
        source: '/recent',
        destination: '/recent/series',
        permanent: true,
      },
      {
        source: '/status/upcoming',
        destination: '/upcoming',
        permanent: true,
      },
      {
        source: '/status/ongoing',
        destination: '/ongoing',
        permanent: true,
      },
      {
        source: '/status/completed',
        destination: '/completed',
        permanent: true,
      },
      {
        source: '/status/:path*',
        destination: '/categories',
        permanent: true,
      },
      {
        source: '/collections',
        destination: '/playlists',
        permanent: true,
      },
      {
        source: '/collections/:path*',
        destination: '/playlists/:path*',
        permanent: true,
      },
      {
        source: '/genre',
        destination: '/genres',
        permanent: true,
      },
      {
        source: '/genre/:path*',
        destination: '/categories/:path*',
        permanent: true,
      },
      {
        source: '/series',
        destination: '/categories',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
