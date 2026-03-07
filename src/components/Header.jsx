import CreditsBadge from './CreditsBadge';
import SearchHistory from './SearchHistory';

export default function Header({
  credits, onLogout, userEmail,
  bookmarkCount, onBookmarksClick, onProfileClick,
  onNavigate, currentPage,
  searchHistory, onHistorySelect,
}) {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-user">
          <button className="profile-icon-btn" onClick={onProfileClick} title="Profile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <span className="user-email">{userEmail}</span>
          <button className="logout-btn" onClick={onLogout}>Sign out</button>
        </div>
        <div className="header-actions">
          <SearchHistory history={searchHistory} onSelect={onHistorySelect} />
          <button className="header-icon-btn" onClick={onBookmarksClick} title="Saved Tools">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {bookmarkCount > 0 && <span className="bookmark-count">{bookmarkCount}</span>}
          </button>
          <CreditsBadge credits={credits} />
        </div>
      </div>
      <div className="header-brand" onClick={() => onNavigate('home')}>
        <div className="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <h1>AI Radar</h1>
      </div>
      <p className="brand-label">by Freedom with AI</p>
      <p className="subtitle">
        Describe what you're working on, and AI will find the perfect tools for you.
      </p>
      <div className="header-nav">
        <button
          className={`nav-link ${currentPage === 'trending' ? 'active' : ''}`}
          onClick={() => onNavigate('trending')}
        >
          Trending
        </button>
        <span className="nav-dot">{'\u00B7'}</span>
        <button
          className={`nav-link ${currentPage === 'explore' ? 'active' : ''}`}
          onClick={() => onNavigate('explore')}
        >
          Explore
        </button>
      </div>
    </header>
  );
}
