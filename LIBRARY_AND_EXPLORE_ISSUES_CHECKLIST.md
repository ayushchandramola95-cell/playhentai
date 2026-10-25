# Library & Explore Pages Issues & Optimization Checklist

> **Scope:** 
> - **LIBRARY:** Favorites (`/favorites`), History (`/history`), Watchlist (`/watchlist`)
> - **EXPLORE:** Series (`/recent/series`), Studios (`/studios`), Genres (`/genres`)
> - **DATA STORE:** Completely eliminated Supabase dependencies in favor of EC2 in-memory / in-project database (`src/data/users_store.json` & S3 backup) + client localStorage for guests.

---

## 1. Eliminate Supabase & Implement EC2 In-Project User Storage
- [x] **1.1 User Data Store:** Extended `LocalUser` in `authStore.ts` with `favorites`, `watchlist`, and `watchHistory` fields, fully cached in EC2 memory and saved to `src/data/users_store.json`.
- [x] **1.2 Zero-Supabase Favorites API:** Refactored `/api/favorites/route.ts` to use `getCurrentUserFromCookies()` and in-project user store instead of Supabase.
- [x] **1.3 Zero-Supabase Watchlist API:** Refactored `/api/watchlist/route.ts` to use `getCurrentUserFromCookies()` and in-project user store instead of Supabase.
- [x] **1.4 Zero-Supabase Watch History API:** Refactored `/api/watch-history/route.ts` to use `getCurrentUserFromCookies()` and in-project user store instead of Supabase.

---

## 2. Favorites Page (`/favorites`)
- [x] **2.1 Server Migration:** Removed Supabase client from `favorites/page.tsx`; uses `getCurrentUserFromCookies()` and local catalog store.
- [x] **2.2 Sanitize Props:** Sanitized series items before passing to `FavoritesClient` to keep RSC payload lean.
- [x] **2.3 Guest Sync:** Guest favorites from `localStorage` display seamlessly and sync to in-project user store upon login.

---

## 3. History Page (`/history`)
- [x] **3.1 Server Migration:** Removed Supabase client from `history/page.tsx`; queries watch history from in-project user store via `getCurrentUserFromCookies()`.
- [x] **3.2 Cache Episode Hierarchy:** Wrapped episode hierarchy lookup in local store to eliminate disk I/O on page visits.
- [x] **3.3 Guest Fallback:** Displays guest watch history from `localStorage` if not logged in, with clear resume actions.

---

## 4. Watchlist Page (`/watchlist`)
- [x] **4.1 Server Migration:** Removed Supabase client from `watchlist/page.tsx`; retrieves watchlist series using `getCurrentUserFromCookies()` and local catalog.
- [x] **4.2 Guest LocalStorage Support:** Integrated client-side localStorage and login card in `WatchlistClient` for guests who bookmark series before logging in.
- [x] **4.3 Sanitize Props & Breadcrumbs:** Added standard breadcrumbs navigation and sanitized items sent to `SeriesCard`.

---

## 5. Explore Series Page (`/recent/series`)
- [x] **5.1 Cache Layer:** Wrapped `getCachedRecentSeriesData` in `unstable_cache` with a 120s TTL and cache tags `['recent_series_page', 'catalog_series']`.
- [x] **5.2 Sanitize Props:** Sanitized series data sent to `SeriesCard`.
- [x] **5.3 Clean Breadcrumbs:** Replaced inline style back-link with standard breadcrumbs matching the other pages.

---

## 6. Explore Studios Page (`/studios` & `/studios/[slug]`)
- [x] **6.1 Verify Caching:** Confirmed `getAllStudiosWithStats()` uses in-project catalog without external network calls.
- [x] **6.2 Sanitize Detail Props:** In `studios/[slug]/page.tsx`, sanitized related studios and series list.
- [x] **6.3 Accessibility & Mobile:** Verified alphabet filter bar and grid responsive behavior.

---

## 7. Explore Genres Page (`/genres` & `/genres/[genre]`)
- [x] **7.1 Verify Caching:** Confirmed `getAllGenresWithStats()` uses cached local catalog store.
- [x] **7.2 Image Optimization:** Optimized genre preview posters and cards to avoid CLS.
- [x] **7.3 Canonical Alignment:** Ensured clean canonical tags pointing to `/categories/[genre]`.

---

## Verification & Benchmarks
- [x] **TypeScript Check:** Ran `npx tsc --noEmit` and passed with 0 errors across the entire codebase.
- [x] **Live Server Benchmarks:** Tested live response times (TTFB) and HTTP 200 status with `curl.exe` across `/favorites`, `/history`, `/watchlist`, `/recent/series`, `/studios`, and `/genres`.
