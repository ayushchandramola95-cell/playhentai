import { NextResponse } from 'next/server';
import { getStrictPublishedCatalogData, getSiteBaseUrl, escapeXml, formatW3cDate } from '@/utils/sitemapShared';
import { getR2Url } from '@/utils/r2';

export const revalidate = 7200;

export async function GET() {
  const baseUrl = getSiteBaseUrl();
  const { publishedSeries } = await getStrictPublishedCatalogData();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  for (const s of publishedSeries) {
    const pageUrl = `${baseUrl}/series/${s.slug}`;
    const lastMod = formatW3cDate(s.created_at);

    const imageKey = s.poster_image_key || s.cover_image_key;
    let imageXml = '';
    if (imageKey) {
      const fullImgUrl = getR2Url(imageKey, 'poster');
      if (fullImgUrl && !fullImgUrl.startsWith('data:')) {
        imageXml = `
    <image:image>
      <image:loc>${escapeXml(fullImgUrl)}</image:loc>
      <image:title>${escapeXml(s.title)}</image:title>
    </image:image>`;
      }
    }

    xml += `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${imageXml}
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
