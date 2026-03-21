/**
 * Reddit Discovery
 *
 * Scrapes top posts from AI-focused subreddits to discover tool names.
 * Uses Reddit's public JSON API (no auth required for read-only).
 * Returns array of { name, description, url, category, score, source }
 */

// Subreddits to scan, with their default category hint
const SUBREDDITS = [
  { sub: 'artificial', category: 'writing' },
  { sub: 'MachineLearning', category: 'research' },
  { sub: 'LocalLLaMA', category: 'coding' },
  { sub: 'ChatGPT', category: 'writing' },
  { sub: 'AIToolsTech', category: 'writing' },
  { sub: 'StableDiffusion', category: 'design' },
  { sub: 'midjourney', category: 'design' },
  { sub: 'learnmachinelearning', category: 'research' },
  { sub: 'singularity', category: 'writing' },
  { sub: 'ArtificialIntelligence', category: 'writing' },
];

// Patterns to detect tool announcements in titles
const TOOL_PATTERNS = [
  /\[(?:Launch|Show HN|New Tool|Released?)\]/i,
  /I (?:built|made|created|released)/i,
  /(?:introducing|announcing|launch(?:ing|ed)?|released?)/i,
  /Show r\//i,
];

// Title keywords indicating it's about an AI tool
const AI_TOOL_KEYWORDS = [
  'ai', 'gpt', 'llm', 'chatbot', 'automation', 'tool', 'app',
  'assistant', 'generator', 'ml', 'model', 'neural', 'diffusion',
];

// Common English words to exclude as tool name false-positives
const STOPWORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'if',
  'new', 'free', 'open', 'source', 'best', 'top', 'use', 'using',
  'help', 'need', 'want', 'like', 'get', 'make', 'made', 'built',
]);

function isAIRelated(title) {
  const lower = title.toLowerCase();
  return AI_TOOL_KEYWORDS.some(kw => lower.includes(kw));
}

function hasToolPattern(title) {
  return TOOL_PATTERNS.some(p => p.test(title));
}

/**
 * Extract a likely tool name from a Reddit post title.
 * Looks for capitalized product-like names (2-30 chars, not all caps stopwords).
 */
function extractToolName(title) {
  // Strip common prefixes like "[Launch] Tool Name - description"
  const cleaned = title
    .replace(/^\[.*?\]\s*/i, '')
    .replace(/^I (?:built|made|created|released)\s*/i, '')
    .replace(/^(?:introducing|announcing|launching|released?)\s*/i, '')
    .replace(/^Show r\/\w+\s*/i, '');

  // Take the part before the first dash, colon, or pipe (usually the tool name)
  const nameSection = cleaned.split(/[-:–|]/)[0].trim();

  // Try to extract a proper noun (capitalized word 2-25 chars) from the name section
  const words = nameSection.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z0-9._]/g, '');
    if (
      clean.length >= 2 &&
      clean.length <= 25 &&
      /[A-Z]/.test(clean[0]) &&
      !STOPWORDS.has(clean.toLowerCase())
    ) {
      return clean;
    }
  }

  // Fall back to first 2-3 words of the name section
  const fallback = words.slice(0, 3).join(' ').trim();
  return fallback.length > 2 ? fallback : null;
}

/**
 * Fetch top posts from a subreddit using the public JSON API.
 */
async function fetchSubreddit(sub, category, limit = 25) {
  const url = `https://www.reddit.com/r/${sub}/top.json?t=week&limit=${limit}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'fwai-tool-finder/1.0 (trending refresh bot)' },
  });

  if (!resp.ok) throw new Error(`Reddit r/${sub} failed: ${resp.status}`);
  const data = await resp.json();
  const posts = data?.data?.children?.map(c => c.data) || [];

  const tools = [];
  for (const post of posts) {
    const title = post.title || '';
    if (!isAIRelated(title) && !hasToolPattern(title)) continue;

    const name = extractToolName(title);
    if (!name) continue;

    tools.push({
      name,
      description: post.selftext?.slice(0, 200) || title,
      url: post.url || `https://reddit.com${post.permalink}`,
      category,
      score: post.score || 0,
      source: 'reddit_discovery',
    });
  }

  return tools;
}

/**
 * Discover AI tools mentioned in top Reddit posts across AI subreddits.
 * Returns array of { name, description, url, category, score, source }
 */
async function fetchRedditDiscovery() {
  const fetches = SUBREDDITS.map(({ sub, category }) =>
    fetchSubreddit(sub, category, 25).catch(err => {
      console.warn(`[RedditDiscovery] r/${sub} failed:`, err.message);
      return [];
    })
  );

  const allTools = (await Promise.all(fetches)).flat();

  // Deduplicate by normalized name
  const seen = new Set();
  const unique = [];
  for (const tool of allTools) {
    const key = tool.name.toLowerCase().trim();
    if (seen.has(key) || key.length < 2) continue;
    seen.add(key);
    unique.push(tool);
  }

  // Sort by score descending
  unique.sort((a, b) => (b.score || 0) - (a.score || 0));

  console.log(`[RedditDiscovery] Discovered ${unique.length} potential tools`);
  return unique;
}

module.exports = { fetchRedditDiscovery };
