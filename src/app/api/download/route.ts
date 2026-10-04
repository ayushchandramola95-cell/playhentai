import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');
    const rawFilename = searchParams.get('filename') || 'HentaiKage_Episode_1080p.mp4';

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing required "url" parameter for download' },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent header injection and ensure proper .mp4 extension
    let cleanFilename = rawFilename.replace(/[\r\n"';/\\]/g, '_').trim();
    if (!cleanFilename.toLowerCase().endsWith('.mp4')) {
      cleanFilename += '.mp4';
    }

    // Fetch the upstream video stream
    const upstreamRes = await fetch(videoUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'HentaiKageDownloader/1.0',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return NextResponse.json(
        { 
          error: 'Failed to retrieve media file from storage CDN',
          status: upstreamRes.status 
        },
        { status: upstreamRes.status || 502 }
      );
    }

    // Prepare response headers to force native file download
    const headers = new Headers();
    // Using application/octet-stream instructs the browser to always save as a file
    headers.set('Content-Type', 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
    );

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Allow browser caching for interrupted or repeated downloads
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(upstreamRes.body as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Video download proxy error:', err);
    return NextResponse.json(
      { error: 'Internal download proxy error', details: err?.message },
      { status: 500 }
    );
  }
}
