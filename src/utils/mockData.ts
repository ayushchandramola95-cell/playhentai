// Helper to generate ISO date strings relative to current execution time
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

// 10 Mock Series with cover, poster keys, status, and views
export const MOCK_SERIES = [
  {
    id: 'mock-1',
    title: 'Cyberpunk Odyssey',
    slug: 'cyberpunk-odyssey',
    description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Action', 'Cyberpunk', 'featured'],
    category: 'Sci-Fi',
    created_at: daysAgo(1),
    views: 4189,
    status: 'finalized',
    rating: 8.5,
    release_year: 2026,
    studio: 'Studio Trigger'
  },
  {
    id: 'mock-2',
    title: 'Fantasy Chronicles: Runes',
    slug: 'fantasy-chronicles-runes',
    description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Adventure', 'Magic'],
    category: 'Fantasy',
    created_at: daysAgo(2),
    views: 7476,
    status: 'finalized',
    rating: 7.9,
    release_year: 2025,
    studio: 'A-1 Pictures'
  },
  {
    id: 'mock-3',
    title: 'Neon Tokyo Noir',
    slug: 'neon-tokyo-noir',
    description: 'A detective investigates a series of unexplained disappearances in the neon-lit underbelly of Tokyo\'s futuristic nightlife districts.',
    poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    tags: ['Action', 'Thriller', 'Mystery'],
    category: 'Action',
    created_at: daysAgo(3),
    views: 1458,
    status: 'finalized',
    rating: 7.6,
    release_year: 2024,
    studio: 'Madhouse'
  },
  {
    id: 'mock-4',
    title: 'Celestial Guardians',
    slug: 'celestial-guardians',
    description: 'As dark rifts tear open across the skies, an elite band of winged guardians must reunite to defend the floating cities.',
    poster_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Action', 'Adventure', 'featured'],
    category: 'Fantasy',
    created_at: daysAgo(4),
    views: 41619,
    status: 'airing',
    rating: 8.9,
    release_year: 2026,
    studio: 'Kyoto Animation'
  },
  {
    id: 'mock-5',
    title: 'Shadow Ninja Legend',
    slug: 'shadow-ninja-legend',
    description: 'A banished ninja warrior uncovers a secret scroll revealing the resurrection of an ancient shadow clan.',
    poster_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    tags: ['Action', 'Adventure', 'Historical'],
    category: 'Action',
    created_at: daysAgo(5),
    views: 18779,
    status: 'airing',
    rating: 8.1,
    release_year: 2025,
    studio: 'Ufotable'
  },
  {
    id: 'mock-6',
    title: 'Retro Arcade Rider',
    slug: 'retro-arcade-rider',
    description: 'In a retro-futuristic world where virtual motorcycle racing determines social status, an underdog rider enters the legendary Grand Neon Prix.',
    poster_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Sports', 'Racing'],
    category: 'Sci-Fi',
    created_at: daysAgo(6),
    views: 14463,
    status: 'airing',
    rating: 7.2,
    release_year: 2025,
    studio: 'Production I.G'
  },
  {
    id: 'mock-7',
    title: 'Ookii Onnanoko wa Suki desu ka?',
    slug: 'ookii-onnanoko-wa-suki-desu-ka',
    description: 'A hilarious ecchi comedy about college students getting caught in multiple awkward room-share and height-difference encounters.',
    poster_image_key: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    tags: ['Comedy', 'Harem', 'Ecchi', 'featured'],
    category: 'Comedy',
    created_at: daysAgo(7),
    views: 29043,
    status: 'finalized',
    rating: 7.4,
    release_year: 2026,
    studio: 'Bunny Walker'
  },
  {
    id: 'mock-8',
    title: 'Kenki Virgo',
    slug: 'kenki-virgo',
    description: 'An action-filled fantasy following a maiden who inherits a divine sword to seal dark anomalies appearing in her kingdom.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&auto=format&fit=crop&q=80',
    tags: ['Action', 'Fantasy', 'Supernatural'],
    category: 'Action',
    created_at: daysAgo(8),
    views: 13130,
    status: 'finalized',
    rating: 6.9,
    release_year: 2025,
    studio: 'Seven Studios'
  },
  {
    id: 'mock-9',
    title: 'L\'amour fou de l\'automate',
    slug: 'lamour-fou-de-lautomate',
    description: 'A touching sci-fi drama exploring the emotional bonds between an engineer and a sentient cybernetic doll in a collapsing city.',
    poster_image_key: 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
    tags: ['Drama', 'Sci-Fi', 'Romance'],
    category: 'Drama',
    created_at: daysAgo(9),
    views: 18882,
    status: 'airing',
    rating: 8.3,
    release_year: 2024,
    studio: 'Sunrise'
  },
  {
    id: 'mock-10',
    title: 'Shiiku x Kanojo: Tenshi no Kousoku-Hen',
    slug: 'shiiku-x-kanojo-tenshi-no-kousoku-hen',
    description: 'A suspenseful psychological drama mapping the intricate, high-stakes relationship between two childhood friends trapped in a mysterious experiment.',
    poster_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80',
    tags: ['Drama', 'Thriller', 'Uncensored'],
    category: 'Drama',
    created_at: daysAgo(10),
    views: 16535,
    status: 'finalized',
    rating: 7.5,
    release_year: 2026,
    studio: 'PoRO'
  },
  {
    id: 'mock-11',
    title: 'Boku no Pico',
    slug: 'boku-no-pico',
    description: 'Upbeat and effeminate Pico is working at his grandfather\'s coffee shop, Caf Bebe, for the summer. Tamotsu is a white-collar worker who meets Pico and starts a deep bond.',
    poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    tags: ['Shota', 'Vanilla', 'Uncensored'],
    category: 'Vanilla',
    created_at: daysAgo(11),
    views: 1458,
    status: 'finalized',
    rating: 5.5,
    release_year: 2006,
    studio: 'Natural High'
  },
  {
    id: 'mock-12',
    title: 'Onaji Semi no Someya-san ga Sexy Joyuu...',
    slug: 'onaji-semi-no-someya-san-ga-sexy-joyuu',
    description: 'A romantic comedy detailing the unexpected and comedic relationship between a regular high school student and his attractive next-door neighbor.',
    poster_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    tags: ['Ecchi', 'School Girls', 'Uncensored'],
    category: 'Ecchi',
    created_at: daysAgo(12),
    views: 41619,
    status: 'airing',
    rating: 7.8,
    release_year: 2026,
    studio: 'PoRO'
  },
  {
    id: 'mock-13',
    title: 'Muchuu no Tou',
    slug: 'muchuu-no-tou',
    description: 'An action-fantasy following dynamic characters traversing high levels of magical structures to secure their legacy.',
    poster_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=1200&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Harem', 'Magic'],
    category: 'Fantasy',
    created_at: daysAgo(13),
    views: 18779,
    status: 'airing',
    rating: 8.9,
    release_year: 2025,
    studio: 'Seven'
  },
  {
    id: 'mock-14',
    title: 'Paihame Kazoku',
    slug: 'paihame-kazoku',
    description: 'A suspenseful, high-stakes relationship drama depicting intricate household dynamics in a newly configured family.',
    poster_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    tags: ['Gangbang', 'Large Breasts', 'Nipple Fuck', 'Rape', 'School Girls'],
    category: 'Harem',
    created_at: daysAgo(14),
    views: 14463,
    status: 'airing',
    rating: 7.3,
    release_year: 2026,
    studio: 'Juicymango'
  },
  {
    id: 'mock-15',
    title: 'Android Sex Therapist',
    slug: 'android-sex-therapist',
    description: 'A cybernetic therapist assists patients in a high-tech clinic, combining advanced psychological diagnostics and personal emotional recovery.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Uncensored'],
    category: 'Sci-Fi',
    created_at: daysAgo(15),
    views: 29043,
    status: 'finalized',
    rating: 6.8,
    release_year: 2026,
    studio: 'Pink Pineapple'
  },
  {
    id: 'mock-16',
    title: 'Seishidouin no Oshigoto The Animation',
    slug: 'seishidouin-no-oshigoto-the-animation',
    description: 'A comedy following characters performing highly unusual professional tasks in an office environment with plenty of humorous encounters.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
    tags: ['Comedy', 'Harem', 'Ecchi'],
    category: 'Comedy',
    created_at: daysAgo(16),
    views: 13130,
    status: 'finalized',
    rating: 7.4,
    release_year: 2026,
    studio: 'Bunny Walker'
  },
  {
    id: 'mock-17',
    title: 'Heart Mark Oome OVA',
    slug: 'heart-mark-oome-ova',
    description: 'A romantic high school drama exploring the deep bonds and emotional experiences of student couples preparing for graduation.',
    poster_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    tags: ['Drama', 'Romance', 'School Girls'],
    category: 'Drama',
    created_at: daysAgo(17),
    views: 18882,
    status: 'airing',
    rating: 8.8,
    release_year: 2026,
    studio: 'Discovery'
  },
  {
    id: 'mock-18',
    title: 'Chimimouryou',
    slug: 'chimimouryou',
    description: 'A supernatural action fantasy set in a historical world where specialized warriors seal spiritual anomalies appearing in the kingdom.',
    poster_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    tags: ['Supernatural', 'Demons'],
    category: 'Supernatural',
    created_at: daysAgo(18),
    views: 16535,
    status: 'airing',
    rating: 6.6,
    release_year: 2026,
    studio: 'Seven'
  }
];

