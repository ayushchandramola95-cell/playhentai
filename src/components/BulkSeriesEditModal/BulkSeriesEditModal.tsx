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
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Zap
} from 'lucide-react';
import styles from './BulkSeriesEditModal.module.css';

export interface SeriesItem {
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
  alt_title_japanese?: string;
  alt_title_romaji?: string;
  alt_title_english?: string;
  episode_count_override?: number | null;
  aliases?: string[];
  about_text?: string;
  about_data?: any;
  original_language?: string;
  country?: string;
  original_source?: string;
  content_warnings?: string[];
  meta_title?: string;
  meta_description?: string;
  featured_type?: string;
}

interface BulkSeriesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seriesList: SeriesItem[];
}

export type EditableFieldKey = 
  | 'title'
  | 'description'
  | 'release_year'
  | 'studio'
  | 'tags'
  | 'alt_title_japanese'
  | 'alt_title_romaji'
  | 'alt_title_english'
  | 'status'
  | 'episode_count_override'
  | 'first_air_date'
  | 'last_air_date'
  | 'aliases'
  | 'about_overview'
  | 'about_production'
  | 'about_themes'
  | 'about_recommended'
  | 'content_rating'
  | 'age_rating'
  | 'is_published'
  | 'runtime'
  | 'original_language'
  | 'country'
  | 'original_source'
  | 'content_warnings'
  | 'meta_title'
  | 'meta_description'
  | 'featured_type';

interface FieldOption {
  key: EditableFieldKey;
  label: string;
  placeholder: string;
  category: 'Core' | 'Titles & Aliases' | 'Dates & Episodes' | 'About Content' | 'Ratings & Publishing' | 'Origin & SEO';
  type: 'text' | 'number' | 'select' | 'date';
  options?: { value: string; label: string }[];
}

export const STANDARD_17_FIELDS: EditableFieldKey[] = [
  'title',
  'description',
  'release_year',
  'studio',
  'tags',
  'alt_title_japanese',
  'alt_title_romaji',
  'alt_title_english',
  'status',
  'episode_count_override',
  'first_air_date',
  'last_air_date',
  'aliases',
  'about_overview',
  'about_production',
  'about_themes',
  'about_recommended',
];

