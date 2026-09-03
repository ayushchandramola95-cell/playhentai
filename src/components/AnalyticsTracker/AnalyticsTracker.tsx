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

  // Mark session permanently as developer if they visit /admin or have admin role
  useEffect(() => {
    if (typeof window !== 'undefined' && (isAdminPath || isAdminUser)) {
      sessionStorage.setItem('ph_is_developer_session', 'true');
    }
  }, [isAdminPath, isAdminUser]);

  const isDeveloperSession = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('ph_is_developer_session') === 'true' || isAdminPath || isAdminUser)
    : false;

  // Helper to accurately detect real device type using User-Agent + Touch + Screen
  const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent || navigator.vendor || '';

    // Check for Tablets first (iPad, Android Tablets)
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua);
    if (isTablet) return 'tablet';

    // Check for Mobile Phones
    const isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(ua);
    if (isMobile) return 'mobile';

    // Fallback based on touch capabilities and screen width
    if (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) {
      return window.innerWidth < 768 ? 'mobile' : 'tablet';
    }

    return 'desktop';
  };

  // Initialize Session ID & Multi-Layer AdBlock Detection
  useEffect(() => {
    if (typeof window === 'undefined' || isDeveloperSession) return;

    // 1. Generate or load Session ID in sessionStorage (persists across page jumps in same tab)
    let storedSessionId = sessionStorage.getItem('ph_telemetry_sid');
    if (!storedSessionId) {
      storedSessionId = 'ph_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      sessionStorage.setItem('ph_telemetry_sid', storedSessionId);
    }
    sessionId.current = storedSessionId;

    // 2. Dual-Layer AdBlock Detection (DOM Bait Element + Network Reachability)
    const detectAdBlock = async () => {
      let isBlocked = false;

      // Layer A: DOM Bait Element Test
      try {
        const bait = document.createElement('div');
        bait.className = 'ad-banner adsbox eas6a97888e2 pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads';
        bait.style.position = 'absolute';
        bait.style.left = '-9999px';
        bait.style.top = '-9999px';
        bait.style.height = '1px';
        bait.style.width = '1px';
        document.body.appendChild(bait);

        if (
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.offsetLeft === 0 ||
          window.getComputedStyle(bait).display === 'none' ||
          window.getComputedStyle(bait).visibility === 'hidden'
        ) {
          isBlocked = true;
        }
        bait.remove();
      } catch (e) {}

      // Layer B: Network fetch test to ad provider script
      if (!isBlocked) {
        try {
          const testFetch = await fetch('https://a.magsrv.com/ad-provider.js', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
          }).catch(() => null);

          if (!testFetch && (window as any).AdProvider === undefined) {
            isBlocked = true;
          }
        } catch (netErr) {
          isBlocked = true;
        }
      }

      hasAdBlocker.current = isBlocked;
      sendBeacon('pageview');
    };

    detectAdBlock();
  }, [pathname, isDeveloperSession]);

  // Track Scroll Depth Milestones (25%, 50%, 75%, 100%)
  useEffect(() => {
    if (typeof window === 'undefined' || isDeveloperSession) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
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
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, isDeveloperSession]);

  // Active Heartbeat & Visibility Lifecycle Handler
  useEffect(() => {
    if (typeof window === 'undefined' || isDeveloperSession) return;

    // Heartbeat every 30 seconds while tab is active
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendBeacon('heartbeat');
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendBeacon('unload');
      } else {
        sendBeacon('heartbeat');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendBeacon('unload');
    };
  }, [pathname, isDeveloperSession]);

  const sendBeacon = (event: string) => {
    if (typeof window === 'undefined' || !sessionId.current || isDeveloperSession) return;

    const elapsedSeconds = Math.max(Math.round((Date.now() - sessionStartTime.current) / 1000), 1);
    const device = getDeviceType();
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
