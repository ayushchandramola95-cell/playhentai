import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { GENRES, STUDIOS } from '@/utils/constants';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExtractedResponse {
  genres: string[];
  studios: string[];
  merged_notes: Array<{ original: string; merged_into: string }>;
}

function updateEnvLocalKey(newKey: string): boolean {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${newKey}`);
      } else {
        content += `\nGEMINI_API_KEY=${newKey}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
      process.env.GEMINI_API_KEY = newKey;
      return true;
    }
  } catch (err) {
    console.warn('Could not write GEMINI_API_KEY to .env.local:', err);
  }
  return false;
}

function getEnvLocalKey(): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY\s*=\s*(.+)/);
      if (match) {
        return match[1].trim().replace(/['"]/g, '');
      }
    }
  } catch (err) {
    // fallback
  }
  return process.env.GEMINI_API_KEY || '';
}

function cleanTag(t: string): string {
  return t.replace(/[\[\]\(\)\{\},]/g, '').trim();
}

/**
 * Normalizes, deduplicates, and canonicalizes genres against platform constants
 */
function postProcessGenres(rawList: string[]): {
  genres: string[];
  notes: Array<{ original: string; merged_into: string }>;
} {
  const result = new Map<string, string>(); // lowercase key -> canonical display
  const notes: Array<{ original: string; merged_into: string }> = [];

  const SYNONYM_MAP: Record<string, string> = {
    'boob job': 'Paizuri',
    'boobjob': 'Paizuri',
    'paizuri': 'Paizuri',
    'tits fuck': 'Tits Fuck',
    'titsfuck': 'Tits Fuck',
    'blow job': 'Blowjob',
    'blowjob': 'Blowjob',
    'hand job': 'Hand Job',
    'handjob': 'Hand Job',
    'big boobs': 'Big Boobs',
    'large breasts': 'Large Breasts',
    'huge breasts': 'Large Breasts',
    'huge boobs': 'Big Boobs',
    'school girl': 'School Girls',
    'school girls': 'School Girls',
    'schoolgirl': 'School Girls',
    'schoolgirls': 'School Girls',
    'virgin': 'Virgins',
    'virgins': 'Virgins',
    'mind break': 'Mind Break',
    'mindbreak': 'Mind Break',
    'horny slut': 'Horny Slut',
    'public sex': 'Public Sex',
    'double penetration': 'Double Penetration',
    'dp': 'Double Penetration'
  };

  for (const raw of rawList) {
    const cleaned = cleanTag(raw);
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    const compact = lower.replace(/[\s-_]/g, '');

    // 1. Exact case-insensitive match in GENRES
    const exact = GENRES.find(g => g.toLowerCase() === lower);
    if (exact) {
      if (exact !== cleaned) {
        notes.push({ original: raw, merged_into: exact });
      }
      result.set(exact.toLowerCase(), exact);
      continue;
    }

    // 2. Compact match (ignoring spaces / hyphens, e.g. "blow job" vs "blowjob")
    const compactMatch = GENRES.find(g => g.toLowerCase().replace(/[\s-_]/g, '') === compact);
    if (compactMatch) {
      notes.push({ original: raw, merged_into: compactMatch });
      result.set(compactMatch.toLowerCase(), compactMatch);
      continue;
    }

    // 3. Singular / Plural match (e.g. "School Girl" vs "School Girls", "Virgin" vs "Virgins")
    const pluralCandidate = lower.endsWith('s') ? lower.slice(0, -1) : `${lower}s`;
    const pluralMatch = GENRES.find(g => {
      const gLower = g.toLowerCase();
      return (
        gLower === pluralCandidate ||
        gLower === `${lower}es` ||
        (lower.endsWith('es') && gLower === lower.slice(0, -2))
      );
    });
    if (pluralMatch) {
      notes.push({ original: raw, merged_into: pluralMatch });
      result.set(pluralMatch.toLowerCase(), pluralMatch);
      continue;
    }

    // 4. Known synonyms
    if (SYNONYM_MAP[lower] || SYNONYM_MAP[compact]) {
      const synTarget = SYNONYM_MAP[lower] || SYNONYM_MAP[compact];
      notes.push({ original: raw, merged_into: synTarget });
      result.set(synTarget.toLowerCase(), synTarget);
      continue;
    }

    // 5. Keep as new valid custom genre
    result.set(lower, cleaned);
  }

  return {
    genres: Array.from(result.values()),
    notes
  };
}

