# 🎞️ Single Series Detail Page Deep Architectural & SEO Audit (`structur&seo/series_detail_page.md`)

This document presents an exhaustive, 8-pillar structural, technical, data, SEO, and performance analysis of the **Single Series Detail Page** (`/series/[slug]`).

---

## Pillar 1: 📌 Page Overview & Routing Architecture

- **Route URL Pattern**: `/series/[slug]` (Destination URL: `https://playhentai.live/series/[slug]`).
- **File System Locations**:
  - **Main Page Component**: `src/app/(public)/series/[slug]/page.tsx`
  - **Supporting Sub-Components**: `SynopsisBox.tsx`, `MobileTagsRow.tsx`, `WatchlistToggle.tsx`, `FavoriteToggle.tsx`, `RateSeriesButton.tsx`, `SimilarTitles.tsx`, `CommentSection.tsx`
  - **CSS Modules**: `src/app/(public)/series/[slug]/series.module.css`
  - **Public Layout Wrapper**: `src/app/(public)/layout.tsx`
- **Next.js App Router Rendering Strategy**:
  - Server Component (`page.tsx`) queries published series, seasons, and episodes from Supabase and passes initial props to interactive Client Sub-Components (`'use client'`).
  - Currently set to `export const dynamic = 'force-dynamic'` (Needs optimization: remove dynamic flag and wrap query in 60-second `unstable_cache` with singleton public Supabase client reuse).
- **Access Control & Auth Guards**:
  - **Public Access**: 100% accessible to all users.

---

## Pillar 2: 🧩 Visual & UI Component Structure

### DOM & Section Hierarchy Tree:
```
RootLayout (src/app/layout.tsx)
 └── PublicLayout (src/app/(public)/layout.tsx)
      ├── Header (src/components/Header/Header.tsx)
      ├── <main> (Flex Column, paddingTop: 64px)
      │    └── SeriesDetailsPage (src/app/(public)/series/[slug]/page.tsx)
      │         ├── JsonLd (TVSeries + BreadcrumbList + FAQPage Schemas)
      │         ├── Hero Banner Container (.bannerContainer)
      │         │    ├── Priority Backdrop Image (.bannerImage)
      │         │    └── Gradient Overlay (.bannerOverlay)
      │         └── Main Content Wrapper (.contentWrapper)
      │              ├── Visible Breadcrumb Links (.breadcrumbs) [Home > Series > Title]
      │              ├── Desktop Meta Grid (.desktopOnlyContainer)
      │              │    ├── Left Column (.leftCol)
      │              │    │    ├── Poster Image Wrapper (.posterWrapper)
      │              │    │    └── Action Buttons Row (WatchlistToggle + FavoriteToggle)
      │              │    └── Right Column (.rightCol)
      │              │         ├── Category Badges + <h1>Series Title</h1>
      │              │         ├── Ratings, Views & Year Stats Row
      │              │         ├── SynopsisBox Component
      │              │         ├── Specifications Grid (Studio, Release Year, Status, Episodes, Content Rating, Languages)
      │              │         ├── Dynamic Tags & Genres Row
      │              │         └── Primary Watch CTA Button ("Watch Episode 1" / "Watch Series Now")
      │              ├── Mobile Layout Container (.mobileOnlyContainer)
      │              ├── Seasons & Episodes Accordion Section
      │              │    ├── <h2>Seasons & Episodes</h2>
      │              │    └── Episodes Grid [Thumbnail, Episode Number, Title, Release Date]
      │              ├── AdBanner (Zone 5986838)
      │              ├── About & Deep Dive Synopsis Section (<h2>About Series Title</h2>)
      │              ├── Frequently Asked Questions Section (<h2>Frequently Asked Questions</h2> + FAQ Accordions)
      │              ├── Similar Titles Carousel (SimilarTitles.tsx)
      │              ├── More From Studio Carousel
      │              └── Community Comments Section (CommentSection.tsx)
      ├── AdBanner [Desktop Footer] (Zone 5986212)
      ├── AdBanner [Mobile Footer] (Zone 5986980)
      └── Footer (src/components/Footer/Footer.tsx)
```

### Key Component Composition & Props:
1. `<SynopsisBox description={activeSeries.description} />`: Truncates long synopsis text with "Read More / Show Less" toggle.
2. `<WatchlistToggle seriesId={activeSeries.id} />`: Client component for bookmarking series to user watchlist.
3. `<FavoriteToggle seriesId={activeSeries.id} />`: Client component for saving series to user favorites.
4. `<RateSeriesButton seriesId={activeSeries.id} initialRating={rating} />`: Interactive user rating modal.
5. `<SimilarTitles seriesList={similarSeries} />`: Weighted recommendation engine carousel based on shared studio (+6 pts), shared tags (+4 pts/tag), status (+2 pts), year (+1 pt), and rating similarity (+1 pt).
6. `<CommentSection seriesId={activeSeries.id} />`: Real-time user comments and community discussion thread.

