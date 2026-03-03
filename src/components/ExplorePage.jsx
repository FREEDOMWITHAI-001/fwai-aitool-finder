import { useState } from 'react';
import toolsData from '../data/tools.json';

const CATEGORIES = ['All', 'Video', 'Coding', 'Design', 'Writing', 'Marketing', 'Audio', 'Research', 'Automation'];

export default function ExplorePage({ onSearchQuery, onBack }) {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? toolsData
    : toolsData.filter(t => t.categories.some(c => c.toLowerCase().includes(activeCategory.toLowerCase())));

  return (
    <div className="explore-page">
      <button className="back-btn" onClick={onBack}>{'\u2190'} Back</button>
      <h2 className="page-title">{'\uD83D\uDD0D'} Explore AI Tools</h2>

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
              <h3 className="explore-tool-name">{tool.name}</h3>
              <span className={`pricing-badge pricing-${tool.pricing.toLowerCase()}`}>
                {tool.pricing}
              </span>
            </div>
            <p className="explore-bestfor">{tool.bestFor}</p>
            <div className="explore-card-bottom">
              <span className="explore-rating">{'\u2605'} {tool.rating}/5</span>
              <div className="explore-actions">
                <button
                  className="explore-similar-btn"
                  onClick={() => onSearchQuery(`I need AI tools similar to ${tool.name}`)}
                >
                  Find Similar
                </button>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="explore-open-btn">
                  Open {'\u2192'}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
