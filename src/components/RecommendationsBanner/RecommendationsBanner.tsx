'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from '@/app/(public)/page.module.css';

export default function RecommendationsBanner() {
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUser(data.user);
      }).catch(() => {});
    } catch (e) {}
  }, []);

  if (isClient && user) {
    return (
      <section className={`${styles.section} ${styles.recommendationBanner} glass`}>
        <div className={styles.recIconWrapper}>
          <Award size={36} />
        </div>
        <div className={styles.recContent}>
          <h3>Welcome Back!</h3>
          <p>Quickly access your saved bookmarks in Watchlist or resume watching from your Watch History.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
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
