import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/utils/authStore';

export async function POST() {
  try {
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
