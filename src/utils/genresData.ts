import { GENRES, tagToSlug, isUncensoredSeries, isThreeDSeries } from './constants';
import { getSeriesViewsMap } from './views';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdesazliquregjbptyhc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-PoJ17MrbE01aTCEuoKoAw_c5iKUsVD';
const publicSupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export interface GenreSeriesPreview {
  id: string;
  title: string;
  slug: string;
  poster_image_key: string;
  cover_image_key?: string;
  views?: number;
}

export interface GenreWithStats {
  name: string;
  slug: string;
  description: string;
  seriesCount: number;
  featuredPoster?: string;
  featuredCover?: string;
  previewPosters: string[];
  totalViews: number;
  averageRating: number | string;
  gradient: string;
  isTrending?: boolean;
}

const GENRE_GRADIENTS = [
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
];

export function getGenreGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GENRE_GRADIENTS.length;
  return GENRE_GRADIENTS[index];
}

const GENRE_DESCRIPTIONS: Record<string, string> = {
  '3D': 'Next-generation 3D CGI and photorealistic animated adaptations with fluid dynamics.',
  'Action': 'High-octane battles, martial prowess, and thrilling conflicts mixed with adult passion.',
  'Adventure': 'Epic journeys, dungeon exploration, and quests into mysterious uncharted fantasy lands.',
  'Ahegao': 'Intense ecstasy, expressive climax reactions, and heightened passionate euphoria.',
  'Anal': 'Explicit anal encounters with deep intimacy, intense sensations, and taboo thrill.',
  'Animal Girls': 'Charming heroines with animal ears, playful tails, and cute wild animal traits.',
  'BDSM': 'Bondage, discipline, domination, and submission with consensual power-play dynamics.',
  'Blackmail': 'Intrigue, coercion, and secret schemes where leverage leads to passionate encounters.',
  'Blowjob': 'Detailed oral pleasure scenes, passionate foreplay, and deepthroat climaxes.',
  'Bondage': 'Rope restraint, silk ties, and immobilization creating intense anticipation.',
  'Brainwashed': 'Hypnotic suggestions, mind alterations, and seductive subconscious obedience.',
  'Bukakke': 'Multiple partners showering a willing heroine in ecstatic group climaxes.',
  'Cat Girl': 'Adorable feline heroines with fluffy ears, playful instincts, and sweet purrs.',
  'Comedy': 'Lighthearted humor, hilarious misunderstandings, and cheerful romantic mischief.',
  'Condom': 'Safe-sex practices with transparent protection, realistic pacing, and mutual care.',
  'Cosplay': 'Costume roleplay, conventions, maid uniforms, and fantasy dress-up encounters.',
  'Creampie': 'Internal climax finishes with warm intimacy, intense release, and visible aftermath.',
  'Cross-dressing': 'Gender-bending disguises, trap heroines, and surprising identity revelations.',
  'Cute & Funny': 'Playful charm, youthful energy, and humorous wholesome situations.',
  'Dark Skin': 'Tanned, gyaru, dark-skinned, and sun-kissed heroines with striking visuals.',
  'DeepThroat': 'Intense oral submission and deep throat pleasure with full emotional immersion.',
  'Demons': 'Succubi, demon lords, hellspawn maidens, and dark mystical pacts.',
  'Doctor': 'Medical examinations, clinic checkups, and seductive hospital examinations.',
  'Domination': 'Strong-willed assertive characters taking full command of the bedroom.',
  'Double Penetration': 'Simultaneous dual penetration delivering overwhelming double stimulation.',
  'Drama': 'Complex relationships, emotional turmoil, love triangles, and intense romantic tension.',
  'Dubbed': 'English voice-over audio releases for effortless, immersive listening.',
  'Ecchi': 'Teasing fan service, accidental glimpses, rising tension, and sensual allure.',
  'Elf': 'Immortal forest dwellers, high elves, dark elves, and graceful fantasy heroines.',
  'Eroge': 'Visual novel adaptations featuring multiple branching romance storylines.',
  'Facesitting': 'Sensual dominance and face-sitting pleasure with complete oral surrender.',
  'Facial': 'Finishing climaxes across the face, cheeks, and lips as a mark of passionate ecstasy.',
  'Fantasy': 'Magical kingdoms, sword & sorcery, monsters, guilds, and supernatural powers.',
  'Female Doctor': 'Professional physicians and hospital staff administering intimate treatments.',
  'Female Teacher': 'Sensual educators, private tutors, and alluring professors after school hours.',
  'Femdom': 'Female dominance, gentle or stern mistresses taking the lead.',
  'Footjob': 'Sensual foot worship, silky stockings, and foot stimulation.',
  'Furry': 'Anthropomorphic animal characters with exotic fantasy traits.',
  'Futanari': 'Hermaphrodite heroines possessing both male and female charms.',
  'Gangbang': 'One heroine receiving passionate attention from multiple partners simultaneously.',
  'Gyaru': 'Fashionable, bold, tanned trendsetters with energetic and forward personalities.',
  'Harem': 'One lucky protagonist surrounded by multiple charming, competing heroines.',
  'Historical': 'Feudal Japan, samurai eras, Victorian estates, and ancient imperial court dramas.',
  'Horny Slut': 'Unapologetically passionate heroines with an insatiable appetite for ecstasy.',
  'Housewife': 'Devoted wives, neighbors, and homemakers discovering unexpected passions.',
  'Humiliation': 'Erotic degradation, public exposure thrills, and vulnerable emotional surrender.',
  'Inflation': 'Magical or physical belly expansion and internal fullness sensations.',
  'Internal Cumshot': 'Deep internal climaxes with visible swelling and intense satisfaction.',
  'Lactation': 'Sweet motherly milk production, nursing, and milky pleasure.',
  'Large Breasts': 'Voluptuous heroines with bountiful cleavage, soft curves, and huge assets.',
  'Magical Girls': 'Heroines with sparkling mystical transformations battling seductive forces.',
  'Maid': 'Devoted mansion servants, French maids, and obedient housekeepers.',
  'Martial Arts': 'Disciplined fighters, dojo training, and combat encounters turned intimate.',
  'Megane': 'Glasses-wearing intellectual beauties with hidden passionate sides.',
  'MILF': 'Mature women, experienced mothers, and older seductive beauties.',
  'Mind Break': 'Overwhelming pleasure leading to complete mental bliss and submission.',
  'Molestation': 'Secret fondling in public spaces, trains, libraries, and quiet corners.',
  'Nipple Fuck': 'Sensual stimulation and penetration between prominent, sensitive nipples.',
  'Non-Japanese': 'Foreign heroines, western transfer students, and exotic beauties.',
  'NTR': 'Netorare, forbidden unfaithfulness, and complex love betrayal dramas.',
  'Nuns': 'Holy maidens of the church breaking vows for forbidden worldly pleasures.',
  'Nurses': 'Caring hospital nurses providing therapeutic, hands-on recovery sessions.',
  'Office Ladies': 'Professional corporate heroines, suit-wearing superiors, and workplace romances.',
  'Orc/Goblin': 'Savage fantasy beasts, orc raiders, and goblin tribes claiming captive maidens.',
  'Police': 'Female officers, law enforcers, and undercover agents caught on duty.',
  'POV': 'First-person perspective camera angles placing you directly in the protagonist shoes.',
  'Pregnant': 'Expectant mothers and maternity romances with soft, rounded maternal beauty.',
  'Princess': 'Royal noblewomen, court princesses, and heirs to the throne enjoying secret romance.',
  'Public Sex': 'High-risk intimate encounters in parks, classrooms, theaters, and outdoor spots.',
  'Rape': 'Non-consensual themes and forced encounters within fictional dark fantasy storylines.',
  'Rim job': 'Sensual anilingus and intimate oral stimulation for heightened sensitivity.',
  'Romance': 'Heartwarming love stories, emotional bonds, tender affection, and sweet intimacy.',
  'Scat': 'Extreme taboo scatological fetish scenarios.',
  'School Girls': 'Classic academy uniforms, high school romance, and youthful discoveries.',
  'Sci-Fi': 'Cyberpunk cities, android companions, spaceship voyages, and futuristic tech.',
  'Shimapan': 'Iconic blue-and-white striped panties and cute Japanese undergarments.',
  'Short': 'Bite-sized animation clips, quick OVAs, and rapid-fire encounters.',
  'Shoutacon': 'Younger male protagonists pursued by mature, experienced older heroines.',
  'Sports': 'Athletic heroines, swim teams, gym track stars, and locker room encounters.',
  'Squirting': 'Intense female ejaculation and gushing climaxes from deep stimulation.',
  'Step Daughter': 'Complex blended family dynamics and forbidden step-daughter romance.',
  'Step Mother': 'Alluring step-mothers guiding inexperienced step-sons into adult intimacy.',
  'Step Sister': 'Living under the same roof with an attractive, teasing step-sister.',
  'Stocking': 'Sheer nylon, fishnets, thigh-high stockings, and garter belts.',
  'Strap-on': 'Pegging and toy-assisted penetration where heroines take the dominant role.',
  'Succubus': 'Mythical dream demons who feast upon masculine life energy and desire.',
  'Super Power': 'Telekinesis, super-strength, invisibility, and supernatural enhancements.',
  'Supernatural': 'Ghosts, vampires, spirits, curses, and magical occurrences.',
  'Swimsuit': 'Bikinis, school one-pieces, micro-kinis, and beachside summer romance.',
  'Tentacles': 'Alien and monstrous tentacle creatures claiming exotic maidens.',
  'Three some': 'Passionate trio encounters with multiple partners sharing ecstasy.',
  'Tits Fuck': 'Paizuri, breast stimulation, and deep cleavage friction.',
  'Toys': 'Vibrators, dildos, remote eggs, and electronic pleasure devices.',
  'Train Molestation': 'Crowded commuter trains, quiet cabins, and secretive groping.',
  'Tsundere': 'Initially harsh and prickly heroines who gradually reveal their sweet devotion.',
  'Uncensored': 'Full uncensored visual presentations with decensored frames and explicit detail.',
  'Urination': 'Golden showers, peeing relief, and watersports fetish scenarios.',
  'Vampire': 'Blood-drinking nocturnal beauties, aristocratic vampires, and gothic romance.',
  'Vanilla': 'Wholesome, loving, consensual romance with deep tenderness and sweet affection.',
  'Virgins': 'First-time intimate experiences, nervous anticipation, and gentle defloration.',
  'Widow': 'Lonely mourning widows seeking comfort and rediscovering passion.',
  'X-Ray': 'Internal anatomical cross-section views illustrating internal penetration.',
  'Yuri': 'Romantic and physical intimacy purely between female heroines.'
};

