import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getR2Url } from '@/utils/r2';
import { getEpisodeWatchUrl } from '@/utils/episodeUrl';
import { MOCK_SERIES, MOCK_EPISODES } from '@/utils/mockData';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '')
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
}

function formatRfc822Date(dateStr?: string | null): string {
  if (!dateStr) return new Date().toUTCString();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toUTCString();
  } catch {}
  return new Date().toUTCString();
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  const nowUtc = new Date().toUTCString();

  let itemsXml = '';

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Fetch up to 50 latest published episodes with joined series data
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, episode_number, title, description, duration_seconds, release_date, created_at, thumbnail_key, video_key, seasons(series(title, slug, poster_image_key, cover_image_key, is_published, tags))')
      .eq('is_published', true)
      .order('release_date', { ascending: false })
      .limit(50);

    if (episodes && episodes.length > 0) {
      const published = episodes.filter((ep: any) => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        return seriesObj?.is_published === true;
      });

      for (const ep of published) {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;

        const seriesTitle = seriesObj?.title || 'Series';
        const seriesSlug = seriesObj?.slug || '';
        const watchUrl = `${baseUrl}${getEpisodeWatchUrl(ep.id, ep.episode_number, seriesSlug)}`;

        const epTitleClean = ep.title?.trim();
        const isGenericEpTitle = !epTitleClean || 
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}:` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number} -` ||
          /^episode\s*\d+$/i.test(epTitleClean);
          
        const itemTitle = isGenericEpTitle
          ? `${seriesTitle} Episode ${ep.episode_number}`
          : `${seriesTitle} Episode ${ep.episode_number} — ${epTitleClean.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '')}`;

        const rawDesc = ep.description?.trim();
        const itemDesc = rawDesc && rawDesc.length >= 10
          ? rawDesc
          : `Watch ${seriesTitle} Episode ${ep.episode_number} online in HD with English subtitles on Play Hentai. Free streaming anime episode with full player controls.`;

        let tempThumb = getR2Url(ep.thumbnail_key, 'thumbnail');
        if (!tempThumb || tempThumb.startsWith('data:')) {
          tempThumb = getR2Url(seriesObj?.cover_image_key || seriesObj?.poster_image_key, 'cover');
        }
        const thumbUrl = (!tempThumb || tempThumb.startsWith('data:'))
          ? `${baseUrl}/hero-banner.png`
          : tempThumb;

        const pubDate = formatRfc822Date(ep.release_date || ep.created_at);

        const categoryTag = (Array.isArray(seriesObj?.tags) && seriesObj.tags.length > 0)
          ? `<category>${escapeXml(seriesObj.tags[0])}</category>`
          : '<category>Anime</category>';

        itemsXml += `
    <item>
      <title>${escapeXml(itemTitle)}</title>
      <link>${escapeXml(watchUrl)}</link>
      <guid isPermaLink="true">${escapeXml(watchUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${itemDesc}]]></description>
      ${categoryTag}
      <media:thumbnail url="${escapeXml(thumbUrl)}" />
    </item>`;
      }
    }
  } catch (err) {
    console.error('Error querying episodes for RSS feed:', err);
  }

  // Fallback to mock data if empty
  if (!itemsXml) {
    for (const ep of MOCK_EPISODES.slice(0, 10)) {
      const series = MOCK_SERIES.find(s => s.slug === ep.showSlug);
      const seriesTitle = series ? series.title : 'Anime Series';
      const watchUrl = `${baseUrl}/watch/${ep.id}`;
      const thumbUrl = ep.thumbnail ? getR2Url(ep.thumbnail, 'thumbnail') : `${baseUrl}/hero-banner.png`;

      itemsXml += `
    <item>
      <title>${escapeXml(`${seriesTitle} - ${ep.title}`)}</title>
      <link>${escapeXml(watchUrl)}</link>
      <guid isPermaLink="true">${escapeXml(watchUrl)}</guid>
      <pubDate>${nowUtc}</pubDate>
      <description><![CDATA[Watch ${escapeXml(seriesTitle)} online in HD on Play Hentai. Free anime streaming.]]></description>
      <category>Anime</category>
      <media:thumbnail url="${escapeXml(thumbUrl)}" />
    </item>`;
    }
  }

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Play Hentai — Latest Anime Episodes &amp; Series</title>
    <link>${baseUrl}</link>
    <description>Watch the latest hentai anime series and episodes online in HD on Play Hentai. Free streaming with English subtitles and full player controls.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/icon-512x512.png</url>
      <title>Play Hentai</title>
      <link>${baseUrl}</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(feedXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
