'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Printer, Mail, FileText, Scale, ShieldCheck, Lock } from 'lucide-react';
import styles from './terms.module.css';

interface SectionItem {
  id: string;
  num: string;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'eligibility', num: '01', title: 'Eligibility & age' },
  { id: 'account', num: '02', title: 'Your account' },
  { id: 'acceptable', num: '03', title: 'Acceptable use' },
  { id: 'content', num: '04', title: 'Content & licenses' },
  { id: 'advertising', num: '05', title: 'Advertising & premium' },
  { id: 'dmca', num: '06', title: 'DMCA & safe harbor' },
  { id: 'liability', num: '07', title: 'Disclaimers & liability' },
  { id: 'termination', num: '08', title: 'Termination & changes' },
  { id: 'governing', num: '09', title: 'Governing law' },
  { id: 'contact', num: '10', title: 'Contact' },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<string>('eligibility');

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
    handleScroll(); // initial check
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
              <FileText size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>Terms of Service</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Please review these Terms of Service carefully before utilizing PlayHentai. By accessing, browsing, or
              streaming content on this website, you agree to be bound by these legal conditions.
            </p>
            <div className={styles.lastModifiedBadge}>
              <span>Last Modified: September 2026</span>
            </div>
          </header>

          {/* 01. Eligibility & Age */}
          <section id="eligibility" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Eligibility & age</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                The Service contains sexually explicit, adults-only animated material. You may use it only if you are{' '}
                <strong>at least 18 years of age</strong> (or the age of legal majority in your jurisdiction, whichever
                is higher) and it is lawful to view such illustrated content where you are physically located.
              </p>
              <p>
                By using the Service you represent and warrant that you meet these legal requirements. We reserve the
                absolute right to request verification of age and to suspend or permanently ban any account or IP
                address where we have reason to believe the holder is a minor.
              </p>

              <div className={styles.warningBox}>
                <AlertTriangle size={24} className={styles.warningIcon} />
                <div>
                  <strong>Mandatory Warning:</strong> If you are under 18, leave immediately. Parents and guardians can
                  restrict access using parental filtering tools such as <strong>RTA labels</strong>, NetNanny,
                  CyberSitter, OpenDNS FamilyShield, and operating-system level controls. This platform is labeled with
                  the RTA (&ldquo;Restricted To Adults&rdquo;) meta tag.
                </div>
              </div>
            </div>
          </section>

          {/* 02. Your Account */}
          <section id="account" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Your account</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Certain features (such as personalized watchlists, custom collections, and viewing history) require an
                account. You are solely responsible for maintaining the confidentiality of your login credentials and for
                all activities that occur under your registered profile. Notify our administration immediately at{' '}
                <a href="mailto:support@playhentai.live" className={styles.crossLink}>
                  support@playhentai.live
                </a>{' '}
                if you suspect unauthorized access or security breaches.
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>You must provide accurate, current registration details and promptly maintain their validity.</span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    One person may not maintain more than one active account. Accounts may not be shared, rented,
                    transferred, or sold to third parties.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    We reserve the right to suspend, lock, or terminate accounts that violate these terms or demonstrate
                    anomalous automated activity, with or without prior notice.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 03. Acceptable Use */}
          <section id="acceptable" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Acceptable use</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                You agree <strong>not</strong> to use the Service or its underlying infrastructure to engage in any of
                the following prohibited activities:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Download, scrape, mirror, frame, aggregate, or redistribute video streams or site metadata except
                    through user interfaces expressly provided by PlayHentai.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Circumvent, disable, or tamper with security protocols, rate-limiting rules, token authentication,
                    or ad-supported playback gates.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Upload or transmit viruses, Trojan horses, automated exploit scripts, or attempt unauthorized entry
                    into server systems or user databases.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Deploy bots, spiders, headless browsers, or programmatic crawlers to access the Service beyond
                    reasonable human viewing patterns.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Publish abusive, harassing, defamatory, fraudulent, or infringing text or links in comment sections,
                    user tags, or feedback forms.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    Resell, sublicense, repackage, or commercially exploit any portion of the platform or video streams
                    without explicit prior written authorization.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 04. Content & Licenses */}
          <section id="content" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Content & licenses</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                All video streams, animated artwork, illustrations, UI components, text, and proprietary code rendered
                on PlayHentai are owned by PlayHentai, its licensors, or respective original studio producers, and are
                protected by international copyright and intellectual-property treaties.
              </p>
              <p>
                We grant you a <strong>limited, personal, non-exclusive, non-transferable, revocable license</strong> to
                stream audiovisual content solely for your private, non-commercial entertainment. No intellectual
                property, ownership, or redistribution rights are granted or implied.
              </p>
              <p>
                Any voluntary suggestions, feature requests, bug discoveries, or user feedback submitted to PlayHentai
                become our non-exclusive intellectual property and may be utilized or implemented without compensation,
                restriction, or accounting to you.
              </p>
            </div>
          </section>

          {/* 05. Advertising & Premium */}
          <section id="advertising" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Advertising & premium</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                The free tier of the Service is supported by digital advertising. By utilizing the free tier, you agree
                that third-party ads — including pre-roll video interstitial announcements, display banners, and sponsor
                placements — may be displayed before or alongside video playback. Ad frequency, network delivery, and
                placement parameters are subject to periodic technical optimization.
              </p>
              <p>
                Where premium memberships or ad-free access passes are offered, precise billing schedules, renewal
                terms, and cancellation mechanics are clearly displayed during checkout and incorporated into these
                Terms of Service by reference. Subscription access may be managed or cancelled at any time through your
                account billing portal.
              </p>
            </div>
          </section>

          {/* 06. DMCA & Safe Harbor */}
          <section id="dmca" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>06</span>
              <h2 className={styles.sectionTitle}>DMCA & safe harbor</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                PlayHentai complies with the Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512). As an automated
                content indexer and streaming distributor, we respond expeditiously to verified notices of alleged
                copyright infringement.
              </p>
              <p>
                If you are a copyright holder or authorized agent and believe that content indexed on our site infringes
                upon your rights, please review our comprehensive procedures and submit a notice via our{' '}
                <Link href="/dmca" className={styles.crossLink}>
                  DMCA Takedown Notice Portal
                </Link>
                . We maintain a strict policy of terminating repeat infringers in accordance with 17 U.S.C. § 512(i).
              </p>
              <p>
                For questions regarding age record-keeping and visual exemptions under federal statutes, please refer to
                our{' '}
                <Link href="/2257" className={styles.crossLink}>
                  18 U.S.C. § 2257 Compliance Statement
                </Link>
                .
              </p>
            </div>
          </section>

          {/* 07. Disclaimers & Liability */}
          <section id="liability" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>07</span>
              <h2 className={styles.sectionTitle}>Disclaimers & liability</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                The Service and all media accessible through it are provided <strong>&ldquo;as is&rdquo;</strong> and{' '}
                <strong>&ldquo;as available&rdquo;</strong> without representations or warranties of any kind, whether
                express, implied, statutory, or otherwise. We expressly disclaim all warranties of merchantability,
                fitness for a particular purpose, non-infringement, or uninterrupted, bug-free operation.
              </p>
              <p>
                To the maximum extent permitted by applicable law, PlayHentai, its operators, hosting partners, and
                affiliates shall not be liable for any indirect, incidental, punitive, special, or consequential damages,
                or any loss of profits, data, goodwill, or device integrity arising from your use of or inability to use
                the Service.
              </p>
              <div className={styles.infoCard}>
                <strong>Liability Cap:</strong> Our total aggregate liability for all claims arising out of or relating
                to these terms or the Service shall not exceed the greater of the total amount paid by you to PlayHentai
                in the twelve (12) months preceding the claim, or <strong>USD $100.00</strong>.
              </div>
            </div>
          </section>

          {/* 08. Termination & Changes */}
          <section id="termination" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>08</span>
              <h2 className={styles.sectionTitle}>Termination & changes</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                We reserve the unilateral right to alter, suspend, discontinue, or retire any aspect of the Service,
                feature, catalog entry, or database at any time without liability.
              </p>
              <p>
                We may amend these Terms of Service periodically. Material revisions will be posted directly to this
                page with a revised &ldquo;Last Modified&rdquo; timestamp. Your continued use of PlayHentai following the
                posting of revised terms constitutes your explicit acceptance thereof.
              </p>
              <p>
                You may cease using the Service at any time. Provisions that by their nature should reasonably survive
                termination — including intellectual property ownership, disclaimers of warranties, indemnification, and
                limitations of liability — shall survive.
              </p>
            </div>
          </section>

          {/* 09. Governing Law */}
          <section id="governing" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>09</span>
              <h2 className={styles.sectionTitle}>Governing law</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                These terms and any disputes arising out of or related to your use of the Service are governed by and
                construed in accordance with the laws applicable at the operator&apos;s place of establishment, without
                giving effect to any principles of conflicts of law.
              </p>
              <p>
                Before commencing formal litigation or arbitration proceedings, you agree to engage in an informal
                dispute resolution period of at least thirty (30) days by contacting our legal department at{' '}
                <a href="mailto:legal@playhentai.live" className={styles.crossLink}>
                  legal@playhentai.live
                </a>
                .
              </p>
              <p>
                If any provision of these terms is deemed unlawful, void, or unenforceable, that provision shall be
                severable from these terms and shall not affect the validity and enforceability of the remaining
                provisions.
              </p>
            </div>
          </section>

          {/* 10. Contact */}
          <section id="contact" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>10</span>
              <h2 className={styles.sectionTitle}>Contact</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Have questions or inquiries regarding our Terms of Service? Reach out directly to our dedicated teams:
              </p>

              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Mail size={14} className={styles.roleIcon} />
                    <span>General Support</span>
                  </div>
                  <a href="mailto:support@playhentai.live" className={styles.contactEmail}>
                    support@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    For account assistance, playback troubleshooting, or feedback.
                  </p>
                </div>

                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Scale size={14} className={styles.roleIcon} />
                    <span>Legal Inquiries</span>
                  </div>
                  <a href="mailto:legal@playhentai.live" className={styles.contactEmail}>
                    legal@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    For copyright notices, statutory compliance, or legal communications.
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
