import { MOCK_SERIES } from './mockData';
import { STUDIOS } from './constants';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  bio: string;
  founded: number;
  country: string;
  logoChar: string;
  gradient: string;
}

export interface StudioStats {
  totalSeries: number;
  averageRating: number | string;
}

export interface StudioWithStats extends StudioInfo {
  stats: StudioStats;
  tags: string[];
}

const STUDIO_GRADIENTS = [
  'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
];

export function getStudioGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % STUDIO_GRADIENTS.length;
  return STUDIO_GRADIENTS[index];
}

export function getStudioLogoChar(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name[0] || 'S').toUpperCase();
}

export const STUDIOS_METADATA: StudioInfo[] = [
  {
    id: 'st-1',
    name: 'PoRO',
    slug: 'poro',
    bio: 'PoRO is one of the most prolific and recognized animation studios in the industry, renowned for high-fidelity 2D digital animations, immersive audio design, and premium visuals.',
    founded: 2008,
    country: 'Japan',
    logoChar: 'P',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)'
  },
  {
    id: 'st-2',
    name: 'Bunnywalker',
    slug: 'bunnywalker',
    bio: 'Established in Kyoto, Bunnywalker specializes in vibrant romance and action-drama adaptations, famous for character-centric narratives and rich background details.',
    founded: 2010,
    country: 'Japan',
    logoChar: 'B',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
  },
  {
    id: 'st-3',
    name: 'Mary Jane',
    slug: 'mary-jane',
    bio: 'Mary Jane is a premium animation house known for boundary-pushing supernatural series and high-stakes action scenes, utilizing advanced digital effects and fluid choreography.',
    founded: 2013,
    country: 'Japan',
    logoChar: 'MJ',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
  },
  {
    id: 'st-4',
    name: 'Studio Jack',
    slug: 'studio-jack',
    bio: 'Studio Jack is an indie-focused animation collective producing highly detailed historical and supernatural narratives with unique atmospheric framing.',
    founded: 2015,
    country: 'Japan',
    logoChar: 'SJ',
    gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
  },
  {
    id: 'st-5',
    name: 'Queen Bee',
    slug: 'queen-bee',
    bio: 'Queen Bee is a legendary hentai production studio famous for fast-paced, high-drama adaptations of iconic visual novels and manga series with expressive voice acting.',
    founded: 2004,
    country: 'Japan',
    logoChar: 'QB',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  {
    id: 'st-6',
    name: 'Pink Pineapple',
    slug: 'pink-pineapple',
    bio: 'Pink Pineapple is a pioneer Japanese animation brand with a vast legacy spanning decades, recognized for timeless romantic and supernatural classics.',
    founded: 1993,
    country: 'Japan',
    logoChar: 'PP',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)'
  },
  {
    id: 'st-7',
    name: 'T-Rex',
    slug: 't-rex',
    bio: 'T-Rex is a prolific animation brand under MS Pictures, delivering polished seasonal releases and high-energy fantasy romance adventures.',
    founded: 2011,
    country: 'Japan',
    logoChar: 'TR',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
  },
  {
    id: 'st-8',
    name: 'Seven',
    slug: 'seven',
    bio: 'Studio Seven is a veteran animation studio responsible for numerous successful short-form and full-length anime releases with crisp character art.',
    founded: 2007,
    country: 'Japan',
    logoChar: 'S7',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
  },
  {
    id: 'st-9',
    name: 'Mousou Senka',
    slug: 'mousou-senka',
    bio: 'Mousou Senka is known for high-definition, story-rich hentai anime adaptations focusing on psychological depth and romance.',
    founded: 2012,
    country: 'Japan',
    logoChar: 'MS',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)'
  },
  {
    id: 'st-10',
    name: 'MS Pictures',
    slug: 'ms-pictures',
    bio: 'MS Pictures (Milky Studio) is one of the most prominent production houses in adult anime history, overseeing multiple premier boutique animation labels.',
    founded: 1997,
    country: 'Japan',
    logoChar: 'MS',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
  }
];

