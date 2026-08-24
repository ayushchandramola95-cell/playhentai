# 3D Page SEO Report (Detailed)

This document records the exact SEO configurations, dynamic title/description tags, structured JSON-LD schemas, crawlability rules, and potential checkpoints applied to the **Play Hentai 3D Landing Page** (`/3d`).

---

## 1. Title & Meta Settings

*   **Meta Title**: `3D Hentai Anime — Watch CGI Animations in HD | Play Hentai`
*   **Meta Description**: `Watch 3D hentai anime and CGI animation series online in HD with English subtitles. Browse complete series, available episodes, new releases, and popular 3D titles on Play Hentai.`
*   **Canonical URL**: `/3d` (page-specific pagination values `?page=X` are appended to maintain separate ranking properties for paginated lists, e.g. `/3d?page=2`).

---

## 2. Structured Data (JSON-LD)

The page renders two dynamic structured data blocks:

### A. BreadcrumbList Schema
1.  **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
2.  **Position 2**: `3D Animations` $\rightarrow$ `https://playhentai.live/3d`

### B. ItemList Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "3D Hentai & CGI Animations Catalog",
  "url": "https://playhentai.live/3d",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "[3D Series Title 1]",
      "url": "https://playhentai.live/series/[slug-1]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[3D Series Title 2]",
      "url": "https://playhentai.live/series/[slug-2]"
    }
  ]
}
```
*   *Note*: The schema content is generated dynamically on the server side and sliced based on the active page index (matching standard SEO crawl guidelines).

---

## 3. Crawlability & Internal Linking Mappings

*   **Pagination Links**:
    *   Page navigation elements render as crawlable Next.js `<Link>` components (`<a href="/3d?page=X">`). This allows Googlebot to traverse past Page 1 and discover all series linked on sub-pages.
*   **Catalog Grid Cards**:
    *   Dynamic series grid cards point directly to clean URLs (`/series/[slug]`), transferring link juice cleanly to your target pages.

---

## 4. Key SEO Considerations & Potential GSC Warnings

### A. Dynamic Hydration Consistency
*   **The Risk**: Shuffling items client-side via `Math.random()` creates HTML mismatches with the server-rendered code. Google rejects indexing layout segments that hydrate dynamically with mismatch warnings.
*   **The Solution**: We implement a stable hashing algorithm (`getStableHash`) based on the series' database primary key to ensure consistency.

### B. Consolidated Parameter Indexing
*   **The Risk**: Search engines might try to index sorting variations (like `/3d?sort=latest` or `/3d?sort=rating`).
*   **The Solution**: We omit `sort` from the canonical tags so search rankings are unified under the primary paginated paths (`/3d?page=X`).
