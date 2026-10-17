# 🌟 Next-Gen Anime Database & Streaming Discovery Platform
## Architectural Blueprint, Competitor Teardown & 1-Click Automated Ingestion Plan

> **Project Vision**:  
> Build the internet's cleanest, fastest, and most visually stunning anime database and legal streaming guide. A platform that takes the best elements of **MyAnimeList** (depth of database), **AniList** (modern aesthetics), **LiveChart.me** (airing countdowns), and **JustWatch** (where to watch affiliate links) — while eliminating the clutter, slow speeds, and ugly ads that ruin those sites.

---

## 1. Competitor Teardown: How We Will Make a Far Better Version

| Feature | MyAnimeList (MAL) | AniList | LiveChart.me | **Our Next-Gen Platform** 🚀 |
| :--- | :--- | :--- | :--- | :--- |
| **Design & Aesthetic** | ❌ Dated 2008 Web 1.0; cluttered text tables | ⚠️ Clean but flat and minimalist | ❌ Basic grid without visual flair | ✅ **Sleek AniWave Cyber-Dark Theme**: Glassmorphism, glowing badges, full-width cinematic hero banners. |
| **Speed & Performance** | ❌ Very slow (heavy ad bloat, 5s+ load times) | ⚠️ Decent single-page app | ⚠️ Medium | ✅ **Sub-100ms Edge SSR**: Next.js 15, instant server rendering, 100/100 Google PageSpeed score. |
| **Official Trailers** | ⚠️ Hidden in tabs, poor player | ⚠️ Basic link | ⚠️ Small thumb | ✅ **1-Click 1080p YouTube Modal**: Instant cinematic trailer player right on hover or click. |
| **"Where to Watch" & Affiliates** | ❌ Inconsistent and cluttered | ❌ No dedicated streaming hub | ⚠️ Simple text links | ✅ **Integrated Multi-Platform Streaming Hub**: Direct affiliate buttons for Crunchyroll, Netflix, Hulu, Prime + VPN Unblocker callouts ($40+ CPA). |
| **Cast & Voice Actors** | ⚠️ Cluttered table | ⚠️ Simple list | ❌ Missing | ✅ **Interactive Seiyuu Visualizer**: Character cards paired with Japanese voice actor photos and other famous roles. |
| **Airing Countdown** | ❌ Not available | ⚠️ Hidden | ⚠️ Good text schedule | ✅ **Live Real-Time Countdown Ticker**: Visual cards showing *"Episode 4 drops in 2h 15m"*. |
| **Legal Status** | ✅ 100% Legal | ✅ 100% Legal | ✅ 100% Legal | ✅ **100% Legal & Safe**: Zero piracy, zero DMCA risks, clean corporate ad monetization. |

---

## 2. ⚡ The 1-Click Automated Ingestion Engine (AniList GraphQL API)

You do **not** need to manually type thousands of anime, characters, and synopses. 

By leveraging the free, open **AniList GraphQL API** (`https://graphql.anilist.co`), you can fetch **thousands of anime complete with characters, studios, synopses, YouTube trailer IDs, and official streaming links in automated batches**!

### The Automated Sync Query
With just one GraphQL query, AniList returns up to 50 anime per page with all required metadata:

```graphql
query GetBulkAnime($page: Int, $perPage: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      hasNextPage
      currentPage
    }
    media(type: ANIME, sort: $sort) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description(asHtml: false)
      format
      status
      episodes
      duration
      season
      seasonYear
      averageScore
      popularity
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      genres
      studios(isMain: true) {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      trailer {
        id
        site
      }
      streamingEpisodes {
        title
        url
        site
      }
      characters(perPage: 8, sort: ROLE) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
          voiceActors(language: JAPANESE) {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
  }
}
```

### Ingestion Throughput:
* AniList allows **90 requests per minute**.
* At 50 anime per request, you can import **4,500 complete anime in just 60 seconds**!
* In your admin dashboard, you can click **`[⚡ Sync Top 1,000 Anime]`** or **`[⚡ Sync Seasonal Releases]`**, and an automated route handler (`/api/admin/sync-anilist`) writes directly to Supabase.

---

## 3. Technology Stack & Infrastructure