/**
 * Normalizes and deduplicates animation studios against platform constants
 */
function postProcessStudios(rawList: string[]): {
  studios: string[];
  notes: Array<{ original: string; merged_into: string }>;
} {
  const result = new Map<string, string>();
  const notes: Array<{ original: string; merged_into: string }> = [];

  for (const raw of rawList) {
    const cleaned = cleanTag(raw);
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    const compact = lower.replace(/[\s-_]/g, '');

    // 1. Exact match in STUDIOS
    const exact = STUDIOS.find(s => s.toLowerCase() === lower);
    if (exact) {
      if (exact !== cleaned) {
        notes.push({ original: raw, merged_into: exact });
      }
      result.set(exact.toLowerCase(), exact);
      continue;
    }

    // 2. Compact match
    const compactMatch = STUDIOS.find(s => s.toLowerCase().replace(/[\s-_]/g, '') === compact);
    if (compactMatch) {
      notes.push({ original: raw, merged_into: compactMatch });
      result.set(compactMatch.toLowerCase(), compactMatch);
      continue;
    }

    // 3. Fuzzy contains match (e.g. "Studio King Bee" -> "King Bee")
    const fuzzy = STUDIOS.find(s => {
      const sLower = s.toLowerCase();
      return lower.includes(sLower) || sLower.includes(lower);
    });
    if (fuzzy) {
      notes.push({ original: raw, merged_into: fuzzy });
      result.set(fuzzy.toLowerCase(), fuzzy);
      continue;
    }

    // 4. Keep custom studio
    result.set(lower, cleaned);
  }

  return {
    studios: Array.from(result.values()),
    notes
  };
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();

    // Accept either JSON with base64 images or FormData with files
    const contentType = request.headers.get('content-type') || '';
    let customKey = request.headers.get('x-gemini-api-key') || '';
    let shouldUpdateEnv = false;
    let action = '';
    const inlineParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.apiKey && typeof body.apiKey === 'string') {
        customKey = body.apiKey.trim();
      }
      if (body.updateEnv) {
        shouldUpdateEnv = true;
      }
      if (body.action && typeof body.action === 'string') {
        action = body.action;
      }

      const rawImages: string[] = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []);

      for (const imgStr of rawImages) {
        if (!imgStr) continue;
        let mimeType = 'image/png';
        let base64Data = imgStr;

        if (imgStr.startsWith('data:')) {
          const match = imgStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        }

        inlineParts.push({
          inlineData: { mimeType, data: base64Data }
        });
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const files = formData.getAll('images') as File[];
      if (formData.get('apiKey')) {
        customKey = (formData.get('apiKey') as string).trim();
      }
      if (formData.get('updateEnv') === 'true') {
        shouldUpdateEnv = true;
      }
      if (formData.get('action')) {
        action = (formData.get('action') as string).trim();
      }

      for (const file of files) {
        if (!file || typeof file === 'string') continue;
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/png';

        inlineParts.push({
          inlineData: { mimeType, data: base64Data }
        });
      }
    }

    // Action: Save or update key in .env.local
    if (action === 'update_key') {
      if (!customKey) {
        return NextResponse.json({ error: 'No API key provided to save.' }, { status: 400 });
      }
      const updated = updateEnvLocalKey(customKey);
      return NextResponse.json({ 
        success: updated, 
        message: updated ? 'Server .env.local key updated successfully!' : 'Failed to update .env.local' 
      });
    }

    // Action: Test key validity with a ping call
    if (action === 'test_key') {
      const testKey = customKey || getEnvLocalKey();
      if (!testKey) {
        return NextResponse.json({ error: 'No API key provided to test.' }, { status: 400 });
      }
      try {
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${testKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with OK' }] }]
          }),
          signal: AbortSignal.timeout(8000)
        });
        if (testRes.ok) {
          if (shouldUpdateEnv) {
            updateEnvLocalKey(testKey);
          }
          return NextResponse.json({ success: true, message: '✓ Gemini API key is valid and working!' });
        } else {
          const errData = await testRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${testRes.status}: Key validation failed`;
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      } catch (testErr: any) {
        return NextResponse.json({ error: testErr.message || 'Key connection test failed' }, { status: 400 });
      }
    }

    // Update .env.local if requested by user
    if (shouldUpdateEnv && customKey) {
      updateEnvLocalKey(customKey);
    }

    // Resolve final API key to use
    const apiKey = customKey || getEnvLocalKey();
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { error: 'No valid Gemini API Key configured. Please enter a valid Gemini API Key from Google AI Studio (https://aistudio.google.com/) in the Key Settings above.' },
        { status: 400 }
      );
    }

    if (inlineParts.length === 0) {
      return NextResponse.json(
        { error: 'No images provided for extraction.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert anime and hentai metadata extractor and normalizer.
The user has uploaded screenshot(s) or image(s) showing genre/tag pills and production studio names from anime/hentai websites.

PLATFORM MASTER GENRES: ${JSON.stringify(GENRES)}
PLATFORM MASTER STUDIOS: ${JSON.stringify(STUDIOS)}

Instructions:
1. Carefully inspect ALL uploaded images and extract every visible tag, genre, and animation studio.
2. Smart deduplication & normalization:
   - When an extracted tag has a match or close synonym/spelling in PLATFORM MASTER GENRES, map to that exact platform spelling (e.g. "Blow Job" -> "Blowjob", "School Girl" -> "School Girls", "Virgin" -> "Virgins", "Boob Job" -> "Paizuri" or "Tits Fuck", "Hand Job" -> "Hand Job").
   - Eliminate duplicates. If multiple images contain identical or synonymous tags, merge them cleanly into one.
   - Detect animation studios (e.g. "1st", "King Bee", "Media Bank", "PoRO", "Bunnywalker", etc.). Put studios in the "studios" list, NOT in "genres".
   - If a tag or studio appears that is not in the platform master list, still include it if it's a valid genre or studio.
3. Return ONLY valid JSON matching this schema:
{
  "genres": string[],
  "studios": string[],
  "merged_notes": { "original": string, "merged_into": string }[]
}`;

    // Candidate vision models in order of priority
    const models = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.5-pro'
    ];

    let lastError = 'Failed to extract tags from images.';
    let rawResult: ExtractedResponse | null = null;
    let modelUsed: string | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  ...inlineParts
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            try {
              rawResult = JSON.parse(text);
              modelUsed = model;
              break;
            } catch (pErr) {
              console.warn(`JSON parse error on ${model} response:`, pErr);
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${res.status}`;
          console.warn(`Gemini model ${model} failed with HTTP ${res.status}:`, lastError);

          // If key is invalid, break immediately to avoid waiting through all models
          if (lastError.toLowerCase().includes('api key not valid') || (res.status === 400 && lastError.toLowerCase().includes('api key'))) {
            break;
          }
        }
      } catch (callErr: any) {
        lastError = callErr.message || 'Network timeout';
        console.warn(`Error invoking Gemini model ${model}:`, callErr);
      }
    }

    if (!rawResult) {
      const isKeyError = lastError.toLowerCase().includes('api key not valid') || lastError.toLowerCase().includes('api key');
      const formattedError = isKeyError
        ? `API key not valid (${lastError}). Please enter a valid Gemini API Key from Google AI Studio in the Key Settings above.`
        : `Extraction error: ${lastError}`;

      return NextResponse.json(
        { error: formattedError, isKeyError },
        { status: 502 }
      );
    }

    // Post-process through our canonical normalizer
    const processedGenres = postProcessGenres(rawResult.genres || []);
    const processedStudios = postProcessStudios(rawResult.studios || []);

    // Combine notes
    const allNotes = [
      ...(rawResult.merged_notes || []),
      ...processedGenres.notes,
      ...processedStudios.notes
    ];

    // Deduplicate notes
    const seenNoteKeys = new Set<string>();
    const deduplicatedNotes = allNotes.filter(n => {
      const key = `${n.original?.toLowerCase()}=>${n.merged_into?.toLowerCase()}`;
      if (seenNoteKeys.has(key)) return false;
      seenNoteKeys.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      genres: processedGenres.genres,
      studios: processedStudios.studios,
      merged_notes: deduplicatedNotes,
      images_processed: inlineParts.length
    });
  } catch (err: any) {
    console.error('Image tag extraction error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}
