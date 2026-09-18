'use client';

import React, { useState, useMemo } from 'react';
import { 
  SlidersHorizontal, 
  X, 
  Search, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Copy, 
  FileSpreadsheet, 
  Layers, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import styles from './BulkSeriesEditModal.module.css';

interface SeriesItem {
  id: string;
  title: string;
  slug: string;
  studio?: string;
  release_year?: number;
  status?: string;
  is_published: boolean;
  content_rating?: string;
  age_rating?: string;
  runtime?: number;
  tags?: string[];
  first_air_date?: string | null;
  last_air_date?: string | null;
  description?: string;
}

interface BulkSeriesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seriesList: SeriesItem[];
}

export type EditableFieldKey = 
  | 'studio'
  | 'release_year'
  | 'status'
  | 'content_rating'
  | 'age_rating'
  | 'is_published'
  | 'tags'
  | 'runtime'
  | 'first_air_date'
  | 'last_air_date'
  | 'description';

interface FieldOption {
  key: EditableFieldKey;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: { value: string; label: string }[];
}

const AVAILABLE_FIELDS: FieldOption[] = [
  { key: 'studio', label: 'Studio', placeholder: 'e.g. PoJu, Millepensee', type: 'text' },
  { key: 'release_year', label: 'Release Year', placeholder: 'e.g. 2024', type: 'number' },
  { 
    key: 'status', 
    label: 'Show Status', 
    placeholder: 'Select Status', 
    type: 'select',
    options: [
      { value: 'ongoing', label: 'Ongoing' },
      { value: 'completed', label: 'Completed' },
      { value: 'finalized', label: 'Finalized' },
      { value: 'upcoming', label: 'Upcoming' }
    ]
  },
  { 
    key: 'content_rating', 
    label: 'Content Rating', 
    placeholder: 'Select Rating', 
    type: 'select',
    options: [
      { value: 'explicit', label: 'Explicit' },
      { value: 'uncensored', label: 'Uncensored' },
      { value: 'censored', label: 'Censored' }
    ]
  },
  { 
    key: 'age_rating', 
    label: 'Age Rating', 
    placeholder: 'Select Age', 
    type: 'select',
    options: [
      { value: '18+', label: '18+' },
      { value: '16+', label: '16+' },
      { value: '13+', label: '13+' }
    ]
  },
  { 
    key: 'is_published', 
    label: 'Publication State', 
    placeholder: 'Select State', 
    type: 'select',
    options: [
      { value: 'true', label: 'Live Published' },
      { value: 'false', label: 'Draft (Hidden)' }
    ]
  },
  { key: 'tags', label: 'Tags (comma separated)', placeholder: 'e.g. Uncensored, Fantasy, 3D', type: 'text' },
  { key: 'runtime', label: 'Runtime (minutes)', placeholder: 'e.g. 24', type: 'number' },
  { key: 'first_air_date', label: 'First Air Date', placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'last_air_date', label: 'Last Air Date', placeholder: 'YYYY-MM-DD', type: 'date' },
  { key: 'description', label: 'Synopsis / Description', placeholder: 'Series synopsis...', type: 'text' },
];

