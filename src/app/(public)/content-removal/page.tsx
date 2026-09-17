'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  ShieldCheck,
  Send,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  Scale,
} from 'lucide-react';
import styles from './content-removal.module.css';

interface SectionItem {
  id: string;
  num: string;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'overview', num: '01', title: 'Creator policy' },
  { id: 'criteria', num: '02', title: 'Eligibility criteria' },
  { id: 'process', num: '03', title: 'How it works' },
  { id: 'form', num: '04', title: 'Submit removal request' },
  { id: 'channels', num: '05', title: 'Direct channels' },
];

export default function ContentRemovalPage() {
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Interactive Form State
  const [artistName, setArtistName] = useState('');
  const [email, setEmail] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [contentUrls, setContentUrls] = useState('');
  const [requestType, setRequestType] = useState('indie-artist');
  const [notes, setNotes] = useState('');
  const [affirmation, setAffirmation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!affirmation) {
      alert('Please confirm the creator representation checkbox before submitting.');
      return;
    }

    const mailtoSubject = encodeURIComponent(`[Fast-Track Content Removal] from ${artistName || 'Creator'}`);
    const mailtoBody = encodeURIComponent(
      `FAST-TRACK CONTENT REMOVAL REQUEST\n` +
      `===================================\n\n` +
      `Creator / Circle Name: ${artistName}\n` +
      `Contact Email: ${email}\n` +
      `Request Type: ${requestType}\n` +
      `Proof of Authorship (Pixiv/X/DLsite/Booth): ${proofUrl}\n\n` +
      `URL(s) to Remove:\n${contentUrls}\n\n` +
      `Additional Notes / Message:\n${notes || 'None provided.'}\n\n` +
      `Creator Affirmation: Confirmed authorized creator or representative.\n`
    );

    window.location.href = `mailto:takedown@playhentai.live?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSubmitted(true);
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
              <Trash2 size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>Content Removal</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Fast-track courtesy takedown portal designed for indie animators, doujinshi circles, and original creators.
              Request immediate removal without complex statutory legal filings.
            </p>
            <div className={styles.lastModifiedBadge}>
              <Clock size={13} />
              <span>Standard Review: Under 24 Hours</span>
            </div>
          </header>

          {/* 01. Creator Policy */}
          <section id="overview" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Creator policy</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                At PlayHentai, we deeply respect the Japanese animation community, independent doujin circles, and
                freelance 2D/3D animators. We recognize that independent creators often find formal legal DMCA affidavits
                (which demand real legal names, physical addresses, and statutory perjury declarations) burdensome and
                intimidating.
              </p>
              <p>
                Our <strong>Fast-Track Content Removal Portal</strong> is built specifically to provide an accessible,
                courtesy removal pathway. If you are an animator or circle author and your work was indexed without your
                blessing, simply submit your verified creator profile (such as Pixiv, Twitter/X, DLsite, Booth, or
                Fanbox) and we will delist the video promptly.
              </p>

              <div className={styles.warningBox}>
                <Sparkles size={24} className={styles.warningIcon} />
                <div>
                  <strong>Notice for Corporate Rights Holders:</strong> If you are a commercial studio, legal firm, or
                  corporate rights holder seeking to file a formal statutory takedown under 17 U.S.C. § 512, please use
                  our designated{' '}
                  <Link href="/dmca" className={styles.crossLink}>
                    DMCA Takedown Notice Portal
                  </Link>
                  .
                </div>
              </div>
            </div>
          </section>

          {/* 02. Eligibility Criteria */}
          <section id="criteria" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Eligibility criteria</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                You may utilize this fast-track removal portal for any of the following categories:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Independent Circle / Doujin Release:</strong> You are the author, animator, or circle owner
                    requesting courtesy delisting of a self-published work.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Freelance Animator / 3D Modeler Work:</strong> You created the original animation, 3D
                    rigging, or artwork and do not wish for it to be publicly indexed.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Corrupted or Defective Stream:</strong> The video file is misattributed, has desynchronized
                    audio, contains broken episode sequencing, or contains playback defects.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>◆</span>
                  <span>
                    <strong>Terms of Service Violation:</strong> Content that violates our core community guidelines or
                    terms.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 03. How It Works */}
          <section id="process" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>How it works</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                We have streamlined the removal workflow into three straightforward steps:
              </p>

              <ul className={styles.bulletList}>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>1.</span>
                  <span>
                    <strong>Submit the Request:</strong> Complete the form below with the specific PlayHentai URL(s) and
                    a link proving your creator identity (e.g. your public Pixiv, Twitter/X, or DLsite circle page).
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>2.</span>
                  <span>
                    <strong>Expedited Verification:</strong> Our compliance team inspects your creator link to verify
                    authorship within 24 hours.
                  </span>
                </li>
                <li className={styles.bulletItem}>
                  <span className={styles.bulletDot}>3.</span>
                  <span>
                    <strong>Immediate Delisting & Purge:</strong> Once verified, the video stream is immediately removed
                    from our public catalog and all edge CDN caches are flushed.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* 04. Submit Removal Form */}
          <section id="form" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Submit removal request</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Fill out the fast-track submission form below. Our team processes courtesy removal requests seven days a
                week.
              </p>

              <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Creator / Circle Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Circle Sakura / Studio Ken"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Contact Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="your-email@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Request Type *</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className={styles.formSelect}
                    >
                      <option value="indie-artist">Independent Artist / Animator Takedown</option>
                      <option value="doujin-circle">Doujin Circle Courtesy Removal</option>
                      <option value="defective-content">Corrupted / Defective Stream Report</option>
                      <option value="other-removal">Other Removal Request</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Proof of Authorship (URL) *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://pixiv.net/users/... or https://x.com/..."
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>PlayHentai URL(s) to Remove *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="https://playhentai.live/series/... or https://playhentai.live/watch/... (one per line)"
                    value={contentUrls}
                    onChange={(e) => setContentUrls(e.target.value)}
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Additional Notes or Context (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Any additional details to expedite verification..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formCheckboxWrapper}>
                  <input
                    type="checkbox"
                    id="affirmation"
                    checked={affirmation}
                    onChange={(e) => setAffirmation(e.target.checked)}
                    className={styles.formCheckbox}
                  />
                  <label htmlFor="affirmation" className={styles.checkboxLabel}>
                    I affirm that I am the creator, animator, or authorized representative of the requested work, and
                    the information provided above is accurate.
                  </label>
                </div>

                <button type="submit" className={styles.submitBtn}>
                  <Send size={16} />
                  <span>Submit Fast-Track Request</span>
                </button>

                {submitted && (
                  <div className={styles.successBox}>
                    <CheckCircle2 size={24} className={styles.successIcon} />
                    <div>
                      <strong>Your request has been generated!</strong> If your email client did not automatically open,
                      you can send your request directly to <strong>takedown@playhentai.live</strong>.
                    </div>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* 05. Direct Channels */}
          <section id="channels" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Direct channels</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                You can also submit removal inquiries directly via our monitored email addresses:
              </p>

              <div className={styles.contactGrid}>
                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Clock size={14} className={styles.roleIcon} />
                    <span>Fast-Track Removal</span>
                  </div>
                  <a href="mailto:takedown@playhentai.live" className={styles.contactEmail}>
                    takedown@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    Dedicated to indie creators, animators, and circle courtesy takedowns (response within 24 hours).
                  </p>
                </div>

                <div className={styles.contactCard}>
                  <div className={styles.contactRole}>
                    <Scale size={14} className={styles.roleIcon} />
                    <span>Corporate DMCA Agent</span>
                  </div>
                  <a href="mailto:legal@playhentai.live" className={styles.contactEmail}>
                    legal@playhentai.live
                  </a>
                  <p className={styles.contactDesc}>
                    Designated agent for formal statutory 17 U.S.C. § 512 copyright notices.
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
