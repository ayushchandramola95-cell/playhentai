'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Printer,
  Mail,
  Lock,
  Eye,
  Sliders,
  Database,
  FileText,
} from 'lucide-react';
import styles from './privacy.module.css';

interface SectionItem {
  id: string;
  num: string;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'collect', num: '01', title: 'Information we collect' },
  { id: 'usage', num: '02', title: 'How we use it' },
  { id: 'sharing', num: '03', title: 'Sharing & advertising' },
  { id: 'cookies', num: '04', title: 'Cookies & tracking' },
  { id: 'retention', num: '05', title: 'Retention & security' },
  { id: 'rights', num: '06', title: 'Your rights' },
  { id: 'contact', num: '07', title: 'Contact' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string>('collect');

  useEffect(() => {
    const handleScroll = () => {
      // If user is scrolled to the very top, activate first section
      if (window.scrollY < 120) {
        setActiveSection(SECTIONS[0].id);
        return;
      }

      const headerOffset = 130;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= headerOffset) {
            setActiveSection(SECTIONS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 96;
      const elPosition = el.getBoundingClientRect().top;
      const offsetPosition = elPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(id);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Back Button */}
      <div className={styles.backWrapper}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className={styles.pageLayout}>
        {/* ============================================================ */}
        {/* MAIN CONTENT (LEFT COLUMN)                                  */}
        {/* ============================================================ */}
        <main className={styles.mainContent}>
          {/* Hero Header */}
          <header className={styles.pageHeader}>
            <div className={styles.titleRow}>
              <ShieldCheck size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>Privacy Policy</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Your privacy is fundamental to our service. This Privacy Policy details the information we collect, how
              we utilize and protect it, and the controls you have over your personal data at PlayHentai.
            </p>
            <div className={styles.lastModifiedBadge}>
              <span>Last Modified: September 2026</span>
            </div>
          </header>

          {/* 01. Information We Collect */}
          <section id="collect" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Information we collect</h2>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.subCategoryTitle}>
                <FileText size={16} className={styles.roleIcon} />
                <span>You provide to us</span>
              </div>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Account data</strong> — email address and a cryptographically hashed, salted password when
                    you register an account.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Preferences</strong> — saved anime titles, watchlists, customized playlists, blacklisted
                    tags, and video player configuration settings (such as audio, subtitles, and volume levels).
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Communications</strong> — inquiries, reports, or messages you submit directly to our
                    support team, DMCA takedown requests, or contact forms.
                  </span>
                </li>
              </ul>

              <div className={styles.subCategoryTitle} style={{ marginTop: '1rem' }}>
                <Eye size={16} className={styles.roleIcon} />
                <span>Collected automatically</span>
              </div>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Usage data</strong> — videos streamed, playback duration, resume checkpoints, and search
                    queries used to power personal watch history and intelligent recommendations.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Device data</strong> — IP address, browser type, operating system, and coarse regional
                    location (country/city level) used for edge routing, fraud prevention, and regional localization.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Cookies & local storage</strong> — small session identifiers and local browser storage keys
                    that keep you securely signed in, preserve active playback positions, and remember UI preferences.
                  </span>
                </li>
              </ul>

              <div className={styles.warningBox}>
                <AlertCircle size={22} className={styles.warningIcon} />
                <div>
                  <strong>Strict Underage Data Prohibition:</strong> We do not knowingly collect, solicit, or maintain
                  information from anyone under 18 years of age. If you believe a minor has provided us with personal
                  data, please contact{' '}
                  <a href="mailto:privacy@playhentai.live" className={styles.crossLink}>
                    privacy@playhentai.live
                  </a>{' '}
                  and we will permanently purge all associated records immediately.
                </div>
              </div>
            </div>
          </section>

          {/* 02. How We Use It */}
          <section id="usage" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>How we use it</h2>
            </div>
            <div className={styles.sectionContent}>
              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>Provide, maintain, and secure the streaming platform and your personal registered account.</span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Remember exactly where you left off across devices and generate accurate suggestions for related
                    series.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Detect, prevent, and respond to automated scraping bots, DDoS attacks, security intrusions, and
                    malicious exploit attempts.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Deliver and measure digital advertising on free tiers, including strict frequency capping to prevent
                    repetitive ad impressions.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Comply with statutory legal obligations, valid law-enforcement requests, and enforce our{' '}
                    <Link href="/terms" className={styles.crossLink}>
                      Terms of Service
                    </Link>
                    .
                  </span>
                </li>
              </ul>

              <div className={styles.infoCard}>
                <strong>Legal Bases for Processing:</strong> We process your data under clear legal justifications:
                contractual performance to provide the streaming services you request, our legitimate business interest
                in operating high-speed and secure infrastructure, explicit consent where required for certain cookies
                and advertising networks, and compliance with statutory legal obligations.
              </div>
            </div>
          </section>

          {/* 03. Sharing & Advertising */}
          <section id="sharing" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Sharing & advertising</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                We share data strictly with trusted service providers who assist us in operating PlayHentai — including
                Cloudflare for global edge delivery, caching, and DDoS mitigation; secure cloud database hosting; and
                contracted advertising networks. All service providers operate under binding data-processing agreements
                that restrict data usage solely to authorized technical functions.
              </p>
              <p>
                We may also disclose information when legally compelled by valid subpoenas, court orders, or where
                necessary to defend the physical security, intellectual property, or legal rights of our platform and
                users.
              </p>

              <div className={styles.warningBox}>
                <Lock size={22} className={styles.warningIcon} />
                <div>
                  <strong>No Sale of Personal Data:</strong> We do <strong>not</strong> sell, rent, or monetize your
                  viewing history or email address to data brokers. Advertising partners may utilize anonymized technical
                  identifiers to display relevant ads, but they receive only the telemetry needed to serve and measure
                  impressions — never your full viewing history tied to your personal identity.
                </div>
              </div>
            </div>
          </section>

          {/* 04. Cookies & Tracking */}
          <section id="cookies" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Cookies & tracking</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Cookies and local storage technologies keep you authenticated, remember your volume and playback
                configurations, and support sustainable advertising on free tiers:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Essential Cookies:</strong> Required for secure authentication, CSRF token verification,
                    and edge routing. The site cannot function properly without these.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Functional Storage:</strong> Saves your dark theme preference, preferred video stream
                    resolution, subtitle toggles, and audio volume.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Advertising Cookies:</strong> Used by partner ad networks to cap how frequently you see the
                    same ad and measure impression validity.
                  </span>
                </li>
              </ul>

              <p>
                You can manage, restrict, or clear cookies at any time through your browser settings. Please note that
                disabling essential cookies will log you out and reset your saved video preferences.
              </p>
            </div>
          </section>

          {/* 05. Retention & Security */}
          <section id="retention" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Retention & security</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                We retain personal data only for as long as your account remains active or as required to fulfill the
                operational purposes outlined in this policy, after which it is irreversibly purged or anonymized.
              </p>
              <p>
                We protect user data using industry-standard technical and organizational security controls:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Encryption in transit:</strong> All data transmitted between your browser and our servers is
                    protected by modern TLS 1.3 encryption with strict HSTS policies.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Password protection:</strong> Passwords are never stored in plaintext; they are hashed using
                    computationally intensive, salted algorithms (Argon2 / Bcrypt).
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Access controls:</strong> Administrative database access is restricted according to the
                    principle of least privilege and protected by multi-factor authentication.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 06. Your Rights */}
          <section id="rights" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>06</span>
              <h2 className={styles.sectionTitle}>Your rights</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Depending on your geographic location (including under the General Data Protection Regulation (GDPR) and
                the California Consumer Privacy Act (CCPA/CPRA)), you hold comprehensive rights over your personal data:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Right of Access & Portability:</strong> You may request an exported copy of all personal
                    data we hold regarding your account.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> You may request the
                    permanent deletion of your account, watch history, and personal records.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Right to Rectification:</strong> You may correct or update inaccurate profile details
                    directly in your account settings.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Right to Object & Opt-Out:</strong> You may object to data processing for advertising
                    purposes or withdraw previously granted consent.
                  </span>
                </li>
              </ul>

              <div className={styles.infoCard}>
                <strong>How to Exercise Your Rights:</strong> You can clear your watch history, favorites, and playlists
                directly inside your Account Settings. For a complete data export or permanent account purge, email our
                privacy officers at{' '}
                <a href="mailto:privacy@playhentai.live" className={styles.crossLink}>
                  privacy@playhentai.live
                </a>
                . We respond promptly within statutory timeframes and will never discriminate against you for exercising
                your privacy rights.
              </div>
            </div>
          </section>

          {/* 07. Contact */}
          <section id="contact" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>07</span>
              <h2 className={styles.sectionTitle}>Contact</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                If you have questions, inquiries, or formal data requests regarding this Privacy Policy, our designated
                compliance teams are available to assist:
              </p>

              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <ShieldCheck size={14} className={styles.roleIcon} />
                    <span>Privacy & Data Protection</span>
                  </div>
                  <a href="mailto:privacy@playhentai.live" className={styles.contactEmail}>
                    privacy@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    For data access, account erasure requests, or statutory privacy inquiries.
                  </p>
                </div>

                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Mail size={14} className={styles.roleIcon} />
                    <span>General Support</span>
                  </div>
                  <a href="mailto:support@playhentai.live" className={styles.contactEmail}>
                    support@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    For account assistance, playback troubleshooting, or technical questions.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ============================================================ */}
        {/* STICKY "ON THIS PAGE" TABLE OF CONTENTS (RIGHT SIDEBAR)      */}
        {/* ============================================================ */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>On this page</div>
          <nav className={styles.tocNav}>
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => scrollToSection(e, sec.id)}
                  className={`${styles.tocLink} ${isActive ? styles.tocLinkActive : ''}`}
                >
                  <span className={styles.tocNum}>{sec.num}</span>
                  <span className={styles.tocTitle}>{sec.title}</span>
                </a>
              );
            })}
          </nav>

          <button onClick={handlePrint} className={styles.printBtn} type="button">
            <Printer size={15} />
            <span>Print / save PDF</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
