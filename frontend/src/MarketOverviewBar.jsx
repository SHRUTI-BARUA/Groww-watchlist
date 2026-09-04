import { useEffect, useState } from 'react';
import { api } from './api';
import { ZapIcon, BellIcon, AlertTriangleIcon } from './Icons';

export default function MarketOverviewBar({
  watchlistItems = [],
  audioAlerts,
  onToggleAudio,
  showSimStudio,
  onToggleSimStudio,
}) {
  const [overview, setOverview] = useState(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchOverview = async () => {
      try {
        const data = await api.getMarketOverview();
        if (mounted) setOverview(data);
      } catch {
        // silent fallback
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60000);
      setClock(istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  // Compute watchlist pulse stats
  const validItems = watchlistItems.filter((i) => !i.error);
  const totalCount = validItems.length;
  const avgScore = totalCount > 0
    ? Math.round(validItems.reduce((acc, i) => acc + (i.attention?.score || 0), 0) / totalCount)
    : 0;
  const sigCount = validItems.filter((i) => i.attention?.bucket === 'significant').length;
  const notCount = validItems.filter((i) => i.attention?.bucket === 'notable').length;

  const breadth = overview?.breadth || { advances: 0, declines: 0, unchanged: 0 };
  const isMarketOpen = overview?.marketOpen ?? false;

  return (
    <div className="market-pulse-bar" role="region" aria-label="Market overview and controls">
      <div className="market-pulse-left">
        <div className="pulse-item market-clock-badge">
          <span className={`status-indicator-dot ${isMarketOpen ? 'live' : 'sim'}`} />
          <span className="pulse-label">{isMarketOpen ? 'NSE LIVE' : 'NSE SIMULATED'}</span>
          <span className="pulse-value num">{clock || overview?.istTime || '--:--:--'} IST</span>
        </div>

        <div className="pulse-divider" />

        <div className="pulse-item market-breadth" title="Advances / Declines across market universe">
          <span className="pulse-label">BREADTH</span>
          <span className="breadth-pill up num" aria-label={`${breadth.advances} stocks advancing`}>
            ▲ {breadth.advances}
          </span>
          <span className="breadth-pill down num" aria-label={`${breadth.declines} stocks declining`}>
            ▼ {breadth.declines}
          </span>
        </div>

        <div className="pulse-divider" />

        <div className="pulse-item watchlist-stats">
          <span className="pulse-label">PULSE</span>
          <span className="pulse-val-highlight num">
            Avg Score: <b>{avgScore}</b>
          </span>
          {sigCount > 0 && (
            <span className="alert-badge significant animate-pulse">
              <AlertTriangleIcon size={12} />
              <span>{sigCount} Significant</span>
            </span>
          )}
          {sigCount === 0 && notCount > 0 && (
            <span className="alert-badge notable">
              <ZapIcon size={11} />
              <span>{notCount} Notable</span>
            </span>
          )}
        </div>
      </div>

      <div className="market-pulse-right">
        <button
          className={`studio-toggle-btn ${showSimStudio ? 'active' : ''}`}
          onClick={onToggleSimStudio}
          title="Open Market Simulation & Resilience Demo Deck"
          aria-expanded={showSimStudio}
        >
          <ZapIcon size={13} />
          <span>Demo Studio</span>
        </button>

        <button
          className="icon-control-btn"
          onClick={onToggleAudio}
          title={audioAlerts ? 'Alert sounds active (Click to mute)' : 'Alert sounds muted (Click to enable)'}
          aria-label={audioAlerts ? 'Mute alert sounds' : 'Enable alert sounds'}
        >
          <BellIcon size={14} active={audioAlerts} />
          <span>{audioAlerts ? 'Audio On' : 'Muted'}</span>
        </button>
      </div>
    </div>
  );
}
