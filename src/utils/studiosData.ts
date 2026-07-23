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

export async function getStudioDetails(slug: string) {
  // Find matching metadata or auto-create a fallback for unknown studios
  let metadata = STUDIOS_METADATA.find(s => s.slug === slug);
  
  // Connect to Supabase or use Mock data to retrieve associated series
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

  // If metadata doesn't exist, create a clean default template
  if (!metadata) {
    // Try to find the studio name in the series list
    const foundSeries = seriesList.find(s => (s.studio || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
    const studioName = foundSeries ? foundSeries.studio : slug.toUpperCase();

    metadata = {
      id: `st-fallback-${slug}`,
      name: studioName,
      slug: slug,
      bio: `${studioName} is an animation production company associated with several popular releases on our platform.`,
      founded: 2018,
      country: 'Japan',
      logoChar: studioName.charAt(0).toUpperCase(),
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
    };
  }

  // Filter series belonging to this studio (case-insensitive name match or slug match)
  const studioSeries = seriesList.filter(s => {
    const sStudio = s.studio || '';
    const nameMatch = sStudio.toLowerCase() === metadata!.name.toLowerCase();
    const slugMatch = sStudio.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug;
    return nameMatch || slugMatch;
  });

  // Calculate statistics
  const totalSeries = studioSeries.length;
  
  // Calculate average rating of their series
  let averageRating = 0;
  let validRatings = 0;
  
  studioSeries.forEach(s => {
    if (s.rating) {
      averageRating += Number(s.rating);
      validRatings++;
    }
  });
  
  averageRating = validRatings > 0 ? Number((averageRating / validRatings).toFixed(1)) : 0;

  return {
    ...metadata,
    series: studioSeries,
    stats: {
      totalSeries,
      averageRating: averageRating || 'N/A'
    }
  };
}

export function convertStudioNameToSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
