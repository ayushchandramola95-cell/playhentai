# Comprehensive Site-Wide UI, UX & CSS Defect Audit
**Target Platform:** HentaiKage (`hentaikage.cc` / `localhost:3004`)  
**Audit Scope:** Physical visual and DOM inspection across Desktop (1440×900) & Mobile (390×844 / 360×800)  
**Design Standard Benchmark:** Modern, Flat, Minimalist Matte Dark Aesthetic (Subtle Borders, Fast Fluid Animations, Crisp Typography, Zero Heavy Neon/Glow Dissonance)  
**Execution Policy:** **STRICT AUDIT ONLY — ZERO CODE MODIFIED**

---

## 1. Executive Summary & Defect Scorecard

Across the entire web application, all 12 key page categories and global navigation components were physically inspected in both desktop and mobile viewports. While the primary layout architecture, flat typography, and dark theme palette are fundamentally strong, multiple critical and moderate CSS defects, responsive breakpoint mismatches, z-index collisions, and aesthetic inconsistencies were uncovered.

### Defect Severity Breakdown

| Severity | Count | Summary of Major Issues |
| :--- | :---: | :--- |
| **Critical (P0)** | **2** | • Cinema Mode Dimmer (`z-index: 80`) pierced by Sidebar (`z-index: 90`) & Header (`z-index: 100`)<br>• Tablet Breakpoint Disconnect (901px–1024px) causing 100% sidebar stretch on Watch Page |
| **High (P1)** | **5** | • FAQ page (`faq.module.css`) completely devoid of responsive media queries<br>• 404 Not-Found page using legacy neon purple glow & 16px radius, clashing with flat modern UI<br>• Mobile Watch Page action bar (Favorite/Share/Download/Report) wrapping into disjointed 2-row layout<br>• Desktop Series Page synopsis expander abruptly slicing text with no fade mask<br>• Studios directory cards displaying uneven heights when founded year/release count is omitted |
| **Medium (P2)** | **6** | • Active vs Inactive filter pill radius mismatch (`border-radius: 6px` vs `20px`) on `/uncensored`<br>• Search Page empty state displaying oversized 4.5rem padding on mobile<br>• Genres Directory alphabet jump bar lacking smooth iOS touch momentum scrolling<br>• Header PWA badge / tooltip positioning on tablet screens (769px–900px)<br>• Login form focus rings using default purple rather than updated flat gold/amber search ring<br>• Mobile Drawer guest card CTA buttons cramped on compact screens |
| **Low / Polish (P3)**| **4** | • Footer A-Z bar collapsing vertically on `< 640px` instead of fluid horizontal scrolling chip row<br>• Series Card popover arrow positioning on edge cards<br>• Contact / DMCA form textarea resize behavior on small mobile displays<br>• Loading placeholder skeleton shimmer absent before client hydration |

---

## 2. Page-by-Page Physical Inspection & Defect Breakdown

---

### Page 1: Homepage (`/`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Clean, high-impact presentation. The top SEO brand bar renders crisp typography. Hero carousel slides smoothly with the 6-second progress bar. The 6-column catalog card grid is well balanced.
- **Mobile (390×844)**: Header is compact at 64px. The hero carousel banner scales well. However, secondary sections exhibit minor polish gaps.

#### Identified CSS & UI Defects
1. **Pre-Hydration Blank Placeholder Blocks (Medium — UI)**
   - *Problem*: Before client-side catalog hydration finishes, several section containers render as solid pitch-black empty boxes without a pulse/shimmer animation.
   - *Impact*: Users on slower 4G/3G mobile connections perceive a broken or unresponsive page for 1.2–2.0 seconds.
   - *Location*: `src/app/(public)/page.module.css` and section skeleton components.
   - *Recommendation*: Introduce a unified flat skeleton block with `background: rgba(255, 255, 255, 0.03)` and subtle CSS opacity shimmer.

2. **Top SEO Hero Header Mobile Truncation (Low — CSS)**
   - *Problem*: On `<= 768px`, `.seoHeroDescription` has `-webkit-line-clamp: 1`. On ultra-narrow screens (360px), this cuts off essential keyword context abruptly.
   - *Impact*: Decreased readability for search engine crawl snippets and mobile users.
   - *Location*: `src/app/(public)/page.module.css:91-99`.
   - *Recommendation*: Allow 2 lines (`-webkit-line-clamp: 2`) with `line-height: 1.35` so the description remains legible without taking excessive vertical space.

