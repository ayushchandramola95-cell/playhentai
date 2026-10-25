const BASE_URL = 'https://hentaikage.cc';

const SITEMAPS = [
  { name: 'Index Sitemap', url: `${BASE_URL}/sitemap.xml`, isIndex: true },
  { name: 'Static Routes Sitemap', url: `${BASE_URL}/sitemap-static.xml`, isIndex: false },
  { name: 'Series Sitemap', url: `${BASE_URL}/sitemap-series.xml`, isIndex: false },
  { name: 'Episodes Sitemap', url: `${BASE_URL}/sitemap-episodes.xml`, isIndex: false },
  { name: 'Taxonomies Sitemap', url: `${BASE_URL}/sitemap-taxonomies.xml`, isIndex: false },
  { name: 'Video Sitemap', url: `${BASE_URL}/sitemap-video.xml`, isIndex: false },
];

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 GOOGLE SEARCH CONSOLE SITEMAP HEALTH AUDIT');
  console.log('====================================================\n');

  // 1. Audit robots.txt
  console.log('1️⃣ Checking robots.txt...');
  try {
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
    });
    const robotsTxt = await robotsRes.text();
    console.log(`   Status: ${robotsRes.status} ${robotsRes.statusText}`);
    console.log(`   Content-Type: ${robotsRes.headers.get('content-type')}`);
    const sitemapLines = robotsTxt.split('\n').filter(l => l.toLowerCase().startsWith('sitemap:'));
    console.log(`   Declared Sitemaps in robots.txt (${sitemapLines.length}):`);
    sitemapLines.forEach(l => console.log(`     • ${l.trim()}`));
  } catch (err) {
    console.error(`   ❌ robots.txt fetch error:`, err.message);
  }

  // 2. Audit each Sitemap
  console.log('\n2️⃣ Auditing each Sitemap endpoint...');

  for (const sitemap of SITEMAPS) {
    console.log(`\n----------------------------------------------------`);
    console.log(`📄 Auditing: ${sitemap.name} (${sitemap.url})`);
    try {
      const startTime = Date.now();
      const res = await fetch(sitemap.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'application/xml, text/xml, */*'
        }
      });
      const duration = Date.now() - startTime;
      const text = await res.text();

      console.log(`   • HTTP Status: ${res.status} ${res.statusText} (${duration}ms)`);
      console.log(`   • Content-Type: ${res.headers.get('content-type')}`);
      console.log(`   • Content-Length: ${text.length} bytes`);
      console.log(`   • Cloudflare Cache: ${res.headers.get('cf-cache-status') || 'N/A'}`);
      console.log(`   • Server: ${res.headers.get('server') || 'N/A'}`);

      if (res.status !== 200) {
        console.error(`   ❌ ERROR: Sitemap returned non-200 HTTP status!`);
        continue;
      }

      // Check XML header and tags
      if (!text.startsWith('<?xml version="1.0"')) {
        console.warn(`   ⚠️ Warning: File does not start with standard <?xml declaration!`);
      }

      if (sitemap.isIndex) {
        const matches = text.match(/<sitemap>[\s\S]*?<\/sitemap>/g) || [];
        console.log(`   ✅ Valid <sitemapindex> containing ${matches.length} child sitemaps.`);
        matches.forEach((m, idx) => {
          const locMatch = m.match(/<loc>(.*?)<\/loc>/);
          const lastmodMatch = m.match(/<lastmod>(.*?)<\/lastmod>/);
          console.log(`      ${idx + 1}. <loc>${locMatch ? locMatch[1] : 'MISSING'}</loc> (lastmod: ${lastmodMatch ? lastmodMatch[1] : 'none'})`);
        });
      } else {
        const urlMatches = text.match(/<url>[\s\S]*?<\/url>/g) || [];
        console.log(`   ✅ Valid <urlset> containing ${urlMatches.length} URLs.`);

        if (urlMatches.length > 0) {
          const firstLoc = urlMatches[0].match(/<loc>(.*?)<\/loc>/)?.[1];
          const lastLoc = urlMatches[urlMatches.length - 1].match(/<loc>(.*?)<\/loc>/)?.[1];
          console.log(`      First URL: ${firstLoc}`);
          console.log(`      Last URL:  ${lastLoc}`);
        }

        // Validate URLs & Dates
        let invalidLocs = 0;
        let invalidDates = 0;
        let imageCount = 0;
        let videoCount = 0;

        for (const u of urlMatches) {
          const locMatch = u.match(/<loc>(.*?)<\/loc>/);
          const loc = locMatch ? locMatch[1] : null;
          if (!loc || !loc.startsWith('https://')) {
            invalidLocs++;
          }
          const lastmodMatch = u.match(/<lastmod>(.*?)<\/lastmod>/);
          if (lastmodMatch) {
            const d = new Date(lastmodMatch[1]);
            if (isNaN(d.getTime())) invalidDates++;
          }
          if (u.includes('<image:image>')) imageCount++;
          if (u.includes('<video:video>')) videoCount++;
        }

        if (invalidLocs > 0) {
          console.warn(`   ⚠️ Warning: Found ${invalidLocs} invalid <loc> entries!`);
        } else {
          console.log(`   ✅ All <loc> URLs are valid HTTPS URLs.`);
        }

        if (invalidDates > 0) {
          console.warn(`   ⚠️ Warning: Found ${invalidDates} invalid <lastmod> dates!`);
        } else {
          console.log(`   ✅ All <lastmod> dates are valid.`);
        }

        if (imageCount > 0) {
          console.log(`   🖼️ Contains ${imageCount} <image:image> tags.`);
        }
        if (videoCount > 0) {
          console.log(`   🎬 Contains ${videoCount} <video:video> Google Video objects.`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Failed to audit ${sitemap.url}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('🏁 SITEMAP AUDIT COMPLETE');
  console.log('====================================================\n');
}

runAudit();
