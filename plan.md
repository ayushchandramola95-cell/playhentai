# Project Plan: Video Streaming Site

This document outlines the architecture, database schema, pages, SEO configuration, and phased implementation timeline for our video streaming site.

---

## 1. Project Implementation Phases

We will execute the development of this site in six highly-structured phases:

### Phase 1: Welcome Page & Next.js Setup (Port 3004) [COMPLETE]
*   Initialize the Next.js (App Router) project in the root workspace.
*   Configure the dev server startup options in `package.json` to run on `next dev -p 3004`.
*   Install package dependencies (`next-themes`, `lucide-react`).
*   Create global CSS variables for the dark/light theme systems.
*   Develop a **premium, highly-polished Welcome Landing Page** at the root `/` URL.

### Phase 2: Database & Authentication Setup (Supabase)
*   Create PostgreSQL database tables in Supabase (`profiles`, `series`, `categories`, `series_categories`, `seasons`, `episodes`, `watch_history`, `watchlist`, `episode_views`).
*   Apply the `UNIQUE(profile_id, episode_id)` constraint on `watch_history` to prevent duplicate tracking records.
*   Define SQL indexes for performance (including Full-Text GIN indexes on `series.title`, `series.description`, and `series.tags`).
*   Configure Row Level Security (RLS) policies on Supabase to protect user-specific tables.
*   Configure credentials email/password authentication using the Supabase Auth JS SDK inside Next.js.

### Phase 3: Core Layouts & Theme Management
*   Develop global navigation Header, Footer, and Page Shell layouts, including a global Search Bar.
*   Configure the `next-themes` theme provider context wrapper.
*   Establish the Cloudflare R2 resolver utility (`src/utils/r2.ts`) that transforms R2 keys into full CDN/temporary URLs dynamically.
*   Set up global client-side context wrappers for Supabase sessions.

### Phase 4: Public Views & Video Player
*   **Homepage (`/`)**: Transition the welcome page into our full homepage: featured banner carousel, "Continue Watching", "Trending Now", and "Recent Releases".
*   **Search Page (`/search`)**: Dedicated results display mapping titles matching searched strings with filters.
*   **Series Details Page (`/series/[slug]`)**: Display poster, banners, and tabbed season selectors (Season 1, Season 2, etc.) grouping episodes.
*   **Watch Page (`/watch/[episodeId]`)**:
    *   Build custom styled video player skin with Play/Pause, Seek slider, Volume, Speed, and Theater mode.
    *   Add sidebar list for selecting other episodes.
    *   Implement watch progress API route syncing status to `watch_history` every 10s.
*   **Browse/Category Page (`/categories/[genre]`)**: Grid layout listing and filtering published content.

### Phase 5: Admin Panel & CRUD Dashboards (`/admin`)
*   Secure all admin sub-routes via middleware checking if `profiles.role === 'admin'`.
*   Create CRUD dashboards to manage Series, Seasons, and Episodes (metadata, R2 assets, and publishing flags).

### Phase 6: SEO, Analytics & Optimization
*   Implement Next.js Dynamic Metadata API inside series and episode watch routes.
*   Configure structured SEO JSON-LD scripts (`Series` and `VideoObject`) on details and watch pages.
*   Generate automated `sitemap.xml` listing public series.
*   Perform full compile verification (`npm run build`) and lint verification.

---

## 2. Core Framework & Architecture
*   **Framework**: **Next.js (App Router)**
    *   *SEO Advantage*: Next.js compiles pages server-side (SSR) or statically (SSG), making them fully readable by search engine crawlers. It offers built-in metadata management and dynamic sitemaps.
*   **Styling**: **CSS Modules (Vanilla CSS)**
    *   Ensures scoped component styling, preventing name clashes while maintaining clean, vanilla CSS.
*   **Theme**: Light/Dark theme managed via **`next-themes`** package.
*   **Proxy / Server-Side Architecture**: To avoid potential client-side ISP blocks, all database reads are executed directly in **Server Components**, and all client-side writes or session validations are proxied through Next.js **Route Handlers** (API endpoints under `/api/*`) and server-side middleware.

