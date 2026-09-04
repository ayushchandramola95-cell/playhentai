import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const host = 'playhentai.live';
  const baseUrl = `https://${host}`;
  const key = 'playhentai2026indexnowkey123';
  const keyLocation = `${baseUrl}/playhentai-indexnow-key.txt`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  const results: Record<string, any> = {};
  const urlList: string[] = [
    baseUrl,
    `${baseUrl}/categories`,
    `${baseUrl}/studios`,
    `${baseUrl}/sitemap.xml`
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: series } = await supabase
      .from('series')
      .select('slug, seasons(episodes(id, episode_number, is_published, video_key))')
      .eq('is_published', true);

    if (series && series.length > 0) {
      series.forEach((s: any) => {
        if (s.slug) {
          urlList.push(`${baseUrl}/series/${s.slug}`);
          const seasons = s.seasons || [];
          seasons.forEach((sea: any) => {
            (sea.episodes || []).forEach((ep: any) => {
              if (ep.is_published && ep.video_key) {
                const watchSlug = s.slug && ep.episode_number ? `${s.slug}-episode-${ep.episode_number}` : ep.id;
                urlList.push(`${baseUrl}/watch/${watchSlug}`);
              }
            });
          });
        }
      });
    }
  } catch (err) {
    console.error('Error fetching series & episodes for IndexNow payload:', err);
  }

  // 1. Submit via IndexNow Protocol (Bing, Yandex, Yahoo, Naver)
  try {
    const indexNowPayload = {
      host,
      key,
      keyLocation,
      urlList
    };

    const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(indexNowPayload)
    });

    results.indexNow = indexNowRes.status === 200 || indexNowRes.status === 202
      ? 'SUCCESS: IndexNow submitted (HTTP ' + indexNowRes.status + ')'
      : 'STATUS: ' + indexNowRes.status;
  } catch (err: any) {
    results.indexNow = 'ERROR: ' + err.message;
  }

  // 2. Direct Bing IndexNow Endpoint
  try {
    const bingPayload = {
      host,
      key,
      keyLocation,
      urlList
    };

    const bingRes = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(bingPayload)
    });

    results.bingIndexNow = bingRes.status === 200 || bingRes.status === 202
      ? 'SUCCESS: Bing IndexNow submitted (HTTP ' + bingRes.status + ')'
      : 'STATUS: ' + bingRes.status;
  } catch (err: any) {
    results.bingIndexNow = 'ERROR: ' + err.message;
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    sitemap: sitemapUrl,
    indexNowKey: keyLocation,
    results,
    note: 'Search engine IndexNow protocol submitted. For Google, sitemap.xml auto-syncs via Google Search Console.'
  });
}

export async function POST() {
  return GET();
}