export const getAllStudiosWithStats = unstable_cache(
  async (): Promise<StudioWithStats[]> => {
    let seriesList: any[] = [];
    try {
      const { data } = await publicSupabaseClient
        .from('series')
        .select('id, studio, rating, tags, title, slug, poster_image_key, cover_image_key, release_year')
        .eq('is_published', true);
      if (data && data.length > 0) {
        seriesList = data;
      }
    } catch (err) {
      console.error('Error fetching series for all studios stats:', err);
    }

    if (seriesList.length === 0) {
      seriesList = MOCK_SERIES;
    }

    // Group series by studio slug (ensuring unique slugs)
    const studioGroups: Record<string, { originalName: string; series: any[] }> = {};

    // 1. Pre-seed studioGroups with ALL predefined studios from constants.ts
    STUDIOS.forEach((studioName) => {
      const trimmed = studioName.trim();
      const slug = convertStudioNameToSlug(trimmed);
      if (slug && !studioGroups[slug]) {
        studioGroups[slug] = { originalName: trimmed, series: [] };
      }
    });

    // 2. Also incorporate metadata list
    STUDIOS_METADATA.forEach((meta) => {
      if (!studioGroups[meta.slug]) {
        studioGroups[meta.slug] = { originalName: meta.name, series: [] };
      }
    });

    // 3. Scan seriesList to attach series to matching studios or create dynamic entries
    seriesList.forEach((s) => {
      const sStudio = (s.studio || '').trim();
      if (!sStudio) return;

      // Support comma-separated studios if a series has multiple studio credits
      const rawNames = sStudio.split(',').map((st: string) => st.trim()).filter(Boolean);

      rawNames.forEach((rawName: string) => {
        const slug = convertStudioNameToSlug(rawName);
        if (!slug) return;

        if (!studioGroups[slug]) {
          studioGroups[slug] = { originalName: rawName, series: [] };
        }
        if (!studioGroups[slug].series.some((item) => item.id === s.id)) {
          studioGroups[slug].series.push(s);
        }
      });
    });

    // 4. Construct unified studio models with stats
    const allStudios: StudioWithStats[] = Object.keys(studioGroups).map((slug) => {
      const { originalName, series } = studioGroups[slug];

      // Find static metadata or generate dynamically
      let meta = STUDIOS_METADATA.find((s) => s.slug === slug);
      if (!meta) {
        // Deterministic founded year between 1998 and 2020
        let hash = 0;
        for (let i = 0; i < originalName.length; i++) {
          hash = originalName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const foundedYear = 1998 + (Math.abs(hash) % 23);

        meta = {
          id: `st-${slug}`,
          name: originalName,
          slug: slug,
          bio: `${originalName} is an acclaimed Japanese animation production studio known for producing distinctive anime adaptations and visual series.`,
          founded: foundedYear,
          country: 'Japan',
          logoChar: getStudioLogoChar(originalName),
          gradient: getStudioGradient(originalName),
        };
      }

      // Stats
      const totalSeries = series.length;
      let totalRating = 0;
      let validRatings = 0;
      series.forEach((s) => {
        if (s.rating) {
          totalRating += Number(s.rating);
          validRatings++;
        }
      });
      const averageRating = validRatings > 0 ? Number((totalRating / validRatings).toFixed(1)) : 0;

      return {
        ...meta,
        stats: {
          totalSeries,
          averageRating: averageRating > 0 ? averageRating : 'N/A',
        },
        tags: Array.from(new Set(series.flatMap((s) => s.tags || []))),
      };
    });

    // Default sort: Studios with series first (descending), then alphabetically by name
    return allStudios.sort((a, b) => {
      if (b.stats.totalSeries !== a.stats.totalSeries) {
        return b.stats.totalSeries - a.stats.totalSeries;
      }
      return a.name.localeCompare(b.name);
    });
  },
  ['all-studios-stats-directory-cache-v2'],
  { revalidate: 3600, tags: ['studios_stats'] }
);

export async function getStudioDetails(slug: string) {
  const allStudios = await getAllStudiosWithStats();
  let currentStudio = allStudios.find((s) => s.slug === slug);

  // Fallback if slug slightly differed
  if (!currentStudio) {
    const matched = STUDIOS.find((st) => convertStudioNameToSlug(st) === slug);
    if (matched) {
      currentStudio = {
        id: `st-${slug}`,
        name: matched,
        slug: slug,
        bio: `${matched} is an animation production studio known for anime releases and series catalog on Play Hentai.`,
        founded: 2012,
        country: 'Japan',
        logoChar: getStudioLogoChar(matched),
        gradient: getStudioGradient(matched),
        stats: { totalSeries: 0, averageRating: 'N/A' },
        tags: [],
      };
    }
  }

  if (!currentStudio) return null;

  // Fetch full series matching this studio
  let seriesList: any[] = [];
  try {
    const { data } = await publicSupabaseClient
      .from('series')
      .select('*')
      .eq('is_published', true);
    if (data && data.length > 0) {
      seriesList = data;
    }
  } catch (err) {
    console.error('Error fetching series for studio details:', err);
  }

  if (seriesList.length === 0) {
    seriesList = MOCK_SERIES;
  }

  const studioSeries = seriesList.filter((s) => {
    const sStudio = (s.studio || '').trim();
    if (!sStudio) return false;
    const rawNames = sStudio.split(',').map((st: string) => st.trim());
    return rawNames.some((r: string) => {
      const sSlug = convertStudioNameToSlug(r);
      return sSlug === slug || r.toLowerCase() === currentStudio!.name.toLowerCase();
    });
  });

  // Calculate related studios (studios with overlapping tags or active studios)
  const currentTags = currentStudio.tags || [];
  const otherStudios = allStudios.filter((s) => s.slug !== slug);

  const relatedStudios = otherStudios
    .map((s) => {
      const otherTags = s.tags || [];
      const intersection = currentTags.filter((t) => otherTags.includes(t)).length;
      return {
        name: s.name,
        slug: s.slug,
        logoChar: s.logoChar,
        gradient: s.gradient,
        totalSeries: s.stats.totalSeries,
        averageRating: s.stats.averageRating,
        intersection,
      };
    })
    .sort((a, b) => b.intersection - a.intersection || b.totalSeries - a.totalSeries)
    .slice(0, 3);

  return {
    ...currentStudio,
    series: studioSeries,
    relatedStudios,
  };
}

export function convertStudioNameToSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
