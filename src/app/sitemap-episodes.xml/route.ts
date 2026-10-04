import { NextResponse } from 'next/server';
import { getStrictPublishedCatalogData, getSiteBaseUrl, escapeXml, formatW3cDate } from '@/utils/sitemapShared';
import { getR2Url } from '@/utils/r2';

export const revalidate = 7200;

export async function GET() {
  const baseUrl = getSiteBaseUrl();
  const { publishedEpisodes } = await getStrictPublishedCatalogData();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  for (const ep of publishedEpisodes) {
    const watchUrl = `${baseUrl}/watch/${ep.watchSlug}`;
    const lastMod = formatW3cDate(ep.release_date || ep.created_at);

    const imageKey = ep.thumbnail_key || ep.coverImageKey;
    let imageXml = '';
    if (imageKey) {
      const fullImgUrl = getR2Url(imageKey, 'thumbnail');
      if (fullImgUrl && !fullImgUrl.startsWith('data:')) {
        const epLabel = ep.episode_number ? `Episode ${ep.episode_number}` : 'Episode';
        const imgTitle = `${ep.seriesTitle} ${epLabel}`;
        imageXml = `
    <image:image>
      <image:loc>${escapeXml(fullImgUrl)}</image:loc>
      <image:title>${escapeXml(imgTitle)}</image:title>
    </image:image>`;
      }
    }

    xml += `
  <url>
    <loc>${escapeXml(watchUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>${imageXml}
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
