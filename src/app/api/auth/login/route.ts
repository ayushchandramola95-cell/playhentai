import { NextResponse } from 'next/server';
import {
  findUserByEmail,
  verifyPassword,
  updateLocalUser,
  createSessionToken,
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

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
