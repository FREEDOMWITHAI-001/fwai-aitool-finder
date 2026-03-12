import { useState, useEffect } from 'react';
import { getTrending } from '../services/firebase';
import { getFaviconUrl } from './ToolCard';
import tools from '../data/tools.json';
import useGridColumns from '../hooks/useGridColumns';

const CATEGORIES = ['Video', 'Coding', 'Design', 'Writing', 'Marketing', 'Audio', 'Research', 'Automation'];

// Get top tools per category sorted by rating (fetch extra so we can slice to fit grid)
function getTopToolsByCategory(category, count = 12) {
  return tools
    .filter(t => t.primary === category.toLowerCase())
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count);
}

const DEFAULT_QUERIES = [
  { query: 'AI video editing tools', count: 45 },
  { query: 'Best AI coding assistant', count: 38 },
  { query: 'AI image generator', count: 35 },
  { query: 'AI writing assistant', count: 30 },
  { query: 'AI voice generator', count: 28 },
  { query: 'AI marketing tools', count: 24 },
  { query: 'AI workflow automation', count: 20 },
  { query: 'AI research tools', count: 18 },
];

export default function TrendingPage({ onSearchQuery, onBack }) {
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const columns = useGridColumns('trending-tools-grid');

  useEffect(() => {
    getTrending().then(data => {
      if (data.queries.length > 0) setQueries(data.queries);
    }).catch(() => {});
  }, []);

  return (
    <div className="trending-page">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>
      <h2 className="page-title">
        <span className="page-title-icon trending">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </span>
        Trending AI Tools
      </h2>

      {CATEGORIES.map(category => {
        const allTools = getTopToolsByCategory(category);
        // Slice to fill complete rows only (max 2 rows)
        const maxItems = columns * 2;
        const available = Math.min(allTools.length, maxItems);
        const topTools = allTools.slice(0, Math.floor(available / columns) * columns);
        if (topTools.length === 0) return null;
        return (
          <div key={category} className="trending-category-section">
            <div className="trending-category-header">
              <h3 className="trending-category-title">{category}</h3>
              <button
                className="trending-see-all"
                onClick={() => onSearchQuery(`I need AI tools for ${category.toLowerCase()}`)}
              >
                See all →
              </button>
            </div>
            <div className="trending-tools-grid">
              {topTools.map(tool => {
                const pricingClass = tool.pricing.toLowerCase();
                const faviconUrl = getFaviconUrl(tool.url);
                return (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="trending-tool-card"
                  >
                    <div className="trending-tool-header">
                      <div className="trending-tool-icon">
                        <img src={faviconUrl} alt={`${tool.name} logo`} />
                      </div>
                      <div className="trending-tool-title">
                        <span className="trending-tool-name">{tool.name}</span>
                        <span className={`pricing-badge pricing-${pricingClass}`}>{tool.pricing}</span>
                      </div>
                    </div>
                    <p className="trending-tool-desc">{tool.bestFor}</p>
                    <div className="trending-tool-footer">
                      <div className="trending-tool-stars">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`star ${s <= Math.round(tool.rating) ? 'filled' : 'empty'}`}>★</span>
                        ))}
                        <span className="trending-tool-rating-num">{tool.rating}/5</span>
                      </div>
                      <span className="trending-tool-open">
                        Open
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="7" y1="17" x2="17" y2="7" />
                          <polyline points="7 7 17 7 17 17" />
                        </svg>
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="trending-section">
        <h3 className="trending-subtitle">Popular Searches</h3>
        <div className="trending-queries">
          {queries.map((q, i) => (
            <button
              key={i}
              className="trending-query-chip"
              onClick={() => onSearchQuery(q.query)}
            >
              {q.query}
              <span className="trending-query-count">{q.count}x</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
