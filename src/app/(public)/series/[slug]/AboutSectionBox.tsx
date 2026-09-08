'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './series.module.css';

interface AboutSectionBoxProps {
  title: string;
  aboutData?: any;
  aboutTextLegacy?: string;
}

export default function AboutSectionBox({
  title,
  aboutData,
  aboutTextLegacy = '',
}: AboutSectionBoxProps) {
  const [expanded, setExpanded] = useState(false);

  let sections: { key: string; title: string; content: string }[] = [];

  if (
    aboutData &&
    typeof aboutData === 'object' &&
    (aboutData.overview || aboutData.production || aboutData.themes || aboutData.recommended)
  ) {
    sections = [
      { key: 'overview', title: 'Overview', content: aboutData.overview },
      { key: 'production', title: 'Production & Presentation', content: aboutData.production },
      { key: 'themes', title: 'Themes & Style', content: aboutData.themes },
      { key: 'recommended', title: 'Recommended For', content: aboutData.recommended },
    ].filter((s) => s.content && s.content.trim());
  }

  const hasContent = sections.length > 0 || Boolean(aboutTextLegacy && aboutTextLegacy.trim());
  if (!hasContent) return null;

  return (
    <section className={styles.aboutSection}>
      <div className={`${styles.aboutCard} glass`}>
        <h2 className={styles.aboutHeading}>About {title}</h2>

        <div className={styles.aboutContentWrap}>
          <div className={`${styles.aboutSectionsList} ${!expanded ? styles.aboutCollapsedMobile : ''}`}>
            {sections.length > 0 ? (
              sections.map((sec) => (
                <div key={sec.key} className={styles.aboutSectionItem}>
                  <h3 className={styles.aboutSubHeading}>{sec.title}</h3>
                  <p className={styles.aboutTextContent}>{sec.content}</p>
                </div>
              ))
            ) : (
              <p className={styles.aboutTextContent}>{aboutTextLegacy}</p>
            )}
          </div>

          {!expanded && <div className={styles.aboutFadeOverlay} />}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={styles.aboutReadMoreBtn}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Show less' : 'Read more details'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </section>
  );
}
