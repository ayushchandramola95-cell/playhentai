import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';
    const redirectTo = `${siteUrl}/api/auth/callback`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          username: cleanUsername,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      // Use admin client with service role key to guarantee profile row creation without RLS roadblocks
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: cleanUsername,
            role: 'user',
            updated_at: new Date().toISOString(),
          });
      } catch (profileErr) {
        console.warn('Profile initialization via admin client:', profileErr);
      }
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
