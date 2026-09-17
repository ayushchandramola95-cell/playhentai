import React from 'react';
import Link from 'next/link';
import { 
  Compass, 
  Flame, 
  Layers, 
  User, 
  Scale, 
  ShieldAlert, 
  Zap 
} from 'lucide-react';
import FooterActions from './FooterActions';
import styles from './Footer.module.css';

const ALPHABET = [
  'All', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 
  'W', 'X', 'Y', 'Z'
];

const FooterLogoIcon = () => (
  <div className={styles.logoIconBox}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="3" ry="3" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M17 2l-5 5-5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="10,11 15,14 10,17" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </div>
);

const RtaBadge = () => (
  <div className={styles.rtaBadge}>
    <span className={styles.rtaLabel}>RTA</span>
    <span className={styles.rtaText}>RESTRICTED TO ADULTS</span>
  </div>
);

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.wrapper}>
        
        {/* ============================================================ */}
        {/* TIER 1: A-Z ALPHABETICAL CATALOG INDEX BAR                   */}
        {/* ============================================================ */}
        <div className={styles.azBar}>
          <div className={styles.azLabel}>
            <Compass size={15} className={styles.azIcon} />
            <span>A-Z CATALOG INDEX:</span>
          </div>
          <div className={styles.azList}>
            {ALPHABET.map((char) => {
              const href = char === 'All' 
                ? '/categories' 
                : `/search?alpha=${encodeURIComponent(char === '#' ? '0-9' : char)}`;
              return (
                <Link 
                  key={char} 
                  href={href} 
                  prefetch={false}
                  className={styles.azChip}
                >
                  {char}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TIER 2: MAIN 5-COLUMN NAVIGATION GRID                        */}
        {/* ============================================================ */}
        <div className={styles.gridContainer}>
          
          {/* Column 1: Brand & Trust Hub */}
          <div className={styles.brandColumn}>
            <Link href="/" prefetch={false} className={styles.logoLink}>
              <FooterLogoIcon />
              <span className={styles.logoText}>
                <span className={styles.logoPlay}>PLAY</span>
                <span className={styles.logoGold}>HENTAI</span>
              </span>
            </Link>

            <p className={styles.brandDescription}>
              The premier destination for ultra-smooth HD anime streaming. Stream thousands of uncensored episodes, track watch history, and curate your collection with zero limits.
            </p>

            {/* Trust & Age Badges */}
            <div className={styles.trustBadgesRow}>
              <div className={styles.adultBadge}>
                <span className={styles.pulseDot} />
                <span>18+ ADULTS ONLY</span>
              </div>
              <RtaBadge />
            </div>

            {/* Client Action Buttons (PWA & Social) */}
            <FooterActions />
          </div>

          {/* Column 2: Discover & Watch */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <Flame size={15} className={styles.headingIcon} />
              <span>Discover</span>
            </h4>
            <ul className={styles.linksList}>
              <li><Link href="/trending" prefetch={false} className={styles.navLink}>Trending Series</Link></li>
              <li><Link href="/uncensored" prefetch={false} className={styles.navLink}>Uncensored Catalog</Link></li>
              <li><Link href="/3d" prefetch={false} className={styles.navLink}>3D Animation</Link></li>
              <li><Link href="/ongoing" prefetch={false} className={styles.navLink}>Ongoing Releases</Link></li>
              <li><Link href="/completed" prefetch={false} className={styles.navLink}>Completed Series</Link></li>
              <li><Link href="/recent/series" prefetch={false} className={styles.navLink}>Recently Added</Link></li>
              <li><Link href="/random" prefetch={false} className={styles.navLink}>Surprise Me (Random)</Link></li>
            </ul>
          </div>

          {/* Column 3: Browse Library */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <Layers size={15} className={styles.headingIcon} />
              <span>Browse</span>
            </h4>
            <ul className={styles.linksList}>
              <li><Link href="/categories" prefetch={false} className={styles.navLink}>Browse Hentai</Link></li>
              <li><Link href="/genres" prefetch={false} className={styles.navLink}>Genres Directory</Link></li>
              <li><Link href="/studios" prefetch={false} className={styles.navLink}>Animation Studios</Link></li>
              <li><Link href="/playlists" prefetch={false} className={styles.navLink}>Curated Playlists</Link></li>
              <li><Link href="/upcoming" prefetch={false} className={styles.navLink}>Upcoming Titles</Link></li>
            </ul>
          </div>

          {/* Column 4: User Portal */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <User size={15} className={styles.headingIcon} />
              <span>User Portal</span>
            </h4>
            <ul className={styles.linksList}>
              <li><Link href="/watchlist" prefetch={false} className={styles.navLink}>My Watchlist</Link></li>
              <li><Link href="/favorites" prefetch={false} className={styles.navLink}>My Favorites</Link></li>
              <li><Link href="/history" prefetch={false} className={styles.navLink}>Watch History</Link></li>
              <li><Link href="/playlists" prefetch={false} className={styles.navLink}>My Playlists</Link></li>
              <li><Link href="/settings" prefetch={false} className={styles.navLink}>Account Settings</Link></li>
              <li><Link href="/login" prefetch={false} className={styles.navLink}>Sign In / Register</Link></li>
            </ul>
          </div>

          {/* Column 5: Legal & Safety */}
          <div className={styles.navColumn}>
            <h4 className={styles.columnHeading}>
              <Scale size={15} className={styles.headingIcon} />
              <span>Legal &amp; Trust</span>
            </h4>
            <ul className={styles.linksList}>
              <li><Link href="/dmca" prefetch={false} className={styles.navLink}>DMCA Takedown Policy</Link></li>
              <li><Link href="/2257" prefetch={false} className={styles.navLink}>18 U.S.C. 2257 Notice</Link></li>
              <li><Link href="/terms" prefetch={false} className={styles.navLink}>Terms of Service</Link></li>
              <li><Link href="/privacy" prefetch={false} className={styles.navLink}>Privacy Policy</Link></li>
              <li><Link href="/content-removal" prefetch={false} className={styles.navLink}>Content Removal</Link></li>
              <li><Link href="/contact" prefetch={false} className={styles.navLink}>Contact Support</Link></li>
              <li><Link href="/faq" prefetch={false} className={styles.navLink}>Help &amp; FAQ</Link></li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TIER 3: LEGAL SAFE HARBOR & DISCLAIMER BOX                   */}
        {/* ============================================================ */}
        <div className={styles.disclaimerBox}>
          <div className={styles.disclaimerHeader}>
            <ShieldAlert size={16} className={styles.disclaimerIcon} />
            <span>SAFE HARBOR, NON-HOSTING &amp; REGULATORY COMPLIANCE STATEMENT</span>
          </div>
          <div className={styles.disclaimerContent}>
            <p>
              <strong>Disclaimer &amp; Safe Harbor:</strong> PlayHentai (playhentai.live) operates strictly as an indexing, cataloging, and media aggregation platform. None of the video files, animations, or multimedia content displayed on this website are hosted on, stored in, or transmitted directly from our web servers. All media streams, video players, and embedded contents are hosted by independent, non-affiliated third-party cloud storage and video delivery services. PlayHentai does not produce, create, or own any copyrighted material indexed on this platform.
            </p>
            <p>
              <strong>18 U.S.C. § 2257 Exemption Notice:</strong> All characters, depictions, and scenes appearing on this website are entirely fictional works of computer-generated illustration and 2D/3D digital animation. No actual human beings or living persons were utilized or depicted in the production of any content found on this site. Consequently, all visual media presented herein is completely exempt from the record-keeping and disclosure provisions set forth in 18 U.S.C. § 2257 and 28 C.F.R. § 75. All depicted characters are designed and intended to represent fictional adults aged 18+.
            </p>
            <p>
              <strong>Age Restriction (18+):</strong> This website contains adult-oriented animated media intended solely for consenting individuals of legal adult age (18 years of age or older, or the age of majority in your jurisdiction). If you are under the legal age or if accessing adult animated content is prohibited in your area, you must exit this website immediately.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TIER 4: BOTTOM COPYRIGHT & PERFORMANCE BAR                   */}
        {/* ============================================================ */}
        <div className={styles.bottomBar}>
          <div className={styles.copyrightText}>
            © {currentYear} <strong>PlayHentai</strong> (playhentai.live) — All rights reserved.
          </div>

          <div className={styles.bottomBadges}>
            <div className={styles.speedPill}>
              <Zap size={13} className={styles.zapIcon} />
              <span>Cloudflare R2 Ultra-Fast Delivery • SSL 256-Bit Encrypted</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
