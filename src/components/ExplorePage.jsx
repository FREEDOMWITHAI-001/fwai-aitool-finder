import { useState, useMemo } from 'react';
import toolsData from '../data/tools.json';
import { getFaviconUrl } from './ToolCard';

const CATEGORIES = ['All', 'Video', 'Coding', 'Design', 'Writing', 'Marketing', 'Audio', 'Research', 'Automation'];
const TRENDING_CATEGORIES = ['Video', 'Coding', 'Design', 'Writing', 'Marketing', 'Audio', 'Research', 'Automation'];
const TRENDING_PER_CATEGORY = 12;

export default function ExplorePage({ onSearchQuery, onBack }) {
  const [activeCategory, setActiveCategory] = useState('All');

  // Collect all tool names shown in Trending (top-rated per category)
  const trendingNames = useMemo(() => {
    const names = new Set();
    for (const cat of TRENDING_CATEGORIES) {
      toolsData
        .filter(t => t.primary === cat.toLowerCase())
        .sort((a, b) => b.rating - a.rating)
        .slice(0, TRENDING_PER_CATEGORY)
        .forEach(t => names.add(t.name));
    }
    return names;
  }, []);

  // Exclude trending tools from Explore
  const nonTrending = useMemo(() => toolsData.filter(t => !trendingNames.has(t.name)), [trendingNames]);

  const filtered = activeCategory === 'All'
    ? nonTrending
    : nonTrending.filter(t => t.categories.some(c => c.toLowerCase().includes(activeCategory.toLowerCase())));

  return (
    <div className="explore-page">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>
      <h2 className="page-title">
        <span className="page-title-icon explore">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </span>
        Explore AI Tools
      </h2>

      <div className="explore-chips">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="explore-grid">
        {filtered.map(tool => (
          <div key={tool.name} className="explore-card">
            <div className="explore-card-top">
              <img className="explore-tool-logo" src={getFaviconUrl(tool.url)} alt={`${tool.name} logo`} />
              <div className="explore-tool-title">
                <h3 className="explore-tool-name">{tool.name}</h3>
                <span className="explore-category-tag">{tool.primary}</span>
              </div>
              <span className={`pricing-badge pricing-${tool.pricing.toLowerCase()}`}>
                {tool.pricing}
              </span>
            </div>

            <p className="explore-bestfor">{tool.bestFor}</p>

            <div className="explore-rating-row">
              <div className="explore-stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`star ${s <= Math.round(tool.rating) ? 'filled' : 'empty'}`}>★</span>
                ))}
              </div>
              <span className="explore-rating-num">{tool.rating}/5</span>
            </div>

            <div className="explore-card-bottom">
              <div className="explore-actions">
                <button
                  className="explore-similar-btn"
                  onClick={() => onSearchQuery(`I need AI tools similar to ${tool.name}`)}
                >
                  Find Similar
                </button>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="explore-open-btn">
                  Open
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
