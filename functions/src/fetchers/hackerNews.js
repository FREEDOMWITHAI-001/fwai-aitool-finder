/**
 * Hacker News mention velocity fetcher.
 *
 * Uses the Algolia HN Search API (completely free, no auth, generous limits).
 * Endpoint: https://hn.algolia.com/api/v1/search
 *
 * Compares story/comment mentions in the past 7 days vs prior 7 days
 * to compute a velocity score.
 *
 * This signal is strongest for coding/dev/automation tools and weakest
 * for creative tools (video, audio, design). The category-aware weights
 * in config.js handle this -- we just return raw scores here.
 */

const https = require("https");

const DELAY_MS = 500; // Algolia is generous, 500ms is plenty
const HN_API = "https://hn.algolia.com/api/v1/search";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 8000 }, (res) => {
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
 * Count HN stories/comments mentioning a term after a given timestamp.
 *
 * @param {string} query - Search term
 * @param {number} afterTimestamp - Unix timestamp (seconds)
 * @returns {number} Number of hits
 */
async function countHNMentions(query, afterTimestamp) {
  const encoded = encodeURIComponent(query);
  const url = `${HN_API}?query=${encoded}&tags=(story,comment)&numericFilters=created_at_i>${afterTimestamp}&hitsPerPage=0`;

  const result = await fetchJSON(url);
  return result?.nbHits || 0;
}

/**
 * Fetch HN velocity scores for all tools.
 *
 * @param {Array} tools - Tool config objects from config.js
 * @returns {Map<string, number>} toolName -> score (0-100)
 */
async function fetchHackerNews(tools) {
  const scores = new Map();
  let successCount = 0;
  let failCount = 0;

  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60;

  for (const tool of tools) {
    try {
      const query = tool.searchTerms[0];

      // Mentions in the past 7 days
      const recentCount = await countHNMentions(query, sevenDaysAgo);
      await sleep(DELAY_MS);

      // Mentions in the 7 days before that (days 8-14)
      // Total in past 14 days minus past 7 days
      const totalTwoWeeks = await countHNMentions(query, fourteenDaysAgo);
      await sleep(DELAY_MS);

      const priorCount = Math.max(0, totalTwoWeeks - recentCount);

      let score;

      if (recentCount === 0 && priorCount === 0) {
        // No HN presence at all
        score = 5;
      } else if (priorCount === 0 && recentCount > 0) {
        // New appearance on HN
        score = Math.min(90, 55 + recentCount * 5);
      } else {
        const velocity = priorCount > 0 ? recentCount / priorCount : 1;

        // Map velocity to 0-100
        const velocityScore = Math.min(
          100,
          Math.max(0, 50 + (velocity - 1) * 60)
        );

        // Volume factor: more mentions = higher confidence
        const volumeBonus = Math.min(25, recentCount * 1.5);

        score = Math.round(
          Math.min(100, velocityScore * 0.7 + volumeBonus + 5)
        );
      }

      scores.set(tool.name, score);
      successCount++;
    } catch (err) {
      failCount++;
      console.warn(`[HackerNews] Failed for ${tool.name}: ${err.message}`);
    }
  }

  console.log(
    `[HackerNews] Completed: ${successCount} success, ${failCount} failed`
  );
  return scores;
}

module.exports = { fetchHackerNews };
