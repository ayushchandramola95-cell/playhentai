import React from 'react';
import Link from 'next/link';
import { Tv, MessageCircle } from 'lucide-react';
import styles from './Footer.module.css';

const FooterLogoIcon = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#eab308" stroke="#eab308" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandColumn}>
          <Link href="/" className={styles.logoContainer}>
            <FooterLogoIcon />
            <span style={{ fontFamily: 'Inter, sans-serif', fontStyle: 'italic', textTransform: 'uppercase' }}>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>PLAY</span>
              <span style={{ fontWeight: 900, color: '#eab308', marginLeft: '2px' }}>HENTAI</span>
            </span>
          </Link>
          <p className={styles.description}>
            Experience ultra-smooth high-definition uncensored video streaming. Bookmark favorites, track your watch progress, and stream with zero limits.
          </p>
          <div className={styles.socials}>
            <a href="#" className={styles.socialLink} aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a href="#" className={styles.socialLink} aria-label="Discord">
              <MessageCircle size={18} />
            </a>
            <a href="#" className={styles.socialLink} aria-label="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>
          </div>
        </div>

        <div className={styles.linksColumn}>
          <h4 className={styles.heading}>Explore</h4>
          <ul className={styles.linksList}>
            <li><Link href="/" className={styles.link}>Home</Link></li>
            <li><Link href="/categories" className={styles.link}>Browse Categories</Link></li>
            <li><Link href="/search" className={styles.link}>Search Catalog</Link></li>
            <li><Link href="/upcoming" className={styles.link}>Upcoming Titles</Link></li>
          </ul>
        </div>

        <div className={styles.linksColumn}>
          <h4 className={styles.heading}>User Account</h4>
          <ul className={styles.linksList}>
            <li><Link href="/watchlist" className={styles.link}>My Watchlist</Link></li>
            <li><Link href="/history" className={styles.link}>Watch History</Link></li>
            <li><Link href="/login" className={styles.link}>Sign In / Register</Link></li>
          </ul>
        </div>

        <div className={styles.linksColumn}>
          <h4 className={styles.heading}>Support & Legal</h4>
          <ul className={styles.linksList}>
            <li><Link href="/faq" className={styles.link}>FAQ</Link></li>
            <li><Link href="/terms" className={styles.link}>Terms of Service</Link></li>
            <li><Link href="/privacy" className={styles.link}>Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>© 2026 PlayHentai (playhentai.live). Designed for optimal speed and visual aesthetics.</p>
        <p className={styles.speedBadge}>Powered by Cloudflare R2 & Next.js</p>
      </div>
    </footer>
  );
}
