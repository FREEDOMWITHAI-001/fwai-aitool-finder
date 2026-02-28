import { aiTools, AITool } from '@/data/tools';

export function findRecommendations(query: string): AITool[] {
  // 1. Direct filtering
  let matches = aiTools.filter((tool) => {
    const inCategories = tool.categories.some(
      (cat) =>
        query.includes(cat) ||
        cat.includes(query) ||
        cat.split(' ').some((word) => query.includes(word))
    );
    const inName = tool.name.toLowerCase().includes(query);
    return inCategories || inName;
  });

  // 2. Robust fallback: return general-purpose tools if no match
  if (matches.length === 0) {
    matches = aiTools.filter((t) =>
      ['ChatGPT', 'Claude', 'Perplexity'].includes(t.name)
    );
  }

  // 3. Sort: trending first, then by rating
  matches.sort((a, b) => {
    if (a.trending !== b.trending) return a.trending ? -1 : 1;
    return parseFloat(b.rating) - parseFloat(a.rating);
  });

  return matches.slice(0, 3);
}

export function capitalizeFirstLetter(string: string): string {
  if (string.length > 10) return string.charAt(0).toUpperCase() + string.slice(1);
  return string.toUpperCase();
}
