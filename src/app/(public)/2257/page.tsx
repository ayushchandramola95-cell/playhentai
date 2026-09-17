'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Info, Scale, Mail, ShieldCheck } from 'lucide-react';
import styles from './2257.module.css';

const SECTIONS = [
  { id: 'animated', num: '01', title: 'Animated & illustrated works' },
  { id: 'recordkeeping', num: '02', title: 'Record-keeping' },
  { id: 'thirdparty', num: '03', title: 'Third-party content' },
  { id: 'exemption', num: '04', title: 'Exemption statement' },
  { id: 'contact', num: '05', title: 'Compliance contact' },
];

export default function Exemption2257Page() {
  const [activeSection, setActiveSection] = useState('animated');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 180;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            setActiveSection(s.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Back button */}
      <div className={styles.backWrapper}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className={styles.pageLayout}>
        {/* ============================================================ */}
        {/* MAIN CONTENT (LEFT)                                          */}
        {/* ============================================================ */}
        <main className={styles.mainContent}>
          {/* Hero Header */}
          <header className={styles.pageHeader}>
            <div className={styles.titleRow}>
              <ShieldCheck size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>18 U.S.C. § 2257 Notice</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Statutory record-keeping compliance statement and exemption notice regarding animated, illustrated, and
              computer-generated fictional media.
            </p>
            <div className={styles.lastModifiedBadge}>
              <span>Federal Compliance: 18 U.S.C. § 2257 &amp; 28 C.F.R. Part 75</span>
            </div>
          </header>

          {/* 01 ANIMATED & ILLUSTRATED WORKS */}
          <section id="animated" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Animated &amp; illustrated works</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                The overwhelming majority of content on PlayHentai consists of <strong>animation, illustration, and computer-generated imagery</strong>. Such works do not depict real human beings and therefore <strong>do not fall within the definition of &ldquo;actual sexually explicit conduct&rdquo;</strong> by real persons under 18 U.S.C. § 2257 and 28 C.F.R. Part 75.
              </p>

              <div className={styles.calloutBox}>
                <Info size={20} className={styles.calloutIcon} />
                <span>
                  Every character depicted is fictional and an adult (18 years of age or older) within the narrative context of the work. Any resemblance to real persons is coincidental.
                </span>
              </div>
            </div>
          </section>

          {/* 02 RECORD-KEEPING */}
          <section id="recordkeeping" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Record-keeping</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                For any content that may depict real persons engaged in actual or simulated sexually explicit conduct, the original producers — not PlayHentai — are the custodians of records required by 18 U.S.C. § 2257. PlayHentai acts as a platform that links to and indexes third-party material and is not the &ldquo;producer&rdquo; of that content as defined by the statute.
              </p>
              <p>
                Where we license or host such material directly, records demonstrating that all performers were over 18 at the time of production are maintained by the respective producer and available to authorities in accordance with applicable law.
              </p>
            </div>
          </section>

          {/* 03 THIRD-PARTY CONTENT */}
          <section id="thirdparty" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Third-party content</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                PlayHentai may contain links to, or embed, content hosted by third parties. With respect to such material, the obligations under § 2257 rest with the third-party producers and operators. We require our partners to comply with all applicable age-verification and record-keeping laws as a condition of inclusion.
              </p>
            </div>
          </section>

          {/* 04 EXEMPTION STATEMENT */}
          <section id="exemption" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Exemption statement</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Content consisting solely of animation, illustration, drawings, cartoons, sculptures, paintings, or other works of fiction is <strong>exempt</strong> from the record-keeping requirements of 18 U.S.C. § 2257 because no real human being is depicted.
              </p>
            </div>
          </section>

          {/* 05 COMPLIANCE CONTACT */}
          <section id="contact" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Compliance contact</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>Questions regarding this statement or compliance matters may be directed to:</p>

              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Scale size={15} className={styles.roleIcon} />
                    <span>Compliance Officer</span>
                  </div>
                  <a href="mailto:compliance@playhentai.live" className={styles.contactEmail}>
                    compliance@playhentai.live
                  </a>
                </div>

                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Mail size={15} className={styles.roleIcon} />
                    <span>Legal</span>
                  </div>
                  <a href="mailto:legal@playhentai.live" className={styles.contactEmail}>
                    legal@playhentai.live
                  </a>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* ============================================================ */}
        {/* STICKY TABLE OF CONTENTS SIDEBAR (RIGHT)                     */}
        {/* ============================================================ */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>ON THIS PAGE</div>
          <nav className={styles.tocNav}>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`${styles.tocLink} ${activeSection === s.id ? styles.tocLinkActive : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {s.title}
              </a>
            ))}
          </nav>

          <button type="button" onClick={handlePrint} className={styles.printBtn}>
            <Printer size={15} />
            <span>Print / save PDF</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