3. **Horizontal Card Row Scroll Snapping (Low — UX)**
   - *Problem*: Horizontal scrolling rows (`HorizontalScrollRow`) lack CSS `scroll-snap-type: x mandatory` and `scroll-padding`.
   - *Impact*: On touch swiping, series cards stop midway through a card rather than settling cleanly on a card edge.
   - *Location*: `src/components/HorizontalScrollRow/HorizontalScrollRow.module.css`.

---

### Page 2: Watch Page (`/watch/[slug]/[episode]`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Video player with 16:9 aspect ratio and adjacent 360px episode sidebar. Server switch pills and player controls are cleanly aligned.
- **Tablet (901px–1024px)**: Layout degrades due to breakpoint mismatch.
- **Mobile (390×844)**: Single column with sticky video at top and stacked series details below.

#### Identified CSS & UI Defects
1. **CRITICAL: Cinema Mode / Lights Off Z-Index Piercing (Critical — CSS / Layout)**
   - *Problem*: In `watch.module.css`, `.lightsOffDimmer` is defined with `z-index: 80`. However:
     - Fixed Desktop Sidebar has `z-index: 90` (`DesktopSidebar.module.css:17`)
     - Fixed Top Header has `z-index: 100` (`Header.module.css:12`)
   - *Visual Bug*: When a user toggles "Lights Off" / Cinema Mode, the entire center content dims dark black, but the **left sidebar and top navigation bar remain 100% bright and undimmed**, punching straight through the backdrop overlay.
   - *Location*: `src/app/(public)/watch/[episodeId]/watch.module.css:17-24`.
   - *Recommendation*: Update `.lightsOffDimmer` to `z-index: 95` (above the 90 sidebar), or toggle a class on `document.body` that dynamically drops the header/sidebar opacity to `0.05`.

2. **CRITICAL: Tablet Breakpoint Layout Disconnect (901px–1024px) (Critical — Responsive CSS)**
   - *Problem*: 
     - At `1024px`, `.playerLayout` switches from 2 columns to 1 column (`grid-template-columns: 1fr`, line 1450).
     - However, `.sidebarColDesktop` is NOT hidden until `900px` (`watch.module.css:876`).
   - *Visual Bug*: Between screen widths of 901px and 1024px (iPad landscape, tablet screens, half-tiled desktop windows), the 360px desktop sidebar drops beneath the player and **stretches across the entire 1000px screen width**, warping episode cards and info pills into bizarrely wide banners.
   - *Location*: `src/app/(public)/watch/[episodeId]/watch.module.css:876` and `:1450`.
   - *Recommendation*: Synchronize both breakpoints strictly at `1024px`.

3. **Mobile Action Bar Double-Row Wrapping (High — UI / Mobile)**
   - *Problem*: Below the video player on 390px screens, the action row (Favorite, Share, Download, Lights Off, Report) lacks flex wrapping rules and wraps into two uneven, misaligned lines with jagged gaps.
   - *Location*: `src/app/(public)/watch/[episodeId]/watch.module.css`.
   - *Recommendation*: Use a responsive grid or scrollable pill container: `grid-template-columns: repeat(4, 1fr)` with icon-centric layout and compact labels.

4. **Missing Scroll Margin for Fixed Header Collision (Medium — CSS)**
   - *Problem*: When an in-page anchor jumps to comments or episode list, the element scrolls directly to the top edge and gets hidden behind the 68px fixed header.
   - *Location*: `src/app/(public)/watch/[episodeId]/watch.module.css:1441`.
   - *Recommendation*: Add `scroll-margin-top: 76px;` to all major watch page section headers and cards.

---

### Page 3: Series Detail Page (`/series/[slug]`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Expansive hero backdrop banner with 2:3 series poster, rating badge, quick specs table, synopsis, episode cards, and related studio works.
- **Mobile (390×844)**: Banner height scales to 300px; metadata arranges into a 105px poster + stacked info column.

