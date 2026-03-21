/**
 * Trending Refresh Cloud Function.
 *
 * Two entry points:
 *   1. Scheduled: runs every 12 hours via Cloud Scheduler (onSchedule)
 *   2. HTTP: manual trigger for testing (onRequest)
 *
 * Pipeline:
 *   0. Discover new AI tools from the internet (ProductHunt, Reddit, HN → Gemini)
 *   1. Fetch all 4 signal sources in parallel (Promise.allSettled)
 *   2. Compute composite scores with category-aware weights
 *   3. Apply smoothing + max-change guards against previous snapshot
 *   4. Atomic batch write to Firestore
 *   5. Log metadata for observability
 *
 * Firestore structure:
 *   trendingCache/latest         -> { tools: [...], updatedAt, metadata }
 *   trendingCache/history/{ts}   -> archived snapshot for debugging
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { TOOLS } = require("./src/config");
const { fetchGoogleTrends } = require("./src/fetchers/googleTrends");
const { fetchReddit } = require("./src/fetchers/reddit");
const { fetchHackerNews } = require("./src/fetchers/hackerNews");
const { fetchGitHub } = require("./src/fetchers/github");
const { scoreAllTools } = require("./src/scoring");
const { fetchProductHunt } = require("./src/discoverers/productHunt");
const { fetchRedditDiscovery } = require("./src/discoverers/redditDiscovery");
const { fetchHNDiscovery } = require("./src/discoverers/hnDiscovery");
const { extractWithGemini } = require("./src/discoverers/geminiExtractor");
const { mergeDiscoveredTools } = require("./src/discoverers/deduplicator");

initializeApp();

/**
 * Step 0: Discover new AI tools from the internet.
 * Runs ProductHunt, Reddit, HN scrapers in parallel, then validates with Gemini.
 * Falls back to TOOLS (static list) on any unrecoverable error.
 *
 * @returns {{ effectiveTools: Array, netNew: Array, discoveryMeta: object }}
 */
async function discoverTools() {
  console.log("[Discovery] Starting dynamic tool discovery...");

  let rawCandidates = [];
  const discoveryMeta = { productHunt: 0, reddit: 0, hackerNews: 0, netNew: 0, error: null };

  try {
    // Run all three discovery sources in parallel; each handles its own errors
    const [phTools, redditTools, hnTools] = await Promise.all([
      fetchProductHunt().catch(err => {
        console.warn("[Discovery] ProductHunt failed:", err.message);
        return [];
      }),
      fetchRedditDiscovery().catch(err => {
        console.warn("[Discovery] Reddit discovery failed:", err.message);
        return [];
      }),
      fetchHNDiscovery().catch(err => {
        console.warn("[Discovery] HN discovery failed:", err.message);
        return [];
      }),
    ]);

    discoveryMeta.productHunt = phTools.length;
    discoveryMeta.reddit = redditTools.length;
    discoveryMeta.hackerNews = hnTools.length;

    // Merge all raw candidates, dedup by name before sending to Gemini
    const seen = new Set();
    for (const tool of [...phTools, ...redditTools, ...hnTools]) {
      const key = (tool.name || "").toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rawCandidates.push(tool);
    }

    console.log(`[Discovery] ${rawCandidates.length} unique raw candidates to validate`);

    // Validate with Gemini (handles missing API key gracefully)
    const validated = await extractWithGemini(rawCandidates);

    // Merge with static list, cap net-new at 20
    const { effectiveTools, netNew } = mergeDiscoveredTools(TOOLS, validated);
    discoveryMeta.netNew = netNew.length;

    console.log(`[Discovery] Done. ${netNew.length} net-new tools added to this run.`);
    return { effectiveTools, netNew, discoveryMeta };
  } catch (err) {
    console.error("[Discovery] Unexpected error, falling back to static list:", err.message);
    discoveryMeta.error = err.message;
    return { effectiveTools: TOOLS, netNew: [], discoveryMeta };
  }
}

/**
 * Core refresh logic shared between scheduled and HTTP triggers.
 */