const AVAILABLE_FIELDS: FieldOption[] = [
  // Core
  { key: 'title', label: 'Series Title', placeholder: 'e.g. Kanojo x Kanojo x Kanojo', category: 'Core', type: 'text' },
  { key: 'description', label: 'Synopsis / Description', placeholder: 'Series synopsis...', category: 'Core', type: 'text' },
  { key: 'release_year', label: 'Release Year', placeholder: 'e.g. 2024', category: 'Core', type: 'number' },
  { key: 'studio', label: 'Studio', placeholder: 'e.g. PoJu, Millepensee', category: 'Core', type: 'text' },
  { key: 'tags', label: 'Tags / Genres (comma separated)', placeholder: 'e.g. Uncensored, Fantasy, 3D', category: 'Core', type: 'text' },
  { 
    key: 'status', 
    label: 'Show Status', 
    placeholder: 'Select Status', 
    category: 'Core',
    type: 'select',
    options: [
      { value: 'ongoing', label: 'Ongoing' },
      { value: 'completed', label: 'Completed' },
      { value: 'finalized', label: 'Finalized' },
      { value: 'upcoming', label: 'Upcoming' }
    ]
  },

  // Titles & Aliases
  { key: 'alt_title_japanese', label: 'Japanese Title', placeholder: 'e.g. 彼女×彼女×彼女', category: 'Titles & Aliases', type: 'text' },
  { key: 'alt_title_romaji', label: 'Romaji Title', placeholder: 'e.g. Kanojo x Kanojo x Kanojo', category: 'Titles & Aliases', type: 'text' },
  { key: 'alt_title_english', label: 'English Title', placeholder: 'e.g. Girlfriend x Girlfriend x Girlfriend', category: 'Titles & Aliases', type: 'text' },
  { key: 'aliases', label: 'Search Aliases (comma separated)', placeholder: 'e.g. Alias 1, Alias 2', category: 'Titles & Aliases', type: 'text' },

  // Dates & Episodes
  { key: 'first_air_date', label: 'First Air Date', placeholder: 'YYYY-MM-DD', category: 'Dates & Episodes', type: 'date' },
  { key: 'last_air_date', label: 'Last Air Date', placeholder: 'YYYY-MM-DD', category: 'Dates & Episodes', type: 'date' },
  { key: 'episode_count_override', label: 'Planned Episode Count', placeholder: 'e.g. 2', category: 'Dates & Episodes', type: 'number' },
  { key: 'runtime', label: 'Runtime (minutes)', placeholder: 'e.g. 24', category: 'Dates & Episodes', type: 'number' },

  // About Content
  { key: 'about_overview', label: 'About: Overview', placeholder: 'Overview text...', category: 'About Content', type: 'text' },
  { key: 'about_production', label: 'About: Production', placeholder: 'Production background...', category: 'About Content', type: 'text' },
  { key: 'about_themes', label: 'About: Themes & Style', placeholder: 'Themes analysis...', category: 'About Content', type: 'text' },
  { key: 'about_recommended', label: 'About: Recommended For', placeholder: 'Target audience...', category: 'About Content', type: 'text' },

  // Ratings & Publishing
  { 
    key: 'is_published', 
    label: 'Publication State', 
    placeholder: 'Select State', 
    category: 'Ratings & Publishing',
    type: 'select',
    options: [
      { value: 'true', label: 'Live Published' },
      { value: 'false', label: 'Draft (Hidden)' }
    ]
  },
  { 
    key: 'content_rating', 
    label: 'Content Rating', 
    placeholder: 'Select Rating', 
    category: 'Ratings & Publishing',
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
    category: 'Ratings & Publishing',
    type: 'select',
    options: [
      { value: '18+', label: '18+' },
      { value: '16+', label: '16+' },
      { value: '13+', label: '13+' }
    ]
  },
  { 
    key: 'featured_type', 
    label: 'Featured Type', 
    placeholder: 'Select Type', 
    category: 'Ratings & Publishing',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'trending', label: 'Trending' },
      { value: 'popular', label: 'Popular' },
      { value: 'featured', label: 'Hero Featured' }
    ]
  },

  // Origin & SEO
  { key: 'original_source', label: 'Original Source', placeholder: 'e.g. Manga, Visual Novel, Game', category: 'Origin & SEO', type: 'text' },
  { key: 'original_language', label: 'Original Language', placeholder: 'e.g. Japanese', category: 'Origin & SEO', type: 'text' },
  { key: 'country', label: 'Country', placeholder: 'e.g. Japan', category: 'Origin & SEO', type: 'text' },
  { key: 'content_warnings', label: 'Content Warnings', placeholder: 'e.g. Nudity, Gore', category: 'Origin & SEO', type: 'text' },
  { key: 'meta_title', label: 'SEO Meta Title', placeholder: 'Custom title tag...', category: 'Origin & SEO', type: 'text' },
  { key: 'meta_description', label: 'SEO Meta Description', placeholder: 'Custom description tag...', category: 'Origin & SEO', type: 'text' },
];

/**
 * Robust TSV row parser that supports quotes, embedded newlines, and various delimiters.
 */
