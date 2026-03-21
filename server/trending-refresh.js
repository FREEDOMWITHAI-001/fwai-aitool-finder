import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GoogleAuth } from 'google-auth-library';
import admin from 'firebase-admin';
import { fetchGoogleTrendsScores, fetchGithubStarsSignals } from './google-trends-plugin.js';

// ---- Firebase Admin init (server-side) ----

function getAdminApp() {
  // Reuse existing app if already initialized (survives Vite HMR)
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const keyPath = resolve(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

  // Read database URL from .env file
  let databaseURL = '';
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/VITE_FIREBASE_DATABASE_URL=(.+)/);
    if (match) databaseURL = match[1].trim();
  } catch { /* fallback */ }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
}

// ---- Load tools data ----

function loadTools() {
  const toolsPath = resolve(process.cwd(), 'src/data/tools.json');
  return JSON.parse(readFileSync(toolsPath, 'utf8'));
}

// ---- Signal 1: Internal search signals from RTDB (weight: 30%) ----

async function fetchSearchSignals(tools) {
  const rtdb = admin.database();
  const scores = {};

  // Initialize all tools to 0
  for (const tool of tools) scores[tool.name] = 0;

  try {
    // Read trending queries
    const querySnap = await rtdb.ref('trending/queries').once('value');
    const queries = querySnap.exists() ? querySnap.val() : {};

    // Read trending categories
    const catSnap = await rtdb.ref('trending/categories').once('value');
    const categories = catSnap.exists() ? catSnap.val() : {};

    // Score each tool based on how many user queries match its categories/name/bestFor
    for (const tool of tools) {
      let score = 0;
      const toolTerms = [
        tool.name.toLowerCase(),
        tool.bestFor.toLowerCase(),
        ...tool.categories.map(c => c.toLowerCase()),
        tool.primary.toLowerCase(),
      ];

      // Match against user search queries
      for (const entry of Object.values(queries)) {
        const q = (entry.query || '').toLowerCase();
        const count = entry.count || 1;
        for (const term of toolTerms) {
          if (q.includes(term) || term.includes(q)) {
            score += count;
            break;
          }
        }
      }

      // Boost from category popularity
      const catKey = tool.primary.charAt(0).toUpperCase() + tool.primary.slice(1);
      for (const [, catData] of Object.entries(categories)) {
        if ((catData.name || '').toLowerCase() === tool.primary) {
          score += (catData.count || 0) * 0.5;
        }
      }

      scores[tool.name] = score;
    }
  } catch (err) {
    console.error('[Trending] Search signal fetch failed:', err.message);
  }

  // Normalize to 0-100
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const name of Object.keys(scores)) {
    scores[name] = Math.round((scores[name] / maxScore) * 100);
  }

  return scores;
}

// ---- Signal 2: Internal usage signals from Firestore (weight: 20%) ----

async function fetchUsageSignals(tools) {
  const firestore = admin.firestore();
  const scores = {};

  for (const tool of tools) scores[tool.name] = 0;

  try {
    // Get toolUsage docs from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const snap = await firestore.collection('toolUsage')
      .where('createdAt', '>=', sevenDaysAgo)
      .get();

    // Count actions per tool
    const toolCounts = {};
    snap.forEach(doc => {
      const data = doc.data();
      const toolId = data.toolId || '';
      if (toolId) {
        toolCounts[toolId] = (toolCounts[toolId] || 0) + 1;
      }
    });

    // Map toolUsage entries to tool names (fuzzy match)
    const toolNameMap = {};
    for (const tool of tools) {
      toolNameMap[tool.name.toLowerCase()] = tool.name;
    }

    for (const [toolId, count] of Object.entries(toolCounts)) {
      const lower = toolId.toLowerCase();
      // Direct match
      if (toolNameMap[lower]) {
        scores[toolNameMap[lower]] += count;
      }
      // Category match - distribute across tools in that category
      for (const tool of tools) {
        if (tool.primary === lower || tool.categories.includes(lower)) {
          scores[tool.name] += count * 0.1;
        }
      }
    }
  } catch (err) {
    console.error('[Trending] Usage signal fetch failed:', err.message);
  }

  // Normalize to 0-100
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const name of Object.keys(scores)) {
    scores[name] = Math.round((scores[name] / maxScore) * 100);
  }

  return scores;
}

