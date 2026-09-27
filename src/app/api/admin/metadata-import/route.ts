import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { STUDIOS, GENRES } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FormattedMetadataResult {
  id: string;
  source: 'anilist' | 'kitsu';
  title: string;
  slug: string;
  alt_title_japanese: string;
  alt_title_romaji: string;
  alt_title_english: string;
  description: string;
  studio: string;
  release_year: number | '';
  status: 'completed' | 'ongoing' | 'upcoming';
  episode_count: number | '';
  runtime: number | '';
  first_air_date: string;
  last_air_date: string;
  poster_url: string;
  banner_url: string;
  tags: string[];
  aliases: string[];
  is_adult: boolean;
  format: string;
}

function cleanHtmlDescription(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?i>/gi, '')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?em>/gi, '')
    .replace(/<\/?strong>/gi, '')
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function formatDate(y?: number | null, m?: number | null, d?: number | null): string {
  if (!y) return '';
  const mm = m ? String(m).padStart(2, '0') : '01';
  const dd = d ? String(d).padStart(2, '0') : '01';
  return `${y}-${mm}-${dd}`;
}

function matchStudio(rawStudioName: string | undefined): string {
  if (!rawStudioName) return '';
  const clean = rawStudioName.trim();
  const lower = clean.toLowerCase();

  // Try exact match in known STUDIOS list
  const exact = STUDIOS.find(s => s.toLowerCase() === lower);
  if (exact) return exact;

  // Try fuzzy contains match (e.g. "Studio Houkiboshi" -> "Hokiboshi", "PoRO Studio" -> "PoRO")
  const fuzzy = STUDIOS.find(s => {
    const sLower = s.toLowerCase();
    return lower.includes(sLower) || sLower.includes(lower);
  });
  if (fuzzy) return fuzzy;

  return clean;
}

function matchTags(genres: string[] = [], tags: { name: string; rank?: number }[] = []): string[] {
  const result = new Set<string>();

  // Add high-ranking tags (rank >= 40)
  const sortedTags = [...tags].sort((a, b) => (b.rank || 0) - (a.rank || 0));
  
  // First check official GENRES list for exact or partial matches
  for (const g of genres) {
    const foundGenre = GENRES.find(cg => cg.toLowerCase() === g.toLowerCase());
    if (foundGenre) {
      result.add(foundGenre);
    } else {
      result.add(g);
    }
  }

  for (const t of sortedTags) {
    const tName = t.name.trim();
    // Exclude generic low-value tags
    const excluded = ['primarily teen cast', 'primarily adult cast', 'male protagonist', 'nudity'];
    if (excluded.includes(tName.toLowerCase())) continue;

    const foundGenre = GENRES.find(cg => cg.toLowerCase() === tName.toLowerCase());
    if (foundGenre) {
      result.add(foundGenre);
    } else if (result.size < 12) {
      result.add(tName);
    }
  }

  return Array.from(result);
}

