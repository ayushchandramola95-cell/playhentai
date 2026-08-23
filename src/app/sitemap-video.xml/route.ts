import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getR2Url } from '@/utils/r2';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
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

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch published episodes with joined series details
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, episode_number, title, description, duration_seconds, release_date, created_at, thumbnail_key, video_key, seasons(series(title, slug, poster_image_key, cover_image_key, is_published))')
      .eq('is_published', true);

    if (episodes && episodes.length > 0) {
      // Filter out episodes whose parent series is not published
      const publishedEpisodes = episodes.filter((ep: any) => {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        return seriesObj?.is_published === true;
      });

      for (const ep of publishedEpisodes) {
        const season = Array.isArray(ep.seasons) ? ep.seasons[0] : ep.seasons;
        const seriesObj = season ? (Array.isArray(season.series) ? season.series[0] : season.series) : null;
        
        const seriesTitle = seriesObj?.title || 'Series';
        const seriesSlug = seriesObj?.slug || '';
        
        // 1. Loc (Watch page URL - absolute)
        const watchSlug = seriesSlug && ep.episode_number ? `${seriesSlug}-episode-${ep.episode_number}` : ep.id;
        const watchPageUrl = `${baseUrl}/watch/${watchSlug}`;

        // 2. Thumbnail Location
        let tempThumb = getR2Url(ep.thumbnail_key, 'thumbnail');
        if (!tempThumb || tempThumb.startsWith('data:')) {
          tempThumb = getR2Url(seriesObj?.cover_image_key || seriesObj?.poster_image_key, 'cover');
        }
        const thumbnailUrl = (!tempThumb || tempThumb.startsWith('data:'))
          ? 'https://media.playhentai.live/og-banner.jpg'
          : tempThumb;

        // 3. Title (Descriptive, matching the player title)
        const epTitleClean = ep.title?.trim();
        const isGenericEpTitle = !epTitleClean || 
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number}:` ||
          epTitleClean.toLowerCase() === `episode ${ep.episode_number} -` ||
          /^episode\s*\d+$/i.test(epTitleClean);
          
        const videoTitle = isGenericEpTitle
          ? `${seriesTitle} Episode ${ep.episode_number}`
          : `${seriesTitle} Episode ${ep.episode_number} — ${epTitleClean.replace(/^\[Preview\]\s*/i, '').replace(/^\[Trailer\]\s*/i, '')}`;

        // 4. Description (Synopsis or descriptive fallback)
        const videoDescription = ep.description || `Watch ${seriesTitle} Episode ${ep.episode_number} online in HD with English subtitles on Play Hentai.`;

        // 5. Video content MP4 URL (direct file URL)
        const videoContentUrl = ep.video_key ? getR2Url(ep.video_key, 'video') : watchPageUrl;

        // 6. Publication Date
        const pubDateStr = ep.release_date || ep.created_at || new Date().toISOString();
        const formattedDate = new Date(pubDateStr).toISOString();

        // 7. Duration seconds
        const durationSeconds = ep.duration_seconds || 1440;

        xml += `
  <url>
    <loc>${escapeXml(watchPageUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(videoTitle)}</video:title>
      <video:description>${escapeXml(videoDescription)}</video:description>
      <video:content_loc>${escapeXml(videoContentUrl)}</video:content_loc>
      <video:player_loc>${escapeXml(watchPageUrl)}</video:player_loc>
      <video:duration>${durationSeconds}</video:duration>
      <video:publication_date>${formattedDate}</video:publication_date>
      <video:family_friendly>no</video:family_friendly>
    </video:video>
  </url>`;
      }
    }
  } catch (err) {
    console.error('Error generating dynamic video sitemap XML:', err);
  }

  xml += '\n</urlset>';

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
