'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './series.module.css';

interface SynopsisBoxProps {
  description: string;
}

export default function SynopsisBox({ description }: SynopsisBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (description || '').length > 200;

  return (
    <div className={styles.synopsisBox}>
      <h3 className={styles.synopsisLabel}>Synopsis</h3>
      <p className={`${styles.synopsisText} ${!expanded && isLong ? styles.synopsisCollapsed : ''}`}>
        {description}
      </p>
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className={styles.seeMoreBtn}
          type="button"
        >
          <span>{expanded ? 'See Less' : 'See More'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
  );
}
