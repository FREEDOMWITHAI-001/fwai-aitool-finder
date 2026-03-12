import { getFaviconUrl } from './ToolCard';

export default function BookmarksPanel({ bookmarks, onRemove, onClose }) {
  return (
    <div className="bookmarks-overlay" onClick={onClose}>
      <div className="bookmarks-panel" onClick={e => e.stopPropagation()}>
        <div className="bookmarks-header">
          <button className="back-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <h2>Saved Tools</h2>
        </div>
        {bookmarks.length === 0 ? (
          <p className="bookmarks-empty">No saved tools yet. Bookmark tools from search results to see them here.</p>
        ) : (
          <div className="bookmarks-list">
            {bookmarks.map(tool => (
              <div key={tool.name} className="bookmark-card">
                <div className="bookmark-info">
                  {tool.url && <img className="bookmark-logo" src={getFaviconUrl(tool.url)} alt={tool.name} />}
                  <h3 className="bookmark-name">{tool.name}</h3>
                  {tool.bestFor && <span className="bookmark-bestfor">{tool.bestFor}</span>}
                  <span className={`pricing-badge pricing-${(tool.pricing || 'freemium').toLowerCase()}`}>
                    {tool.pricing}
                  </span>
                </div>
                <div className="bookmark-actions">
                  <a href={tool.url} target="_blank" rel="noopener noreferrer" className="bookmark-open">
                    Open
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                  <button className="bookmark-remove" onClick={() => onRemove(tool.name)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
