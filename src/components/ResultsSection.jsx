import ToolCard from './ToolCard';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorCard from './ErrorCard';

export default function ResultsSection({
  status, tools, summary, errorType, isFallback,
  onRetry, onFallback, onShowMore, showMoreLoading, credits,
  bookmarkedNames, onToggleBookmark,
  compareSelected, onToggleCompare, onCompare, compareLoading,
}) {
  if (status === 'idle') return null;

  return (
    <section className={`results-section ${status !== 'idle' ? 'show' : ''}`}>
      {status === 'loading' && <LoadingSkeleton />}

      {status === 'error' && (
        <ErrorCard type={errorType} onRetry={onRetry} onFallback={onFallback} />
      )}

      {status === 'results' && (
        <>
          {isFallback && (
            <div className="fallback-notice">
              Showing results from our local database (AI service unavailable)
            </div>
          )}

          {summary && (
            <div className="ai-summary">
              <span className="ai-summary-icon">{'\uD83E\uDD16'}</span>
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

          {onShowMore && credits > 0 && (
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

          {compareSelected?.length >= 2 && (
            <button
              className="compare-float-btn"
              onClick={onCompare}
              disabled={compareLoading || credits <= 0}
            >
              {compareLoading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Comparing...
                </span>
              ) : (
                `Compare ${compareSelected.length} Tools (1 credit)`
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
