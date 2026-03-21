import googleTrends from 'google-trends-api';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Anchor tool: always included in every batch so scores are cross-comparable.
// ChatGPT is the highest-searched AI tool globally → used as the 100-point reference.
const ANCHOR = 'ChatGPT';
const ANCHOR_EXPECTED_SCORE = 95;

// Known public GitHub repos for tools in tools.json
// Only include repos where stars reflect actual tool adoption
const GITHUB_REPOS = {
  'Aider':         'Aider-AI/aider',
  'Continue':      'continuedev/continue',
  'Sweep AI':      'sweepai/sweep',
  'n8n':           'n8n-io/n8n',
  'Activepieces':  'activepieces/activepieces',
  'Pipedream':     'PipedreamHQ/pipedream',
  'Flux':          'black-forest-labs/flux',
};

/**
 * Build the Google Trends search keyword for a tool.
 * Appends " AI" to tool names that don't already contain an AI-related term,
 * which forces Google Trends to use keyword mode instead of entity/company mode.
 */
function buildKeyword(name) {
  const l = name.toLowerCase();
  if (
    l.includes(' ai') ||
    l.includes('gpt') ||
    l.includes('gemini') ||
    l.includes('claude') ||
    l.includes('copilot') ||
    l.includes('llm')
  ) {
    return name;
  }
  return `${name} AI`;
}

/**
 * Fetch real Google Trends interest scores for all tools.
 * Strategy:
 *   - Every batch of 4 tools includes ChatGPT as anchor (slot 0)
 *   - All tool scores become relative to ChatGPT → cross-batch comparable
 *   - 2s delay between batches to avoid rate limiting
 *
 * @param {Array} tools - tool objects from tools.json
 * @returns {Object} { toolName: score(0-100) }  missing = fetch failed for that batch
 */
export async function fetchGoogleTrendsScores(tools) {
  const scores = {};
  const BATCH_SIZE = 4; // 4 tools + 1 anchor = 5 (Google Trends max)
  const DELAY_MS = 2000;
  const startTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endTime = new Date();

  // ChatGPT gets a fixed baseline score (it would be 100 in its own batch, so we assign expected)
  const chatGptTool = tools.find(t => t.name === ANCHOR);
  if (chatGptTool) scores[ANCHOR] = ANCHOR_EXPECTED_SCORE;

  // Process all tools except the anchor (it's always added automatically)
  const toolsToFetch = tools.filter(t => t.name !== ANCHOR);
  const totalBatches = Math.ceil(toolsToFetch.length / BATCH_SIZE);

  console.log(`[GoogleTrends] Fetching ${toolsToFetch.length} tools in ${totalBatches} batches...`);

  for (let i = 0; i < toolsToFetch.length; i += BATCH_SIZE) {
    const batch = toolsToFetch.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const keywords = [ANCHOR, ...batch.map(t => buildKeyword(t.name))];

    try {
      const raw = await googleTrends.interestOverTime({
        keyword: keywords,
        startTime,
        endTime,
        hl: 'en-US',
        geo: '',       // worldwide
        timezone: 0,
        category: 0,   // all categories
        property: '',  // web search
      });

      const data = JSON.parse(raw);
      const timeline = data?.default?.timelineData || [];

      if (!timeline.length) {
        console.warn(`[GoogleTrends] Batch ${batchNum}/${totalBatches}: empty response, skipping`);
        await delay(DELAY_MS);
        continue;
      }

      // Accumulate scores for each keyword slot
      const sums = new Array(keywords.length).fill(0);
      const counts = new Array(keywords.length).fill(0);

      for (const point of timeline) {
        const values = point.value || [];
        const hasData = point.hasData || [];
        for (let k = 0; k < keywords.length; k++) {
          if (hasData[k] && values[k] != null) {
            sums[k] += values[k];
            counts[k]++;
          }
        }
      }

      // Anchor average (slot 0 = ChatGPT)
      const anchorAvg = counts[0] > 0 ? sums[0] / counts[0] : ANCHOR_EXPECTED_SCORE;

      // Score each tool relative to the anchor
      for (let k = 0; k < batch.length; k++) {
        const toolAvg = counts[k + 1] > 0 ? sums[k + 1] / counts[k + 1] : 0;
        const relative = anchorAvg > 0
          ? (toolAvg / anchorAvg) * ANCHOR_EXPECTED_SCORE
          : toolAvg;
        scores[batch[k].name] = Math.max(0, Math.min(100, Math.round(relative)));
      }

      const log = batch.map(t => `${t.name}=${scores[t.name]}`).join(', ');
      console.log(`[GoogleTrends] Batch ${batchNum}/${totalBatches} (anchor=${Math.round(anchorAvg)}): ${log}`);

    } catch (err) {
      console.error(`[GoogleTrends] Batch ${batchNum}/${totalBatches} failed:`, err.message);
      // Leave those tools unscored — Gemini fallback will fill them in trending-refresh.js
    }

    if (i + BATCH_SIZE < toolsToFetch.length) {
      await delay(DELAY_MS);
    }
  }

  const scored = Object.keys(scores).length;
  console.log(`[GoogleTrends] Done: ${scored}/${tools.length} tools scored`);
  return scores;
}

/**
 * Fetch GitHub Stars as a supplementary signal for tools with known public repos.
 * Uses logarithmic scaling because stars range from thousands to hundreds of thousands.
 *
 * @param {Array} tools
 * @returns {Object} { toolName: score(0-100) }  0 for tools without a known repo
 */
export async function fetchGithubStarsSignals(tools) {
  const scores = {};
  for (const tool of tools) scores[tool.name] = 0;

  const starCounts = {};

  for (const [toolName, repo] of Object.entries(GITHUB_REPOS)) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'fwai-aitool-finder/1.0',
        },
      });

      if (!res.ok) {
        console.warn(`[GitHub] ${repo} → HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (data.stargazers_count) {
        starCounts[toolName] = data.stargazers_count;
        console.log(`[GitHub] ${toolName}: ${data.stargazers_count.toLocaleString()} stars`);
      }
    } catch (err) {
      console.error(`[GitHub] Failed to fetch ${repo}:`, err.message);
    }
  }

  // Normalize to 0-100 using log10 scale
  const values = Object.values(starCounts);
  if (values.length === 0) return scores;

  const maxLog = Math.max(...values.map(s => Math.log10(s + 1)), 1);
  for (const [toolName, stars] of Object.entries(starCounts)) {
    scores[toolName] = Math.round((Math.log10(stars + 1) / maxLog) * 100);
  }

  return scores;
}

/**
 * Vite plugin export — satisfies vite.config.js import.
 * The actual Google Trends logic runs inside trending-refresh.js during scheduled refreshes.
 */
export function googleTrendsPlugin() {
  return { name: 'google-trends-plugin' };
}
