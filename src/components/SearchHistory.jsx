import { useState, useRef, useEffect } from 'react';

export default function SearchHistory({ history, onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!history || history.length === 0) return null;

  return (
    <div className="search-history-wrapper" ref={wrapperRef}>
      <button
        className={`header-icon-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Search history"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>
      {open && (
        <div className="history-dropdown">
          <div className="history-header">Recent Searches</div>
          {history.map((q, i) => (
            <button
              key={i}
              className="history-item"
              onClick={() => { onSelect(q); setOpen(false); }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
