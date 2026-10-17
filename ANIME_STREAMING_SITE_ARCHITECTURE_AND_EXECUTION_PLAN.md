# 🎬 AniWave-Style Anime Streaming Platform
## Comprehensive Architecture, Infrastructure & Execution Masterplan

> **Purpose of this Document**:  
> This file is a self-contained, production-ready blueprint. You can feed this entire document into a new chat or project workspace to build the complete anime streaming platform from scratch, step-by-step.

---

## 1. Executive Summary & Infrastructure Architecture

### Can you use your current setup?
**YES! In fact, your setup is the ideal, enterprise-grade architecture for an anime platform:**

```
               [ User Browser / Mobile Device ]
                               │
               ┌───────────────┴───────────────┐
               │                               │
         (HTML / SSR / APIs)             (Video Stream & Images)
               │                               │
               ▼                               ▼
       [ Cloudflare DNS ]               [ Cloudflare R2 ]
               │                          (Zero-Egress Video CDN)
               ▼                               │
     [ Google Cloud Run ] ◄───────┐            │
    (Next.js 15 Standalone)       │            │
               │                  │            │
     (Server-Side SSR Query)      │ (Presign)  │
               │                  │            │
               ▼                  │            │
     [ Supabase PostgreSQL ] ─────┘────────────┘
```

### Why this setup is unbeatable:
1. **Google Cloud Run (Hosting Next.js)**:
   * **Serverless & Scalable**: Scales from 0 instances when idle to hundreds of instances during traffic spikes.
   * **Pay-per-use**: You only pay for CPU/memory when users request pages.
   * **Full SSR & Edge SEO**: Search engine bots get pre-rendered HTML with full meta tags.
2. **Cloudflare R2 (Video & Media Storage)**:
   * **$0.00 Egress Bandwidth Fees**: While AWS S3 and Google Cloud Storage charge $0.08–$0.12/GB (which would cost $10,000+/mo for streaming), **Cloudflare R2 charges $0 for egress**. You only pay ~$0.015/GB/month for disk storage.
   * **Global Edge CDN**: Videos and WebP thumbnails are cached at Cloudflare edge locations worldwide for near-instant playback.
3. **Supabase PostgreSQL (Database)**:
   * Accessed **strictly on the server side** via Next.js Cloud Run container. Client browsers never touch Supabase credentials directly.
   * Relational joins for series, seasons, episodes, genres, watch progress, and view counts.

---

## 2. Tech Stack Specification

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router, React 19, TypeScript)** | Best-in-class SEO, dynamic server-side rendering, streaming SSR. |
| **Styling** | **Tailwind CSS + Vanilla CSS Modules** | Ultra-clean dark theme, high performance, zero runtime overhead. |
| **Video Player** | **Artplayer.js + HLS.js** (or **Vidstack**) | Native custom controls, speed adjustment, subtitle selector, keyboard shortcuts, theater mode, auto-next episode. |
| **Database** | **Supabase (PostgreSQL 16)** | ACID compliance, fast indexed queries, full-text search. |
| **ORM / Client** | **Supabase JS Client + Server Components** | Direct SQL / PostgREST queries with typed models. |
| **Storage & CDN** | **Cloudflare R2** with Custom Domain | Zero egress fees, high-speed streaming. |
| **Icons** | **Lucide React** | Lightweight, modern icon set. |
| **Deployment** | **Docker Standalone on Google Cloud Run** (or **Coolify**) | Reproducible container builds with minimal memory footprint. |

---

## 3. UI/UX Design & Page Layouts (Modeled on AniWave)

### 🎨 Global Theme Palette
* **Background Primary**: `#0b0c10` (Deep obsidian dark)
* **Background Secondary / Cards**: `#12151f` / `#161926`
* **Accent / Brand**: `#7c3aed` (Purple) & `#6366f1` (Indigo gradient)
* **Highlight Badges**: `#10b981` (Emerald Sub/Dub), `#f59e0b` (Amber rating)
* **Text**: Primary `#f8fafc`, Secondary `#94a3b8`, Muted `#64748b`

---

### Page 1: Homepage (`/`)
The homepage is flat, ultra-fast, and focused on driving users directly to playback:

1. **Header Bar**:
   * **Left**: Hamburger menu button (opens slide-out drawer) + **AniWave** brand logo.
   * **Center**: Search input with keyboard shortcut (`/`) + Quick Access dropdown + **Random Anime** button.
   * **Right**: Sub/Dub language toggle (`EN | JP`) + Profile/Sign In button.
