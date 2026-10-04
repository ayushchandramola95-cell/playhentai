import { NextResponse } from 'next/server';
import { getSiteBaseUrl } from '@/utils/sitemapShared';

export const revalidate = 7200;

export async function GET() {
  const baseUrl = getSiteBaseUrl();
  const now = new Date().toISOString();

  const staticRoutes = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/categories', priority: '0.85', changefreq: 'weekly' },
    { path: '/genres', priority: '0.85', changefreq: 'weekly' },
    { path: '/uncensored', priority: '0.9', changefreq: 'daily' },
    { path: '/3d', priority: '0.9', changefreq: 'daily' },
    { path: '/trending', priority: '0.9', changefreq: 'daily' },
    { path: '/ongoing', priority: '0.9', changefreq: 'daily' },
    { path: '/upcoming', priority: '0.9', changefreq: 'daily' },
    { path: '/completed', priority: '0.8', changefreq: 'weekly' },
    { path: '/recent/series', priority: '0.8', changefreq: 'daily' },
    { path: '/recent/episodes', priority: '0.8', changefreq: 'daily' },
    { path: '/playlists', priority: '0.8', changefreq: 'weekly' },
    { path: '/studios', priority: '0.8', changefreq: 'weekly' },
    { path: '/random', priority: '0.7', changefreq: 'weekly' },
    { path: '/faq', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/dmca', priority: '0.5', changefreq: 'monthly' },
    { path: '/content-removal', priority: '0.5', changefreq: 'monthly' },
    { path: '/2257', priority: '0.5', changefreq: 'monthly' },
    { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const route of staticRoutes) {
    xml += `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  }

  xml += '\n</urlset>';

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400',
    },
  });
}
