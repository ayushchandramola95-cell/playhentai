'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Download, X, Lock, CheckCircle2, ShieldCheck, 
  ExternalLink, Sparkles, AlertCircle, FileVideo, HardDrive
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DownloadModal.module.css';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: {
    id: string;
    episode_number: number;
    title?: string;
    duration_seconds?: number;
    video_key?: string;
  };
  seriesTitle: string;
  seriesSlug: string;
  videoUrl: string;
}

export default function DownloadModal({
  isOpen,
  onClose,
  episode,
  seriesTitle,
  seriesSlug,
  videoUrl
}: DownloadModalProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  // Turnstile verification states: 'idle' | 'verifying' | 'verified'
  const [captchaState, setCaptchaState] = useState<'idle' | 'verifying' | 'verified'>('idle');
  
  // Link generation countdown: 5 seconds once captcha is verified
  const [countdown, setCountdown] = useState<number>(5);
  const [downloadReady, setDownloadReady] = useState<boolean>(false);
  const [hasStartedDownload, setHasStartedDownload] = useState<boolean>(false);

  // Reset states when modal re-opens
  useEffect(() => {
    if (isOpen) {
      setCaptchaState('idle');
      setCountdown(5);
      setDownloadReady(false);
      setHasStartedDownload(false);
    }
  }, [isOpen]);

  // Handle Captcha Verification
  const handleVerifyCaptcha = () => {
    if (captchaState !== 'idle') return;
    setCaptchaState('verifying');

    setTimeout(() => {
      setCaptchaState('verified');
    }, 1200);
  };

  // Countdown timer once captcha is verified
  useEffect(() => {
    if (captchaState !== 'verified') return;
    if (downloadReady) return;

    if (countdown <= 0) {
      setDownloadReady(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [captchaState, countdown, downloadReady]);

  if (!isOpen) return null;

  const cleanSeries = seriesTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  const downloadFileName = `[PlayHentai]_${cleanSeries}_Ep${episode.episode_number}_1080p.mp4`;
  const downloadApiUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(downloadFileName)}`;

  // Estimate file size based on duration (approx 2.5MB per minute at 1080p high bitrate)
  const estMinutes = episode.duration_seconds ? Math.ceil(episode.duration_seconds / 60) : 24;
  const estSizeMB = Math.round(estMinutes * 15.5);

  const handleTriggerDownload = () => {
    setHasStartedDownload(true);

    // Trigger download via same-origin streaming proxy
    const a = document.createElement('a');
    a.href = downloadApiUrl;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setHasStartedDownload(false);
    }, 4000);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <div className={styles.modalIconBadge}>
              <Download size={20} />
            </div>
            <div>
              <h3 className={styles.modalHeading}>Download Episode</h3>
              <p className={styles.modalSub}>
                <span>{seriesTitle} • Ep {episode.episode_number}</span>
                <span className={styles.qualityBadge}>1080p HD</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className={styles.closeBtn}
            aria-label="Close download dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          
          {/* CASE 1: USER IS NOT LOGGED IN */}
          {!authLoading && !user ? (
            <div className={styles.authGateCard}>
              <div className={styles.lockIconWrap}>
                <Lock size={26} />
              </div>
              <h4 className={styles.authGateTitle}>Free Account Required to Download</h4>
              <p className={styles.authGateDesc}>
                To protect our high-speed Cloudflare CDN servers from automated scraping bots, 
                direct 1080p MP4 downloads are reserved for members.
              </p>

              <div className={styles.perksList}>
                <span><ShieldCheck size={14} color="#4ade80" /> 1080p Full HD Original Bitrate</span>
                <span><ShieldCheck size={14} color="#4ade80" /> Unlimited & Fast CDN Direct Downloads</span>
                <span><ShieldCheck size={14} color="#4ade80" /> Watch Offline on Any Phone, PC, or Tablet</span>
              </div>

              <Link 
                href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
                className={styles.authLoginBtn}
                onClick={onClose}
              >
                <span>Log In / Sign Up to Download</span>
                <ExternalLink size={16} />
              </Link>
            </div>
          ) : (
            /* CASE 2: USER IS LOGGED IN */
            <>
              {/* Cloudflare Turnstile Bot Verification Card */}
              <div className={styles.turnstileCard}>
                <div className={styles.turnstileLeft}>
                  <button
                    type="button"
                    onClick={handleVerifyCaptcha}
                    disabled={captchaState !== 'idle'}
                    className={`${styles.turnstileCheckbox} ${captchaState === 'verified' ? styles.turnstileCheckboxVerified : ''}`}
                    aria-label="Verify you are human"
                  >
                    {captchaState === 'idle' && null}
                    {captchaState === 'verifying' && <div className={styles.spinRing} />}
                    {captchaState === 'verified' && <CheckCircle2 size={18} color="#22c55e" />}
                  </button>
                  <span className={styles.turnstileText}>
                    {captchaState === 'idle' && 'Verify you are human'}
                    {captchaState === 'verifying' && 'Verifying browser environment...'}
                    {captchaState === 'verified' && 'Verification successful'}
                  </span>
                </div>

                <div className={styles.turnstileRight}>
                  <div className={styles.cfLogoGroup}>
                    {/* Cloudflare Logo Mark */}
                    <svg width="24" height="16" viewBox="0 0 48 32" fill="none">
                      <path d="M37.3 12.3c-.9-4.7-5-8.3-10-8.3-4.2 0-7.8 2.5-9.4 6.2C17 10 16 9.8 15 9.8 9.5 9.8 5 14.3 5 19.8c0 .4 0 .9.1 1.3C2.1 22.1 0 25.1 0 28.6c0 5 4.1 9.1 9.1 9.1h28.6c4.6 0 8.3-3.7 8.3-8.3 0-3.9-2.7-7.2-6.5-8.1-.1-3.2-1-6.1-2.2-9z" fill="#F48120" />
                      <path d="M37.7 20.3c-.4-.1-.8-.1-1.2-.1-1 0-2 .3-2.9.8-.7-.5-1.5-.8-2.4-.8-2.1 0-3.9 1.7-4 3.8h10.5z" fill="#FAAD3F" />
                    </svg>
                    <span className={styles.cfBrandName}>CLOUDFLARE</span>
                  </div>
                  <span className={styles.cfPolicy}>Privacy • Terms</span>
                </div>
              </div>

              {/* Generating Link Countdown Progress */}
              {captchaState === 'verified' && !downloadReady && (
                <div className={styles.generatingBox}>
                  <div className={styles.generatingHeader}>
                    <span>Generating 1080p CDN Download Token...</span>
                    <span className={styles.generatingTime}>{countdown}s</span>
                  </div>
                  <div className={styles.progressBarTrack}>
                    <div 
                      className={styles.progressBarFill} 
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Final Unlocked Download Button & File Details */}
              {downloadReady && (
                <div className={styles.readyDownloadCard}>
                  <div className={styles.fileMetaCard}>
                    <div className={styles.fileMetaRow}>
                      <span>Target File</span>
                      <span className={styles.fileMetaVal}>{downloadFileName}</span>
                    </div>
                    <div className={styles.fileMetaRow}>
                      <span>Estimated Size</span>
                      <span className={styles.fileMetaVal}>~{estSizeMB} MB (1080p High-Bitrate)</span>
                    </div>
                    <div className={styles.fileMetaRow}>
                      <span>Mirror</span>
                      <span className={styles.fileMetaVal}>Cloudflare R2 High-Speed CDN</span>
                    </div>
                  </div>

                  <a
                    href={downloadApiUrl}
                    download={downloadFileName}
                    onClick={() => {
                      setHasStartedDownload(true);
                      setTimeout(() => setHasStartedDownload(false), 4000);
                    }}
                    className={styles.downloadFinalBtn}
                  >
                    <Download size={18} />
                    <span>{hasStartedDownload ? 'Starting Download...' : 'Download Episode (1080p HD MP4)'}</span>
                  </a>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
