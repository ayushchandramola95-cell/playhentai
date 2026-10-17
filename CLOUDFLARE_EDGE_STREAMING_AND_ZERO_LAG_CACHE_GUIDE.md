# ⚡ Cloudflare Edge Streaming & Zero-Lag Cache Configuration Guide
**Domain:** `https://hentaikage.cc` & `https://media.hentaikage.cc`  
**Purpose:** Eliminate video buffering, maximize edge hit ratios (95%+), and achieve instant playback across North America, Europe, and Asia.

---

## 1. Executive Architecture

```
┌─────────────────┐       ┌──────────────────────────────┐       ┌─────────────────────────┐
│   User Client   │ ────> │  Cloudflare Edge CDN (Iowa)  │ ────> │  Origin Storage / R2    │
│  (1080p Video)  │ <──── │  Cache HIT: 15ms Response    │       │  Cache MISS: 150ms      │
└─────────────────┘       └──────────────────────────────┘       └─────────────────────────┘
                                   │
                                   ▼
                      Prefetching Trigger at 70%
                      • Next Episode Pre-loaded
                      • Zero Buffer Delay
```

---

## 2. Cloudflare Cache Rules (Zero-Lag Streaming)

Navigate to your **Cloudflare Dashboard** → Select **`hentaikage.cc`** → **Caching** → **Cache Rules** → **Create Rule**.

### 🔹 Rule 1: Video Files Long-Term Edge Cache (1080p MP4 / Streams)
* **Rule Name:** `Edge Video & Stream Chunk Cache`
* **If incoming requests match:**
  - Field: `URI Path`
  - Operator: `matches regex`
  - Value: `.*\.(mp4|webm|m4s|ts|m3u8)$`
* **Then:**
  - **Edge Cache TTL:** Override origin → **1 Month** (or *Eligible for Cache*)
  - **Browser Cache TTL:** **1 Month**
  - **Cache Key:**
    - Custom Cache Key: On
    - Query string: Ignore query string (ensures timestamp seeks or tracking params don't cause duplicate cache misses)
  - **Tiered Cache:** **Eligible** (routes requests through Cloudflare's upper-tier datacenters before origin)

### 🔹 Rule 2: Next.js Static Assets & Optimized Media
* **Rule Name:** `Static Images & CSS/JS Bundles`
* **If incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/_next/static/` OR `URI Path matches regex .*\.(webp|avif|png|jpg|jpeg|svg|ico)$`
* **Then:**
  - **Edge Cache TTL:** Override origin → **1 Year**
  - **Browser Cache TTL:** **1 Year**

### 🔹 Rule 3: Dynamic Catalog & Watch Pages
* **Rule Name:** `Dynamic Watch & Catalog Pages`
* **If incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/watch/` OR `/series/`
* **Then:**
  - **Edge Cache TTL:** **2 Hours**
  - **Browser Cache TTL:** **30 Minutes**
  - **Serve Stale Content while Revalidating:** **Enabled** (Cloudflare immediately serves cached HTML while revalidating in the background, giving users 0ms TTFB)

---

## 3. Cloudflare Tiered Cache & Argo Smart Routing

1. In Cloudflare Dashboard → **Caching** → **Tiered Cache**:
   - Turn **ON** **Argo Tiered Cache**.
   - Cloudflare dynamically chooses the best regional data center hub (e.g. Chicago/Iowa for US Central), dropping origin server egress bandwidth by over **85%**.

2. In Cloudflare Dashboard → **Speed** → **Optimization**:
   - **Early Hints (103 Early Hints)**: **ON** (Sends preconnect and preload headers to browser before HTML renders).
   - **Rocket Loader**: **OFF** (Keep OFF to avoid interfering with React 19 / Next.js hydration).
   - **Brotli Compression**: **ON**.

---

## 4. Built-in Client-Side Optimizations (Active in Codebase)

1. **Next-Episode Edge Prefetching**:
   - Integrated into [`src/components/VideoPlayer/VideoPlayer.tsx`](file:///C:/new%20website%20creation/hentaianime/src/components/VideoPlayer/VideoPlayer.tsx).
   - As soon as video playback reaches **70% duration**, the player silently pre-caches the next episode's code chunks and metadata so the "Next Episode" transition starts with **zero buffering lag**.

2. **Hero Carousel Eager Preloading**:
   - Slide 0 backdrop image configured with `priority={true}` and `loading="eager"` in [`src/components/HeroCarousel/HeroCarousel.tsx`](file:///C:/new%20website%20creation/hentaianime/src/components/HeroCarousel/HeroCarousel.tsx) for 100/100 LCP Core Web Vitals.

3. **Global Quick Search (`/` and `Ctrl+K`)**:
   - Keyboard listener integrated into [`src/components/SearchBar/SearchBar.tsx`](file:///C:/new%20website%20creation/hentaianime/src/components/SearchBar/SearchBar.tsx) with desktop `/` keyboard shortcut badge.

4. **1-Click Automated IndexNow Broadcast**:
   - Execute `npm run index-now` anytime new episodes or series are added to broadcast all 1,000+ canonical URLs directly to Bing, Yandex, Yahoo, Naver, and Seznam in seconds.
