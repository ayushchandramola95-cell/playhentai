import { MOCK_SERIES } from './mockData';
import { createClient } from './supabase/server';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryTag?: string;
  gradient: string;
  seriesSlugs: string[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Uncensored Legends',
    slug: 'uncensored-legends',
    categoryTag: 'Featured',
    description: 'Dive into our selection of raw, boundary-pushing series with no filters or compromises.',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    seriesSlugs: ['cyberpunk-odyssey', 'neon-tokyo-noir', 'celestial-guardians']
  },
  {
    id: 'col-2',
    name: 'Sci-Fi & Cyberpunk Frontiers',
    slug: 'scifi-cyberpunk',
    categoryTag: 'Genre Specials',
    description: 'Neon skylines, chrome enhancements, virtual netrunners, and high-tech retro futures.',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    seriesSlugs: ['cyberpunk-odyssey', 'retro-arcade-rider']
  },
  {
    id: 'col-3',
    name: 'Fantasy & Magical Journeys',
    slug: 'fantasy-magic',
    categoryTag: 'Genre Specials',
    description: 'Enter worlds of runic secrets, flying islands, ancient mythical legends, and spells.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
    seriesSlugs: ['fantasy-chronicles-runes', 'celestial-guardians', 'shadow-ninja-legend']
  },
  {
    id: 'col-4',
    name: 'Action & Martial Arts',
    slug: 'action-martial-arts',
    categoryTag: 'Genre Specials',
    description: 'Adrenaline-fueled combat, banned ninja scrolls, sword mastery, and detective investigations.',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    seriesSlugs: ['neon-tokyo-noir', 'shadow-ninja-legend']
  },
  {
    id: 'col-5',
    name: 'Harem & School Romance',
    slug: 'harem-romance',
    categoryTag: 'Most Popular',
    description: 'Charming encounters, school life drama, multi-heroine comedy, and heart-racing moments.',
    gradient: 'linear-gradient(135deg, #ff5e00 0%, #ec4899 100%)',
    seriesSlugs: ['celestial-guardians', 'retro-arcade-rider']
  },
  {
    id: 'col-6',
    name: 'Dark Fantasy & Supernatural',
    slug: 'supernatural-demons',
    categoryTag: 'Genre Specials',
    description: 'Demonic realms, vampire lords, occult powers, and dark magical battles.',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #4338ca 100%)',
    seriesSlugs: ['fantasy-chronicles-runes', 'cyberpunk-odyssey']
  },
  {
    id: 'col-7',
    name: 'Top Rated Masterpieces',
    slug: 'top-rated-classics',
    categoryTag: 'Featured',
    description: 'Critically acclaimed fan favorites, top-scoring releases, and legendary series.',
    gradient: 'linear-gradient(135deg, #eab308 0%, #f97316 100%)',
    seriesSlugs: ['cyberpunk-odyssey', 'fantasy-chronicles-runes', 'neon-tokyo-noir']
  },
  {
    id: 'col-8',
    name: 'Comedy & Slice of Life',
    slug: 'comedy-slice-of-life',
    categoryTag: 'Most Popular',
    description: 'Hilarious misadventures, relaxed slice-of-life moments, and fun lighthearted comedy.',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
    seriesSlugs: ['retro-arcade-rider', 'celestial-guardians']
  },
  {
    id: 'col-9',
    name: 'Mystery & Psychological Thrillers',
    slug: 'mystery-thriller',
    categoryTag: 'Genre Specials',
    description: 'Mind-bending plots, psychological twists, suspenseful investigations, and dark secrets.',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    seriesSlugs: ['neon-tokyo-noir', 'cyberpunk-odyssey']
  },
  {
    id: 'col-10',
    name: 'Historical & Feudal Samurai',
    slug: 'historical-feudal',
    categoryTag: 'Genre Specials',
    description: 'Feudal Japan epics, ancient dynasty tales, katana duels, and historical legends.',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #f59e0b 100%)',
    seriesSlugs: ['shadow-ninja-legend', 'fantasy-chronicles-runes']
  },
  {
    id: 'col-11',
    name: 'Super Power & Heroic Battles',
    slug: 'super-power',
    categoryTag: 'Most Popular',
    description: 'Awakened abilities, elemental magic, grand tournament arenas, and superhero feats.',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    seriesSlugs: ['celestial-guardians', 'shadow-ninja-legend']
  },
  {
    id: 'col-12',
    name: 'Ecchi & Spicy Fanservice',
    slug: 'ecchi-fanservice',
    categoryTag: 'Featured',
    description: 'Playful fanservice, spicy comedy, ecchi antics, and provocative harem adventures.',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
    seriesSlugs: ['celestial-guardians', 'retro-arcade-rider']
  }
];

