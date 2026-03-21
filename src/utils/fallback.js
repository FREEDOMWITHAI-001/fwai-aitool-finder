import tools from '../data/tools.json';
import { getCachedTrendingScores } from '../services/trendingEngine';

// Dynamic score cache — loaded once, refreshed when trending cache updates
let dynamicScores = null;
let dynamicScoresLoadedAt = 0;

async function loadDynamicScores() {
  // Refresh every 10 minutes
  if (dynamicScores && (Date.now() - dynamicScoresLoadedAt < 10 * 60 * 1000)) {
    return dynamicScores;
  }
  try {
    const cached = await getCachedTrendingScores();
    if (cached?.scores) {
      dynamicScores = cached.scores;
      dynamicScoresLoadedAt = Date.now();
    }
  } catch { /* use static */ }
  return dynamicScores;
}

// Get effective trend score for a tool (dynamic > static fallback)
function getEffectiveTrendScore(tool) {
  if (dynamicScores && dynamicScores[tool.name] != null) {
    return dynamicScores[tool.name];
  }
  return tool.trendScore || 50;
}

// Map each main category to related keywords users might search for
const CATEGORY_KEYWORDS = {
  video: ['video', 'video editing', 'video generation', 'video maker', 'video creator', 'video creation', 'create video', 'edit video', 'animation', 'vfx', 'visual effects', 'movie', 'clip', 'film', 'youtube', 'reels', 'tiktok', 'subtitle', 'gen-video', 'avatar', 'video enhancement', 'screen recording'],
  coding: ['coding', 'code', 'programming', 'programmer', 'developer', 'development', 'software', 'ide', 'debug', 'debugging', 'web development', 'app development', 'frontend', 'backend', 'fullstack', 'full-stack', 'github', 'copilot', 'compiler', 'script', 'coding assistant', 'code editor', 'code review', 'devops'],
  design: ['design', 'graphic', 'graphics', 'image', 'art', 'illustration', 'logo', 'ui', 'ux', 'ui/ux', 'creative design', 'photo', 'picture', 'poster', 'banner', 'midjourney', 'dall-e', 'dalle', 'wireframe', 'prototype', 'mockup', 'icon'],
  writing: ['writing', 'write', 'writer', 'blog', 'article', 'essay', 'copywriting', 'academic', 'grammar', 'story', 'storytelling', 'email', 'document', 'resume', 'cv', 'content writing', 'content creation', 'paraphrase', 'proofread'],
  marketing: ['marketing', 'seo', 'ads', 'advertising', 'social media', 'campaign', 'branding', 'brand', 'sales', 'lead generation', 'growth', 'engagement', 'conversion', 'digital marketing', 'ad creative', 'promotion', 'email marketing', 'influencer'],
  audio: ['audio', 'voice', 'sound', 'music', 'podcast', 'speech', 'text-to-speech', 'tts', 'voice cloning', 'voiceover', 'narration', 'song', 'singing', 'noise', 'transcription', 'audio editing', 'sound design', 'audio generation'],
  research: ['research', 'science', 'academic', 'study', 'analysis', 'data analysis', 'information', 'paper', 'journal', 'citation', 'fact-check', 'knowledge', 'learning', 'literature review', 'scientific', 'scholar'],
  automation: ['automation', 'automate', 'workflow', 'bot', 'integration', 'zapier', 'scheduling', 'pipeline', 'no-code', 'nocode', 'low-code', 'scraping', 'rpa', 'automate tasks', 'workflow automation'],
};

