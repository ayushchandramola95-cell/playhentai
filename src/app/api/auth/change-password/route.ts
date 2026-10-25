import { NextResponse } from 'next/server';
import { getCurrentUserFromCookies, resetUserPassword } from '@/utils/authStore';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.banned) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to change your password.' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const success = await resetUserPassword(user.id, newPassword);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Password update error:', err);
    return NextResponse.json({ error: err.message || 'Server error updating password' }, { status: 500 });
  }
}
