const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const headers = {
  'apikey': serviceRoleKey,
  'Authorization': `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

// Mock data list extracted directly from mockData
const MOCK_SERIES_LIST = [
  { id: 'mock-1', title: 'Cyberpunk Odyssey', slug: 'cyberpunk-odyssey', description: 'In a neon-drenched metropolis, a rogue netrunner discovers a data anomaly that could rewrite the city\'s neural network.', poster_image_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80', tags: ['Sci-Fi', 'Action', 'Cyberpunk', 'featured'], category: 'Sci-Fi', views: 4189, status: 'finalized', rating: 8.5, release_year: 2026, studio: 'Studio Trigger' },
  { id: 'mock-2', title: 'Fantasy Chronicles: Runes', slug: 'fantasy-chronicles-runes', description: 'A young mage sets out on a journey across uncharted magical islands to unlock the secrets of ancient runic monuments.', poster_image_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80', tags: ['Fantasy', 'Adventure', 'Magic'], category: 'Fantasy', views: 7476, status: 'finalized', rating: 7.9, release_year: 2025, studio: 'A-1 Pictures' },
  { id: 'mock-3', title: 'Neon Tokyo Noir', slug: 'neon-tokyo-noir', description: 'A detective investigates a series of unexplained disappearances in the neon-lit underbelly of Tokyo\'s futuristic nightlife districts.', poster_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80', tags: ['Action', 'Thriller', 'Mystery'], category: 'Action', views: 9812, status: 'finalized', rating: 8.2, release_year: 2026, studio: 'PoRO' },
  { id: 'mock-4', title: 'Celestial Guardians', slug: 'celestial-guardians', description: 'As dark rifts tear open across the skies, an elite band of winged guardians must defend the floating cities.', poster_image_key: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop&q=80', tags: ['Fantasy', 'Action', 'Adventure'], category: 'Fantasy', views: 3201, status: 'airing', rating: 8.8, release_year: 2026, studio: 'Mary Jane' },
  { id: 'mock-5', title: 'Shadow Ninja Legend', slug: 'shadow-ninja-legend', description: 'A banished ninja warrior uncovers a secret scroll revealing the resurrection of an ancient shadow clan.', poster_image_key: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=1200&auto=format&fit=crop&q=80', tags: ['Action', 'Adventure', 'Historical'], category: 'Action', views: 5122, status: 'finalized', rating: 7.2, release_year: 2025, studio: 'Studio Jack' },
  { id: 'mock-6', title: 'Retro Arcade Rider', slug: 'retro-arcade-rider', description: 'In a retro-futuristic world where virtual motorcycle racing determines social status, an underdog rider enters the Grand Neon Prix.', poster_image_key: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80', tags: ['Sci-Fi', 'Sports', 'Racing'], category: 'Sci-Fi', views: 2419, status: 'airing', rating: 6.9, release_year: 2026, studio: 'Bunnywalker' },
  { id: 'mock-7', title: 'Ookii Onnanoko wa Suki desu ka?', slug: 'ookii-onnanoko-wa-suki-desu-ka', description: 'A hilarious ecchi comedy about college students getting caught in multiple awkward room-share and height-difference encounters.', poster_image_key: 'https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=500&auto=format&fit=crop&q=80', cover_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80', banner_image_key: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop&q=80', tags: ['Comedy', 'Harem', 'Ecchi', 'featured'], category: 'Comedy', views: 15410, status: 'finalized', rating: 8.1, release_year: 2025, studio: 'Studio Jack' }
];

const MOCK_EPISODES_DETAILS = {
  'cyberpunk-odyssey': [
    { episode_number: 1, title: 'The Ghost Run', description: 'A high-stakes data heist goes sideways when a digital phantom intercepts the netrunner\'s neural connection.', duration_seconds: 1440, thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { episode_number: 2, title: 'Neon Gridlock', description: 'Trapped inside the Lower Slums grid, our hacker must bargain with an illegal cyberware doctor to escape the corporate tracking drones.', duration_seconds: 1320, thumbnail_key: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { episode_number: 3, title: 'Black Ice Firewall', description: 'Breaching the central server mainframe leads to a final confrontation inside the virtual construct with an AI guardian.', duration_seconds: 1500, thumbnail_key: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' }
  ],
  'fantasy-chronicles-runes': [
    { episode_number: 1, title: 'Ancient Whispers', description: 'Discovering a dormant stone rune in the village outskirts initiates a call that cannot be ignored.', duration_seconds: 1380, thumbnail_key: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
    { episode_number: 2, title: 'The Runic Compass', description: 'Finding the ancient cartographer\'s map reveals the location of the secondary core in the deep floating woods.', duration_seconds: 1260, thumbnail_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
    { episode_number: 3, title: 'Lost Monolith', description: 'Reaching the core monolith forces our wizard to decipher the ancient spellbooks to seal a dark void tear.', duration_seconds: 1480, thumbnail_key: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4' }
  ],
  'neon-tokyo-noir': [
    { episode_number: 1, title: 'Midnight Rain', description: 'A wet alleyway holds the first lead of a missing cyber-augment broker.', duration_seconds: 1440, thumbnail_key: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { episode_number: 2, title: 'Shadow Protocol', description: 'Investigating a corporate penthouse requires slipping past state-of-the-art optical camo guards.', duration_seconds: 1320, thumbnail_key: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4' },
    { episode_number: 3, title: 'Chrome Syndicate', description: 'Cornered in an industrial port warehouses, the detective fights to reveal the truth before his neural chip is wiped.', duration_seconds: 1500, thumbnail_key: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
  ]
};

const STUDIOS = ['PoRO', 'Bunnywalker', 'Mary Jane', 'Studio Jack', 'Studio Trigger', 'A-1 Pictures'];
const CATEGORIES = ['Sci-Fi', 'Fantasy', 'Action', 'Comedy', 'Drama', 'Supernatural'];

async function run() {
  try {
    console.log('🧹 Cleaning existing database tables in sequence...');

    // 1. Clean logs / child constraints
    await cleanTable('watch_history');
    await cleanTable('watchlist');
    await cleanTable('episode_views');
    await cleanTable('series_categories');
    await cleanTable('comments');
    
    // 2. Clean main entities
    await cleanTable('episodes');
    await cleanTable('seasons');
    await cleanTable('series');
    await cleanTable('categories');
    await cleanTable('studios');

    console.log('✅ Cleaning completed.');

    // 3. Seed Studios
    console.log('🌱 Seeding Studios...');
    const studiosMap = {};
    for (const name of STUDIOS) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const studioRes = await insertRecord('studios', { name, slug });
      if (studioRes && studioRes[0]) {
        studiosMap[name] = studioRes[0].id;
      }
    }

    // 4. Seed Categories
    console.log('🌱 Seeding Categories...');
    const categoriesMap = {};
    for (const name of CATEGORIES) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const catRes = await insertRecord('categories', { name, slug });
      if (catRes && catRes[0]) {
        categoriesMap[name] = catRes[0].id;
      }
    }

    // 5. Seed Series
    console.log('🌱 Seeding Series...');
    for (const s of MOCK_SERIES_LIST) {
      const seriesPayload = {
        title: s.title,
        slug: s.slug,
        description: s.description,
        poster_image_key: s.poster_image_key,
        cover_image_key: s.cover_image_key,
        banner_image_key: s.banner_image_key,
        tags: s.tags,
        studio: s.studio,
        release_year: s.release_year,
        is_published: true,
        created_at: new Date().toISOString()
      };

      const insertedSeries = await insertRecord('series', seriesPayload);
      if (!insertedSeries || !insertedSeries[0]) continue;

      const seriesId = insertedSeries[0].id;
      console.log(`✅ Seeded Series: "${s.title}" (ID: ${seriesId})`);

      // Associate with Category
      if (categoriesMap[s.category]) {
        await insertRecord('series_categories', {
          series_id: seriesId,
          category_id: categoriesMap[s.category]
        });
      }

      // 6. Seed Season (Season 1)
      const insertedSeason = await insertRecord('seasons', {
        series_id: seriesId,
        season_number: 1,
        title: 'Season 1',
        is_published: true,
        created_at: new Date().toISOString()
      });
      if (!insertedSeason || !insertedSeason[0]) continue;

      const seasonId = insertedSeason[0].id;

      // 7. Seed Episodes for this season
      const episodeTemplates = MOCK_EPISODES_DETAILS[s.slug] || [
        {
          episode_number: 1,
          title: `Episode 1: Premiere`,
          description: `This is the debut premiere episode for ${s.title}.`,
          duration_seconds: 1440,
          thumbnail_key: s.cover_image_key,
          video_key: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
        }
      ];

      for (const ep of episodeTemplates) {
        await insertRecord('episodes', {
          season_id: seasonId,
          episode_number: ep.episode_number,
          title: ep.title,
          description: ep.description,
          video_key: ep.video_key,
          thumbnail_key: ep.thumbnail_key,
          duration_seconds: ep.duration_seconds,
          release_date: new Date().toISOString(),
          is_published: true,
          created_at: new Date().toISOString()
        });
      }
      console.log(`   - Seeded ${episodeTemplates.length} Episodes for Season 1`);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('👉 Open your browser admin panel to verify the list!');
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('Fatal Seeding Error:', err);
  }
}

async function cleanTable(tableName) {
  const url = `${supabaseUrl}/rest/v1/${tableName}`;
  const res = await fetch(`${url}?select=*`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`⚠️ Warning cleaning table ${tableName}:`, txt);
  }
}

async function insertRecord(tableName, body) {
  const url = `${supabaseUrl}/rest/v1/${tableName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`❌ Error inserting into ${tableName}:`, txt);
    return null;
  }

  return await res.json();
}

run();