2. **Slide-Out Navigation Drawer** (from Left):
   * Navigation links: `HOME`, `GENRE`, `TYPES (TV, Movie, OVA, Special)`, `NEWEST`, `UPDATED`, `ONGOING`, `ADDED`, `REQUEST`.
3. **Hero Featured Slider**:
   * Full-width backdrop banner art with dark left-gradient fade.
   * Large Anime Title (e.g., *Mushoku Tensei: Jobless Reincarnation*).
   * Quality & Sub/Dub badges: `[R]`, `[HD]`, `[CC 1]`, `[TV]`.
   * 2-line synopsis teaser.
   * Prominent **`▶ PLAY NOW`** button (deep purple gradient) linking to Episode 1.
   * Bottom indicator dots for carousel switching.
4. **Two-Column Main Content Section**:
   * **Left Column (70% width) — Latest Episode Releases**:
     * Filter tab bar: `All` | `Sub` | `Dub` | `Chinese` | `Trending` | `Random`.
     * Grid of Episode Cards (16:9 thumbnails or 2:3 vertical posters).
     * Card Badges:
       * Bottom-left: Subtitles icon `[CC 26]`, Mic icon `[🎙️ 25]`.
       * Bottom-right: Format `[TV]` / `[ONA]`.
       * Title below card with 2-line clamp.
     * Numbered pagination bar at the bottom.
   * **Right Column (30% width) — "Top Anime" Ranking Widget**:
     * Timeframe filter pills: `Day` | `Week` | `Month`.
     * Numbered list (Rank 1 to 10):
       * Large bold gradient rank number (`1`, `2`, `3`).
       * Mini poster thumbnail (`48×68px`).
       * Title, episode count badge, format badge (`TV` / `Movie`).

---

### Page 2: Anime Details Page (`/anime/[slug]`)
1. **Hero Header**:
   * Blurred cinematic backdrop banner.
   * High-res poster image (2:3 aspect ratio) with "Add to Watchlist" button.
   * Metadata Grid: Japanese Title, Type, Studio, Released, Status, Duration, Quality, Rating.
   * Genres list as clickable pills (e.g. `Action`, `Fantasy`, `Isekai`).
   * Expandable full synopsis.
2. **Season & Episode Selector**:
   * Season tabs (`Season 1`, `Season 2`, `OVAs`).
   * Quick episode range search/filter (e.g. `1-50`, `51-100`).
   * Grid of Episode Buttons:
     * Card style with mini thumbnail, episode number, and episode title.
     * Displays progress bar if user has previously watched part of the episode.

---

### Page 3: Episode Watch Page (`/watch/[anime-slug]/[episode-slug]`)
1. **Cinema Video Player**:
   * Integrated **Artplayer** or **Vidstack** player.
   * Streamed directly from Cloudflare R2 via HLS (`.m3u8`) or progressive WebM/MP4.
   * Features:
     * Custom play/pause, seekbar with thumbnail scrubber.
     * Speed control (`0.5x`, `1x`, `1.25x`, `1.5x`, `2x`).
     * Quality selector (`1080p`, `720p`, `480p`, `Auto`).
     * Subtitle track switcher (`English`, `Spanish`, `Off`).
     * Theater Mode & Fullscreen toggles.
     * **Auto-Play Next Episode** toggle.
     * Keyboard shortcuts: Space (play/pause), Left/Right (seek 5s), F (fullscreen), M (mute).
2. **Player Action Bar**:
   * **Previous Episode** / **Next Episode** buttons.
   * Server Switcher (`Server 1 [R2 HD]`, `Server 2 [Backup]`).
   * Light/Dark lights toggle.
3. **Episode Navigator Drawer / Side List**:
   * Side-panel showing all episodes in the current season with active episode highlighted.
4. **Anime Information & Comments / Discussion Section**:
   * Quick synopsis, parent series link.

---

### Page 4: Catalog & Filter Page (`/filter` / `/genre/[slug]`)
* Advanced multi-select filter:
  * By Genre (Action, Comedy, Romance, etc.)
  * By Format (TV, Movie, OVA, Special)
  * By Status (Completed, Ongoing)
  * By Year / Season (Winter 2026, Fall 2025, etc.)
  * Sort By: `Most Popular`, `Latest Update`, `Recently Added`, `Top Rated`.

---

## 4. Database Schema (Supabase / PostgreSQL)

Run this SQL migration in your Supabase project:

