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
import WorkflowSection from './components/WorkflowSection';
import CompareFloatingPopup from './components/CompareFloatingPopup';
import { callGeminiAPI, callGeminiCompareAPI } from './services/gemini';
import useGridColumns from './hooks/useGridColumns';
import {
  onAuthChange, logOut, getCredits, useCredit, topUpCreditsOnce,
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
  const [mode, setMode] = useState('find'); // 'find' or 'workflow'

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('aitf_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aitf_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Grid column detection for dynamic tool loading
  const toolListColumns = useGridColumns('tool-list');

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
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Show cached data instantly from localStorage
        const uid = firebaseUser.uid;
        const cachedCredits = parseInt(localStorage.getItem(`aitf_credits_${uid}`) || '0', 10);
        const cachedRole = localStorage.getItem(`aitf_role_${uid}`) || '';
        const cachedHistory = JSON.parse(localStorage.getItem(`aitf_history_${uid}`) || '[]');
        const cachedBookmarks = JSON.parse(localStorage.getItem(`aitf_bookmarks_${uid}`) || '{}');
        setCredits(cachedCredits);
        setUserRole(cachedRole);
        setSearchHistoryState(Array.isArray(cachedHistory) ? cachedHistory.map(h => h.query || h) : []);
        setBookmarks(Object.values(cachedBookmarks));
        setAuthLoading(false);

        // One-time top-up for existing users first, then fetch fresh data
        topUpCreditsOnce(uid).then(() => {
          return Promise.all([
            getCredits(uid),
            getUserRole(uid),
            getSearchHistory(uid),
            getBookmarks(uid),
          ]);
        }).then(([c, role, hist, bm]) => {
          setCredits(c);
          setUserRole(role);
          setSearchHistoryState(hist);
          setBookmarks(bm);
        }).catch(() => {});
      } else {
        setCredits(0);
        setUserRole('');
        setSearchHistoryState([]);
        setBookmarks([]);
        setAuthLoading(false);
      }
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

  // Cache helpers for search results
  const getResultsCacheKey = useCallback((uid) => `aitf_results_${uid}`, []);

  const getCachedResults = useCallback((searchQuery) => {
    if (!user) return null;
    try {
      const cache = JSON.parse(localStorage.getItem(getResultsCacheKey(user.uid)) || '{}');
      const entry = cache[searchQuery.toLowerCase()];
      if (!entry) return null;
      // Cache valid for 24 hours
      if (Date.now() - entry.savedAt > 24 * 60 * 60 * 1000) return null;
      return entry;
    } catch { return null; }
  }, [user, getResultsCacheKey]);

  const saveResultsToCache = useCallback((searchQuery, toolsData, summaryText) => {
    if (!user) return;
    try {
      const cacheKey = getResultsCacheKey(user.uid);
      const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      cache[searchQuery.toLowerCase()] = {
        tools: toolsData,
        summary: summaryText,
        savedAt: Date.now(),
      };
      // Keep only last 20 searches in cache
      const entries = Object.entries(cache).sort((a, b) => b[1].savedAt - a[1].savedAt);
      const trimmed = Object.fromEntries(entries.slice(0, 20));
      localStorage.setItem(cacheKey, JSON.stringify(trimmed));
    } catch { /* storage full — ignore */ }
  }, [user, getResultsCacheKey]);

  const performSearch = useCallback(async (searchQuery, { useCache = false } = {}) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (!user) return;

    setErrorType('');
    setCompareSelected([]);

    // Check cache first when loading from history
    if (useCache) {
      const cached = getCachedResults(trimmed);
      if (cached) {
        setTools(cached.tools);
        setSummary(cached.summary);
        setQuery(trimmed);
        setIsFallback(false);
        setStatus('results');
        return;
      }
    }

    if (credits <= 0) {
      setStatus('error');
      setErrorType('credits_depleted');
      return;
    }

    setTools([]);

    // Deduct 1 credit — update UI instantly, persist to localStorage + Firebase
    const newCredits = credits - 1;
    setCredits(newCredits);
    useCredit(user.uid).catch(() => {});

    const categorySummaries = {
      Video: 'These AI tools offer a powerful suite of capabilities for video creation and editing, from automated subtitle generation and visual effects to AI-driven scene composition and professional-grade post-production.',
      Coding: 'These AI tools offer a comprehensive suite of features to accelerate software development, from AI-powered code editing to advanced code generation and real-time assistance within existing IDEs.',
      Design: 'These AI tools bring cutting-edge creative capabilities to your workflow, from intelligent image generation and graphic design automation to intuitive UI/UX prototyping and brand-consistent visual creation.',
      Writing: 'These AI tools empower your writing process with intelligent content generation, from crafting compelling blog posts and marketing copy to polishing grammar and adapting tone for any audience.',
      Marketing: 'These AI tools supercharge your marketing strategy with data-driven insights, from automated ad creation and SEO optimization to audience targeting and campaign performance analytics.',
      Audio: 'These AI tools transform audio production with next-level capabilities, from realistic voice synthesis and music generation to professional podcast editing and intelligent noise removal.',
      Research: 'These AI tools elevate your research workflow with powerful analytical capabilities, from automated literature reviews and data analysis to citation management and insight extraction from complex datasets.',
      Automation: 'These AI tools streamline your workflows with intelligent automation, from no-code task orchestration and smart integrations to AI-powered scheduling and repetitive process elimination.',
      General: 'These AI tools represent the best the market has to offer, carefully selected to match your specific needs with powerful features, intuitive interfaces, and proven real-world performance.',
    };
    const category = inferCategory(trimmed);
    const initialSummary = categorySummaries[category] || categorySummaries.General;
    setSummary(initialSummary);
    setIsFallback(false);
    setStatus('analyzing');

    // Show analyzing message briefly
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show category-filtered local results
    const localResults = findLocalRecommendations(trimmed);
    setTools(localResults);
    setIsFallback(true);
    setStatus('results');

    // Cache local results immediately
    saveResultsToCache(trimmed, localResults, initialSummary);

    // Try upgrading to Gemini results in background (only if valid)
    callGeminiAPI(trimmed, { role: userRole, ...filters })
      .then(result => {
        if (result.tools && result.tools.length > 0) {
          setTools(prev => {
            // Merge: Gemini results first, then fill with local results not in Gemini
            const geminiNames = new Set(result.tools.map(t => t.name));
            const extraLocal = prev.filter(t => !geminiNames.has(t.name));
            const merged = [...result.tools, ...extraLocal];
            // Keep even count so grid rows are always full
            const final = merged.length % 2 !== 0 ? merged.slice(0, merged.length - 1) : merged;
            // Update cache with better results
            const newSummary = result.summary || initialSummary;
            saveResultsToCache(trimmed, final, newSummary);
            return final;
          });
          setSummary(result.summary || '');
          setIsFallback(false);
        }
      })
      .catch(() => {});

    // Update search history immediately in UI, then persist
    setSearchHistoryState(prev => {
      const filtered = prev.filter(q => q !== trimmed);
      return [trimmed, ...filtered].slice(0, 15);
    });
    saveSearchHistory(user.uid, trimmed).catch(() => {});
    trackSearch(trimmed, inferCategory(trimmed));
  }, [user, credits, userRole, filters, getCachedResults, saveResultsToCache]);

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
    if (!user || showMoreLoading || credits <= 0) return;

    setShowMoreLoading(true);
    try {
      const excludeNames = tools.map(t => t.name);
      const existingNames = new Set(tools.map(t => t.name.toLowerCase()));

      // Get more local results matching grid columns (never duplicates)
      const fetchCount = toolListColumns || 2;
      const { findMoreTools } = await import('./utils/fallback');
      const localMore = findMoreTools(query, excludeNames, fetchCount);
      const uniqueLocal = localMore.filter(t => !existingNames.has(t.name.toLowerCase()));

      if (uniqueLocal.length > 0) {
        setTools(prev => [...prev, ...uniqueLocal]);
        setCredits(prev => { const n = prev - 1; return n >= 0 ? n : 0; });
        useCredit(user.uid).catch(() => {});
      } else {
        // No more local tools, try Gemini for 2 more
        try {
          const result = await callGeminiAPI(query, {
            role: userRole,
            ...filters,
            excludeTools: excludeNames,
            maxTools: fetchCount,
          });
          if (result.tools && result.tools.length > 0) {
            setTools(prev => {
              const shown = new Set(prev.map(t => t.name.toLowerCase()));
              const fresh = result.tools.filter(t => !shown.has(t.name.toLowerCase())).slice(0, fetchCount);
              return fresh.length > 0 ? [...prev, ...fresh] : prev;
            });
          }
        } catch {
          // Gemini failed — button stays visible for retry
        }
      }
    } finally {
      setShowMoreLoading(false);
    }
  }, [user, tools, query, userRole, filters, showMoreLoading, credits, toolListColumns]);

  // Keep search results cache in sync whenever tools update
  useEffect(() => {
    if (tools.length > 0 && query.trim().length >= 3 && status === 'results') {
      saveResultsToCache(query.trim(), tools, summary);
    }
  }, [tools, query, summary, status, saveResultsToCache]);

  // Bookmarks
  const handleToggleBookmark = useCallback(async (tool) => {
    if (!user) return;
    const isBookmarked = bookmarks.some(b => b.name === tool.name);
    if (isBookmarked) {
      // Remove immediately from state, then persist
      setBookmarks(prev => prev.filter(b => b.name !== tool.name));
      removeBookmark(user.uid, tool.name).catch(() => {});
    } else {
      // Normalize tool data to ensure consistent shape
      const saved = {
        name: tool.name,
        url: tool.url || '',
        rating: tool.rating || 0,
        ratingSource: tool.ratingSource || '',
        pricing: tool.pricing || 'Freemium',
        bestFor: tool.bestFor || '',
        savedAt: Date.now(),
      };
      setBookmarks(prev => [saved, ...prev]);
      // Pass the normalized object so Firebase gets the same data
      saveBookmark(user.uid, saved).catch(() => {});
    }
  }, [user, bookmarks]);

  const handleRemoveBookmark = useCallback(async (toolName) => {
    if (!user) return;
    // Update UI immediately, persist in background
    setBookmarks(prev => prev.filter(b => b.name !== toolName));
    removeBookmark(user.uid, toolName).catch(() => {});
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

  // Build a local comparison from tool data
  function buildLocalComparison(selectedTools) {
    const pricingRank = { Free: 3, Freemium: 2, Premium: 1 };
    const sorted = [...selectedTools].sort((a, b) => b.rating - a.rating);
    const winner = sorted[0];

    return {
      comparison: selectedTools.map(tool => ({
        tool: tool.name,
        pros: [
          `Rated ${tool.rating}/5`,
          tool.bestFor ? `Best for: ${tool.bestFor}` : 'Versatile AI tool',
          tool.pricing === 'Free' ? 'Completely free to use' : tool.pricing === 'Freemium' ? 'Free tier available' : 'Full-featured premium tool',
        ],
        cons: [
          tool.pricing === 'Premium' ? 'Requires paid subscription' : 'Advanced features may require upgrade',
          tool.rating < 4.8 ? 'Slightly lower community rating' : 'High demand may cause wait times',
        ],
        pricing: tool.pricing,
        verdict: `${tool.name} is a strong choice${tool.bestFor ? ` for ${tool.bestFor.toLowerCase()}` : ''}.`,
      })),
      winner: winner.name,
      winnerReason: `Highest rated (${winner.rating}/5) with ${winner.pricing.toLowerCase()} pricing${winner.bestFor ? `, excelling at ${winner.bestFor.toLowerCase()}` : ''}.`,
    };
  }

  const handleCompare = useCallback(async () => {
    if (!user || compareSelected.length < 2 || compareLoading || credits <= 0) return;

    setCompareLoading(true);

    // Show local comparison instantly
    const localComparison = buildLocalComparison(compareSelected);
    setComparisonData(localComparison);
    setCredits(prev => { const n = prev - 1; return n >= 0 ? n : 0; });
    useCredit(user.uid).catch(() => {});

    // Try upgrading with Gemini in background
    callGeminiCompareAPI(compareSelected, query, userRole)
      .then(result => {
        if (result?.comparison) setComparisonData(result);
      })
      .catch(() => {});

    setCompareLoading(false);
  }, [user, compareSelected, query, userRole, compareLoading, credits]);

  // Navigation helpers
  const navigateToSearch = useCallback((searchQuery) => {
    setPage('home');
    setQuery(searchQuery);
    performSearch(searchQuery, { useCache: true });
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
        mode={mode}
        onModeChange={setMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {mode === 'find' && (
        <>
          <div className="home-content">
            <CategoryChips activeChip={activeChip} onChipClick={handleChipClick} />

            <main className="search-wrapper">
              <SearchBox
                query={query}
                setQuery={setQuery}
                onSearch={handleSearch}
                isLoading={status === 'loading' || status === 'analyzing'}
                disabled={credits <= 0}
              />
              <QuickFilters filters={filters} setFilters={setFilters} />
            </main>
          </div>

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
            noMoreTools={false}
          />
        </>
      )}

      {mode === 'workflow' && (
        <WorkflowSection
          credits={credits}
          bookmarkedNames={bookmarkedNames}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {showBookmarks && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onRemove={handleRemoveBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {compareSelected.length > 0 && (
        <CompareFloatingPopup
          selected={compareSelected}
          onRemove={handleToggleCompare}
          onCompare={handleCompare}
          compareLoading={compareLoading}
          credits={credits}
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
