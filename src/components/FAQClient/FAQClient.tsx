'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ArrowLeft, 
  PlayCircle, 
  ShieldCheck, 
  Tv, 
  UserCheck, 
  MessageSquare, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import styles from './FAQClient.module.css';

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  highlights?: string[];
}

const FAQ_DATA: FAQItem[] = [
  // STREAMING & PLAYBACK
  {
    id: 'faq-1',
    category: 'Streaming & Playback',
    question: 'Is PlayHentai completely free to use?',
    answer: 'Yes! All anime series, 1080p HD episodes, category hubs, and streaming features on PlayHentai are 100% free with unlimited access. No credit card or subscription is ever required.',
    highlights: ['Zero subscription fees', 'Unlimited 1080p HD streaming', 'No hidden paywalls']
  },
  {
    id: 'faq-2',
    category: 'Streaming & Playback',
    question: 'Why is a video buffering, failing to load, or lagging?',
    answer: 'Video playback issues are usually caused by browser extensions (such as overly aggressive ad-blockers) or temporary network congestion. Follow these troubleshooting steps:',
    highlights: [
      'Try switching to a different video mirror server using the Server Switcher below the player.',
      'Clear your browser cache and cookies, then reload the page.',
      'Disable third-party browser extensions that interfere with video stream decoders.'
    ]
  },
  {
    id: 'faq-3',
    category: 'Streaming & Playback',
    question: 'What video resolutions and formats are available?',
    answer: 'PlayHentai provides adaptive HLS video streams up to full 1080p HD 60fps quality. The player automatically adjusts streaming resolution based on your device connection speed for smooth playback.',
    highlights: ['Full 1080p HD quality', 'Adaptive bitrate streaming', 'Fast Cloudflare CDN delivery']
  },

  // UNCENSORED & CONTENT
  {
    id: 'faq-4',
    category: 'Uncensored & Content',
    question: 'What is the difference between Censored and Uncensored releases?',
    answer: 'Uncensored titles present original unedited animation without pixelation or mosaic overlays. Censored releases retain standard Japanese broadcast pixelation. You can browse all unedited releases directly on our dedicated Uncensored page.',
    highlights: ['1080p original unedited animation', 'Dedicated /uncensored catalog hub', 'Filterable by studio and release year']
  },
  {
    id: 'faq-5',
    category: 'Uncensored & Content',
    question: 'How often is new anime content uploaded to PlayHentai?',
    answer: 'Our catalog is updated daily! New series episodes, raw releases, subbed releases, and newly published studio titles are added as soon as they become available from official animation studios.',
    highlights: ['Daily series releases', 'Instant sitemap and search engine auto-sync', 'Subbed and original Japanese audio']
  },
  {
    id: 'faq-6',
    category: 'Uncensored & Content',
    question: 'Which animation studios are featured on PlayHentai?',
    answer: 'We host comprehensive catalogs from top animation studios including PoRO, Bunnywalker, Mary Jane, Studio Jack, A-1 Pictures, Studio Trigger, and independent 3D creators.',
    highlights: ['PoRO, Bunnywalker, Mary Jane', 'Studio profiles with complete release histories', 'Filter by release year from 2000 to 2026']
  },

  // ACCOUNT & WATCHLIST
  {
    id: 'faq-7',
    category: 'Account & Watchlist',
    question: 'Do I need an account to watch episodes on PlayHentai?',
    answer: 'No account is required to stream any video on our site. However, creating a free account unlocks personalized features including saving titles to your Watchlist, tracking Watch History across devices, and leaving comments.',
    highlights: ['Instant guest viewing', 'Optional free profile creation', 'Cross-device Watchlist synchronization']
  },
  {
    id: 'faq-8',
    category: 'Account & Watchlist',
    question: 'How does the Watchlist and Watch History feature work?',
    answer: 'When logged in, clicking the "+ Watchlist" button on any series card saves it to your personal library. Your Watch History automatically logs watched episodes so you can resume playback right where you left off.',
    highlights: ['One-click bookmarks', 'Auto-resume playback position', 'Private and secure storage']
  },

  // MOBILE & SMART TV
  {
    id: 'faq-9',
    category: 'Mobile & Smart TV',
    question: 'Can I watch PlayHentai on mobile devices or Smart TVs?',
    answer: 'Yes! PlayHentai is fully responsive and optimized for mobile devices (iOS Safari, Android Chrome), tablets, and Smart TVs. You can cast video streams using Apple AirPlay or Google Chromecast directly from the video player.',
    highlights: ['Apple AirPlay support', 'Google Chromecast casting', 'Touch-optimized mobile interface']
  },

  // SAFETY & LEGAL
  {
    id: 'faq-10',
    category: 'Safety & Legal',
    question: 'What is the age requirement to access PlayHentai?',
    answer: 'You must be at least 18 years of age (or the legal age of majority in your country or jurisdiction) to access or view content on PlayHentai. An age verification confirmation is required upon first entering.',
    highlights: ['Strict 18+ age requirement', 'Legal age of majority enforcement', 'Privacy-first data policy']
  },
  {
    id: 'faq-11',
    category: 'Safety & Legal',
    question: 'How do I report a broken stream, copyright inquiry, or feedback?',
    answer: 'If you encounter a broken video player or have a copyright/DMCA inquiry, please contact our support team or use the broken link report button located under every episode player.',
    highlights: ['24/7 technical support response', 'DMCA compliance procedures', 'Direct feedback channels']
  }
];

