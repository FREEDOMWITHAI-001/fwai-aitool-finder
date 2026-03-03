import { useState, useEffect } from 'react';

const phrases = [
  'Analyzing your use case...',
  'Searching across AI tools...',
  'Comparing features and pricing...',
  'Preparing personalized recommendations...',
];

export default function LoadingSkeleton() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % phrases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-container">
      <div className="skeleton-card" style={{ animationDelay: '0s' }} />
      <div className="skeleton-card" style={{ animationDelay: '0.15s' }} />
      <div className="skeleton-card" style={{ animationDelay: '0.3s' }} />
      <p className="loading-text">{phrases[phraseIndex]}</p>
    </div>
  );
}
