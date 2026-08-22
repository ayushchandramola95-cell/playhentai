import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Verify the user is authorized admin
    await verifyAdmin();

    const body = await request.json();
    const { urls } = body; // Array of relative paths, e.g. ["/", "/uncensored", "/series/deco-x-deco"]

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    const host = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : 'playhentai.live';
    const protocol = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).protocol : 'https:';
    const baseUrl = `${protocol}//${host}`;

    // Map relative paths to absolute URLs
    const urlList = urls.map(url => {
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      return `${baseUrl}${cleanUrl}`;
    });

    const payload = {
      host: host,
      key: '8f074d2b270a442e9fb05b0d6b9d62ab',
      keyLocation: `${baseUrl}/8f074d2b270a442e9fb05b0d6b9d62ab.txt`,
      urlList: urlList,
    };

    console.log('Sending IndexNow payload:', payload);

    // Call the IndexNow API
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200) {
      return NextResponse.json({ success: true, message: 'URLs submitted to IndexNow successfully!' });
    } else {
      const errorText = await response.text();
      console.error('IndexNow submission failed:', response.status, errorText);
      return NextResponse.json({ error: `IndexNow API returned status ${response.status}`, details: errorText }, { status: 502 });
    }
  } catch (err: any) {
    console.error('Error submitting to IndexNow:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
