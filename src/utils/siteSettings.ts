import fs from 'fs';
import path from 'path';

export interface SiteSettings {
  latest_series_sort_mode?: string;
  hero_banner_source?: string;
  hero_banner_slide_count?: string;
  homepage_explore_categories?: string;
  global_seo_keywords?: string;
  ads_block_banners?: string;
  ads_block_popunder?: string;
  ads_block_instant_message?: string;
  ads_block_in_page_push?: string;
  ads_disabled_zones?: string;
  ga4_measurement_id?: string;
  cloudflare_analytics_token?: string;
  [key: string]: any;
}

let cachedSettings: SiteSettings | null = null;
let lastReadTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60-second in-memory cache

/**
 * Returns site settings cached in memory to eliminate synchronous disk reads
 * (fs.readFileSync) on every HTTP request, dramatically reducing TTFB.
 */
export function getSiteSettings(): SiteSettings {
  const now = Date.now();
  if (cachedSettings && (now - lastReadTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }

  try {
    const filePath = path.join(process.cwd(), 'src', 'utils', 'site_settings.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      cachedSettings = JSON.parse(fileData);
      lastReadTime = now;
      return cachedSettings || {};
    }
  } catch (err) {
    console.error('Error reading site_settings.json:', err);
  }

  return cachedSettings || {};
}