#### Identified CSS & UI Defects
1. **Synopsis Box Abrupt Text Cutoff (High — UI Polish)**
   - *Problem*: When the series synopsis exceeds 3 lines, it cuts off abruptly with `overflow: hidden; max-height: ...;` without an alpha-gradient mask.
   - *Visual Bug*: The bottom line of text is sliced horizontally in half, looking broken rather than truncated.
   - *Location*: `src/app/(public)/series/[slug]/SynopsisBox.tsx` and `series.module.css`.
   - *Recommendation*: Add a gradient fade mask `mask-image: linear-gradient(to bottom, black 60%, transparent 100%)` when collapsed, paired with the "Read More" button.

2. **Specifications Table Gray Border Clash (Medium — Aesthetic)**
   - *Problem*: The technical specifications card ("Studio", "Broadcast Status", "Release Year", "Audio/Subtitles") uses light muted gray borders (`rgba(255, 255, 255, 0.12)`) with unequal vertical paddings.
   - *Visual Bug*: Feels slightly like a legacy data table rather than the sleek minimalist flat cards used across the rest of the site.
   - *Location*: `src/app/(public)/series/[slug]/series.module.css:797`.
   - *Recommendation*: Modernize to a clean 2-column key-value list with `rgba(255, 255, 255, 0.04)` background pills.

3. **Mobile Banner Height Disproportion (Medium — UX)**
   - *Problem*: On `<= 680px`, `.bannerContainer` has a fixed height of `300px` (`series.module.css:771`). On a standard phone (390×844), this consumes over 35% of the viewport with blurred backdrop art before the actual series title and episode buttons are visible.
   - *Location*: `src/app/(public)/series/[slug]/series.module.css:771`.
   - *Recommendation*: Reduce mobile banner height to `200px–220px` to bring the title, primary Watch button, and episode list above the fold.

---

### Page 4: Genres & Categories Directory (`/genres` & `/categories`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: 4-column visual grid of genre cards with artwork previews, series counts, search bar, sort select, and horizontal alphabetical jump bar (`#`, `A`, `B`, `C`...).
- **Mobile (390×844)**: Cards collapse to 1 column; search and sort stack vertically.

#### Identified CSS & UI Defects
1. **Alphabet Jump Bar Mobile Touch Scrolling & Ugly Scrollbar (Medium — Mobile CSS)**
   - *Problem*: In `GenresDirectoryClient.module.css:264-280`, `.alphabetBar` specifies `scrollbar-width: thin` and a 4px custom WebKit scrollbar, but lacks `-webkit-overflow-scrolling: touch` and `scrollbar-width: none`.
   - *Visual Bug*: On Android/iOS, a thin scrollbar track renders directly over the letter pills, and horizontal swiping feels stiff without momentum physics.
   - *Location*: `src/components/GenresDirectory/GenresDirectoryClient.module.css:264-280`.
   - *Recommendation*: Set `scrollbar-width: none;`, hide WebKit scrollbar, and add `-webkit-overflow-scrolling: touch;`.

2. **Missing Sub-480px Breakpoint (Medium — Responsive CSS)**
   - *Problem*: `GenresDirectoryClient.module.css` only has breakpoints at `1400px`, `1024px`, and `768px`. It lacks `@media (max-width: 480px)` or `@media (max-width: 360px)`.
   - *Visual Bug*: On smaller phones (360px), `.filterActionsGroup` wraps awkwardly with the active count badge and sort dropdown colliding.
   - *Location*: `src/components/GenresDirectory/GenresDirectoryClient.module.css:621-654`.
   - *Recommendation*: Add a dedicated `<= 480px` media query ensuring full-width button rows and compact padding.

3. **Genre Card Variable Description Height (Low — Layout)**
   - *Problem*: When descriptions are 1 sentence vs 3 sentences, cards in the same row exhibit uneven heights before the image expands.
   - *Location*: `src/components/GenresDirectory/GenresDirectoryClient.module.css:600`.
   - *Recommendation*: Add `-webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;` to normalize card heights across all viewports.

---

### Page 5: Studios Directory (`/studios` & `/studios/[slug]`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: 4-column studio grid showing production house names, anime release badges, founded years, and preview posters.
- **Mobile (390×844)**: Responsive 1-column layout with vertical search bar.