// -------------------------------------------------------------
// GET: Query AniList (with Kitsu fallback) for anime metadata
// -------------------------------------------------------------
export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const anilistGql = `
      query ($search: String) {
        Page(page: 1, perPage: 8) {
          media(search: $search, type: ANIME) {
            id
            isAdult
            title {
              romaji
              english
              native
            }
            synonyms
            description(asHtml: false)
            seasonYear
            status
            format
            episodes
            duration
            startDate { year month day }
            endDate { year month day }
            coverImage {
              extraLarge
              large
              medium
            }
            bannerImage
            studios {
              nodes {
                name
                isAnimationStudio
              }
            }
            genres
            tags {
              name
              rank
            }
          }
        }
      }
    `;

    let results: FormattedMetadataResult[] = [];

    // 1. Try AniList GraphQL API
    try {
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: anilistGql,
          variables: { search: query }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (anilistRes.ok) {
        const aniData = await anilistRes.json();
        const mediaList = aniData.data?.Page?.media || [];

        results = mediaList.map((item: any): FormattedMetadataResult => {
          const rawTitle = item.title?.romaji || item.title?.english || item.title?.native || query;
          const matchedStudio = matchStudio(item.studios?.nodes?.[0]?.name);
          const releaseYear = item.seasonYear || item.startDate?.year || '';
          
          let mappedStatus: 'completed' | 'ongoing' | 'upcoming' = 'ongoing';
          if (item.status === 'FINISHED') mappedStatus = 'completed';
          else if (item.status === 'NOT_YET_RELEASED') mappedStatus = 'upcoming';

          const tags = matchTags(item.genres, item.tags);
          const aliases = Array.isArray(item.synonyms) ? item.synonyms.filter(Boolean) : [];

          return {
            id: String(item.id),
            source: 'anilist',
            title: rawTitle,
            slug: slugify(rawTitle),
            alt_title_japanese: item.title?.native || '',
            alt_title_romaji: item.title?.romaji || '',
            alt_title_english: item.title?.english || '',
            description: cleanHtmlDescription(item.description),
            studio: matchedStudio,
            release_year: releaseYear,
            status: mappedStatus,
            episode_count: item.episodes || '',
            runtime: item.duration || '',
            first_air_date: formatDate(item.startDate?.year, item.startDate?.month, item.startDate?.day),
            last_air_date: formatDate(item.endDate?.year, item.endDate?.month, item.endDate?.day),
            poster_url: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '',
            banner_url: item.bannerImage || '',
            tags,
            aliases,
            is_adult: !!item.isAdult,
            format: item.format || 'OVA'
          };
        });
      }
    } catch (aniErr) {
      console.warn('AniList query failed, attempting Kitsu fallback:', aniErr);
    }

    // 2. If AniList returned 0 results or failed, fallback to Kitsu API
    if (results.length === 0) {
      try {
        const kitsuUrl = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=6`;
        const kitsuRes = await fetch(kitsuUrl, {
          headers: { 'Accept': 'application/vnd.api+json' },
          signal: AbortSignal.timeout(6000)
        });

        if (kitsuRes.ok) {
          const kitsuData = await kitsuRes.json();
          const items = kitsuData.data || [];

          results = items.map((item: any): FormattedMetadataResult => {
            const attr = item.attributes || {};
            const title = attr.canonicalTitle || attr.titles?.en_jp || attr.titles?.en || query;
            const releaseYear = attr.startDate ? Number(attr.startDate.split('-')[0]) : '';
            
            let mappedStatus: 'completed' | 'ongoing' | 'upcoming' = 'ongoing';
            if (attr.status === 'finished') mappedStatus = 'completed';
            else if (attr.status === 'upcoming') mappedStatus = 'upcoming';

            const aliases: string[] = [];
            if (attr.titles?.ja_jp) aliases.push(attr.titles.ja_jp);
            if (attr.abbreviatedTitles && Array.isArray(attr.abbreviatedTitles)) {
              aliases.push(...attr.abbreviatedTitles);
            }

            return {
              id: String(item.id),
              source: 'kitsu',
              title,
              slug: slugify(title),
              alt_title_japanese: attr.titles?.ja_jp || '',
              alt_title_romaji: attr.titles?.en_jp || '',
              alt_title_english: attr.titles?.en || attr.titles?.en_us || '',
              description: cleanHtmlDescription(attr.synopsis),
              studio: '',
              release_year: releaseYear,
              status: mappedStatus,
              episode_count: attr.episodeCount || '',
              runtime: attr.episodeLength || '',
              first_air_date: attr.startDate || '',
              last_air_date: attr.endDate || '',
              poster_url: attr.posterImage?.original || attr.posterImage?.large || '',
              banner_url: attr.coverImage?.original || attr.coverImage?.large || '',
              tags: ['Hentai'],
              aliases,
              is_adult: attr.ageRating === 'R18',
              format: attr.subtype?.toUpperCase() || 'OVA'
            };
          });
        }
      } catch (kitsuErr) {
        console.warn('Kitsu fallback also failed:', kitsuErr);
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Metadata import GET error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// -------------------------------------------------------------
// POST: Download remote poster/banner and save to Cloudflare R2
// -------------------------------------------------------------
export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json();
    const { imageUrl, slug, type = 'poster' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

    // If R2 is not fully configured, fall back to returning direct image URL
    if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
      return NextResponse.json({
        key: imageUrl,
        url: imageUrl,
        isR2: false,
        message: 'R2 not configured; direct external URL retained.'
      });
    }

    // Fetch the remote image
    const imgResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!imgResponse.ok) {
      // Return direct URL if download failed
      return NextResponse.json({
        key: imageUrl,
        url: imageUrl,
        isR2: false,
        message: 'Remote download returned non-200; direct external URL retained.'
      });
    }

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const rawContentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const contentType = rawContentType.split(';')[0].trim();

    // Determine extension
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const safeSlug = slug ? slugify(slug).slice(0, 40) : 'series';
    const key = `uploads/imported-${type}-${safeSlug}-${Date.now()}.${ext}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey }
    });

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));

    const finalUrl = getR2Url(key);

    return NextResponse.json({
      key,
      url: finalUrl,
      isR2: true,
      success: true
    });
  } catch (err: any) {
    console.error('Metadata import upload error:', err);
    // Even if R2 upload fails, do not block the admin workflow!
    return NextResponse.json({
      key: request ? '' : '',
      error: err.message || 'Image upload failed',
      fallback: true
    }, { status: 200 });
  }
}
