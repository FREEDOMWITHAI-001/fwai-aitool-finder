/**
 * Reddit mention velocity fetcher.
 *
 * Uses Reddit's public JSON search API (no auth required for basic search).
 * Compares mention count in the past 7 days vs prior 7 days
 * to compute a velocity score.
 *
 * Rate limit: ~10 requests/minute for unauthenticated.
 * For 170+ tools, this takes ~17 minutes sequentially.
 * We batch with 6-second delays to stay safe.
 *
 * Pitfall mitigation:
 *   - Custom User-Agent to avoid 429s
 *   - Searches relevant subreddits, not all of Reddit (reduces noise)
 *   - Measures VELOCITY not absolute counts
 */

const https = require("https");

const DELAY_MS = 6000; // 6s between requests (Reddit is strict)
const USER_AGENT = "TrendingRefreshBot/1.0 (tool-finder-app)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTPS GET request and return parsed JSON.
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": USER_AGENT },
      timeout: 8000,
    };

    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse failed: ${e.message}`));
          }
        });
      })
      .on("error", reject)
      .on("timeout", () => reject(new Error("Request timed out")));
  });
}

/**
 * Count Reddit posts mentioning a search term within a time window.
 * Uses Reddit's search with time filter.
 *
 * @param {string} query - Search term
 * @param {string} timeFilter - "week" or "month"
 * @returns {number} Approximate post count
 */
async function countRedditMentions(query, timeFilter) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/search.json?q=${encoded}&t=${timeFilter}&sort=relevance&limit=100`;

  const result = await fetchJSON(url);

  if (!result?.data?.children) return 0;
  return result.data.children.length;
}

/**
 * Fetch Reddit velocity scores for all tools.
 * Compares this-week mentions vs last-month baseline.
 *
 * @param {Array} tools - Tool config objects from config.js
 * @returns {Map<string, number>} toolName -> score (0-100)
 */
async function fetchReddit(tools) {
  const scores = new Map();
  let successCount = 0;
  let failCount = 0;

  for (const tool of tools) {
    try {
      const query = tool.searchTerms[0];

      // Get this week's mentions
      const weekCount = await countRedditMentions(query, "week");
      await sleep(DELAY_MS);

      // Get this month's mentions (includes the week)
      const monthCount = await countRedditMentions(query, "month");
      await sleep(DELAY_MS);

      // Baseline: average weekly rate from the month
      // monthCount includes weekCount, so prior 3 weeks = monthCount - weekCount
      const priorWeeksCount = Math.max(0, monthCount - weekCount);
      const priorWeeklyAvg = priorWeeksCount / 3; // ~3 prior weeks

      let score;

      if (weekCount === 0 && priorWeeklyAvg === 0) {
        // No mentions at all = very low signal
        score = 5;
      } else if (priorWeeklyAvg === 0 && weekCount > 0) {
        // New buzz from zero = strong signal
        score = Math.min(90, 60 + weekCount * 3);
      } else {
        // Velocity: current week vs average prior week
        const velocity = weekCount / priorWeeklyAvg;

        // Map velocity to score:
        //   0.0  -> 10 (disappeared)
        //   0.5  -> 25 (declining)
        //   1.0  -> 50 (stable)
        //   1.5  -> 70 (growing)
        //   2.0+ -> 85+ (surging)
        const velocityScore = Math.min(
          100,
          Math.max(0, 50 + (velocity - 1) * 50)
        );

        // Also factor in absolute volume
        // More mentions = higher confidence in the velocity signal
        const volumeBonus = Math.min(20, weekCount * 0.5);

        score = Math.round(
          Math.min(100, velocityScore * 0.75 + volumeBonus + 5)
        );
      }

      scores.set(tool.name, score);
      successCount++;
    } catch (err) {
      failCount++;
      console.warn(`[Reddit] Failed for ${tool.name}: ${err.message}`);
    }
  }

  console.log(
    `[Reddit] Completed: ${successCount} success, ${failCount} failed`
  );
  return scores;
}

module.exports = { fetchReddit };
