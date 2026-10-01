'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Zap, ShieldCheck, Smartphone } from 'lucide-react';
import styles from './PwaInstallBanner.module.css';

const PlayHentaiMiniLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
    <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    // Check if dismissed within the last 7 days
    try {
      const dismissedAt = localStorage.getItem('pwa_banner_dismissed_at');
      if (dismissedAt) {
        const timeDiff = Date.now() - parseInt(dismissedAt, 10);
        if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
      }

      // Check if already in standalone PWA mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      if (isStandalone) {
        return;
      }

      // Check iOS user agent
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua);
      if (isIosDevice) {
        setIsIos(true);
      }

      setIsVisible(true);
    } catch (e) {
      setIsVisible(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosTip(true);
      setTimeout(() => setShowIosTip(false), 6000);
    } else {
      alert('To install PlayHentai as an app: Click your browser menu (⋮ or Share) and select "Install app" or "Add to Home Screen".');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
    } catch (e) {}
  };

  if (!isVisible) return null;

  return (
    <section className={styles.bannerWrapper} aria-label="Install App Banner">
      <div className={styles.bannerCard}>
        <div className={styles.leftContent}>
          <div className={styles.appIconBox}>
            <div className={styles.appIconPulse} />
            <PlayHentaiMiniLogo />
          </div>

          <div className={styles.textContent}>
            <div className={styles.badgeRow}>
              <span className={styles.pwaBadge}>Official Web App</span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={13} /> 100% Ad-Free
              </span>
            </div>

            <h3 className={styles.bannerTitle}>
              Install PlayHentai for Fast 1-Tap Streaming
            </h3>
            
            <p className={styles.bannerSubtitle}>
              Add PlayHentai to your Home Screen for instant launch, fullscreen theater mode, and zero ad redirects.
            </p>

            <div className={styles.featuresList}>
              <span className={styles.featureItem}>
                <Zap size={12} className={styles.featureIcon} /> Instant Playback
              </span>
              <span className={styles.featureItem}>
                <Smartphone size={12} className={styles.featureIcon} /> Fullscreen Mobile Mode
              </span>
              <span className={styles.featureItem}>
                <Sparkles size={12} className={styles.featureIcon} /> Uncensored 1080p HD
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actionsCol}>
          <button
            type="button"
            onClick={handleInstall}
            className={styles.installBtn}
            title="Install PlayHentai App"
          >
            <Download size={16} />
            <span>{isIos ? 'Install on iOS' : 'Add to Home Screen'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className={styles.closeBtn}
            title="Dismiss install banner"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {showIosTip && (
          <div className={styles.iosTooltip}>
            💡 Tap the <strong>Share</strong> icon in Safari, then tap <strong>&quot;Add to Home Screen&quot;</strong>.
          </div>
        )}
      </div>
    </section>
  );
}
