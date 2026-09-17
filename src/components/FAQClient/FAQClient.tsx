'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlayCircle,
  ShieldCheck,
  Tv,
  UserCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { FAQItem, SectionItem, SECTIONS, CATEGORIES, FAQ_DATA } from '@/utils/faqData';
import styles from './FAQClient.module.css';

export default function FAQClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('stream-free');
  const [activeSection, setActiveSection] = useState<string>('streaming');

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

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchA = item.answer.toLowerCase().includes(q);
        const matchH = item.highlights ? item.highlights.some((h) => h.toLowerCase().includes(q)) : false;
        return matchQ || matchA || matchH;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
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

      {/* Top Back Navigation */}
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
              <HelpCircle size={36} className={styles.headerIcon} />
              <h1 className={styles.pageTitle}>Help &amp; FAQ</h1>
            </div>
            <p className={styles.pageSubtitle}>
              Find instant answers regarding 1080p HD streaming, uncensored releases, account bookmarks, Smart TV
              casting, and platform safety on PlayHentai.
            </p>
            <div className={styles.lastModifiedBadge}>
              <Clock size={13} />
              <span>Knowledge Base: Updated September 2026</span>
            </div>
          </header>

          {/* Interactive Search Bar */}
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search help topics (e.g. buffering, uncensored, 1080p, Chromecast, DMCA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={styles.clearSearchBtn} type="button">
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`${styles.categoryChip} ${selectedCategory === cat ? styles.activeCategoryChip : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 01. Streaming & Playback */}
          <section id="streaming" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>01</span>
              <h2 className={styles.sectionTitle}>Streaming &amp; playback</h2>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.filter((f) => f.sectionId === 'streaming').map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                    <button onClick={() => toggleFaq(faq.id)} className={styles.questionButton} type="button">
                      <div className={styles.questionTextGroup}>
                        <span className={styles.categoryBadge}>{faq.category}</span>
                        <span className={styles.questionTitle}>{faq.question}</span>
                      </div>
                      <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={styles.answerBody}>
                        <p className={styles.answerText}>{faq.answer}</p>
                        {faq.highlights && (
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
              })}
            </div>
          </section>

          {/* 02. Uncensored & Content */}
          <section id="content" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>02</span>
              <h2 className={styles.sectionTitle}>Uncensored &amp; catalog</h2>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.filter((f) => f.sectionId === 'content').map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                    <button onClick={() => toggleFaq(faq.id)} className={styles.questionButton} type="button">
                      <div className={styles.questionTextGroup}>
                        <span className={styles.categoryBadge}>{faq.category}</span>
                        <span className={styles.questionTitle}>{faq.question}</span>
                      </div>
                      <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={styles.answerBody}>
                        <p className={styles.answerText}>{faq.answer}</p>
                        {faq.highlights && (
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
              })}
            </div>
          </section>

          {/* 03. Account & Watchlist */}
          <section id="account" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>03</span>
              <h2 className={styles.sectionTitle}>Accounts &amp; watchlist</h2>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.filter((f) => f.sectionId === 'account').map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                    <button onClick={() => toggleFaq(faq.id)} className={styles.questionButton} type="button">
                      <div className={styles.questionTextGroup}>
                        <span className={styles.categoryBadge}>{faq.category}</span>
                        <span className={styles.questionTitle}>{faq.question}</span>
                      </div>
                      <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={styles.answerBody}>
                        <p className={styles.answerText}>{faq.answer}</p>
                        {faq.highlights && (
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
              })}
            </div>
          </section>

          {/* 04. Mobile & Smart TV */}
          <section id="devices" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>04</span>
              <h2 className={styles.sectionTitle}>Mobile &amp; Smart TV</h2>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.filter((f) => f.sectionId === 'devices').map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                    <button onClick={() => toggleFaq(faq.id)} className={styles.questionButton} type="button">
                      <div className={styles.questionTextGroup}>
                        <span className={styles.categoryBadge}>{faq.category}</span>
                        <span className={styles.questionTitle}>{faq.question}</span>
                      </div>
                      <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={styles.answerBody}>
                        <p className={styles.answerText}>{faq.answer}</p>
                        {faq.highlights && (
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
              })}
            </div>
          </section>

          {/* 05. Safety & Legal */}
          <section id="safety" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>05</span>
              <h2 className={styles.sectionTitle}>Safety &amp; legal</h2>
            </div>
            <div className={styles.faqList}>
              {filteredFaqs.filter((f) => f.sectionId === 'safety').map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                    <button onClick={() => toggleFaq(faq.id)} className={styles.questionButton} type="button">
                      <div className={styles.questionTextGroup}>
                        <span className={styles.categoryBadge}>{faq.category}</span>
                        <span className={styles.questionTitle}>{faq.question}</span>
                      </div>
                      <ChevronDown size={20} className={`${styles.arrowIcon} ${isOpen ? styles.arrowRotated : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={styles.answerBody}>
                        <p className={styles.answerText}>{faq.answer}</p>
                        {faq.highlights && (
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
              })}
            </div>
          </section>

          {/* Empty State when search matches nothing */}
          {filteredFaqs.length === 0 && (
            <div className={styles.emptyState}>
              <AlertCircle size={32} className={styles.emptyIcon} />
              <p>No questions found matching your search term.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className={styles.resetBtn}
                type="button"
              >
                Reset FAQ Filters
              </button>
            </div>
          )}

          {/* 06. Still Need Help? */}
          <section id="support" className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>06</span>
              <h2 className={styles.sectionTitle}>Still need help?</h2>
            </div>
            <div className={styles.channelsGrid}>
              <div className={styles.channelCard}>
                <div className={styles.channelRole}>
                  <MessageSquare size={14} className={styles.channelIcon} />
                  <span>Technical Support</span>
                </div>
                <h3 className={styles.channelTitle}>Contact Support Desk</h3>
                <p className={styles.channelDesc}>
                  Encountering player errors, broken links, or need account recovery? Our support agents respond in under 12 hours.
                </p>
                <Link href="/contact" className={styles.channelLink}>
                  Open Support Ticket &rarr;
                </Link>
              </div>

              <div className={styles.channelCard}>
                <div className={styles.channelRole}>
                  <ShieldCheck size={14} className={styles.channelIcon} />
                  <span>Creator Portal</span>
                </div>
                <h3 className={styles.channelTitle}>Content Removal</h3>
                <p className={styles.channelDesc}>
                  Are you an independent doujin circle or animator seeking courtesy delisting? Submit your removal request directly.
                </p>
                <Link href="/content-removal" className={styles.channelLink}>
                  Open Removal Portal &rarr;
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