// 20 Mock Recent Episodes for 5*4 Grid
export const MOCK_EPISODES = [
  { id: 'ep-1', episode_number: 11, title: 'Ookii Onnanoko wa Suki desu ka?', showSlug: 'ookii-onnanoko-wa-suki-desu-ka', isUncensored: true, thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(0) },
  { id: 'ep-2', episode_number: 2, title: 'Kenki Virgo', showSlug: 'kenki-virgo', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(0.1) },
  { id: 'ep-5', episode_number: 1, title: 'Onaji Semi no Someya-san ga Sexy Joyuu...', showSlug: 'cyberpunk-odyssey', isUncensored: true, thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(0.2) },
  { id: 'ep-6', episode_number: 1, title: 'Muchuu no Tou', showSlug: 'fantasy-chronicles-runes', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(0.3) },
  { id: 'ep-3', episode_number: 2, title: 'L\'amour fou de l\'automate', showSlug: 'lamour-fou-de-lautomate', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(4) },
  { id: 'ep-4', episode_number: 1, title: 'Shiiku x Kanojo: Tenshi no Kousoku-Hen', showSlug: 'shiiku-x-kanojo-tenshi-no-kousoku-hen', isUncensored: true, thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(5) },
  { id: 'ep-7', episode_number: 2, title: 'Anal Mania Otaku to Ananii Daisuki...', showSlug: 'neon-tokyo-noir', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(6) },
  { id: 'ep-8', episode_number: 2, title: 'Paihame Kazoku', showSlug: 'cyberpunk-odyssey', isUncensored: true, thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(7) },
  { id: 'ep-9', episode_number: 1, title: 'Cyberpunk Odyssey', showSlug: 'cyberpunk-odyssey', isUncensored: true, thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(8) },
  { id: 'ep-10', episode_number: 2, title: 'Cyberpunk Odyssey', showSlug: 'cyberpunk-odyssey', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(9) },
  { id: 'ep-11', episode_number: 3, title: 'Cyberpunk Odyssey', showSlug: 'cyberpunk-odyssey', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(10) },
  { id: 'ep-12', episode_number: 1, title: 'Fantasy Chronicles: Runes', showSlug: 'fantasy-chronicles-runes', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(11) },
  { id: 'ep-13', episode_number: 2, title: 'Fantasy Chronicles: Runes', showSlug: 'fantasy-chronicles-runes', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(12) },
  { id: 'ep-14', episode_number: 3, title: 'Fantasy Chronicles: Runes', showSlug: 'fantasy-chronicles-runes', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(13) },
  { id: 'ep-15', episode_number: 1, title: 'Neon Tokyo Noir', showSlug: 'neon-tokyo-noir', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(14) },
  { id: 'ep-16', episode_number: 2, title: 'Neon Tokyo Noir', showSlug: 'neon-tokyo-noir', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(15) },
  { id: 'ep-17', episode_number: 3, title: 'Neon Tokyo Noir', showSlug: 'neon-tokyo-noir', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(16) },
  { id: 'ep-18', episode_number: 1, title: 'Celestial Guardians', showSlug: 'celestial-guardians', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(17) },
  { id: 'ep-19', episode_number: 1, title: 'Shadow Ninja Legend', showSlug: 'shadow-ninja-legend', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(18) },
  { id: 'ep-20', episode_number: 1, title: 'Retro Arcade Rider', showSlug: 'retro-arcade-rider', isUncensored: false, thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', release_date: daysAgo(19) }
];

// Rich Mock Data representing the 3-episode requirement per series
export const MOCK_SERIES_DETAILS: Record<string, any> = {
  'cyberpunk-odyssey': {
    id: 'mock-1',
    title: 'Cyberpunk Odyssey',
    description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network and compromise the central megacorporation.',
    poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    tags: ['Sci-Fi', 'Action', 'Cyberpunk', 'featured'],
    category: 'Sci-Fi',
    seasons: [
      {
        id: 'mock-s1',
        season_number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'mock-ep-1', episode_number: 1, title: 'The Ghost Run', description: 'A high-stakes data heist goes sideways when a digital phantom intercepts the netrunner\'s neural connection.', duration_seconds: 1440, thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
          { id: 'mock-ep-2', episode_number: 2, title: 'Neon Gridlock', description: 'Trapped inside the Lower Slums grid, our hacker must bargain with an illegal cyberware doctor to escape the corporate tracking drones.', duration_seconds: 1320, thumbnail_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
          { id: 'mock-ep-3', episode_number: 3, title: 'Black Ice Firewall', description: 'Breaching the central server mainframe leads to a final confrontation inside the virtual construct with an AI guardian.', duration_seconds: 1500, thumbnail_key: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' }
        ]
      }
    ]
  },
  'fantasy-chronicles-runes': {
    id: 'mock-2',
    title: 'Fantasy Chronicles: Runes',
    description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments before they fade.',
    poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    tags: ['Fantasy', 'Adventure', 'Magic'],
    category: 'Fantasy',
    seasons: [
      {
        id: 'mock-s2',
        season_number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'mock-ep-4', episode_number: 1, title: 'Ancient Whispers', description: 'Discovering a dormant stone rune in the village outskirts initiates a call that cannot be ignored.', duration_seconds: 1380, thumbnail_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
          { id: 'mock-ep-5', episode_number: 2, title: 'The Runic Compass', description: 'Finding the ancient cartographer\'s map reveals the location of the secondary core in the deep floating woods.', duration_seconds: 1260, thumbnail_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
          { id: 'mock-ep-6', episode_number: 3, title: 'Lost Monolith', description: 'Reaching the core monolith forces our wizard to decipher the ancient spellbooks to seal a dark void tear.', duration_seconds: 1480, thumbnail_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4' }
        ]
      }
    ]
  },
  'neon-tokyo-noir': {
    id: 'mock-3',
    title: 'Neon Tokyo Noir',
    description: 'A detective investigates a series of unexplained cybernetic disappearances in the dark underbelly of Tokyo\'s futuristic night districts.',
    poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    tags: ['Action', 'Thriller', 'Mystery'],
    category: 'Action',
    seasons: [
      {
        id: 'mock-s3',
        season_number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'mock-ep-7', episode_number: 1, title: 'Midnight Rain', description: 'A wet alleyway holds the first lead of a missing cyber-augment broker.', duration_seconds: 1440, thumbnail_key: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
          { id: 'mock-ep-8', episode_number: 2, title: 'Shadow Protocol', description: 'Investigating a corporate penthouse requires slipping past state-of-the-art optical camo guards.', duration_seconds: 1320, thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4' },
          { id: 'mock-ep-9', episode_number: 3, title: 'Chrome Syndicate', description: 'Cornered in an industrial port warehouses, the detective fights to reveal the truth before his neural chip is wiped.', duration_seconds: 1500, thumbnail_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
        ]
      }
    ]
  },
  'ookii-onnanoko-wa-suki-desu-ka': {
    id: 'mock-7',
    title: 'Ookii Onnanoko wa Suki desu ka?',
    description: 'A hilarious ecchi comedy about college students getting caught in multiple awkward room-share and height-difference encounters.',
    poster_image_key: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=500&auto=format&fit=crop&q=80',
    cover_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    banner_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80',
    tags: ['Comedy', 'Harem', 'Ecchi', 'featured'],
    category: 'Comedy',
    seasons: [
      {
        id: 'mock-s7',
        season_number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'mock-ep-10', episode_number: 1, title: 'Big Roommates', description: 'Two college students find themselves sharing a tiny apartment with a massive height difference.', duration_seconds: 1440, thumbnail_key: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
        ]
      }
    ]
  }
};

