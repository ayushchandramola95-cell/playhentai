import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
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
    ];
  },
  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