// Maps user query phrases → exact category tags used in tools.json
// Ordered longest-first so "video editing" matches before "edit"
const INTENT_TO_TAGS = {
  // ---- Video ----
  'video editing tools': ['video editing'],
  'video editing': ['video editing'],
  'video editor': ['video editing'],
  'edit video': ['video editing'],
  'editing video': ['video editing'],
  'video post production': ['video editing'],
  'video creation tools': ['creation', 'gen-video', 'generation'],
  'video creation': ['creation', 'gen-video', 'generation'],
  'video generation tools': ['gen-video', 'generation', 'creation'],
  'video generation': ['gen-video', 'generation', 'creation'],
  'video generator': ['gen-video', 'generation', 'creation'],
  'video maker': ['creation', 'gen-video', 'generation'],
  'video creator': ['creation', 'gen-video', 'generation'],
  'create video': ['creation', 'gen-video'],
  'create videos': ['creation', 'gen-video'],
  'text to video': ['gen-video', 'generation'],
  'text-to-video': ['gen-video', 'generation'],
  'ai video generation': ['gen-video', 'generation', 'creation'],
  'ai video creation': ['creation', 'gen-video', 'generation'],
  'generate video': ['gen-video', 'generation'],
  'ai avatar video': ['avatar', 'creation'],
  'ai avatar': ['avatar'],
  'avatar video': ['avatar', 'creation'],
  'ai presenter': ['avatar', 'presentation'],
  'talking head': ['avatar'],
  'animation tools': ['animation'],
  'animation': ['animation'],
  'animated video': ['animation', 'gen-video'],
  'subtitle': ['subtitle', 'transcription'],
  'caption': ['subtitle', 'transcription'],
  'video upscaling': ['upscaling', 'video enhancement'],
  'video enhancement': ['video enhancement', 'upscaling'],
  'upscale video': ['upscaling'],
  'social media video': ['social media', 'video editing'],
  'reels': ['social media'],
  'tiktok video': ['social media'],
  'short clips': ['social media', 'video editing'],
  'youtube video': ['social media', 'creation'],
  // ---- Coding ----
  'code editor': ['ide'],
  'coding editor': ['ide'],
  'code editors': ['ide'],
  'ai code editor': ['ide'],
  'code review': ['code review'],
  'ai code review': ['code review'],
  'pull request': ['code review'],
  'web app builder': ['web development', 'deployment'],
  'web development': ['web development'],
  'web app': ['web development'],
  'website builder': ['web development'],
  'full stack': ['web development', 'deployment'],
  'fullstack': ['web development', 'deployment'],
  'app builder': ['web development', 'deployment'],
  'deployment': ['deployment'],
  'deploy': ['deployment'],
  'github': ['github', 'developer tools'],
  // ---- Design ----
  'image generation tools': ['image', 'art'],
  'image generation': ['image', 'art'],
  'image generator': ['image', 'art'],
  'generate image': ['image', 'art'],
  'generate images': ['image', 'art'],
  'art generation': ['art', 'image'],
  'ai art': ['art', 'image'],
  'ai image': ['image', 'art'],
  'photo editing': ['photo', 'image'],
  'background removal': ['photo', 'image'],
  'logo design': ['logo', 'branding'],
  'logo creator': ['logo', 'branding'],
  'logo maker': ['logo', 'branding'],
  'logo generator': ['logo', 'branding'],
  'brand identity': ['branding', 'logo'],
  'ui design': ['ui', 'ux'],
  'ux design': ['ui', 'ux'],
  'ui/ux': ['ui', 'ux'],
  'wireframe': ['wireframe', 'prototype'],
  'mockup': ['prototype', 'wireframe'],
  'prototype': ['prototype', 'wireframe'],
  'graphic design': ['graphics'],
  'graphics': ['graphics'],
  'vector': ['graphics'],
  // ---- Writing ----
  'grammar checker': ['grammar'],
  'grammar check': ['grammar'],
  'grammar tool': ['grammar'],
  'proofread': ['grammar'],
  'proofreading': ['grammar'],
  'spell check': ['grammar'],
  'blog writing': ['blog', 'content'],
  'blog writer': ['blog', 'content'],
  'blog post': ['blog', 'content'],
  'content writing': ['blog', 'content'],
  'academic writing': ['academic'],
  'essay writer': ['academic', 'essay'],
  'research paper': ['academic', 'paper'],
  'resume builder': ['resume', 'career'],
  'resume writer': ['resume', 'career'],
  'cv builder': ['resume', 'career'],
  'cover letter': ['resume', 'career'],
  'copywriting': ['copywriting'],
  'copy writer': ['copywriting'],
  'ad copy': ['copywriting'],
  'story writing': ['story', 'fiction'],
  'creative writing': ['story', 'fiction'],
  'fiction writing': ['story', 'fiction'],
  // ---- Marketing ----
  'seo tools': ['seo', 'optimization'],
  'seo optimization': ['seo', 'optimization'],
  'seo': ['seo'],
  'ad creative': ['ads'],
  'ad creatives': ['ads'],
  'advertising': ['ads'],
  'email marketing': ['email marketing'],
  'cold email': ['email marketing', 'sales'],
  'email campaign': ['email marketing'],
  'social media marketing': ['social media'],
  'social media management': ['social media', 'scheduling'],
  'social media post': ['social media'],
  'social post': ['social media'],
  'lead generation': ['lead generation', 'sales'],
  'sales tools': ['sales', 'crm'],
  'crm': ['crm', 'sales'],
  // ---- Audio ----
  'voice generation tools': ['voice', 'gen-audio'],
  'voice generation': ['voice', 'gen-audio'],
  'voice generator': ['voice', 'gen-audio'],
  'ai voice': ['voice', 'gen-audio'],
  'text to speech': ['text-to-speech', 'voice'],
  'text-to-speech': ['text-to-speech', 'voice'],
  'tts': ['text-to-speech', 'voice'],
  'voice cloning': ['voice cloning', 'voice'],
  'voiceover': ['voiceover', 'voice'],
  'voice over': ['voiceover', 'voice'],
  'narration': ['voiceover', 'voice'],
  'music generation tools': ['music', 'gen-audio'],
  'music generation': ['music', 'gen-audio'],
  'music generator': ['music', 'gen-audio'],
  'music creation': ['music', 'gen-audio'],
  'ai music': ['music', 'gen-audio'],
  'song creation': ['music', 'gen-audio'],
  'ai song': ['music', 'gen-audio'],
  'beat making': ['music', 'gen-audio'],
  'podcast editing': ['podcast'],
  'podcast recording': ['podcast'],
  'podcast tools': ['podcast'],
  'noise cancellation': ['noise'],
  'noise removal': ['noise'],
  'background noise': ['noise'],
  'audio editing': ['audio', 'editing'],
  'stem separation': ['music', 'editing'],
  // ---- Research ----
  'research paper': ['paper', 'academic'],
  'academic research': ['academic', 'paper'],
  'literature review': ['paper', 'academic'],
  'citation tool': ['citation'],
  'citation': ['citation'],
  'data analysis': ['data analysis'],
  'data science': ['data analysis', 'science'],
  'scientific research': ['science', 'academic'],
  // ---- Automation ----
  'workflow automation': ['workflow', 'automation'],
  'no code automation': ['no-code', 'workflow'],
  'no-code': ['no-code'],
  'nocode': ['no-code'],
  'low code': ['low-code'],
  'web scraping': ['scraping', 'data'],
  'scraping': ['scraping'],
  'browser automation': ['browser', 'automation'],
  'rpa': ['rpa'],
  'enterprise automation': ['rpa', 'workflow'],
  'task automation': ['workflow', 'automation'],
};

