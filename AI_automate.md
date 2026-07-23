# AI Metadata Automation Design (Specialized adult Anime / Hentai Database)

This document outlines the specialized system design and workflow for AI-assisted metadata generation, normalization, and validation. The system is built around a secure, modular content pipeline designed for high accuracy, low cost, and simple maintenance.

---

## ⚙️ Core Architecture & Sourcing Pipeline

To maximize accuracy, security, and stability, the metadata pipeline separates raw data retrieval, entity normalization, AI enhancement, validation, and database operations.

### Sourcing Pipeline Flowchart

```
                 [ Admin Input Query ]
                          │
                          ▼
                 +-----------------+
                 |   Local Cache   | (Hit -> Check Version Schema -> Return)
                 +-----------------+
                          │ (Miss or Old Version)
                          ▼
         +---------------------------------+
         |   Metadata Provider Layer       | (Queries high-priority Providers)
         +---------------------------------+
                          │ (If missing / fails -> Retry -> Fallback)
                          ▼
         +---------------------------------+
         |    Browser Automation (Opt.)    | (Optional fallback, authenticated cookies)
         +---------------------------------+
                          │ (Last resort fallback)
                          ▼
         +---------------------------------+
         |    Vision Extraction (Opt.)     | (Gemini Vision + Page Screenshot)
         +---------------------------------+
                          │
                          ▼ (Raw Metadata Payload)
         +---------------------------------+
         |      Raw Response Caching       | (Saves raw provider payload for auditing)
         +---------------------------------+
                          │
                          ▼
         +---------------------------------+
         |     Metadata Normalization      | (Title cleanup, dates, studios)
         +---------------------------------+
                          │
                          ▼
         +---------------------------------+
         |     Entity Resolution Layer     | (Fuzzy match & map studios, genres, tags)
         +---------------------------------+
                          │
                          ▼
         +---------------------------------+
         |         AI Enhancement          | (Metadata AI -> SEO AI -> Search AI)
         +---------------------------------+
                          │
                          ▼
         +---------------------------------+
         |    Intelligent Validation Engine| (Consistency and constraints check)
         +---------------------------------+
                          │
                          ▼
         +---------------------------------+
         |       Duplicate Detection       | (Fuzzy title/slug matching)
         +---------------------------------+
                          │
                          ▼
                  [ Admin Preview ] ────> [ Database Save ] ────> [ Cache Update ]
```

---

## ⚡ Sourcing & Fallback Mechanisms

### 1. Three-Mode Execution
The system operates across three distinct metadata acquisition modes:
* **Mode 1 — Public Metadata (Default)**: Queries public, non-authenticated APIs for general, unrestricted series. Fast, cheap, and credential-free.
* **Mode 2 — Authenticated Metadata**: Queries restricted providers server-side using secure environment credentials. Returns restricted adult titles and tags.
* **Mode 3 — Vision Fallback (Optional)**: If structured APIs fail, a headless browser captures a screenshot of the target page using authenticated session cookies, and Gemini Vision extracts the fields.

### 2. Retry Strategy & Fallbacks
External services may experience intermittent downtime or rate-limits. To address this, the pipeline enforces a resilient retry policy:
* **Exponential Backoff**: Failed queries to a provider are automatically retried up to three times with progressive delays.
* **Fallback Chain**: If a provider fails after retries, the pipeline automatically falls back to the next provider in the priority list.
* **Optionality**: Browser automation is an optional fallback. The system remains fully operational even if disabled.

---

## 🧱 Modular Architecture Details

### 1. The `MetadataProvider` Interface
To avoid hardcoding selectors, the system abstracts sourcing through a modular interface:
```typescript
interface MetadataProvider {
  name: string;
  priority: number;
  supportsAdultTitles: boolean;
  supportsImages: boolean;
  supportsEpisodeMetadata: boolean;
  
  search(query: string): Promise<SearchResult[]>;
  getDetails(id: string): Promise<RawMetadata | null>;
  getEpisodes(seriesId: string): Promise<RawEpisodeMetadata[]>;
}
```

### 2. Database Entity Resolution Layer
To prevent duplicates of studios, genres, or tags due to minor spelling or casing differences:
* The system checks incoming names (e.g., `Juicy Mango`) against existing database records.
* Using fuzzy string matching, it automatically resolves to existing IDs (e.g., mapping to the ID of `Juicymango`) instead of creating a new duplicate entity.

### 3. Separated AI Responsibilities
To ease debugging and support modular updates, AI enhancement is divided into three distinct conceptual steps:
* **Metadata AI**: Generates original, professional, spoiler-free synopses and expands tags.
* **SEO AI**: Generates meta titles, meta descriptions, OpenGraph headers, Twitter cards, and structured JSON-LD schemas.
* **Search AI**: Generates lowercase index-ready keywords and search-optimized aliases.

---

