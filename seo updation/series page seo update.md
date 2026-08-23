# Series Page SEO Update Report (Detailed)

This document records the exact SEO configurations, dynamic title logic, metadata templates, and structured JSON-LD schemas applied to the **PlayHentai Series Detail Page**.

---

## 1. Dynamic Meta Title System

To prevent Google from cutting off your titles in search results while retaining the SEO benefit of English translations, we implement a **length-sensitive em-dash (`—`) title system** inside `generateMetadata()`:

### Auto-Generation Rules:
1.  **Rule A (Short Combined Name - Under 60 characters)**:
    *   *Condition*: English translation is present and the combined title string is $\le 60$ characters.
    *   *Format*: `[Original Title] ([English Title]) — Watch & Episodes | Play Hentai`
    *   *Example*: `Juujin Oukoku (Beast Kingdom) — Watch & Episodes | Play Hentai`
2.  **Rule B (Long Combined Name - Over 60 characters)**:
    *   *Condition*: English translation is present but combined length exceeds 60 characters (safeguards against search engine truncation).
    *   *Format*: `[Original Title] — Watch & Episodes | Play Hentai`
    *   *Example*: `Inaka ni wa Kore Kurai Shika Goraku ga Nai — Watch & Episodes | Play Hentai`
3.  **Rule C (No English Title)**:
    *   *Condition*: English alternative title is not defined.
    *   *Format*: `[Original Title] — Watch & Episodes | Play Hentai`

*   **Custom Override**: If you input a value in `CUSTOM META TITLE` inside the Admin Panel, the page uses it directly.

---

## 2. Dynamic Meta Description System

Uses strict metadata tags instead of loose string matching to serve highly optimized Google search snippets:

*   **Template for Normal Series**:
    > "Watch [Original Title] hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai."
*   **Template for Uncensored Series**:
    > "Watch [Original Title] uncensored hentai anime online in HD with English subtitles. Stream all available episodes for free on Play Hentai."
*   **Censorship Detection Logic**:
    ```typescript
    const isUncensored = 
      data.content_rating?.toLowerCase() === 'uncensored' ||
      data.tags?.some((t: string) => t.toLowerCase() === 'uncensored');
    ```
*   **Custom Override**: If you input a value in `CUSTOM META DESCRIPTION` inside the Admin Panel, the page uses it directly.

*   **Keywords Tag Removal**:
    We removed the `<meta name="keywords">` field from the page metadata output to improve performance since modern search engines ignore it.

---

## 3. Structured Data (JSON-LD)

Every series detail page dynamically renders **Breadcrumbs**, **FAQPage**, and **TVSeries** schemas.

### A. TVSeries Schema Mappings
```json
{
  "@context": "https://schema.org",
  "@type": "TVSeries",
  "@id": "[Canonical Series URL]",
  "url": "[Canonical Series URL]",
  "name": "[Original Title]",
  "alternateName": [
    "[English Title]",
    "[Romaji Title]",
    "[Japanese Kanji Title]"
  ],
  "description": "[Meta Description or Synopsis]",
  "image": "[R2 Cover Image URL]",
  "genre": "[Primary Tag Name]",
  "numberOfSeasons": "[Season Count]",
  "numberOfEpisodes": "[Total Episodes Count]",
  "datePublished": "[Created Timestamp]",
  "inLanguage": "en",
  "isFamilyFriendly": false,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[Database Rating Value, e.g. 9.2]",
    "ratingCount": "[Synced Vote Count: Math.round(views / 15)]",
    "bestRating": 10,
    "worstRating": 1
  },
  "publisher": {
    "@type": "Organization",
    "name": "PlayHentai",
    "url": "https://playhentai.live"
  }
}
```
*   *Note*: The `ratingCount` property maps to `Math.round(views / 15) || 1`. This aligns the schema parameter with the visible vote count displayed on your page layout, preventing Google's rich result mismatch penalties.

### B. FAQPage Schema Mappings
Google uses this to display expandable question-and-answer accordions directly under your search result.
*   **FAQ Item 1**:
    *   *Question*: `What is [Title]?`
    *   *Answer*: `[Title] is a [themes] hentai anime series produced by [studio]. [description]`
*   **FAQ Item 2**:
    *   *Question*: `Is [Title] uncensored?`
    *   *Answer*: `[Title] is available in its [uncensored/censored] version. You can watch it in full high definition (1080p) online on PlayHentai.`
*   **FAQ Item 3**:
    *   *Question*: `How many episodes does [Title] have?`
    *   *Answer*: `[Title] has [count] episodes currently available to stream [out of a planned [override] episodes].`
*   **FAQ Item 4**:
    *   *Question*: `Is [Title] completed or ongoing?`
    *   *Answer*: `The show is currently [ongoing/completed]. New releases are updated here immediately.`
*   **FAQ Item 5**:
    *   *Question*: `Who produced [Title]?`
    *   *Answer*: `The series was animated by the production studio [studio].`

### C. BreadcrumbList Schema
Helps search engine listings render crawlable breadcrumb pathways (e.g. `playhentai.live > Browse > [Title]`):
1.  **Position 1**: `Home` $\rightarrow$ `https://playhentai.live/`
2.  **Position 2**: `Browse` $\rightarrow$ `https://playhentai.live/categories`
3.  **Position 3**: `[Series Title]` $\rightarrow$ `https://playhentai.live/series/[slug]`

---

## 4. Crawlability & Internal Linking Mappings

*   **Primary Page Heading**:
    *   The visible heading tag is a single `<h1>` containing exactly the raw series title. No keyword spam is included.
*   **Alternative Titles Grid**:
    *   Kanji, Romaji, and English translation titles are printed clearly in the metadata details table, making them crawlable.
*   **Crawlable Episode Links**:
    *   All episode thumbnails and text names are wrapped inside standard Next.js `<Link>` components, rendering standard `<a>` tags with absolute watch URLs (`/watch/...`) that search engines can easily discover.
*   **Crawlable Similar Titles**:
    *   The "Similar Titles" links are implemented as native anchor `<Link>` items rather than client-side click events, creating a robust internal link network.
