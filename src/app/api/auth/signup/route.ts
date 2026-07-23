import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing credentials fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      // Set or update username in the profiles table (as a fallback/confirmation of the database trigger)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username, updated_at: new Date().toISOString() })
        .eq('id', data.user.id);

      if (profileError) {
        console.warn('Profile update error (may be handled by trigger):', profileError);
        // Fallback upsert in case the trigger has a race condition or hasn't finished
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username,
            role: 'user',
            updated_at: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
