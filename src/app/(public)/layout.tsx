import React from 'react';
import Header from '@/components/Header/Header';
import DesktopSidebar from '@/components/DesktopSidebar/DesktopSidebar';
import Footer from '@/components/Footer/Footer';
import AdBanner from '@/components/AdBanner/AdBanner';
import BackToTop from '@/components/BackToTop/BackToTop';
import styles from './layout.module.css';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.publicLayout}>
      <DesktopSidebar />
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <div className={styles.footerSection}>
        {/* Before Footer Sponsored Ad Banner (Zone 5986212) */}
        <AdBanner zoneId="5986212" desktopOnly />
        {/* Mobile-Only Footer Banner (Zone 5986980) */}
        <AdBanner zoneId="5986980" insClass="eas6a97888e10" mobileOnly />
        <Footer />
      </div>
      <BackToTop />
    </div>
  );
}