async function runTrendingRefresh() {
  const db = getFirestore();
  const startTime = Date.now();

  // ── Step 0: Dynamic tool discovery ────────────────────────
  const { effectiveTools, netNew, discoveryMeta } = await discoverTools();

  console.log(`[TrendingRefresh] Starting refresh for ${effectiveTools.length} tools (${netNew.length} newly discovered)`);

  // ── Step 1: Fetch all signals in parallel ─────────────────
  // Promise.allSettled ensures one failure doesn't kill the others

  const [trendsResult, redditResult, hnResult, githubResult] =
    await Promise.allSettled([
      fetchGoogleTrends(effectiveTools),
      fetchReddit(effectiveTools),
      fetchHackerNews(effectiveTools),
      fetchGitHub(effectiveTools),
    ]);

  // Extract results, defaulting to empty Map on failure
  const signals = {
    googleTrends:
      trendsResult.status === "fulfilled" ? trendsResult.value : new Map(),
    reddit:
      redditResult.status === "fulfilled" ? redditResult.value : new Map(),
    hackerNews:
      hnResult.status === "fulfilled" ? hnResult.value : new Map(),
    github:
      githubResult.status === "fulfilled" ? githubResult.value : new Map(),
  };

  // Track which signals succeeded
  const signalStatus = {
    googleTrends: {
      ok: trendsResult.status === "fulfilled",
      count: signals.googleTrends.size,
      error:
        trendsResult.status === "rejected"
          ? trendsResult.reason?.message
          : null,
    },
    reddit: {
      ok: redditResult.status === "fulfilled",
      count: signals.reddit.size,
      error:
        redditResult.status === "rejected"
          ? redditResult.reason?.message
          : null,
    },
    hackerNews: {
      ok: hnResult.status === "fulfilled",
      count: signals.hackerNews.size,
      error:
        hnResult.status === "rejected" ? hnResult.reason?.message : null,
    },
    github: {
      ok: githubResult.status === "fulfilled",
      count: signals.github.size,
      error:
        githubResult.status === "rejected"
          ? githubResult.reason?.message
          : null,
    },
  };

  const successfulSignals = Object.values(signalStatus).filter((s) => s.ok).length;

  console.log(
    `[TrendingRefresh] Signals collected: ${successfulSignals}/4 succeeded`
  );

  // Abort if fewer than 2 signal sources returned data
  if (successfulSignals < 2) {
    const error = `Only ${successfulSignals}/4 signals succeeded. Aborting to preserve existing scores.`;
    console.error(`[TrendingRefresh] ${error}`);
    return { success: false, error, signalStatus };
  }

  // ── Step 2: Load previous snapshot from Firestore (single read) ──
  let previousScores = {};
  let existingToolData = {};
  try {
    const prevDoc = await db.doc("trendingCache/latest").get();
    if (prevDoc.exists) {
      const prevTools = prevDoc.data()?.tools || [];
      for (const t of prevTools) {
        previousScores[t.name] = t.trendScore;
        existingToolData[t.name] = t;
      }
    }
  } catch (err) {
    console.warn(
      `[TrendingRefresh] Could not load previous scores: ${err.message}`
    );
  }

  // ── Step 3: Compute composite scores ──────────────────────
  const scoredResults = scoreAllTools(effectiveTools, signals, previousScores);

  // ── Step 4: Build the output document ─────────────────────
  const updatedTools = scoredResults.map((result) => {
    const existing = existingToolData[result.name] || {};
    // Find net-new metadata if this is a discovered tool
    const discovered = netNew.find(t => t.name === result.name);
    return {
      ...existing,
      name: result.name,
      primary: result.primary,
      trendScore: result.score,
      _lastComputed: result.computed,
      _previousScore: result.previousScore,
      _skipped: result.skipped || false,
      // Preserve discovery metadata for frontend "NEW" badge
      ...(discovered ? {
        _isDiscovered: true,
        _discoveredAt: discovered._discoveredAt,
        _description: discovered._description,
        _url: discovered._url,
      } : {}),
    };
  });

  const now = new Date();
  const metadata = {
    updatedAt: now.toISOString(),
    executionMs: Date.now() - startTime,
    toolCount: updatedTools.length,
    signalStatus,
    discoveryMeta,
    changedCount: scoredResults.filter((r) => r.changed).length,
    skippedCount: scoredResults.filter((r) => r.skipped).length,
    netNewCount: netNew.length,
  };

  // ── Step 5: Atomic Firestore write ────────────────────────
  const batch = db.batch();

  // Write the main snapshot
  const latestRef = db.doc("trendingCache/latest");
  batch.set(latestRef, {
    tools: updatedTools,
    ...metadata,
  });

  // Write to history for debugging / auditing (top-level collection = even path segments)
  const historyRef = db.collection("trendingHistory").doc(
    now.toISOString().replace(/[:.]/g, "-")
  );
  batch.set(historyRef, {
    tools: updatedTools,
    ...metadata,
  });

  await batch.commit();

  console.log(
    `[TrendingRefresh] Complete in ${metadata.executionMs}ms. ` +
      `${metadata.changedCount} tools changed, ${metadata.skippedCount} skipped, ` +
      `${metadata.netNewCount} net-new discovered.`
  );

  return { success: true, metadata };
}

// ── Scheduled trigger: every 12 hours ───────────────────────
exports.scheduledTrendingRefresh = onSchedule(
  {
    schedule: "every 12 hours",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540, // 9 minutes max
    memory: "512MiB",
  },
  async (event) => {
    try {
      const result = await runTrendingRefresh();
      if (!result.success) {
        console.error("[Scheduled] Refresh failed:", result.error);
      }
    } catch (err) {
      console.error("[Scheduled] Unhandled error:", err);
    }
  }
);

// ── HTTP trigger: manual refresh for testing ────────────────
// Call: https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/manualTrendingRefresh
exports.manualTrendingRefresh = onRequest(
  {
    timeoutSeconds: 540,
    memory: "512MiB",
    cors: false, // don't expose this publicly
  },
  async (req, res) => {
    // Simple auth check: require a secret query param
    const secret = process.env.REFRESH_SECRET || "change-me-in-production";
    if (req.query.secret !== secret) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await runTrendingRefresh();
      res.status(result.success ? 200 : 500).json(result);
    } catch (err) {
      console.error("[Manual] Unhandled error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
