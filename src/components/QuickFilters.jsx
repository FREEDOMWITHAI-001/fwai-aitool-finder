export default function QuickFilters({ filters, setFilters }) {
  const budgetOptions = ['Any price', 'Free only', 'Under $20/mo'];
  const teamOptions = ['Solo', 'Small team', 'Enterprise'];

  function toggle(key, value) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? (key === 'budget' ? 'Any price' : 'Solo') : value }));
  }

  return (
    <div className="quick-filters">
      <div className="filter-group">
        <span className="filter-label">Budget:</span>
        {budgetOptions.map(opt => (
          <button
            key={opt}
            className={`filter-chip ${filters.budget === opt ? 'active' : ''}`}
            onClick={() => toggle('budget', opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="filter-group">
        <span className="filter-label">Team:</span>
        {teamOptions.map(opt => (
          <button
            key={opt}
            className={`filter-chip ${filters.teamSize === opt ? 'active' : ''}`}
            onClick={() => toggle('teamSize', opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
