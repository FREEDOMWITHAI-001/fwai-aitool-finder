import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import CategoryChips from './components/CategoryChips';
import SearchBox from './components/SearchBox';
import QuickFilters from './components/QuickFilters';
import ResultsSection from './components/ResultsSection';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import BookmarksPanel from './components/BookmarksPanel';
import ComparisonModal from './components/ComparisonModal';
import TrendingPage from './components/TrendingPage';
import ExplorePage from './components/ExplorePage';
import { callGeminiAPI, callGeminiCompareAPI } from './services/gemini';
import {
  onAuthChange, logOut, getCredits, useCredit, hasCredits,
  getUserRole, saveSearchHistory, getSearchHistory,
  saveBookmark, removeBookmark, getBookmarks, trackSearch,
} from './services/firebase';
import { findLocalRecommendations } from './utils/fallback';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation
  const [page, setPage] = useState('home');

  // App state
  const [query, setQuery] = useState('');
  const [credits, setCredits] = useState(0);
  const [status, setStatus] = useState('idle');
  const [tools, setTools] = useState([]);
  const [summary, setSummary] = useState('');
  const [errorType, setErrorType] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [activeChip, setActiveChip] = useState('');

  // Role
  const [userRole, setUserRole] = useState('');

  // Filters
  const [filters, setFilters] = useState({ budget: 'Any price', teamSize: 'Solo' });

  // Search history
  const [searchHistory, setSearchHistoryState] = useState([]);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Compare
  const [compareSelected, setCompareSelected] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Show more
  const [showMoreLoading, setShowMoreLoading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const [c, role, hist, bm] = await Promise.all([
          getCredits(firebaseUser.uid),
          getUserRole(firebaseUser.uid),
          getSearchHistory(firebaseUser.uid),
          getBookmarks(firebaseUser.uid),
        ]);
        setCredits(c);
        setUserRole(role);
        setSearchHistoryState(hist);
        setBookmarks(bm);
      } else {
        setCredits(0);
        setUserRole('');
        setSearchHistoryState([]);
        setBookmarks([]);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = useCallback(async () => {
    await logOut();
    setUser(null);
    setCredits(0);
    setStatus('idle');
    setTools([]);
    setSummary('');
    setPage('home');
  }, []);

  // Infer category from query for trending
  function inferCategory(q) {
    const lower = q.toLowerCase();
    const cats = ['video', 'coding', 'design', 'writing', 'marketing', 'audio', 'research', 'automation'];
    for (const c of cats) {
      if (lower.includes(c)) return c.charAt(0).toUpperCase() + c.slice(1);
    }
    return 'General';
  }

  const performSearch = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (!user) return;

    const canSearch = await hasCredits(user.uid);
    if (!canSearch) {
      setStatus('error');
      setErrorType('credits_depleted');
      return;
    }

    setStatus('loading');
    setTools([]);
    setSummary('');
    setIsFallback(false);
    setErrorType('');
    setCompareSelected([]);

    try {
      const result = await callGeminiAPI(trimmed, { role: userRole, ...filters });
      const newCredits = await useCredit(user.uid);
      setCredits(newCredits);
      setTools(result.tools);
      setSummary(result.summary);
      setStatus('results');

      // Track history and trending (fire-and-forget)
      saveSearchHistory(user.uid, trimmed).then(() =>
        getSearchHistory(user.uid).then(setSearchHistoryState)
      );
      trackSearch(trimmed, inferCategory(trimmed));
    } catch (error) {
      const msg = error.message || '';

      if (msg === 'API_KEY_MISSING') {
        setStatus('error');
        setErrorType('api_key');
        return;
      }
      if (msg.includes('API_ERROR_429')) {
        setStatus('error');
        setErrorType('rate_limit');
        return;
      }
      if (msg.includes('API_ERROR_401') || msg.includes('API_ERROR_403')) {
        setStatus('error');
        setErrorType('api_key');
        return;
      }

      // Network error or bad response — fallback to local
      const localResults = findLocalRecommendations(trimmed);
      const newCredits = await useCredit(user.uid);
      setCredits(newCredits);
      setTools(localResults);
      setSummary('');
      setIsFallback(true);
      setStatus('results');

      saveSearchHistory(user.uid, trimmed).then(() =>
        getSearchHistory(user.uid).then(setSearchHistoryState)
      );
    }
  }, [user, userRole, filters]);

  const handleSearch = useCallback(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleChipClick = useCallback((label, chipQuery) => {
    setActiveChip(label);
    setQuery(chipQuery);
    performSearch(chipQuery);
  }, [performSearch]);

  const handleRetry = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  const handleFallback = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const localResults = findLocalRecommendations(trimmed);
    setTools(localResults);
    setSummary('');
    setIsFallback(true);
    setStatus('results');
  }, [query]);

  // Show More
  const handleShowMore = useCallback(async () => {
    if (!user || showMoreLoading) return;
    const canSearch = await hasCredits(user.uid);
    if (!canSearch) return;

    setShowMoreLoading(true);
    try {
      const excludeNames = tools.map(t => t.name);
      const result = await callGeminiAPI(query, {
        role: userRole,
        ...filters,
        excludeTools: excludeNames,
      });
      const newCredits = await useCredit(user.uid);
      setCredits(newCredits);
      setTools(prev => [...prev, ...result.tools]);
    } catch {
      // If show more fails, just silently fail
    }
    setShowMoreLoading(false);
  }, [user, tools, query, userRole, filters, showMoreLoading]);

  // Bookmarks
  const handleToggleBookmark = useCallback(async (tool) => {
    if (!user) return;
    const isBookmarked = bookmarks.some(b => b.name === tool.name);
    if (isBookmarked) {
      await removeBookmark(user.uid, tool.name);
      setBookmarks(prev => prev.filter(b => b.name !== tool.name));
    } else {
      await saveBookmark(user.uid, tool);
      setBookmarks(prev => [{ ...tool, savedAt: Date.now() }, ...prev]);
    }
  }, [user, bookmarks]);

  const handleRemoveBookmark = useCallback(async (toolName) => {
    if (!user) return;
    await removeBookmark(user.uid, toolName);
    setBookmarks(prev => prev.filter(b => b.name !== toolName));
  }, [user]);

  // Compare
  const handleToggleCompare = useCallback((tool) => {
    setCompareSelected(prev => {
      const exists = prev.some(t => t.name === tool.name);
      if (exists) return prev.filter(t => t.name !== tool.name);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, tool];
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (!user || compareSelected.length < 2 || compareLoading) return;
    const canSearch = await hasCredits(user.uid);
    if (!canSearch) return;

    setCompareLoading(true);
    try {
      const result = await callGeminiCompareAPI(compareSelected, query, userRole);
      const newCredits = await useCredit(user.uid);
      setCredits(newCredits);
      setComparisonData(result);
    } catch {
      // Comparison failed — silently ignore
    }
    setCompareLoading(false);
  }, [user, compareSelected, query, userRole, compareLoading]);

  // Navigation helpers
  const navigateToSearch = useCallback((searchQuery) => {
    setPage('home');
    setQuery(searchQuery);
    performSearch(searchQuery);
  }, [performSearch]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="container auth-loading">
        <div className="spinner-large" />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Profile page
  if (page === 'profile') {
    return (
      <div className="container">
        <ProfilePage
          userEmail={user.email}
          userRole={userRole}
          uid={user.uid}
          onRoleUpdate={setUserRole}
          onBack={() => setPage('home')}
        />
      </div>
    );
  }

  // Trending page
  if (page === 'trending') {
    return (
      <div className="container">
        <TrendingPage
          onSearchQuery={navigateToSearch}
          onBack={() => setPage('home')}
        />
      </div>
    );
  }

  // Explore page
  if (page === 'explore') {
    return (
      <div className="container">
        <ExplorePage
          onSearchQuery={navigateToSearch}
          onBack={() => setPage('home')}
        />
      </div>
    );
  }

  const bookmarkedNames = new Set(bookmarks.map(b => b.name));

  // Main app
  return (
    <div className="container">
      <Header
        credits={credits}
        onLogout={handleLogout}
        userEmail={user.email}
        bookmarkCount={bookmarks.length}
        onBookmarksClick={() => setShowBookmarks(true)}
        onProfileClick={() => setPage('profile')}
        onNavigate={setPage}
        currentPage={page}
        searchHistory={searchHistory}
        onHistorySelect={navigateToSearch}
      />
      <CategoryChips activeChip={activeChip} onChipClick={handleChipClick} />

      <main className="search-wrapper">
        <SearchBox
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          isLoading={status === 'loading'}
          disabled={credits <= 0}
        />
        <QuickFilters filters={filters} setFilters={setFilters} />
      </main>

      <ResultsSection
        status={status}
        tools={tools}
        summary={summary}
        errorType={errorType}
        isFallback={isFallback}
        onRetry={handleRetry}
        onFallback={handleFallback}
        onShowMore={handleShowMore}
        showMoreLoading={showMoreLoading}
        credits={credits}
        bookmarkedNames={bookmarkedNames}
        onToggleBookmark={handleToggleBookmark}
        compareSelected={compareSelected}
        onToggleCompare={handleToggleCompare}
        onCompare={handleCompare}
        compareLoading={compareLoading}
      />

      {showBookmarks && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onRemove={handleRemoveBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {comparisonData && (
        <ComparisonModal
          data={comparisonData}
          tools={compareSelected}
          onClose={() => setComparisonData(null)}
        />
      )}
    </div>
  );
}
