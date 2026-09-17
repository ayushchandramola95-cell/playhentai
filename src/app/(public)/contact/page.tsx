'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Send,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Bug,
  Handshake,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  LifeBuoy,
} from 'lucide-react';
import styles from './contact.module.css';

interface SectionItem {
  id: string;
  num: string;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'channels', num: '01', title: 'Support channels' },
  { id: 'response', num: '02', title: 'Response times' },
  { id: 'form', num: '03', title: 'Send message' },
  { id: 'faq', num: '04', title: 'Quick FAQ' },
  { id: 'community', num: '05', title: 'Community hubs' },
];

function ContactContent() {
  const searchParams = useSearchParams();
  const defaultSubject = searchParams.get('subject') || 'general';

  const [activeSection, setActiveSection] = useState<string>('channels');
  const [department, setDepartment] = useState(defaultSubject);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState('normal');
  const [contentUrl, setContentUrl] = useState('');
  const [message, setMessage] = useState('');
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
    const mailtoSubject = encodeURIComponent(`[PlayHentai ${department.toUpperCase()} - ${priority.toUpperCase()}] ${name || 'User'}`);
    const mailtoBody = encodeURIComponent(
      `PLAYHENTAI SUPPORT INQUIRY\n` +
      `==========================\n\n` +
      `Department: ${department}\n` +
      `Priority: ${priority}\n` +
      `Sender Name: ${name}\n` +
      `Contact Email: ${email}\n` +
      (contentUrl ? `Relevant URL: ${contentUrl}\n` : '') +
      `\nMessage Details:\n${message}\n`
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
              <LifeBuoy size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>Contact Support</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Need assistance with video playback, your account, business partnerships, or legal inquiries? Our team
              is here to help. Reach out through our dedicated support channels below.
            </p>
            <div className={styles.lastModifiedBadge}>
              <Clock size={13} />
              <span>Support Hours: 24/7 Global Monitoring</span>
            </div>
          </header>

          {/* 01. Support Channels */}
          <section id="channels" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Support channels</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                To ensure your message reaches the appropriate specialist immediately, please direct your inquiry to the
                relevant department:
              </p>

              <div className={styles.channelsGrid}>
                {/* Channel 1: General Support */}
                <div className={styles.channelCard}>
                  <div className={styles.channelTop}>
                    <div className={styles.channelRole}>
                      <MessageSquare size={14} className={styles.channelIcon} />
                      <span>General &amp; Technical</span>
                    </div>
                    <span className={styles.channelBadge}>Avg: 12h</span>
                  </div>
                  <h3 className={styles.channelTitle}>Player &amp; Account Support</h3>
                  <p className={styles.channelDesc}>
                    For playback buffering, video errors, account logins, watchlist bookmarks, and general suggestions.
                  </p>
                  <a href="mailto:support@playhentai.live" className={styles.channelEmail}>
                    support@playhentai.live &rarr;
                  </a>
                </div>

                {/* Channel 2: Fast-Track Removal */}
                <div className={styles.channelCard}>
                  <div className={styles.channelTop}>
                    <div className={styles.channelRole}>
                      <ShieldCheck size={14} className={styles.channelIcon} />
                      <span>Creator Takedown</span>
                    </div>
                    <span className={styles.channelBadge}>Avg: 24h</span>
                  </div>
                  <h3 className={styles.channelTitle}>Fast-Track Removal</h3>
                  <p className={styles.channelDesc}>
                    For indie animators, doujin circles, and artists requesting prompt courtesy delisting of their works.
                  </p>
                  <Link href="/content-removal" className={styles.channelEmail}>
                    Open Removal Portal &rarr;
                  </Link>
                </div>

                {/* Channel 3: DMCA Agent */}
                <div className={styles.channelCard}>
                  <div className={styles.channelTop}>
                    <div className={styles.channelRole}>
                      <Bug size={14} className={styles.channelIcon} />
                      <span>Legal Compliance</span>
                    </div>
                    <span className={styles.channelBadge}>Priority</span>
                  </div>
                  <h3 className={styles.channelTitle}>DMCA &amp; Copyright Agent</h3>
                  <p className={styles.channelDesc}>
                    Designated agent for formal statutory copyright takedown notices under 17 U.S.C. § 512.
                  </p>
                  <Link href="/dmca" className={styles.channelEmail}>
                    Submit DMCA Notice &rarr;
                  </Link>
                </div>

                {/* Channel 4: Partnerships & Advertising */}
                <div className={styles.channelCard}>
                  <div className={styles.channelTop}>
                    <div className={styles.channelRole}>
                      <Handshake size={14} className={styles.channelIcon} />
                      <span>Commercial</span>
                    </div>
                    <span className={styles.channelBadge}>Business</span>
                  </div>
                  <h3 className={styles.channelTitle}>Advertising &amp; Partners</h3>
                  <p className={styles.channelDesc}>
                    For advertising networks, sponsored placements, platform syndication, and cross-promotions.
                  </p>
                  <a href="mailto:ads@playhentai.live" className={styles.channelEmail}>
                    ads@playhentai.live &rarr;
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 02. Response Times */}
          <section id="response" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Response times</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Our team operates across multiple global time zones to ensure rapid responses to user inquiries and
                urgent reports:
              </p>

              <div className={styles.slaGrid}>
                <div className={styles.slaCard}>
                  <span className={styles.slaLabel}>Broken Video / Player Bugs</span>
                  <span className={styles.slaTime}>&lt; 12 Hours</span>
                  <p className={styles.slaDesc}>High-priority stream inspections and mirror repairs.</p>
                </div>

                <div className={styles.slaCard}>
                  <span className={styles.slaLabel}>Creator &amp; DMCA Notices</span>
                  <span className={styles.slaTime}>&lt; 24 Hours</span>
                  <p className={styles.slaDesc}>Expedited takedown handling and verification.</p>
                </div>

                <div className={styles.slaCard}>
                  <span className={styles.slaLabel}>General User Questions</span>
                  <span className={styles.slaTime}>24 – 48 Hours</span>
                  <p className={styles.slaDesc}>Account recovery, general help, and suggestions.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 03. Send Message */}
          <section id="form" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Send message</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Fill out the contact form below. Submitting will prepare a pre-formatted message addressed to our team in
                your email client:
              </p>

              <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department / Category *</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={styles.formSelect}
                    >
                      <option value="technical">Technical Support &amp; Video Error</option>
                      <option value="account">Account &amp; Watchlist Help</option>
                      <option value="business">Advertising &amp; Business Inquiries</option>
                      <option value="general">General Feedback / Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={styles.formSelect}
                    >
                      <option value="normal">Normal (Standard inquiry)</option>
                      <option value="high">High (Broken video / Stream error)</option>
                      <option value="urgent">Urgent (Account security)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Your Name / Handle *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ken / AnimeFan99"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Your Email Address *</label>
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

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Relevant Series / Episode URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://playhentai.live/watch/..."
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Message Details *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Please provide all relevant details so our team can resolve your request quickly..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={styles.formTextarea}
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  <Send size={16} />
                  <span>Send Support Request</span>
                </button>

                {submitted && (
                  <div className={styles.successBox}>
                    <CheckCircle2 size={24} className={styles.successIcon} />
                    <div>
                      <strong>Your support message is ready!</strong> If your email client did not automatically launch,
                      you can email us directly at <strong>support@playhentai.live</strong>.
                    </div>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* 04. Quick FAQ */}
          <section id="faq" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Quick FAQ</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Get immediate answers to common questions before reaching out:
              </p>

              <div className={styles.faqList}>
                <div className={styles.faqItem}>
                  <h4 className={styles.faqQuestion}>
                    <span className={styles.faqDot}>◆</span>
                    <span>Video player is buffering or showing an error?</span>
                  </h4>
                  <p className={styles.faqAnswer}>
                    Video playback issues are often caused by aggressive browser ad-block extensions or network routing.
                    Try switching between video server mirrors below the player or disabling ad-blockers.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h4 className={styles.faqQuestion}>
                    <span className={styles.faqDot}>◆</span>
                    <span>How do I request a missing anime series or episode?</span>
                  </h4>
                  <p className={styles.faqAnswer}>
                    We update our catalog daily! You can check our{' '}
                    <Link href="/ongoing" className={styles.crossLink}>
                      Ongoing Releases
                    </Link>{' '}
                    or request titles directly via our community channels.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h4 className={styles.faqQuestion}>
                    <span className={styles.faqDot}>◆</span>
                    <span>Is PlayHentai completely free to watch?</span>
                  </h4>
                  <p className={styles.faqAnswer}>
                    Yes! All episodes, genres, 1080p HD streams, and search features on PlayHentai are 100% free with
                    unlimited access.
                  </p>
                </div>

                <div className={styles.faqItem}>
                  <h4 className={styles.faqQuestion}>
                    <span className={styles.faqDot}>◆</span>
                    <span>How do I report a broken episode or corrupted stream?</span>
                  </h4>
                  <p className={styles.faqAnswer}>
                    Use the contact form above with category &ldquo;Technical Support&rdquo; and include the direct URL of the
                    episode. Our server engineers will inspect and repair the stream within 12 hours.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 05. Community Hubs */}
          <section id="community" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Community hubs</h2>
            </div>
            <div className={styles.sectionContent}>
              <p>
                Looking for release announcements, anime discussions, or community recommendations? Join our active
                social channels:
              </p>

              <div className={styles.communityGrid}>
                <a
                  href="https://discord.gg/playhentai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.communityCard}
                >
                  <div className={styles.communityIconWrap}>
                    <MessageSquare size={22} />
                  </div>
                  <div className={styles.communityInfo}>
                    <h4 className={styles.communityName}>Discord Community</h4>
                    <span className={styles.communityDesc}>Chat with fans, get release alerts, and report bugs</span>
                  </div>
                  <ExternalLink size={16} style={{ marginLeft: 'auto', color: '#64748b' }} />
                </a>

                <Link href="/faq" className={styles.communityCard}>
                  <div className={styles.communityIconWrap}>
                    <HelpCircle size={22} />
                  </div>
                  <div className={styles.communityInfo}>
                    <h4 className={styles.communityName}>Complete FAQ Knowledge Base</h4>
                    <span className={styles.communityDesc}>Explore answers about uncensored releases and mobile casting</span>
                  </div>
                  <ExternalLink size={16} style={{ marginLeft: 'auto', color: '#64748b' }} />
                </Link>
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

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container} style={{ textAlign: 'center', paddingTop: '4rem' }}>
          Loading Contact Support...
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
