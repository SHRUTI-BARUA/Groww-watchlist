import { useEffect } from 'react';
import {
  LightbulbIcon,
  CheckCircleIcon,
  ZapIcon,
  AlertTriangleIcon,
  ActivityIcon,
  LayersIcon,
  CompassIcon,
  BarChart2Icon,
} from './Icons';

export default function BeginnerGuideModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content beginner-guide-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header guide-header">
          <div className="modal-title-left">
            <div className="modal-symbol-line">
              <div className="guide-header-icon-box">
                <LightbulbIcon size={20} />
              </div>
              <div>
                <h2 className="guide-modal-title">Beginner's Master Guide: How to Use Smart Watchlist</h2>
                <span className="guide-modal-sub">Everything you need to understand markets, attention scores, and diffs in 2 minutes</span>
              </div>
            </div>
          </div>
          <button className="modal-close-icon" onClick={onClose} aria-label="Close guide">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-tab-body guide-body-scroll">
          {/* Section 1: The Core Idea */}
          <div className="guide-card-item highlight">
            <div className="guide-card-icon-col">
              <CompassIcon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>1. The Big Question We Answer</h3>
              <p>
                Traditional watchlists just show today's percentage change (+1.5%, -0.8%). But what you actually want to know is:
                <br />
                <b>"I haven't checked my watchlist since yesterday — what happened while I was away, and does any of it actually matter?"</b>
              </p>
            </div>
          </div>

          {/* Section 2: Why 6-Signal Attention Score Beats Simple Percentages */}
          <div className="guide-card-item">
            <div className="guide-card-icon-col">
              <ActivityIcon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>2. Why Attention Score Beats Simple Percentages</h3>
              <p>
                A <b>+2% jump in TCS</b> (a stable giant) is a rare big deal, but a <b>+2% move in Suzlon</b> (a volatile smallcap) happens almost every single day.
              </p>
              <p>
                Our <b>Attention Score (0–100)</b> compares every move against each stock's own historical volatility, trading volume, circuit limits, and news:
              </p>
              <div className="guide-bucket-grid">
                <div className="guide-bucket-box quiet">
                  <div className="bucket-head">
                    <CheckCircleIcon size={14} />
                    <b>Score 0–24: Quiet</b>
                  </div>
                  <p>Normal trading day. Completely safe to ignore. No action needed.</p>
                </div>

                <div className="guide-bucket-box notable">
                  <div className="bucket-head">
                    <ZapIcon size={14} />
                    <b>Score 25–59: Notable</b>
                  </div>
                  <p>Higher than normal volume or momentum. Worth a quick glance.</p>
                </div>

                <div className="guide-bucket-box significant">
                  <div className="bucket-head">
                    <AlertTriangleIcon size={14} />
                    <b>Score 60–100: Significant</b>
                  </div>
                  <p>Major statistical dislocation or catalyst event. Requires immediate review.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: The Checkpoint ("Since You Last Checked") */}
          <div className="guide-card-item">
            <div className="guide-card-icon-col">
              <BarChart2Icon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>3. How Personal Checkpoints Work</h3>
              <p>
                When you click <b>"Mark All as Seen"</b>, the platform records the exact timestamp and price of every stock on your list.
              </p>
              <p>
                When you return hours or days later, we show you the <b>delta relative to your personal checkpoint</b> — not just "today's open".
              </p>
            </div>
          </div>

          {/* Section 4: Quiet Confirmation ("All Clear") */}
          <div className="guide-card-item">
            <div className="guide-card-icon-col">
              <CheckCircleIcon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>4. Quiet Confirmation ("Nothing to See Here")</h3>
              <p>
                When all stocks on your watchlist are quiet, the top banner turns into a calm <b>ALL CLEAR</b> badge and de-emphasizes the row list.
                You can trust the headline and close the app in <b>5 seconds</b> without scanning every row!
              </p>
            </div>
          </div>

          {/* Section 5: Sector Co-Movement Clusters */}
          <div className="guide-card-item">
            <div className="guide-card-icon-col">
              <LayersIcon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>5. Correlated Sector Clusters</h3>
              <p>
                If 3 banking stocks rise together on an RBI interest rate cut, we don't spam you with 3 separate alerts.
                We automatically group them into <b>one clean Sector Co-Movement Card</b> with a unified explanation.
              </p>
            </div>
          </div>

          {/* Section 6: Click for Instant Plain-English Insights */}
          <div className="guide-card-item highlight">
            <div className="guide-card-icon-col">
              <LightbulbIcon size={18} />
            </div>
            <div className="guide-card-text-col">
              <h3>6. Deep Insights in Plain English</h3>
              <p>
                Click <b>any stock card</b> at any time to open full telemetry with our <b>Plain English Decision Guide</b> — converting all Wall Street math into everyday language with clear recommendations!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="guide-footer-hint">Press <b>ESC</b> or click Done to return to your live terminal</span>
          <button className="pill-btn primary" onClick={onClose}>Got It, Let's Trade</button>
        </div>
      </div>
    </div>
  );
}
