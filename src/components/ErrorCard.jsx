export default function ErrorCard({ type, onRetry, onFallback }) {
  const config = {
    credits_depleted: {
      icon: '\u26A0\uFE0F',
      title: 'Credits Depleted',
      message: "You've used all 50 of your credits. Credits will be connected to a centralized system soon.",
      showFallback: false,
      showRetry: false,
    },
    rate_limit: {
      icon: '\u23F3',
      title: 'Service Busy',
      message: 'The AI service is experiencing high demand. Please try again in a few minutes.',
      showFallback: true,
      showRetry: true,
    },
    api_key: {
      icon: '\u26A0\uFE0F',
      title: 'Configuration Error',
      message: 'The API key is missing or invalid. Please add your Gemini API key to the .env file.',
      showFallback: true,
      showRetry: false,
    },
    network: {
      icon: '\uD83D\uDD0C',
      title: 'Connection Error',
      message: 'Unable to reach the AI service. Please check your internet connection.',
      showFallback: true,
      showRetry: true,
    },
  };

  const { icon, title, message, showFallback, showRetry } = config[type] || config.network;

  return (
    <div className={`error-card error-${type}`}>
      <span className="error-icon">{icon}</span>
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