---

## 3. Infrastructure & Hosting (Free Tier Stack)
*   **Web Hosting**: **Vercel** (Free Tier)
    *   Optimal for Next.js, with free automated SSL, custom domain support, and serverless API functions.
*   **Video Hosting**: **Cloudflare R2**
    *   Provides high-capacity object storage with **no bandwidth egress fees**, ensuring video streaming stays completely free.
*   **Database & Authentication**: **Supabase** (Free Tier PostgreSQL)
    *   Provides PostgreSQL storage, authentication engines, and built-in REST support, connected securely via serverless environment keys.

---

## 4. Database Schema (Optimized)

We will configure PostgreSQL tables in Supabase with the following definitions:

### profiles
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | References the Supabase `auth.users.id` |
| `username` | String | User nickname |
| `role` | String | Role for dashboard security (e.g. `'user'`, `'admin'`) |
| `updated_at` | Timestamp | Last profile edit time |

### series
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `title` | String | Title of the series |
| `slug` | String (Unique) | URL slug for clean routing (e.g. `/series/title-slug`) |
| `description`| Text | Plot summary / synopsis |
| `poster_image_key`| String | Portrait 2:3 image (grids, browse lists) |
| `cover_image_key`| String | Landscape 16:9 image (slider card, lists) |
| `banner_image_key`| String | Wide 21:9 image (detail page header background) |
| `tags` | String[] | Tag list for sorting/searching |
| `is_published`| Boolean | Public visibility status toggle |
| `created_at` | Timestamp | Date added |

### categories
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `name` | String | Name of category (e.g., "Drama", "Crime", "Action") |
| `slug` | String (Unique) | URL slug for routing (e.g. `/categories/drama`) |
| `created_at` | Timestamp | Date added |

### series_categories (Join Table)
| Field | Type | Description |
| :--- | :--- | :--- |
| `series_id` | UUID (PK, FK) | References `series.id` |
| `category_id` | UUID (PK, FK) | References `categories.id` |

### seasons
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `series_id` | UUID (FK) | Reference to `series.id` |
| `season_number`| Integer | Numeric identifier (e.g., 1, 2, 3) |
| `title` | String | Name of season (e.g., "Season 1", "Specials", "OVAs") |
| `is_published`| Boolean | Public visibility status toggle |
| `created_at` | Timestamp | Date added |

### episodes
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `season_id` | UUID (FK) | Reference to `seasons.id` |
| `episode_number`| Integer | Episode number (e.g., 1, 2, 3) |
| `title` | String | Episode title |
| `description`| Text | Short episode description |
| `video_key` | String | Cloudflare R2 object key of video file |
| `thumbnail_key`| String | Cloudflare R2 object key of preview image (16:9) |
| `duration_seconds`| Integer | Video length in seconds |
| `release_date`| Timestamp | Episode scheduled air/release date |
| `is_published`| Boolean | Public visibility status toggle |
| `created_at` | Timestamp | Date added |

### watch_history
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `profile_id` | UUID (FK) | Reference to `profiles.id` |
| `episode_id` | UUID (FK) | Reference to `episodes.id` |
| `last_position_seconds`| Integer | Last playback position in seconds |
| `watched_percentage`| Integer | Percentage watched (0-100) |
| `completed` | Boolean | True if user watched > 90% (removes from Continue Watching) |
| `updated_at` | Timestamp | Last updated time (auto-saved during watch) |
| *Constraint* | `UNIQUE(profile_id, episode_id)` | Prevents duplicate watch progress logs |

### watchlist
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `profile_id` | UUID (FK) | Reference to `profiles.id` |
| `series_id` | UUID (FK) | Reference to `series.id` |
| `created_at` | Timestamp | Date bookmarked |

### episode_views
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique ID |
| `episode_id` | UUID (FK) | Reference to `episodes.id` |
| `profile_id` | UUID (FK) | Reference to `profiles.id` (nullable for guest views) |
| `viewed_at` | Timestamp | Timestamp of view event |