// Detect which category a query belongs to
function detectCategory(query) {
  const q = query.toLowerCase();
  let bestCategory = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

// Extract category tags from query using the intent map.
// Returns deduplicated list of tools.json category tags to prioritize.
// Checks longest phrases first so "video editing" wins over "edit".
function extractIntentTags(query) {
  const q = query.toLowerCase();
  const found = new Set();

  // Sort by phrase length DESC so more-specific phrases match first
  const sorted = Object.entries(INTENT_TO_TAGS).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, tags] of sorted) {
    if (q.includes(phrase)) {
      for (const tag of tags) found.add(tag);
    }
  }

  return [...found];
}

// Count how many intent tags exactly match a tool's category tags.
// ONLY exact matches — no substring/partial matching to avoid false positives
// e.g. "video editing" intent tag must exist literally in tool.categories,
// NOT match just because "video" (a broader tag) is present.
function scoreExactTagMatch(tool, intentTags) {
  if (intentTags.length === 0) return 0;
  const toolCats = new Set(tool.categories.map(c => c.toLowerCase()));
  let score = 0;
  for (const tag of intentTags) {
    if (toolCats.has(tag)) score += 1;
  }
  return score;
}

// Filter tools strictly by primary category
function filterByCategory(category) {
  return tools.filter(tool => tool.primary === category);
}

function formatTool(tool, relevanceScore = 0) {
  const bestFor = tool.bestFor.length > 50 ? tool.bestFor.slice(0, 47) + '...' : tool.bestFor;
  const rawReason = `Top-rated for ${tool.bestFor.toLowerCase()}.`;
  const reason = rawReason.length > 60 ? rawReason.slice(0, 57) + '...' : rawReason;
  return {
    name: tool.name,
    url: tool.url,
    rating: tool.rating,
    ratingSource: 'Community',
    pricing: tool.pricing,
    reason,
    bestFor,
    trendScore: getEffectiveTrendScore(tool),
    relevanceScore, // used by ResultsSection "Best Match" sort
    categories: tool.categories,
    primary: tool.primary,
  };
}