function parseTSVRows(rawText: string): string[][] {
  const rawLines = rawText.split(/\r?\n/);
  const reconstructedRows: string[] = [];
  let currentAccumulatedRow = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (currentAccumulatedRow === '') {
      currentAccumulatedRow = line;
    } else {
      currentAccumulatedRow += '\n' + line;
    }

    let tabCount = 0;
    let inQuotes = false;
    for (let j = 0; j < currentAccumulatedRow.length; j++) {
      const char = currentAccumulatedRow[j];
      if (char === '"') {
        if (inQuotes && currentAccumulatedRow[j + 1] === '"') {
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\t' && !inQuotes) {
        tabCount++;
      }
    }

    if (tabCount >= 16 || i === rawLines.length - 1) {
      reconstructedRows.push(currentAccumulatedRow);
      currentAccumulatedRow = '';
    }
  }

  const finalRows: string[][] = [];
  for (const rowText of reconstructedRows) {
    const rowFields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        if (inQuotes && rowText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\t' && !inQuotes) {
        rowFields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    rowFields.push(currentField);
    finalRows.push(rowFields.map(cell => cell.trim()));
  }

  return finalRows;
}

function parseDateToYYYYMMDD(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  const trimmed = dateStr.trim();
  
  // Try MM/DD/YYYY
  const mdY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdY) {
    const month = mdY[1].padStart(2, '0');
    const day = mdY[2].padStart(2, '0');
    const year = mdY[3];
    return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD
  const yMd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yMd) {
    const year = yMd[1];
    const month = yMd[2].padStart(2, '0');
    const day = yMd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substring(0, 10);
    }
  } catch {}

  return trimmed;
}

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
  const [selectedFields, setSelectedFields] = useState<Set<EditableFieldKey>>(new Set(['studio', 'release_year', 'tags', 'description']));

  // Edit Mode: TSV Paste vs Common Values
  const [inputMode, setInputMode] = useState<'tsv' | 'common'>('tsv');
  const [tsvText, setTsvText] = useState('');
  const [tagUpdateMode, setTagUpdateMode] = useState<'replace' | 'append'>('replace');

  // Common values state
  const [commonValues, setCommonValues] = useState<Partial<Record<EditableFieldKey, any>>>({});

  // Field Exclusions in Tab 3 (Preview)
  const [excludedFieldKeys, setExcludedFieldKeys] = useState<Set<string>>(new Set());

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

  const handleApply17ColumnPreset = () => {
    setSelectedFields(new Set(STANDARD_17_FIELDS));
  };

  const handleSelectAllFields = () => {
    setSelectedFields(new Set(AVAILABLE_FIELDS.map((f) => f.key)));
  };

  const handleClearAllFields = () => {
    setSelectedFields(new Set());
  };

  // Selected series array in selection order
  const selectedSeriesArray = useMemo(() => {
    return seriesList.filter((s) => selectedSeriesIds.has(s.id));
  }, [seriesList, selectedSeriesIds]);

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

  // Quick exclusion of air dates & release year
  const isDatesAndYearExcluded = useMemo(() => {
    return excludedFieldKeys.has('first_air_date') && 
           excludedFieldKeys.has('last_air_date') && 
           excludedFieldKeys.has('release_year');
  }, [excludedFieldKeys]);

  const handleToggleExcludeDatesAndYear = () => {
    setExcludedFieldKeys((prev) => {
      const next = new Set(prev);
      if (isDatesAndYearExcluded) {
        next.delete('first_air_date');
        next.delete('last_air_date');
        next.delete('release_year');
      } else {
        next.add('first_air_date');
        next.add('last_air_date');
        next.add('release_year');
      }
      return next;
    });
  };

  const handleToggleExcludeField = (key: string) => {
    setExcludedFieldKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Parse TSV rows and compute diff updates
  const rawParsedUpdates = useMemo(() => {
    const updates: Array<{
      series: SeriesItem;
      changes: Record<string, any>;
      diffs: Array<{ field: string; label: string; oldVal: string; newVal: string }>;
    }> = [];

    const fieldKeys = Array.from(selectedFields);

    if (inputMode === 'common') {
      // Apply common values to all selected series
      selectedSeriesIds.forEach((id) => {
        const s = seriesList.find((item) => item.id === id);
        if (!s) return;

        const changes: Record<string, any> = {};
        const diffs: Array<{ field: string; label: string; oldVal: string; newVal: string }> = [];

        fieldKeys.forEach((key) => {
          const val = commonValues[key];
          if (val === undefined || val === '') return;

          let finalVal = val;
          if (key === 'release_year' || key === 'runtime' || key === 'episode_count_override') {
            finalVal = parseInt(val, 10) || null;
          } else if (key === 'is_published') {
            finalVal = val === 'true';
          } else if (key === 'tags' || key === 'aliases' || key === 'content_warnings') {
            const arr = String(val).split(',').map((t) => t.trim()).filter(Boolean);
            if (key === 'tags' && tagUpdateMode === 'append') {
              finalVal = Array.from(new Set([...(s.tags || []), ...arr]));
            } else {
              finalVal = arr;
            }
          } else if (key === 'first_air_date' || key === 'last_air_date') {
            finalVal = parseDateToYYYYMMDD(val);
          }

          changes[key] = finalVal;
          const fieldDef = AVAILABLE_FIELDS.find(f => f.key === key);
          const label = fieldDef?.label || key;

          const oldVal = Array.isArray((s as any)[key]) 
            ? ((s as any)[key] || []).join(', ') 
            : String((s as any)[key] ?? '—');
          const newValDisplay = Array.isArray(finalVal) 
            ? finalVal.join(', ') 
            : String(finalVal ?? '—');

          diffs.push({ field: key, label, oldVal, newVal: newValDisplay });
        });

        if (Object.keys(changes).length > 0) {
          updates.push({ series: s, changes, diffs });
        }
      });
      return updates;
    }

    // TSV Mode
    if (!tsvText.trim()) return [];

    const parsedRows = parseTSVRows(tsvText).filter((r) => r.length > 0 && r.some((c) => c !== ''));
    if (parsedRows.length === 0) return [];

    // Check if user pasted standard 17-column format or custom fields
    let activeFieldOrder: EditableFieldKey[] = fieldKeys;
    let dataRows = parsedRows;

    // Check if first row is a header
    const firstRow = parsedRows[0];
    const headerKeywords = ['series', 'slug', 'title', 'synopsis', 'release year', 'studio', 'tags'];
    const hasHeader = firstRow.some((cell) => headerKeywords.includes(cell.toLowerCase().trim()));
    if (hasHeader) {
      dataRows = parsedRows.slice(1);
    }

    if (dataRows.length === 0) return [];

    // If rows have ~17 columns or standard format, auto-adopt the standard 17-column layout
    if (dataRows[0].length >= 16) {
      activeFieldOrder = STANDARD_17_FIELDS;
    }

    // Process each row
    dataRows.forEach((row, rowIdx) => {
      const col0 = row[0]?.trim() || '';

      // Match strategy:
      // 1. First check if col0 matches any series in seriesList by slug or title
      let matched = seriesList.find((s) => 
        s.slug.toLowerCase() === col0.toLowerCase() ||
        s.title.toLowerCase() === col0.toLowerCase()
      );

      // 2. If not matched, but user checked series in Tab 1, map row position to selected series!
      // (e.g. User checked 5 series, row 0 -> selected series 0, row 1 -> selected series 1, etc.)
      if (!matched && selectedSeriesArray.length > 0 && rowIdx < selectedSeriesArray.length) {
        matched = selectedSeriesArray[rowIdx];
      }

      if (!matched) return;

      const changes: Record<string, any> = {};
      const diffs: Array<{ field: string; label: string; oldVal: string; newVal: string }> = [];

      const is17Format = activeFieldOrder === STANDARD_17_FIELDS;

      activeFieldOrder.forEach((key, fIdx) => {
        let rawColVal = '';
        if (is17Format) {
          rawColVal = row[fIdx]?.trim();
        } else {
          // If custom fields, check if row has identifier in col 0 + fields in col 1..N
          if (row.length > activeFieldOrder.length) {
            rawColVal = row[fIdx + 1]?.trim();
          } else {
            rawColVal = row[fIdx]?.trim();
          }
        }

        if (rawColVal === undefined || rawColVal === '') return;

        let finalVal: any = rawColVal;
        if (key === 'release_year' || key === 'runtime' || key === 'episode_count_override') {
          finalVal = parseInt(rawColVal, 10) || null;
        } else if (key === 'is_published') {
          finalVal = rawColVal.toLowerCase() === 'true' || rawColVal.toLowerCase() === 'live' || rawColVal.toLowerCase() === 'published';
        } else if (key === 'status') {
          const lower = rawColVal.toLowerCase();
          if (lower.includes('completed')) finalVal = 'completed';
          else if (lower.includes('upcoming')) finalVal = 'upcoming';
          else if (lower.includes('finalized')) finalVal = 'finalized';
          else finalVal = 'ongoing';
        } else if (key === 'tags' || key === 'aliases' || key === 'content_warnings') {
          const arr = rawColVal.split(',').map((t) => t.trim()).filter(Boolean);
          if (key === 'tags' && tagUpdateMode === 'append') {
            finalVal = Array.from(new Set([...(matched.tags || []), ...arr]));
          } else {
            finalVal = arr;
          }
        } else if (key === 'first_air_date' || key === 'last_air_date') {
          finalVal = parseDateToYYYYMMDD(rawColVal);
        }

        changes[key] = finalVal;
        const fieldDef = AVAILABLE_FIELDS.find(f => f.key === key);
        const label = fieldDef?.label || key;

        const oldVal = Array.isArray((matched as any)[key]) 
          ? ((matched as any)[key] || []).join(', ') 
          : String((matched as any)[key] ?? '—');
        const newValDisplay = Array.isArray(finalVal) 
          ? finalVal.join(', ') 
          : String(finalVal ?? '—');

        diffs.push({ field: key, label, oldVal, newVal: newValDisplay });
      });

      if (Object.keys(changes).length > 0) {
        updates.push({ series: matched, changes, diffs });
      }
    });

    return updates;
  }, [inputMode, tsvText, selectedFields, selectedSeriesIds, selectedSeriesArray, seriesList, commonValues, tagUpdateMode]);

  // Filter out updates where fields have been excluded in Tab 3
  const parsedUpdates = useMemo(() => {
    return rawParsedUpdates
      .map((update) => {
        const filteredChanges: Record<string, any> = {};
        const filteredDiffs = update.diffs.filter((d) => !excludedFieldKeys.has(d.field));

        filteredDiffs.forEach((d) => {
          filteredChanges[d.field] = update.changes[d.field];
        });

        return {
          ...update,
          changes: filteredChanges,
          diffs: filteredDiffs
        };
      })
      .filter((update) => update.diffs.length > 0);
  }, [rawParsedUpdates, excludedFieldKeys]);

  // All distinct fields present in the current raw preview
  const activePreviewFields = useMemo(() => {
    const fieldMap = new Map<string, string>();
    rawParsedUpdates.forEach((u) => {
      u.diffs.forEach((d) => {
        fieldMap.set(d.field, d.label);
      });
    });
    return Array.from(fieldMap.entries()).map(([key, label]) => ({ key, label }));
  }, [rawParsedUpdates]);

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
      if (data.updatedCount === 0 && data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0]?.error || 'Failed to save series updates to database');
      }

      setStatusNotice({
        type: 'success',
        message: `Successfully updated ${data.updatedCount || parsedUpdates.length} series in database!`
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

  // Group fields by category for clean UI display
  const fieldCategories = ['Core', 'Titles & Aliases', 'Dates & Episodes', 'About Content', 'Ratings & Publishing', 'Origin & SEO'] as const;

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
                  />
                  {searchQuery && (
                    <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className={styles.filterPillsRow}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filterType === 'all' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilterType('all')}
                  >
                    All ({seriesList.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filterType === 'draft' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilterType('draft')}
                  >
                    Drafts ({seriesList.filter(s => !s.is_published).length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filterType === 'published' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilterType('published')}
                  >
                    Live ({seriesList.filter(s => s.is_published).length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${filterType === 'selected' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilterType('selected')}
                  >
                    Selected ({selectedSeriesIds.size})
                  </button>
                </div>
              </div>

              {/* Bulk Select Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                <div>
                  Showing {filteredSeries.length} shows • <strong style={{ color: '#f59e0b' }}>{selectedSeriesIds.size} selected</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button type="button" className={styles.secondaryBtn} onClick={selectAllFiltered} style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Select All Filtered
                  </button>
                  <button type="button" className={styles.secondaryBtn} onClick={deselectAll} style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Series Selection List */}
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
              {/* Field Presets */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
                    Select Fields to Edit ({selectedFields.size} active):
                  </label>
                  <div className={styles.presetRow}>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${styles.presetBtnActive}`}
                      onClick={handleApply17ColumnPreset}
                      title="Load all 17 standard series columns in spreadsheet order"
                    >
                      <Sparkles size={12} />
                      <span>Standard 17-Column TSV</span>
                    </button>
                    <button
                      type="button"
                      className={styles.presetBtn}
                      onClick={handleSelectAllFields}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className={styles.presetBtn}
                      onClick={handleClearAllFields}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Categorized Fields Grid */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                  {fieldCategories.map((cat) => {
                    const fieldsInCat = AVAILABLE_FIELDS.filter(f => f.category === cat);
                    return (
                      <div key={cat} style={{ marginBottom: '0.75rem' }}>
                        <div className={styles.fieldCategoryHeader}>
                          <span>{cat}</span>
                        </div>
                        <div className={styles.fieldGrid}>
                          {fieldsInCat.map((f) => {
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
                      <strong style={{ color: '#fcd34d' }}>
                        {selectedSeriesIds.size > 0 
                          ? `Paste Rows for Your ${selectedSeriesIds.size} Selected Series:`
                          : 'Expected TSV Format (Tab-separated):'}
                      </strong>
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
                      {selectedSeriesIds.size > 0 
                        ? `Tip: You selected ${selectedSeriesIds.size} series. You can paste ${selectedSeriesIds.size} lines in order, or lines starting with the series title/slug. In Step 3 Preview, you can freely remove dates or any other fields with 1-click!`
                        : 'Tip: You can copy directly from Excel or Google Sheets. Column 1 matches the series slug or title.'}
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
                    placeholder={`Paste rows from Excel or TSV here...\nExample (1 line per series):\nShow Title 1\tSynopsis text...\t2024\tPoJu\tUncensored, 3D\t...\nShow Title 2\tSynopsis text...\t2023\tMillepensee\tFantasy\t...`}
                    value={tsvText}
                    onChange={(e) => setTsvText(e.target.value)}
                  />
                </div>
              ) : (
                /* MODE B: COMMON BATCH VALUES */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
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
              {/* Quick Field Removal / Protection Toolbar */}
              <div className={styles.excludeBanner}>
                <div className={styles.excludeBannerHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} color="#f59e0b" />
                    <strong style={{ fontSize: '0.86rem', color: '#fcd34d' }}>
                      Field Protection & Exclusion Controls
                    </strong>
                  </div>
                  
                  {/* One-click button to remove First Air Date, Last Air Date, and Release Year */}
                  <button
                    type="button"
                    className={`${styles.quickRemoveBtn} ${isDatesAndYearExcluded ? styles.quickRemoveBtnActive : ''}`}
                    onClick={handleToggleExcludeDatesAndYear}
                    title="Toggle exclusion of First Air Date, Last Air Date, and Release Year so episode auto-fetch dates are protected"
                  >
                    <Zap size={13} />
                    <span>
                      {isDatesAndYearExcluded 
                        ? '✓ Dates & Year Removed / Protected' 
                        : '⚡ Remove First & Last Air Date & Release Year'}
                    </span>
                  </button>
                </div>

                {/* Individual Field Exclusion Chips */}
                {activePreviewFields.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      Click any field below to remove it from this update:
                    </div>
                    <div className={styles.chipList}>
                      {activePreviewFields.map((field) => {
                        const isExcluded = excludedFieldKeys.has(field.key);
                        return (
                          <button
                            key={field.key}
                            type="button"
                            className={`${styles.excludeChip} ${isExcluded ? styles.excludeChipExcluded : ''}`}
                            onClick={() => handleToggleExcludeField(field.key)}
                            title={isExcluded ? `Click to restore ${field.label}` : `Click to exclude ${field.label}`}
                          >
                            <span>{isExcluded ? '✕' : '✓'} {field.label}</span>
                            {isExcluded && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(Removed)</span>}
                          </button>
                        );
                      })}
                      {excludedFieldKeys.size > 0 && (
                        <button
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => setExcludedFieldKeys(new Set())}
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          <RotateCcw size={11} />
                          <span>Reset All Exclusions</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  {parsedUpdates.length > 0 
                    ? `Ready to update ${parsedUpdates.length} Series (${excludedFieldKeys.size > 0 ? `${excludedFieldKeys.size} fields excluded` : 'all fields included'}):` 
                    : 'No updates to apply. (Either all fields were excluded, or no rows matched).'}
                </span>
                {parsedUpdates.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 700 }}>
                    ✓ Ready to save to database
                  </span>
                )}
              </div>

              {/* Preview Diff Table */}
              {parsedUpdates.length > 0 ? (
                <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>Series</th>
                        <th>Field</th>
                        <th>Current Value</th>
                        <th>New Value</th>
                        <th style={{ width: '40px', textAlign: 'center' }}>Exclude</th>
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
                            <td style={{ color: '#fcd34d', fontWeight: 600, minWidth: '130px' }}>{diff.label}</td>
                            <td style={{ color: '#94a3b8', maxWidth: '360px', wordBreak: 'break-word' }}>
                              {diff.oldVal}
                            </td>
                            <td style={{ color: '#4ade80', fontWeight: 700, maxWidth: '420px', wordBreak: 'break-word' }}>
                              {diff.newVal}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={styles.tableExcludeBtn}
                                onClick={() => handleToggleExcludeField(diff.field)}
                                title={`Exclude ${diff.label} from this bulk update`}
                              >
                                <X size={14} />
                              </button>
                            </td>
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
                    {excludedFieldKeys.size > 0 
                      ? 'You have excluded all matched fields. Click "Reset All Exclusions" above to bring them back.'
                      : inputMode === 'tsv' 
                      ? 'Ensure you selected series in Tab 1, or that your TSV rows match series titles or slugs.' 
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
                <span>Continue to Fields ({selectedSeriesIds.size} selected)</span>
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
                    <span>Saving {parsedUpdates.length} Series...</span>
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