```
                  [ Web & Mobile Visitors ]
                             │
                             ▼
                    [ Cloudflare DNS & CDN ]
                             │
                             ▼
                  [ Google Cloud Run / Coolify ]
             (Next.js 15 Standalone Serverless Container)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Supabase PostgreSQL ]        [ AniList & Jikan APIs ]
   (Relational DB & Search)     (Automated 1-Click Sync Engine)
            │
            ▼
 [ Official YouTube Player ] ───► [ Streaming Affiliates ]
   (100% Legal Embeds)           (Crunchyroll, Netflix, VPN)
```

| Component | Choice | Why |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router, React 19, TypeScript)** | Dynamic SSR, ISR (Incremental Static Regeneration), and unmatched SEO capabilities. |
| **Styling** | **Tailwind CSS + Lucide Icons** | Ultra-responsive, dark cyber-aesthetic with rapid prototyping. |
| **Database** | **Supabase (PostgreSQL 16)** | Complex relational joins between Anime, Characters, Studios, and Episodes. |
| **Hosting** | **Google Cloud Run** | Scalable container hosting, pay only when pages are requested ($0-$5/mo for high traffic). |
| **Video Engine** | **YouTube Iframe API** | Embed official 1080p anime trailers with zero bandwidth and zero storage costs. |

---

## 4. Complete Database Schema (Supabase PostgreSQL)

Execute this complete schema in your Supabase SQL editor:

```sql
-- 1. Anime Core Table
CREATE TABLE anime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anilist_id INTEGER UNIQUE,
    mal_id INTEGER,
    title_english VARCHAR(255),
    title_romaji VARCHAR(255) NOT NULL,
    title_native VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    synopsis TEXT,
    format VARCHAR(30) DEFAULT 'TV', -- 'TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'
    status VARCHAR(30) DEFAULT 'FINISHED', -- 'FINISHED', 'RELEASING', 'NOT_YET_RELEASED'
    season VARCHAR(20),             -- 'WINTER', 'SPRING', 'SUMMER', 'FALL'
    season_year INTEGER,
    episodes_count INTEGER,
    episode_duration INTEGER,
    score NUMERIC(3, 1),            -- e.g. 8.9
    popularity INTEGER,
    cover_image_url TEXT,
    banner_image_url TEXT,
    accent_color VARCHAR(10),       -- Hex color from AniList for dynamic styling
    youtube_trailer_id VARCHAR(50), -- Official YouTube trailer key
    next_airing_episode INTEGER,
    next_airing_at TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Studios Table
CREATE TABLE studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anilist_id INTEGER UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_animation_studio BOOLEAN DEFAULT true
);

-- Anime <-> Studio Junction
CREATE TABLE anime_studios (
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, studio_id)
);

-- 3. Genres Table
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- Anime <-> Genre Junction
CREATE TABLE anime_genres (
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, genre_id)
);

-- 4. Characters & Voice Actors (Seiyuu)
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anilist_id INTEGER UNIQUE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT
);

CREATE TABLE voice_actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anilist_id INTEGER UNIQUE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    language VARCHAR(50) DEFAULT 'Japanese'
);

CREATE TABLE anime_characters (
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    voice_actor_id UUID REFERENCES voice_actors(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'MAIN', -- 'MAIN', 'SUPPORTING'
    PRIMARY KEY (anime_id, character_id)
);

-- 5. Streaming Links (Where to Watch & Affiliates)
CREATE TABLE streaming_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    platform_name VARCHAR(100) NOT NULL, -- 'Crunchyroll', 'Netflix', 'Hulu', 'Amazon Prime'
    target_url TEXT NOT NULL,            -- Base URL or affiliate link
    region VARCHAR(10) DEFAULT 'US',
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Performance Indexes
CREATE INDEX idx_anime_slug ON anime(slug);
CREATE INDEX idx_anime_score ON anime(score DESC NULLS LAST);
CREATE INDEX idx_anime_popularity ON anime(popularity DESC NULLS LAST);
CREATE INDEX idx_anime_season ON anime(season_year DESC, season);
CREATE INDEX idx_anime_airing ON anime(next_airing_at ASC) WHERE next_airing_at IS NOT NULL;
```

---

## 5. Monetization & Affiliate Engine

### 1. The "Where to Watch" Box (High-Intent Conversion)
On every anime page, place a prominent, high-converting streaming widget:

