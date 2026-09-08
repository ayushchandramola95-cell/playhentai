'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  variant?: 'default' | 'pill' | 'iconOnly';
}

export default function ShareButton({
  title,
  text,
  url,
  className,
  variant = 'default',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = text || `Watch ${title} on PlayHentai`;

    // Try native Web Share API on mobile / supported devices
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }

    // Fallback: Copy link to clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  return (
    <div className={styles.shareWrapper}>
      <button
        type="button"
        onClick={handleShare}
        className={`${styles.shareBtn} ${variant === 'pill' ? styles.pillVariant : ''} ${variant === 'iconOnly' ? styles.iconOnlyVariant : ''} ${copied ? styles.copiedBtn : ''} ${className || ''}`}
        aria-label={copied ? 'Link copied to clipboard' : 'Share series'}
        title={copied ? 'Link copied!' : 'Share series'}
      >
        {copied ? (
          <>
            <Check size={16} className={styles.checkIcon} />
            {variant !== 'iconOnly' && <span>Copied!</span>}
          </>
        ) : (
          <>
            <Share2 size={16} className={styles.shareIcon} />
            {variant !== 'iconOnly' && <span>Share</span>}
          </>
        )}
      </button>

      {copied && <span className={styles.toastTooltip}>Link copied!</span>}
    </div>
  );
}
