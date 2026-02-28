# FWAI AI Tool Finder

> Describe your challenge — get instantly matched with the right AI tool.

FWAI AI Tool Finder is a Next.js web application that helps users discover the best AI tools for their specific needs. Users type a natural-language description of their problem, and the app returns curated, ranked recommendations powered by the Gemini AI API with a local static dataset as fallback.

---

## Features

- **Natural-language search** — describe a task in plain English to find matching AI tools
- **Gemini AI recommendations** — real-time recommendations via `gemini-2.0-flash` ranked and tailored to the query
- **Static fallback** — if the Gemini API is unavailable, results are served from a built-in curated dataset
- **Trending badges** — highlights tools that are growing rapidly in 2025–2026
- **Pricing labels** — Free / Freemium / Paid badges on every card
- **Animated skeletons** — loading placeholders shown while fetching results
- **Keyboard-friendly** — press Enter to search

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Plain CSS (globals.css) |
| Font | Inter (Google Fonts via `next/font`) |
| AI Backend | Google Gemini API (`gemini-2.0-flash`) |
| Package Manager | npm |

---

## Project Structure

```
fwai-aitool-finder/
├── docs/                        # Project documentation
│   ├── README.md                # This file
│   └── ARCHITECTURE.md          # System architecture overview
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root HTML shell + metadata
│   │   ├── page.tsx             # Home page (hero + SearchInterface)
│   │   ├── globals.css          # Global styles & design tokens
│   │   └── api/
│   │       └── recommend/
│   │           └── route.ts     # POST /api/recommend (Gemini integration)
│   ├── components/
│   │   ├── SearchInterface.tsx  # Search bar, state machine, results list
│   │   └── ToolCard.tsx         # Individual tool result card
│   ├── data/
│   │   └── tools.ts             # Static curated AI tool dataset
│   ├── lib/
│   │   └── search.ts            # Local search & ranking logic
│   └── types/
│       └── index.ts             # Shared TypeScript interfaces
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com) API key for Gemini

### Installation

```bash
git clone <repo-url>
cd fwai-aitool-finder
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running Locally

```bash
npm run dev       # start dev server on http://localhost:3000
npm run build     # production build
npm run start     # serve production build
npm run lint      # run ESLint
```

---

## How It Works

1. The user types a query (e.g. "video editing") and presses **Search** or **Enter**.
2. `SearchInterface` sends a `POST /api/recommend` request with the query.
3. The API route constructs a structured prompt and calls the Gemini API.
4. Gemini returns a JSON array of 2–3 recommended tools.
5. Results are displayed as `ToolCard` components with name, description, pricing, rating, tags, and a visit link.
6. If the Gemini API fails, `findRecommendations()` from `src/lib/search.ts` performs keyword matching against the local `tools.ts` dataset and maps the results to the same `RecommendedTool` shape.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key used server-side in `/api/recommend` |

---

## License

MIT
