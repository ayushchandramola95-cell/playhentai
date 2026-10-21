/**
 * High-performance subtitle parser & converter for Aegisub (ASS/SSA),
 * WebVTT, and SubRip (SRT) files.
 */

export interface SubtitleCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

/**
 * Parses timestamp strings like "00:01:23.456", "01:23.456", or "0:01:23.45" into seconds.
 */
export function parseSubtitleTimestamp(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(clean) || 0;
}

/**
 * Converts ASS centisecond timestamps (e.g. "0:00:19.91") into standard WebVTT (e.g. "00:00:19.910").
 */
export function formatAssTimestampToVtt(assTime: string): string {
  const parts = assTime.trim().split(':');
  if (parts.length < 2) return '00:00:00.000';
  let hours = '00';
  let mins = '00';
  let secs = '00';
  let ms = '000';

  if (parts.length === 3) {
    hours = parts[0].padStart(2, '0');
    mins = parts[1].padStart(2, '0');
    const secParts = parts[2].split('.');
    secs = secParts[0].padStart(2, '0');
    const cs = secParts[1] || '0';
    ms = cs.padEnd(3, '0').slice(0, 3);
  } else if (parts.length === 2) {
    mins = parts[0].padStart(2, '0');
    const secParts = parts[1].split('.');
    secs = secParts[0].padStart(2, '0');
    const cs = secParts[1] || '0';
    ms = cs.padEnd(3, '0').slice(0, 3);
  }

  return `${hours}:${mins}:${secs}.${ms}`;
}

/**
 * Cleans Aegisub ASS text by stripping vector drawings, formatting tags,
 * and normalizing newlines and whitespace.
 */
export function cleanAssText(text: string): string {
  if (!text) return '';

  // If text contains drawing tags like \p1, \p2, or vector commands, it's not dialogue
  if (/\\p[1-9]/.test(text)) return '';

  const cleaned = text
    // Normalize newlines (\N and \n)
    .replace(/\\[Nn]/g, '\n')
    // Hard spaces (\h)
    .replace(/\\h/g, ' ')
    // Convert basic formatting tags to standard HTML
    .replace(/\\i1/g, '<i>').replace(/\\i0/g, '</i>')
    .replace(/\\b1/g, '<b>').replace(/\\b0/g, '</b>')
    // Strip all other ASS override tags {...}
    .replace(/\{[^}]*\}/g, '')
    // Strip orphaned backslash escapes
    .replace(/\\[a-zA-Z0-9]+(?:\([^)]*\))?/g, '')
    .trim();

  // If text starts with vector drawing path like "m 137 207 l 583..."
  if (/^m\s+\d+/.test(cleaned)) return '';

  return cleaned;
}

/**
 * Converts raw Advanced SubStation Alpha (.ass / .ssa) content into standard WebVTT.
 */
export function convertAssToVtt(assContent: string): string {
  const lines = assContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const vttCues: { startSec: number; start: string; end: string; text: string }[] = [];

  let startIndex = 1;
  let endIndex = 2;
  let textIndex = 9;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check Format header in [Events] section
    if (rawLine.toLowerCase().startsWith('format:')) {
      const headerCols = rawLine.substring(7).split(',').map(c => c.trim().toLowerCase());
      const sIdx = headerCols.indexOf('start');
      const eIdx = headerCols.indexOf('end');
      const tIdx = headerCols.indexOf('text');
      if (sIdx !== -1) startIndex = sIdx;
      if (eIdx !== -1) endIndex = eIdx;
      if (tIdx !== -1) textIndex = tIdx;
      continue;
    }

    // Process Dialogue lines (ignore Comment: lines)
    if (rawLine.toLowerCase().startsWith('dialogue:')) {
      const lineWithoutPrefix = rawLine.substring(rawLine.indexOf(':') + 1).trim();
      
      // Split into at most textIndex + 1 columns so commas in dialogue text remain intact
      const cols: string[] = [];
      let temp = lineWithoutPrefix;
      for (let c = 0; c < textIndex; c++) {
        const commaPos = temp.indexOf(',');
        if (commaPos === -1) break;
        cols.push(temp.substring(0, commaPos).trim());
        temp = temp.substring(commaPos + 1);
      }
      cols.push(temp); // The remaining string is the complete dialogue Text field

      if (cols.length <= textIndex) continue;

      const rawStart = cols[startIndex];
      const rawEnd = cols[endIndex];
      const rawText = cols[textIndex];

      const cleanText = cleanAssText(rawText);
      if (!cleanText) continue; // drawing or empty

      const vttStart = formatAssTimestampToVtt(rawStart);
      const vttEnd = formatAssTimestampToVtt(rawEnd);
      const startSec = parseSubtitleTimestamp(vttStart);

      vttCues.push({
        startSec,
        start: vttStart,
        end: vttEnd,
        text: cleanText,
      });
    }
  }

  // Sort chronologically
  vttCues.sort((a, b) => a.startSec - b.startSec);

  // Deduplicate exact same start, end, and text (common in layered anime fansub styles)
  const uniqueCues: { start: string; end: string; text: string }[] = [];
  for (const cue of vttCues) {
    const isDup = uniqueCues.some(
      u => u.start === cue.start && u.end === cue.end && u.text === cue.text
    );
    if (!isDup) {
      uniqueCues.push({ start: cue.start, end: cue.end, text: cue.text });
    }
  }

  // Build clean WebVTT
  let output = 'WEBVTT\n\n';
  uniqueCues.forEach((cue, index) => {
    output += `${index + 1}\n${cue.start} --> ${cue.end}\n${cue.text}\n\n`;
  });

  return output.trim();
}

