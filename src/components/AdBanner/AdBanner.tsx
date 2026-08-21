'use client';

import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    // Check if banners are globally blocked
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.ads_block_banners) {
          setIsBlocked(true);
        }
      })
      .catch(err => console.warn('Ad blocker settings load failed:', err));
  }, []);

  useEffect(() => {
    if (isBlocked || !containerRef.current) return;

    // Clear previous ad nodes if re-rendered
    containerRef.current.innerHTML = '';

    // Create script element for magsrv ad-provider.js
    const scriptObj = document.createElement('script');
    scriptObj.async = true;
    scriptObj.type = 'application/javascript';
    scriptObj.src = 'https://a.magsrv.com/ad-provider.js';

    // Create ins element
    const insObj = document.createElement('ins');
    insObj.className = insClass || 'eas6a97888e2';
    insObj.setAttribute('data-zoneid', zoneId);

    // Create serve push script
    const pushScript = document.createElement('script');
    pushScript.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';

    containerRef.current.appendChild(scriptObj);
    containerRef.current.appendChild(insObj);
    containerRef.current.appendChild(pushScript);
  }, [zoneId, insClass, isBlocked]);

  if (isBlocked) {
    return null; // Do not render anything at all if banners are hidden
  }

  return (
    <div className={`${styles.adContainer} ${mobileOnly ? styles.mobileOnly : ''} ${desktopOnly ? styles.desktopOnly : ''} ${className}`}>
      <div className={styles.adLabel}>SPONSORED ADVERTISEMENT</div>
      <div ref={containerRef} className={styles.adWrapper} />
    </div>
  );
}
