export default function ComparisonModal({ data, tools, onClose }) {
  if (!data) return null;

  const toolMap = {};
  if (tools) {
    for (const t of tools) {
      toolMap[t.name] = t;
    }
  }

  return (
    <div className="comparison-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={e => e.stopPropagation()}>
        <div className="comparison-header">
          <h2>Compare Tools</h2>
          <button className="comparison-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="comparison-grid">
          {data.comparison.map(item => {
            const original = toolMap[item.tool] || {};
            return (
              <div key={item.tool} className={`comparison-col ${item.tool === data.winner ? 'winner' : ''}`}>
                <h3 className="comparison-tool-name">
                  {item.tool === data.winner && (
                    <span className="winner-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </span>
                  )}
                  {item.tool}
                </h3>

                <div className="comparison-tags">
                  <span className={`pricing-badge pricing-${(item.pricing || original.pricing || 'freemium').toLowerCase()}`}>
                    {item.pricing || original.pricing}
                  </span>
                  {original.rating > 0 && (
                    <span className="comparison-rating">{'\u2605'} {original.rating}/5</span>
                  )}
                  {original.bestFor && (
                    <span className="comparison-bestfor">{original.bestFor}</span>
                  )}
                </div>

                <div className="comparison-section">
                  <h4 className="pros-title">Pros</h4>
                  <ul className="pros-list">
                    {item.pros?.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>

                <div className="comparison-section">
                  <h4 className="cons-title">Cons</h4>
                  <ul className="cons-list">
                    {item.cons?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>

                <p className="comparison-verdict">{item.verdict}</p>

                {original.url && (
                  <a
                    href={original.url}
                    className="comparison-open-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Tool
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {data.winner && (
          <div className="comparison-winner">
            <span className="winner-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </span>
            <strong>Winner: {data.winner}</strong>
            <span className="winner-reason">&mdash; {data.winnerReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
