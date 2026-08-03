import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import AdBanner from '@/components/AdBanner/AdBanner';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', paddingTop: '74px' }}>
        {children}
      </main>
      {/* Before Footer Sponsored Ad Banner (Zone 5986212) */}
      <AdBanner zoneId="5986212" desktopOnly />
      {/* Mobile-Only Footer Banner (Zone 5986980) */}
      <AdBanner zoneId="5986980" insClass="eas6a97888e10" mobileOnly />
      <Footer />
    </>
  );
}