export function findLocalRecommendations(query, count = 8) {
  const q = query.toLowerCase();
  const detectedCategory = detectCategory(q);
  const intentTags = extractIntentTags(q);
  let pool = [];

  if (detectedCategory) {
    pool = filterByCategory(detectedCategory);
  }

  if (pool.length === 0) {
    pool = tools.filter(tool => {
      const inCategories = tool.categories.some(cat =>
        q.includes(cat.toLowerCase()) || cat.toLowerCase().includes(q)
      );
      const inName = tool.name.toLowerCase().includes(q);
      const inBestFor = tool.bestFor.toLowerCase().includes(q);
      return inCategories || inName || inBestFor;
    });
  }

  if (pool.length === 0) {
    pool = tools.filter(t => ['ChatGPT', 'Claude', 'Perplexity'].includes(t.name));
  }

  if (intentTags.length > 0) {
    // Score each tool — only exact category tag matches count
    const scored = pool.map(t => ({ tool: t, score: scoreExactTagMatch(t, intentTags) }));

    const byTrend = (a, b) => {
      const td = getEffectiveTrendScore(b.tool) - getEffectiveTrendScore(a.tool);
      return td !== 0 ? td : b.tool.rating - a.tool.rating;
    };

    // Tier 1: tools that match the subcategory — sorted by trendScore DESC
    const matching = scored.filter(s => s.score > 0).sort((a, b) => {
      const scoreDiff = b.score - a.score;
      return scoreDiff !== 0 ? scoreDiff : byTrend(a, b);
    });

    // Tier 2: remaining tools in same primary category — only used to pad if matching < count
    const rest = scored.filter(s => s.score === 0).sort(byTrend);

    const ordered = [...matching, ...rest];
    return ordered.slice(0, count).map(s => formatTool(s.tool, s.score));
  }

  // No subcategory intent — sort by trendScore DESC then rating DESC
  pool.sort((a, b) => {
    const td = getEffectiveTrendScore(b) - getEffectiveTrendScore(a);
    return td !== 0 ? td : b.rating - a.rating;
  });
  return pool.slice(0, count).map(tool => formatTool(tool, 0));
}

// Pre-load dynamic scores on module init (non-blocking)
loadDynamicScores();

// Find more tools — always returns results, never duplicates
export function findMoreTools(query, excludeNames = [], count = 2) {
  const q = query.toLowerCase();
  const excludeSet = new Set(excludeNames.map(n => n.toLowerCase()));

  // Filter out already-shown tools
  function excludeShown(list) {
    return list.filter(t => !excludeSet.has(t.name.toLowerCase()));
  }

  const detectedCategory = detectCategory(q);
  let results = [];

  const intentTags = extractIntentTags(q);

  // 1. Strict category match — only return tools from the same primary category
  if (detectedCategory) {
    results = excludeShown(filterByCategory(detectedCategory));

    if (intentTags.length > 0) {
      const scored = results.map(t => ({ tool: t, score: scoreExactTagMatch(t, intentTags) }));
      const byTrend = (a, b) => {
        const td = getEffectiveTrendScore(b.tool) - getEffectiveTrendScore(a.tool);
        return td !== 0 ? td : b.tool.rating - a.tool.rating;
      };
      const matching = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score || byTrend(a, b));
      const rest = scored.filter(s => s.score === 0).sort(byTrend);
      return [...matching, ...rest].slice(0, count).map(s => formatTool(s.tool, s.score));
    }

    results.sort((a, b) => {
      const td = getEffectiveTrendScore(b) - getEffectiveTrendScore(a);
      return td !== 0 ? td : b.rating - a.rating;
    });
    return results.slice(0, count).map(tool => formatTool(tool, 0));
  }

  // 2. No category detected — keyword match by name/bestFor
  results = excludeShown(
    tools.filter(tool => {
      const inName = tool.name.toLowerCase().includes(q);
      const inBestFor = tool.bestFor.toLowerCase().includes(q);
      return inName || inBestFor;
    })
  );

  // 3. If still nothing, return top-rated remaining tools
  if (results.length === 0) {
    results = excludeShown(tools);
  }

  results.sort((a, b) => b.rating - a.rating);

  return results.slice(0, count).map(tool => formatTool(tool));
}
