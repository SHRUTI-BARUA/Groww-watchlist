import { useState } from 'react';
import { api } from './api';
import { TargetIcon, ClockIcon, ShieldIcon, ZapIcon, ActivityIcon } from './Icons';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    if (e) e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let res;
      try {
        res = mode === 'login' ? await api.login(email, password) : await api.register(email, password);
      } catch (loginErr) {
        // If demo user doesn't exist yet on first boot, auto-register
        if (mode === 'login' && email === 'demo@example.com') {
          res = await api.register(email, password);
        } else {
          throw loginErr;
        }
      }
      api.setToken(res.token);
      onAuthed(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleDemoSignIn = async () => {
    setEmail('demo@example.com');
    setPassword('password123');
    setError(null);
    setBusy(true);
    try {
      let res;
      try {
        res = await api.login('demo@example.com', 'password123');
      } catch {
        res = await api.register('demo@example.com', 'password123');
      }
      api.setToken(res.token);
      onAuthed(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-viewport">
      {/* Top Header */}
      <div className="auth-nav-bar">
        <div className="auth-brand-pill">
          <ActivityIcon size={16} />
          <span>NSE MARKET INTELLIGENCE TERMINAL</span>
        </div>
      </div>

      <div className="auth-center-stage">
        <div className="auth-terminal-card animate-slide-up">
          <div className="auth-hero-heading">
            <h1 className="auth-main-title">THE WATCHLIST</h1>
            <p className="auth-main-tagline">
              Not what the price is right now. <b>What changed since you last looked</b>, and whether it actually matters.
            </p>
          </div>

          {/* 1-Click Demo Login Banner */}
          <div className="demo-access-panel">
            <div className="demo-info-col">
              <div className="demo-title-row">
                <ZapIcon size={14} className="demo-zap-icon" />
                <span className="demo-title-text">Instant Demo Access</span>
              </div>
              <span className="demo-sub-text">Pre-seeded with live simulated NSE universe & volatility engine</span>
            </div>
            <button
              type="button"
              className="demo-launch-btn"
              disabled={busy}
              onClick={handleDemoSignIn}
            >
              {busy ? 'Launching…' : 'Enter as Demo User →'}
            </button>
          </div>

          <div className="auth-separator-strip">
            <div className="sep-line" />
            <span className="sep-text">OR SIGN IN WITH CREDENTIALS</span>
            <div className="sep-line" />
          </div>

          <form className="auth-form-body" onSubmit={submit}>
            {error && <div className="auth-error-banner animate-fade-in" role="alert">{error}</div>}
            
            <div className="input-group">
              <label className="terminal-input-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="terminal-input-field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="input-group">
              <label className="terminal-input-label" htmlFor="password">Password (min 6 characters)</label>
              <input
                id="password"
                className="terminal-input-field"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </div>

            <button className="auth-submit-btn" type="submit" disabled={busy}>
              {busy ? 'Authenticating…' : mode === 'login' ? 'Sign In to Workspace' : 'Create New Account'}
            </button>
          </form>

          <div className="auth-mode-switch">
            {mode === 'login' ? (
              <>Don't have an account? <button className="mode-toggle-link" onClick={() => setMode('register')}>Create one now</button></>
            ) : (
              <>Already have an account? <button className="mode-toggle-link" onClick={() => setMode('login')}>Sign in here</button></>
            )}
          </div>

          {/* Core Architectural Pillars */}
          <div className="auth-pillars-grid">
            <div className="pillar-tile">
              <div className="pillar-icon-box">
                <TargetIcon size={16} />
              </div>
              <div className="pillar-desc">
                <b className="pillar-name">Attention Score (0–100)</b>
                <span className="pillar-detail">Z-score normalized moves & volume conviction</span>
              </div>
            </div>

            <div className="pillar-tile">
              <div className="pillar-icon-box">
                <ClockIcon size={16} />
              </div>
              <div className="pillar-desc">
                <b className="pillar-name">Checkpoint Diffs</b>
                <span className="pillar-detail">Cross-session price deltas that persist across reloads</span>
              </div>
            </div>

            <div className="pillar-tile">
              <div className="pillar-icon-box">
                <ShieldIcon size={16} />
              </div>
              <div className="pillar-desc">
                <b className="pillar-name">Resilience Layer</b>
                <span className="pillar-detail">Circuit-breaker cached quotes with fallback freshness</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