```sql
-- 1. Anime Series Table
CREATE TABLE anime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    japanese_title VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    synopsis TEXT,
    poster_key TEXT,            -- Stored in Cloudflare R2
    banner_key TEXT,            -- Stored in Cloudflare R2
    format VARCHAR(30) DEFAULT 'TV', -- 'TV', 'Movie', 'OVA', 'ONA', 'Special'
    status VARCHAR(30) DEFAULT 'Ongoing', -- 'Ongoing', 'Completed', 'Upcoming'
    release_year INTEGER,
    rating VARCHAR(20) DEFAULT 'PG-13',
    duration_minutes INTEGER,
    views_day INTEGER DEFAULT 0,
    views_week INTEGER DEFAULT 0,
    views_month INTEGER DEFAULT 0,
    views_total INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seasons Table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Episodes Table
CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_key TEXT NOT NULL,         -- Cloudflare R2 video path
    thumbnail_key TEXT,              -- Cloudflare R2 WebP thumbnail path
    duration_seconds INTEGER DEFAULT 1440,
    has_sub BOOLEAN DEFAULT true,
    has_dub BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    release_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Genres & Junction Table
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE anime_genres (
    anime_id UUID REFERENCES anime(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, genre_id)
);

-- 5. Performance Indexes
CREATE INDEX idx_anime_slug ON anime(slug);
CREATE INDEX idx_anime_views_day ON anime(views_day DESC);
CREATE INDEX idx_anime_views_week ON anime(views_week DESC);
CREATE INDEX idx_anime_views_month ON anime(views_month DESC);
CREATE INDEX idx_episodes_season ON episodes(season_id, episode_number ASC);
CREATE INDEX idx_episodes_release_date ON episodes(release_date DESC);
```

---

## 5. Cloudflare R2 Storage & Streaming Setup

### R2 Bucket Structure
```
r2-bucket/
  ├── videos/
  │    ├── {anime-slug}/
  │    │    ├── ep-1.mp4 (or /ep-1/master.m3u8)
  │    │    └── ep-2.mp4
  ├── thumbnails/
  │    └── thumb-{id}.webp
  └── covers/
       ├── poster-{id}.webp
       └── banner-{id}.webp
```

### URL Helper Utility (`src/utils/r2.ts`)
```typescript
const R2_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_R2_DOMAIN || 'https://media.yourdomain.com';

export function getR2MediaUrl(key: string | null | undefined): string {
  if (!key) return '/placeholder.webp';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `${R2_PUBLIC_DOMAIN}/${cleanKey}`;
}
```

---

## 6. Production Deployment Setup

### 1. `next.config.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Essential for Google Cloud Run / Docker
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.yourdomain.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
```

### 2. Production `Dockerfile` for Google Cloud Run
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Stage 3: Runner (Ultra lightweight)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
```

### 3. Google Cloud Run Deploy Command
```bash
# Build & deploy container directly to Cloud Run
gcloud run deploy anime-stream-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 20
```

---

## 7. Step-by-Step Implementation Roadmap

When you start the new project in a fresh chat, follow these prompt phases:

### Phase 1: Foundation & Project Init
* Initialize Next.js 15 with App Router, TypeScript, and Tailwind CSS.
* Set up global dark theme variables matching AniWave colors (`#0b0c10`).
* Configure Supabase server client and R2 media URL utility.

### Phase 2: Navigation & AniWave Layout
* Build the responsive Header (Logo, search bar with debounce, quick access, language switch).
* Build the slide-out Mobile Drawer with navigation links (`HOME`, `GENRE`, `TYPES`, etc.).
* Build the Footer.

### Phase 3: Homepage Implementation
* Build the Featured Hero Slider with auto-play, badges, and Play button.
* Build the "Top Anime" ranking widget with `Day`, `Week`, `Month` tabs.
* Build the "Latest Episode" grid with filter pills and pagination.

### Phase 4: Anime Details & Watch Page
* Build `/anime/[slug]` with banner, metadata, and episode selector tabs.
* Build `/watch/[anime-slug]/[episode-slug]` with the Artplayer/HLS.js player, episode navigator drawer, and auto-next functionality.

### Phase 5: Search & Catalog Filtering
* Build debounced instant search popup in the header.
* Build `/filter` page with genre, format, and status query filters.
* Add automated sitemap generator (`sitemap.xml`) for all series and episodes.

---

## 8. Summary Checklist Before Launch

- [ ] Cloudflare R2 bucket created with custom subdomain linked (e.g. `media.yourdomain.com`).
- [ ] CORS rule configured in Cloudflare R2 to allow video streaming from your web domain.
- [ ] Supabase database schema created with the SQL tables above.
- [ ] Dockerfile built and deployed to Google Cloud Run (or Coolify).
- [ ] Domain mapped with Cloudflare proxy enabled.
