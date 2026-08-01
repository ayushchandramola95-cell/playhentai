import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/watchlist/', '/history/', '/favorites/', '/settings/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
