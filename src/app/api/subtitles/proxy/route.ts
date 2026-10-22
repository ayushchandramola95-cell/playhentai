import { NextResponse } from 'next/server';
import { normalizeSubtitlesToVtt } from '@/utils/subtitleParser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subtitles/proxy?url=<encoded-url>
 * Fetches subtitle files (.ass / .ssa / .vtt / .srt) server-side and returns standard WebVTT
 * with full CORS headers, preventing cross-origin browser blocking.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing "url" parameter.' }, { status: 400 });
    }

    const decodedUrl = decodeURIComponent(targetUrl);

    // CloudFront dmfrlqgigpmty.cloudfront.net returns 403 Forbidden for subtitles.
    // Automatically route to confirmed working media host media.hentaikage.cc
    let fetchUrl = decodedUrl;
    if (fetchUrl.includes('dmfrlqgigpmty.cloudfront.net')) {
      fetchUrl = fetchUrl.replace('dmfrlqgigpmty.cloudfront.net', 'media.hentaikage.cc');
    }

    let res = await fetch(fetchUrl, {
      headers: {
        'Accept': 'text/vtt, text/plain, */*',
      },
    });

    // If initial upstream failed, attempt fallback to media.hentaikage.cc
    if (!res.ok && !fetchUrl.includes('media.hentaikage.cc')) {
      try {
        const parsed = new URL(fetchUrl);
        const fallbackUrl = `https://media.hentaikage.cc${parsed.pathname}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { 'Accept': 'text/vtt, text/plain, */*' },
        });
        if (fallbackRes.ok) {
          res = fallbackRes;
          fetchUrl = fallbackUrl;
        }
      } catch {}
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned status ${res.status}` },
        { status: res.status }
      );
    }

    const rawText = await res.text();

    // Auto-normalize any format (ASS/SSA, SRT, VTT) to standard WebVTT
    const vttContent = normalizeSubtitlesToVtt(rawText, decodedUrl);

    return new NextResponse(vttContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: any) {
    console.error('[SubtitleProxy] Error proxying subtitle:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subtitle content.' },
      { status: 500 }
    );
  }
}
