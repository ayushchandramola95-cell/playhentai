'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tv, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn(cleanEmail, password);
        if (res.error) {
          setError(res.error);
        } else {
          router.push(redirectTo);
        }
      } else {
        const cleanUsername = username.trim();
        if (!cleanUsername) {
          setError('Username is required.');
          setLoading(false);
          return;
        }
        if (cleanUsername.length < 3) {
          setError('Username must be at least 3 characters.');
          setLoading(false);
          return;
        }

        const res = await signUp(cleanEmail, password, cleanUsername);
        if (res.error) {
          setError(res.error);
        } else {
          setError(null);
          setSuccessMessage('Registration successful! You can now sign in with your credentials.');
          setIsLogin(true);
          setPassword('');
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
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>PlayHentai</span>
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
            setSuccessMessage(null);
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
            setSuccessMessage(null);
          }}
        >
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Success Alert Banner */}
        {successMessage && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

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
              type={showPassword ? 'text' : 'password'}
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
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
