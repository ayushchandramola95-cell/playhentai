import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const FooterLogoIcon = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandColumn}>
          {/* Logo — matches header exactly */}
          <Link href="/" className={styles.logoContainer}>
            <FooterLogoIcon />
            <span className={styles.logoText}>
              <span className={styles.logoTextPlay}>PLAY</span>
              <span className={styles.logoTextGold}>HENTAI</span>
            </span>
          </Link>
          <p className={styles.description}>
            Experience ultra-smooth high-definition uncensored video streaming. Bookmark favorites, track your watch progress, and stream with zero limits.
          </p>
          <p className={styles.tagline}>© {new Date().getFullYear()} PlayHentai (playhentai.live)</p>
        </div>

        <div className={styles.linksColumn}>
          <h4 className={styles.heading}>Explore</h4>
          <ul className={styles.linksList}>
            <li><Link href="/" className={styles.link}>Home</Link></li>
            <li><Link href="/categories" className={styles.link}>Browse Library</Link></li>
            <li><Link href="/trending" className={styles.link}>Trending</Link></li>
            <li><Link href="/search" className={styles.link}>Search Catalog</Link></li>
            <li><Link href="/studios" className={styles.link}>Studios</Link></li>
            <li><Link href="/upcoming" className={styles.link}>Upcoming Titles</Link></li>
          </ul>
        </div>

        <div className={styles.linksColumn}>
          <h4 className={styles.heading}>User Account</h4>
          <ul className={styles.linksList}>
            <li><Link href="/watchlist" className={styles.link}>My Watchlist</Link></li>
            <li><Link href="/favorites" className={styles.link}>My Favorites</Link></li>
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
        <p>All characters depicted are fictional and 18+. For adult audiences only.</p>
        <p className={styles.speedBadge}>Powered by Cloudflare R2 &amp; Next.js</p>
      </div>
    </footer>
  );
}
