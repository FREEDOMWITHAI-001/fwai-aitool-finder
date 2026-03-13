// Gemini calls go through the server-side proxy (service account auth)
const GEMINI_PROXY = '/api/ai';

function buildPrompt(userQuery, { role = '', budget = '', teamSize = '', excludeTools = [] } = {}) {
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

  return `You are an AI tool expert (${currentDate}). Recommend ${isShowMore ? '3-5' : 'exactly 3'} CURRENT, best-in-market AI tools for the user's use case. Prioritize newer tools over legacy ones.

${context}Use case: "${userQuery}"${excludeClause}

Return JSON: {"tools":[{"name":"","url":"","rating":4.8,"ratingSource":"G2","pricing":"Freemium","reason":"","bestFor":""}],"summary":""}

Rules:
- rating: real score from G2/Capterra/Product Hunt/TrustRadius/Trustpilot
- pricing: exactly "Free", "Freemium", or "Premium"
- reason: personalized to user's use case${isShowMore ? '\n- NEVER repeat excluded tools. Suggest niche/newer alternatives.' : ''}
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

  const tools = parsed.tools.slice(0, 5).map(tool => {
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

    return {
      name: tool.name || 'Unknown Tool',
      url: tool.url || '#',
      rating,
      ratingSource: tool.ratingSource || '',
      pricing,
      reason: tool.reason || '',
      bestFor: tool.bestFor || '',
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