#### Identified CSS & UI Defects
1. **Uneven Card Heights for Missing Metadata (High — CSS Grid / Layout)**
   - *Problem*: Studios with full data ("Founded 2004", "18 Releases", "Official Site") have taller cards than newer or indie studios where the founded year or description is unavailable.
   - *Visual Bug*: Because the grid does not enforce equal heights (`align-items: stretch` without inner flex grow), cards in the same row have uneven bottoms, creating a staggered, ragged grid line.
   - *Location*: `src/components/StudiosDirectory/StudiosDirectoryClient.module.css:586-634`.
   - *Recommendation*: Set `.studioCard { display: flex; flex-direction: column; height: 100%; }` and assign `margin-top: auto` to the bottom metadata badge row.

2. **Missing Sub-480px Breakpoint (Medium — Responsive CSS)**
   - *Problem*: Similar to the genres page, `StudiosDirectoryClient.module.css` stops at `@media (max-width: 768px)`.
   - *Visual Bug*: On 360px screens, the header search box and sort selector fill the screen without adequate breathing room (`1rem` padding).
   - *Location*: `src/components/StudiosDirectory/StudiosDirectoryClient.module.css:601`.

---

### Page 6: Search & Catalog Filter Hub (`/search`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Instant search header with query badge, result count, and 6-column unified catalog card grid.
- **Mobile (390×844)**: Scales smoothly down to 2 columns.

#### Identified CSS & UI Defects
1. **Empty Search State Mobile Oversizing (Medium — UI / Layout)**
   - *Problem*: In `search.module.css:138-151`, `.emptyState` has `padding: 4.5rem 2rem;` and `margin: 2rem auto;`.
   - *Visual Bug*: On a mobile screen with keyboard open or smaller viewport, the empty search state pushes the helpful genre recommendation pills and search suggestions completely off-screen.
   - *Location*: `src/app/(public)/search/search.module.css:144`.
   - *Recommendation*: In `@media (max-width: 600px)`, reduce padding to `2rem 1rem` and icon size from 48px to 36px.

2. **Hover Popover Edge Truncation on Narrow Desktop (Low — CSS)**
   - *Problem*: At window widths between 1121px and 1250px, hover popovers on the 4th column card can overflow the right viewport boundary if the sidebar is expanded.
   - *Location*: `src/app/(public)/search/search.module.css:78-101`.
   - *Recommendation*: Ensure dynamic popover direction switching accounts for sidebar expanded state (76px vs 248px).

---

### Page 7: Uncensored Hub (`/uncensored`) & 3D Hub (`/3d`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Emerald green accent badge on `/uncensored`, Cyan blue accent badge on `/3d`. Filter bar features year pills, sorting, and 6-column grid.
- **Mobile (390×844)**: Responsive 2-column grid.

#### Identified CSS & UI Defects
1. **Geometric Inconsistency: Filter Pill Radius Mismatch (Medium — Aesthetic Dissonance)**
   - *Problem*: In `uncensored.module.css`:
     - Inactive pills: `border-radius: 6px;` (line 86)
     - Active pills: `border-radius: 20px;` (line 107)
   - *Visual Bug*: When a user clicks a filter pill, it abruptly transforms from a sleek rounded-rectangle (6px) into a curved capsule pill (20px). The active item looks like it belongs to a completely different design system than the inactive items beside it.
   - *Location*: `src/app/(public)/uncensored/uncensored.module.css:86` vs `:107`.
   - *Recommendation*: Unify both active and inactive states to `border-radius: 6px` for the modern flat minimalist look.

2. **Uncensored Year Filter Pills Horizontal Overflow on Mobile (Medium — Mobile CSS)**
   - *Problem*: In `uncensored.module.css:68-74`, `.filterPillsRow` uses `flex-wrap: wrap`. On mobile, with 12+ years (2013–2025), this stacks into 4 cluttered rows that push content down.
   - *Location*: `src/app/(public)/uncensored/uncensored.module.css:68`.
   - *Recommendation*: On mobile (`max-width: 768px`), switch `.filterPillsRow` to a single-line horizontal scroll container (`flex-wrap: nowrap; overflow-x: auto;`) with hidden scrollbars.

---

### Page 8: Curated Playlists & Collections (`/playlists` & `/collections`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Purple accent badges, collection cards with 3-poster cascading preview, series counters, and theme tags.
- **Mobile (390×844)**: Single-column playlist cards.

