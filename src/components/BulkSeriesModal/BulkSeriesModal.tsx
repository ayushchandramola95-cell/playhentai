'use client';

import React, { useState, useMemo } from 'react';
import { Layers, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import styles from './BulkSeriesModal.module.css';

interface BulkSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedSeries {
  title: string;
  release_year: number | null;
}

export default function BulkSeriesModal({ isOpen, onClose, onSuccess }: BulkSeriesModalProps) {
  const [rawText, setRawText] = useState('');
  const [defaultStudio, setDefaultStudio] = useState('');
  const [defaultTagsInput, setDefaultTagsInput] = useState('Uncensored, HD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parse lines dynamically
  const parsedItems: ParsedSeries[] = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split('\n');
    const items: ParsedSeries[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      let title = line;
      let year: number | null = null;

      // Check for tab separation (from spreadsheets)
      if (line.includes('\t')) {
        const parts = line.split('\t');
        title = parts[0].trim();
        const yearPart = parseInt(parts[1]?.trim(), 10);
        if (!isNaN(yearPart) && yearPart >= 1970 && yearPart <= 2035) {
          year = yearPart;
        }
      }
      // Check for pipe separation: Title | 2024
      else if (line.includes('|')) {
        const parts = line.split('|');
        title = parts[0].trim();
        const yearPart = parseInt(parts[1]?.trim(), 10);
        if (!isNaN(yearPart) && yearPart >= 1970 && yearPart <= 2035) {
          year = yearPart;
        }
      }
      // Check for comma separation: Title, 2024
      else if (line.includes(',')) {
        const lastCommaIdx = line.lastIndexOf(',');
        const afterComma = line.slice(lastCommaIdx + 1).trim();
        const yearPart = parseInt(afterComma, 10);
        if (!isNaN(yearPart) && yearPart >= 1970 && yearPart <= 2035) {
          title = line.slice(0, lastCommaIdx).trim();
          year = yearPart;
        }
      }
      // Check for trailing parentheses year: Title (2024)
      else {
        const match = line.match(/^(.*?)\s*\((\d{4})\)\s*$/);
        if (match) {
          title = match[1].trim();
          year = parseInt(match[2], 10);
        }
      }

      if (title) {
        items.push({ title, release_year: year });
      }
    }

    return items;
  }, [rawText]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (parsedItems.length === 0) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const defaultTags = defaultTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      items: parsedItems.map(item => ({
        title: item.title,
        release_year: item.release_year,
        studio: defaultStudio.trim() || undefined,
        tags: defaultTags
      }))
    };

    try {
      const res = await fetch('/api/admin/series/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create series in bulk');
      }

      setStatusMessage({
        type: 'success',
        text: `🎉 Successfully created ${data.createdCount || parsedItems.length} series in Draft with Season 1 ready!`
      });

      setRawText('');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred while creating series'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <Layers size={20} color="#a855f7" />
            <span>Bulk Add Series (Draft Mode)</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.instructionsBox}>
            💡 <strong>Quick Bulk Upload Instructions:</strong>
            <br />
            Paste your list of titles and release years below (one series per line).
            <br />
            Accepted formats:
            <br />
            • <code>Title, 2024</code> (Comma)
            <br />
            • <code>Title [Tab] 2024</code> (Direct copy-paste from Excel / Google Sheets)
            <br />
            • <code>Title | 2024</code> (Pipe) or <code>Title (2024)</code>
            <br />
            • Or just <code>Title</code> (year optional)
            <br />
            <br />
            <em>All series are created in <strong>Draft (Hidden)</strong> status with <strong>Season 1</strong> automatically attached so you can start uploading episodes immediately!</em>
          </div>

          <div>
            <div className={styles.label}>
              <span>Paste Series List</span>
              {parsedItems.length > 0 && (
                <span className={styles.badge}>
                  ✓ {parsedItems.length} {parsedItems.length === 1 ? 'Series' : 'Series'} Parsed
                </span>
              )}
            </div>
            <textarea
              className={styles.textarea}
              placeholder={`Kanojo Saimin, 2024\nOverflow, 2020\nMaster Piece, 2021\nInaka ni wa Kore Kurai Shika Goraku ga Nai, 2023`}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.optionsRow}>
            <div>
              <div className={styles.label}>Default Studio (Optional)</div>
              <input
                className={styles.input}
                placeholder="e.g. Queen Bee, Mary Jane"
                value={defaultStudio}
                onChange={e => setDefaultStudio(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <div className={styles.label}>Default Tags</div>
              <input
                className={styles.input}
                placeholder="e.g. Uncensored, HD, Subbed"
                value={defaultTagsInput}
                onChange={e => setDefaultTagsInput(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {statusMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              background: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
            }}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting || parsedItems.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating {parsedItems.length} Draft Series...</span>
              </>
            ) : (
              <>
                <Layers size={16} />
                <span>Create {parsedItems.length > 0 ? `${parsedItems.length} Series` : 'Series'} (Drafts)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
