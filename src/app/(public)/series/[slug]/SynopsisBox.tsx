'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './series.module.css';

interface SynopsisBoxProps {
  description: string;
}

export default function SynopsisBox({ description }: SynopsisBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const text = (description || '').trim();
  const isLong = text.length > 200;

  return (
    <div className={styles.synopsisBox}>
      <h3 className={styles.synopsisLabel}>SYNOPSIS</h3>
      <div className={styles.synopsisContentWrap}>
        <p
          className={`${styles.synopsisText} ${
            !expanded && isLong ? styles.synopsisCollapsed : ''
          }`}
        >
          {text || 'No detailed description available.'}
        </p>
        {!expanded && isLong && <div className={styles.synopsisFadeOverlay} />}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={styles.readMoreToggleBtn}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Show less' : 'Read more'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
  );
}