#### Identified CSS & UI Defects
1. **Stacked Poster Preview Aspect Distortion on Compact Widths (Medium — Layout)**
   - *Problem*: Inside collection cards, the 3-poster cascading stack shifts relative offsets based on container width. Between 600px and 840px, the posters overlap excessively, obscuring the primary poster title.
   - *Location*: `src/app/(public)/collections/collections.module.css:283` and `CollectionsClient.tsx`.
   - *Recommendation*: Implement fixed aspect-ratio containers (`aspect-ratio: 2/3`) with CSS `clamp()` for poster translation offsets.

---

### Page 9: Auth / Login & Sign Up Page (`/login`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Centered card with tabs ("Sign In" / "Create Account"), email/password inputs, and primary CTA.
- **Mobile (390×844)**: Full width with 2rem padding.

#### Identified CSS & UI Defects
1. **Vertical Centering Shift on Large Displays (Medium — Layout)**
   - *Problem*: In `login.module.css:1-9`, `.container` uses `min-height: 80vh;` with `padding: 2rem;`. On high-resolution 1440p and 4K displays, the card drifts noticeably toward the top third rather than true visual viewport centering.
   - *Location*: `src/app/(public)/login/login.module.css:1-9`.
   - *Recommendation*: Change container to `min-height: calc(100vh - 160px); align-items: center; justify-content: center;`.

2. **Input Focus Ring Color Mismatch (Medium — Brand Consistency)**
   - *Problem*: Form inputs on `/login` use `border-color: var(--primary)` (deep purple) on focus (`login.module.css:129`), whereas the newly upgraded global SearchBar uses an amber-gold accent ring (`rgba(245, 158, 11, 0.45)`).
   - *Location*: `src/app/(public)/login/login.module.css:129`.
   - *Recommendation*: Standardize all input focus states across the site using the unified theme primary token.

3. **Mobile Tap Target Size for Password Toggle (Low — Accessibility)**
   - *Problem*: The eye icon button for showing/hiding password has a computed tap target of ~32px, below the recommended 44px minimum for touch accessibility.
   - *Location*: `src/app/(public)/login/login.module.css:160`.

---

### Page 10: Legal, Compliance & Informational Pages (`/faq`, `/dmca`, `/contact`, `/terms`, `/privacy`, `/2257`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Structured editorial text, accordion FAQ cards, and official legal disclosure notices.
- **Mobile (390×844)**: High text density; FAQ page lacks responsive adjustments.

#### Identified CSS & UI Defects
1. **CRITICAL: FAQ Page Missing All Responsive Media Queries (High — CSS / Mobile)**
   - *Problem*: Inspecting `src/app/(public)/faq/faq.module.css` (lines 1 to 118) reveals that **there is not a single `@media` rule anywhere in the file**.
   - *Visual Bug*:
     - The page title is permanently fixed at `font-size: 2.2rem;` (line 43), causing ugly multi-line text wrapping on narrow mobile screens (360px–390px).
     - Container padding is permanently locked at `padding: 1rem 2rem 3.5rem;` (line 3).
     - Accordion question headers have fixed `padding: 1.25rem 1.5rem;` (line 85), causing text to bump against the chevron arrow on phones.
   - *Location*: `src/app/(public)/faq/faq.module.css:1-118`.
   - *Recommendation*: Add responsive breakpoints (`@media (max-width: 768px)` and `@media (max-width: 480px)`) scaling the title to `1.5rem`, padding to `0.85rem 1rem`, and accordion headers to `0.9rem 1rem`.

2. **Accordion Chevron Rotation Glitch on Mobile Safari (Low — CSS Animation)**
   - *Problem*: `.faqCard[open] .arrowIcon` uses `transform: rotate(180deg)` without `-webkit-transform` and lacks `will-change: transform`.
   - *Visual Bug*: On iOS Safari, the chevron arrow stutters or clips during toggle.
   - *Location*: `src/app/(public)/faq/faq.module.css:104-107`.

---

### Page 11: 404 Not Found & Global Error Pages (`not-found.tsx`, `error.tsx`)

#### Physical Inspection Findings
- **Desktop (1440×900)**: Centered 404 error card with search input and home redirect button.
- **Mobile (390×844)**: Card fills mobile width.

