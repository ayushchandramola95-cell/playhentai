# Play Hentai — Page Transition, Speed & Visual Feedback Optimization Plan

This document outlines the detailed, part-by-part implementation plan to solve slow page transitions (5+ seconds delay) and the complete absence of loading feedback when clicking buttons or links across **Play Hentai** (`playhentai.live`).

---

## Technical Problem Breakdown

1. **Zero Click / Transition Feedback**:
   - Next.js App Router navigates client-side via React transitions. Without a global progress bar or route event listeners, the browser window stays completely frozen on the old page with zero visual indication that the user clicked anything.
   - Users click cards or buttons multiple times thinking the website is unresponsive.
2. **Delayed Route Transition (Missing `loading.tsx`)**:
   - Without a `loading.tsx` file in route segments, Next.js blocks navigation entirely until the server component on the destination page finishes fetching all data from Supabase and rendering the RSC payload.
   - The user stays on the current screen for several seconds until the new page suddenly appears.
3. **Database Query Waterfalls & Heavy Joined Payloads**:
   - `src/app/(public)/series/[slug]/page.tsx`: `getCachedAllPublishedSeries` deep-joins all seasons and episodes for every single series in the entire database just to calculate similar title tags, causing hundreds of kilobytes of JSON transfer and slow Supabase roundtrips.
   - `src/app/(public)/series/[slug]/page.tsx`: `getCachedSeriesDetails` runs 1 query for seasons and then N individual queries for each season's episodes (`Promise.all(seasonsData.map(...))`).
   - `src/app/(public)/watch/[episodeId]/page.tsx`: Executes `getCachedMinimalSeriesList()` and `getCachedResolvedEpisode()` sequentially (`await` then `await`) and performs redundant queries for sibling episodes.
4. **Disabled Route Prefetching**:
   - `SeriesCard.tsx`, `SeriesCompactCard.tsx`, and homepage episode links have `prefetch={false}`, preventing Next.js from preloading page bundles in the background when links enter the viewport.
5. **Lack of Physical Click Feedback**:
   - Missing CSS `:active` micro-interactions on cards and buttons to give tactile visual confirmation upon touch or click.

---

## Part-by-Part Execution Roadmap

### Part 1: Global Instant Top Navigation Progress Bar
* **Goal**: Provide instantaneous, 0-millisecond visual feedback the exact moment any button or link is clicked.
- [x] **1.1** Create `src/components/NavigationProgressBar/NavigationProgressBar.tsx`:
  - Captures document-level clicks on any internal `<a>` or `<Link>` in the capture phase (`addEventListener('click', handler, true)`).
  - Immediately starts animating a glowing progress bar (starts at 20%, trickles forward smoothly to 80%).
  - Tracks `usePathname()` and `useSearchParams()` to jump to 100% and smoothly fade out when the new page mounts.
  - Listens to `popstate` to support browser Back and Forward buttons.
  - Includes a safety timeout (8s) so it never gets stuck if navigation is aborted.
- [x] **1.2** Create `src/components/NavigationProgressBar/NavigationProgressBar.module.css`:
  - Fixed at `top: 0; left: 0; right: 0; z-index: 9999999; height: 3px; pointer-events: none;`.
  - Brand gradient: `linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #c084fc 100%)`.
  - Radiant neon glow: `box-shadow: 0 0 10px rgba(251, 191, 36, 0.7), 0 0 5px rgba(192, 132, 252, 0.5)`.
  - Leading-edge peg glow: `box-shadow: 0 0 14px 2px #fbbf24`.
- [x] **1.3** Mount `NavigationProgressBar` in `src/app/providers.tsx` so it is globally available on all routes.

---

### Part 2: Instant Route Transition Skeletons (`loading.tsx`)
* **Goal**: Enable Next.js to switch pages instantly (<50ms) upon clicking, displaying a high-fidelity shimmer skeleton while server data streams in via React Suspense.
- [x] **2.1** Create `src/app/(public)/loading.module.css`:
  - Reusable glassmorphic skeleton styles with GPU-accelerated shimmer animation (`translateX(-100%)` to `translateX(100%)`).
  - Skeleton blocks for banners, cards, badges, titles, buttons, and text lines.
- [x] **2.2** Create `src/app/(public)/series/[slug]/loading.tsx`:
  - High-fidelity skeleton matching the Series details page layout:
    - Giant banner backdrop shimmer
    - Poster placeholder with CEN/UNCEN badge placeholder
    - Action buttons row placeholders (Watchlist, Favorite, Share)
    - Title, studio, release year, and rating badges placeholders
    - Synopsis placeholder lines
    - Episode list grid cards skeleton
