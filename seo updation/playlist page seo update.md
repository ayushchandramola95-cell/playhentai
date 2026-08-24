# Playlist Page SEO Report (Detailed)

This document records the exact SEO configurations, dynamic title/description tags, structured JSON-LD schemas, crawlability rules, and potential checkpoints applied to the **Play Hentai Playlists Index Hub** (`/playlists`) and **Curated Playlist Detail Page** (`/playlists/[slug]`).

---

## 1. Title & Meta Settings

### A. Playlists Index page (`/playlists`)
*   **Meta Title**: `Curated Hentai Playlists — Anime Collections | Play Hentai`
*   **Meta Description**: `Explore hand-picked hentai playlists and thematic series collections of top 1080p anime series on Play Hentai.`
*   **Canonical URL**: `/playlists` (active thematic tab parameters `?tab=X` are appended to maintain separate canonical paths for filtered grids, e.g. `/playlists?tab=Featured`).

### B. Playlist Detail dynamic page (`/playlists/[slug]`)
*   **Meta Title**: `[Playlist Name] — Curated Hentai Playlist | Play Hentai`
*   **Meta Description**: `[Playlist Description] Explore this curated hentai anime list on Play Hentai. Stream episodes online.`
*   **Canonical URL**: `/playlists/[slug]`

---

## 2. Structured Data (JSON-LD)

The playlists section renders structured data blocks as follows:

### A. Playlists Index page
1.  **BreadcrumbList Schema**:
    *   **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
    *   **Position 2**: `Playlists` $\rightarrow$ `https://playhentai.live/playlists`
2.  **ItemList Schema**: Renders list elements for all curated collections currently displayed in the grid catalog.

### B. Playlist Detail page
1.  **BreadcrumbList Schema**:
    *   **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
    *   **Position 2**: `Playlists` $\rightarrow$ `https://playhentai.live/playlists`
    *   **Position 3**: `[Playlist Name]` $\rightarrow$ `https://playhentai.live/playlists/[slug]`
2.  **ItemList Schema**: Renders list elements for all series cards contained inside the active playlist collection, mapping dynamic positions.

---

## 3. Crawlability & Internal Linking Mappings

*   **Curated Tab Links**:
    *   The collection filtering tabs render as crawlable Next.js `<Link>` elements (`<a href="/playlists?tab=Featured">`). This allows Googlebot to discover all curated subgrids natively.
*   **Catalog Grid Cards**:
    *   Curated cards in the grid point directly to dynamic detail paths `/playlists/[slug]`, transferring link authority cleanly.
