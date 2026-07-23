import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
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
