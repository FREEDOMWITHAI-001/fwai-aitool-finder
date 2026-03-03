import tools from '../data/tools.json';

export function findLocalRecommendations(query) {
  const q = query.toLowerCase();

  let matches = tools.filter(tool => {
    const inCategories = tool.categories.some(cat =>
      q.includes(cat) || cat.includes(q) || cat.split(' ').some(word => q.includes(word))
    );
    const inName = tool.name.toLowerCase().includes(q);
    return inCategories || inName;
  });

  // Fallback to general-purpose tools if no matches
  if (matches.length === 0) {
    matches = tools.filter(t => ['ChatGPT', 'Claude', 'Perplexity'].includes(t.name));
  }

  // Sort by rating descending
  matches.sort((a, b) => b.rating - a.rating);

  return matches.slice(0, 3).map(tool => ({
    name: tool.name,
    url: tool.url,
    rating: tool.rating,
    ratingSource: '',
    pricing: tool.pricing,
    reason: '',
    bestFor: tool.bestFor,
  }));
}
