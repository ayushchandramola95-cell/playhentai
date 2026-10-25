#!/usr/bin/env node

/**
 * HentaiKage Search Engine Notification Utility
 * Note: Google and Bing sunsetted legacy /ping endpoints in late 2023.
 * Sitemaps are now automatically crawled via robots.txt and submitted via Google Search Console and IndexNow.
 */

import { execSync } from 'child_process';

console.log('📡 [Sitemap & Indexing Automation]');
console.log('ℹ️  Note: Google (404) & Bing (410) deprecated legacy /ping endpoints in Dec 2023.');
console.log('ℹ️  Googlebot now discovers sitemaps automatically from robots.txt: https://hentaikage.cc/robots.txt');
console.log('🚀 Running IndexNow for instant indexing on Bing, Yandex, Yahoo, and partners...\n');

try {
  execSync('node scripts/index-now.mjs', { stdio: 'inherit' });
} catch (err) {
  console.error('Error running IndexNow:', err.message);
}
