// Gemini calls go through the server-side proxy (service account auth)
const GEMINI_PROXY = '/api/ai';

function buildPrompt(userQuery, { role = '', budget = '', teamSize = '', excludeTools = [], count = 4 } = {}) {
  let context = '';
  if (role) context += `The user is a ${role}. `;
  if (budget && budget !== 'Any price') context += `Budget preference: ${budget}. `;
  if (teamSize && teamSize !== 'Solo') context += `Team size: ${teamSize}. `;

  let excludeClause = '';
  const isShowMore = excludeTools.length > 0;
  if (isShowMore) {
    excludeClause = `\n\nCRITICAL EXCLUSION LIST — You MUST NOT recommend ANY of these tools (the user has already seen them): [${excludeTools.join(', ')}].\nYou MUST recommend ${Math.min(5, 3 + Math.floor(excludeTools.length / 3))} completely DIFFERENT tools that are NOT in the exclusion list above. Think of lesser-known alternatives, niche tools, newer startups, and tools from different ecosystems. Be creative and diverse in your recommendations.`;
  }

  const currentDate = new Date().toISOString().split('T')[0];

  return `You are an AI tool expert (${currentDate}). Recommend ${isShowMore ? '3-5' : `exactly ${count}`} CURRENT, most-relevant AI tools for the user's exact use case. Rank by: (1) relevance to the specific query intent, (2) current popularity/trending on Google Trends and social media, (3) real user rating.

${context}Use case: "${userQuery}"${excludeClause}

Return JSON: {"tools":[{"name":"","url":"","rating":4.8,"ratingSource":"G2","pricing":"Freemium","reason":"","bestFor":""}],"summary":""}

Rules:
- CRITICAL: Match the SPECIFIC intent precisely. "video editing" = tools for cutting/trimming/editing existing footage (CapCut, Descript, Filmora), NOT video generation. "video generation/creation" = text-to-video tools (Runway, Sora, Pika). "image generation" = DALL-E, Midjourney, Stable Diffusion. "writing" = Jasper, Copy.ai, Grammarly. Never mix subcategories.
- Sort results by RELEVANCE to the query first, then by current trending popularity.
- rating: real score from G2/Capterra/Product Hunt/TrustRadius/Trustpilot
- pricing: exactly "Free", "Freemium", or "Premium"
- reason: MAX 10 words. Short tagline, NOT a paragraph. Example: "Best for quick social media video editing"
- bestFor: MAX 8 words. Example: "AI-powered video editing for social media"${isShowMore ? '\n- NEVER repeat excluded tools. Suggest niche/newer alternatives.' : ''}
- Only real, active tools with valid URLs`;
}

function buildComparePrompt(tools, userQuery, role = '') {
  const toolNames = tools.map(t => t.name).join(', ');
  let context = role ? `The user is a ${role}. ` : '';

  return `${context}Compare these AI tools for: "${userQuery}"
Tools: ${toolNames}

Return JSON: {"comparison":[{"tool":"","pros":["","",""],"cons":["",""],"pricing":"Free/Freemium/Premium","verdict":""}],"winner":"","winnerReason":""}

Rules: exactly ${tools.length} tools in order, 2-3 pros, 1-2 cons each, verdict personalized to use case, winner must be one of the tools`;
}

