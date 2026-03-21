/**
 * Quick test — runs 3 tools through all 4 fetchers
 * Run: node test.js
 */

require("dotenv").config();
const { fetchGoogleTrends } = require("./src/fetchers/googleTrends");
const { fetchReddit } = require("./src/fetchers/reddit");
const { fetchHackerNews } = require("./src/fetchers/hackerNews");
const { fetchGitHub } = require("./src/fetchers/github");

const TEST_TOOLS = [
  { name: "Cursor", primary: "coding", searchTerms: ["Cursor AI editor"], githubRepo: null },
  { name: "ElevenLabs", primary: "audio", searchTerms: ["ElevenLabs AI voice"], githubRepo: null },
  { name: "n8n", primary: "automation", searchTerms: ["n8n automation"], githubRepo: "n8n-io/n8n" },
];

async function runTest() {
  console.log("🧪 Testing all 4 signal fetchers with 3 tools...\n");

  // 1. GitHub
  console.log("── GitHub ──────────────────────────────");
  try {
    const scores = await fetchGitHub(TEST_TOOLS);
    console.log("✅ Results:", Object.fromEntries(scores));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }

  // 2. Hacker News
  console.log("\n── Hacker News ─────────────────────────");
  try {
    const scores = await fetchHackerNews(TEST_TOOLS);
    console.log("✅ Results:", Object.fromEntries(scores));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }

  // 3. Reddit
  console.log("\n── Reddit ──────────────────────────────");
  try {
    const scores = await fetchReddit(TEST_TOOLS);
    console.log("✅ Results:", Object.fromEntries(scores));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }

  // 4. Google Trends
  console.log("\n── Google Trends ───────────────────────");
  try {
    const scores = await fetchGoogleTrends(TEST_TOOLS);
    console.log("✅ Results:", Object.fromEntries(scores));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }

  console.log("\n✅ Test complete!");
}

runTest();
