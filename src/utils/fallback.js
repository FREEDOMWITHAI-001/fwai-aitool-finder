import tools from '../data/tools.json';

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

// Filter tools strictly by primary category
function filterByCategory(category) {
  return tools.filter(tool => tool.primary === category);
}

function formatTool(tool) {
  return {
    name: tool.name,
    url: tool.url,
    rating: tool.rating,
    ratingSource: 'Community',
    pricing: tool.pricing,
    reason: `Top-rated tool for ${tool.bestFor.toLowerCase()}.`,
    bestFor: tool.bestFor,
  };
}

export function findLocalRecommendations(query) {
  const q = query.toLowerCase();
  const detectedCategory = detectCategory(q);
  let matches = [];

  if (detectedCategory) {
    matches = filterByCategory(detectedCategory);
  }

  if (matches.length === 0) {
    matches = tools.filter(tool => {
      const inCategories = tool.categories.some(cat =>
        q.includes(cat.toLowerCase()) || cat.toLowerCase().includes(q)
      );
      const inName = tool.name.toLowerCase().includes(q);
      const inBestFor = tool.bestFor.toLowerCase().includes(q);
      return inCategories || inName || inBestFor;
    });
  }

  if (matches.length === 0) {
    matches = tools.filter(t => ['ChatGPT', 'Claude', 'Perplexity'].includes(t.name));
  }

  matches.sort((a, b) => {
    const aDirectMatch = detectedCategory && a.primary === detectedCategory ? 1 : 0;
    const bDirectMatch = detectedCategory && b.primary === detectedCategory ? 1 : 0;
    if (bDirectMatch !== aDirectMatch) return bDirectMatch - aDirectMatch;
    return b.rating - a.rating;
  });

  return matches.slice(0, 6).map(tool => formatTool(tool));
}

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

  // 1. Strict category match — only return tools from the same primary category
  if (detectedCategory) {
    results = excludeShown(filterByCategory(detectedCategory));
    results.sort((a, b) => b.rating - a.rating);
    return results.slice(0, count).map(tool => formatTool(tool));
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