const CATEGORIES = [
  'All',
  'Streaming & Playback',
  'Uncensored & Content',
  'Account & Watchlist',
  'Mobile & Smart TV',
  'Safety & Legal'
];

export default function FAQClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchA = item.answer.toLowerCase().includes(q);
        const matchH = item.highlights ? item.highlights.some(h => h.toLowerCase().includes(q)) : false;
        return matchQ || matchA || matchH;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      {/* Top Back Navigation */}
      <div className={styles.backWrapper}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <HelpCircle size={36} className={styles.headerIcon} />
        </div>
        <h1>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>
          Everything you need to know about 1080p HD streaming, uncensored releases, accounts, and device playback.
        </p>
      </div>

      {/* Search Input Box */}
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          type="text"
          placeholder="Search questions (e.g. uncensored, buffering, 1080p, Chromecast)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn}>
            Clear
          </button>
        )}
      </div>

      {/* Category Pills Row */}
      <div className={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`${styles.categoryChip} ${selectedCategory === cat ? styles.activeCategoryChip : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion FAQ Cards List */}
      <div className={styles.faqList}>
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                <button 
                  onClick={() => toggleFaq(faq.id)} 
                  className={styles.questionButton}
                  aria-expanded={isOpen}
                >
                  <div className={styles.questionTextGroup}>
                    <span className={styles.categoryBadge}>{faq.category}</span>
                    <span className={styles.questionTitle}>{faq.question}</span>
                  </div>
                  <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                </button>

                {isOpen && (
                  <div className={styles.answerBody}>
                    <p className={styles.answerText}>{faq.answer}</p>

                    {faq.highlights && faq.highlights.length > 0 && (
                      <div className={styles.highlightsBox}>
                        {faq.highlights.map((h, idx) => (
                          <div key={idx} className={styles.highlightItem}>
                            <CheckCircle2 size={16} className={styles.checkIcon} />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <p>No questions found matching your search term.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className={styles.resetBtn}>
              Reset FAQ Filters
            </button>
          </div>
        )}
      </div>

      {/* Bottom Contact CTA Box */}
      <div className={styles.ctaBox}>
        <div className={styles.ctaContent}>
          <MessageSquare size={28} className={styles.ctaIcon} />
          <div>
            <h3>Still have questions or need assistance?</h3>
            <p>Can&apos;t find the answer you&apos;re looking for? Reach out to our technical support team or explore our catalog.</p>
          </div>
        </div>
        <div className={styles.ctaButtons}>
          <Link href="/categories" className={styles.ctaPrimaryBtn}>
            <PlayCircle size={16} /> Browse All Series
          </Link>
          <Link href="/uncensored" className={styles.ctaSecondaryBtn}>
            <ShieldCheck size={16} /> Uncensored Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
