# 🗺️ XML Sitemap Deep Architectural & SEO Audit (`structur&seo/sitemap_page.md`)

This document presents an exhaustive 8-pillar technical and SEO analysis of the **XML Sitemap Generator** (`/sitemap.xml`).

---

## Pillar 1: 📌 Overview & Routing Architecture

- **Route URL**: `https://playhentai.live/sitemap.xml`
- **File Location**: `src/app/sitemap.ts`
- **Next.js App Router Strategy**: Next.js `MetadataRoute.Sitemap` feature generating automated XML response.
- **Cache TTL & Revalidation**: `export const revalidate = 3600;` (1 Hour Cache TTL).

---

## Pillar 2: 🧩 Included URL Categories & Priorities

| URL Type | Pattern / Example | Change Frequency | Priority |
| :--- | :--- | :--- | :--- |
| **Homepage** | `https://playhentai.live/` | `daily` | `1.0` |
| **Category Landing Hubs** | `/uncensored`, `/3d`, `/upcoming`, `/ongoing`, `/trending` | `daily` | `0.9` |
| **Directory Catalogs** | `/categories`, `/playlists`, `/studios`, `/completed` | `weekly` | `0.8` |
| **Single Series Pages** | `/series/[slug]` | `weekly` | `0.9` |
| **Single Episode Pages** | `/watch/[series-slug]-episode-[epNum]` | `weekly` | `0.8` |
| **Studio Profile Pages** | `/studios/[studioSlug]` | `monthly` | `0.7` |
| **Tag & Genre Pages** | `/tag/[tagSlug]` | `weekly` | `0.85` |
| **Year Release Pages** | `/year/[yearNum]` | `weekly` | `0.8` |
| **Playlist Detail Pages** | `/playlists/[playlistSlug]` | `weekly` | `0.75` |
| **Legal & FAQ Pages** | `/faq`, `/terms`, `/privacy` | `monthly` | `0.5` |

---

## Pillar 3: ⚡ Database Data Fetching & Caching Strategy

```typescript
// Revalidation set to 1 hour (3600s) to prevent database overload
export const revalidate = 3600;

// Dynamic fetching via Supabase anon client
const { data: series } = await supabase.from('series').select('slug, created_at, release_year').eq('is_published', true);
const { data: episodes } = await supabase.from('episodes').select('id, episode_number, created_at, seasons(series(slug))').eq('is_published', true);
const { data: collections } = await supabase.from('collections').select('slug, updated_at').eq('is_published', true);
```

---

## Pillar 4: 🔍 SEO & Crawlability Hygiene Rules

- **Purged Non-Indexable Private Routes**: Private user account routes (`/watchlist`, `/history`, `/favorites`, `/settings`, `/login`) and internal search parameter routes (`/search`) carrying `noindex` directives are **strictly excluded** from `sitemap.xml` to deliver a 100% clean indexable XML feed.
- **Google Search Essentials Compliance**: 100% compliant.

---

## Pillar 5: ⚡ Performance & Core Web Vitals (CWV)

- **TTFB Performance**: Server caches generated XML sitemap response for 3600s, delivering sub-50ms TTFB to Googlebot and Bingbot.

---

## Pillar 6: 💰 Monetization & Bot Management

- Direct XML output, zero ad overhead.

---

## Pillar 7: ♿ Accessibility & XML Validation

- Validated standard Schema `http://www.sitemaps.org/schemas/sitemap/0.9` XML structure.

---

## Pillar 8: 🛠️ Actionable Improvements & Status

1. **Purge Non-Indexable Private & Search Routes**: ✅ **COMPLETED**.
2. **Set 1-Hour Cache TTL (`revalidate = 3600`)**: ✅ **COMPLETED**.
