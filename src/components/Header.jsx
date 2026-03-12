import { useState, useRef, useEffect } from 'react';
import CreditsBadge from './CreditsBadge';
import SearchHistory from './SearchHistory';

export default function Header({
  credits, onLogout, userEmail,
  bookmarkCount, onBookmarksClick, onProfileClick,
  onNavigate, currentPage,
  searchHistory, onHistorySelect,
  mode, onModeChange,
  theme, onToggleTheme,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header-top">
        {/* Hamburger Menu */}
        <div className="hamburger-wrapper" ref={menuRef}>
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(prev => !prev)}
            title="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {menuOpen && (
            <div className="hamburger-menu">
              {/* User avatar & email */}
              <div className="menu-user-info">
                <div className="menu-avatar">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="menu-user-details">
                  <span className="menu-user-email">{userEmail}</span>
                </div>
              </div>

              <div className="menu-divider" />

              {/* Profile */}
              <button
                className="menu-item"
                onClick={() => { onProfileClick(); setMenuOpen(false); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>

              {/* Bookmarks */}
              <button
                className="menu-item"
                onClick={() => { onBookmarksClick(); setMenuOpen(false); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Saved Tools
                {bookmarkCount > 0 && <span className="menu-badge">{bookmarkCount}</span>}
              </button>

              {/* Theme Toggle */}
              <div className="theme-toggle-row">
                <span className="theme-toggle-label">
                  {theme === 'dark' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  )}
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <div
                  className={`theme-switch ${theme === 'light' ? 'active' : ''}`}
                  onClick={onToggleTheme}
                >
                  <div className="theme-switch-knob" />
                </div>
              </div>

              <div className="menu-divider" />

              {/* Sign Out */}
              <button
                className="menu-item menu-item-danger"
                onClick={() => { onLogout(); setMenuOpen(false); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="header-actions">
          <button className="theme-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
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
      <div className="header-center">
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

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${mode === 'find' ? 'active' : ''}`}
            onClick={() => onModeChange('find')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Find Tools
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'workflow' ? 'active' : ''}`}
            onClick={() => onModeChange('workflow')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            Workflow
          </button>
        </div>

        <p className="subtitle">
          {mode === 'find'
            ? "Describe what you're working on, and AI will find the perfect tools for you."
            : 'Build automated workflows by chaining AI tools together.'}
        </p>
        <div className="header-nav">
          <button
            className={`nav-link ${currentPage === 'trending' ? 'active' : ''}`}
            onClick={() => onNavigate('trending')}
          >
            Trending
          </button>
          <button
            className={`nav-link ${currentPage === 'explore' ? 'active' : ''}`}
            onClick={() => onNavigate('explore')}
          >
            Explore
          </button>
        </div>
      </div>
    </header>
  );
}
