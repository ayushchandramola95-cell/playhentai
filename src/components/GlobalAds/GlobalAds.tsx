'use client';

import React from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalAdsProps {
  adsSettings: Record<string, boolean>;
  disabledZones?: string[];
}

export default function GlobalAds({ adsSettings, disabledZones = [] }: GlobalAdsProps) {
  const pathname = usePathname();
  const auth = useAuth();
  const profile = auth?.profile;

  // Check if we are in the admin panel or logged in as an admin account
  const isAdminPath = pathname ? pathname.startsWith('/admin') : false;
  const isAdminUser = profile?.role === 'admin';

  if (isAdminPath || isAdminUser) {
    return null;
  }

  const isZoneDisabled = (zoneId: string) => disabledZones.includes(zoneId);

  return (
    <>
      {/* Exoclick Global Popunder (1 ad every 5 minutes in background) - Zone 6008702 */}
      {!adsSettings.block_popunder && !isZoneDisabled('6008702') && (
        <Script src="/js/popunder.js" strategy="afterInteractive" />
      )}

      {/* Exoclick Ad Provider Script (Loaded if any zone requires it) */}
      {(!adsSettings.block_instant_message || !adsSettings.block_banners || !adsSettings.block_in_page_push) && (
        <Script src="https://a.magsrv.com/ad-provider.js" strategy="afterInteractive" />
      )}

      {/* Exoclick Floating Instant Message Chat Box Ad (Zone 6008712) */}
      {!adsSettings.block_instant_message && !isZoneDisabled('6008712') && (
        <>
          <ins className="eas6a97888e6" data-zoneid="6008712"></ins>
          <Script id="exoclick-instant-message" strategy="afterInteractive">
            {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
          </Script>
        </>
      )}

      {/* Exoclick Mobile-Only Sticky Footer Ad (Zone 6008718) */}
      {!adsSettings.block_banners && !isZoneDisabled('6008718') && (
        <div className="mobile-sticky-ad">
          <ins className="eas6a97888e10" data-zoneid="6008718"></ins>
          <Script id="exoclick-mobile-sticky" strategy="afterInteractive">
            {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
          </Script>
        </div>
      )}

      {/* Exoclick Global In-Page Push Notifications Ad (Zone 6008722) */}
      {!adsSettings.block_in_page_push && !isZoneDisabled('6008722') && (
        <>
          <ins className="eas6a97888e42" data-zoneid="6008722"></ins>
          <Script id="exoclick-in-page-push" strategy="afterInteractive">
            {`(window.AdProvider = window.AdProvider || []).push({"serve": {}});`}
          </Script>
        </>
      )}
    </>
  );
}