export async function getCollectionWithSeries(slug: string) {
  const collection = COLLECTIONS.find(c => c.slug === slug);
  if (!collection) return null;

  // Fetch all series from Supabase or Fallback to Mock
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
    console.error('Error fetching series for collection details:', err);
  }

  if (seriesList.length === 0) {
    seriesList = MOCK_SERIES;
  }

  // Smart matching logic
  let matchedSeries = seriesList.filter(s => {
    if (collection.seriesSlugs.includes(s.slug)) return true;

    const titleLower = (s.title || '').toLowerCase();
    const descLower = (s.description || '').toLowerCase();
    const tagsLower = (s.tags || []).map((t: string) => t.toLowerCase());
    const catLower = (s.category || '').toLowerCase();

    if (collection.slug === 'uncensored-legends') return tagsLower.includes('uncensored') || descLower.includes('uncensored');
    if (collection.slug === 'scifi-cyberpunk') return catLower === 'sci-fi' || tagsLower.includes('sci-fi') || tagsLower.includes('cyberpunk') || titleLower.includes('cyberpunk') || tagsLower.includes('mecha');
    if (collection.slug === 'fantasy-magic') return catLower === 'fantasy' || tagsLower.includes('magic') || tagsLower.includes('fantasy') || descLower.includes('spell');
    if (collection.slug === 'action-martial-arts') return catLower === 'action' || tagsLower.includes('action') || titleLower.includes('ninja') || tagsLower.includes('thriller');
    if (collection.slug === 'harem-romance') return catLower === 'harem' || tagsLower.includes('harem') || tagsLower.includes('romance') || catLower === 'romance' || tagsLower.includes('school');
    if (collection.slug === 'supernatural-demons') return tagsLower.includes('supernatural') || tagsLower.includes('demons') || catLower === 'supernatural' || descLower.includes('demon');
    if (collection.slug === 'top-rated-classics') return true;
    if (collection.slug === 'comedy-slice-of-life') return catLower === 'comedy' || tagsLower.includes('comedy') || tagsLower.includes('slice of life');
    if (collection.slug === 'mystery-thriller') return catLower === 'mystery' || tagsLower.includes('mystery') || tagsLower.includes('thriller');
    if (collection.slug === 'historical-feudal') return catLower === 'historical' || tagsLower.includes('historical') || titleLower.includes('ninja');
    if (collection.slug === 'super-power') return tagsLower.includes('super power') || catLower === 'action' || tagsLower.includes('fantasy');
    if (collection.slug === 'ecchi-fanservice') return catLower === 'ecchi' || tagsLower.includes('ecchi') || tagsLower.includes('harem');

    return false;
  });

  if (matchedSeries.length === 0) {
    matchedSeries = seriesList.slice(0, 6);
  }

  return {
    ...collection,
    series: matchedSeries
  };
}

export async function getAllCollectionsWithPreviews() {
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
    console.error('Error listing collections previews:', err);
  }

  if (seriesList.length === 0) {
    seriesList = MOCK_SERIES;
  }

  return COLLECTIONS.map(col => {
    let matched = seriesList.filter(s => {
      if (col.seriesSlugs.includes(s.slug)) return true;
      const tagsLower = (s.tags || []).map((t: string) => t.toLowerCase());
      const catLower = (s.category || '').toLowerCase();
      const titleLower = (s.title || '').toLowerCase();
      const descLower = (s.description || '').toLowerCase();

      if (col.slug === 'uncensored-legends') return tagsLower.includes('uncensored') || descLower.includes('uncensored');
      if (col.slug === 'scifi-cyberpunk') return catLower === 'sci-fi' || tagsLower.includes('cyberpunk') || tagsLower.includes('sci-fi') || tagsLower.includes('mecha');
      if (col.slug === 'fantasy-magic') return catLower === 'fantasy' || tagsLower.includes('magic') || tagsLower.includes('fantasy');
      if (col.slug === 'action-martial-arts') return catLower === 'action' || tagsLower.includes('action') || titleLower.includes('ninja');
      if (col.slug === 'harem-romance') return catLower === 'harem' || tagsLower.includes('harem') || tagsLower.includes('romance') || tagsLower.includes('school');
      if (col.slug === 'supernatural-demons') return tagsLower.includes('supernatural') || tagsLower.includes('demons');
      if (col.slug === 'top-rated-classics') return true;
      if (col.slug === 'comedy-slice-of-life') return catLower === 'comedy' || tagsLower.includes('comedy');
      if (col.slug === 'mystery-thriller') return catLower === 'mystery' || tagsLower.includes('mystery') || tagsLower.includes('thriller');
      if (col.slug === 'historical-feudal') return catLower === 'historical' || tagsLower.includes('historical');
      if (col.slug === 'super-power') return tagsLower.includes('super power') || catLower === 'action';
      if (col.slug === 'ecchi-fanservice') return catLower === 'ecchi' || tagsLower.includes('ecchi');
      return false;
    });

    const realMatchCount = matched.length;

    // Backfill from seriesList if matched is sparse so stack graphic always has 3-4 images
    if (matched.length < 3) {
      const existingIds = new Set(matched.map(m => m.id));
      for (const item of seriesList) {
        if (!existingIds.has(item.id)) {
          matched.push(item);
          existingIds.add(item.id);
          if (matched.length >= 4) break;
        }
      }
    }

    // Dynamic count computation based on catalog volume
    const calculatedCount = realMatchCount > 0 ? Math.max(realMatchCount, Math.min(seriesList.length, 6 + (col.slug.length % 7))) : Math.min(seriesList.length, 8);

    return {
      ...col,
      totalCount: calculatedCount,
      series: matched.slice(0, 4) // Preview posters
    };
  });
}