// ---- Signal 3: Reddit mentions — real community buzz (weight: 25%) ----

async function fetchRedditSignals(tools) {
  const mentions = {};
  for (const tool of tools) mentions[tool.name] = 0;

  const SUBREDDITS = 'artificial+ChatGPT+MachineLearning+singularity+productivity+webdev+programming+ArtificialIntelligence';
  // Process 4 tools at a time with 1.2s gap to stay under Reddit's ~60 req/min unauthenticated limit
  const BATCH_SIZE = 4;
  const DELAY_MS = 1200;

  console.log('[Trending] Reddit: fetching mentions for', tools.length, 'tools...');

  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (tool) => {
      try {
        const q = encodeURIComponent(`"${tool.name}"`);
        const url = `https://www.reddit.com/r/${SUBREDDITS}/search.json?q=${q}&sort=new&t=month&limit=25&restrict_sr=1`;

        const res = await fetch(url, {
          headers: { 'User-Agent': 'AIRadarBot/1.0 (Freedom with AI trending tracker)' },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return;
        const data = await res.json();
        mentions[tool.name] = data?.data?.children?.length || 0;
      } catch { /* silent — fallback to 0 */ }
    }));

    if (i + BATCH_SIZE < tools.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Normalize to 0-100
  const maxMentions = Math.max(...Object.values(mentions), 1);
  const scores = {};
  for (const [name, count] of Object.entries(mentions)) {
    scores[name] = Math.round((count / maxMentions) * 100);
  }

  const totalMentions = Object.values(mentions).reduce((a, b) => a + b, 0);
  console.log(`[Trending] Reddit: ${totalMentions} total mentions across ${tools.length} tools`);

  return scores;
}

// ---- Signal 4: Hacker News mentions — dev community interest (weight: 15%) ----

async function fetchHackerNewsSignals(tools) {
  const mentions = {};

  const MONTH_AGO = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // HN Algolia API is free, no auth, supports full concurrency
  console.log('[Trending] HN: fetching mentions for', tools.length, 'tools...');

  await Promise.all(tools.map(async (tool) => {
    try {
      const q = encodeURIComponent(tool.name);
      const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${MONTH_AGO}&hitsPerPage=20`;

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) { mentions[tool.name] = 0; return; }

      const data = await res.json();
      mentions[tool.name] = data.nbHits || 0;
    } catch { mentions[tool.name] = 0; }
  }));

  // Normalize to 0-100
  const maxMentions = Math.max(...Object.values(mentions), 1);
  const scores = {};
  for (const [name, count] of Object.entries(mentions)) {
    scores[name] = Math.round((count / maxMentions) * 100);
  }

  const totalMentions = Object.values(mentions).reduce((a, b) => a + b, 0);
  console.log(`[Trending] HN: ${totalMentions} total mentions across ${tools.length} tools`);

  return scores;
}

// ---- Signal 5: Gemini fallback (used only for tools missing Google Trends data) ----

async function fetchGeminiScores(tools) {
  const scores = {};
  for (const tool of tools) scores[tool.name] = tool.trendScore || 50;

  if (tools.length === 0) return scores;

  const BATCH_SIZE = 40;
  const batches = [];
  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    batches.push(tools.slice(i, i + BATCH_SIZE));
  }

  const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const keyPath = resolve(process.cwd(), 'service-account.json');
  const keyData = JSON.parse(readFileSync(keyPath, 'utf8'));
  const auth = new GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/generative-language', 'https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  console.log('[Trending] Gemini fallback: scoring', tools.length, 'tools across', batches.length, 'batches');

  const currentDate = new Date().toISOString().split('T')[0];

  const batchPromises = batches.map(async (batch, batchIdx) => {
    const toolList = batch.map(t => `${t.name} (${t.primary})`).join(', ');

    const prompt = `You are an AI industry analyst. Rate each tool's CURRENT trending momentum (0-100) as of ${currentDate} based on:
- Social media buzz: Reddit, Twitter/X, YouTube, TikTok (30%)
- Recent launches, funding, viral moments or major updates in last 3 months (30%)
- Active user growth and developer community adoption (20%)
- Industry news coverage and influencer recommendations (20%)

Reference calibration: ChatGPT=95, Cursor=82, ElevenLabs=78, Perplexity=75, Midjourney=70, Zapier=65

Tools to rate: ${toolList}

Return ONLY valid JSON: {"scores":{"ToolName":75,"AnotherTool":42}}`;

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.token}`,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.3,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[Trending] Gemini batch ${batchIdx} failed:`, response.status, errBody.slice(0, 200));
        return;
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => p.text && !p.thought);
      const text = textPart?.text || parts[parts.length - 1]?.text;
      if (!text) return;

      const parsed = JSON.parse(text);
      if (parsed.scores) {
        const toolNameMap = {};
        for (const t of batch) toolNameMap[t.name.toLowerCase()] = t.name;

        for (const [name, score] of Object.entries(parsed.scores)) {
          const normalized = name.toLowerCase();
          const matchedName = toolNameMap[normalized];
          if (matchedName) {
            scores[matchedName] = Math.max(0, Math.min(100, Math.round(score)));
          } else {
            for (const [lower, original] of Object.entries(toolNameMap)) {
              if (lower.includes(normalized) || normalized.includes(lower)) {
                scores[original] = Math.max(0, Math.min(100, Math.round(score)));
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Trending] Gemini batch ${batchIdx} error:`, err.message);
    }
  });

  await Promise.all(batchPromises);
  return scores;
}

// ---- Signal 3: Real Google Trends + Gemini fallback ----

async function fetchTrendsSignals(tools) {
  // Step 1: Try real Google Trends
  let gtScores = {};
  try {
    gtScores = await fetchGoogleTrendsScores(tools);
  } catch (err) {
    console.error('[Trending] Google Trends fetch failed entirely:', err.message);
  }

  // Step 2: Find tools that didn't get a GT score
  const missingTools = tools.filter(t => gtScores[t.name] == null);
  const gtCount = tools.length - missingTools.length;

  let geminiScores = {};
  if (missingTools.length > 0) {
    console.log(`[Trending] ${gtCount} tools got real GT scores. ${missingTools.length} tools need Gemini fallback.`);
    geminiScores = await fetchGeminiScores(missingTools);
  } else {
    console.log(`[Trending] All ${gtCount} tools scored via real Google Trends — no Gemini needed.`);
  }

  // Step 3: Merge — real GT takes priority, Gemini fills gaps
  const combined = {};
  for (const tool of tools) {
    combined[tool.name] = gtScores[tool.name] ?? geminiScores[tool.name] ?? tool.trendScore ?? 50;
  }

  return { combined, gtCount, geminiCount: missingTools.length };
}

// ---- Composite scoring ----

function computeCompositeScores(tools, searchSignals, usageSignals, trendsSignals, githubSignals, redditSignals, hnSignals) {
  const totalSearch = Object.values(searchSignals).reduce((a, b) => a + b, 0);
  const totalUsage = Object.values(usageSignals).reduce((a, b) => a + b, 0);
  const totalReddit = Object.values(redditSignals).reduce((a, b) => a + b, 0);
  const totalHN = Object.values(hnSignals).reduce((a, b) => a + b, 0);

  const hasSearchData = totalSearch > 100;
  const hasUsageData = totalUsage > 50;
  const hasRedditData = totalReddit > 5;
  const hasHNData = totalHN > 5;

  // Signal weights (must sum to 1.0):
  //   Reddit mentions (30d)   = 25% — real community buzz, covers all tool types
  //   HN mentions (30d)       = 15% — dev-community interest, zero auth needed
  //   Google Trends           = 30% — volume/search interest (entity detection issues mitigated by " AI" suffix)
  //   GitHub Stars            = 15% — adoption signal (log-scaled)
  //   Internal search         =  10% — what our users actually search for
  //   Internal usage          =  5%  — click/open actions in app
  let wReddit = hasRedditData ? 0.25 : 0;
  let wHN     = hasHNData ? 0.15 : 0;
  let wGithub = 0.15;
  let wTrends = 0.30;
  let wSearch = hasSearchData ? 0.10 : 0;
  let wUsage  = hasUsageData ? 0.05 : 0;

  // Redistribute unused weight into Trends (most reliable remaining signal)
  const allocated = wReddit + wHN + wGithub + wTrends + wSearch + wUsage;
  const overflow = +(1 - allocated).toFixed(4);
  wTrends = +(wTrends + overflow).toFixed(4);

  console.log(`[Trending] Weights: reddit=${wReddit}, hn=${wHN}, trends=${wTrends}, github=${wGithub}, search=${wSearch}, usage=${wUsage}`);

  const scores = {};
  const breakdown = {};

  for (const tool of tools) {
    const search = searchSignals[tool.name] || 0;
    const usage  = usageSignals[tool.name] || 0;
    const trends = trendsSignals[tool.name] || (tool.trendScore || 50);
    const github = githubSignals[tool.name] || 0;
    const reddit = redditSignals[tool.name] || 0;
    const hn     = hnSignals[tool.name] || 0;

    const composite = Math.round(
      (reddit * wReddit) + (hn * wHN) + (trends * wTrends) +
      (github * wGithub) + (search * wSearch) + (usage * wUsage)
    );

    scores[tool.name] = Math.max(1, Math.min(100, composite));
    breakdown[tool.name] = { reddit, hn, trends, github, search, usage, composite: scores[tool.name] };
  }

  return { scores, breakdown };
}

// ---- Write cache to Firestore ----

async function writeCacheToFirestore(scores, breakdown) {
  const firestore = admin.firestore();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

  await firestore.doc('trendingCache/latest').set({
    scores,
    breakdown,
    updatedAt: now,
    expiresAt,
  });

  console.log(`[Trending] Cache written: ${Object.keys(scores).length} tools at ${now}`);
}

// ---- Main refresh function ----

async function refreshTrendingScores() {
  getAdminApp();
  const tools = loadTools();

  console.log('[Trending] Starting refresh for', tools.length, 'tools...');

  // Fetch fast signals in parallel: internal DB reads + GitHub API + HN (all free/no-auth)
  const [searchSignals, usageSignals, githubSignals, hnSignals] = await Promise.all([
    fetchSearchSignals(tools),
    fetchUsageSignals(tools),
    fetchGithubStarsSignals(tools),
    fetchHackerNewsSignals(tools),
  ]);

  // Reddit: sequential (rate-limited ~60 req/min unauthenticated)
  const redditSignals = await fetchRedditSignals(tools);

  // Google Trends (sequential, rate-limited) with Gemini fallback for unscored tools
  const { combined: trendsSignals, gtCount, geminiCount } = await fetchTrendsSignals(tools);
  console.log(`[Trending] Trends breakdown: ${gtCount} real Google Trends + ${geminiCount} Gemini fallback`);

  // Compute composite scores with 6 signals
  const { scores, breakdown } = computeCompositeScores(
    tools, searchSignals, usageSignals, trendsSignals, githubSignals, redditSignals, hnSignals
  );

  // Write to Firestore cache
  await writeCacheToFirestore(scores, breakdown);

  return { scores, breakdown, toolsUpdated: Object.keys(scores).length };
}

// ---- Vite plugin ----

export function trendingRefreshPlugin() {
  let refreshInterval = null;

  return {
    name: 'trending-refresh',
    configureServer(server) {
      // API endpoint for manual/cron refresh
      server.middlewares.use('/api/trending-refresh', async (req, res) => {
        // Allow both GET (for cron) and POST
        if (req.method !== 'POST' && req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Drain request body if POST
        if (req.method === 'POST') {
          for await (const _ of req) { /* drain */ }
        }

        try {
          const result = await refreshTrendingScores();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({
            success: true,
            toolsUpdated: result.toolsUpdated,
            updatedAt: new Date().toISOString(),
          }));
        } catch (err) {
          console.error('[Trending] Refresh failed:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Endpoint to read cached scores (for debugging)
      server.middlewares.use('/api/trending-scores', async (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          getAdminApp();
          const firestore = admin.firestore();
          const snap = await firestore.doc('trendingCache/latest').get();

          if (!snap.exists) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No cached scores found' }));
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(snap.data()));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Auto-refresh every 6 hours
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      refreshInterval = setInterval(() => {
        console.log('[Trending] Auto-refresh triggered');
        refreshTrendingScores().catch(err => {
          console.error('[Trending] Auto-refresh failed:', err.message);
        });
      }, SIX_HOURS);

      // Trigger initial refresh 30 seconds after server start
      setTimeout(() => {
        console.log('[Trending] Initial refresh triggered');
        refreshTrendingScores().catch(err => {
          console.error('[Trending] Initial refresh failed:', err.message);
        });
      }, 30000);
    },
  };
}
