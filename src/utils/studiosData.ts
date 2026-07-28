import { MOCK_SERIES } from './mockData';
import { createClient } from './supabase/server';

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
    logoChar: 'M',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
  },
  {
    id: 'st-4',
    name: 'Studio Jack',
    slug: 'studio-jack',
    bio: 'Studio Jack is an indie-focused animation collective producing highly detailed historical and supernatural narratives with unique atmospheric framing.',
    founded: 2015,
    country: 'Japan',
    logoChar: 'J',
    gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
  },
  {
    id: 'st-5',
    name: 'Studio Trigger',
    slug: 'studio-trigger',
    bio: 'Studio Trigger is a world-famous mainstream animation studio known for hyper-kinetic, stylized action sequences, vibrant neon-punk color palettes, and expressive characters.',
    founded: 2011,
    country: 'Japan',
    logoChar: 'T',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
  },
  {
    id: 'st-6',
    name: 'A-1 Pictures',
    slug: 'a-1-pictures',
    bio: 'A-1 Pictures is an industry giant producing top-tier fantasy, slice-of-life, and magical series with consistently polished visuals, detailed orchestration, and massive cultural popularity.',
    founded: 2005,
    country: 'Japan',
    logoChar: 'A',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)'
  }
];

export async function getAllStudiosWithStats() {
  const supabase = await createClient();
  let seriesList: any[] = [];
  try {
    const { data } = await supabase
      .from('series')
      .select('*')
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

  seriesList.forEach(s => {
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
      if (!studioGroups[slug].series.some(item => item.id === s.id)) {
        studioGroups[slug].series.push(s);
      }
    });
  });

  const allStudios = Object.keys(studioGroups).map(slug => {
    const { originalName, series } = studioGroups[slug];

    // Find static metadata
    let meta = STUDIOS_METADATA.find(s => s.slug === slug);
    if (!meta) {
      meta = {
        id: `st-fallback-${slug}`,
        name: originalName,
        slug: slug,
        bio: `${originalName} is an animation production company associated with several popular releases on our platform.`,
        founded: 2018,
        country: 'Japan',
        logoChar: originalName.charAt(0).toUpperCase(),
        gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
      };
    }

    // Stats
    const totalSeries = series.length;
    let averageRating = 0;
    let validRatings = 0;
    series.forEach(s => {
      if (s.rating) {
        averageRating += Number(s.rating);
        validRatings++;
      }
    });
    averageRating = validRatings > 0 ? Number((averageRating / validRatings).toFixed(1)) : 0;

    return {
      ...meta,
      stats: {
        totalSeries,
        averageRating: averageRating || 'N/A'
      },
      tags: Array.from(new Set(series.flatMap(s => s.tags || [])))
    };
  });

  // Sort by total series count descending
  return allStudios.sort((a, b) => b.stats.totalSeries - a.stats.totalSeries);
}

export async function getStudioDetails(slug: string) {
  const allStudios = await getAllStudiosWithStats();
  const currentStudio = allStudios.find(s => s.slug === slug);
  if (!currentStudio) return null;

  // Re-fetch full series matching this studio
  const supabase = await createClient();
  let seriesList: any[] = [];
  try {
    const { data } = await supabase
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

  const studioSeries = seriesList.filter(s => {
    const sStudio = s.studio || '';
    const nameMatch = sStudio.toLowerCase() === currentStudio.name.toLowerCase();
    const slugMatch = sStudio.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug;
    return nameMatch || slugMatch;
  });

  // Calculate related studios (studios with overlapping tags, excluding self)
  const currentTags = currentStudio.tags || [];
  const otherStudios = allStudios.filter(s => s.slug !== slug);
  
  const relatedStudios = otherStudios.map(s => {
    const otherTags = s.tags || [];
    const intersection = currentTags.filter(t => otherTags.includes(t)).length;
    return {
      name: s.name,
      slug: s.slug,
      logoChar: s.logoChar,
      gradient: s.gradient,
      totalSeries: s.stats.totalSeries,
      averageRating: s.stats.averageRating,
      intersection
    };
  })
  .filter(s => s.intersection > 0 || s.totalSeries > 0)
  .sort((a, b) => b.intersection - a.intersection || b.totalSeries - a.totalSeries)
  .slice(0, 3);

  return {
    ...currentStudio,
    series: studioSeries,
    relatedStudios
  };
}

export function convertStudioNameToSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