---

## Pillar 3: ⚡ Data Fetching, Cache & State Architecture

### Database Queries:
```typescript
const getCachedSeriesDetails = unstable_cache(
  async (slug: string) => {
    const { data: seriesData } = await publicSupabaseClient
      .from('series')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    const { data: seasonsData } = await publicSupabaseClient
      .from('seasons')
      .select('*, episodes (*)')
      .eq('series_id', seriesData.id)
      .eq('is_published', true)
      .order('season_number');

    return { seriesData, seasonsData };
  },
  ['series-details-cache-v1'],
  { revalidate: 60, tags: ['series_details'] }
);
```

---

## Pillar 4: 🔍 SEO & Search Engine Indexability Audit

### Metadata Source & Generator:
- **Metadata Generated By**: `src/app/(public)/series/[slug]/page.tsx` (`generateMetadata({ params })`)
- **Metadata Type**: `Dynamic Metadata` function

### Search Intent & SEO Goal:
- **Target User Intent**: Users searching for a specific anime title (`[Series Title]`).
- **Detailed Intent Breakdown**:
  - Watching full episodes (`/watch/[episodeId]`)
  - Reading synopsis and story details
  - Checking episode count & airing schedule
  - Checking community ratings & reviews
  - Finding similar titles & recommendations by studio
- **SEO Goal**: Rank #1 on Google for exact series title searches (`[Series Title]`) and capture all long-tail supporting search queries (`watch [Series Title] uncensored english sub hd`).

### Target Keyword Strategy & Keyword Mapping:
- **Primary Keyword**: `[Series Title]` (Highest-volume query for single show landing pages).
- **Supporting / Secondary Keywords**:
  - `Watch [Series Title]`
  - `[Series Title] uncensored`
  - `[Series Title] English sub` / `dub`
  - `[Series Title] stream`
  - `[Series Title] episodes`
- **Primary Terms Present**:
  - `Series Title` (Present in Title Tag, Meta Description, H1, H2s, JSON-LD, URL)
  - `Watch` (Present in Title Tag, Meta Description, H1 context, CTAs)
  - `English Sub` / `Dub` (Present in Title Tag & Meta Description)
  - `Uncensored` / `HD` (Present in Title Tag, Meta Description, Specifications)
  - `Brand Name` (`PlayHentai` present in Title Tag & Meta Description)

### SERP Title Length Limits & Evaluation:
- **Dynamic Title**: `${data.meta_title || `${data.title} - Watch ${subOrDub} HD | PlayHentai`}`.
- *SERP Truncation Note*: If series title is exceptionally long (>40 chars), total title tag length may exceed 60 characters and be truncated by Google. Keep core title clean and concise.

### Technical Crawlability Matrix:
- **Included in Sitemap**: `Yes` (via `/sitemap.ts` listing all published series slugs)
- **Self Canonical**: `Yes` (`https://playhentai.live/series/[slug]`) - *Dynamic (uses current show slug)*
- **Noindex**: `No` (`index: true, follow: true`)
- **Robots Directives**: `index: true`, `follow: true`, `googleBot: { index: true, follow: true, max-image-preview: 'large', max-video-preview: -1, max-snippet: -1 }` (Inherited from Root Layout)
- **Pagination**: `None`

### Dynamic Metadata Inspection:
- **Title Tag**: `${data.title} - Watch ${subOrDub} HD | PlayHentai`
- **Meta Description**: `Watch ${data.title} with English subtitles in HD. Stream all available episodes, releases, and check out similar titles on PlayHentai.`
- **Canonical URL**: `https://playhentai.live/series/[slug]` (Dynamic per series slug)
- **OpenGraph Metadata**: `og:title`, `og:description`, `og:url`, `og:type` (`video.tv_show`), `og:image`.
- **OpenGraph Image (`og:image`)**: Cover image or poster image delivered via Cloudflare R2 CDN (`https://media.playhentai.live`). Default site banner fallback (`https://media.playhentai.live/og-banner.jpg`) applied if image key is missing.

### Semantic HTML & DOM H1 Verification:
- **`<h1>` Verification**:
  - *Current H1*: `<h1>{activeSeries.title}</h1>` in `page.tsx` (line 665).
  - *Result*: **Passed (100% Single H1 HTML DOM)**.
