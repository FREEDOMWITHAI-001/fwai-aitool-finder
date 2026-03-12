import ToolCard from './ToolCard';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorCard from './ErrorCard';

export default function ResultsSection({
  status, tools, summary, errorType, isFallback,
  onRetry, onFallback, onShowMore, showMoreLoading, credits,
  bookmarkedNames, onToggleBookmark,
  compareSelected, onToggleCompare, onCompare, compareLoading,
  noMoreTools,
}) {
  if (status === 'idle') return null;

  return (
    <section className={`results-section ${status !== 'idle' ? 'show' : ''}`}>
      {status === 'loading' && <LoadingSkeleton />}

      {status === 'analyzing' && (
        <>
          {summary && (
            <div className="ai-summary analyzing-pulse">
              <span className="ai-summary-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </span>
              {summary}
            </div>
          )}
          <LoadingSkeleton />
        </>
      )}

      {status === 'error' && (
        <ErrorCard type={errorType} onRetry={onRetry} onFallback={onFallback} />
      )}

      {status === 'results' && (
        <>
          {summary && (
            <div className="ai-summary">
              <span className="ai-summary-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </span>
              {summary}
            </div>
          )}

          <div className="divider" />

          <div className="tool-list">
            {tools.map((tool, index) => (
              <ToolCard
                key={`${tool.name}-${index}`}
                tool={tool}
                index={index}
                isBookmarked={bookmarkedNames?.has(tool.name)}
                onToggleBookmark={onToggleBookmark}
                isSelected={compareSelected?.some(t => t.name === tool.name)}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>

          {onShowMore && credits > 0 && !noMoreTools && (
            <button
              className="show-more-btn"
              onClick={onShowMore}
              disabled={showMoreLoading}
            >
              {showMoreLoading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Finding more...
                </span>
              ) : (
                'Show More Tools (1 credit)'
              )}
            </button>
          )}
          {noMoreTools && (
            <p className="no-more-tools">All available tools have been loaded.</p>
          )}

        </>
      )}
    </section>
  );
}
