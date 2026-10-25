import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/utils/authStore';

export async function GET() {
  try {
    // Fast local EC2 session check (<0.02ms)
    const localUser = await getCurrentUserFromCookies();
    if (localUser && !localUser.banned) {
      return NextResponse.json({
        user: {
          id: localUser.id,
          email: localUser.email,
          user_metadata: {
            username: localUser.username,
            role: localUser.role,
          },
        },
        profile: {
          id: localUser.id,
          username: localUser.username,
          role: localUser.role,
          updated_at: localUser.updatedAt,
        },
      });
    }

    return NextResponse.json({ user: null, profile: null });
  } catch (err: any) {
    console.error('Session API error:', err);
    return NextResponse.json({ user: null, profile: null });
  }
}
