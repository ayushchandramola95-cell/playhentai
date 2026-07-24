'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './series.module.css';

interface MobileTagsRowProps {
  tags: string[];
}

export default function MobileTagsRow({ tags }: MobileTagsRowProps) {
  const [expanded, setExpanded] = useState(false);

  const filteredTags = tags.filter(
    (t: string) => t.toLowerCase() !== 'featured' && !t.toLowerCase().startsWith('featured:')
  );

  if (filteredTags.length === 0) return null;

  const visibleTags = expanded ? filteredTags : filteredTags.slice(0, 3);
  const remainingCount = filteredTags.length - 3;

  return (
    <div className={styles.inlineTagsRow}>
      {visibleTags.map((tag: string) => (
        <Link key={tag} href={`/categories?genre=${encodeURIComponent(tag)}`} className={styles.tagPillGoldMobile}>
          {tag}
        </Link>
      ))}
      {!expanded && remainingCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className={styles.tagPlusCountBtnMobile}
          type="button"
        >
          +{remainingCount}
        </button>
      )}
      {expanded && filteredTags.length > 3 && (
        <button
          onClick={() => setExpanded(false)}
          className={styles.tagShowLessBtnMobile}
          type="button"
        >
          Less
        </button>
      )}
    </div>
  );
}
