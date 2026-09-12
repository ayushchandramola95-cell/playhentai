'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import styles from './error.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Unhandled runtime application error:', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={32} />
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.subtitle}>
          An unexpected error occurred while processing this request. Our system has logged the event.
        </p>

        {error.digest && (
          <div className={styles.errorDigest}>
            Reference Code: {error.digest}
          </div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            onClick={() => reset()}
            className={styles.retryBtn}
          >
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
          <Link href="/" className={styles.homeBtn}>
            <Home size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
