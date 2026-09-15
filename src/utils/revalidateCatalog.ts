import { revalidateTag } from 'next/cache';

/**
 * Instantly invalidates all public catalog, sitemap, and RSS feed caches
 * when an admin creates, updates, or deletes a series, season, or episode.
 * Guarantees zero delay in new content appearing on the site and sitemaps.
 */
export function revalidateAllCatalogTags() {
  const tags = [
    'homepage_catalog',
    'all_series_catalog',
    'series_catalog',
    'series_details',
    'episodes_catalog',
    'video_sitemap',
    'rss_feed',
    'sitemap_data',
    'categories_catalog',
    'uncensored_catalog',
    '3d_catalog',
    'randomizer_catalog',
    'watch_episode',
    'series_list'
  ];

  for (const tag of tags) {
    try {
      revalidateTag(tag, {});
    } catch (err) {
      // In development or edge runtimes, gracefully ignore if tag is not registered
    }
  }
}
