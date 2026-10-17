#!/usr/bin/env node

/**
 * HentaiKage IndexNow Automated Submitter
 * Submits all published series, episodes, genres, studios, and core pages
 * to IndexNow (Bing, Yandex, Yahoo, Naver, Seznam) in one automated batch.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HOST = 'hentaikage.cc';
const BASE_URL = `https://${HOST}`;
const INDEXNOW_KEY = '8f074d2b270a442e9fb05b0d6b9d62ab';
const KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;

async function main() {
  console.log('🚀 [HentaiKage IndexNow Automation] Generating URL list...');

  const catalogPath = path.join(rootDir, 'src', 'data', 'local_catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('❌ Could not find local_catalog.json at:', catalogPath);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const urls = new Set();

  // 1. Core Landing Pages
  const corePages = [
    '/',
    '/trending',
    '/uncensored',
    '/3d',
    '/ongoing',
    '/upcoming',
    '/completed',
    '/categories',
    '/genres',
    '/playlists',
    '/studios',
    '/recent/series',
    '/recent/episodes',
    '/faq',
    '/terms',
    '/privacy',
    '/dmca',
    '/content-removal',
    '/2257',
    '/contact'
  ];

  corePages.forEach(p => urls.add(`${BASE_URL}${p}`));

  // 2. Published Series
  const seriesMap = new Map();
  (catalog.series || []).forEach(s => {
    if (s.is_published !== false && s.slug) {
      seriesMap.set(s.id, s.slug);
      urls.add(`${BASE_URL}/series/${s.slug}`);
    }
  });

  // 3. Published Episodes
  const seasonSeriesMap = new Map();
  (catalog.seasons || []).forEach(sn => {
    if (sn.series_id) {
      seasonSeriesMap.set(sn.id, sn.series_id);
    }
  });

  (catalog.episodes || []).forEach(ep => {
    if (ep.is_published !== false && ep.video_key) {
      const seriesId = seasonSeriesMap.get(ep.season_id);
      const seriesSlug = seriesId ? seriesMap.get(seriesId) : null;
      if (seriesSlug && ep.episode_number) {
        urls.add(`${BASE_URL}/watch/${seriesSlug}-episode-${ep.episode_number}`);
      } else if (ep.id) {
        urls.add(`${BASE_URL}/watch/${ep.id}`);
      }
    }
  });

  // 4. Taxonomies (Genres & Studios)
  const popularGenres = [
    'action', 'romance', 'fantasy', 'harem', 'ecchi', 'comedy', 
    'drama', 'sci-fi', 'supernatural', 'slice-of-life', 'milf',
    'uncensored', '3d', 'school-girls', 'tsundere', 'vanilla', 'maid'
  ];
  popularGenres.forEach(g => {
    urls.add(`${BASE_URL}/genres/${g}`);
    urls.add(`${BASE_URL}/categories/${g}`);
  });

  const popularStudios = [
    'queen-bee', 'mary-jane', 'pink-pineapple', 'poro', 'bunnywalker', 
    'seven', 'ms-pictures', 'magic-bus', 'arms', 'studio-jack', 't-rex'
  ];
  popularStudios.forEach(s => {
    urls.add(`${BASE_URL}/studios/${s}`);
  });

  const urlList = Array.from(urls);
  console.log(`✅ Collected ${urlList.length} canonical URLs for submission.`);

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  const endpoints = [
    { name: 'IndexNow.org Master Hub', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Microsoft Bing IndexNow', url: 'https://www.bing.com/indexnow' },
    { name: 'Yandex IndexNow', url: 'https://yandex.com/indexnow' }
  ];

  console.log(`\n📡 Broadcasting to search engine endpoints...`);

  for (const ep of endpoints) {
    try {
      console.log(`➡️  Sending to ${ep.name}...`);
      const response = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 202) {
        console.log(`   ✨ [SUCCESS ${response.status}] ${ep.name} accepted ${urlList.length} URLs!`);
      } else {
        const text = await response.text();
        console.warn(`   ⚠️ [STATUS ${response.status}] ${ep.name}: ${text.slice(0, 150)}`);
      }
    } catch (err) {
      console.error(`   ❌ [ERROR] Failed connecting to ${ep.name}:`, err.message);
    }
  }

  console.log('\n🎉 IndexNow submission completed! Search engines will begin crawling and indexing the batch.\n');
}

main().catch(err => {
  console.error('Fatal error during indexing execution:', err);
  process.exit(1);
});