## 🛡️ Validation & Manual Override Protection

### 1. Intelligent Validation Engine
Before metadata is sent to the admin preview, the Validation Engine executes strict consistency checks:
* **Date Consistency**: Validates that the release year matches the release date, and that the season (e.g. Spring) matches the release date month.
* **Constraints**: Ensures episode count is non-negative, runtime fits reasonable values, and status belongs to valid types (Released, Currently Airing, Upcoming, Completed, Cancelled).
* **Uniqueness**: Confirms the slug is URL-safe and unique.
* **Presence**: Verifies all required fields are populated.

### 2. Manual Override Protection (Lock States)
Every metadata field includes an individual lock state toggle.
* If the admin manually edits a field (e.g. locks the `studio` field to a corrected value), future automated refreshes or AI enhancements **must skip** updating that field unless the lock is explicitly unchecked by the admin.
```json
{
  "studio": {
    "value": "Juicymango",
    "locked": true
  }
}
```

### 3. Duplicate Title Detection
Before saving, the system runs the query through a fuzzy similarity check against official titles, English titles, Japanese titles, aliases, and slugs. If a match exceeds a 90% fuzzy similarity threshold, the admin UI displays a warning banner: *"This series may already exist in the database."*

---

## 📋 Comprehensive Metadata JSON Schema

When the API route `/api/admin/ai-fill` completes its execution, it returns a structured JSON payload matching this exact schema:

```json
{
  "officialTitle": {
    "value": "Deco x Deco THE ANIMATION",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": [
      { "date": "2026-07-19", "action": "Imported" }
    ]
  },
  "englishTitle": {
    "value": "Deco x Deco The Animation",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "japaneseTitle": {
    "value": "デコ×デコ THE ANIMATION",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "aliases": [
    "Deco Deco The Animation",
    "DecoxDeco"
  ],
  "searchAliases": [
    "deco deco",
    "decoxdeco",
    "デコ×デコ",
    "DECO X DECO"
  ],
  "slug": {
    "value": "deco-x-deco-the-animation",
    "source": {
      "provider": "System",
      "providerId": null,
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Fuzzy Normalizer"
    },
    "classification": "Derived",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "synopsis": {
    "value": "An original, SEO-friendly description (150-300 words) written in natural, fluent English, completely free of spoilers and formatted in a premium editorial tone.",
    "source": {
      "provider": "Metadata AI",
      "providerId": "Gemini-2.5-Pro-v4",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "AI Enhancement"
    },
    "classification": "Generated",
    "confidence": 40,
    "locked": false,
    "history": []
  },
  "coverImage": {
    "url": "https://r2.hentaianime.com/covers/deco-x-deco.jpg",
    "alt": "Official cover poster artwork for Deco x Deco THE ANIMATION showing character illustrations.",
    "source": "Provider A"
  },
  "genres": [
    "Romance",
    "Fantasy"
  ],
  "tags": [
    "Adult",
    "OVA",
    "Elf",
    "Huge Breasts",
    "Magic"
  ],
  "studio": {
    "value": "Juicymango",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "releaseDate": {
    "value": "2026-04-17",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "year": {
    "value": "2026",
    "source": {
      "provider": "System",
      "providerId": null,
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Fuzzy Normalizer"
    },
    "classification": "Derived",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "episodes": {
    "value": null,
    "source": {
      "provider": "Missing",
      "providerId": null,
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Unknown",
    "confidence": 0,
    "locked": false,
    "history": []
  },
  "runtime": {
    "value": "30 min",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "status": {
    "value": "Released",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "type": {
    "value": "OVA",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "season": {
    "value": "Spring",
    "source": {
      "provider": "System",
      "providerId": null,
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Fuzzy Normalizer"
    },
    "classification": "Derived",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "ageRating": {
    "value": "18+ (Explicit)",
    "source": {
      "provider": "Provider A",
      "providerId": "12345",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "Metadata Provider"
    },
    "classification": "Verified",
    "confidence": 100,
    "locked": false,
    "history": []
  },
  "seoTitle": {
    "value": "Deco x Deco THE ANIMATION - Watch Free Online Hentai",
    "source": {
      "provider": "SEO AI",
      "providerId": "Gemini-2.5-Pro-v4",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "AI Enhancement"
    },
    "classification": "Generated",
    "confidence": 40,
    "locked": false,
    "history": []
  },
  "seoDescription": {
    "value": "Stream Deco x Deco THE ANIMATION online. Read the official synopsis, view production studio details, and search categories.",
    "source": {
      "provider": "SEO AI",
      "providerId": "Gemini-2.5-Pro-v4",
      "retrievedAt": "2026-07-19T23:42:00Z",
      "pipelineStep": "AI Enhancement"
    },
    "classification": "Generated",
    "confidence": 40,
    "locked": false,
    "history": []
  },
  "keywords": [
    "Deco x Deco",
    "Deco x Deco anime",
    "Deco x Deco episodes"
  ],
  "logs": [
    { "step": "Cache", "durationMs": 5 },
    { "step": "Metadata Provider (Provider A)", "durationMs": 350 },
    { "step": "Normalization", "durationMs": 12 },
    { "step": "Entity Resolution", "durationMs": 8 },
    { "step": "AI Enhancement", "durationMs": 1850 },
    { "step": "Validation Engine", "durationMs": 6 },
    { "step": "Duplicate Detection", "durationMs": 15 }
  ]
}
```

