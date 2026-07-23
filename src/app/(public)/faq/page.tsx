import React from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, ArrowLeft, ShieldCheck, PlayCircle, Lock } from 'lucide-react';
import styles from './faq.module.css';

export const metadata = {
  title: 'Frequently Asked Questions (FAQ) - PlayHentai',
  description: 'Find answers to common questions about playback, 18+ age requirements, account settings, and uncensored streaming on PlayHentai.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FAQPage() {
  const faqs = [
    {
      question: "Is PlayHentai completely free to use?",
      answer: "Yes! All anime series, episodes, categories, and streaming features on PlayHentai are 100% free with unlimited access."
    },
    {
      question: "What is the age requirement to access this website?",
      answer: "You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to access PlayHentai. By entering, you confirm you meet the age requirement."
    },
    {
      question: "What is the difference between Censored and Uncensored content?",
      answer: "Uncensored titles are presented without pixelation or mosaic overlays, providing the original unedited animation. Censored titles feature standard broadcast pixelation."
    },
    {
      question: "Why is a video buffering or failing to play?",
      answer: "Video playback issues are usually caused by browser extensions (like aggressive ad-blockers) or temporary network congestion. Try clearing your browser cache or switching video server mirrors."
    },
    {
      question: "Do I need an account to watch episodes?",
      answer: "No account is required to stream videos. However, creating a free account allows you to save bookmarks to your Watchlist, track your Watch History, and leave ratings and comments."
    },
    {
      question: "How do I report a broken video link or wrong episode?",
      answer: "You can report broken streams or missing episodes by visiting our DMCA & Contact page or leaving a comment under the affected episode page."
    }
  ];

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
          <HelpCircle size={36} className={styles.headerIcon} />
          <h1>Frequently Asked Questions</h1>
          <p className={styles.subtitle}>
            Everything you need to know about streaming, playback, accounts, and site features.
          </p>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <details key={index} className={`${styles.faqCard} glass`}>
              <summary className={styles.question}>
                <span>{faq.question}</span>
                <ChevronDown size={18} className={styles.arrowIcon} />
              </summary>
              <div className={styles.answer}>
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
