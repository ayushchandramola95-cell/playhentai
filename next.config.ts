import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
    ];
  },
};

export default nextConfig;
