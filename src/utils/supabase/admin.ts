import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from './server';

import { getCurrentUserFromCookies } from '../authStore';

/**
 * Verifies that the current request session belongs to an administrator.
 * Checks fast local EC2 self-hosted session first (<0.02ms), falling back to Supabase.
 */
export async function verifyAdmin() {
  // 1. Fast local self-hosted EC2 auth check
  try {
    const localUser = await getCurrentUserFromCookies();
    if (localUser && localUser.role === 'admin' && !localUser.banned) {
      const supabase = await createClient();
      return {
        supabase,
        user: {
          id: localUser.id,
          email: localUser.email,
          user_metadata: { username: localUser.username, role: localUser.role },
          role: localUser.role,
        } as any,
      };
    }
  } catch (err) {
    // Continue to Supabase fallback
  }

  // 2. Fallback to Supabase
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Forbidden');
  }

  return { supabase, user };
}

/**
 * Creates a Supabase client with administrative privileges (service role key),
 * bypassing Row Level Security (RLS).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key in environment variables.');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
