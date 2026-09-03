'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const auth = useAuth();
  const profile = auth?.profile;

  const sessionStartTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef<number>(0);
  const hasAdBlocker = useRef<boolean>(false);
  const sessionId = useRef<string>('');

  const isAdminPath = pathname ? pathname.startsWith('/admin') : false;
  const isAdminUser = profile?.role === 'admin';

  // Initialize Session ID & AdBlock detection
  useEffect(() => {
    if (typeof window === 'undefined' || isAdminPath || isAdminUser) return;

    // 1. Generate or load Session ID
    let storedSessionId = sessionStorage.getItem('ph_telemetry_sid');
    if (!storedSessionId) {
      storedSessionId = 'ph_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      sessionStorage.setItem('ph_telemetry_sid', storedSessionId);
    }
    sessionId.current = storedSessionId;

    // 2. Check for AdBlocker presence using a standard bait element test
    try {
      const bait = document.createElement('div');
      bait.className = 'ad-banner adsbox eas6a97888e2 pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads';
      bait.style.position = 'absolute';
      bait.style.left = '-9999px';
      bait.style.top = '-9999px';
      bait.style.height = '1px';
      bait.style.width = '1px';
      document.body.appendChild(bait);

      setTimeout(() => {
        if (
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.offsetLeft === 0 ||
          window.getComputedStyle(bait).display === 'none' ||
          window.getComputedStyle(bait).visibility === 'hidden'
        ) {
          hasAdBlocker.current = true;
        }
        bait.remove();
        sendBeacon('pageview');
      }, 300);
    } catch (e) {
      sendBeacon('pageview');
    }
  }, [pathname]);

  // Track Scroll Depth
  useEffect(() => {
    if (typeof window === 'undefined' || isAdminPath || isAdminUser) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const scrollPercent = Math.min(Math.round((scrollTop / docHeight) * 100), 100);

      let milestone = 0;
      if (scrollPercent >= 90) milestone = 100;
      else if (scrollPercent >= 70) milestone = 75;
      else if (scrollPercent >= 45) milestone = 50;
      else if (scrollPercent >= 20) milestone = 25;

      if (milestone > maxScrollDepth.current) {
        maxScrollDepth.current = milestone;
        sendBeacon('scroll');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Periodic Heartbeat & Time On Site
  useEffect(() => {
    if (typeof window === 'undefined' || isAdminPath || isAdminUser) return;

    const interval = setInterval(() => {
      sendBeacon('heartbeat');
    }, 45000); // Heartbeat every 45s

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendBeacon('unload');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendBeacon('unload');
    };
  }, [pathname]);

  const sendBeacon = (event: string) => {
    if (typeof window === 'undefined' || !sessionId.current || isAdminPath || isAdminUser) return;

    const elapsedSeconds = Math.max(Math.round((Date.now() - sessionStartTime.current) / 1000), 1);
    const width = window.innerWidth;
    const device = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    const isWatching = pathname ? pathname.startsWith('/watch') : false;

    const payload = {
      sessionId: sessionId.current,
      route: pathname || '/',
      durationSeconds: elapsedSeconds,
      scrollDepth: maxScrollDepth.current,
      device,
      hasAdBlocker: hasAdBlocker.current,
      hasWatchedVideo: isWatching,
      event,
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/telemetry', blob);
      } else {
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  };

  return null;
}
