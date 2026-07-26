'use client';

import React, { useEffect, useRef } from 'react';
import styles from './AdBanner.module.css';

interface AdBannerProps {
  zoneId?: string;
  className?: string;
}

export default function AdBanner({ zoneId = '5986176', className = '' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous ad nodes if re-rendered
    containerRef.current.innerHTML = '';

    // Create script element for magsrv ad-provider.js
    const scriptObj = document.createElement('script');
    scriptObj.async = true;
    scriptObj.type = 'application/javascript';
    scriptObj.src = 'https://a.magsrv.com/ad-provider.js';

    // Create ins element
    const insObj = document.createElement('ins');
    insObj.className = 'eas6a97888e2';
    insObj.setAttribute('data-zoneid', zoneId);

    // Create serve push script
    const pushScript = document.createElement('script');
    pushScript.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';

    containerRef.current.appendChild(scriptObj);
    containerRef.current.appendChild(insObj);
    containerRef.current.appendChild(pushScript);
  }, [zoneId]);

  return (
    <div className={`${styles.adContainer} ${className}`}>
      <div className={styles.adLabel}>SPONSORED ADVERTISEMENT</div>
      <div ref={containerRef} className={styles.adWrapper} />
    </div>
  );
}
