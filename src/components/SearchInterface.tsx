'use client';

import { useState } from 'react';
import { findRecommendations, capitalizeFirstLetter } from '@/lib/search';
import { RecommendedTool } from '@/types';
import ToolCard from './ToolCard';

export default function SearchInterface() {
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState<RecommendedTool[] | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [visible,      setVisible]      = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isAIPowered,  setIsAIPowered]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || isLoading) return;

    setVisible(false);
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q }),
      });

      if (!res.ok) throw new Error('API error');

      const { tools } = await res.json();
      setCurrentQuery(q);
      setResults(tools);
      setIsAIPowered(true);
    } catch {
      /* Fallback to static data */
      const fallback = findRecommendations(q.toLowerCase());
      const mapped: RecommendedTool[] = fallback.map((t) => ({
        name:        t.name,
        description: `A popular AI tool for ${t.categories[0] ?? 'various tasks'}.`,
        pricing:     t.pricing as 'Free' | 'Freemium' | 'Paid',
        rating:      t.rating,
        link:        t.link,
        trending:    t.trending,
        tags:        t.categories.slice(0, 6),
      }));
      setCurrentQuery(q);
      setResults(mapped);
      setIsAIPowered(false);
      setError('Showing local results — Gemini API unavailable.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setVisible(true), 60);
    }
  };

  return (
    <>
      {/* ── Search bar ─────────────────────── */}
      <main className="search-wrapper">
        <div className="search-container">
          <svg
            className="search-icon"
            width="18" height="18"
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            placeholder="Try: video editing, coding, SEO, resume…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />

          <button className="search-btn" onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                Thinking…
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {error && <p className="search-error">{error}</p>}
      </main>

      {/* ── Loading skeleton ───────────────── */}
      {isLoading && (
        <div className="loading-container">
          {[0, 1, 2].map((i) => (
            <div key={i} className="loading-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="loading-rank" />
              <div className="loading-line loading-name" />
              <div className="loading-badges">
                <div className="loading-badge" />
                <div className="loading-badge" />
              </div>
              <div className="loading-line loading-desc" />
              <div className="loading-line loading-desc2" />
              <div className="loading-tags">
                {[0,1,2,3].map((j) => <div key={j} className="loading-tag" />)}
              </div>
              <div className="loading-btn" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ────────────────────────── */}
      {!isLoading && results !== null && (
        <section id="results-section" className={visible ? 'show' : ''}>
          {results.length === 0 ? (
            <p className="no-results">No tools found. Try a different search term.</p>
          ) : (
            <>
              <div className="results-header">
                <span className="results-label">
                  Results for{' '}
                  <span className="results-query">
                    &ldquo;{capitalizeFirstLetter(currentQuery)}&rdquo;
                  </span>
                </span>
                <span className="results-count">{results.length} found</span>
                {isAIPowered && <span className="gemini-badge">✦ Gemini AI</span>}
              </div>

              <div className="tool-list">
                {results.map((tool, index) => (
                  <ToolCard key={tool.name} tool={tool} index={index} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
