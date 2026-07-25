import { NextResponse } from 'next/server';

export async function GET() {
  const host = 'playhentai.live';
  const key = 'playhentai2026indexnowkey123';
  const keyLocation = 'https://playhentai.live/playhentai-indexnow-key.txt';
  const sitemapUrl = 'https://playhentai.live/sitemap.xml';

  const results: Record<string, any> = {};

  // 1. Submit via IndexNow Protocol (Bing, Yandex, Yahoo, Naver)
  try {
    const indexNowPayload = {
      host,
      key,
      keyLocation,
      urlList: [
        'https://playhentai.live',
        'https://playhentai.live/categories',
        'https://playhentai.live/sitemap.xml'
      ]
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
      urlList: ['https://playhentai.live/sitemap.xml']
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