export default function BulkSeriesEditModal({
  isOpen,
  onClose,
  onSuccess,
  seriesList
}: BulkSeriesEditModalProps) {
  const [activeTab, setActiveTab] = useState<'select' | 'options' | 'preview'>('select');
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'draft' | 'published' | 'selected'>('all');

  // Fields user chose to edit
  const [selectedFields, setSelectedFields] = useState<Set<EditableFieldKey>>(new Set(['studio', 'release_year']));

  // Edit Mode: TSV Paste vs Common Values
  const [inputMode, setInputMode] = useState<'tsv' | 'common'>('tsv');
  const [tsvText, setTsvText] = useState('');
  const [tagUpdateMode, setTagUpdateMode] = useState<'replace' | 'append'>('replace');

  // Common values state
  const [commonValues, setCommonValues] = useState<Partial<Record<EditableFieldKey, any>>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedHeader, setCopiedHeader] = useState(false);

  // Filtered series list for selection tab
  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || (s.studio || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (filterType === 'draft') return !s.is_published;
      if (filterType === 'published') return s.is_published;
      if (filterType === 'selected') return selectedSeriesIds.has(s.id);
      return true;
    });
  }, [seriesList, searchQuery, filterType, selectedSeriesIds]);

  // Handle selection toggles
  const toggleSelectSeries = (id: string) => {
    setSelectedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedSeriesIds((prev) => {
      const next = new Set(prev);
      filteredSeries.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedSeriesIds(new Set());
  };

  const toggleFieldOption = (key: EditableFieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Build TSV header template for user copy
  const tsvExpectedHeader = useMemo(() => {
    const fields = Array.from(selectedFields).map((f) => {
      const found = AVAILABLE_FIELDS.find((af) => af.key === f);
      return found ? found.label : f;
    });
    return `Series Slug / Title\t${fields.join('\t')}`;
  }, [selectedFields]);

  const handleCopyHeader = () => {
    navigator.clipboard.writeText(tsvExpectedHeader);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  // Parse TSV rows and compute diff updates
  const parsedUpdates = useMemo(() => {
    const updates: Array<{
      series: SeriesItem;
      changes: Record<string, any>;
      diffs: Array<{ field: string; oldVal: string; newVal: string }>;
    }> = [];

    const fieldKeys = Array.from(selectedFields);

    if (inputMode === 'common') {
      // Apply common values to all selected series
      selectedSeriesIds.forEach((id) => {
        const s = seriesList.find((item) => item.id === id);
        if (!s) return;

        const changes: Record<string, any> = {};
        const diffs: Array<{ field: string; oldVal: string; newVal: string }> = [];

        fieldKeys.forEach((key) => {
          const val = commonValues[key];
          if (val === undefined || val === '') return;

          let finalVal = val;
          if (key === 'release_year' || key === 'runtime') {
            finalVal = parseInt(val, 10) || null;
          } else if (key === 'is_published') {
            finalVal = val === 'true';
          } else if (key === 'tags') {
            const newTags = String(val).split(',').map((t) => t.trim()).filter(Boolean);
            if (tagUpdateMode === 'append') {
              const merged = Array.from(new Set([...(s.tags || []), ...newTags]));
              finalVal = merged;
            } else {
              finalVal = newTags;
            }
          }

          changes[key] = finalVal;
          const oldVal = key === 'tags' ? (s.tags || []).join(', ') : String((s as any)[key] ?? 'N/A');
          const newValDisplay = key === 'tags' ? (finalVal as string[]).join(', ') : String(finalVal ?? 'N/A');
          diffs.push({ field: key, oldVal, newVal: newValDisplay });
        });

        if (Object.keys(changes).length > 0) {
          updates.push({ series: s, changes, diffs });
        }
      });
      return updates;
    }

    // TSV Mode
    if (!tsvText.trim() || fieldKeys.length === 0) return [];

    const lines = tsvText.split('\n');
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Ignore header row if pasted
      if (line.toLowerCase().startsWith('series slug') || line.toLowerCase().startsWith('title\t') || line.toLowerCase().startsWith('series\t')) {
        continue;
      }

      // Delimiter detection (Tab, Pipe, Comma)
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        parts = [line];
      }

      const identifier = parts[0]?.trim();
      if (!identifier) continue;

      // Match against seriesList by slug or title
      const matched = seriesList.find((s) => 
        s.slug.toLowerCase() === identifier.toLowerCase() ||
        s.title.toLowerCase() === identifier.toLowerCase()
      );

      if (!matched) continue;

      const changes: Record<string, any> = {};
      const diffs: Array<{ field: string; oldVal: string; newVal: string }> = [];

      fieldKeys.forEach((key, idx) => {
        const rawColVal = parts[idx + 1]?.trim();
        if (rawColVal === undefined || rawColVal === '') return;

        let finalVal: any = rawColVal;
        if (key === 'release_year' || key === 'runtime') {
          finalVal = parseInt(rawColVal, 10) || null;
        } else if (key === 'is_published') {
          finalVal = rawColVal.toLowerCase() === 'true' || rawColVal.toLowerCase() === 'live' || rawColVal.toLowerCase() === 'published';
        } else if (key === 'tags') {
          const newTags = rawColVal.split(',').map((t) => t.trim()).filter(Boolean);
          if (tagUpdateMode === 'append') {
            finalVal = Array.from(new Set([...(matched.tags || []), ...newTags]));
          } else {
            finalVal = newTags;
          }
        }

        changes[key] = finalVal;
        const oldVal = key === 'tags' ? (matched.tags || []).join(', ') : String((matched as any)[key] ?? 'N/A');
        const newValDisplay = key === 'tags' ? (finalVal as string[]).join(', ') : String(finalVal ?? 'N/A');
        diffs.push({ field: key, oldVal, newVal: newValDisplay });
      });

      if (Object.keys(changes).length > 0) {
        updates.push({ series: matched, changes, diffs });
      }
    }

    return updates;
  }, [inputMode, tsvText, selectedFields, selectedSeriesIds, seriesList, commonValues, tagUpdateMode]);

  if (!isOpen) return null;

  const handleApplyUpdates = async () => {
    if (parsedUpdates.length === 0) return;

    setIsSubmitting(true);
    setStatusNotice(null);

    try {
      const payload = {
        updates: parsedUpdates.map((u) => ({
          id: u.series.id,
          changes: u.changes
        }))
      };

      const res = await fetch('/api/admin/series/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply bulk updates');

      setStatusNotice({
        type: 'success',
        message: `Successfully updated ${data.updatedCount || parsedUpdates.length} series!`
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusNotice({
        type: 'error',
        message: err.message || 'Error occurred while saving bulk edits'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <SlidersHorizontal size={20} color="#f59e0b" />
            <span>Bulk Series Edit</span>
            <span className={styles.headerBadge}>Admin Batch Tool</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button 
            type="button" 
            className={`${styles.tabBtn} ${activeTab === 'select' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('select')}
          >
            <span>1. Select Series</span>
            <span className={styles.tabCountBadge}>{selectedSeriesIds.size}</span>
          </button>

          <button 
            type="button" 
            className={`${styles.tabBtn} ${activeTab === 'options' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('options')}
          >
            <span>2. Fields & Data</span>
            <span className={styles.tabCountBadge}>{selectedFields.size} fields</span>
          </button>

          <button 
            type="button" 
            className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <span>3. Preview & Apply</span>
            <span className={styles.tabCountBadge}>{parsedUpdates.length} ready</span>
          </button>
        </div>

        {/* Status Notice */}
        {statusNotice && (
          <div style={{ 
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: statusNotice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusNotice.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: statusNotice.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {statusNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusNotice.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className={styles.modalContent}>
          {/* TAB 1: SELECT SERIES */}
          {activeTab === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.searchBarRow}>
                <div className={styles.searchInputWrapper}>
                  <Search size={15} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by series title, slug, or studio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button type="button" onClick={selectAllFiltered} className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem' }}>
                    Select All ({filteredSeries.length})
                  </button>
                  <button type="button" onClick={deselectAll} className={styles.secondaryBtn} style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem' }}>
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(['all', 'published', 'draft', 'selected'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: filterType === t ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      color: filterType === t ? '#000' : '#94a3b8',
                      border: '1px solid ' + (filterType === t ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)')
                    }}
                  >
                    {t === 'all' && `All (${seriesList.length})`}
                    {t === 'published' && `Published (${seriesList.filter(s => s.is_published).length})`}
                    {t === 'draft' && `Drafts (${seriesList.filter(s => !s.is_published).length})`}
                    {t === 'selected' && `Selected (${selectedSeriesIds.size})`}
                  </button>
                ))}
              </div>

              {/* Series List */}
              <div className={styles.seriesSelectionList}>
                {filteredSeries.length > 0 ? (
                  filteredSeries.map((s) => {
                    const isChecked = selectedSeriesIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`${styles.seriesSelectItem} ${isChecked ? styles.seriesSelectItemActive : ''}`}
                        onClick={() => toggleSelectSeries(s.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${isChecked ? '#f59e0b' : '#64748b'}`,
                            background: isChecked ? '#f59e0b' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isChecked && <Check size={12} color="#000" strokeWidth={3} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#f8fafc' }}>
                              {s.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span>/{s.slug}</span>
                              {s.studio && <span>• {s.studio}</span>}
                              {s.release_year && <span>• {s.release_year}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: s.is_published ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: s.is_published ? '#4ade80' : '#facc15'
                          }}>
                            {s.is_published ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                    No series match your search filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT OPTIONS & TSV PASTE */}
          {activeTab === 'options' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Field Selectors */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
                  Select Fields to Edit:
                </label>
                <div className={styles.fieldGrid}>
                  {AVAILABLE_FIELDS.map((f) => {
                    const isChecked = selectedFields.has(f.key);
                    return (
                      <div
                        key={f.key}
                        className={`${styles.fieldCheckboxCard} ${isChecked ? styles.fieldCheckboxCardActive : ''}`}
                        onClick={() => toggleFieldOption(f.key)}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: `2px solid ${isChecked ? '#f59e0b' : '#64748b'}`,
                          background: isChecked ? '#f59e0b' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isChecked && <Check size={11} color="#000" strokeWidth={3} />}
                        </div>
                        <span className={styles.fieldLabel}>{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>Input Method:</span>
                <button
                  type="button"
                  onClick={() => setInputMode('tsv')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: inputMode === 'tsv' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    border: '1px solid ' + (inputMode === 'tsv' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'),
                    color: inputMode === 'tsv' ? '#fcd34d' : '#94a3b8'
                  }}
                >
                  Paste TSV / Spreadsheet
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('common')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: inputMode === 'common' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    border: '1px solid ' + (inputMode === 'common' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'),
                    color: inputMode === 'common' ? '#fcd34d' : '#94a3b8'
                  }}
                >
                  Set Common Values ({selectedSeriesIds.size} selected)
                </button>
              </div>

              {/* MODE A: TSV PASTE */}
              {inputMode === 'tsv' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className={styles.instructionsBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#fcd34d' }}>Expected TSV Format (Tab, Pipe, or Comma separated):</strong>
                      <button
                        type="button"
                        onClick={handleCopyHeader}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Copy size={11} />
                        <span>{copiedHeader ? 'Copied!' : 'Copy Header'}</span>
                      </button>
                    </div>
                    <code>{tsvExpectedHeader}</code>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Tip: You can copy directly from Excel or Google Sheets. Column 1 must match the series slug or title.
                    </div>
                  </div>

                  {selectedFields.has('tags') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <span>Tags handling:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tagMode"
                          checked={tagUpdateMode === 'replace'}
                          onChange={() => setTagUpdateMode('replace')}
                        />
                        <span>Replace all tags</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tagMode"
                          checked={tagUpdateMode === 'append'}
                          onChange={() => setTagUpdateMode('append')}
                        />
                        <span>Append to existing tags</span>
                      </label>
                    </div>
                  )}

                  <textarea
                    className={styles.textareaField}
                    placeholder={`Paste rows from Excel or TSV here...\nExample:\nyuutousei-ayaka-no-uraomote\tPoJu\t2024\nyouma-shoukan-e-youkoso\tMillepensee\t2023`}
                    value={tsvText}
                    onChange={(e) => setTsvText(e.target.value)}
                  />
                </div>
              ) : (
                /* MODE B: COMMON BATCH VALUES */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {Array.from(selectedFields).map((fieldKey) => {
                    const fieldConfig = AVAILABLE_FIELDS.find((f) => f.key === fieldKey);
                    if (!fieldConfig) return null;

                    return (
                      <div key={fieldKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                          {fieldConfig.label}
                        </label>
                        {fieldConfig.type === 'select' ? (
                          <select
                            style={{
                              padding: '0.6rem',
                              background: '#141824',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#f8fafc',
                              fontSize: '0.85rem'
                            }}
                            value={commonValues[fieldKey] ?? ''}
                            onChange={(e) => setCommonValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                          >
                            <option value="">-- Leave Unchanged --</option>
                            {fieldConfig.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fieldConfig.type}
                            placeholder={fieldConfig.placeholder}
                            style={{
                              padding: '0.6rem',
                              background: '#141824',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#f8fafc',
                              fontSize: '0.85rem'
                            }}
                            value={commonValues[fieldKey] ?? ''}
                            onChange={(e) => setCommonValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREVIEW & APPLY */}
          {activeTab === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  {parsedUpdates.length > 0 
                    ? `Review ${parsedUpdates.length} Series Updates:` 
                    : 'No updates detected. Check your selection and inputs in Tab 1 & Tab 2.'}
                </span>
                {parsedUpdates.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700 }}>
                    ✓ Ready to save
                  </span>
                )}
              </div>

              {parsedUpdates.length > 0 ? (
                <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>Series</th>
                        <th>Field</th>
                        <th>Current Value</th>
                        <th>New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedUpdates.flatMap((update) => 
                        update.diffs.map((diff, dIdx) => (
                          <tr key={`${update.series.id}-${diff.field}-${dIdx}`}>
                            {dIdx === 0 && (
                              <td rowSpan={update.diffs.length} style={{ verticalAlign: 'top', fontWeight: 700 }}>
                                <div>{update.series.title}</div>
                                <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{update.series.slug}</code>
                              </td>
                            )}
                            <td style={{ color: '#fcd34d', fontWeight: 600 }}>{diff.field}</td>
                            <td style={{ color: '#94a3b8' }}>{diff.oldVal}</td>
                            <td style={{ color: '#4ade80', fontWeight: 700 }}>{diff.newVal}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <AlertCircle size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div>No valid changes found to preview.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {inputMode === 'tsv' 
                      ? 'Ensure your TSV rows match existing series slugs or titles.' 
                      : 'Ensure you selected series in Tab 1 and entered values in Tab 2.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <div>
            {activeTab !== 'select' && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setActiveTab(activeTab === 'preview' ? 'options' : 'select')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Cancel
            </button>

            {activeTab === 'select' && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setActiveTab('options')}
              >
                <span>Continue to Fields ({selectedSeriesIds.size})</span>
                <ArrowRight size={14} />
              </button>
            )}

            {activeTab === 'options' && (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setActiveTab('preview')}
              >
                <span>Preview Updates</span>
                <ArrowRight size={14} />
              </button>
            )}

            {activeTab === 'preview' && (
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={parsedUpdates.length === 0 || isSubmitting}
                onClick={handleApplyUpdates}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    <span>Applying {parsedUpdates.length} Updates...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Apply Updates to {parsedUpdates.length} Series</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
