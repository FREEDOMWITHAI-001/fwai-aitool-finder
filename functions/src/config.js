/**
 * Tool configuration and category-aware signal weights.
 *
 * Each tool has:
 *   - searchTerms: what to query in Google Trends / Reddit / HN
 *   - githubRepo: owner/repo for star velocity (null if not applicable)
 *   - primary: category key used to pick the right weight profile
 *
 * Weight profiles per category ensure dev tools lean on GitHub/HN
 * while creative tools lean on Google Trends / Reddit.
 */

const CATEGORY_WEIGHTS = {
  // Weights must sum to 1.0 per category
  coding: {
    googleTrends: 0.25,
    reddit: 0.20,
    hackerNews: 0.25,
    github: 0.30,
  },
  video: {
    googleTrends: 0.45,
    reddit: 0.35,
    hackerNews: 0.10,
    github: 0.10,
  },
  design: {
    googleTrends: 0.45,
    reddit: 0.35,
    hackerNews: 0.10,
    github: 0.10,
  },
  writing: {
    googleTrends: 0.50,
    reddit: 0.35,
    hackerNews: 0.10,
    github: 0.05,
  },
  marketing: {
    googleTrends: 0.50,
    reddit: 0.30,
    hackerNews: 0.10,
    github: 0.10,
  },
  audio: {
    googleTrends: 0.45,
    reddit: 0.35,
    hackerNews: 0.10,
    github: 0.10,
  },
  research: {
    googleTrends: 0.40,
    reddit: 0.30,
    hackerNews: 0.20,
    github: 0.10,
  },
  automation: {
    googleTrends: 0.35,
    reddit: 0.25,
    hackerNews: 0.15,
    github: 0.25,
  },
};

/**
 * When a signal source fails, we redistribute its weight
 * proportionally among the remaining sources.
 */
function getAdjustedWeights(category, availableSignals) {
  const base = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS.writing;
  const available = {};
  let totalAvailable = 0;

  for (const signal of availableSignals) {
    if (base[signal] !== undefined) {
      available[signal] = base[signal];
      totalAvailable += base[signal];
    }
  }

  // Re-normalize so weights sum to 1.0
  const adjusted = {};
  for (const [signal, weight] of Object.entries(available)) {
    adjusted[signal] = totalAvailable > 0 ? weight / totalAvailable : 0;
  }

  return adjusted;
}

/**
 * Master tool list.
 *
 * searchTerms: array of strings to query across signal sources.
 *   First element is the primary term, extras catch alternate names.
 *
 * githubRepo: "owner/repo" string, or null for non-OSS / non-dev tools.
 *   Used only by the GitHub star velocity fetcher.
 */
