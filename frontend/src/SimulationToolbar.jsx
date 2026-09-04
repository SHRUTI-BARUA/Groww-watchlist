import { useState } from 'react';
import { api } from './api';
import { ZapIcon, NewspaperIcon, ShieldAlertIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon, CheckCircleIcon } from './Icons';

const DEFAULT_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'TATAMOTORS', 'ZOMATO', 'SUZLON', 'ADANIPOWER', 'YESBANK', 'BSE', 'IRFC'
];

export default function SimulationToolbar({ onSimulatedEvent, onClose }) {
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [customHeadline, setCustomHeadline] = useState('');
  const [newsTag, setNewsTag] = useState('earnings');
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [forcedBreaker, setForcedBreaker] = useState(false);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleShock = async (pct, volumeMult, label) => {
    setLoadingAction(`shock-${label}`);
    try {
      const res = await api.simulateShock(selectedSymbol, pct, volumeMult);
      showStatus(`Injected ${pct > 0 ? '+' : ''}${pct}% price move on ${selectedSymbol} with ${volumeMult}x volume.`);
      if (onSimulatedEvent) onSimulatedEvent(res);
    } catch (err) {
      showStatus(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInjectNews = async () => {
    setLoadingAction('news');
    try {
      const res = await api.simulateNews(selectedSymbol, customHeadline.trim() || undefined, newsTag);
      showStatus(`Injected breaking ${newsTag} catalyst for ${selectedSymbol}.`);
      setCustomHeadline('');
      if (onSimulatedEvent) onSimulatedEvent(res);
    } catch (err) {
      showStatus(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBreaker = async (enable) => {
    setLoadingAction('breaker');
    try {
      const res = await api.simulateBreaker(enable);
      setForcedBreaker(enable);
      showStatus(enable ? 'Simulated upstream provider outage. Circuit breaker tripped into open state.' : 'Upstream provider restored to healthy status.');
      if (onSimulatedEvent) onSimulatedEvent(res);
    } catch (err) {
      showStatus(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    setLoadingAction('reset');
    try {
      await api.simulateReset();
      setForcedBreaker(false);
      showStatus('Universe prices restored to base starting points.');
      if (onSimulatedEvent) onSimulatedEvent({ reset: true });
    } catch (err) {
      showStatus(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="sim-studio-deck animate-slide-down" role="region" aria-label="Demo simulation studio">
      <div className="sim-studio-header">
        <div className="sim-title-group">
          <span className="sim-badge">DEMO STUDIO</span>
          <span className="sim-headline">Live Market Event & Resilience Testing Deck</span>
        </div>
        <button className="sim-close-btn" onClick={onClose} aria-label="Close demo studio">✕</button>
      </div>

      <div className="sim-studio-body">
        {/* Target Stock Selector */}
        <div className="sim-control-col">
          <label className="sim-col-label" htmlFor="sim-target-symbol">1. TARGET TICKER</label>
          <div className="sim-symbol-selector">
            <select
              id="sim-target-symbol"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="sim-select"
            >
              {DEFAULT_SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Volatility & Attention Shock Presets */}
        <div className="sim-control-col wide">
          <label className="sim-col-label">2. TRIGGER ATTENTION SHOCK</label>
          <div className="sim-btn-row">
            <button
              className="sim-action-btn surge"
              disabled={loadingAction !== null}
              onClick={() => handleShock(5.2, 5.0, 'surge')}
              title="Inject +5.2% move on 5x volume"
            >
              <TrendingUpIcon size={14} />
              <span>+5.2% Surge (5x Vol)</span>
            </button>
            <button
              className="sim-action-btn plunge"
              disabled={loadingAction !== null}
              onClick={() => handleShock(-5.2, 4.5, 'plunge')}
              title="Inject -5.2% drop on 4.5x volume"
            >
              <TrendingDownIcon size={14} />
              <span>-5.2% Plunge (4.5x Vol)</span>
            </button>
            <button
              className="sim-action-btn circuit"
              disabled={loadingAction !== null}
              onClick={() => handleShock(10.0, 7.0, 'circuit')}
              title="Force stock to touch Upper Circuit"
            >
              <ZapIcon size={13} />
              <span>Upper Circuit (+10%)</span>
            </button>
          </div>
        </div>

        {/* Breaking News Catalyst */}
        <div className="sim-control-col news-col">
          <label className="sim-col-label" htmlFor="sim-custom-headline">3. INJECT BREAKING NEWS</label>
          <div className="sim-news-form">
            <select
              value={newsTag}
              onChange={(e) => setNewsTag(e.target.value)}
              className="sim-news-tag-select"
              aria-label="Catalyst Category"
            >
              <option value="earnings">Earnings</option>
              <option value="corp-action">Corp Action</option>
              <option value="general">Brokerage</option>
            </select>
            <input
              id="sim-custom-headline"
              type="text"
              placeholder={`Headline for ${selectedSymbol} (optional)…`}
              value={customHeadline}
              onChange={(e) => setCustomHeadline(e.target.value)}
              className="sim-news-input"
            />
            <button
              className="sim-action-btn news"
              disabled={loadingAction !== null}
              onClick={handleInjectNews}
            >
              <NewspaperIcon size={14} />
              <span>Drop News</span>
            </button>
          </div>
        </div>

        {/* Circuit Breaker & Resilience Testing */}
        <div className="sim-control-col resilience-col">
          <label className="sim-col-label">4. RESILIENCE / CIRCUIT BREAKER</label>
          <div className="sim-btn-row">
            {!forcedBreaker ? (
              <button
                className="sim-action-btn outage"
                disabled={loadingAction !== null}
                onClick={() => handleToggleBreaker(true)}
                title="Force upstream provider failure to test circuit breaker fallback"
              >
                <ShieldAlertIcon size={14} />
                <span>Simulate Outage</span>
              </button>
            ) : (
              <button
                className="sim-action-btn recover"
                disabled={loadingAction !== null}
                onClick={() => handleToggleBreaker(false)}
                title="Restore upstream provider to healthy status"
              >
                <CheckCircleIcon size={14} />
                <span>Restore Feed</span>
              </button>
            )}
            <button
              className="sim-action-btn reset"
              disabled={loadingAction !== null}
              onClick={handleReset}
              title="Reset all universe prices"
            >
              <RefreshCwIcon size={13} />
              <span>Reset Market</span>
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="sim-status-banner animate-fade-in" role="status">
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  );
}
