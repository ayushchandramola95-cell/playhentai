# Episodes Watch Page SEO Report (Detailed)

This document records the exact SEO configurations, dynamic title/description logic, structured JSON-LD schemas, and dynamic XML Video sitemap configurations applied to the **PlayHentai Episodes Watch Page** (`/watch/[episodeId]`).

---

## 1. Title & Meta Settings

*   **Meta Title**:
    *   **Value**: `[Series Title] Episode [X] — Watch Online | Play Hentai`
    *   *Note*: If an English alternative title exists and the combined name is short enough ($\le 60$ characters), it dynamically appends it:
        `[Series Title] ([English Title]) Episode [X] — Watch Online | Play Hentai`
    *   Uses a clean em-dash (`—`) consistently.
*   **Meta Description**:
    *   **Value (Normal Series)**:
        `Watch [Series Title] Episode [X] online in HD with English subtitles. Stream the hentai anime episode for free on Play Hentai.`
    *   **Value (Uncensored Series)**:
        `Watch [Series Title] Episode [X] uncensored in HD with English subtitles. Stream the hentai anime episode for free on Play Hentai.`
    *   *Note*: Uses "the hentai anime episode" for natural read-flow. The uncensored copy is served only when DB metadata (`content_rating` or tags) confirms the series is uncensored.
*   **Canonical URL**:
    *   `<link rel="canonical" href="https://playhentai.live/watch/[series-slug]-episode-[X]" />`
*   **Robots Indexing Directive**:
    *   Explicitly sets `index: true` and `follow: true` metadata on the watch page route to ensure it is indexable by search engine bots.
*   **OpenGraph Video Type**:
    *   Mapped to `"video.episode"`, telling social scrapers (Facebook, Discord, Twitter) to parse and render video player players in preview frames.

---

## 2. HTML Video Player Poster

To guarantee consistent search engine visual signals, the `<video>` player element's `poster` attribute inside `src/components/VideoPlayer/VideoPlayer.tsx` is dynamically bound to the same R2 thumbnail URL used in the schema:
```html
<video poster="[verifiedThumbnailUrl]" ... />
```

---

## 3. Structured Data (JSON-LD)

Every episode watch page renders a **VideoObject** and a **BreadcrumbList** schema.

### A. VideoObject Schema Mappings
```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": "[Canonical Episode URL]",
  "name": "[Series Title] Episode [X] — [Episode Title]",
  "description": "[Episode Synopsis or fallback: Watch [Series Title] Episode [X] online in HD with English subtitles on Play Hentai.]",
  "thumbnailUrl": ["[Thumbnail R2 URL or fallback banner]"],
  "uploadDate": "[Episode Release Date or creation timestamp]",
  "duration": "[ISO 8601 Duration String, e.g. PT24M]",
  "contentUrl": "[Direct R2 MP4 Video File stream URL]",
  "url": "[Canonical Episode URL]",
  "isFamilyFriendly": false,
  "publisher": {
    "@type": "Organization",
    "name": "PlayHentai",
    "url": "https://playhentai.live"
  },
  "partOfSeries": {
    "@type": "TVSeries",
    "name": "[Series Title]",
    "url": "https://playhentai.live/series/[series-slug]"
  }
}
```
*   *Note*: The `'inLanguage': 'en'` parameter has been removed from the schema since the default spoken audio is Japanese.
*   *Note*: If the episode title is generic (e.g. just "Episode 1"), it will fallback to `"name": "[Series Title] Episode [X]"` instead of appending `Episode 1 — Episode 1`.

### B. BreadcrumbList Schema
1.  **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
2.  **Position 2**: `[Series Title]` $\rightarrow$ `https://playhentai.live/series/[series-slug]`
3.  **Position 3**: `Episode [X]` $\rightarrow$ `https://playhentai.live/watch/[episodeId]`

---

## 4. Dynamic XML Video Sitemap

A dynamic sitemap handler has been created at [`sitemap-video.xml/route.ts`](file:///c:/new%20website%20creation/hentaianime/src/app/sitemap-video.xml/route.ts) and registered inside [`robots.ts`](file:///c:/new%20website%20creation/hentaianime/src/app/robots.ts).

*   **URL mappings**: Associates the XML `<loc>` tag with the user-accessible **watch page URL**, and uses the `<video:content_loc>` parameter to feed search engines the direct, stable R2 MP4 file stream URL.
*   **Publication Date**: Maps publication date (`<video:publication_date>`).
*   **XML Escaping**: All dynamic XML strings (title, description, loc, content_loc) are fully escaped for special characters (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`) to prevent browser XML parser errors.
