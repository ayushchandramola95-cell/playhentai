import { NextResponse } from 'next/server';
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

    // 3. Issue local EC2 session token
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
