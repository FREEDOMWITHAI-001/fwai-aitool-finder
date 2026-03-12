export default function ErrorCard({ type, onRetry, onFallback }) {
  const config = {
    credits_depleted: {
      iconType: 'danger',
      title: 'Credits Depleted',
      message: "You've used all your credits. Credits will be connected to a centralized system soon.",
      showFallback: false,
      showRetry: false,
    },
    rate_limit: {
      iconType: 'warn',
      title: 'Service Busy',
      message: 'The AI service is experiencing high demand. Please try again in a few minutes.',
      showFallback: true,
      showRetry: true,
    },
    api_key: {
      iconType: 'warn',
      title: 'Configuration Error',
      message: 'The API key is missing or invalid. Please add your Gemini API key to the .env file.',
      showFallback: true,
      showRetry: false,
    },
    network: {
      iconType: 'danger',
      title: 'Connection Error',
      message: 'Unable to reach the AI service. Please check your internet connection.',
      showFallback: true,
      showRetry: true,
    },
  };

  const { iconType, title, message, showFallback, showRetry } = config[type] || config.network;

  return (
    <div className={`error-card error-${type}`}>
      <div className={`error-icon error-${iconType}`}>
        {iconType === 'warn' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message}</p>
      <div className="error-actions">
        {showRetry && (
          <button className="error-action-btn" onClick={onRetry}>
            Retry
          </button>
        )}
        {showFallback && (
          <button className="error-action-btn secondary" onClick={onFallback}>
            Search Locally
          </button>
        )}
      </div>
    </div>
  );
}
