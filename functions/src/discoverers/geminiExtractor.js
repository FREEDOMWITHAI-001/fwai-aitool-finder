/**
 * Gemini Extractor
 *
 * Uses Gemini to:
 *   1. Validate and clean up raw tool candidates from Reddit/HN/ProductHunt
 *   2. Infer missing metadata (category, description, URL pattern)
 *   3. Filter out false positives and generic terms
 *
 * Requires: GEMINI_API_KEY env var
 * Falls back gracefully: if API unavailable, returns raw candidates filtered by heuristic
 */

const CATEGORIES = ['video', 'coding', 'design', 'writing', 'marketing', 'audio', 'research', 'automation'];

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Max candidates to send to Gemini in one batch (to stay within token limits)
const BATCH_SIZE = 40;

/**
 * Call Gemini API with a prompt
 */
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const resp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,        // Low temp for factual extraction
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error('Gemini returned non-JSON: ' + text.slice(0, 200));
  }
}

/**
 * Heuristic filter before calling Gemini — eliminates obvious false positives cheaply.
 */
function heuristicFilter(candidates) {
  const OBVIOUS_NOT_TOOLS = new Set([
    'show', 'ask', 'tell', 'open', 'new', 'the', 'my', 'our', 'an', 'i',
    'free', 'fast', 'better', 'best', 'smart', 'easy', 'simple', 'great',
    'built', 'made', 'using', 'with', 'from', 'after', 'how', 'why',
    'update', 'news', 'review', 'help', 'use', 'test', 'check', 'api',
    'gpt', 'llm', 'ai', 'ml',  // too generic — need a product name
  ]);

  return candidates.filter(c => {
    const name = (c.name || '').trim();
    if (name.length < 2 || name.length > 50) return false;
    if (OBVIOUS_NOT_TOOLS.has(name.toLowerCase())) return false;
    // Must have at least one letter
    if (!/[a-zA-Z]/.test(name)) return false;
    return true;
  });
}

/**
 * Build Gemini prompt for validating and enriching tool candidates.
 */
function buildPrompt(candidates) {
  const toolList = candidates
    .map((c, i) => `${i + 1}. Name: "${c.name}" | Description: "${c.description?.slice(0, 100) || ''}" | Source: ${c.source}`)
    .join('\n');

  return `You are an AI tool classification expert. I have a list of potential AI tool names extracted from Reddit, Hacker News, and ProductHunt posts.

Your job:
1. Identify which ones are real, specific AI tools/products (not generic terms, article topics, or false positives)
2. For each real tool, assign the best matching category
3. Return ONLY real tools with their details

Categories available: ${CATEGORIES.join(', ')}

Tool candidates:
${toolList}

Return a JSON array of valid tools only. Each item must have:
- "name": the clean product name (string)
- "category": one of the categories above (string)
- "description": a 1-sentence description of what it does (string)
- "isAITool": true (boolean)

Return ONLY the JSON array, no other text. Example format:
[
  {"name": "Cursor", "category": "coding", "description": "AI-powered code editor with inline completion", "isAITool": true}
]

If none are real tools, return an empty array [].`;
}

/**
 * Validate and enrich tool candidates using Gemini.
 * Returns cleaned array with accurate categories and descriptions.
 */
async function extractWithGemini(rawCandidates) {
  // Step 1: Heuristic pre-filter (cheap)
  const filtered = heuristicFilter(rawCandidates);
  console.log(`[GeminiExtractor] ${rawCandidates.length} candidates → ${filtered.length} after heuristic filter`);

  if (filtered.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GeminiExtractor] No GEMINI_API_KEY — returning heuristic-filtered candidates only');
    return filtered.map(c => ({
      ...c,
      category: c.category || 'writing',
      description: c.description || '',
    }));
  }

  // Step 2: Process in batches to avoid token limits
  const results = [];
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(batch);

    try {
      const validated = await callGemini(prompt);
      if (Array.isArray(validated)) {
        results.push(...validated.filter(t => t.isAITool && t.name));
      }
    } catch (err) {
      console.warn(`[GeminiExtractor] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message);
      // Fall back to heuristic results for this batch
      results.push(...batch.map(c => ({
        name: c.name,
        category: c.category || 'writing',
        description: c.description || '',
        isAITool: true,
      })));
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < filtered.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Final dedup by normalized name
  const seen = new Set();
  const unique = results.filter(t => {
    const key = t.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[GeminiExtractor] Validated ${unique.length} real AI tools`);
  return unique;
}

module.exports = { extractWithGemini };
