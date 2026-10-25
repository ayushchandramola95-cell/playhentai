import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from './server';

import { getCurrentUserFromCookies } from '../authStore';

/**
 * Verifies that the current request session belongs to an administrator.
 * Checks fast local EC2 self-hosted session first (<0.02ms), falling back to Supabase.
 */
export async function verifyAdmin() {
  const localUser = await getCurrentUserFromCookies();
  if (!localUser || localUser.banned) {
    throw new Error('Unauthorized');
  }

  if (localUser.role !== 'admin') {
    throw new Error('Forbidden');
  }

  let adminClient: any = null;
  try {
    adminClient = createAdminClient();
  } catch {
    // Graceful fallback if Supabase is omitted/disabled
  }

  return {
    supabase: adminClient,
    user: {
      id: localUser.id,
      email: localUser.email,
      user_metadata: { username: localUser.username, role: localUser.role },
      role: localUser.role,
    } as any,
  };
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
