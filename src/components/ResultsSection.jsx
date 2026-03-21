import { useState, useRef, useEffect } from 'react';
import ToolCard from './ToolCard';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorCard from './ErrorCard';

const SORT_OPTIONS = [
  {
    key: 'best-match',
    label: 'Best Match',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    // Relevance-first: keeps subcategory-matching tools at top,
    // then sorts within each relevance tier by trendScore DESC
    sort: (a, b) => {
      const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (relevanceDiff !== 0) return relevanceDiff;
      return (b.trendScore || 0) - (a.trendScore || 0);
    },
  },
  {
    key: 'top-rated',
    label: 'Top Rated',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    sort: (a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.trendScore || 0) - (a.trendScore || 0);
    },
  },
  {
    key: 'trending',
    label: 'Trending',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    sort: (a, b) => {
      const trendDiff = (b.trendScore || 0) - (a.trendScore || 0);
      if (trendDiff !== 0) return trendDiff;
      return (b.rating || 0) - (a.rating || 0);
    },
  },
];

export default function ResultsSection({
  status, tools, summary, errorType, isFallback,
  onRetry, onFallback, onShowMore, showMoreLoading, credits,
  bookmarkedNames, onToggleBookmark,
  compareSelected, onToggleCompare, onCompare, compareLoading,
  noMoreTools, onToolClick,
}) {
  const [sortKey, setSortKey] = useState('best-match');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Track how many tools were present when results first appeared.
  // Sort only that initial batch; Show More tools append after without disrupting existing order.
  const prevStatusRef = useRef(status);
  const baseCountRef = useRef(0);

  useEffect(() => {
    const wasResults = prevStatusRef.current === 'results';
    const isNowResults = status === 'results';
    // Lock base count on fresh transition into 'results' (new search completed)
    if (!wasResults && isNowResults) {
      baseCountRef.current = tools.length;
      setSortKey('best-match'); // reset to relevance sort on every new search
    }
    prevStatusRef.current = status;
  }, [status, tools.length]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = SORT_OPTIONS.find(o => o.key === sortKey);

  // Split: initial results (sortable) vs show-more results (appended as-is)
  const baseTools = tools.slice(0, baseCountRef.current);
  const moreTools = tools.slice(baseCountRef.current);
  const sortedBase = baseTools.length ? [...baseTools].sort(activeOption.sort) : baseTools;
  // Show More tools are sorted among themselves but appended after initial results
  const sortedMore = moreTools.length ? [...moreTools].sort(activeOption.sort) : moreTools;
  const displayTools = [...sortedBase, ...sortedMore];

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
          {tools.length > 0 ? (
            <>
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
                    onToolClick={onToolClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <LoadingSkeleton />
          )}
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

          <div className="results-controls">
            <div className="sort-dropdown" ref={dropdownRef}>
              <button
                className={`sort-dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
                onClick={() => setDropdownOpen(prev => !prev)}
              >
                <span className="sort-dropdown-icon">{activeOption.icon}</span>
                {activeOption.label}
                <svg className="sort-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="sort-dropdown-menu">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      className={`sort-dropdown-item ${sortKey === opt.key ? 'active' : ''}`}
                      onClick={() => { setSortKey(opt.key); setDropdownOpen(false); }}
                    >
                      <span className="sort-dropdown-item-icon">{opt.icon}</span>
                      {opt.label}
                      {sortKey === opt.key && (
                        <svg className="sort-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="tool-list">
            {displayTools.map((tool, index) => (
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