```
┌─────────────────────────────────────────────────────────────┐
│ 📺 WHERE TO WATCH [ANIME TITLE] OFFICIALLY                  │
├─────────────────────────────────────────────────────────────┤
│  [🟧 Crunchyroll]  HD • Sub / Dub • Watch with Free Trial    │
│  [🟥 Netflix]      HD • 4K • Stream Now                     │
│  [🟩 Hulu]         TV Episodes • Watch Now                  │
│                                                             │
│  🌍 Blocked in your region?                                 │
│  👉 [Unblock all regions with NordVPN] (70% Off + 3 Mo Free)│
└─────────────────────────────────────────────────────────────┘
```

* **Crunchyroll Affiliate**: Earn $3 to $8 per free trial signup via Impact/Rakuten.
* **VPN Affiliates**: Earn **$35 to $50 per sale** from users wanting to unlock Japanese/US catalogs.
* **Amazon Associates**: Earn commissions on Manga volumes, Blu-ray boxsets, and scale figures linked under a *"Merchandise & Original Manga"* tab.
* **Google AdSense / Mediavine**: 100% legal, clean banner placements that earn premium corporate ad rates without risk of bans.

---

## 6. Page Architecture & Design Breakdown

### 1. Homepage (`/`)
* **Hero Spotlight Banner**:
  * Autoplaying muted official YouTube trailer in the background.
  * Big bold title, score badge (e.g. `★ 9.1`), studio pill (`ufotable`), synopsis.
  * Buttons: `▶ Watch Trailer` and `ℹ View Details & Streaming Links`.
* **"Airing Today" Live Ticker**:
  * Real-time countdown cards showing exactly when today's episodes drop in Japan and globally.
* **Seasonal Top Charts**:
  * Tabs for `Winter 2026`, `Trending Now`, `All-Time Greatest`.
* **Studio Showcases**:
  * Carousels highlighting legendary studios: *MAPPA*, *Kyoto Animation*, *Madhouse*, *Bones*.

### 2. Anime Detail Page (`/anime/[slug]`)
* **Cinematic Header**:
  * Backdrop banner with dynamic accent color lighting (pulled from AniList's `accent_color`).
  * Big high-res poster with bookmarking and rating controls.
* **Trailer Cinema Modal**:
  * Floating 1080p YouTube player modal with high-fidelity audio.
* **Where to Watch Streaming Grid**:
  * Direct affiliate buttons with platform logos.
* **Cast & Seiyuu Gallery**:
  * Two-column cards: Character portrait on left, Japanese Voice Actor portrait on right, with full names.
* **Episodes & Airing Guide**:
  * Air dates, episode titles, and countdown for upcoming releases.

### 3. Seasonal Schedule Calendar (`/schedule`)
* Clean day-by-day weekly tabs: `Monday` | `Tuesday` | `Wednesday` | `Thursday` | `Friday` | `Saturday` | `Sunday`.
* Shows exact air times adjusted to the user's local timezone.

---

## 7. Step-by-Step Prompt Roadmap for Your New Project

When you open a new chat to build this project, copy and paste these exact phased prompts:

### Phase 1: Setup & Database Connect
> "Let's create a Next.js 15 anime database and streaming discovery platform with TypeScript and Tailwind CSS. First, configure the Supabase PostgreSQL database client using the schema from our masterplan, set up the AniWave cyber-dark color tokens (`#0b0c10`), and build the global layout with header and navigation."

### Phase 2: 1-Click AniList Ingestion Route
> "Create an API route `/api/admin/sync-anilist` that executes the AniList GraphQL query to batch-import seasonal anime, top-ranked anime, characters, voice actors, studios, and YouTube trailer IDs directly into our Supabase database. Add an admin button to trigger this with 1 click."

### Phase 3: Homepage with Hero Trailer & Airing Countdown
> "Build the homepage (`/`) featuring a full-width cinematic hero spotlight with YouTube trailer embed, an 'Airing Today' live countdown ticker, and a 'Top 10 Trending Anime' ranking widget with Day/Week/Month tabs."

### Phase 4: Anime Detail Page & 'Where to Watch' Affiliate Box
> "Build the dynamic anime details page at `/anime/[slug]` with cinematic backdrop, full metadata, 1080p YouTube trailer modal, interactive Character & Voice Actor gallery, and the 'Where to Watch' streaming affiliate box."

### Phase 5: Seasonal Schedule & Search
> "Build the weekly airing calendar at `/schedule` with local timezone conversion, and add a live debounced search bar in the header that queries anime titles with instant autocomplete results."
