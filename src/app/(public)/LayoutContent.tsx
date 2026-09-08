'use client';

import React from 'react';
import Header from '@/components/Header/Header';
import DesktopSidebar from '@/components/DesktopSidebar/DesktopSidebar';
import Footer from '@/components/Footer/Footer';
import BackToTop from '@/components/BackToTop/BackToTop';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './layout.module.css';

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded } = useSidebar();

  return (
    <div className={`${styles.publicLayout} ${isExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed}`}>
      <DesktopSidebar />
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <div className={styles.footerSection}>
        <Footer />
      </div>
      <BackToTop />
    </div>
  );
}

