import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getLocalEpisodesWithSeriesHierarchy, getLocalCatalog } from '@/utils/localCatalogStore';
import { getR2Url } from '@/utils/r2';

export const revalidate = 7200;

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    // Strip XML 1.0 invalid control characters
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

const getCachedVideoSitemapEpisodes = unstable_cache(
  async () => {
    try {
      const episodes = await getLocalEpisodesWithSeriesHierarchy();
      if (episodes && episodes.length > 0) {
        return episodes;
      }
    } catch (err) {
      console.error('Error in getLocalEpisodesWithSeriesHierarchy for video sitemap:', err);
    }

    // Direct fallback using local catalog store
    try {
      const catalog = await getLocalCatalog();
      const seriesMap = new Map<string, any>();
      catalog.series.forEach((s: any) => {
        if (s.is_published !== false) {
          seriesMap.set(s.id, s);
        }
      });

      const seasonMap = new Map<string, any>();
      catalog.seasons.forEach((sn: any) => {
        if (sn.is_published !== false && seriesMap.has(sn.series_id)) {
          seasonMap.set(sn.id, {
            ...sn,
            series: seriesMap.get(sn.series_id)
          });
        }
      });

      return catalog.episodes
        .filter((ep: any) => ep.is_published !== false && seasonMap.has(ep.season_id))
        .map((ep: any) => ({
          ...ep,
          seasons: seasonMap.get(ep.season_id)
        }));
    } catch (fallbackErr) {
      console.error('Fallback in getCachedVideoSitemapEpisodes failed:', fallbackErr);
      return [];
    }
  },
  ['video-sitemap-episodes-cache-v3'],
  { revalidate: 7200, tags: ['sitemap_data', 'episodes_catalog', 'series_catalog'] }
);

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;

  let urlCount = 0;

  try {
    const episodes = await getCachedVideoSitemapEpisodes();

    if (episodes && episodes.length > 0) {
      // Filter out episodes whose parent series is not published and must have video_key
      const publishedEpisodes = episodes.filter((ep: any) => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        return seriesObj?.is_published !== false && ep.video_key && ep.video_key.trim() !== '';
      });

      for (const ep of publishedEpisodes) {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        
        const seriesTitle = seriesObj?.title || 'Series';
        const seriesSlug = seriesObj?.slug || '';
        
        // 1. Loc (Watch page URL - absolute)
        const watchSlug = seriesSlug && ep.episode_number ? `${seriesSlug}-episode-${ep.episode_number}` : ep.id;
        const watchPageUrl = `${baseUrl}/watch/${watchSlug}`;

        // 2. Thumbnail Location (must be a valid, accessible 200 OK image)
        let tempThumb = getR2Url(ep.thumbnail_key, 'thumbnail');
        if (!tempThumb || tempThumb.startsWith('data:')) {
          tempThumb = getR2Url(seriesObj?.cover_image_key || seriesObj?.poster_image_key, 'cover');
        }
        const thumbnailUrl = (!tempThumb || tempThumb.startsWith('data:'))
          ? `${baseUrl}/hero-banner.png`
          : tempThumb;

        // 3. Title (Descriptive, matching the player title, max 100 chars per Google XSD)
        const epTitleClean = ep.title?.trim();
        const isGenericEpTitle = !epTitleClean || 
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}:` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number} -` ||
          /^episode\s*\d+$/i.test(epTitleClean);
          
        const rawVideoTitle = isGenericEpTitle
          ? `${seriesTitle} Episode ${ep.episode_number}`
          : `${seriesTitle} Episode ${ep.episode_number} — ${epTitleClean.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '')}`;
        const videoTitle = rawVideoTitle.length > 100 ? `${rawVideoTitle.slice(0, 97)}...` : rawVideoTitle;

        // 4. Description (Synopsis or descriptive fallback, max 2048 chars per Google XSD)
        const rawDesc = ep.description?.trim();
        const seriesSynopsis = seriesObj?.description?.trim() || '';
        const rawVideoDescription = rawDesc && rawDesc.length >= 10
          ? rawDesc
          : seriesSynopsis
            ? `${seriesSynopsis.length > 200 ? seriesSynopsis.slice(0, 195).trim() + '...' : seriesSynopsis} Watch ${seriesTitle} Episode ${ep.episode_number} in full HD online free on Play Hentai.`
            : `Watch ${seriesTitle} Episode ${ep.episode_number} online in HD with English subtitles on Play Hentai. Free streaming anime episode with full player controls.`;
        const videoDescription = rawVideoDescription.length > 2048 ? `${rawVideoDescription.slice(0, 2045)}...` : rawVideoDescription;

        // 5. Video content MP4 URL (direct file URL)
        const videoContentUrl = getR2Url(ep.video_key, 'video');

        // Skip if there is no valid direct video content URL
        if (!videoContentUrl) continue;

        // 6. Publication Date (ISO 8601 W3C format)
        let formattedDate = new Date().toISOString();
        try {
          const pubDateStr = ep.release_date || ep.created_at;
          if (pubDateStr) {
            const parsedDate = new Date(pubDateStr);
            const year = parsedDate.getFullYear();
            if (!isNaN(parsedDate.getTime()) && year > 1990 && year < 2100) {
              formattedDate = parsedDate.toISOString();
            } else if (ep.created_at) {
              const parsedCreated = new Date(ep.created_at);
              const createdYear = parsedCreated.getFullYear();
              if (!isNaN(parsedCreated.getTime()) && createdYear > 1990 && createdYear < 2100) {
                formattedDate = parsedCreated.toISOString();
              }
            }
          }
        } catch (e) {
          console.error(`Error formatting publication date for episode ${ep.id}:`, e);
        }

        // 7. Duration seconds (Google requires positive integer, max 28800)
        const durationSeconds = Math.max(1, Math.min(28800, Math.round(ep.duration_seconds || 1440)));

        // 8. Tags (Up to 32 tags, max 32 chars each per Google specs)
        const rawTags = seriesObj?.tags;
        const tagList: string[] = Array.isArray(rawTags)
          ? rawTags
          : (typeof rawTags === 'string' ? rawTags.split(',').map((t: string) => t.trim()) : []);
        const validTags = tagList
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0 && t.length <= 32)
          .slice(0, 32);

        // Build XML strictly following Google's Video Sitemap XSD sequence:
        // 1. thumbnail_loc
        // 2. title
        // 3. description
        // 4. content_loc
        // 5. duration
        // 6. publication_date
        // 7. tag (0-32)
        // 8. category
        // 9. family_friendly
        // 10. uploader
        // 11. live
        xml += `
  <url>
    <loc>${escapeXml(watchPageUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(videoTitle)}</video:title>
      <video:description>${escapeXml(videoDescription)}</video:description>
      <video:content_loc>${escapeXml(videoContentUrl)}</video:content_loc>
      <video:duration>${durationSeconds}</video:duration>
      <video:publication_date>${formattedDate}</video:publication_date>
      ${validTags.map((t: string) => `<video:tag>${escapeXml(t)}</video:tag>`).join('\n      ')}
      <video:category>Anime &amp; Animation</video:category>
      <video:family_friendly>no</video:family_friendly>
      <video:uploader info="${escapeXml(baseUrl)}">Play Hentai</video:uploader>
      <video:live>no</video:live>
    </video:video>
  </url>`;
        urlCount++;
      }
    }
  } catch (err) {
    console.error('Error generating dynamic video sitemap XML:', err);
  }

  // Prevent serving an empty <urlset></urlset> with 200 OK which causes Google Search Console
  // "Missing XML tag: Parent tag: urlset, Tag: url" error.
  if (urlCount === 0) {
    return new NextResponse('Video sitemap is temporarily unavailable or regenerating. Please retry shortly.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Retry-After': '60'
      }
    });
  }

  xml += '\n</urlset>';

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}


