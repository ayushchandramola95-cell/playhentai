# Browse Page SEO Report (Detailed)

This document records the exact SEO configurations, dynamic title/description filters, structured JSON-LD schemas, and crawlability rules applied to the **Play Hentai Browse Hub Page** (`/categories`).

---

## 1. Title & Meta Settings

*   **Meta Title**:
    *   **Default**: `Browse Hentai Anime — Genres, Studios & Years | Play Hentai`
    *   **Genre Filter**: `[Genre] Hentai Anime — Watch Online | Play Hentai`
    *   **Studio Filter**: `[Studio] Hentai Anime — Browse Studio | Play Hentai`
    *   **Year Filter**: `[Year] Hentai Anime — Browse Releases | Play Hentai`
    *   *Note*: Uses clean em-dashes (`—`) and maintains consistent `Play Hentai` spacing.
*   **Meta Description**:
    *   **Default**: `Browse hentai anime series by genre, tags, production studio, and release year. Discover new releases, popular titles, and complete series on Play Hentai.`
    *   **Genre Filter**: `Browse [Genre] hentai anime series on Play Hentai. Discover available episodes, popular titles, and new releases in the [Genre] category.`
    *   **Studio Filter**: `Browse hentai anime from [Studio] on Play Hentai. Explore the studio's series, available episodes, genres, and related titles.`
    *   **Year Filter**: `Browse hentai anime released in [Year] on Play Hentai. Discover series, available episodes, genres, and popular titles from [Year].`
*   **Canonical URL**:
    *   `<link rel="canonical" href="https://playhentai.live/categories" />` (or appends filter queries if parameterized: `https://playhentai.live/categories?genre=[genre]`).

---

## 2. Structured Data (JSON-LD)

The Browse Page renders a **BreadcrumbList** and a dynamic **ItemList** schema, telling search engine crawlers what series profiles are currently listed on the browse screen:

### A. ItemList Schema Mappings
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Browse Hentai Anime Categories & Series on Play Hentai",
  "url": "https://playhentai.live/categories",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "[Series Title 1]",
      "url": "https://playhentai.live/series/[slug-1]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Series Title 2]",
      "url": "https://playhentai.live/series/[slug-2]"
    }
  ]
}
```

### B. BreadcrumbList Schema
1.  **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
2.  **Position 2**: `Browse Library` $\rightarrow$ `https://playhentai.live/categories`

---

## 3. Crawlability & Internal Linking Mappings

*   **Filter Navigation**:
    *   Category filters (action, romance, fantasy) link directly to dynamic crawl pathways using clean `<a href="/categories?genre=[genre]">` tags.
*   **Grid Catalog Cards**:
    *   Every card in the grid contains crawlable anchor links to `/series/[slug]`, passing page rank value cleanly to your detail pages.
