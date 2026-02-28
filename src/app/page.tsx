import SearchInterface from '@/components/SearchInterface';

export default function Home() {
  return (
    <div className="container">
      <header className="hero">
        {/* Badge */}
        <div className="hero-badge">
          <div className="hero-badge-icon">
            {/* Robot / CPU icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <path d="M8 15h.01M12 15h.01M16 15h.01" />
            </svg>
          </div>
          AI Tool Discovery Engine
        </div>

        <h1>AI Tools Finder</h1>
        <p className="subtitle">
          Describe your challenge and we&apos;ll instantly match you
          with the right AI tool to get it solved.
        </p>
      </header>

      <SearchInterface />
    </div>
  );
}
