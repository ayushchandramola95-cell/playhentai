'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './NavigationProgressBar.module.css';

function NavigationProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevUrlRef = useRef<string>('');

  // Start progress bar animation
  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setIsVisible(true);
    setProgress(20);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          return prev;
        }
        // Smooth asymptotic trickling
        const step = Math.max(1, (90 - prev) * 0.15);
        return Math.min(88, prev + step);
      });
    }, 200);

    // Safety timeout: auto-hide after 10s if route never completed
    safetyTimeoutRef.current = setTimeout(() => {
      completeProgress();
    }, 10000);
  };

  // Complete progress bar animation
  const completeProgress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    setProgress(100);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 250);
    }, 250);
  };

  // Listen to route changes (completion)
  useEffect(() => {
    const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;

    if (prevUrlRef.current && prevUrlRef.current !== currentUrl) {
      completeProgress();
    }

    prevUrlRef.current = currentUrl;
  }, [pathname, searchParams]);

  // Global document click listener for instant start on click (0ms response)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only proceed for primary mouse clicks
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a');
      if (!anchor) return;

      // Check if it has an href
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore external, target blank, downloads, or hash-only links
      if (
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return;
      }

      // Ensure internal URL
      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin !== window.location.origin) {
          return;
        }

        // Ignore same exact URL and hash-only changes
        const currentUrl = new URL(window.location.href);
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        // Legitimate internal navigation initiated -> Start instant progress!
        startProgress();
      } catch {
        // Fallback ignore invalid URLs
      }
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) {
    return null;
  }

  return (
    <>
      <div
        className={styles.barContainer}
        style={{
          opacity: isVisible ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div
          className={styles.bar}
          style={{
            width: `${progress}%`,
          }}
        >
          <div className={styles.peg} />
        </div>
      </div>

      <div
        className={styles.spinnerContainer}
        style={{
          opacity: isVisible ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div className={styles.spinner} />
      </div>
    </>
  );
}

export default function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarContent />
    </Suspense>
  );
}
