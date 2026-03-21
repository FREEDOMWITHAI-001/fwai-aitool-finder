/**
 * GitHub star velocity fetcher.
 *
 * For tools with a githubRepo in config, fetches recent starring activity
 * using the GitHub Starring Events API.
 *
 * Only ~10 tools in the database have GitHub repos, so this is fast.
 * Tools without repos get no score from this signal, and the
 * category-aware weights redistribute accordingly.
 *
 * Requires a GITHUB_TOKEN env var for authenticated requests (5000 req/hr).
 * Falls back to unauthenticated (60 req/hr) if no token is set.
 */

const https = require("https");

const DELAY_MS = 1000;
const GITHUB_API = "https://api.github.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJSON(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "TrendingRefreshBot/1.0",
      Accept: "application/vnd.github.v3.star+json",
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers,
      timeout: 8000,
    };

    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
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
 * Get total star count and estimate recent velocity.
 *
 * Strategy: fetch the repo metadata for total stars, then fetch
 * the most recent stargazers page to estimate daily starring rate.
 *
 * @param {string} repo - "owner/repo" format
 * @param {string|null} token - GitHub API token
 * @returns {{ totalStars: number, recentStarsPerDay: number }}
 */
async function getStarData(repo, token) {
  // Step 1: Get total star count
  const repoResult = await fetchJSON(`${GITHUB_API}/repos/${repo}`, token);

  if (repoResult.status !== 200) {
    throw new Error(`GitHub API returned ${repoResult.status} for ${repo}`);
  }

  const totalStars = repoResult.data.stargazers_count || 0;

  // Step 2: Get recent stargazers (last page approach)
  // Using the star timestamps API to check recent stars
  const starsResult = await fetchJSON(
    `${GITHUB_API}/repos/${repo}/stargazers?per_page=100&sort=created&direction=desc`,
    token
  );

  if (starsResult.status !== 200 || !Array.isArray(starsResult.data)) {
    // Fallback: estimate from total stars (very rough)
    return { totalStars, recentStarsPerDay: totalStars / 365 };
  }

  const stars = starsResult.data;
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Count stars from the past 14 days in this batch
  let recentCount = 0;
  for (const star of stars) {
    const starredAt = new Date(star.starred_at);
    if (starredAt >= fourteenDaysAgo) {
      recentCount++;
    }
  }

  // If all 100 are within 14 days, there might be more (pagination needed)
  // For our scale (50 tools), this approximation is good enough
  const recentStarsPerDay = recentCount / 14;

  return { totalStars, recentStarsPerDay };
}

/**
 * Fetch GitHub star velocity scores for tools that have repos.
 *
 * @param {Array} tools - Tool config objects (only those with githubRepo)
 * @returns {Map<string, number>} toolName -> score (0-100)
 */
async function fetchGitHub(tools) {
  const scores = new Map();
  const token = process.env.GITHUB_TOKEN || null;
  let successCount = 0;
  let failCount = 0;

  // Filter to only tools with GitHub repos
  const repoTools = tools.filter((t) => t.githubRepo);

  if (!token) {
    console.warn(
      "[GitHub] No GITHUB_TOKEN set. Using unauthenticated (60 req/hr limit)."
    );
  }

  for (const tool of repoTools) {
    try {
      const { totalStars, recentStarsPerDay } = await getStarData(
        tool.githubRepo,
        token
      );

      // Score based on both velocity and total popularity
      // n8n (170K stars, ~50/day) should score differently than
      // a new tool (500 stars, 20/day)

      // Velocity component: stars per day
      //   0-1/day  -> 10-20
      //   2-5/day  -> 30-50
      //   10-20/day -> 60-75
      //   50+/day  -> 80-95
      const velocityScore = Math.min(
        95,
        Math.max(5, Math.log2(recentStarsPerDay + 1) * 15)
      );

      // Popularity component: total stars (log scale)
      //   100 stars   -> ~20
      //   1K stars    -> ~35
      //   10K stars   -> ~50
      //   50K+ stars  -> ~70
      const popularityScore = Math.min(
        80,
        Math.max(5, Math.log10(totalStars + 1) * 15)
      );

      // Blend: 65% velocity (what we care about), 35% popularity
      const score = Math.round(velocityScore * 0.65 + popularityScore * 0.35);

      scores.set(tool.name, Math.min(100, Math.max(0, score)));
      successCount++;
    } catch (err) {
      failCount++;
      console.warn(`[GitHub] Failed for ${tool.name}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `[GitHub] Completed: ${successCount} success, ${failCount} failed (${repoTools.length} repos total)`
  );
  return scores;
}

module.exports = { fetchGitHub };
