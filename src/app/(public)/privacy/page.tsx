import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Eye, Cookie, UserCheck, Server } from 'lucide-react';
import styles from './privacy.module.css';

export const metadata = {
  title: 'Privacy Policy | PlayHentai',
  description: 'Privacy Policy and data security guidelines for PlayHentai users.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <section className={styles.section}>
        <div className={styles.backWrapper}>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className={styles.header}>
          <ShieldCheck size={36} className={styles.headerIcon} />
          <h1>Privacy Policy</h1>
          <p className={styles.subtitle}>
            Learn how we handle your data, user privacy, cookies, and local session preferences.
          </p>
        </div>

        <div className={`${styles.contentCard} glass`}>
          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <Eye size={20} className={styles.blockIcon} />
              <h2>1. Anonymous Browsing & Data Collection</h2>
            </div>
            <p>
              We prioritize your privacy. You can browse our catalog, search series, and stream video content completely anonymously without registering an account. We do not track individual IP addresses or sell personal user browsing habits to third parties.
            </p>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <UserCheck size={20} className={styles.blockIcon} />
              <h2>2. Registered Accounts & Account Data</h2>
            </div>
            <p>
              If you choose to register an account on PlayHentai (playhentai.live), we store only essential credentials (such as your encrypted authentication token, username, Watchlist bookmarks, and Watch History). This data is used strictly to sync your personal streaming progress across devices.
            </p>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <Cookie size={20} className={styles.blockIcon} />
              <h2>3. Local Storage & Essential Cookies</h2>
            </div>
            <p>
              We use local browser storage and functional cookies solely to remember your UI preferences (such as light/dark mode selection, video volume level, and active session tokens). No invasive tracking pixels or cross-site advertising scripts are deployed on our site.
            </p>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <Server size={20} className={styles.blockIcon} />
              <h2>4. Security & Server Infrastructure</h2>
            </div>
            <p>
              All traffic between your browser and our edge servers is encrypted using industry-standard TLS/SSL protocols via Cloudflare. We maintain modern security practices to protect user data against unauthorized access or breaches.
            </p>
          </div>

          <div className={styles.lastUpdated}>
            <span>Last Updated: July 2026</span>
          </div>
        </div>
      </section>
    </div>
  );
}
