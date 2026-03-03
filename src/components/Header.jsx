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
            {'\u{1F464}'}
          </button>
          <span className="user-email">{userEmail}</span>
          <button className="logout-btn" onClick={onLogout}>Log out</button>
        </div>
        <div className="header-actions">
          <SearchHistory history={searchHistory} onSelect={onHistorySelect} />
          <button className="header-icon-btn" onClick={onBookmarksClick} title="Saved Tools">
            {'\uD83D\uDD16'}
            {bookmarkCount > 0 && <span className="bookmark-count">{bookmarkCount}</span>}
          </button>
          <CreditsBadge credits={credits} />
        </div>
      </div>
      <h1 className="header-logo-clickable" onClick={() => onNavigate('home')}>AI RADAR</h1>
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
