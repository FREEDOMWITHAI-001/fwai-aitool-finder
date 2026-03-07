export default function CreditsBadge({ credits }) {
  const isDepleted = credits <= 0;
  const isLow = credits > 0 && credits <= 5;

  return (
    <div className={`credits-badge ${isDepleted ? 'depleted' : ''} ${isLow ? 'low' : ''}`}>
      <span className="credits-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </span>
      <span className="credits-count">{credits}</span>
      <span className="credits-label">credits</span>
    </div>
  );
}
