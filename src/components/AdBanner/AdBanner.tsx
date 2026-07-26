'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './AdBanner.module.css';

interface AdBannerProps {
  zoneId?: string;
  insClass?: string;
  className?: string;
}

export default function AdBanner({ zoneId = '5986176', insClass, className = '' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAdLoaded, setIsAdLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous ad nodes if re-rendered
    containerRef.current.innerHTML = '';
    setIsAdLoaded(false);

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

    // MutationObserver to detect when the ad script injects content into insObj
    const observer = new MutationObserver(() => {
      if (insObj.children.length > 0 || insObj.innerHTML.trim() !== '' || (containerRef.current && containerRef.current.offsetHeight > 20)) {
        setIsAdLoaded(true);
      }
    });

    observer.observe(insObj, { childList: true, subtree: true, attributes: true });

    // Periodic check to catch iframe or dynamic script injections
    const intervalId = setInterval(() => {
      if (insObj.children.length > 0 || insObj.innerHTML.trim() !== '' || (containerRef.current && containerRef.current.offsetHeight > 20)) {
        setIsAdLoaded(true);
        clearInterval(intervalId);
      }
    }, 500);

    containerRef.current.appendChild(scriptObj);
    containerRef.current.appendChild(insObj);
    containerRef.current.appendChild(pushScript);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [zoneId]);

  return (
    <div className={`${styles.adContainer} ${isAdLoaded ? styles.adLoaded : styles.adHidden} ${className}`}>
      {isAdLoaded && <div className={styles.adLabel}>SPONSORED ADVERTISEMENT</div>}
      <div ref={containerRef} className={styles.adWrapper} />
    </div>
  );
}
