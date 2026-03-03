function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full || (i === full && hasHalf)) {
      stars.push(<span key={i} className="star filled">{'\u2605'}</span>);
    } else {
      stars.push(<span key={i} className="star empty">{'\u2606'}</span>);
    }
  }
  return stars;
}

export default function ToolCard({ tool, index, isBookmarked, onToggleBookmark, isSelected, onToggleCompare }) {
  const pricingClass = tool.pricing.toLowerCase();

  return (
    <div className={`tool-card fade-in ${isSelected ? 'selected-for-compare' : ''}`} style={{ animationDelay: `${index * 0.15}s` }}>
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
                {isSelected ? '\u2611' : '\u2610'}
              </button>
              <button
                className={`bookmark-toggle ${isBookmarked ? 'active' : ''}`}
                onClick={() => onToggleBookmark?.(tool)}
                title={isBookmarked ? 'Remove bookmark' : 'Save tool'}
              >
                {isBookmarked ? '\u2605' : '\u2606'}
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
          Open Tool {'\u2192'}
        </a>
      </div>
    </div>
  );
}
