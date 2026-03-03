export default function CreditsBadge({ credits }) {
  const isDepleted = credits <= 0;
  const isLow = credits > 0 && credits <= 5;

  return (
    <div className={`credits-badge ${isDepleted ? 'depleted' : ''} ${isLow ? 'low' : ''}`}>
      <span className="credits-icon">{isDepleted ? '\u26A0' : '\u26A1'}</span>
      <span className="credits-count">{credits}</span>
      <span className="credits-label">credits</span>
    </div>
  );
}
