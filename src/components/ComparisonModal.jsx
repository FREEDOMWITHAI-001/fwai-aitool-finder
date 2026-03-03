export default function ComparisonModal({ data, tools, onClose }) {
  if (!data) return null;

  // Lookup original tool data for URLs, ratings, bestFor
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
          <button className="comparison-close" onClick={onClose}>{'\u2715'}</button>
        </div>

        <div className="comparison-grid">
          {data.comparison.map(item => {
            const original = toolMap[item.tool] || {};
            return (
              <div key={item.tool} className={`comparison-col ${item.tool === data.winner ? 'winner' : ''}`}>
                <h3 className="comparison-tool-name">
                  {item.tool === data.winner && <span className="winner-badge">{'\uD83C\uDFC6'}</span>}
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
                    Open Tool {'\u2192'}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {data.winner && (
          <div className="comparison-winner">
            <span className="winner-icon">{'\uD83C\uDFC6'}</span>
            <strong>Winner: {data.winner}</strong>
            <span className="winner-reason">{'\u2014'} {data.winnerReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
