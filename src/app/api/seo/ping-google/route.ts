import { NextResponse } from 'next/server';

export async function GET() {
  const sitemapUrl = 'https://playhentai.live/sitemap.xml';
  const results: Record<string, string> = {};

  try {
    // 1. Ping Google Search Console
    const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    results.google = googleRes.ok ? 'SUCCESS: Google pinged' : `STATUS: ${googleRes.status}`;
  } catch (err: any) {
    results.google = `ERROR: ${err.message}`;
  }

  try {
    // 2. Ping Bing Webmaster Tools
    const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    results.bing = bingRes.ok ? 'SUCCESS: Bing pinged' : `STATUS: ${bingRes.status}`;
  } catch (err: any) {
    results.bing = `ERROR: ${err.message}`;
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    sitemap: sitemapUrl,
    results
  });
}

export async function POST() {
  return GET();
}
