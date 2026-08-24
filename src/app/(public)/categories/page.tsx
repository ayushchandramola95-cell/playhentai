import React, { Suspense } from 'react';
import { Layers } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import JsonLd from '@/components/JsonLd/JsonLd';
import BrowseHub from '@/components/BrowseHub/BrowseHub';
import { getSeriesViewsMap } from '@/utils/views';
import { tagToSlug } from '@/utils/constants';
import styles from './categories.module.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

interface PageProps {
  searchParams: Promise<{
    genre?: string;
    studio?: string;
    year?: string;
    sort?: string;
    page?: string;
  }>;
}

const GENRE_INTRODUCTIONS: Record<string, string> = {
  action: "Explore action hentai anime featuring intense stories, battles, supernatural conflicts, and adventure. Browse available series and episodes and discover related titles on Play Hentai.",
  fantasy: "Step into fantasy hentai anime worlds filled with magic, mythical beasts, epic quests, and otherworldly encounters. Stream complete episodes online.",
  romance: "Discover romance hentai anime focusing on deep relationships, emotional bonds, love stories, and intimate encounters. Watch full series on Play Hentai.",
  comedy: "Enjoy comedy hentai anime combining hilarious situational humor, parody elements, lighthearted stories, and intimate scenes.",
  'sci-fi': "Dive into sci-fi hentai anime featuring futuristic settings, advanced technology, space exploration, cybernetics, and intense encounters.",
  adventure: "Follow adventure hentai anime journeys across uncharted territories, dangerous dungeons, and heroic quests with exciting encounters.",
  drama: "Experience drama hentai anime with deep storytelling, emotional conflicts, complex character relationships, and intense plots.",
  mystery: "Uncover mystery hentai anime filled with suspense, detective work, supernatural puzzles, and dark secrets.",
  supernatural: "Explore supernatural hentai anime involving spirits, ghosts, yokai, and occult mysteries alongside intimate relationships.",
  harem: "Watch harem hentai anime where multiple characters compete for the affection of a single lead, full of comedy, drama, and intimate encounters.",
  ecchi: "Browse ecchi anime series featuring highly suggestive comedy, fan service, playful themes, and romantic encounters.",
  uncensored: "Explore uncensored hentai anime series in high definition. Stream the absolute best uncensored adult anime episodes.",
  '3d': "Browse 3D hentai anime series rendered with stunning modern CGI graphics, detailed animations, and realistic adult encounters."
};

