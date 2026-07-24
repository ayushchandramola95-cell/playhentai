import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // block admin routes and internal api endpoints from indexing
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
