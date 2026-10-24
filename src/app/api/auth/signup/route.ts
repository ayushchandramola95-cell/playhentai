import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  createLocalUser,
  createSessionToken,
  findUserByEmail,
  COOKIE_NAME,
} from '@/utils/authStore';

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing credentials fields' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json({ error: 'Username must be between 3 and 30 characters.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Check if user already exists in local EC2 database
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 400 });
    }

    // 2. Create user in local EC2 user store
    const localUser = await createLocalUser({
      email: cleanEmail,
      username: cleanUsername,
      password,
      role: 'user',
    });

    // 3. Mirror to Supabase if configured (non-blocking fallback)
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';
      const redirectTo = `${siteUrl}/api/auth/callback`;
      const supabase = await createClient();
      const { data } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { username: cleanUsername },
        },
      });

      if (data?.user) {
        const adminSupabase = createAdminClient();
        await adminSupabase.from('profiles').upsert({
          id: data.user.id,
          username: cleanUsername,
          role: 'user',
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.warn('[Signup] Supabase mirroring non-fatal warning:', err.message);
    }

    // 4. Issue local EC2 session token
    const token = createSessionToken(localUser);
    const response = NextResponse.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        user_metadata: { username: localUser.username, role: localUser.role },
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
