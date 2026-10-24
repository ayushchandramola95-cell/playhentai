import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { COOKIE_NAME } from '@/utils/authStore';

export async function POST() {
  try {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase signout error ignored if only local session was active
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error('Signout error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
