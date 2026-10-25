import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/utils/authStore';
import AdminSidebar from './AdminSidebar';
import styles from './admin.module.css';

export const metadata = {
  title: 'Admin Console | HentaiKage',
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
  // Fast local self-hosted EC2 session check (<0.02ms)
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
    // Redirect below
  }

  redirect('/login?redirectTo=/admin');
}
