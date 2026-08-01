import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldAlert, CheckCircle, Scale, Lock } from 'lucide-react';
import styles from './terms.module.css';

export const metadata = {
  title: 'Terms of Service | PlayHentai',
  description: 'Terms of Service and legal conditions for accessing and using PlayHentai.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
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
          <FileText size={36} className={styles.headerIcon} />
          <h1>Terms of Service</h1>
          <p className={styles.subtitle}>
            Please read these Terms of Service carefully before using our website.
          </p>
        </div>

        <div className={`${styles.contentCard} glass`}>
          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <ShieldAlert size={20} className={styles.blockIcon} />
              <h2>1. Age Requirement (18+ Only)</h2>
            </div>
            <p>
              By accessing or using PlayHentai (playhentai.live), you explicitly affirm that you are at least 18 years of age (or the legal age of majority in your state or country of residence). Access to the site by minors is strictly prohibited. If you do not meet the legal age requirement or if viewing adult animated content is illegal in your locality, you must leave this website immediately.
            </p>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <CheckCircle size={20} className={styles.blockIcon} />
              <h2>2. Acceptable Use & Account Rules</h2>
            </div>
            <p>
              PlayHentai grants you a non-exclusive, non-transferable, limited license to access and view public content for personal, non-commercial streaming purposes. You agree not to:
            </p>
            <ul>
              <li>Use automated scripts, bots, scrapers, or crawlers to harvest content or data from our servers.</li>
              <li>Attempt to circumvent security controls, rate limits, or access restricted administrative portals.</li>
              <li>Post abusive, spammy, or illegal links in user comment sections or user feedback forms.</li>
            </ul>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <Scale size={20} className={styles.blockIcon} />
              <h2>3. Content Disclaimer & DMCA Policy</h2>
            </div>
            <p>
              PlayHentai operates as an indexing and streaming interface. All media files are hosted on third-party cloud platforms and content delivery networks. We respect intellectual property rights. If you believe your copyrighted work is accessible on our service without authorization, please consult our DMCA section or contact us for prompt removal upon valid notification.
            </p>
          </div>

          <div className={styles.termBlock}>
            <div className={styles.blockTitle}>
              <Lock size={20} className={styles.blockIcon} />
              <h2>4. Limitation of Liability</h2>
            </div>
            <p>
              The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, express or implied. PlayHentai will not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the site or video streams.
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
