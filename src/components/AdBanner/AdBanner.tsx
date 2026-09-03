'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AdBanner.module.css';

interface AdBannerProps {
  zoneId?: string;
  insClass?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  className?: string;
}

export default function AdBanner({ zoneId = '5986176', insClass, mobileOnly = false, desktopOnly = false, className = '' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const pathname = usePathname();
  const auth = useAuth();
  const profile = auth?.profile;

  const isAdminPath = pathname ? pathname.startsWith('/admin') : false;
  const isAdminUser = profile?.role === 'admin';

  useEffect(() => {
    // Check if banners are globally blocked or this specific zone is disabled
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ads_block_banners) {
          setIsBlocked(true);
        } else if (data.disabled_zones && Array.isArray(data.disabled_zones) && data.disabled_zones.includes(zoneId)) {
          setIsBlocked(true);
        }
      })
      .catch(err => console.warn('Ad blocker settings load failed:', err));
  }, [zoneId]);

  useEffect(() => {
    if (isBlocked || !containerRef.current) return;

    // Clear previous ad nodes if re-rendered
    containerRef.current.innerHTML = '';

    // Ensure magsrv ad-provider.js is loaded exactly once in document.head
    const scriptSrc = 'https://a.magsrv.com/ad-provider.js';
    let scriptObj = document.querySelector(`script[src="${scriptSrc}"]`);
    if (!scriptObj) {
      scriptObj = document.createElement('script');
      scriptObj.setAttribute('src', scriptSrc);
      scriptObj.setAttribute('type', 'application/javascript');
      scriptObj.setAttribute('async', 'true');
      document.head.appendChild(scriptObj);
    }

    // Create ins element
    const insObj = document.createElement('ins');
    insObj.className = insClass || 'eas6a97888e2';
    insObj.setAttribute('data-zoneid', zoneId);
    containerRef.current.appendChild(insObj);

    // Push to AdProvider to render this newly added zone
    try {
      const w = window as any;
      w.AdProvider = w.AdProvider || [];
      w.AdProvider.push({ serve: {} });
    } catch (e) {
      console.warn('AdProvider push failed:', e);
    }
  }, [zoneId, insClass, isBlocked]);

  if (isBlocked || isAdminPath || isAdminUser) {
    return null; // Do not render anything at all if banners are hidden or user/path is admin
  }

  return (
    <div className={`${styles.adContainer} ${mobileOnly ? styles.mobileOnly : ''} ${desktopOnly ? styles.desktopOnly : ''} ${className}`}>
      <div className={styles.adLabel}>SPONSORED ADVERTISEMENT</div>
      <div ref={containerRef} className={styles.adWrapper} />
    </div>
  );
}
