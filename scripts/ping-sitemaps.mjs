#!/usr/bin/env node

/**
 * HentaiKage Sitemap Ping Automation
 * Pings Google Search Console and Bing endpoints with current sitemaps.
 */

const BASE_URL = 'https://hentaikage.cc';

const sitemaps = [
  `${BASE_URL}/sitemap.xml`,
  `${BASE_URL}/sitemap-video.xml`
];

async function pingSitemaps() {
  console.log('📡 [Sitemap Ping Automation] Starting search engine pings...\n');

  for (const sitemap of sitemaps) {
    console.log(`📌 Target: ${sitemap}`);

    // Google Ping
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`;
    try {
      console.log(`  ➡️ Pinging Googlebot...`);
      const res = await fetch(googlePingUrl);
      console.log(`     Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.warn(`     Google ping error: ${err.message}`);
    }

    // Bing Ping
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`;
    try {
      console.log(`  ➡️ Pinging Bingbot...`);
      const res = await fetch(bingPingUrl);
      console.log(`     Status: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.warn(`     Bing ping error: ${err.message}`);
    }

    console.log('');
  }

  console.log('🎉 Sitemap pings dispatched successfully!');
}

pingSitemaps().catch(err => {
  console.error('Error during ping:', err);
});
