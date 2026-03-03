export default function BookmarksPanel({ bookmarks, onRemove, onClose }) {
  return (
    <div className="bookmarks-overlay" onClick={onClose}>
      <div className="bookmarks-panel" onClick={e => e.stopPropagation()}>
        <div className="bookmarks-header">
          <h2>Saved Tools</h2>
          <button className="bookmarks-close" onClick={onClose}>{'\u2715'}</button>
        </div>
        {bookmarks.length === 0 ? (
          <p className="bookmarks-empty">No saved tools yet. Bookmark tools from search results to see them here.</p>
        ) : (
          <div className="bookmarks-list">
            {bookmarks.map(tool => (
              <div key={tool.name} className="bookmark-card">
                <div className="bookmark-info">
                  <h3 className="bookmark-name">{tool.name}</h3>
                  {tool.bestFor && <span className="bookmark-bestfor">{tool.bestFor}</span>}
                  <span className={`pricing-badge pricing-${(tool.pricing || 'freemium').toLowerCase()}`}>
                    {tool.pricing}
                  </span>
                </div>
                <div className="bookmark-actions">
                  <a href={tool.url} target="_blank" rel="noopener noreferrer" className="bookmark-open">
                    Open {'\u2192'}
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
