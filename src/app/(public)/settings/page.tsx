'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ShieldCheck, Check, AlertCircle, Eye, EyeOff, Lock, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 33, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score: 66, label: 'Medium', color: '#f59e0b' };
    return { score: 100, label: 'Strong & Secure 💪', color: '#22c55e' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setUpdating(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to update password');
      } else {
        setSuccessMsg('Your password has been successfully updated to a strong new password!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to server');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>Loading account settings...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={`${styles.cardShell} glass`}>
          <Lock size={48} className={styles.iconMuted} />
          <h2>Access Restricted</h2>
          <p>Please sign in to access your account & security settings.</p>
          <Link href="/login" className={styles.actionBtn}>Sign In / Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="ambient-glow" />

      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Catalog
      </Link>

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <ShieldCheck size={32} className={styles.headerIcon} />
          <h1>Account & Security</h1>
        </div>
        <p className={styles.subtext}>
          Manage your account credentials, security preferences, and update your password.
        </p>
      </div>

      <div className={styles.settingsGrid}>
        {/* Left Column: Account Profile Info */}
        <div className={`${styles.infoCard} glass`}>
          <div className={styles.cardHeader}>
            <User size={20} className={styles.cardHeaderIcon} />
            <h3>Profile Summary</h3>
          </div>

          <div className={styles.profileDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email Address</span>
              <span className={styles.detailValue}>{user.email}</span>
            </div>
            
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Username</span>
              <span className={styles.detailValue}>{profile?.username || 'User'}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Account Access Role</span>
              <span className={profile?.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                {profile?.role === 'admin' ? '🛡️ Administrator' : '👤 Member'}
              </span>
            </div>
          </div>

          <div className={styles.securityNote}>
            <ShieldCheck size={18} />
            <span>Admin Dashboard access is strictly protected and visible only to account role <strong>Admin</strong>. Normal visitors cannot see or access it.</span>
          </div>
        </div>

        {/* Right Column: Password Change Form */}
        <div className={`${styles.formCard} glass`}>
          <div className={styles.cardHeader}>
            <KeyRound size={20} className={styles.cardHeaderIcon} />
            <h3>Change Password</h3>
          </div>

          {errorMsg && (
            <div className={styles.errorAlert}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className={styles.successAlert}>
              <Check size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="newPassword">New Strong Password</label>
              <div className={styles.inputWrapper}>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeBtn}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className={styles.strengthBox}>
                  <div className={styles.strengthBarTrack}>
                    <div 
                      className={styles.strengthBarFill}
                      style={{ 
                        width: `${strength.score}%`, 
                        background: strength.color 
                      }}
                    />
                  </div>
                  <span style={{ color: strength.color }} className={styles.strengthLabel}>
                    Strength: {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className={styles.input}
              />
            </div>

            <button 
              type="submit" 
              disabled={updating || !newPassword || !confirmPassword}
              className={styles.submitBtn}
            >
              {updating ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
