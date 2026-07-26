import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin || 'https://playhentai.live';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
    console.error('Email callback session exchange error:', error);
  }

  return NextResponse.redirect(`${siteUrl}/login?error=Invalid%20or%20expired%20confirmation%20link`);
}
