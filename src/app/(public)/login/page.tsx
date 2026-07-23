'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tv, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './login.module.css';

function LoginForm() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirectTo') || '/';

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user && !authLoading) {
      router.push(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          router.push(redirectTo);
        }
      } else {
        if (!username.trim()) {
          setError('Username is required.');
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, username.trim());
        if (res.error) {
          setError(res.error);
        } else {
          // Supabase signup might require email confirmation, but with default settings
          // it logs in immediately or sends verification email.
          setError(null);
          alert('Registration successful! Please check your email for verification link if enabled, or sign in.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.authCard} glass`}>
      <div className={styles.cardHeader}>
        <div className={styles.logoRow}>
          <Tv size={36} className={styles.logoIcon} />
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>StreamNexus</span>
        </div>
        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p>{isLogin ? 'Access your watchlist and history logs' : 'Sign up to start saving and tracking your shows'}</p>
      </div>

      {/* Tab Selection */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${isLogin ? styles.activeTab : ''}`}
          onClick={() => {
            setIsLogin(true);
            setError(null);
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${!isLogin ? styles.activeTab : ''}`}
          onClick={() => {
            setIsLogin(false);
            setError(null);
          }}
        >
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Email input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Email Address</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} className={styles.inputIcon} />
            <input
              type="email"
              required
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Username input (Register only) */}
        {!isLogin && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                required
                className={styles.input}
                placeholder="e.g. otaku_samurai"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Password input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} className={styles.inputIcon} />
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? (
            <div className={styles.loadingSpinner} />
          ) : (
            <>
              <span>{isLogin ? 'Sign In' : 'Register Now'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <Suspense fallback={
        <div className={`${styles.authCard} glass`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className={styles.loadingSpinner} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)', borderTopColor: 'var(--primary)', width: '32px', height: '32px' }} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
