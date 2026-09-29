import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/supabase/admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { STUDIOS, GENRES } from '@/utils/constants';
import { getR2Url } from '@/utils/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface EpisodeScheduleItem {
  episode: number;
  title: string;
  air_date: string;
  air_date_local: string;
  duration_seconds: number;
  duration_minutes: number;
  thumbnail_url?: string;
  synopsis?: string;
}

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
  format: string; // OVA, ONA, TV, MOVIE, SPECIAL
  original_source: string; // Manga, Visual Novel / Eroge, Light Novel, Original Anime, Doujinshi, etc.
  country: string; // Japan
  suggested_season_title: string; // 'OVAs' for OVA/ONA, 'Movies' for MOVIE, 'Specials' for SPECIAL, 'Season 1' for TV
  episodes_schedule: EpisodeScheduleItem[];
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

function mapOriginalSource(rawSource: string | null | undefined): string {
  if (!rawSource) return '';
  const s = rawSource.toUpperCase();
  if (s.includes('MANGA') || s === 'WEB_MANGA' || s === 'COMIC') return 'Manga';
  if (s.includes('VISUAL_NOVEL') || s.includes('EROGE')) return 'Visual Novel / Eroge';
  if (s.includes('LIGHT_NOVEL') || s.includes('NOVEL')) return 'Light Novel';
  if (s.includes('ORIGINAL')) return 'Original Anime';
  if (s.includes('DOUJINSHI')) return 'Doujinshi';
  if (s.includes('GAME')) return 'Video Game';
  if (s.includes('OTHER')) return 'Other';
  return rawSource;
}

function getSuggestedSeasonTitle(format: string): string {
  const f = (format || '').toUpperCase();
  if (f === 'OVA' || f === 'ONA') return 'OVAs';
  if (f === 'MOVIE') return 'Movies';
  if (f === 'SPECIAL') return 'Specials';
  return 'Season 1';
}

