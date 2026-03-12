import { useState } from 'react';
import { getFaviconUrl } from './ToolCard';

export default function CompareFloatingPopup({ selected, onRemove, onCompare, compareLoading, credits }) {
  const [expanded, setExpanded] = useState(false);
  const canCompare = selected.length >= 2;

  return (
    <div className="compare-popup">
      <button className="compare-popup-toggle" onClick={() => setExpanded(!expanded)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="9" height="9" rx="1.5" />
          <rect x="14" y="3" width="9" height="9" rx="1.5" />
          <path d="M7 10l3.5 3.5L7 17" />
          <path d="M17 10l-3.5 3.5L17 17" />
        </svg>
        <span>Compare ({selected.length})</span>
        <svg
          className={`compare-popup-chevron ${expanded ? 'open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {expanded && (
        <div className="compare-popup-body">
          <div className="compare-popup-tools">
            {selected.map(tool => (
              <div key={tool.name} className="compare-popup-tool">
                <img
                  className="compare-popup-tool-logo"
                  src={getFaviconUrl(tool.url)}
                  alt={tool.name}
                />
                <div className="compare-popup-tool-info">
                  <span className="compare-popup-tool-name">{tool.name}</span>
                  <span className="compare-popup-tool-rating">★ {tool.rating}/5</span>
                </div>
                <button
                  className="compare-popup-tool-remove"
                  onClick={() => onRemove(tool)}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {selected.length < 2 && (
            <p className="compare-popup-hint">Select at least 2 tools to compare</p>
          )}

          {canCompare && (
            <button
              className="compare-popup-btn"
              onClick={onCompare}
              disabled={compareLoading || credits <= 0}
            >
              {compareLoading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Comparing...
                </span>
              ) : (
                <>
                  Compare {selected.length} Tools
                  <span className="compare-popup-credit">1 credit</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
