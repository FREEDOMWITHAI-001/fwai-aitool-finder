import { useState, useEffect } from 'react';
import { getTrending } from '../services/firebase';

export default function TrendingPage({ onSearchQuery, onBack }) {
  const [trending, setTrending] = useState({ categories: [], queries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrending().then(data => {
      setTrending(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="trending-page">
        <button className="back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <h2 className="page-title">Trending</h2>
        <p className="loading-text">Loading trends...</p>
      </div>
    );
  }

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

      {trending.categories.length > 0 && (
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
      )}

      {trending.queries.length > 0 && (
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
      )}

      {trending.categories.length === 0 && trending.queries.length === 0 && (
        <p className="trending-empty">No trending data yet. Start searching to see trends!</p>
      )}
    </div>
  );
}
