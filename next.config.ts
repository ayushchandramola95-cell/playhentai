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
};

export default nextConfig;