function normalizeTag(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const getAllGenresWithStats = unstable_cache(
  async (): Promise<GenreWithStats[]> => {
    let seriesList: any[] = [];
    try {
      const viewsMap = await getSeriesViewsMap();
      const { data: dbSeries, error } = await publicSupabaseClient
        .from('series')
        .select(`
          id,
          title,
          slug,
          tags,
          poster_image_key,
          cover_image_key,
          banner_image_key,
          status,
          release_year,
          studio,
          created_at
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && dbSeries && dbSeries.length > 0) {
        seriesList = dbSeries.map((s: any) => ({
          ...s,
          views: viewsMap[s.id] || 0
        }));
      } else if (error) {
        console.error('Error fetching series for genres:', error);
      }
    } catch (err) {
      console.error('Error in getAllGenresWithStats:', err);
    }

    // Build map of all genres from constants + any dynamic tags from series
    const allGenreNamesSet = new Set<string>(GENRES);
    seriesList.forEach((s) => {
      (s.tags || []).forEach((t: string) => {
        if (typeof t === 'string' && t.trim()) {
          allGenreNamesSet.add(t.trim());
        }
      });
    });

    const allGenreNames = Array.from(allGenreNamesSet);

    const genresData: GenreWithStats[] = allGenreNames.map((genreName) => {
      const slug = tagToSlug(genreName);
      const normG = normalizeTag(genreName);
      const genLower = genreName.toLowerCase();

      // Find matching series with smart aliases & tag normalization
      const matchingSeries = seriesList.filter((s) => {
        const sTagsNorm = (s.tags || []).map((t: string) => normalizeTag(t));
        const sTitleNorm = normalizeTag(s.title);

        if (sTagsNorm.includes(normG)) return true;

        // Alias matching
        if (normG === 'largebreasts' && (sTagsNorm.includes('bigboobs') || sTagsNorm.includes('hugeboobs') || sTagsNorm.includes('largebreasts'))) return true;
        if (normG === 'bigboobs' && (sTagsNorm.includes('largebreasts') || sTagsNorm.includes('bigboobs'))) return true;
        if (normG === 'schoolgirls' && (sTagsNorm.includes('schoolgirl') || sTagsNorm.includes('schoolgirls'))) return true;
        if (normG === 'schoolgirl' && (sTagsNorm.includes('schoolgirls') || sTagsNorm.includes('schoolgirl'))) return true;
        if (normG === 'blowjob' && (sTagsNorm.includes('blowjob') || sTagsNorm.includes('deepthroat'))) return true;
        if (normG === 'virgins' && (sTagsNorm.includes('virgin') || sTagsNorm.includes('virgins'))) return true;
        if (normG === 'virgin' && (sTagsNorm.includes('virgins') || sTagsNorm.includes('virgin'))) return true;
        if (normG === 'titsfuck' && (sTagsNorm.includes('paizuri') || sTagsNorm.includes('boobjob') || sTagsNorm.includes('titsfuck'))) return true;
        if (normG === 'paizuri' && (sTagsNorm.includes('titsfuck') || sTagsNorm.includes('paizuri') || sTagsNorm.includes('boobjob'))) return true;
        if (normG === 'animalgirls' && (sTagsNorm.includes('animalgirl') || sTagsNorm.includes('catgirl') || sTagsNorm.includes('foxgirl') || sTagsNorm.includes('kemonomimi'))) return true;
        if (normG === 'catgirl' && (sTagsNorm.includes('animalgirl') || sTagsNorm.includes('catgirl') || sTagsNorm.includes('nekomimi'))) return true;
        if (normG === 'stepmother' && (sTagsNorm.includes('stepmom') || sTagsNorm.includes('stepmother'))) return true;
        if (normG === 'stepsister' && (sTagsNorm.includes('stepsis') || sTagsNorm.includes('stepsister'))) return true;
        if (normG === 'stepdaughter' && (sTagsNorm.includes('stepdaughter') || sTagsNorm.includes('stepdaughter'))) return true;
        if (normG === 'uncensored' && (isUncensoredSeries(s) || sTagsNorm.includes('uncensored') || sTitleNorm.includes('uncensored'))) return true;
        if (normG === '3d' && (isThreeDSeries(s) || sTagsNorm.includes('3d') || sTitleNorm.includes('3d') || sTitleNorm.includes('3danimation'))) return true;

        return false;
      });

      // Sort matching series by popularity (views) so the most popular real cover is featured
      matchingSeries.sort((a, b) => {
        const viewsA = Number(a.views) || 0;
        const viewsB = Number(b.views) || 0;
        return viewsB - viewsA;
      });

      const seriesCount = matchingSeries.length;
      let totalViews = 0;
      matchingSeries.forEach((s) => {
        totalViews += Number(s.views) || 0;
      });

      // Best artwork from the most popular series in this genre
      const topMatch = matchingSeries[0];
      const featuredPoster = topMatch?.cover_image_key || topMatch?.poster_image_key || topMatch?.banner_image_key || undefined;
      const featuredCover = topMatch?.cover_image_key || topMatch?.poster_image_key || undefined;
      const previewPosters = matchingSeries
        .slice(0, 3)
        .map((s) => s.poster_image_key || s.cover_image_key)
        .filter(Boolean);

      const description =
        GENRE_DESCRIPTIONS[genreName] ||
        `Discover popular ${genreName} hentai anime series, episodes, and complete release catalogs on Play Hentai.`;

      return {
        name: genreName,
        slug,
        description,
        seriesCount,
        featuredPoster,
        featuredCover,
        previewPosters,
        totalViews,
        averageRating: seriesCount > 0 ? (8.0 + (seriesCount % 15) * 0.1).toFixed(1) : 'N/A',
        gradient: getGenreGradient(genreName),
        isTrending: seriesCount >= 20 || (seriesCount >= 10 && totalViews > 5000),
      };
    });

    // Default sort: Most popular (highest seriesCount & totalViews first), then alphabetically
    return genresData.sort((a, b) => {
      if (b.seriesCount !== a.seriesCount) {
        return b.seriesCount - a.seriesCount;
      }
      if (b.totalViews !== a.totalViews) {
        return b.totalViews - a.totalViews;
      }
      return a.name.localeCompare(b.name);
    });
  },
  ['all-genres-directory-real-v3'],
  { revalidate: 60, tags: ['genres_catalog', 'series_catalog'] }
);
