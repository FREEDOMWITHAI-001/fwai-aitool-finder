/**
 * Core scoring engine.
 *
 * Combines signal scores from all fetchers using category-aware weights,
 * then applies three safety layers:
 *
 * 1. Anomaly detection: if one signal disagrees with the others by >2 SD,
 *    dampen its contribution for this cycle.
 *
 * 2. Historical smoothing: new_score = 0.6 * computed + 0.4 * previous.
 *    This creates natural momentum and prevents wild swings.
 *
 * 3. Max change guard: no tool can move more than 15 points per 12h cycle.
 *    Prevents a single bad API response from reshuffling the entire list.
 */

const { getAdjustedWeights } = require("./config");

/**
 * Detect if a signal value is an outlier relative to the others.
 * Returns a dampening factor: 1.0 (trust fully) to 0.3 (heavily dampened).
 */
function getOutlierDampening(signalValue, allValues) {
  if (allValues.length < 3) return 1.0; // not enough signals to detect outliers

  const mean = allValues.reduce((s, v) => s + v, 0) / allValues.length;
  const variance =
    allValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 1.0; // all values are the same

  const zScore = Math.abs(signalValue - mean) / stdDev;

  // z > 2 = outlier, dampen progressively
  if (zScore > 3) return 0.3;
  if (zScore > 2) return 0.5;
  if (zScore > 1.5) return 0.8;
  return 1.0;
}

/**
 * Compute a single tool's composite trending score.
 *
 * @param {Object} tool - Tool config from config.js
 * @param {Object} signals - { googleTrends: Map, reddit: Map, hackerNews: Map, github: Map }
 * @returns {number|null} Computed score 0-100, or null if insufficient data
 */
function computeToolScore(tool, signals) {
  // Collect available signal values for this tool
  const available = {};
  const availableKeys = [];
  const allValues = [];

  const signalMap = {
    googleTrends: signals.googleTrends,
    reddit: signals.reddit,
    hackerNews: signals.hackerNews,
    github: signals.github,
  };

  for (const [key, map] of Object.entries(signalMap)) {
    if (map && map.has(tool.name)) {
      const val = map.get(tool.name);
      available[key] = val;
      availableKeys.push(key);
      allValues.push(val);
    }
  }

  // Require at least 1 signal to compute a score
  if (availableKeys.length < 1) {
    console.warn(
      `[Scoring] ${tool.name}: no signals available, skipping`
    );
    return null;
  }

  // Get category-aware weights adjusted for which signals we have
  const weights = getAdjustedWeights(tool.primary, availableKeys);

  // Apply outlier dampening
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [signal, weight] of Object.entries(weights)) {
    if (available[signal] !== undefined) {
      const dampening = getOutlierDampening(available[signal], allValues);
      const effectiveWeight = weight * dampening;
      weightedSum += available[signal] * effectiveWeight;
      totalWeight += effectiveWeight;
    }
  }

  if (totalWeight === 0) return null;

  const rawScore = weightedSum / totalWeight;
  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Apply historical smoothing and max-change guards.
 *
 * @param {number} newScore - Freshly computed score
 * @param {number|null} previousScore - Score from last cycle (null if first run)
 * @param {Object} options
 * @param {number} options.smoothingFactor - Weight of new score (0-1), default 0.6
 * @param {number} options.maxChange - Max points change per cycle, default 15
 * @returns {number} Final guarded score
 */
function applySmoothing(newScore, previousScore, options = {}) {
  const { smoothingFactor = 0.6, maxChange = 15 } = options;

  // First run: no smoothing needed
  if (previousScore === null || previousScore === undefined) {
    return newScore;
  }

  // Step 1: Smooth with historical value
  const smoothed = Math.round(
    newScore * smoothingFactor + previousScore * (1 - smoothingFactor)
  );

  // Step 2: Clamp to max change per cycle
  const diff = smoothed - previousScore;
  if (Math.abs(diff) > maxChange) {
    const clamped = previousScore + Math.sign(diff) * maxChange;
    console.log(
      `[Scoring] ${newScore} -> ${smoothed} clamped to ${clamped} (max change ${maxChange})`
    );
    return clamped;
  }

  return smoothed;
}

/**
 * Score all tools and return the full snapshot.
 *
 * @param {Array} tools - Tool configs from config.js
 * @param {Object} signals - { googleTrends: Map, reddit: Map, hackerNews: Map, github: Map }
 * @param {Object} previousScores - { toolName: number } from last Firestore snapshot
 * @returns {Array<{ name, score, signals, changed }>}
 */
function scoreAllTools(tools, signals, previousScores = {}) {
  const results = [];

  for (const tool of tools) {
    const computed = computeToolScore(tool, signals);

    if (computed === null) {
      // Keep previous score if we couldn't compute a new one
      const prev = previousScores[tool.name];
      results.push({
        name: tool.name,
        primary: tool.primary,
        score: prev !== undefined ? prev : 50, // default 50 for brand new tools
        computed: null,
        previousScore: prev || null,
        skipped: true,
      });
      continue;
    }

    const prev = previousScores[tool.name] || null;
    const finalScore = applySmoothing(computed, prev);
    const changed = prev !== null ? finalScore !== prev : true;

    results.push({
      name: tool.name,
      primary: tool.primary,
      score: finalScore,
      computed: computed,
      previousScore: prev,
      changed: changed,
      skipped: false,
    });
  }

  return results;
}

module.exports = { computeToolScore, applySmoothing, scoreAllTools };
