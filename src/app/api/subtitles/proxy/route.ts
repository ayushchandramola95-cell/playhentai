import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subtitles/proxy?url=<encoded-url>
 * Fetches subtitle files (.vtt / .srt) server-side and returns standard WebVTT
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
    const res = await fetch(decodedUrl, {
      headers: {
        'Accept': 'text/vtt, text/plain, */*',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned status ${res.status}` },
        { status: res.status }
      );
    }

    const rawText = await res.text();

    // Auto-convert SRT to standard WebVTT if needed
    let vttContent = rawText;
    if (!vttContent.trim().startsWith('WEBVTT')) {
      vttContent = 'WEBVTT\n\n' + vttContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    }

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
