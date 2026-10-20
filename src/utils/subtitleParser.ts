/**
 * High-performance subtitle parser & converter for WebVTT and SubRip (SRT) files.
 */

export interface SubtitleCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
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
 * Parses timestamp strings like "00:01:23.456" or "01:23.456" into seconds.
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
 * Parses WebVTT or SRT content into an ordered array of subtitle cues.
 */
export function parseSubtitleText(content: string): SubtitleCue[] {
  if (!content || content.trim() === '') return [];

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
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
        .replace(/<[^>]+>/g, '') // remove HTML/VTT style tags (<b>, <i>, <c.color>, etc.)
        .replace(/\{[^}]+\}/g, '') // remove ASS style tags ({\pos...}, etc.)
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
  // Binary search or find
  return cues.find(c => currentTime >= c.start && currentTime <= c.end) || null;
}
