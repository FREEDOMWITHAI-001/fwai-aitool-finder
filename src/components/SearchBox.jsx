import { useRef, useEffect } from 'react';

export default function SearchBox({ query, setQuery, onSearch, isLoading, disabled }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSearch();
    }
  }

  return (
      <div className="search-container">
        <textarea
          ref={textareaRef}
          id="search-input"
          rows="2"
          placeholder="Tell me what you need... e.g., 'I'm a YouTuber and I need to add subtitles and effects to my videos quickly'"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          id="search-btn"
          onClick={onSearch}
          disabled={isLoading || disabled}
        >
          {isLoading ? (
            <span className="btn-loading">
              <span className="spinner" />
              Analyzing...
            </span>
          ) : (
            <span className="btn-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Find Tools
            </span>
          )}
        </button>
      </div>
  );
}
