import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate and authorize user as Admin
    try {
      await verifyAdmin();
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request payload
    const body = await req.json();
    const { mode, section, existingText, metadata, model } = body;

    if (!mode || !['all', 'single', 'improve'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid generation mode' }, { status: 400 });
    }

    if (mode !== 'all' && !section) {
      return NextResponse.json({ error: 'Section is required for single or improve modes' }, { status: 400 });
    }

    if (mode === 'improve' && !existingText) {
      return NextResponse.json({ error: 'Existing text is required for improve mode' }, { status: 400 });
    }

    const {
      title,
      alt_title_japanese,
      alt_title_romaji,
      alt_title_english,
      studio,
      original_source,
      release_year,
      runtime,
      country,
      original_language,
      status,
      content_rating,
      age_rating,
      tags,
      description
    } = metadata || {};

    if (!title) {
      return NextResponse.json({ error: 'Series title is required for metadata context' }, { status: 400 });
    }

    let geminiKey = process.env.GEMINI_API_KEY;
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
          if (match) {
            const parsedKey = match[1].trim().replace(/['"]/g, '');
            if (parsedKey) {
              geminiKey = parsedKey;
            }
          }
        }
      } catch (e) {
        console.error('Failed to dynamically read .env.local:', e);
      }
    }

    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API Key is not configured on the server.' }, { status: 500 });
    }

    // Define section constraints and guidelines
    const sectionInstructions: Record<string, string> = {
      overview: 'Explain what kind of anime this is, its overall focus, its genre, and adaptation source. Word count limit: 120-180 words.',
      production: 'Describe the animation style, studio reputation, production quality, and visual presentation. Word count limit: 80-120 words. Do NOT list metadata fields.',
      themes: 'Describe the themes (e.g. romance, school life, vanilla, coming of age), tone, pacing, and character development focus. Word count limit: 80-120 words.',
      recommended: 'Describe which types of viewers would enjoy this series based on its genres and style. Word count limit: 50-80 words.'
    };

    const sectionWordLimit: Record<string, string> = {
      overview: '120-180 words',
      production: '80-120 words',
      themes: '80-120 words',
      recommended: '50-80 words'
    };

    // 3. Construct Gemini Prompt
    let prompt = '';
    let responseMimeType: string | undefined = undefined;

    const metadataBlock = `
--- METADATA ---
Title: ${title}
Japanese Title: ${alt_title_japanese || 'N/A'}
English Title: ${alt_title_english || 'N/A'}
Romaji Title: ${alt_title_romaji || 'N/A'}
Studio: ${studio || 'N/A'}
Original Source: ${original_source || 'N/A'}
Release Year: ${release_year || 'N/A'}
Runtime: ${runtime || 'N/A'} min
Country: ${country || 'N/A'}
Language: ${original_language || 'N/A'}
Status: ${status || 'N/A'}
Content Rating: ${content_rating || 'N/A'}
Age Rating: ${age_rating || 'N/A'}
Tags/Genres: ${Array.isArray(tags) ? tags.join(', ') : (tags || 'N/A')}
Synopsis: ${description || 'N/A'}
`;

    const editorialStyleBlock = `
--- EDITORIAL STYLE GUIDE ---
1. TONE: Write in a neutral, objective, encyclopedia-style tone similar to MyAnimeList or AniDB. Write in the third-person.
2. NO SPAM/MARKETING: Do NOT use marketing or promotional language, e.g., never say "Watch in Full HD", "Best streaming", "Premium servers", "watch online", "high bitrate", "unparalleled experience", etc. Keep it educational.
3. NO PLOT REPETITION: Do NOT repeat or summarize the story/plot. The Synopsis already describes the plot. Focus on overall focus, presentation, pacing, and style.
4. NO BULLET POINTS: Do NOT output lists or bullet points. Write naturally in short paragraphs with smooth transitions.
5. CONCISENESS: Keep sentences concise. Prefer 15-25 words per sentence and avoid overly long paragraphs.
6. SOURCE TRUST: Use only the supplied metadata. If details are not provided in the metadata, do NOT invent or hallucinate them. If something is not provided, omit it rather than inventing details.
`;

    if (mode === 'all') {
      responseMimeType = 'application/json';
      prompt = `You are a professional anime encyclopedia compiler.
Your task is to write structured, highly editorial "About This Series" content for the anime series.
${metadataBlock}
${editorialStyleBlock}

--- SECTIONS TO GENERATE ---
You must generate exactly four sections in a JSON object matching this schema:
{
  "overview": "${sectionInstructions.overview}",
  "production": "${sectionInstructions.production}",
  "themes": "${sectionInstructions.themes}",
  "recommended": "${sectionInstructions.recommended}"
}

Return ONLY a valid JSON object matching the schema above.`;
    } else if (mode === 'single') {
      prompt = `You are a professional anime encyclopedia compiler.
Write the "${section}" section of the "About This Series" article for this anime.
${metadataBlock}
${editorialStyleBlock}

--- SECTION INSTRUCTIONS ---
${sectionInstructions[section as string]}

Return only the text content for this section, without any headers, quotes, or JSON wrapping.`;
    } else if (mode === 'improve') {
      prompt = `You are an expert copyeditor.
Improve the grammar, readability, flow, and conciseness of the following text for the "${section}" section of an anime encyclopedia page.

--- EDITING RULES ---
1. Do NOT change or add any factual information.
2. Keep sentences concise. Prefer 15-25 words per sentence.
3. Maintain the third-person objective, encyclopedic tone.
4. Do NOT use marketing or promotional language.
5. Retain a word count matching the recommended limit: ${sectionWordLimit[section as string]}.

--- TEXT TO IMPROVE ---
${existingText}

Return only the improved text content, without any headers, quotes, or JSON wrapping.`;
    }

    // Validate and select target model
    const allowedModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview'
    ];
    const targetModel = (model && allowedModels.includes(model)) ? model : 'gemini-3.6-flash';

    // 4. Invoke Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiKey}`;
    
    const requestPayload: any = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    if (responseMimeType) {
      requestPayload.generationConfig = {
        responseMimeType
      };
    }

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API request failed:', errText);
      let descriptiveError = `Gemini API Error: ${geminiRes.statusText}`;
      try {
        const errObj = JSON.parse(errText);
        if (errObj.error?.message) {
          descriptiveError = `Gemini API Error: ${errObj.error.message}`;
        }
      } catch (parseErr) {
        // ignore
      }
      return NextResponse.json({ error: descriptiveError }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    let textResult = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 5. Return response
    if (mode === 'all') {
      // Parse to ensure it is valid JSON
      try {
        const parsed = JSON.parse(textResult.trim());
        return NextResponse.json({ data: parsed });
      } catch (parseErr) {
        console.error('Gemini failed to output valid JSON:', textResult);
        // Try fallback parsing or return raw text wrapped
        return NextResponse.json({
          error: 'Gemini JSON parsing failure',
          rawText: textResult
        }, { status: 502 });
      }
    }

    return NextResponse.json({ data: textResult.trim() });

  } catch (err: any) {
    console.error('Error generating about text:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
