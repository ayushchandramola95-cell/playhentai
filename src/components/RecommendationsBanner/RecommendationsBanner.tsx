'use client';

import React from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './RecommendationsBanner.module.css';

export default function RecommendationsBanner() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return (
      <section className={`${styles.section} ${styles.recommendationBanner} glass`}>
        <div className={styles.recIconWrapper}>
          <Award size={36} />
        </div>
        <div className={styles.recContent}>
          <h3>Welcome Back!</h3>
          <p>Quickly access your saved bookmarks in Watchlist or resume watching from your Watch History.</p>
        </div>
        <div className={styles.btnGroup}>
          <Link href="/watchlist" prefetch={false} className={styles.recBtn}>
            My Watchlist
          </Link>
          <Link href="/history" prefetch={false} className={`${styles.recBtn} ${styles.recBtnOutline}`}>
            Watch History
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles.recommendationBanner} glass`}>
      <div className={styles.recIconWrapper}>
        <Award size={36} />
      </div>
      <div className={styles.recContent}>
        <h3>Want personalized recommendations?</h3>
        <p>Sign in to record views, calculate trending statistics, and keep track of your watch history.</p>
      </div>
      <Link href="/login" prefetch={false} className={styles.recBtn}>
        Sign In Now
      </Link>
    </section>
  );
}
