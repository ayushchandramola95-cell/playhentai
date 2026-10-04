import { NextResponse } from 'next/server';
import { getStrictPublishedCatalogData, getSiteBaseUrl, escapeXml } from '@/utils/sitemapShared';
import { STUDIOS_METADATA } from '@/utils/studiosData';
import { tagToSlug } from '@/utils/constants';

export const revalidate = 7200;

export async function GET() {
  const baseUrl = getSiteBaseUrl();
  const now = new Date().toISOString();
  const { distinctTags, distinctYears, distinctUncensoredYears, publishedPlaylists } =
    await getStrictPublishedCatalogData();

  const standardGenres = [
    'action', 'sci-fi', 'fantasy', 'adventure', 'drama', 'mystery',
    'romance', 'comedy', 'supernatural', 'slice-of-life', 'harem',
    'ecchi', 'hentai', 'uncensored', '3d', 'cgi',
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const addUrl = (path: string, priority: string, changefreq: string = 'weekly') => {
    xml += `
  <url>
    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  };

  // 1. Dedicated Category & Genre Hubs
  standardGenres.forEach((g) => {
    addUrl(`/categories/${g}`, '0.8', 'weekly');
    addUrl(`/genres/${g}`, '0.85', 'weekly');
  });

  // 2. High-Traffic Genre Subfilters
  const subfilterGenres = [
    'action', 'fantasy', 'romance', 'sci-fi', 'drama', 'comedy',
    'supernatural', 'harem', 'ecchi', 'adventure', 'uncensored', '3d',
  ];
  const recentYears = distinctYears.filter((y) => y >= 2020);

  subfilterGenres.forEach((g) => {
    addUrl(`/genres/${g}/completed`, '0.8', 'weekly');
    addUrl(`/genres/${g}/ongoing`, '0.8', 'weekly');
    if (g !== 'uncensored') {
      addUrl(`/genres/${g}/uncensored`, '0.8', 'weekly');
    }
    recentYears.slice(0, 6).forEach((y) => {
      addUrl(`/genres/${g}/${y}`, '0.75', 'weekly');
    });
  });

  // 3. Studio Landing Pages
  STUDIOS_METADATA.forEach((studio) => {
    const slug = (studio as any).slug || studio.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addUrl(`/studios/${slug}`, '0.75', 'monthly');
    ['completed', 'ongoing', 'uncensored'].forEach((status) => {
      addUrl(`/studios/${slug}/${status}`, '0.7', 'weekly');
    });
  });

  // 4. Release Year Hubs (ONLY from published series)
  distinctYears.forEach((y) => {
    addUrl(`/year/${y}`, '0.8', 'weekly');
  });
  distinctUncensoredYears.forEach((y) => {
    addUrl(`/uncensored/${y}`, '0.85', 'weekly');
  });

  // 5. Distinct Tags (ONLY from published series)
  const categorySlugs = new Set(standardGenres.map((g) => tagToSlug(g)));
  distinctTags
    .filter((t) => !categorySlugs.has(tagToSlug(t)))
    .forEach((t) => {
      addUrl(`/tag/${tagToSlug(t)}`, '0.8', 'weekly');
    });

  // 6. Curated Playlists (ONLY published playlists)
  publishedPlaylists.forEach((pl) => {
    addUrl(`/playlists/${pl.slug}`, '0.75', 'weekly');
  });

  xml += '\n</urlset>';

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400',
    },
  });
}
