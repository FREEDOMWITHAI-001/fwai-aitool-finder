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

export default function ToolCard({ tool, index, isBookmarked, onToggleBookmark, isSelected, onToggleCompare }) {
  const pricingClass = tool.pricing.toLowerCase();

  return (
    <div className={`tool-card fade-in ${isSelected ? 'selected-for-compare' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="tool-number">{String(index + 1).padStart(2, '0')}</div>
      <div className="tool-info">
        <div className="tool-header">
          <div>
            <h3 className="tool-name">{tool.name}</h3>
            {tool.bestFor && <span className="tool-best-for">{tool.bestFor}</span>}
          </div>
          <div className="tool-header-right">
            <span className={`pricing-badge pricing-${pricingClass}`}>{tool.pricing}</span>
            <div className="tool-card-actions">
              <button
                className={`compare-toggle ${isSelected ? 'active' : ''}`}
                onClick={() => onToggleCompare?.(tool)}
                title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isSelected ? (
                    <>
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </>
                  ) : (
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  )}
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

        <div className="rating-display">
          <span className="stars">{renderStars(tool.rating)}</span>
          <span className="rating-number">{tool.rating}/5</span>
          {tool.ratingSource && (
            <span className="rating-source">via {tool.ratingSource}</span>
          )}
        </div>

        {tool.reason && <p className="tool-reason">{tool.reason}</p>}

        <a
          href={tool.url}
          className="open-tool-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Tool
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>
    </div>
  );
}