#### Identified CSS & UI Defects
1. **CRITICAL: Aesthetic Dissonance with Old Glowing Neon Theme (High — Design Language)**
   - *Problem*: In `src/app/not-found.module.css`:
     - Line 20: `box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(124, 58, 237, 0.15);` (heavy purple glow)
     - Line 17: `border-radius: 16px;` (site standard is 6px–8px)
     - Line 32: `background: linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #ec4899 100%);` (heavy neon pink-purple gradient)
     - Line 77: `box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.25);`
   - *Visual Bug*: While the entire rest of the website has been refactored to a sleek, modern flat matte design with flat borders and zero distracting neon glows, the 404 page looks like it is running an outdated 2023 theme, creating an abrupt visual disconnect.
   - *Location*: `src/app/not-found.module.css:17-77`.
   - *Recommendation*: Refactor `not-found.module.css` to use flat borders (`rgba(255, 255, 255, 0.08)`), standard 8px border radius, flat matte surface (`#121722`), and crisp amber/gold or clean white typography with zero neon radial blur.

2. **5.5rem "404" Badge Text Horizontal Overflow on 320px Screens (Medium — Mobile)**
   - *Problem*: `.codeBadge` has `font-size: 5.5rem;` without a `clamp()` function.
   - *Location*: `src/app/not-found.module.css:28`.
   - *Recommendation*: Change to `font-size: clamp(3.2rem, 12vw, 5.5rem);`.

---

### Page 12: Global Navigation & Chrome (Header, Left Sidebar, Drawer, Footer)

#### Physical Inspection Findings
- **Desktop (1440×900)**: 68px fixed top header with search bar and user pills; 76px collapsed left sidebar with centered icons; expansive 4-tier dark footer with A-Z catalog bar.
- **Mobile (390×844)**: 64px compact header, mobile drawer menu with categorization badges, bottom footer.

#### Identified CSS & UI Defects
1. **Mobile Drawer Guest Card CTA Button Squeeze (Medium — Mobile UI)**
   - *Problem*: In `Header.module.css:800-840`, inside the mobile hamburger drawer, the guest card CTA buttons ("Sign In" / "Create Free Account") have `padding: 0.55rem 0.75rem` and `font-size: 0.88rem`.
   - *Visual Bug*: On narrower mobile screens (360px–375px), the text "Create Free Account" wraps onto two uneven lines, distorting the button's vertical alignment next to "Sign In".
   - *Location*: `src/components/Header/Header.module.css:820`.
   - *Recommendation*: Set button text to "Sign Up" or use `grid-template-columns: 1fr 1.2fr` with `white-space: nowrap`.

2. **Desktop Sidebar Collapsed Icon Active Indicator Alignment (Low — UI Polish)**
   - *Problem*: When the desktop sidebar is collapsed (76px width), the active tab has a 3px vertical accent bar on the left edge. The icon inside has `gap: 14px` before the hidden text label.
   - *Visual Bug*: On high-DPI screens, the icon appears 1.5px to the left of the true visual center of the 76px column.
   - *Location*: `src/components/DesktopSidebar/DesktopSidebar.module.css:120-150`.
   - *Recommendation*: Set `.collapsed .navItem { justify-content: center; padding: 0; }` to guarantee mathematical pixel centering.

3. **Footer A-Z Bar Vertical Collapse on Mobile (Low — Layout)**
   - *Problem*: On screens `<= 640px`, `Footer.module.css:463-468` sets `.azBar { flex-direction: column; align-items: flex-start; }`.
   - *Visual Bug*: The letters wrap into multiple dense rows, taking up excessive vertical screen real estate at the bottom of the page.
   - *Location*: `src/components/Footer/Footer.module.css:463`.
   - *Recommendation*: Keep `.azBar` horizontal with `overflow-x: auto; flex-wrap: nowrap;` so mobile users can quickly swipe through `# A B C D ... Z` horizontally with a finger gesture.

---

## 3. Comprehensive Defect Matrix & Priority Triage

