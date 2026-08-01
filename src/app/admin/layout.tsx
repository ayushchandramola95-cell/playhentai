import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminSidebar from './AdminSidebar';
import styles from './admin.module.css';

export const metadata = {
  title: 'Admin Console | PlayHentai',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // 1. Get authenticated user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?redirectTo=/admin');
  }

  // 2. Fetch custom user profile role
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
        <div className="ambient-glow" />
        <div className={styles.pageHeader}>
          <span className={styles.breadcrumb}>Console / Admin</span>
          <div className={styles.statusBadge}>Secure Session</div>
        </div>
        <div className={styles.contentBody}>
          {children}
        </div>
      </main>
    </div>
  );
}
