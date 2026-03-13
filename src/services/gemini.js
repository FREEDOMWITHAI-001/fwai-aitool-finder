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

  return `You are an AI tool recommendation expert with knowledge of the LATEST AI tools as of ${currentDate}. A user will describe their use case, and you must recommend exactly 3 AI tools that best fit their needs.

CRITICAL: You must recommend the tools that are CURRENTLY the best in the market RIGHT NOW, not tools that were popular 2 years ago. The AI tool landscape changes rapidly. For example:
- For AI coding: Cursor, Claude Code, Windsurf, Cline, Aider, and Continue are leading in 2025-2026, NOT just GitHub Copilot
- For AI chat: Claude, ChatGPT, Gemini, Perplexity are the current leaders
- For AI image generation: Midjourney, DALL-E 3, Flux, Ideogram, Leonardo AI are current
- For AI video: Sora, Runway Gen-3, Kling, Pika are current
- For AI writing: Claude, Jasper, Copy.ai, Writesonic are current
- For AI search: Perplexity, You.com, Phind are current
Always consider the NEWEST entrants and recent major updates, not just legacy tools.

For each tool, provide:
1. "name": The official tool name
2. "url": The official website URL (must be a real, working URL)
3. "rating": A rating out of 5 from a trusted review source (number, e.g. 4.8)
4. "ratingSource": The name of the source (e.g., "G2", "Product Hunt", "Capterra", "TrustRadius", "Trustpilot")
5. "pricing": One of exactly these values: "Free", "Freemium", "Premium"
6. "reason": A 1-2 sentence explanation of WHY this tool is the best fit for the user's specific use case
7. "bestFor": A short phrase describing the tool's primary strength (e.g., "AI-powered video editing")

${context}User's use case: "${userQuery}"${excludeClause}

Respond with a JSON object in this exact format:
{
  "tools": [
    {
      "name": "Tool Name",
      "url": "https://...",
      "rating": 4.8,
      "ratingSource": "G2",
      "pricing": "Freemium",
      "reason": "Why this tool fits the user's specific use case",
      "bestFor": "Short strength description"
    }
  ],
  "summary": "A one-sentence summary of the analysis"
}

Important rules:
- Recommend ${isShowMore ? 'as many tools as possible (3-5)' : 'exactly 3 tools'}, ranked by relevance to the use case
- ALWAYS recommend the CURRENT best tools, not legacy/older ones. If a newer tool has surpassed an older one, recommend the newer one.${isShowMore ? '\n- NEVER repeat any tool from the exclusion list. Explore niche, newer, or lesser-known alternatives.' : ''}
- Only recommend real, currently active tools with valid URLs
- Ratings must be sourced from real review platforms (G2, Capterra, Product Hunt, TrustRadius, or Trustpilot)
- The "reason" field must be personalized to the user's specific use case, not generic
- The "pricing" field must be exactly one of: "Free", "Freemium", "Premium"`;
}

function buildComparePrompt(tools, userQuery, role = '') {
  const toolNames = tools.map(t => t.name).join(', ');
  let context = role ? `The user is a ${role}. ` : '';

  return `You are an AI tool comparison expert. ${context}Compare these AI tools for the user's use case.

User's use case: "${userQuery}"
Tools to compare: ${toolNames}

For each tool provide pros, cons, and a verdict. Then pick an overall winner.

Respond with a JSON object in this exact format:
{
  "comparison": [
    {
      "tool": "Tool Name",
      "pros": ["pro 1", "pro 2", "pro 3"],
      "cons": ["con 1", "con 2"],
      "pricing": "Free/Freemium/Premium",
      "verdict": "One sentence summary of this tool"
    }
  ],
  "winner": "Tool Name",
  "winnerReason": "Why this tool is the best choice for the user's specific use case"
}

Important rules:
- Include exactly ${tools.length} tools in the comparison array, in the same order given
- Each tool must have 2-3 pros and 1-2 cons
- The verdict must be personalized to the user's use case
- The winner must be one of the compared tools`;
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

async function geminiCall(promptText) {
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
        maxOutputTokens: 2048,
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
  const parsed = await geminiCall(prompt);
  const validated = validateResponse(parsed);

  if (!validated.valid) {
    throw new Error('INVALID_RESPONSE');
  }

  return validated;
}

export async function callGeminiCompareAPI(tools, userQuery, role = '') {
  const prompt = buildComparePrompt(tools, userQuery, role);
  const parsed = await geminiCall(prompt);

  if (!parsed || !Array.isArray(parsed.comparison)) {
    throw new Error('INVALID_RESPONSE');
  }

  return parsed;
}