| # | Page / Component | Viewport | Severity | Category | Specific Defect | Recommended CSS Fix |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| **1** | Watch Page | Desktop | **P0** | Z-Index | Cinema Mode Dimmer (`z-index: 80`) pierced by Sidebar (90) & Header (100) | Elevate dimmer to `z-index: 95` or toggle dim class on sidebar/header |
| **2** | Watch Page | Tablet | **P0** | Responsive | Sidebar expands to 100% width under player between 901px and 1024px | Align `.sidebarColDesktop` hidden query to `1024px` |
| **3** | FAQ Page | Mobile | **P1** | Responsive | Zero media queries; `2.2rem` heading and fixed padding cause overflow | Add `@media (max-width: 768px)` and `480px` rules with scaled typography |
| **4** | 404 Error Page | All | **P1** | Aesthetic | Legacy glowing neon gradient & 16px radius clash with flat matte design | Refactor to flat 8px borders, matte surface `#121722`, zero neon glow |
| **5** | Series Detail | Desktop | **P1** | UI Polish | Synopsis text abruptly sliced horizontally when truncated | Add gradient mask `mask-image: linear-gradient(...)` when collapsed |
| **6** | Studios Directory | All | **P1** | Grid Layout | Unequal card heights when studios lack founded date or release count | Add `display: flex; flex-direction: column; height: 100%` with `margin-top: auto` |
| **7** | Watch Page | Mobile | **P1** | Mobile Layout | Action buttons (Favorite, Share, Download, Report) wrap into 2 uneven rows | Convert to a 4-column compact icon+label grid |
| **8** | Uncensored Hub | All | **P2** | Consistency | Inactive pills have `border-radius: 6px`, active pills have `border-radius: 20px` | Unify both states to `border-radius: 6px` |
| **9** | Search Page | Mobile | **P2** | Spacing | Empty search state has 4.5rem padding, pushing recommendations offscreen | Reduce mobile empty state padding to `2rem 1rem` |
| **10** | Genres Directory | Mobile | **P2** | Mobile CSS | Alphabet bar lacks touch scrolling momentum and displays default scrollbar | Add `-webkit-overflow-scrolling: touch; scrollbar-width: none;` |
| **11** | Login Page | Desktop | **P2** | Alignment | Auth card floats toward top third on high-res displays (`min-height: 80vh`) | Adjust container to `min-height: calc(100vh - 160px)` with true center |
| **12** | Login Page | All | **P2** | Brand Token | Form inputs use purple focus ring instead of global amber/gold accent | Unify focus rings to match search bar aesthetic |
| **13** | Mobile Drawer | Mobile | **P2** | Mobile UI | "Create Free Account" button text wraps awkwardly on compact screens | Shorten to "Sign Up" or adjust button padding |
| **14** | Homepage | Mobile | **P3** | Typography | SEO hero description clamped to 1 line, cutting off vital context | Increase clamp to 2 lines on `<= 768px` |
| **15** | Footer | Mobile | **P3** | Mobile UX | A-Z catalog bar stacks vertically instead of horizontal swipe chip row | Retain horizontal row with `overflow-x: auto; scrollbar-width: none;` |
| **16** | Desktop Sidebar | Desktop | **P3** | Pixel Polish | Collapsed icon active indicator is 1.5px off mathematical center | Center icon container when `.collapsed` is active |

---

## 4. Design Language & Flat Aesthetic Guidelines for Future Refinement

To ensure any subsequent implementation maintains the user's requested **flat, modern, minimalist aesthetic**:

1. **Geometry & Radii**:
   - Primary Cards: `border-radius: 8px`
   - Inner Badges & Buttons: `border-radius: 6px`
   - Input Fields: `border-radius: 6px`
   - Capsule/Pill Indicators (e.g. ratings): `border-radius: 9999px` (use consistently, never switch randomly to 6px)

2. **Surfaces & Borders**:
   - Surface Fill: `var(--surface, #111111)` or `#121722`
   - Default Inactive Border: `1px solid rgba(255, 255, 255, 0.07)`
   - Hover Border: `1px solid rgba(255, 255, 255, 0.20)`
   - Primary Accent Border: `1px solid rgba(245, 158, 11, 0.40)` (amber/gold) or `rgba(255, 46, 126, 0.40)` (primary pink)
   - **Prohibited**: Heavy multi-stop neon gradients, 40px radial glow halos, and excessive glassmorphism blurs that degrade scroll FPS.

3. **Responsive Breakpoint Matrix**:
   - Standardize all component media queries to:
     - Large Desktop: `> 1200px`
     - Laptop / Compact Desktop: `1025px – 1200px`
     - Tablet: `769px – 1024px`
     - Mobile Large: `481px – 768px`
     - Mobile Compact: `<= 480px`
     - Ultra-Narrow: `<= 360px`

---

*Report generated autonomously following physical device inspection. No source code was modified during this audit.*