const TOOLS = [
  // ── VIDEO (10) ─────────────────────────────────────────────
  { name: "Google Veo 3", primary: "video", searchTerms: ["Google Veo 3", "Veo 3 AI video"], githubRepo: null },
  { name: "HeyGen", primary: "video", searchTerms: ["HeyGen AI", "HeyGen avatar"], githubRepo: null },
  { name: "Sora", primary: "video", searchTerms: ["OpenAI Sora", "Sora AI video"], githubRepo: null },
  { name: "Kling AI", primary: "video", searchTerms: ["Kling AI video"], githubRepo: null },
  { name: "Runway", primary: "video", searchTerms: ["Runway ML", "Runway AI video"], githubRepo: null },
  { name: "CapCut", primary: "video", searchTerms: ["CapCut AI", "CapCut video editor"], githubRepo: null },
  { name: "Opus Clip", primary: "video", searchTerms: ["Opus Clip AI", "OpusClip"], githubRepo: null },
  { name: "Pictory", primary: "video", searchTerms: ["Pictory AI", "Pictory video"], githubRepo: null },
  { name: "Descript", primary: "video", searchTerms: ["Descript AI", "Descript video editor"], githubRepo: null },
  { name: "Luma Dream Machine", primary: "video", searchTerms: ["Luma Dream Machine", "Luma AI video"], githubRepo: null },

  // ── CODING (10) ────────────────────────────────────────────
  { name: "Cursor", primary: "coding", searchTerms: ["Cursor AI editor", "Cursor IDE"], githubRepo: null },
  { name: "Windsurf", primary: "coding", searchTerms: ["Windsurf IDE", "Codeium Windsurf"], githubRepo: null },
  { name: "Claude Code", primary: "coding", searchTerms: ["Claude Code", "Anthropic Claude Code"], githubRepo: null },
  { name: "GitHub Copilot", primary: "coding", searchTerms: ["GitHub Copilot"], githubRepo: null },
  { name: "Bolt.new", primary: "coding", searchTerms: ["Bolt.new AI", "Bolt new coding"], githubRepo: "stackblitz/bolt.new" },
  { name: "Lovable", primary: "coding", searchTerms: ["Lovable dev", "Lovable AI builder"], githubRepo: null },
  { name: "OpenAI Codex", primary: "coding", searchTerms: ["OpenAI Codex", "Codex AI"], githubRepo: null },
  { name: "Gemini Code Assist", primary: "coding", searchTerms: ["Gemini Code Assist", "Google Gemini coding"], githubRepo: null },
  { name: "Replit Agent", primary: "coding", searchTerms: ["Replit Agent", "Replit AI"], githubRepo: null },
  { name: "v0 by Vercel", primary: "coding", searchTerms: ["v0 Vercel AI", "v0.dev"], githubRepo: null },

  // ── DESIGN (8) ─────────────────────────────────────────────
  { name: "Midjourney", primary: "design", searchTerms: ["Midjourney AI", "Midjourney v7"], githubRepo: null },
  { name: "Canva Magic Studio", primary: "design", searchTerms: ["Canva Magic Studio", "Canva AI"], githubRepo: null },
  { name: "Adobe Firefly", primary: "design", searchTerms: ["Adobe Firefly AI"], githubRepo: null },
  { name: "Figma AI", primary: "design", searchTerms: ["Figma AI", "Figma Make"], githubRepo: null },
  { name: "Flux", primary: "design", searchTerms: ["Flux AI image", "Black Forest Labs Flux"], githubRepo: "black-forest-labs/flux" },
  { name: "Ideogram", primary: "design", searchTerms: ["Ideogram AI"], githubRepo: null },
  { name: "Recraft.ai", primary: "design", searchTerms: ["Recraft AI", "Recraft design"], githubRepo: null },
  { name: "Leonardo.ai", primary: "design", searchTerms: ["Leonardo AI", "Leonardo art"], githubRepo: null },

  // ── WRITING (8) ────────────────────────────────────────────
  { name: "ChatGPT", primary: "writing", searchTerms: ["ChatGPT", "OpenAI ChatGPT"], githubRepo: null },
  { name: "Claude", primary: "writing", searchTerms: ["Claude AI", "Anthropic Claude"], githubRepo: null },
  { name: "Grammarly", primary: "writing", searchTerms: ["Grammarly AI"], githubRepo: null },
  { name: "Notion AI", primary: "writing", searchTerms: ["Notion AI"], githubRepo: null },
  { name: "Perplexity", primary: "writing", searchTerms: ["Perplexity AI search"], githubRepo: null },
  { name: "Writesonic", primary: "writing", searchTerms: ["Writesonic AI"], githubRepo: null },
  { name: "QuillBot", primary: "writing", searchTerms: ["QuillBot AI"], githubRepo: null },
  { name: "Jasper", primary: "writing", searchTerms: ["Jasper AI writing"], githubRepo: null },

  // ── MARKETING (7) ──────────────────────────────────────────
  { name: "HubSpot AI", primary: "marketing", searchTerms: ["HubSpot AI", "HubSpot Breeze"], githubRepo: null },
  { name: "Surfer SEO", primary: "marketing", searchTerms: ["Surfer SEO AI"], githubRepo: null },
  { name: "Copy.ai", primary: "marketing", searchTerms: ["Copy AI marketing"], githubRepo: null },
  { name: "Semrush AI", primary: "marketing", searchTerms: ["Semrush AI"], githubRepo: null },
  { name: "AdCreative.ai", primary: "marketing", searchTerms: ["AdCreative AI"], githubRepo: null },
  { name: "Mailchimp AI", primary: "marketing", searchTerms: ["Mailchimp AI", "Mailchimp automation"], githubRepo: null },
  { name: "Instantly.ai", primary: "marketing", searchTerms: ["Instantly AI email"], githubRepo: null },

  // ── AUDIO (8) ──────────────────────────────────────────────
  { name: "ElevenLabs", primary: "audio", searchTerms: ["ElevenLabs AI", "ElevenLabs voice"], githubRepo: null },
  { name: "Suno", primary: "audio", searchTerms: ["Suno AI music"], githubRepo: null },
  { name: "Murf AI", primary: "audio", searchTerms: ["Murf AI voice"], githubRepo: null },
  { name: "Speechify", primary: "audio", searchTerms: ["Speechify AI"], githubRepo: null },
  { name: "Udio", primary: "audio", searchTerms: ["Udio AI music"], githubRepo: null },
  { name: "LALAL.AI", primary: "audio", searchTerms: ["LALAL AI", "LALAL stem separation"], githubRepo: null },
  { name: "Krisp", primary: "audio", searchTerms: ["Krisp AI noise", "Krisp noise cancellation"], githubRepo: null },
  { name: "AIVA", primary: "audio", searchTerms: ["AIVA AI music"], githubRepo: null },

  // ── RESEARCH (7) ───────────────────────────────────────────
  { name: "NotebookLM", primary: "research", searchTerms: ["NotebookLM", "Google NotebookLM"], githubRepo: null },
  { name: "Elicit", primary: "research", searchTerms: ["Elicit AI research"], githubRepo: null },
  { name: "Consensus", primary: "research", searchTerms: ["Consensus AI research"], githubRepo: null },
  { name: "Scite AI", primary: "research", searchTerms: ["Scite AI citation"], githubRepo: null },
  { name: "Semantic Scholar", primary: "research", searchTerms: ["Semantic Scholar AI"], githubRepo: null },
  { name: "Julius AI", primary: "research", searchTerms: ["Julius AI data", "Julius data analysis"], githubRepo: null },
  { name: "Scispace", primary: "research", searchTerms: ["Scispace AI", "Typeset AI research"], githubRepo: null },

  // ── AUTOMATION (8) ──────────────────────────────────────────
  { name: "n8n", primary: "automation", searchTerms: ["n8n automation", "n8n AI"], githubRepo: "n8n-io/n8n" },
  { name: "Make.com", primary: "automation", searchTerms: ["Make.com automation", "Make AI"], githubRepo: null },
  { name: "Zapier Central", primary: "automation", searchTerms: ["Zapier Central AI", "Zapier AI"], githubRepo: null },
  { name: "Gumloop", primary: "automation", searchTerms: ["Gumloop AI"], githubRepo: null },
  { name: "UiPath", primary: "automation", searchTerms: ["UiPath AI RPA"], githubRepo: null },
  { name: "Bardeen", primary: "automation", searchTerms: ["Bardeen AI automation"], githubRepo: null },
  { name: "Activepieces", primary: "automation", searchTerms: ["Activepieces automation"], githubRepo: "activepieces/activepieces" },
  { name: "Lindy AI", primary: "automation", searchTerms: ["Lindy AI agent", "Lindy automation"], githubRepo: null },
];

module.exports = { TOOLS, CATEGORY_WEIGHTS, getAdjustedWeights };
