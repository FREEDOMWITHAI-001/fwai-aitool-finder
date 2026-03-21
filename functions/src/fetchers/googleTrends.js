/**
 * Google Trends signal fetcher.
 *
 * Uses the unofficial google-trends-api package to pull
 * "interest over time" for each tool's primary search term.
 *
 * Returns a normalized 0-100 score based on current interest
 * relative to the tool's own recent baseline (rate-of-change),
 * NOT absolute volume. This prevents ChatGPT from drowning
 * out every other tool.
 *
 * Pitfall mitigation:
 *   - Sequential requests with delays to avoid rate limiting
 *   - Individual try/catch per tool so one failure doesn't kill the batch
 *   - Returns partial results if some tools fail
 */

const googleTrends = require("google-trends-api");

const DELAY_MS = 1500; // 1.5s between requests to avoid rate limits

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch Google Trends interest for a single search term.
 * Returns a score 0-100 based on the trend direction:
 *   - 50 = flat (no change)
 *   - 75-100 = strong upward trend
 *   - 0-25 = declining trend
 */
async function fetchSingleTrend(searchTerm) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await googleTrends.interestOverTime({
    keyword: searchTerm,
    startTime: thirtyDaysAgo,
    endTime: now,
    geo: "", // worldwide
  });

  const parsed = JSON.parse(result);
  const timeline = parsed.default?.timelineData;

  if (!timeline || timeline.length < 4) {
    return null; // not enough data points
  }

  // Split into two halves: older vs recent
  const midpoint = Math.floor(timeline.length / 2);
  const olderHalf = timeline.slice(0, midpoint);
  const recentHalf = timeline.slice(midpoint);

  const olderAvg =
    olderHalf.reduce((sum, p) => sum + (p.value?.[0] || 0), 0) /
    olderHalf.length;
  const recentAvg =
    recentHalf.reduce((sum, p) => sum + (p.value?.[0] || 0), 0) /
    recentHalf.length;

  // Calculate velocity: how much did interest change?
  // olderAvg of 0 means the tool had no search interest before
  if (olderAvg === 0 && recentAvg === 0) return 10; // no interest at all
  if (olderAvg === 0 && recentAvg > 0) return 95; // new breakout

  const changeRatio = recentAvg / olderAvg;

  // Map the change ratio to a 0-100 score:
  //   ratio 0.5  -> ~20  (declining fast)
  //   ratio 0.8  -> ~40  (declining slowly)
  //   ratio 1.0  -> ~50  (flat)
  //   ratio 1.2  -> ~65  (growing)
  //   ratio 1.5  -> ~80  (growing fast)
  //   ratio 2.0+ -> ~95  (exploding)

  // Also factor in absolute recent interest level
  // A tool trending at recentAvg=80 with 1.2x growth is hotter than
  // one at recentAvg=5 with 1.5x growth
  const velocityScore = Math.min(100, Math.max(0, 50 + (changeRatio - 1) * 100));

  // Absolute interest factor (0-100 from Google, normalized)
  const absoluteScore = Math.min(100, recentAvg);

  // Blend: 60% velocity (are you trending?), 40% absolute (are you relevant?)
  const blended = velocityScore * 0.6 + absoluteScore * 0.4;

  return Math.round(Math.min(100, Math.max(0, blended)));
}

/**
 * Fetch Google Trends scores for all tools.
 * @param {Array} tools - Tool config objects from config.js
 * @returns {Map<string, number>} toolName -> score (0-100)
 */
async function fetchGoogleTrends(tools) {
  const scores = new Map();
  let successCount = 0;
  let failCount = 0;

  for (const tool of tools) {
    try {
      const searchTerm = tool.searchTerms[0];
      const score = await fetchSingleTrend(searchTerm);

      if (score !== null) {
        scores.set(tool.name, score);
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      failCount++;
      console.warn(`[GoogleTrends] Failed for ${tool.name}: ${err.message}`);
    }

    // Rate limiting delay between requests
    await sleep(DELAY_MS);
  }

  console.log(
    `[GoogleTrends] Completed: ${successCount} success, ${failCount} failed`
  );
  return scores;
}

module.exports = { fetchGoogleTrends };
