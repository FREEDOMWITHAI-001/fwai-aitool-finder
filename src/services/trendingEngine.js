import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getApps } from 'firebase/app';

// Get existing Firestore instance
function getDb() {
  const apps = getApps();
  if (apps.length === 0) return null;
  return getFirestore(apps[0]);
}

// In-memory cache to avoid repeated Firestore reads per session
let cachedScores = null;
let cachedAt = 0;
const CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes client-side cache

/** Extract { toolName: score } map from a Firestore trendingCache document */
function extractScores(data) {
  if (data.tools && Array.isArray(data.tools)) {
    const scores = {};
    for (const t of data.tools) {
      if (t.name && typeof t.trendScore === 'number') scores[t.name] = t.trendScore;
    }
    return scores;
  }
  if (data.scores && typeof data.scores === 'object') return data.scores;
  return null;
}

/**
 * Fetch cached trending scores from Firestore
 * Returns { scores, updatedAt } or null if missing/expired
 */
export async function getCachedTrendingScores() {
  // Check in-memory cache first
  if (cachedScores && (Date.now() - cachedAt < CLIENT_CACHE_TTL)) {
    return cachedScores;
  }

  try {
    const db = getDb();
    if (!db) return null;

    const snap = await getDoc(doc(db, 'trendingCache', 'latest'));
    if (!snap.exists()) return null;

    const data = snap.data();
    if (!data.updatedAt) return null;

    const scores = extractScores(data);
    if (!scores) return null;

    // Check if cache is still valid (12-hour TTL from Cloud Function)
    const updatedAt = new Date(data.updatedAt).getTime();
    const ttl = 12 * 60 * 60 * 1000;
    const expiresAt = updatedAt + ttl;

    const result = {
      scores,
      updatedAt: data.updatedAt,
      expired: Date.now() > expiresAt,
    };

    // Cache in memory
    cachedScores = result;
    cachedAt = Date.now();

    return result;
  } catch (err) {
    console.error('[TrendingEngine] Failed to read cache:', err.message);
    return null;
  }
}

/**
 * Merge dynamic scores with static tool data
 * Returns tools sorted by effective trendScore (dynamic > static fallback)
 */
export async function getToolsWithDynamicScores(toolsList, category = null) {
  const cached = await getCachedTrendingScores();

  let filtered = category
    ? toolsList.filter(t => t.primary === category.toLowerCase())
    : [...toolsList];

  if (cached && cached.scores) {
    // Overlay dynamic scores
    filtered = filtered.map(tool => ({
      ...tool,
      trendScore: cached.scores[tool.name] ?? tool.trendScore ?? 50,
      isDynamic: cached.scores[tool.name] != null,
    }));
  }

  // Sort by trendScore descending, then rating as tie-breaker
  filtered.sort((a, b) => {
    const trendDiff = (b.trendScore || 0) - (a.trendScore || 0);
    if (trendDiff !== 0) return trendDiff;
    return b.rating - a.rating;
  });

  return filtered;
}

/**
 * Get just the updatedAt timestamp for display
 */
export async function getTrendingLastUpdated() {
  const cached = await getCachedTrendingScores();
  return cached?.updatedAt || null;
}

/**
 * Subscribe to real-time trending score updates via Firestore onSnapshot.
 * Calls callback with { scores, updatedAt, isStale } whenever the cache updates.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeTrendingScores(callback) {
  const db = getDb();
  if (!db) return () => {};

  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

  return onSnapshot(doc(db, 'trendingCache', 'latest'), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    const scores = extractScores(data);
    if (!scores) return;

    const updatedAt = data.updatedAt || null;
    const hoursSinceUpdate = updatedAt
      ? (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)
      : Infinity;
    const isStale = hoursSinceUpdate > 24;

    // Extract discovered tools (those flagged _isDiscovered by the Cloud Function)
    const discoveredTools = (data.tools || [])
      .filter(t => t._isDiscovered)
      .map(t => ({
        name: t.name,
        primary: t.primary,
        trendScore: t.trendScore,
        description: t._description || '',
        url: t._url || '',
        discoveredAt: t._discoveredAt || null,
        isDiscovered: true,
      }));

    // Also update the in-memory cache so one-shot reads stay fresh
    cachedScores = { scores, updatedAt, expired: isStale };
    cachedAt = Date.now();

    callback({ scores, updatedAt, isStale, discoveredTools });
  }, (err) => {
    console.error('[TrendingEngine] onSnapshot error:', err.message);
  });
}

