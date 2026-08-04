'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import styles from './BackToTop.module.css';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`${styles.btn} ${visible ? styles.visible : ''}`}
      aria-label="Back to top"
      title="Back to top"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
