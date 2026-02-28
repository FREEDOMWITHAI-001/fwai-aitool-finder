# Architecture — FWAI AI Tool Finder

## Overview

FWAI AI Tool Finder is a single-page Next.js application. All UI runs on the client; the only server-side code is one API route that proxies requests to the Google Gemini API, keeping the API key off the browser.

---

## High-Level Data Flow

```
Browser
  │
  │  1. User types query → presses Search / Enter
  ▼
SearchInterface (Client Component)
  │
  │  2. POST /api/recommend  { query }
  ▼
Next.js Route Handler  (/app/api/recommend/route.ts)
  │
  │  3. Build structured prompt
  │  4. Call Gemini REST API
  ▼
Google Gemini API  (gemini-2.0-flash)
  │
  │  5. Return raw JSON array of tools
  ▼
Route Handler
  │
  │  6. Validate + slice to ≤ 3 results
  │  7. Return { tools: RecommendedTool[] }
  ▼
SearchInterface
  │
  │  8. Render ToolCard[] with fade-in animation
  ▼
Browser
```

### Fallback Path (Gemini unavailable)

```
SearchInterface (catch block)
  │
  │  findRecommendations(query)
  ▼
src/lib/search.ts
  │  keyword match against src/data/tools.ts
  │  sort: trending first, then by rating
  │  slice to ≤ 3
  ▼
SearchInterface  →  ToolCard[]  (+ error banner)
```

---

## Layer Breakdown

### 1. Presentation Layer

| File | Role |
|---|---|
| `src/app/page.tsx` | Entry point. Renders the hero section and mounts `<SearchInterface />`. |
| `src/app/layout.tsx` | Root layout. Sets HTML lang, loads the Inter font, injects global metadata. |
| `src/app/globals.css` | All visual styles: design tokens (CSS custom properties), card layout, badges, skeleton loaders, fade-in animations. |
| `src/components/SearchInterface.tsx` | Stateful client component. Owns the full search lifecycle: input → fetch → display. |
| `src/components/ToolCard.tsx` | Pure presentational component. Renders a single tool recommendation card. |

### 2. API Layer

| File | Role |
|---|---|
| `src/app/api/recommend/route.ts` | Next.js Route Handler (server-only). Validates the request body, builds a Gemini prompt, calls the REST API, parses the JSON response, and returns `{ tools }`. The `GEMINI_API_KEY` environment variable never leaves the server. |

### 3. Data Layer

| File | Role |
|---|---|
| `src/data/tools.ts` | Static registry of ~40+ curated AI tools. Each entry has `name`, `categories[]`, `pricing`, `rating`, `link`, `trending`. Used exclusively by the fallback search path. |
| `src/lib/search.ts` | `findRecommendations(query)` — keyword matching against the static dataset with trending-first sort. `capitalizeFirstLetter(string)` — display helper. |

### 4. Types

| File | Role |
|---|---|
| `src/types/index.ts` | Shared `RecommendedTool` interface used by both the API response and UI components. |

---

## State Machine (SearchInterface)

```
IDLE
  │  user submits query
  ▼
LOADING
  ├─ fetch succeeds  →  RESULTS  (isAIPowered = true)
  └─ fetch fails     →  RESULTS  (isAIPowered = false, error banner shown)

RESULTS
  │  user submits new query
  ▼
LOADING  (cycle repeats)
```

State variables:

| Variable | Type | Purpose |
|---|---|---|
| `query` | `string` | Controlled input value |
| `results` | `RecommendedTool[] \| null` | Null = no search yet |
| `currentQuery` | `string` | Query shown in results header |
| `isLoading` | `boolean` | Shows skeleton loader, disables button |
| `isAIPowered` | `boolean` | Shows/hides the "✦ Gemini AI" badge |
| `visible` | `boolean` | Drives CSS fade-in (60 ms timeout after results set) |
| `error` | `string \| null` | Fallback warning banner |

---

## API Route — `/api/recommend`

**Method:** `POST`
**Body:** `{ "query": string }`
**Response 200:** `{ "tools": RecommendedTool[] }` (1–3 items)

### Prompt Design

The Gemini prompt instructs the model to:
- Return **raw JSON only** (no markdown fences)
- Use the exact `RecommendedTool` schema
- Limit output to 2–3 real, well-known tools with working URLs
- Apply a realistic community-based rating
- Mark `trending: true` only for tools actively growing in 2025–2026

`temperature: 0.35` keeps responses factual and consistent.
`responseMimeType: 'application/json'` enforces JSON output at the API level.

### Error Handling

| Scenario | HTTP Status | Behaviour |
|---|---|---|
| Missing query | 400 | Returns `{ error }` |
| Missing API key | 500 | Returns `{ error }` |
| Gemini non-2xx | 502 | Logs error, returns `{ error }` |
| Empty Gemini response | 502 | Returns `{ error }` |
| JSON parse failure | 500 | Caught by outer try/catch |

Client-side, all non-2xx responses fall through to `catch` → static fallback.

---

## Search & Ranking (Fallback)

`findRecommendations(query: string): AITool[]`

1. **Filter** — include tools where any category string partially matches the query word-by-word, or where the tool name contains the query.
2. **Fallback** — if no matches, return `['ChatGPT', 'Claude', 'Perplexity']` as general-purpose defaults.
3. **Sort** — trending tools first, then descending by numeric rating.
4. **Slice** — return at most 3 results.

---

## Configuration

| File | Purpose |
|---|---|
| `next.config.ts` | Minimal Next.js config (no custom options currently). |
| `tsconfig.json` | TypeScript config with `@/` path alias pointing to `src/`. |
| `eslint.config.mjs` | ESLint flat config via `eslint-config-next`. |
| `.env.local` | Local secrets (not committed). Must contain `GEMINI_API_KEY`. |

---

## Security Considerations

- `GEMINI_API_KEY` is accessed **only** inside the Next.js Route Handler (server-side). It is never bundled into client JavaScript.
- The Gemini response is parsed with `JSON.parse` inside a try/catch; malformed output returns a 500 rather than crashing the server.
- All external links in `ToolCard` use `target="_blank" rel="noopener noreferrer"` to prevent tab-napping.

---

## Scalability Notes

- The static dataset (`src/data/tools.ts`) can be extended without any API or infrastructure changes.
- The `/api/recommend` route is stateless and edge-deployable (Vercel Edge Runtime compatible with minor adjustments).
- Caching (`next/cache` or HTTP `Cache-Control` headers) could be added to the route handler to reduce Gemini API spend for repeated queries.
