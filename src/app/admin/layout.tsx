import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminSidebar from './AdminSidebar';
import styles from './admin.module.css';

export const metadata = {
  title: 'Admin Console | HentaiKage',
  robots: {
    index: false,
    follow: false,
  },
};

import { getCurrentUserFromCookies } from '@/utils/authStore';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Fast local self-hosted EC2 session check (<0.02ms)
  try {
    const localUser = await getCurrentUserFromCookies();
    if (localUser && localUser.role === 'admin' && !localUser.banned) {
      const username = localUser.username || localUser.email.split('@')[0] || 'Admin';
      return (
        <div className={styles.adminLayout}>
          <AdminSidebar username={username} />
          <main className={styles.mainContent}>
            <div className={styles.contentBody}>
              {children}
            </div>
          </main>
        </div>
      );
    }
  } catch (err) {
    // Proceed to Supabase fallback
  }

  // 2. Fallback to Supabase authentication
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?redirectTo=/admin');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    console.warn(`Unauthorized access attempt to admin panel by user ${user.id}`);
    redirect('/');
  }

  const username = profile?.username || user.email?.split('@')[0] || 'Admin';

  return (
    <div className={styles.adminLayout}>
      {/* Admin Sidebar Component */}
      <AdminSidebar username={username} />

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <div className={styles.contentBody}>
          {children}
        </div>
      </main>
    </div>
  );
}
