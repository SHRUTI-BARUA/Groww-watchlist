import { CheckCircleIcon, AlertTriangleIcon, ZapIcon } from './Icons';

export default function SummaryBanner({ summary, onJumpToSignificant }) {
  if (!summary) return null;

  const { state, message, significantCount, notableCount, quietCount, unavailableCount } = summary;

  if (state === 'all-clear') {
    return (
      <div className="summary-banner all-clear animate-fade-in" role="status" aria-live="polite">
        <div className="summary-icon-wrap all-clear">
          <CheckCircleIcon size={18} />
        </div>
        <div className="summary-content">
          <div className="summary-headline">
            <span className="summary-title-badge all-clear">ALL CLEAR</span>
            <span className="summary-text">{message}</span>
          </div>
          <span className="summary-subtext">
            {quietCount} of {quietCount + unavailableCount} tickers trading within normal statistical bounds
          </span>
        </div>
      </div>
    );
  }

  if (state === 'significant-present') {
    return (
      <div className="summary-banner significant animate-fade-in" role="alert" aria-live="assertive">
        <div className="summary-icon-wrap significant">
          <AlertTriangleIcon size={18} />
        </div>
        <div className="summary-content">
          <div className="summary-headline">
            <span className="summary-title-badge significant">ATTENTION REQUIRED</span>
            <span className="summary-text">{message}</span>
          </div>
          <div className="summary-action-row">
            <span className="summary-subtext">
              {significantCount} significant dislocation{significantCount > 1 ? 's' : ''} detected outside 2.5σ baseline
            </span>
            {onJumpToSignificant && (
              <button className="summary-jump-btn" onClick={onJumpToSignificant}>
                Inspect Top Movers ↓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // notable-present
  return (
    <div className="summary-banner notable animate-fade-in" role="status" aria-live="polite">
      <div className="summary-icon-wrap notable">
        <ZapIcon size={18} />
      </div>
      <div className="summary-content">
        <div className="summary-headline">
          <span className="summary-title-badge notable">NOTABLE ACTIVITY</span>
          <span className="summary-text">{message}</span>
        </div>
        <span className="summary-subtext">
          {notableCount} ticker{notableCount > 1 ? 's' : ''} with elevated volume or momentum
        </span>
      </div>
    </div>
  );
}