---

## 🔍 Auditability, Revision History & Tooltips

To ensure transparency and allow rollbacks, the CMS includes comprehensive versioning, provenance, and field-level metadata details.

### 1. Store Raw Provider Responses
Before any normalization or AI enhancement is performed, the system saves the raw API response from the providers. 
* This response is stored in a dedicated database column (e.g. `raw_provider_payload`).
* If a question arises later regarding a field's value (e.g., *\"Why is the runtime listed as 28 minutes?\"*), the admin can view the original provider payload to verify whether the value was imported directly or modified during the normalization phase.

### 2. Metadata Revision History
Every save, correction, or regeneration increments the series metadata version.
* **Versioning Pipeline**:
  `Version 1 (Imported)` ➔ `Version 2 (Studio corrected)` ➔ `Version 3 (Synopsis regenerated)`.
* Admins can compare field diffs between two versions and roll back any field (or the entire series) to a previous version.

### 3. Field-Level Information Tooltips (ℹ️ Icon)
Every metadata input field in the admin form features an info icon `ℹ️`. Clicking it triggers a popover detailing the field's internal metadata properties:
* **Source**: The exact provider (e.g., AniDB) and internal ID.
* **Retrieved Date**: Timestamp of the latest import query.
* **Confidence Rating**: Dynamic percentage matching the source reliability index.
* **Last Modified**: Indicates whether the field was edited by the Admin or programmatically updated.
* **Lock State**: Checked / Unchecked status.
* **Pipeline Trail**: Shows the verification steps (e.g., `Provider ➔ Normalization ➔ Validation ➔ Saved`).

---

## 📐 Data Integrity & Field Classifications

### 1. Classification Types
* **Verified**: Hard data extracted directly from trusted source databases (AniDB, AniList, etc.).
* **Generated**: Original metadata written by AI (Synopsis, SEO descriptions).
* **Derived**: Values calculated programmatically from verified fields (e.g., extracting Release Year `2026` and Season `Spring` from Release Date `2026-04-17`).
* **Unknown**: Fields that could not be retrieved. Marked as `null` with a confidence score of `0`.

### 2. Source-Based Confidence Scores
Instead of arbitrary values, confidence scores map directly to the reliability index of their retrieval source:

| Sourced From | Confidence Score | Description |
| :--- | :--- | :--- |
| **Primary/Secondary Database Match** | `100` / `95` | Retrieved from structured AniDB, AniList, or Kitsu. |
| **Multiple Providers Agree** | `100` | Checked across both AniList and Kitsu databases. |
| **Browser Extraction Fallback** | `80` | Scraping HTML selectors using authenticated session. |
| **Vision Extraction Fallback** | `70` | Gemini Vision OCR/parsing from target page screenshot. |
| **AI Inference / Grounding** | `40` | Extrapolated by LLM models. |
| **Missing / Not Found** | `0` | Field returns `null`. |

---

## 🎬 Episode Automation & Sourcing

When adding episodes, the system leverages both local files and external API providers:
1. **Multi-Source Sourcing**: 
   * Retrieves official episode titles, releases, and descriptions from the active `MetadataProvider` (e.g. calling `getEpisodes`).
   * Falls back to parsing episode numbers and names from the uploaded video filename if provider data is missing.
2. **File Container Checks**: Reads the video container metadata to extract runtimes and dimensions automatically.
3. **Spoiler-Free Summary**: Generates a brief episode synopsis using Metadata AI if the provider description contains spoilers.
4. **Parent Validation**: Checks that the episode release date and constraints align correctly with the parent series.
5. **Auto-Increment**: Suggests the next consecutive episode number based on the highest existing database record.

---

## 📦 Scale Features & Import Queue

To support importing hundreds of series smoothly:
* **Background Import Queue**: Bulk requests are queued in a background job system (e.g. using a database table queue or worker library).
* **Workers**: Background workers process the queue asynchronously, executing cache validation, provider sourcing, normalization, and database insertions without blocking the admin dashboard interface.

```
 [ Bulk CSV / List Upload ]
             │
             ▼
      +--------------+
      |  Job Queue   |
      +--------------+
             │
             ├── Worker 1 (Processes Metadata Sourcing)
             ├── Worker 2 (Processes AI Synopses)
             └── Worker 3 (Processes Database Inserts)
```
