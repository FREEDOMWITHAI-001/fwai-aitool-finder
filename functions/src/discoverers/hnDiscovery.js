/**
 * Hacker News Discovery
 *
 * Fetches recent "Show HN" posts and AI-tagged stories from HN Algolia API.
 * Returns array of { name, description, url, category, points, source }
 */

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

// Queries to search for AI tool launches on HN
const QUERIES = [
  { q: 'Show HN AI tool', tags: 'show_hn' },
  { q: 'Show HN AI assistant', tags: 'show_hn' },
  { q: 'Show HN LLM', tags: 'show_hn' },
  { q: 'Show HN GPT', tags: 'show_hn' },
  { q: 'launched AI', tags: 'story' },
  { q: 'AI coding assistant', tags: 'story' },
  { q: 'open source LLM', tags: 'story' },
  { q: 'AI image generation', tags: 'story' },
];

// Category inference from title keywords
const CATEGORY_HINTS = [
  { keywords: ['video', 'film', 'movie', 'clip'], category: 'video' },
  { keywords: ['code', 'coding', 'developer', 'ide', 'compiler', 'debugg'], category: 'coding' },
  { keywords: ['design', 'image', 'photo', 'art', 'graphic', 'diffusion', 'midjourney'], category: 'design' },
  { keywords: ['write', 'writing', 'text', 'content', 'document', 'blog', 'essay'], category: 'writing' },
  { keywords: ['marketing', 'seo', 'ads', 'advertis', 'email', 'campaign'], category: 'marketing' },
  { keywords: ['audio', 'music', 'voice', 'sound', 'speech', 'podcast'], category: 'audio' },
  { keywords: ['research', 'paper', 'scholar', 'academic', 'citation', 'science'], category: 'research' },
  { keywords: ['automat', 'workflow', 'pipeline', 'scraping', 'zapier', 'n8n', 'no-code', 'nocode'], category: 'automation' },
];

// Words that look like tool names but aren't
const FALSE_POSITIVES = new Set([
  'show', 'ask', 'tell', 'open', 'new', 'the', 'my', 'our', 'an',
  'free', 'fast', 'better', 'best', 'smart', 'easy', 'simple',
  'built', 'made', 'using', 'with', 'from', 'after', 'how',
]);

function inferCategory(title) {
  const lower = title.toLowerCase();
  for (const { keywords, category } of CATEGORY_HINTS) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'writing';
}

/**
 * Extract a tool name from an HN post title.
 * Show HN titles are usually "Show HN: ToolName – Description"
 */
function extractToolName(title) {
  // Handle "Show HN: ToolName – description" format
  const showHnMatch = title.match(/Show HN:\s*([^–\-–|]+)/i);
  if (showHnMatch) {
    const candidate = showHnMatch[1].trim();
    // Take first 1-3 words
    const words = candidate.split(/\s+/).slice(0, 3);
    const name = words.join(' ').replace(/[^a-zA-Z0-9.\s_-]/g, '').trim();
    if (name.length >= 2 && !FALSE_POSITIVES.has(name.toLowerCase())) {
      return name;
    }
  }

  // Generic: take first capitalized word/phrase before dash or colon
  const parts = title.split(/[-:–|]/);
  const candidate = parts[0].trim();
  const words = candidate.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z0-9._]/g, '');
    if (
      clean.length >= 2 &&
      clean.length <= 30 &&
      /[A-Z]/.test(clean[0]) &&
      !FALSE_POSITIVES.has(clean.toLowerCase())
    ) {
      return clean;
    }
  }

  return null;
}

/**
 * Run a single Algolia search query
 */
async function searchHN(query, tags, numericFilters = '') {
  const params = new URLSearchParams({
    query,
    tags,
    hitsPerPage: '30',
    ...(numericFilters ? { numericFilters } : {}),
  });

  const resp = await fetch(`${HN_ALGOLIA}/search?${params}`);
  if (!resp.ok) throw new Error(`HN Algolia search failed: ${resp.status}`);
  const data = await resp.json();
  return data.hits || [];
}

/**
 * Discover AI tools from Hacker News.
 * Returns array of { name, description, url, category, points, source }
 */
async function fetchHNDiscovery() {
  // Fetch from all queries in parallel, past 30 days
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const numericFilters = `created_at_i>${thirtyDaysAgo}`;

  const fetches = QUERIES.map(({ q, tags }) =>
    searchHN(q, tags, numericFilters).catch(err => {
      console.warn(`[HNDiscovery] Query "${q}" failed:`, err.message);
      return [];
    })
  );

  const allHits = (await Promise.all(fetches)).flat();

  // Deduplicate by story ID first
  const seenIds = new Set();
  const uniqueHits = allHits.filter(hit => {
    if (seenIds.has(hit.objectID)) return false;
    seenIds.add(hit.objectID);
    return true;
  });

  // Extract tool candidates
  const tools = [];
  const seenNames = new Set();

  for (const hit of uniqueHits) {
    const title = hit.title || '';
    const name = extractToolName(title);
    if (!name) continue;

    const key = name.toLowerCase().trim();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    tools.push({
      name,
      description: hit.story_text?.slice(0, 200) || title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      category: inferCategory(title),
      points: hit.points || 0,
      source: 'hn_discovery',
    });
  }

  // Sort by points
  tools.sort((a, b) => (b.points || 0) - (a.points || 0));

  console.log(`[HNDiscovery] Discovered ${tools.length} potential tools`);
  return tools;
}

module.exports = { fetchHNDiscovery };