/**
 * Converts a raw SRT string into standard WebVTT format.
 */
export function convertSrtToVtt(srtContent: string): string {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalized.trim().startsWith('WEBVTT')) {
    return normalized;
  }
  // Replace comma millisecond separators with periods in timestamps
  const withPeriods = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${withPeriods}`;
}

/**
 * Automatically inspects the content and filename, normalizing any subtitle
 * format (.ass, .ssa, .srt, .vtt) into standard WebVTT string.
 */
export function normalizeSubtitlesToVtt(rawContent: string, fileName?: string): string {
  if (!rawContent || rawContent.trim() === '') return '';

  const trimmed = rawContent.trim();
  const lowerName = (fileName || '').toLowerCase();

  // If already standard WebVTT
  if (trimmed.startsWith('WEBVTT')) {
    return trimmed;
  }

  // If Aegisub ASS / SSA format
  if (
    lowerName.endsWith('.ass') ||
    lowerName.endsWith('.ssa') ||
    trimmed.includes('[Script Info]') ||
    trimmed.includes('[Events]') ||
    trimmed.includes('Dialogue:')
  ) {
    return convertAssToVtt(rawContent);
  }

  // If SubRip (SRT) format
  if (
    lowerName.endsWith('.srt') ||
    /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/.test(trimmed)
  ) {
    return convertSrtToVtt(rawContent);
  }

  // Fallback to SRT converter as closest standard
  return convertSrtToVtt(rawContent);
}

/**
 * Parses WebVTT, ASS/SSA, or SRT content into an ordered array of subtitle cues.
 */
export function parseSubtitleText(content: string): SubtitleCue[] {
  if (!content || content.trim() === '') return [];

  // Normalize to WebVTT first
  const normalizedVtt = normalizeSubtitlesToVtt(content);
  const lines = normalizedVtt.split('\n');
  const cues: SubtitleCue[] = [];

  let currentStart = -1;
  let currentEnd = -1;
  let currentTextLines: string[] = [];
  let currentId = '';

  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{3})/;

  function flush() {
    if (currentStart >= 0 && currentEnd > currentStart && currentTextLines.length > 0) {
      const cleanText = currentTextLines
        .join('\n')
        .replace(/<[^>]+>/g, '') // remove HTML/VTT style tags
        .trim();

      if (cleanText) {
        cues.push({
          id: currentId || String(cues.length + 1),
          start: currentStart,
          end: currentEnd,
          text: cleanText,
        });
      }
    }
    currentStart = -1;
    currentEnd = -1;
    currentTextLines = [];
    currentId = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flush();
      continue;
    }

    if (line.startsWith('WEBVTT') || line.startsWith('NOTE') || line.startsWith('STYLE')) {
      continue;
    }

    const match = line.match(timeRegex);
    if (match) {
      if (currentStart >= 0 && currentTextLines.length > 0) {
        flush();
      }
      currentStart = parseSubtitleTimestamp(match[1]);
      currentEnd = parseSubtitleTimestamp(match[2]);
    } else if (currentStart >= 0) {
      currentTextLines.push(line);
    } else {
      currentId = line;
    }
  }

  flush();

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Finds the active cue for the given playback time in seconds.
 */
export function findActiveCue(cues: SubtitleCue[], currentTime: number): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;
  return cues.find(c => currentTime >= c.start && currentTime <= c.end) || null;
}