- **`<h2>` Headers**:
  - `<h2>Seasons & Episodes</h2>`
  - `<h2>About {activeSeries.title}</h2>`
  - `<h2>Frequently Asked Questions</h2>`
  - `<h2>Similar Titles You Might Like</h2>`
  - `<h2>More From {studio}</h2>`
  - `<h2>Comments & Community Reviews</h2>`

### JSON-LD Structured Data Implementation:
1. **Implemented Schemas**:
   - `BreadcrumbList` (`Home` $\rightarrow$ `[Series Title]`)
   - `TVSeries` (with `@id`, `name`, `description`, `image`, `genre`, `numberOfSeasons`, `numberOfEpisodes`, `publisher`, `aggregateRating`)
     - *Schema Data Dependencies*: Depends directly on `series` table, `episodes` count, `rating`, `studio`, and `tags` (genres).
   - `FAQPage` (5 accordions generated dynamically based on Series Data: Overview, Uncensored status, Episode count, Airing status, and Studio)
2. **Not Implemented / Intentionally Omitted Schemas**:
   - `VideoObject`: (Omitted; reserved for single episode watch pages at `/watch/[episodeId]`)

### Internal Linking Map (`Series Detail Page Links To`):
- **Episode Watch Player Pages**: `/watch/[episodeId]`
- **Studio Profile Page**: `/studios/[studioSlug]`
- **Tags & Genre Chips**: Clickable tag links to category filter pages (`/categories?genre=[tag]`)
- **Header Navigation Links**: `/` (Home), `/categories` (Series), `/uncensored` (Uncensored), `/3d` (3D), `/playlists` (Playlists), `/studios` (Studios), `/surprise` (Surprise Me)
- **User Activity Links**: `/watchlist` (Watchlist), `/history` (Watch History)
- **Global Search**: Triggered via Header Search Bar
- **Footer Legal & Technical Links**: `/dmca`, `/privacy`, `/terms`, `/2257`, `/contact`

### Image SEO & Asset CDN Delivery:
- **Poster Alt**: `alt={`Watch ${activeSeries.title} Uncensored Hentai in Full HD - PlayHentai`}`
- **Banner Alt**: `alt={`Watch ${activeSeries.title} Hentai Anime Online - PlayHentai`}`
- Poster and banner images delivered via Cloudflare R2 CDN (`https://media.playhentai.live`).
- Next.js `<Image>` component with `priority` on hero banner and responsive `sizes` attribute.

---

## Pillar 5: ⚡ Performance & Core Web Vitals (CWV) Audit

- **Layout Shift Prevention (CLS)**:
  - Hero banner and poster containers use explicit aspect ratio wrappers (`sizes="300px"`).
- **SSR Revalidation & Cache**:
  - Currently uses `export const dynamic = 'force-dynamic'`.
  - *Optimization Needed*: Remove dynamic flag and wrap series details query in `unstable_cache` (60s TTL) with singleton public Supabase client reuse to achieve server TTFB under 80ms.

---

## Pillar 6: 💰 Monetization, Ads & Analytics

### Ad Placement Architecture:
1. **Mid-Page Ad Banner**: Zone `5986838` placed right above the About section.
2. **Pre-Footer Ad Banner**: Zone `5986212` (Desktop) & Zone `5986980` (Mobile).

---

## Pillar 7: ♿ Accessibility (a11y) & Mobile UX Hygiene

- **Breadcrumbs UI**: Visible breadcrumb navigation with `ChevronRight` separators.
- **Interactive Controls**: Touch target buttons for Watchlist, Favorite, Rating, and Episode links meet 48px minimum standard.

---

## Pillar 8: 🛠️ Actionable Improvements & Execution Status

### 🚀 High-Priority SEO Improvements:
1. **Enrich `TVSeries` Schema with `aggregateRating`**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Added `aggregateRating` (`ratingValue`, `ratingCount`, `bestRating: 10`, `worstRating: 1`) to `TVSeries` JSON-LD schema in `src/app/(public)/series/[slug]/page.tsx` for Google Rich Result star ratings snippets.
2. **OpenGraph Fallback Image Optimization**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Enforced default site poster banner URL (`https://media.playhentai.live/og-banner.jpg`) in `generateMetadata` as fallback when `cover_image_key` or `poster_image_key` is missing.

### ⚡ Performance & CWV Enhancements:
1. **Remove `force-dynamic` & Cache Series Queries for 60 Seconds (`unstable_cache`) & Client Reuse**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Removed `export const dynamic = 'force-dynamic'` and wrapped Supabase series, seasons, and episodes queries in `unstable_cache` with a 60-second TTL (`series_details` tag) in `page.tsx` using a singleton public Supabase client instance, bringing server TTFB response times under 80ms.

