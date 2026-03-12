import { useState, useEffect } from 'react';
import { getTrending } from '../services/firebase';

const DEFAULT_CATEGORIES = [
  { name: 'Video', count: 120 },
  { name: 'Coding', count: 98 },
  { name: 'Design', count: 85 },
  { name: 'Writing', count: 76 },
  { name: 'Marketing', count: 65 },
  { name: 'Audio', count: 52 },
  { name: 'Research', count: 48 },
  { name: 'Automation', count: 42 },
];

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
  const [trending, setTrending] = useState({ categories: DEFAULT_CATEGORIES, queries: DEFAULT_QUERIES });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    // Try to get live data from Firebase, merge with defaults
    getTrending().then(data => {
      const hasData = data.categories.length > 0 || data.queries.length > 0;
      if (hasData) {
        // Merge: use Firebase data but fill gaps with defaults
        const cats = data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES;
        const queries = data.queries.length > 0 ? data.queries : DEFAULT_QUERIES;
        setTrending({ categories: cats, queries });
      }
    }).catch(() => {});
  }, []);

  const maxCount = trending.categories[0]?.count || 1;

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
        Trending
      </h2>

      {loading ? (
        <p className="loading-text">Loading trends...</p>
      ) : (
        <>
          <div className="trending-section">
            <h3 className="trending-subtitle">Popular Categories</h3>
            <div className="trending-bars">
              {trending.categories.map(cat => (
                <button
                  key={cat.name}
                  className="trending-bar-item"
                  onClick={() => onSearchQuery(`I need AI tools for ${cat.name.toLowerCase()}`)}
                >
                  <span className="trending-bar-label">{cat.name}</span>
                  <div className="trending-bar-track">
                    <div
                      className="trending-bar-fill"
                      style={{ width: `${Math.max(10, (cat.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="trending-bar-count">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="trending-section">
            <h3 className="trending-subtitle">Popular Searches</h3>
            <div className="trending-queries">
              {trending.queries.map((q, i) => (
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
        </>
      )}
    </div>
  );
}
