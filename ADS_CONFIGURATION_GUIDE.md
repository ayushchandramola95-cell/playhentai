# 📢 PlayHentai Ad Monetization & Zone Configuration Guide

This guide documents the active ad zones, placement architecture, site verification details, and future expansion guides for **`https://playhentai.live`**.

---

## 🔐 1. Site Verification Meta Tag
To verify domain ownership on adult ad networks (ExoClick, JuicyAds, TrafficJunky, etc.), the verification tag is injected in `src/app/layout.tsx`:

```html
<meta name="6a97888e-site-verification" content="ae5b610b0f4d1db35865d663bf9fa0ee" />
```

---

## 📍 2. Active Homepage Ad Banner Zones (728x90)

| Zone Name | Zone ID | Class | Location in Code | Page Position |
| :--- | :---: | :---: | :--- | :--- |
| **`homepage-hero-bottom-728x90`** | `5986176` | `eas6a97888e2` | `src/app/(public)/page.tsx` | Directly **below Hero Carousel** |
| **`mobile-homepage-after-hero-banner`** | `5986984` | `eas6a97888e10` | `src/app/(public)/page.tsx` | **Mobile-only banner below Hero (≤768px)** |
| **`homepage-after-recent-episodes-728x90`** | `5986194` | `eas6a97888e2` | `src/app/(public)/page.tsx` | Directly **after Recent Episodes** |
| **`homepage-after-recent-episodes-mobile`** | `5986994` | `eas6a97888e10` | `src/app/(public)/page.tsx` | **Mobile-only banner after Recent Episodes (≤768px)** |
| **`homepage-native-feed`** | `5986302` | `eas6a9788e20` | `src/app/(public)/page.tsx` | **Native Widget Between Latest Series & Trending (Desktop Only)** |
| **`series-after-filters-728x90`** | `5986838` | `eas6a97888e2` | `src/components/BrowseHub/BrowseHub.tsx` | **Below Genre/Series Filter Selector** |
| **`series-details-before-episodes-728x90`** | `5986920` | `eas6a97888e2` | `src/app/(public)/series/[slug]/page.tsx` | **Below Series Metadata, Before Episodes** |
| **`series-before-episodes-banner`** | `5986998` | `eas6a97888e10` | `src/app/(public)/series/[slug]/page.tsx` | **Mobile-only banner above Episodes Grid (≤768px)** |
| **`episode-before-similar-titles-728x90`** | `5986956` | `eas6a97888e2` | `src/app/(public)/watch/[episodeId]/WatchPageClient.tsx` | **Before Similar Titles on Watch/Episode page** |
| **`mobile-homepage-footer-banner`** | `5986980` | `eas6a97888e10` | `src/app/(public)/layout.tsx` | **Mobile-only banner above Footer (≤768px)** |
| **`homepage-before-footer-728x90`** | `5986212` | `eas6a97888e2` | `src/app/(public)/layout.tsx` | Globally **above Site Footer** |

---

## 🛠️ 3. Dynamic Ad Component Architecture (`AdBanner.tsx`)

The ad banner system is located in:
- `src/components/AdBanner/AdBanner.tsx`
- `src/components/AdBanner/AdBanner.module.css`

### 💡 Key Features & Auto-Collapse Logic:
1. **Asynchronous Non-Blocking Script Injection**:
   - Dynamically loads `https://a.magsrv.com/ad-provider.js` and initializes `window.AdProvider`.
2. **Auto-Collapse Empty Placeholders**:
   - Uses a real-time DOM `MutationObserver` and `setInterval` check.
   - **If no ad is filled or when ad blockers are active**: The container collapses completely (`display: none !important`, `height: 0`), leaving **zero empty space or dark placeholder boxes** on the site.
   - **When an ad unit fills**: It automatically un-hides and displays the banner smoothly.

---

## 🚀 4. How to Add a New Ad Zone in 1 Step

To place an ad anywhere on the site (e.g. watch page, categories, sidebar):

```tsx
import AdBanner from '@/components/AdBanner/AdBanner';

// Place component with your ExoClick Zone ID:
<AdBanner zoneId="YOUR_NEW_ZONE_ID" />
```

---

## 📈 5. Recommended Future Ad Formats for Higher CPM

1. **VAST Pre-Roll Video Ads** (Highest CPM in streaming sites):
   - Integrates directly inside the video player (`VideoPlayer.tsx`) before episode playback begins.
2. **Popunder Ads**:
   - Triggers a single popunder tab on the first user click per 24 hours. Generates steady high revenue without disrupting regular browsing.
3. **In-Video Banner Overlays**:
   - Displays a floating 468x60 or 300x250 banner overlay at the bottom of the video player when paused.
