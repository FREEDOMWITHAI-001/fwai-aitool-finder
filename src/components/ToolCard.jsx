function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full || (i === full && hasHalf)) {
      stars.push(<span key={i} className="star filled">{'\u2605'}</span>);
    } else {
      stars.push(<span key={i} className="star empty">{'\u2605'}</span>);
    }
  }
  return stars;
}

// Generate a gradient based on tool name for the icon
function getToolColor(name) {
  const colors = [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f43f5e'],
    ['#14b8a6', '#06b6d4'],
    ['#f59e0b', '#f97316'],
    ['#22c55e', '#10b981'],
    ['#3b82f6', '#6366f1'],
    ['#a855f7', '#ec4899'],
    ['#ef4444', '#f97316'],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ToolCard({ tool, index, isBookmarked, onToggleBookmark, isSelected, onToggleCompare }) {
  const pricingClass = tool.pricing.toLowerCase();
  const [c1, c2] = getToolColor(tool.name);
  const initials = tool.name.split(/[\s.]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`tool-card fade-in ${isSelected ? 'selected-for-compare' : ''}`} style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="tool-card-top">
        <div className="tool-icon" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
          <span className="tool-icon-text">{initials}</span>
        </div>
        <div className="tool-title-area">
          <h3 className="tool-name">{tool.name}</h3>
          {tool.bestFor && <p className="tool-best-for">{tool.bestFor}</p>}
        </div>
      </div>

      <div className="tool-card-meta">
        <span className={`pricing-badge pricing-${pricingClass}`}>{tool.pricing}</span>
        <div className="rating-display">
          <span className="stars">{renderStars(tool.rating)}</span>
          <span className="rating-number">{tool.rating}/5</span>
        </div>
      </div>

      {tool.reason && <p className="tool-reason">{tool.reason}</p>}

      <div className="tool-card-footer">
        <a
          href={tool.url}
          className="open-tool-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Tool
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
        <div className="tool-card-actions">
          <button
            className={`compare-toggle ${isSelected ? 'active' : ''}`}
            onClick={() => onToggleCompare?.(tool)}
            title={isSelected ? 'Remove from comparison' : 'Compare this tool'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Left box */}
              <rect x="1" y="3" width="9" height="9" rx="1.5" />
              <line x1="3.5" y1="3" x2="3.5" y2="5.5" />
              {/* Right box */}
              <rect x="14" y="3" width="9" height="9" rx="1.5" />
              <line x1="20.5" y1="3" x2="20.5" y2="5.5" />
              {/* Arrows */}
              <path d="M7 10l3.5 3.5L7 17" />
              <path d="M17 10l-3.5 3.5L17 17" />
            </svg>
          </button>
          <button
            className={`bookmark-toggle ${isBookmarked ? 'active' : ''}`}
            onClick={() => onToggleBookmark?.(tool)}
            title={isBookmarked ? 'Remove bookmark' : 'Save tool'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