function matchTags(genres: string[] = [], tags: { name: string; rank?: number }[] = [], format = ''): string[] {
  const result = new Set<string>();

  // If format is OVA or ONA, ensure OVA is included
  const f = format.toUpperCase();
  if (f === 'OVA' || f === 'ONA') {
    result.add('OVA');
  } else if (f === 'MOVIE') {
    result.add('Movie');
  }

  // Add official GENRES matches
  for (const g of genres) {
    const foundGenre = GENRES.find(cg => cg.toLowerCase() === g.toLowerCase());
    if (foundGenre) {
      result.add(foundGenre);
    } else {
      result.add(g);
    }
  }

  const sortedTags = [...tags].sort((a, b) => (b.rank || 0) - (a.rank || 0));
  for (const t of sortedTags) {
    const tName = t.name.trim();
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

function formatAiringAtToDateStr(epochSeconds: number): string {
  try {
    // AniList episode airing schedules are keyed in Japan Standard Time (JST, UTC+9).
    // Converting directly to UTC via toISOString() subtracts 9 hours and shifts the date
    // to the previous day. Using en-CA with Asia/Tokyo ensures standard YYYY-MM-DD format
    // matching the official Japanese release calendar date.
    const d = new Date(epochSeconds * 1000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    // Fallback: add 9 hours (JST offset) and format ISO date
    const jstMs = epochSeconds * 1000 + (9 * 60 * 60 * 1000);
    return new Date(jstMs).toISOString().split('T')[0];
  }
}

function buildEpisodeSchedule(
  episodesCount: number,
  format: string,
  durationMinutes: number,
  startDateStr: string,
  endDateStr: string,
  airingNodes: { episode: number; airingAt: number }[] = [],
  bannerUrl = '',
  coverUrl = '',
  seriesSynopsis = ''
): EpisodeScheduleItem[] {
  const total = Math.max(episodesCount, airingNodes.length, 1);
  const items: EpisodeScheduleItem[] = [];
  const f = (format || '').toUpperCase();

  for (let epNum = 1; epNum <= total; epNum++) {
    const scheduled = airingNodes.find(n => n.episode === epNum);
    let airDate = '';

    if (scheduled?.airingAt) {
      airDate = formatAiringAtToDateStr(scheduled.airingAt);
    } else if (epNum === 1 && startDateStr) {
      airDate = startDateStr;
    } else if (epNum === total && endDateStr) {
      airDate = endDateStr;
    } else if (startDateStr && endDateStr && total > 1) {
      // Linearly interpolate between startDate and endDate at noon UTC to prevent boundary shift
      const startMs = new Date(`${startDateStr}T12:00:00Z`).getTime();
      const endMs = new Date(`${endDateStr}T12:00:00Z`).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        const step = (endMs - startMs) / (total - 1);
        const interpolated = new Date(startMs + step * (epNum - 1));
        airDate = interpolated.toISOString().split('T')[0];
      } else {
        airDate = startDateStr;
      }
    } else {
      airDate = startDateStr || '';
    }

    const airDateLocal = airDate ? `${airDate}T00:00` : '';

    let epTitle = `Episode ${epNum}`;
    if (f === 'OVA' || f === 'ONA') {
      epTitle = `OVA ${epNum}`;
    } else if (f === 'SPECIAL') {
      epTitle = `Special ${epNum}`;
    } else if (f === 'MOVIE') {
      epTitle = total === 1 ? 'Movie' : `Part ${epNum}`;
    }

    items.push({
      episode: epNum,
      title: epTitle,
      air_date: airDate,
      air_date_local: airDateLocal,
      duration_minutes: durationMinutes || 24,
      duration_seconds: (durationMinutes || 24) * 60,
      thumbnail_url: bannerUrl || coverUrl || '',
      synopsis: seriesSynopsis ? `${seriesSynopsis.slice(0, 180)}...` : ''
    });
  }

  return items;
}

// -------------------------------------------------------------
// GET: Query AniList (with Kitsu fallback) for anime metadata
// -------------------------------------------------------------
export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || searchParams.get('seriesTitle')?.trim();
    const episodeNumberParam = searchParams.get('episodeNumber');
    const targetEpNum = episodeNumberParam ? parseInt(episodeNumberParam, 10) : null;

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
            source
            countryOfOrigin
            episodes
            duration
            startDate { year month day }
            endDate { year month day }
            coverImage {
              extraLarge
              large
              medium
              color
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
            airingSchedule(perPage: 50) {
              nodes {
                episode
                airingAt
              }
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
          const format = item.format || 'OVA';
          const originalSource = mapOriginalSource(item.source);
          const country = item.countryOfOrigin === 'JP' ? 'Japan' : (item.countryOfOrigin || 'Japan');
          const suggestedSeasonTitle = getSuggestedSeasonTitle(format);

          let mappedStatus: 'completed' | 'ongoing' | 'upcoming' = 'ongoing';
          if (item.status === 'FINISHED') mappedStatus = 'completed';
          else if (item.status === 'NOT_YET_RELEASED') mappedStatus = 'upcoming';

          const tags = matchTags(item.genres, item.tags, format);
          const aliases = Array.isArray(item.synonyms) ? item.synonyms.filter(Boolean) : [];
          const startDateStr = formatDate(item.startDate?.year, item.startDate?.month, item.startDate?.day);
          const endDateStr = formatDate(item.endDate?.year, item.endDate?.month, item.endDate?.day);
          const bannerUrl = item.bannerImage || '';
          const posterUrl = item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || '';
          const cleanedDesc = cleanHtmlDescription(item.description);

          const episodesSchedule = buildEpisodeSchedule(
            item.episodes || 1,
            format,
            item.duration || 24,
            startDateStr,
            endDateStr,
            item.airingSchedule?.nodes || [],
            bannerUrl,
            posterUrl,
            cleanedDesc
          );

          return {
            id: String(item.id),
            source: 'anilist',
            title: rawTitle,
            slug: slugify(rawTitle),
            alt_title_japanese: item.title?.native || '',
            alt_title_romaji: item.title?.romaji || '',
            alt_title_english: item.title?.english || '',
            description: cleanedDesc,
            studio: matchedStudio,
            release_year: releaseYear,
            status: mappedStatus,
            episode_count: item.episodes || '',
            runtime: item.duration || '',
            first_air_date: startDateStr,
            last_air_date: endDateStr,
            poster_url: posterUrl,
            banner_url: bannerUrl,
            tags,
            aliases,
            is_adult: !!item.isAdult,
            format,
            original_source: originalSource,
            country,
            suggested_season_title: suggestedSeasonTitle,
            episodes_schedule: episodesSchedule
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
            const format = attr.subtype?.toUpperCase() || 'OVA';
            const suggestedSeasonTitle = getSuggestedSeasonTitle(format);
            
            let mappedStatus: 'completed' | 'ongoing' | 'upcoming' = 'ongoing';
            if (attr.status === 'finished') mappedStatus = 'completed';
            else if (attr.status === 'upcoming') mappedStatus = 'upcoming';

            const aliases: string[] = [];
            if (attr.titles?.ja_jp) aliases.push(attr.titles.ja_jp);
            if (attr.abbreviatedTitles && Array.isArray(attr.abbreviatedTitles)) {
              aliases.push(...attr.abbreviatedTitles);
            }

            const posterUrl = attr.posterImage?.original || attr.posterImage?.large || '';
            const bannerUrl = attr.coverImage?.original || attr.coverImage?.large || '';
            const cleanedDesc = cleanHtmlDescription(attr.synopsis);

            const episodesSchedule = buildEpisodeSchedule(
              attr.episodeCount || 1,
              format,
              attr.episodeLength || 24,
              attr.startDate || '',
              attr.endDate || '',
              [],
              bannerUrl,
              posterUrl,
              cleanedDesc
            );

            return {
              id: String(item.id),
              source: 'kitsu',
              title,
              slug: slugify(title),
              alt_title_japanese: attr.titles?.ja_jp || '',
              alt_title_romaji: attr.titles?.en_jp || '',
              alt_title_english: attr.titles?.en || attr.titles?.en_us || '',
              description: cleanedDesc,
              studio: '',
              release_year: releaseYear,
              status: mappedStatus,
              episode_count: attr.episodeCount || '',
              runtime: attr.episodeLength || '',
              first_air_date: attr.startDate || '',
              last_air_date: attr.endDate || '',
              poster_url: posterUrl,
              banner_url: bannerUrl,
              tags: ['Hentai', format === 'OVA' ? 'OVA' : ''],
              aliases,
              is_adult: attr.ageRating === 'R18',
              format,
              original_source: 'Anime',
              country: 'Japan',
              suggested_season_title: suggestedSeasonTitle,
              episodes_schedule: episodesSchedule
            };
          });
        }
      } catch (kitsuErr) {
        console.warn('Kitsu fallback also failed:', kitsuErr);
      }
    }

    // 3. If targetEpNum is requested, find and format specific episode metadata
    let targetedEpisode: any = null;
    let allEpisodesForTarget: EpisodeScheduleItem[] = [];

    if (targetEpNum !== null && results.length > 0) {
      const topMatch = results[0];
      allEpisodesForTarget = topMatch.episodes_schedule || [];
      const foundEp = allEpisodesForTarget.find(e => e.episode === targetEpNum);

      if (foundEp) {
        targetedEpisode = {
          series_title: topMatch.title,
          series_japanese_title: topMatch.alt_title_japanese,
          format: topMatch.format,
          episode_number: foundEp.episode,
          title: foundEp.title,
          air_date: foundEp.air_date,
          air_date_local: foundEp.air_date_local,
          duration_seconds: foundEp.duration_seconds,
          duration_minutes: foundEp.duration_minutes,
          thumbnail_url: foundEp.thumbnail_url,
          description: foundEp.synopsis || topMatch.description
        };
      } else {
        // Fallback for an episode beyond the schedule
        const f = topMatch.format.toUpperCase();
        targetedEpisode = {
          series_title: topMatch.title,
          series_japanese_title: topMatch.alt_title_japanese,
          format: topMatch.format,
          episode_number: targetEpNum,
          title: (f === 'OVA' || f === 'ONA') ? `OVA ${targetEpNum}` : `Episode ${targetEpNum}`,
          air_date: topMatch.first_air_date,
          air_date_local: topMatch.first_air_date ? `${topMatch.first_air_date}T00:00` : '',
          duration_seconds: ((topMatch.runtime ? Number(topMatch.runtime) : 24) * 60),
          duration_minutes: topMatch.runtime ? Number(topMatch.runtime) : 24,
          thumbnail_url: topMatch.banner_url || topMatch.poster_url,
          description: topMatch.description
        };
      }
    }

    return NextResponse.json({
      results,
      episode: targetedEpisode,
      all_episodes: allEpisodesForTarget
    });
  } catch (err: any) {
    console.error('Metadata import GET error:', err);
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Server Error' }, { status });
  }
}

// -------------------------------------------------------------
// POST: Download remote poster/banner/thumbnail and save to Cloudflare R2
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

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const safeSlug = slug ? slugify(slug).slice(0, 40) : 'asset';
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
    return NextResponse.json({
      key: '',
      error: err.message || 'Image upload failed',
      fallback: true
    }, { status: 200 });
  }
}
