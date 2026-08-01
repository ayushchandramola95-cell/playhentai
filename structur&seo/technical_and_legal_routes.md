# 📜 Technical & Legal Routes Deep Architectural & SEO Audit (`structur&seo/technical_and_legal_routes.md`)

This document presents an exhaustive, 8-pillar structural, technical, data, SEO, and performance analysis of the **Technical & Legal Routes** (`/sitemap.ts`, `/robots.txt`, `/terms`, `/privacy`, `/faq`).

---

## Pillar 1: 📌 Page Overview & Routing Architecture

- **Route URL Patterns**:
  - XML Sitemap: `https://playhentai.live/sitemap.xml` (`src/app/sitemap.ts`).
  - Robots Directives: `https://playhentai.live/robots.txt` (`src/app/robots.ts`).
  - Terms of Service: `https://playhentai.live/terms` (`src/app/(public)/terms/page.tsx`).
  - Privacy Policy: `https://playhentai.live/privacy` (`src/app/(public)/privacy/page.tsx`).
  - FAQ Page: `https://playhentai.live/faq` (`src/app/(public)/faq/page.tsx`).
- **File System Locations**:
  - `src/app/sitemap.ts`
  - `src/app/robots.ts`
  - `src/app/(public)/terms/page.tsx` & `terms.module.css`
  - `src/app/(public)/privacy/page.tsx` & `privacy.module.css`
  - `src/app/(public)/faq/page.tsx` & `FAQClient.tsx`
- **Next.js App Router Rendering Strategy**:
  - **Metadata Routes**: `sitemap.ts` and `robots.ts` utilize Next.js built-in `MetadataRoute` features to dynamically generate XML and plain text responses for search engine bots.
  - **Static & Cached Server Components**: Legal and FAQ routes are pre-rendered Server Components with static metadata, OpenGraph tags, canonicals, and Schema.org JSON-LD scripts.

---

## Pillar 2: 🧩 Visual & UI Component Structure

### DOM & Section Hierarchy Tree:
```
RootLayout (src/app/layout.tsx)
 └── PublicLayout (src/app/(public)/layout.tsx)
      ├── Header (src/components/Header/Header.tsx)
      ├── <main> (Flex Column, paddingTop: 64px)
      │    ├── Legal Page Layout (TermsPage / PrivacyPage)
      │    │    ├── Back to Home Navigation Link (.backBtn) [Link to "/"]
      │    │    ├── Legal Header Section (.header) [<FileText>/<ShieldCheck> + <h1>Title</h1> + Subtitle]
      │    │    └── Glass Card Shell (.contentCard)
      │    │         ├── Section 1: Age Requirement (18+ Only) / Anonymous Browsing
      │    │         ├── Section 2: Acceptable Use & Account Rules / Account Data
      │    │         ├── Section 3: Content Disclaimer & DMCA Policy / Cookies
      │    │         ├── Section 4: Limitation of Liability / Security Infrastructure
      │    │         └── Footer Timestamp (.lastUpdated) ["Last Updated: July 2026"]
      │    └── FAQ Page Layout (FAQPage)
      │         ├── JsonLd (FAQPage + BreadcrumbList Schemas)
      │         └── FAQClient (Searchable accordion component)
      └── Footer (src/components/Footer/Footer.tsx)
```

---

## Pillar 3: ⚡ Data Fetching, Cache & State Architecture

### Sitemap Dynamic Data Fetching:
- Dynamically queries published `series` (slugs, release_year, created_at), `episodes` (joined with parent series slug), `collections` (playlists), distinct studio slugs, and distinct genre tags from Supabase.
- **Optimization Strategy**: Wrapped database queries in `unstable_cache` with a 3600-second (1 hour) TTL (`sitemap_urls` tag) and singleton `publicSupabaseClient` to eliminate database load on every crawler request.

---

## Pillar 4: 🔍 SEO & Search Engine Indexability Audit

### Search Intent & SEO Goal:
- Establish site trustworthiness, legal transparency, 18+ age verification compliance, DMCA takedown procedures, and complete search engine indexability for public URLs.

### Technical Crawlability & Indexability Matrix:
- **XML Sitemap Cleanliness Rule**:
  - *Requirement*: `sitemap.xml` MUST contain only 100% indexable public URLs. Private user account routes (`/watchlist`, `/history`, `/favorites`, `/settings`, `/login`) and internal search parameter routes (`/search`) carrying `noindex` directives MUST NOT be listed in `sitemap.xml`.
- **Robots Directives (`src/app/robots.ts`)**:
  - `allow: '/'`
  - `disallow: ['/admin/', '/api/', '/watchlist/', '/history/', '/favorites/', '/settings/']`
  - `sitemap: 'https://playhentai.live/sitemap.xml'`

### Dynamic Metadata & Title Inspection:
- **Terms of Service**: `title: 'Terms of Service | PlayHentai'`, `canonical: '/terms'`, `robots: index: true, follow: true`.
- **Privacy Policy**: `title: 'Privacy Policy | PlayHentai'`, `canonical: '/privacy'`, `robots: index: true, follow: true`.
- **FAQ Page**: `title: 'Frequently Asked Questions (FAQ) | PlayHentai'`, `canonical: '/faq'`, `robots: index: true, follow: true`.

### Semantic HTML & DOM H1 Verification:
- **Terms of Service `<h1>`**: `<h1>Terms of Service</h1>`
- **Privacy Policy `<h1>`**: `<h1>Privacy Policy</h1>`
- **FAQ Page `<h1>`**: `<h1>Frequently Asked Questions</h1>`
- **Result**: **Passed (100% Single H1 DOM)**.

### JSON-LD Structured Data Implementation:
- `/faq`: `FAQPage` (with 6 entity Question/Answer pairs) & `BreadcrumbList` (`Home` $\rightarrow$ `FAQ`).

---

## Pillar 5: ⚡ Performance & Core Web Vitals (CWV) Audit

- Fast, pre-rendered static legal pages.
- XML Sitemap queries cached for 3600 seconds (1 hour) via `unstable_cache`.

---

## Pillar 6: 💰 Monetization, Ads & Analytics

- Legal pages remain ad-free for maximum document readability.

---

## Pillar 7: ♿ Accessibility (a11y) & Mobile UX Hygiene

- Keyboard accessible accordion controls and high-contrast legal text styling.

---

## Pillar 8: 🛠️ Actionable Improvements & Execution Status

### 🚀 High-Priority SEO & Technical Improvements:
1. **Purge Non-Indexable Private Routes from `sitemap.ts`**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Removed `/watchlist`, `/history`, `/favorites`, `/settings`, `/login`, and `/search` from staticPages array in `src/app/sitemap.ts` to ensure 100% clean indexable XML sitemap delivery.
2. **Cache `sitemap.ts` Queries for 1 Hour (3600s TTL)**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Removed `revalidate = 0` / `export const dynamic = 'force-dynamic'` and configured `export const revalidate = 3600;` (1 hour TTL) in `src/app/sitemap.ts` to eliminate database load on every crawler hit.
3. **Enrich `robots.ts` Disallow Rules**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Added `/watchlist/`, `/history/`, `/favorites/`, `/settings/` to disallow list in `src/app/robots.ts`.
4. **Brand Suffix Alignment on Legal Metadata**:
   - **Status**: ✅ **COMPLETED**.
   - *Implementation*: Updated title metadata tags in `src/app/(public)/terms/page.tsx` (`Terms of Service | PlayHentai`) and `src/app/(public)/privacy/page.tsx` (`Privacy Policy | PlayHentai`).

