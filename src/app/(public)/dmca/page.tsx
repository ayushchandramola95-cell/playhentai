'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Printer, CheckCircle, FileText, Scale } from 'lucide-react';
import styles from './dmca.module.css';

const SECTIONS = [
  { id: 'policy', num: '01', title: 'Our policy' },
  { id: 'filing', num: '02', title: 'Filing a takedown notice' },
  { id: 'agent', num: '03', title: 'Designated agent' },
  { id: 'submit', num: '04', title: 'Submit a notice' },
  { id: 'counter', num: '05', title: 'Counter-notice' },
];

export default function DmcaPage() {
  const [activeSection, setActiveSection] = useState('submit');

  // Form states matching screenshot
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [rightsHolder, setRightsHolder] = useState('');
  const [reason, setReason] = useState('');
  const [contentUrls, setContentUrls] = useState('');
  const [description, setDescription] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [perjury, setPerjury] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Intersection observer for sticky TOC active state
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

  const handleSubmitNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goodFaith || !perjury) {
      alert('Please confirm both statutory declarations before submitting.');
      return;
    }

    const mailtoSubject = encodeURIComponent(`[DMCA Takedown Notice] from ${legalName || 'Copyright Owner'}`);
    const mailtoBody = encodeURIComponent(
      `DMCA COPYRIGHT INFRINGEMENT NOTICE\n` +
      `===================================\n\n` +
      `Full Legal Name: ${legalName}\n` +
      `Email Address: ${email}\n` +
      `Rights Holder / Company: ${rightsHolder || 'N/A'}\n` +
      `Reason for Request: ${reason}\n\n` +
      `URL(s) of the content:\n${contentUrls}\n\n` +
      `Description & Supporting Details:\n${description}\n\n` +
      `STATUTORY DECLARATIONS:\n` +
      `[X] Good-Faith Belief: I have a good-faith belief that the use of the material is not authorized by the rights holder, its agent, or the law, and I am the owner or authorized to act on the owner's behalf.\n` +
      `[X] Under Penalty of Perjury: I declare, under penalty of perjury, that the information in this notice is accurate and that I am authorized to submit it.\n\n` +
      `Electronic Signature: ${legalName}\n` +
      `Date: ${new Date().toISOString()}`
    );

    window.location.href = `mailto:support@playhentai.live?subject=${mailtoSubject}&body=${mailtoBody}`;
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
              <Scale size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>DMCA Takedown Policy</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Designated copyright agent, statutory takedown procedures, and counter-notification guidelines pursuant
              to 17 U.S.C. § 512 of the Digital Millennium Copyright Act.
            </p>
            <div className={styles.lastModifiedBadge}>
              <span>Statutory Compliance: 17 U.S.C. § 512</span>
            </div>
          </header>

          {/* 01 OUR POLICY */}
          <section id="policy" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Our policy</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Understanding PlayHentai&apos;s commitment to copyright protection and statutory compliance.
            </p>
            <div className={styles.card}>
              <div className={styles.noticeAlert}>
                <strong>Safe Harbor Statement:</strong> PlayHentai (playhentai.live) operates strictly as an indexing, cataloging, and media aggregation platform. None of the video files, animations, or multimedia content displayed on this website are hosted on, stored in, or transmitted directly from our web servers. All media streams are delivered by independent, non-affiliated third-party storage providers.
              </div>
              <p>
                Under 17 U.S.C. § 512, PlayHentai qualifies as a service provider and maintains a strict policy to expeditiously remove or disable access to any material claimed to be infringing upon receipt of a valid statutory notification.
              </p>
              <p>
                We also maintain a policy for terminating the accounts of subscribers and account holders who repeatedly infringe intellectual property rights in appropriate circumstances.
              </p>
            </div>
          </section>

          {/* 02 FILING A TAKEDOWN NOTICE */}
          <section id="filing" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Filing a takedown notice</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Required elements mandated by Section 512(c)(3) of the Digital Millennium Copyright Act.
            </p>
            <div className={styles.card}>
              <p>
                To expedite review, your written communication must contain all statutory requirements:
              </p>
              <ol>
                <li>
                  A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                </li>
                <li>
                  Identification of the copyrighted work claimed to have been infringed, or a representative list of such works.
                </li>
                <li>
                  Identification of the material that is claimed to be infringing, with specific URLs on PlayHentai allowing us to locate the content.
                </li>
                <li>
                  Information reasonably sufficient to permit us to contact you (full legal name, email address, telephone number, physical address).
                </li>
                <li>
                  A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
                </li>
                <li>
                  A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner.
                </li>
              </ol>
            </div>
          </section>

          {/* 03 DESIGNATED AGENT */}
          <section id="agent" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Designated agent</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Contact details for PlayHentai&apos;s registered copyright agent.
            </p>
            <div className={styles.card}>
              <p>
                Notifications of claimed infringement should be sent directly to our designated agent:
              </p>
              <div className={styles.agentInfoBox}>
                <div><strong>Designated Agent:</strong> PlayHentai Copyright &amp; DMCA Compliance Dept.</div>
                <div><strong>Email:</strong> <a href="mailto:support@playhentai.live?subject=DMCA%20Notice" className={styles.agentLink}>support@playhentai.live</a></div>
                <div><strong>Standard Response Time:</strong> 24–48 business hours</div>
                <div><strong>Alternative Web Submission:</strong> You may use the direct form below in Section 04 for immediate processing.</div>
              </div>
            </div>
          </section>

          {/* 04 SUBMIT A NOTICE (Exact Match to User Reference Screenshot) */}
          <section id="submit" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Submit a notice</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Use this form for the fastest handling. Required fields are marked with an asterisk (*).
            </p>

            <div className={styles.formCard}>
              {submitted ? (
                <div className={styles.successMessage}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={20} />
                    <strong>Takedown Notice Generated Successfully!</strong>
                  </div>
                  <p style={{ margin: 0 }}>
                    Your pre-formatted DMCA notice has been launched in your email client addressed to <strong>support@playhentai.live</strong>. If your email client did not automatically open, please send the details directly to <strong>support@playhentai.live</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitNotice} className={styles.formGrid}>
                  {/* Row 1 */}
                  <div className={styles.formRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        Full legal name <span className={styles.requiredStar}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Jane Doe"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        Email address <span className={styles.requiredStar}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={styles.input}
                      />
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className={styles.formRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        Rights holder / company
                      </label>
                      <input
                        type="text"
                        value={rightsHolder}
                        onChange={(e) => setRightsHolder(e.target.value)}
                        placeholder="Acme Studios K.K."
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        Reason for request <span className={styles.requiredStar}>*</span>
                      </label>
                      <select
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Select a reason...</option>
                        <option value="copyright">Copyright Infringement (I am the owner/agent)</option>
                        <option value="trademark">Trademark or Brand Infringement</option>
                        <option value="privacy">Personal Privacy / Unauthorized Use</option>
                        <option value="other">Other Legal Claim</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: URLs */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      URL(s) of the content <span className={styles.requiredStar}>*</span>
                    </label>
                    <textarea
                      required
                      value={contentUrls}
                      onChange={(e) => setContentUrls(e.target.value)}
                      placeholder="https://playhentai.live/series/...&#10;One URL per line"
                      className={styles.textarea}
                    />
                  </div>

                  {/* Row 4: Description */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Description &amp; supporting details <span className={styles.requiredStar}>*</span>
                    </label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Identify the original copyrighted work and describe how the reported material infringes it."
                      className={styles.textarea}
                      style={{ minHeight: '130px' }}
                    />
                  </div>

                  {/* Row 5: Declarations / Checkboxes */}
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        required
                        checked={goodFaith}
                        onChange={(e) => setGoodFaith(e.target.checked)}
                        className={styles.checkboxInput}
                      />
                      <span>
                        I have a good-faith belief that the use of the material is not authorized by the rights holder, its agent, or the law, and I am the owner or authorized to act on the owner&apos;s behalf.
                      </span>
                    </label>

                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        required
                        checked={perjury}
                        onChange={(e) => setPerjury(e.target.checked)}
                        className={styles.checkboxInput}
                      />
                      <span>
                        I declare, under penalty of perjury, that the information in this notice is accurate and that I am authorized to submit it. I understand that knowingly false statements may result in legal liability.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button type="submit" className={styles.submitBtn}>
                    <Send size={16} />
                    <span>Submit Notice</span>
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* 05 COUNTER-NOTICE */}
          <section id="counter" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Counter-notice</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Procedure for restoring access in the event of mistaken removal or misidentification.
            </p>
            <div className={styles.card}>
              <p>
                If material you uploaded or shared was removed or disabled under a DMCA notice and you believe this was done by mistake or misidentification, you may submit a formal counter-notification under 17 U.S.C. § 512(g)(3).
              </p>
              <p>
                A valid counter-notification must include your physical or electronic signature, identification of the disabled material, a statement under penalty of perjury of your good-faith belief of mistake, and consent to the jurisdiction of federal court. Upon receipt of a valid counter-notice, access will be restored within 10 to 14 business days unless the original complainant files a court action.
              </p>
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
