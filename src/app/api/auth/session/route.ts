import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUserFromCookies } from '@/utils/authStore';

export async function GET() {
  try {
    // 1. Check fast local EC2 session first (<0.02ms)
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

    // 2. Fallback to Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ user: null, profile: null });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('Profile fetch error for user:', user.id, profileError.message);
    }

    return NextResponse.json({
      user,
      profile: profileError ? null : profile,
    });
  } catch (err: any) {
    console.error('Session API error:', err);
    return NextResponse.json({ user: null, profile: null });
  }
}
