/**
 * ProductHunt Discoverer
 *
 * Fetches top AI tools from ProductHunt's public GraphQL API.
 * Returns an array of raw tool objects: { name, description, url, category }
 *
 * Auth priority:
 *   1. PRODUCTHUNT_DEV_TOKEN (developer token — simplest, no round trip)
 *   2. PRODUCTHUNT_CLIENT_ID + PRODUCTHUNT_CLIENT_SECRET (OAuth client credentials)
 * Falls back gracefully if neither is available.
 */

// Map ProductHunt topics to our category keys
const TOPIC_TO_CATEGORY = {
  'artificial-intelligence': 'writing',
  'developer-tools': 'coding',
  'design-tools': 'design',
  'video': 'video',
  'productivity': 'automation',
  'marketing': 'marketing',
  'audio': 'audio',
  'research': 'research',
  'writing-tools': 'writing',
  'no-code': 'automation',
  'music': 'audio',
  'image-generation': 'design',
  'chatbots': 'writing',
  'code-editors': 'coding',
};

// Keywords that imply AI nature
const AI_KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'generative', 'neural'];

/**
 * Resolve the bearer token to use for ProductHunt API calls.
 * Prefers the developer token (no network call), falls back to OAuth.
 */
async function getProductHuntToken() {
  // Prefer dev token — no round trip needed
  if (process.env.PRODUCTHUNT_DEV_TOKEN) {
    return process.env.PRODUCTHUNT_DEV_TOKEN;
  }

  const clientId = process.env.PRODUCTHUNT_CLIENT_ID;
  const clientSecret = process.env.PRODUCTHUNT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('No ProductHunt credentials set (PRODUCTHUNT_DEV_TOKEN or CLIENT_ID/SECRET)');
  }

  const resp = await fetch('https://api.producthunt.com/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!resp.ok) throw new Error(`ProductHunt OAuth failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

/**
 * Query ProductHunt GraphQL API for top posts in a topic.
 */
async function fetchTopicPosts(token, topic, limit = 20) {
  const query = `
    query TopicPosts($topic: String!, $limit: Int!) {
      posts(topic: $topic, order: VOTES, first: $limit) {
        edges {
          node {
            name
            tagline
            description
            website
            votesCount
            topics {
              edges {
                node { slug }
              }
            }
          }
        }
      }
    }
  `;

  const resp = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { topic, limit } }),
  });

  if (!resp.ok) throw new Error(`ProductHunt GraphQL failed: ${resp.status}`);
  const data = await resp.json();
  return data?.data?.posts?.edges?.map(e => e.node) || [];
}

/**
 * Infer category from ProductHunt topics array
 */
function inferCategory(topicEdges) {
  for (const edge of topicEdges || []) {
    const slug = edge?.node?.slug || '';
    if (TOPIC_TO_CATEGORY[slug]) return TOPIC_TO_CATEGORY[slug];
  }
  return 'writing'; // default
}

/**
 * Check if a post is AI-related
 */
function isAITool(post) {
  const text = `${post.name} ${post.tagline} ${post.description}`.toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * Fetch top AI tools from ProductHunt.
 * Returns array of { name, description, url, category, votes, source }
 */
async function fetchProductHunt() {
  const results = [];

  let token;
  try {
    token = await getProductHuntToken();
  } catch (err) {
    console.warn('[ProductHunt] Auth failed, skipping:', err.message);
    return results;
  }

  // Fetch from AI-focused topics
  const topics = ['artificial-intelligence', 'developer-tools', 'design-tools', 'productivity'];

  const fetches = topics.map(topic =>
    fetchTopicPosts(token, topic, 25).catch(err => {
      console.warn(`[ProductHunt] Failed topic ${topic}:`, err.message);
      return [];
    })
  );

  const allPosts = (await Promise.all(fetches)).flat();

  // Deduplicate by name (case-insensitive)
  const seen = new Set();
  for (const post of allPosts) {
    const key = post.name.toLowerCase().trim();
    if (seen.has(key)) continue;
    if (!isAITool(post)) continue;
    seen.add(key);

    results.push({
      name: post.name.trim(),
      description: post.tagline || post.description || '',
      url: post.website || '',
      category: inferCategory(post.topics?.edges),
      votes: post.votesCount || 0,
      source: 'producthunt',
    });
  }

  console.log(`[ProductHunt] Discovered ${results.length} AI tools`);
  return results;
}

module.exports = { fetchProductHunt };
