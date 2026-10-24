import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  findUserByEmail,
  verifyPassword,
  updateLocalUser,
  createSessionToken,
  createLocalUser,
  COOKIE_NAME,
} from '@/utils/authStore';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fast path: Authenticate against local EC2 self-hosted user database (<0.5ms)
    const localUser = await findUserByEmail(cleanEmail);
    if (localUser) {
      if (localUser.banned) {
        return NextResponse.json({ error: 'This account has been suspended.' }, { status: 403 });
      }

      const isValid = verifyPassword(password, localUser.salt, localUser.passwordHash);
      if (isValid) {
        await updateLocalUser(localUser.id, { lastLoginAt: new Date().toISOString() });
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
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;
      }
    }

    // 2. Fallback path: Authenticate with Supabase master
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Invalid email or password' }, { status: 400 });
    }

    // 3. Transparent Migration: If authenticated via Supabase, import user into local EC2 database
    let profileRole: 'admin' | 'user' = 'user';
    let profileUsername = cleanEmail.split('@')[0];
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, username')
        .eq('id', data.user.id)
        .single();
      if (profile) {
        if (profile.role === 'admin') profileRole = 'admin';
        if (profile.username) profileUsername = profile.username;
      }
    } catch {
      // Ignore profile fetch failure
    }

    let syncedUser = localUser;
    if (!syncedUser) {
      syncedUser = await createLocalUser({
        email: cleanEmail,
        username: profileUsername,
        password,
        role: profileRole,
      });
    }

    const token = createSessionToken(syncedUser);
    const response = NextResponse.json({ success: true, user: data.user });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