- [x] **2.3** Create `src/app/(public)/watch/[episodeId]/loading.tsx`:
  - High-fidelity skeleton matching the Episode Watch player layout:
    - 16:9 cinematic video player placeholder with pulsing center play button glow
    - Title, episode counter, and like/dislike/share action bar placeholders
    - Visual series details card placeholder
    - Episode queue sidebar list skeleton
- [x] **2.4** Create `src/app/(public)/loading.tsx`:
  - Fallback global skeleton for all other public pages (`/genres`, `/trending`, `/categories`, etc.).

---

### Part 3: Server-Side Data Fetching & Query Optimizations
* **Goal**: Drastically cut database execution time and payload size on Supabase so pages load multiple times faster.
- [x] **3.1** Optimize `src/app/(public)/series/[slug]/page.tsx`:
  - **Prune Heavy Catalog Join**: In `getCachedAllPublishedSeries`, change the query to select only lightweight recommendation fields:
    ```ts
    .select('id, title, slug, studio, tags, category, poster_image_key, cover_image_key, rating, release_year')
    ```
    (Eliminates deep joins of all seasons and episodes for every series in the database).
  - **Eliminate 1+N Query Waterfall**: In `getCachedSeriesDetails`, fetch seasons and episodes in a single joined query:
    ```ts
    .select('*, episodes(id, episode_number, title, description, duration_seconds, thumbnail_key, release_date, created_at, is_published)')
    ```
    (Eliminates running separate sequential queries for each season's episodes).
- [x] **3.2** Optimize `src/app/(public)/watch/[episodeId]/page.tsx`:
  - **Parallelize Root Queries**: Run `getCachedMinimalSeriesList()` and `getCachedResolvedEpisode(episodeId)` in parallel using `Promise.all`:
    ```ts
    const [allSeriesList, resolved] = await Promise.all([
      getCachedMinimalSeriesList(),
      getCachedResolvedEpisode(episodeId)
    ]);
    ```
  - **Eliminate Duplicate Query**: In `resolveEpisode`, use sibling episodes already present in `seriesData.seasons.episodes` instead of executing a redundant query to the `episodes` table.

---

### Part 4: Smart Link Prefetching & Physical Click Micro-Interactions
* **Goal**: Preload page bundles in the background before the user even clicks, and provide tactile visual feedback when clicking.
- [x] **4.1** Remove `prefetch={false}` from:
  - `src/components/SeriesCard/SeriesCard.tsx`
  - `src/components/SeriesCard/SeriesCompactCard.tsx`
  - `src/app/(public)/page.tsx` (episode and series cards)
  - Allows Next.js smart viewport prefetching in production so pages open instantly from local cache.
- [x] **4.2** Add active click micro-interactions in `src/app/globals.css`:
  - Add `:active` physical feedback rule to `.card-hover`, `button`, and navigation links (`transform: scale(0.975)`).
  - Provides instantaneous tactile visual confirmation the exact millisecond a user presses a mouse button or taps a touchscreen.

---

### Part 5: Live Verification & Historical Record Logging
* **Goal**: Validate zero compile errors, verify sub-second transitions live, and record all completed work in `AUDIT_CHANGELOG.md`.
- [x] **5.1** Run TypeScript compilation check (`npx tsc --noEmit`) to verify 0 errors.
- [x] **5.2** Perform live HTTP status verification against `http://localhost:3004`.
- [x] **5.3** Record Phase 10 in `AUDIT_CHANGELOG.md` with complete details of files modified, problem statements, fixes applied, and performance results.

---

## Record Keeping Files

| File | Purpose |
| :--- | :--- |
| [`SPEED_AND_TRANSITION_PLAN.md`](file:///c:/new%20website%20creation/hentaianime/SPEED_AND_TRANSITION_PLAN.md) | **Active Roadmap**: Detailed part-by-part plan of upcoming speed and loading improvements with checkboxes. |
| [`AUDIT_CHANGELOG.md`](file:///c:/new%20website%20creation/hentaianime/AUDIT_CHANGELOG.md) | **Permanent Historical Record**: Master archive of all completed work, bug fixes, files changed, and test results from previous tasks. |
| [`plan.md`](file:///c:/new%20website%20creation/hentaianime/plan.md) | **Architecture Blueprint**: High-level system overview, hosting infrastructure, database schema, and core project specifications. |