export async function generateMetadata({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre;
  const studio = params.studio;
  const year = params.year;
  const page = params.page;

  let title = 'Browse Hentai Anime — Genres, Studios & Years | Play Hentai';
  let description = 'Browse hentai anime series by genre, tags, production studio, and release year. Discover new releases, popular titles, and complete series on Play Hentai.';
  let canonicalPath = '/categories';

  if (genre && genre.toLowerCase() !== 'all' && genre.toLowerCase() !== 'all genres') {
    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
    title = `${formattedGenre} Hentai Anime — Watch Online | Play Hentai`;
    description = `Browse ${formattedGenre} hentai anime series on Play Hentai. Discover available episodes, popular titles, and new releases in the ${formattedGenre} category.`;
    canonicalPath = `/categories/${tagToSlug(genre)}`;
  } else if (studio) {
    title = `${studio} Hentai Anime — Browse Studio | Play Hentai`;
    description = `Browse hentai anime from ${studio} on Play Hentai. Explore the studio's series, available episodes, genres, and related titles.`;
    canonicalPath = `/studios/${tagToSlug(studio)}`;
  } else if (year) {
    title = `${year} Hentai Anime — Browse Releases | Play Hentai`;
    description = `Browse hentai anime released in ${year} on Play Hentai. Discover series, available episodes, genres, and popular titles from ${year}.`;
    canonicalPath = `/year/${year}`;
  }

  if (page && page !== '1') {
    const querySymbol = canonicalPath.includes('?') ? '&' : '?';
    canonicalPath += `${querySymbol}page=${page}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonicalPath}`,
      siteName: 'Play Hentai',
      locale: 'en_US',
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// 60-Second TTL Cached Categories Series Query
const getCachedCategoriesSeries = unstable_cache(
  async () => {
    let dbSeries: any[] = [];
    let isDbEmpty = true;

    try {
      const viewsMap = await getSeriesViewsMap();

      const { data: seriesData } = await publicSupabaseClient
        .from('series')
        .select(`
          *,
          seasons (
            is_published,
            episodes (
              is_published
            )
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (seriesData && seriesData.length > 0) {
        dbSeries = seriesData.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
        isDbEmpty = false;
      }
    } catch (err) {
      console.error('Error fetching series from DB:', err);
    }

    return { dbSeries, isDbEmpty };
  },
  ['categories-series-catalog-cache-v1'],
  { revalidate: 60, tags: ['categories_catalog'] }
);

// Rich Mock Data with assigned Genres, Studios, and Release Years matching images
const MOCK_SERIES = [
  {
    id: 'mock-1',
    title: 'Cyberpunk Odyssey',
    slug: 'cyberpunk-odyssey',
    description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network and change everything.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Action', 'Cyberpunk', 'Uncensored', '3D'],
    category: 'Sci-Fi',
    studio: 'PoRO',
    releaseYear: 2024
  },
  {
    id: 'mock-2',
    title: 'Fantasy Chronicles: Runes',
    slug: 'fantasy-chronicles-runes',
    description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Adventure', 'Magic', 'Vanilla'],
    category: 'Fantasy',
    studio: 'Bunnywalker',
    releaseYear: 2023
  },
  {
    id: 'mock-3',
    title: 'Neon Tokyo Noir',
    slug: 'neon-tokyo-noir',
    description: 'A detective investigates a series of unexplained disappearances in the neon-lit underbelly of Tokyo\'s futuristic nightlife districts.',
    poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    tags: ['Action', 'Thriller', 'Mystery', 'Tsundere'],
    category: 'Action',
    studio: 'PoRO',
    releaseYear: 2025
  },
  {
    id: 'mock-4',
    title: 'Celestial Guardians',
    slug: 'celestial-guardians',
    description: 'As dark rifts tear open across the skies, an elite band of winged guardians must reunite to defend the floating cities from primordial beasts.',
    poster_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Action', 'Adventure', 'Super Power'],
    category: 'Fantasy',
    studio: 'Mary Jane',
    releaseYear: 2026
  },
  {
    id: 'mock-5',
    title: 'Shadow Ninja Legend',
    slug: 'shadow-ninja-legend',
    description: 'A banished ninja warrior uncovers a secret scroll revealing the resurrection of an ancient shadow clan, forcing him to face his former masters.',
    poster_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=500&auto=format&fit=crop&q=80',
    tags: ['Action', 'Adventure', 'Historical', 'Demons'],
    category: 'Action',
    studio: 'Studio Jack',
    releaseYear: 2022
  },
  {
    id: 'mock-6',
    title: 'Retro Arcade Rider',
    slug: 'retro-arcade-rider',
    description: 'In a retro-futuristic world where virtual motorcycle racing determines social status, an underdog rider enters the legendary Grand Neon Prix.',
    poster_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Sports', 'Racing', 'Vanilla'],
    category: 'Sci-Fi',
    studio: 'Bunnywalker',
    releaseYear: 2026
  }
];

export default async function CategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre;
  const studio = params.studio;
  const year = params.year;
  const pageParam = params.page;
  const currentPage = pageParam ? parseInt(pageParam, 10) || 1 : 1;
  const ITEMS_PER_PAGE = 24;

  const { dbSeries, isDbEmpty } = await getCachedCategoriesSeries();
  const activeSeries = isDbEmpty ? MOCK_SERIES : dbSeries;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': SITE_URL,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Browse Library',
        'item': `${SITE_URL}/categories`,
      },
    ],
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageSeries = activeSeries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Browse Hentai Anime Categories & Series on Play Hentai',
    'url': `${SITE_URL}/categories`,
    'itemListElement': pageSeries.map((s: any, i: number) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': s.title,
      'url': `${SITE_URL}/series/${s.slug}`,
    })),
  };

  let h1Text = 'Browse Hentai Anime';
  let introText = 'Filter through our complete collection of hentai anime series by genres, tags, production studios, and release years.';
  let basePath = '/categories';

  if (genre && genre.toLowerCase() !== 'all' && genre.toLowerCase() !== 'all genres') {
    const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
    h1Text = `${formattedGenre} Hentai Anime`;
    const key = genre.toLowerCase().trim();
    introText = GENRE_INTRODUCTIONS[key] || `Browse ${formattedGenre} hentai anime series on Play Hentai. Discover available episodes, popular titles, and new releases in the ${formattedGenre} category.`;
    basePath = `/categories/${tagToSlug(genre)}`;
  } else if (studio) {
    h1Text = `${studio} Hentai Anime`;
    introText = `Browse hentai anime from ${studio} on Play Hentai. Explore the studio's series, available episodes, genres, and related titles.`;
    basePath = `/studios/${tagToSlug(studio)}`;
  } else if (year) {
    h1Text = `${year} Hentai Anime`;
    introText = `Browse hentai anime released in ${year} on Play Hentai. Discover series, available episodes, genres, and popular titles from ${year}.`;
    basePath = `/year/${year}`;
  }

  return (
    <div className={styles.container}>
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />
      <div className="ambient-glow" />

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className={styles.crumbDivider}>/</span>
        <span className={styles.activeCrumb}>Browse</span>
      </nav>

      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleRow}>
          <Layers size={28} className={styles.headerIcon} />
          <h1>{h1Text}</h1>
        </div>
        <p className={styles.subtext}>
          {introText}
        </p>
      </div>

      {/* Filterable Browse Hub */}
      <Suspense fallback={null}>
        <BrowseHub initialSeries={activeSeries} isDbEmpty={isDbEmpty} basePath={basePath} />
      </Suspense>
    </div>
  );
}
