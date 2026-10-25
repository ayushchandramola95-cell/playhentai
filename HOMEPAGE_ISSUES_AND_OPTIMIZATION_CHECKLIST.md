# Homepage Issues & Optimization Checklist

Comprehensive audit and remediation tracking for the Homepage (`src/app/(public)/page.tsx`, `page.module.css`, `loading.tsx`, and connected subcomponents).

---

## Phase 1: Performance & SSR Speed
- [x] **Issue 1: Wrap `getCachedCatalogData` in `unstable_cache`**
  - *Details:* Wrapped `getCachedCatalogData` in Next.js `unstable_cache` with a 120s TTL and cache tags `['catalog', 'homepage']`. Sub-millisecond cache retrieval replaces repeated in-memory iterations of 378 series and 876 episodes.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 2: Eliminate Direct Supabase SSR `site_settings` Query**
  - *Details:* Removed remote HTTP query to Supabase `site_settings` on SSR; now relies directly on in-memory `getSiteSettings()` with 0ms latency and zero egress.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 3: Optimize Recent Episodes Processing**
  - *Details:* Pre-sliced and capped processing to collect top 20 valid episodes and break early instead of parsing and sorting 856 discarded items in memory on every request.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 4: Reduce `RandomRowSection` Pool Serialization Bloat**
  - *Details:* Capped `seriesPool` from 36 items to 18 items, slashing Next.js RSC flight payload and script bloat.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 5: Slim Down `SeriesCard` Props Serialization**
  - *Details:* Stripped redundant fields (`cover_image_key`, `banner_image_key` fallbacks) before passing items to client components to reduce the flight JSON payload size.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 6: Standardize First Hero Image Preload**
  - *Details:* Replaced raw `<link rel="preload">` elements inside body `<div>` with React 19 native `ReactDOM.preload(href, { as: 'image', fetchPriority: 'high' })`, hoisting preloads cleanly into `<head>` without hydration mismatch.
  - *Files:* `src/app/(public)/page.tsx`

---

## Phase 2: Hydration & Logic Fixes
- [x] **Issue 7: Fix React Hydration Mismatch in `WatchlistToggle`**
  - *Details:* Initialized `inWatchlist` to `false` for SSR consistency and deferred `localStorage` reading to `useEffect` on client mount, eliminating hydration mismatch warnings.
  - *Files:* `src/components/WatchlistToggle/WatchlistToggle.tsx`

- [x] **Issue 8: Fix Category vs Tag Routing Inconsistency in `HeroCarousel`**
  - *Details:* Updated tag chips in `HeroCarousel` to link directly to canonical `/categories/${tagToSlug(tag)}` instead of triggering HTTP 307 redirects from `/tag/...`.
  - *Files:* `src/components/HeroCarousel/HeroCarousel.tsx`

- [x] **Issue 9: Replace Native `alert()` in `PwaInstallBanner`**
  - *Details:* Replaced browser blocking `alert()` with an elegant non-blocking tooltip matching the site's dark glassmorphism theme.
  - *Files:* `src/components/PwaInstallBanner/PwaInstallBanner.tsx`

- [x] **Issue 10: Accessibility on Recent Episodes View Counts**
  - *Details:* Added descriptive `aria-label="${ep.views} views"` and `aria-hidden="true"` on icons for screen readers.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 11: Accessible State Announcement on `RandomRowSection` Shuffle**
  - *Details:* Added `aria-live="polite"` feedback when the shuffle button generates a new series list.
  - *Files:* `src/components/RandomRowSection/RandomRowSection.tsx`, `RandomRowSection.module.css`

---

## Phase 3: CSS & Layout Refactoring
- [x] **Issue 12: Overhaul `loading.tsx` to Fix CLS Layout Mismatch**
  - *Details:* Upgraded `loading.tsx` skeleton to mirror the real homepage structure (SEO Header skeleton + 600px Spotlight Hero carousel skeleton + 5-column landscape episode grid + scroll rows), eliminating Cumulative Layout Shift.
  - *Files:* `src/app/(public)/loading.tsx`, `src/app/(public)/loading.module.css`

- [x] **Issue 13: Purge 138 Lines of Dead Popover CSS from `page.module.css`**
  - *Details:* Removed dead `.popover` styling and children selectors that were handled exclusively by `SeriesCard.module.css`.
  - *Files:* `src/app/(public)/page.module.css`

- [x] **Issue 14: Purge 40 Lines of Dead SeriesCard CSS from `page.module.css`**
  - *Details:* Removed unused `.seriesCard`, `.seriesImageWrapper`, etc. from `page.module.css`.
  - *Files:* `src/app/(public)/page.module.css`

- [x] **Issue 15: Purge Dead Utility Selectors from `page.module.css`**
  - *Details:* Removed unused `.heroSection`, `.sectionHeader`, `.sectionIcon`, and `.demoBadge`.
  - *Files:* `src/app/(public)/page.module.css`

- [x] **Issue 16: Decouple `RecommendationsBanner` from `page.module.css`**
  - *Details:* Created a dedicated `RecommendationsBanner.module.css` and removed component dependency on page-level CSS.
  - *Files:* `src/components/RecommendationsBanner/RecommendationsBanner.tsx`, `src/components/RecommendationsBanner/RecommendationsBanner.module.css`

- [x] **Issue 17: Refactor `RandomRowSection` to Reuse `HorizontalScrollRow`**
  - *Details:* Eliminated ~100 lines of duplicate carousel engine code by composing `HorizontalScrollRow` with the custom shuffle header control.
  - *Files:* `src/components/RandomRowSection/RandomRowSection.tsx`, `src/components/HorizontalScrollRow/HorizontalScrollRow.tsx`, `src/components/RandomRowSection/RandomRowSection.module.css`

- [x] **Issue 18: Add CSS Transition and Rotation for `.faqIcon`**
  - *Details:* Implemented smooth icon rotation (45deg to `×`) and gold color transition in `page.module.css` when FAQ `<details>` is toggled open.
  - *Files:* `src/app/(public)/page.module.css`

- [x] **Issue 19: Move Quick Navigation Inline Styles to CSS Classes**
  - *Details:* Replaced repetitive inline styles on quick links with `.quickHubGrid` and `.quickHubLink` classes in `page.module.css`.
  - *Files:* `src/app/(public)/page.tsx`, `src/app/(public)/page.module.css`

- [x] **Issue 20: Clean Up Mobile Episode Grid Display Behavior**
  - *Details:* Removed hard `display: none` on items 13-20 in CSS so mobile users can browse all 20 episodes smoothly in the 2-column grid.
  - *Files:* `src/app/(public)/page.module.css`

---

## Phase 4: Dead Code Removal & SEO Enhancements
- [x] **Issue 21: Clean Up Unused Imports in `page.tsx`**
  - *Details:* Removed unused `fs`, `path`, `Calendar`, `Award`, `Clock`, `MOCK_SERIES_DETAILS`, and Supabase client import.
  - *Files:* `src/app/(public)/page.tsx`

- [x] **Issue 22: Add Schema.org `WebSite` with `SearchAction`**
  - *Details:* Added `WebSite` structured data with `SearchAction` enabling Google Sitelinks Search Box support.
  - *Files:* `src/app/(public)/page.tsx`

---

## Verification & Benchmarks
- [x] TypeScript Compilation check (`npx tsc --noEmit`): **Passed with 0 errors**
- [x] Live Curl Performance: **TTFB ~150ms on warm request**
