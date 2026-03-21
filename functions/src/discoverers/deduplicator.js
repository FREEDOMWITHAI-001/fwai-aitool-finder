/**
 * Deduplicator
 *
 * Merges validated discovered tools with the static TOOLS list.
 * Responsibilities:
 *   1. Skip any tool already in the static list (by name fuzzy-match)
 *   2. Cap net-new tools at MAX_NEW_PER_RUN (20) to prevent runaway discovery
 *   3. Normalize discovered tools into the same config shape as static TOOLS
 *   4. Assign reasonable searchTerms for the signal fetchers to use
 */

const MAX_NEW_PER_RUN = 50;

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, remove punctuation, collapse whitespace
 */
function normalizeForCompare(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two tool names refer to the same product.
 * Uses exact match after normalization, plus simple suffix checks.
 */
function isSameTool(nameA, nameB) {
  const a = normalizeForCompare(nameA);
  const b = normalizeForCompare(nameB);
  if (a === b) return true;

  // "github copilot" matches "copilot"
  if (a.includes(b) || b.includes(a)) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    // Only match if the shorter is a meaningful portion (>=5 chars)
    if (shorter.length >= 5) return true;
  }

  return false;
}

/**
 * Build a config object for a discovered tool that matches the TOOLS array shape.
 */
function buildToolConfig(discovered) {
  const name = (discovered.name || '').trim();
  const category = (discovered.category || 'writing').toLowerCase();

  // Build search terms: primary name + "AI" variant if name doesn't contain "AI"
  const searchTerms = [name];
  if (!name.toLowerCase().includes('ai')) {
    searchTerms.push(`${name} AI`);
  }

  return {
    name,
    primary: category,
    searchTerms,
    githubRepo: null,        // Unknown for discovered tools
    _isDiscovered: true,     // Flag for Firestore / frontend to show "NEW" badge
    _discoveredAt: new Date().toISOString(),
    _description: discovered.description || '',
    _url: discovered.url || '',
  };
}

/**
 * Merge discovered tools with the static TOOLS list.
 *
 * @param {Array} staticTools  - The TOOLS array from config.js
 * @param {Array} discovered   - Validated tools from Gemini extractor
 * @returns {{ effectiveTools: Array, netNew: Array }}
 *   effectiveTools: full list (static + net-new) to run signals against
 *   netNew: only the newly discovered tools (for logging/Firestore metadata)
 */
function mergeDiscoveredTools(staticTools, discovered) {
  // Build a set of normalized static tool names for O(1) lookup
  const staticNames = new Set(staticTools.map(t => normalizeForCompare(t.name)));

  const netNew = [];

  for (const candidate of discovered) {
    if (netNew.length >= MAX_NEW_PER_RUN) break;

    const candidateName = (candidate.name || '').trim();
    if (!candidateName) continue;

    // Skip if it's already in the static list
    const isDuplicate = [...staticNames].some(existing => isSameTool(candidateName, existing));
    if (isDuplicate) continue;

    const toolConfig = buildToolConfig(candidate);
    netNew.push(toolConfig);

    // Add to seen set so we don't add duplicates within this run
    staticNames.add(normalizeForCompare(candidateName));
  }

  const effectiveTools = [...staticTools, ...netNew];

  console.log(
    `[Deduplicator] Static: ${staticTools.length}, Discovered: ${discovered.length}, ` +
    `Net-new after dedup: ${netNew.length}, Effective total: ${effectiveTools.length}`
  );

  return { effectiveTools, netNew };
}

module.exports = { mergeDiscoveredTools };