function validateResponse(parsed) {
  if (!parsed || !Array.isArray(parsed.tools) || parsed.tools.length === 0) {
    return { valid: false, tools: [] };
  }

  const validPricing = ['Free', 'Freemium', 'Premium'];

  const tools = parsed.tools.slice(0, 8).map(tool => {
    let pricing = tool.pricing || 'Freemium';
    if (!validPricing.includes(pricing)) {
      const lower = pricing.toLowerCase();
      if (lower.includes('free') && !lower.includes('freemium')) pricing = 'Free';
      else if (lower.includes('freemium')) pricing = 'Freemium';
      else pricing = 'Premium';
    }

    let rating = parseFloat(tool.rating) || 0;
    rating = Math.max(0, Math.min(5, rating));
    rating = Math.round(rating * 10) / 10;

    // Truncate verbose fields to keep cards uniform
    let reason = tool.reason || '';
    if (reason.length > 60) reason = reason.slice(0, 57) + '...';
    let bestFor = tool.bestFor || '';
    if (bestFor.length > 50) bestFor = bestFor.slice(0, 47) + '...';

    return {
      name: tool.name || 'Unknown Tool',
      url: tool.url || '#',
      rating,
      ratingSource: tool.ratingSource || '',
      pricing,
      reason,
      bestFor,
    };
  });

  return { valid: true, tools, summary: parsed.summary || '' };
}

async function geminiCall(promptText, maxTokens = 1024) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(GEMINI_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.7,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Gemini] Error:', response.status, errorBody);
    throw new Error(`API_ERROR_${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error('[Gemini] Invalid response structure:', JSON.stringify(data));
    throw new Error('INVALID_RESPONSE');
  }

  return JSON.parse(data.candidates[0].content.parts[0].text);
}

export async function callGeminiAPI(userQuery, options = {}) {
  const prompt = buildPrompt(userQuery, options);
  const parsed = await geminiCall(prompt, 1024);
  const validated = validateResponse(parsed);

  if (!validated.valid) {
    throw new Error('INVALID_RESPONSE');
  }

  return validated;
}

export async function callGeminiCompareAPI(tools, userQuery, role = '') {
  const prompt = buildComparePrompt(tools, userQuery, role);
  const parsed = await geminiCall(prompt, 1024);

  if (!parsed || !Array.isArray(parsed.comparison)) {
    throw new Error('INVALID_RESPONSE');
  }

  return parsed;
}

// Session cache for trending tools — avoids re-fetching on every page visit
let _trendingCache = null;
let _trendingCachedAt = 0;
const TRENDING_TTL = 30 * 60 * 1000; // 30 min

export async function callGeminiTrendingTools(categories, countPerCategory = 6) {
  if (_trendingCache && Date.now() - _trendingCachedAt < TRENDING_TTL) {
    return _trendingCache;
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const prompt = `You are an AI tool expert (${currentDate}). List the top ${countPerCategory} currently trending AI tools for each category below.

Categories: ${categories.join(', ')}

Return JSON with each category name as a key:
{"Video":[{"name":"","url":"","pricing":"Freemium","rating":4.5,"bestFor":""}],"Coding":[...],...}

Rules:
- Include ALL ${categories.length} categories as keys
- pricing: exactly "Free", "Freemium", or "Premium"
- rating: real score 3.0–5.0
- bestFor: MAX 8 words
- Only real, active tools with valid URLs
- Sort by current popularity/trending within each category`;

  const parsed = await geminiCall(prompt, 2048);

  const validPricing = ['Free', 'Freemium', 'Premium'];
  const result = {};

  for (const cat of categories) {
    const raw = parsed[cat];
    if (!Array.isArray(raw)) { result[cat] = []; continue; }
    result[cat] = raw.slice(0, countPerCategory).map((t, index) => {
      if (!t.name || !t.url) return null;
      let pricing = t.pricing || 'Freemium';
      if (!validPricing.includes(pricing)) pricing = 'Freemium';
      let rating = parseFloat(t.rating) || 4.5;
      rating = Math.max(0, Math.min(5, Math.round(rating * 10) / 10));
      const bestFor = (t.bestFor || '').slice(0, 50);
      // Preserve Gemini's popularity ordering as trendScore (rank 0 = most trending = highest score)
      const trendScore = (countPerCategory - index) * 10;
      return { name: t.name, url: t.url, pricing, rating, bestFor, trendScore };
    }).filter(Boolean);
  }

  _trendingCache = result;
  _trendingCachedAt = Date.now();
  return result;
}
