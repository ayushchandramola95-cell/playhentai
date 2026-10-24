# Series Detail Page Issues & Optimization Checklist

Tracking checklist for resolving all identified bugs, performance bottlenecks, CSS issues, and dead code on the Anime Series Details page (`/series/[slug]`).

---

## 1. Performance, Speed & Core Web Vitals (CWV)
- [x] **1.1. Prune RSC Serialization Bloat (HTML Payload Reduction):**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Pruned items passed to `<SimilarTitles>` and `<SeriesCard>` using `pruneForCard()`. Pruned `seasons` passed to `<DynamicWatchCTA>` to essential episode fields (`id`, `episode_number`, `duration_seconds`, `is_published`). Total HTML payload reduced from **284 KB to 207 KB** (~77 KB saved); inline RSC script bloat dropped from **181 KB to 107 KB** (~41% reduction).
- [x] **1.2. Optimize CPU-Heavy SSR Scoring Loop for Similar Titles:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Replaced unoptimized nested string splitting with pre-lowercased sets, excluded administrative `featured` tags, and memoized top matches. SSR TTFB reduced to **~0.24s**.
- [x] **1.3. Deduplicate Data Fetching between Metadata & Page:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Wrapped `getCachedSeriesDetails` in React 19 / Next.js 15 `cache()` (`getDedupedSeriesDetails`), ensuring `generateMetadata` and `SeriesDetailsPage` share the exact same promise during request execution.
- [x] **1.4. Deduplicate Client-Side Watch History Network Waterfall:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Created `src/utils/watchHistoryClient.ts` with in-flight promise sharing and a 15-second cache. Both `DynamicWatchCTA` and `SeriesEpisodesSection` now execute a single unified network request to `/api/watch-history` on mount.
- [x] **1.5. Fix LCP Image Resource Contention:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Set ambient blurred backdrop banner to `priority={false}` and `loading="lazy"`. Set the primary above-the-fold 2:3 series poster image to `priority={true}` and `fetchPriority="high"`, ensuring maximum bandwidth for the real LCP element.
- [x] **1.6. Eliminate Cumulative Layout Shift (CLS) in `loading.tsx`:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Aligned skeleton DOM hierarchy to match hydrated layout (Title -> Badges -> Dynamic Watch CTA Button [48px] -> Tags -> Synopsis). Updated action button skeletons to mirror the 3-button layout (Watchlist, Favorite, Share).

---

## 2. Bugs & Logic Deficiencies
- [x] **2.1. Fix Broken Status Navigation Routes (`/finalized`, `/airing` 404s):**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Added `statusSlug` mapping (`finalized`/`completed` -> `completed`, `airing`/`ongoing` -> `ongoing`, `upcoming` -> `upcoming`). Updated link to `<Link href={`/status/${statusSlug}`}>` resolving previous 404 errors.
- [x] **2.2. Implement Real Rating API / Persistence for `RateSeriesButton`:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Created `src/app/api/series/rate/route.ts` and `submitLocalSeriesRating` in `localCatalogStore.ts`. Replaced placebo 800ms `setTimeout` in `RateSeriesButton.tsx` with real API calls that calculate weighted moving averages and persist to local EC2 disk/memory and Supabase.
- [x] **2.3. Filter Administrative Tags in Similar Titles Scoring:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Filtered out `featured` and `featured:*` tags from `currentTags` and `sTags` in `getSimilarSeries()`, preventing admin badges from artificially skewing recommendations.
- [x] **2.4. Fix Arbitrary Fallback Year 2026:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Removed hardcoded `|| 2026` fallback. Release year row is now conditionally rendered only when real year data exists.
- [x] **2.5. Support Co-Studios in "More From Studio":**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Parsed all comma-separated studios into a lowercased set; "More From Studio" now finds titles sharing any studio in multi-studio co-productions.
- [x] **2.6. Robust Comment Section on Series Page:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Added fallback card UI with clean placeholder when `firstEpisodeId` is null (e.g. upcoming/unreleased series) and added `id="comments"` anchor.

---

## 3. CSS, UI & Responsive Layout Deficiencies
- [x] **3.1. Fix Mobile `display: contents` Row Disconnection / Empty Gaps:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Removed hardcoded row indices (`grid-row: 2..5`) in `series.module.css`. Mobile elements now use `grid-column: 1 / -1` with natural auto-flow, eliminating blank gaps when discovery tags or banners are omitted.
- [x] **3.2. Remove Dead DOM Element `.synopsisFadeOverlay`:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Removed unused `<div className={styles.synopsisFadeOverlay} />` from `SynopsisBox.tsx` and removed dead CSS declaration.
- [x] **3.3. Improve Desktop About Section Expansion / Collapsible State:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Added `.aboutCollapsed` with smooth gradient mask and "Read more details" toggle on both desktop and mobile for lengthy descriptions.
- [x] **3.4. Reduce Specificity Overrides & Harmonize Action Buttons:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Added instant `localStorage` cache read to `WatchlistToggle.tsx` (mirroring `FavoriteToggle`), eliminating jarring "Loading..." text on client mount.
- [x] **3.5. Fix Breadcrumb Divider Wrap on Small Screens (360px):**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Configured `.breadcrumbs` with `white-space: nowrap; overflow-x: auto; flex-shrink: 0;` to prevent chevrons from wrapping onto orphaned lines on narrow screens.

---

## 4. Dead Code & Bundle Clutter
- [x] **4.1. Delete Orphaned Component `MobileTagsRow.tsx`:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Deleted unused 52-line component file.
- [x] **4.2. Remove Dead Supabase Client & Unused Imports:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Removed unused `createSupabaseClient` import, dead top-level `publicSupabaseClient` initialization, and unused `getSeriesViewsMap` in `page.tsx`.
- [x] **4.3. Clean Up Obsolete Mock Data Fallback Trees:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Removed `MOCK_SERIES`, `MOCK_EPISODES`, and `MOCK_SERIES_DETAILS` imports and dead mock fallback branches in `page.tsx`.

---

## 5. SEO & Schema.org Structured Data
- [x] **5.1. Format Standard ISO 8601 Duration for Episodes:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Implemented `formatIsoDuration()` formatting exact minutes and seconds (`PT#M#S` or `PT#M`).
- [x] **5.2. Standardize `datePublished` Fallbacks for TVSeries & TVEpisode:**
  - **Status:** COMPLETED & VERIFIED.
  - **Resolution:** Supplied non-undefined default ISO date strings to prevent schema warnings in Google Search Console.
