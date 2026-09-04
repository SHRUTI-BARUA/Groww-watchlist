import { useEffect, useState } from 'react';
import { api } from './api';
import PlainEnglishInsights from './PlainEnglishInsights';
import { ZapIcon, AlertTriangleIcon, ActivityIcon, NewspaperIcon, BarChart2Icon, TrendingUpIcon, TrendingDownIcon, CheckCircleIcon, LightbulbIcon } from './Icons';

function formatTimeAgo(ts) {
  if (!ts) return null;
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(num) {
  if (!num) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' k';
  return num.toString();
}

export default function TickerDetailModal({ item, live, onClose, onShockStock }) {
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'overview' | 'signals' | 'news'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const symbol = item.symbol;
  const price = live?.price ?? item.quote.price;
  const prevClose = item.quote.prevClose;
  const dayChange = price - prevClose;
  const dayChangePct = ((dayChange) / prevClose) * 100;
  const isUp = dayChangePct >= 0;

  const score = live?.attentionScore ?? item.attention.score;
  const bucket = live?.attentionBucket ?? item.attention.bucket;
  const reason = live?.attentionReason ?? item.attention.reason;
  const diff = item.diff;

  const quote = item.quote;
  const high52w = quote.high52w || (prevClose * 1.25);
  const low52w = quote.low52w || (prevClose * 0.75);
  const upperCircuit = quote.upperCircuit || (prevClose * 1.10);
  const lowerCircuit = quote.lowerCircuit || (prevClose * 0.90);

  // Range % calculation for 52W visual bar
  const range52wSpan = high52w - low52w;
  const pos52wPct = range52wSpan > 0 ? Math.max(0, Math.min(100, ((price - low52w) / range52wSpan) * 100)) : 50;

  // Circuit % distance
  const distToUpperPct = Math.max(0, ((upperCircuit - price) / price) * 100);
  const distToLowerPct = Math.max(0, ((price - lowerCircuit) / price) * 100);

  useEffect(() => {
    let isMounted = true;
    setLoadingHistory(true);
    api.getTickerHistory(symbol)
      .then((data) => {
        if (isMounted) {
          setHistoryData(data);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingHistory(false);
      });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [symbol, onClose]);

  // Render SVG Sparkline Chart
  const renderSparkline = () => {
    const snapshots = historyData?.snapshots || [];
    let points = snapshots.map((s) => s.price);
    if (points.length < 2) {
      points = [quote.dayOpen, quote.dayLow, (quote.dayHigh + quote.dayLow) / 2, quote.dayHigh, price];
    }

    const min = Math.min(...points) * 0.998;
    const max = Math.max(...points) * 1.002;
    const span = max - min || 1;
    const width = 560;
    const height = 140;
    const padding = 16;

    const coordinates = points.map((p, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - min) / span) * (height - 2 * padding);
      return { x, y, price: p, index: idx };
    });

    const pathString = coordinates.map((c) => `${c.x},${c.y}`).join(' L ');
    const linePath = `M ${pathString}`;
    const areaPath = `M ${padding},${height - padding} L ${pathString} L ${width - padding},${height - padding} Z`;

    const strokeColor = isUp ? 'var(--gain)' : 'var(--loss)';

    return (
      <div className="sparkline-chart-card">
        <div className="sparkline-chart-header">
          <div className="chart-title-wrap">
            <ActivityIcon size={14} className="chart-icon" />
            <span className="chart-title">Intraday & Snapshot Trajectory</span>
          </div>
          <span className="chart-bounds num">
            Low: {formatCurrency(Math.min(...points))} · High: {formatCurrency(Math.max(...points))}
          </span>
        </div>

        <div className="svg-chart-container">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="sparkline-svg"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Baseline reference line if available */}
            {diff?.baselinePrice && (
              <line
                x1={padding}
                y1={height - padding - ((diff.baselinePrice - min) / span) * (height - 2 * padding)}
                x2={width - padding}
                y2={height - padding - ((diff.baselinePrice - min) / span) * (height - 2 * padding)}
                stroke="var(--gold)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            )}

            {/* Interactive Data Point Dots */}
            {coordinates.map((c, idx) => (
              <circle
                key={idx}
                cx={c.x}
                cy={c.y}
                r={hoveredPoint?.index === idx ? 5 : 3}
                fill={hoveredPoint?.index === idx ? 'var(--ink)' : strokeColor}
                stroke="var(--paper-card)"
                strokeWidth="1.5"
                onMouseEnter={() => setHoveredPoint(c)}
                className="chart-dot"
              />
            ))}
          </svg>
        </div>

        <div className="chart-legend">
          {diff?.baselinePrice && (
            <span className="legend-item">
              <span className="legend-dash gold" /> Last Checked Baseline: {formatCurrency(diff.baselinePrice)}
            </span>
          )}
          <span className="legend-item">
            <span className="legend-dot" style={{ background: strokeColor }} /> Current: {formatCurrency(price)}
          </span>
          {hoveredPoint && (
            <span className="legend-hover-val num">
              Hover Point: {formatCurrency(hoveredPoint.price)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 6-Factor Signals Breakdown
  const signals = item.attention?.signals || {};
  const volZ = signals.vol?.z ? Math.abs(signals.vol.z).toFixed(1) : '1.0';
  const volRatio = signals.volu?.ratio ? signals.volu.ratio.toFixed(1) : '1.0';
  const gapPct = signals.gap?.gapPct ? signals.gap.gapPct.toFixed(1) : '0.0';

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-left">
            <div className="modal-symbol-line">
              <span className="modal-symbol serif">{symbol}</span>
              <span className="modal-name">{item.meta?.name}</span>
              <span className="modal-sector-tag">{item.meta?.sector || 'Equity'}</span>
            </div>
            <div className="modal-reason-line">
              <span className={`attn-tag-large ${bucket}`}>
                {bucket === 'significant' ? (
                  <><AlertTriangleIcon size={12} /> Significant Signal</>
                ) : bucket === 'notable' ? (
                  <><ZapIcon size={12} /> Notable Signal</>
                ) : (
                  'Quiet'
                )} · {score}/100
              </span>
              <span className="modal-reason-text">{reason}</span>
            </div>
          </div>

          <div className="modal-price-right">
            <div className="modal-price num">{formatCurrency(price)}</div>
            <div className={`modal-day-change num ${isUp ? 'up' : 'down'}`}>
              {isUp ? '+' : ''}{dayChange.toFixed(2)} ({isUp ? '+' : ''}{dayChangePct.toFixed(2)}%)
            </div>
            <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">✕</button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="modal-tabs" role="tablist">
          <button
            className={`modal-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
            role="tab"
            aria-selected={activeTab === 'insights'}
          >
            <LightbulbIcon size={14} />
            <span>Plain English Insights</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            role="tab"
            aria-selected={activeTab === 'overview'}
          >
            <BarChart2Icon size={14} />
            <span>Stock Overview & Geometry</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'signals' ? 'active' : ''}`}
            onClick={() => setActiveTab('signals')}
            role="tab"
            aria-selected={activeTab === 'signals'}
          >
            <ActivityIcon size={14} />
            <span>6-Signal Attention Breakdown</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
            role="tab"
            aria-selected={activeTab === 'news'}
          >
            <NewspaperIcon size={14} />
            <span>News & Corporate Actions ({historyData?.news?.length || 0})</span>
          </button>
        </div>

        {/* Tab 0: Plain English Insights & Decision Guide */}
        {activeTab === 'insights' && (
          <div className="modal-tab-body">
            <PlainEnglishInsights
              item={item}
              live={live}
              score={score}
              bucket={bucket}
              reason={reason}
              signals={signals}
              diff={diff}
              quote={quote}
              news={historyData?.news || []}
            />
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="modal-tab-body">
            {/* Sparkline Chart */}
            {renderSparkline()}

            {/* Baseline Diff Card */}
            <div className="diff-highlight-card">
              <div className="diff-card-title">SINCE YOUR LAST VISIT CHECKPOINT</div>
              {diff?.hasBaseline && !diff?.isFirstView ? (
                <div className="diff-stats-grid">
                  <div className="diff-stat-item">
                    <span className="diff-stat-label">Baseline Checkpoint</span>
                    <span className="diff-stat-val num">{formatTimeAgo(diff.baselineTs)}</span>
                  </div>
                  <div className="diff-stat-item">
                    <span className="diff-stat-label">Baseline Price</span>
                    <span className="diff-stat-val num">{formatCurrency(diff.baselinePrice)}</span>
                  </div>
                  <div className="diff-stat-item">
                    <span className="diff-stat-label">Price Move Since</span>
                    <span className={`diff-stat-val num ${diff.priceDelta >= 0 ? 'gain' : 'loss'}`}>
                      {diff.priceDelta >= 0 ? '+' : ''}{diff.priceDelta} ({diff.priceDeltaPct >= 0 ? '+' : ''}{diff.priceDeltaPct}%)
                    </span>
                  </div>
                  <div className="diff-stat-item">
                    <span className="diff-stat-label">Attention Delta</span>
                    <span className="diff-stat-val num">
                      {diff.scoreDelta > 0 ? `+${diff.scoreDelta} pts` : diff.scoreDelta < 0 ? `${diff.scoreDelta} pts` : 'No drift'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="diff-empty-msg">
                  First time viewing this stock on your watchlist. Click <b>"Mark all as seen"</b> to save your baseline checkpoint.
                </div>
              )}
            </div>

            {/* 52-Week Range Bar */}
            <div className="range-bar-card">
              <div className="range-card-header">
                <span className="range-label">52-Week Range</span>
                <span className="range-current-pos num">Position: {pos52wPct.toFixed(0)}% of 52W span</span>
              </div>
              <div className="range-visual-track">
                <div className="range-fill-bar" style={{ width: `${pos52wPct}%` }} />
                <div className="range-pin" style={{ left: `${pos52wPct}%` }} title={`Current: ${formatCurrency(price)}`} />
              </div>
              <div className="range-bounds-text num">
                <span>52W Low: {formatCurrency(low52w)}</span>
                <span>52W High: {formatCurrency(high52w)}</span>
              </div>
            </div>

            {/* Circuit Limits Tracker */}
            <div className="circuit-limits-card">
              <div className="circuit-header">
                <span className="circuit-title">NSE Circuit Band (±10%)</span>
                <span className="circuit-distance num">
                  {distToUpperPct <= 2 ? '⚠️ Approaching Upper Circuit' : distToLowerPct <= 2 ? '⚠️ Approaching Lower Circuit' : 'Trading safely within band'}
                </span>
              </div>
              <div className="circuit-band-row num">
                <div className="circuit-pill lower">
                  <span className="pill-sub">Lower Circuit</span>
                  <span className="pill-val">{formatCurrency(lowerCircuit)}</span>
                  <span className="pill-dist">(-{distToLowerPct.toFixed(1)}%)</span>
                </div>
                <div className="circuit-pill current">
                  <span className="pill-sub">Current Price</span>
                  <span className="pill-val">{formatCurrency(price)}</span>
                </div>
                <div className="circuit-pill upper">
                  <span className="pill-sub">Upper Circuit</span>
                  <span className="pill-val">{formatCurrency(upperCircuit)}</span>
                  <span className="pill-dist">(+{distToUpperPct.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Key Trading Statistics Grid */}
            <div className="trading-stats-card">
              <div className="stats-header">Market Statistics</div>
              <div className="stats-grid num">
                <div className="stat-box">
                  <span className="stat-name">Day High</span>
                  <span className="stat-num">{formatCurrency(quote.dayHigh)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">Day Low</span>
                  <span className="stat-num">{formatCurrency(quote.dayLow)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">Day Open</span>
                  <span className="stat-num">{formatCurrency(quote.dayOpen)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">Prev Close</span>
                  <span className="stat-num">{formatCurrency(prevClose)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">Today's Volume</span>
                  <span className="stat-num">{formatVolume(quote.volume)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">20D Avg Volume</span>
                  <span className="stat-num">{formatVolume(quote.avgVolume20d)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">20D Volatility</span>
                  <span className="stat-num">{quote.volatility20dPct || item.meta?.baseVolPct}%</span>
                </div>
                <div className="stat-box">
                  <span className="stat-name">Data Freshness</span>
                  <span className="stat-num">{quote.freshness === 'delayed' ? 'Delayed Feed' : 'Live Stream'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 6-Signal Attention Breakdown */}
        {activeTab === 'signals' && (
          <div className="modal-tab-body">
            <div className="signals-explainer">
              The <b>Attention Score ({score}/100)</b> eliminates noise by normalizing price movements against this stock's historical volatility, volume conviction, circuit limits, and catalyst news.
            </div>

            <div className="signals-list">
              {/* Signal 1: Volatility z-score */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <TrendingUpIcon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">1. Volatility-Adjusted Move (Z-Score)</span>
                    <span className="signal-sub">Price move normalized by 20-day realized volatility</span>
                  </div>
                  <span className="signal-points num">+{signals.vol?.points || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Current Move: <b>{dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(1)}%</b></span>
                  <span>Z-Score: <b>{volZ}x normal daily move</b></span>
                </div>
              </div>

              {/* Signal 2: Volume Anomaly */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <BarChart2Icon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">2. Volume Anomaly Multiplier</span>
                    <span className="signal-sub">Prorated session volume vs 20-day historical average</span>
                  </div>
                  <span className="signal-points num">+{signals.volu?.points || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Volume Ratio: <b>{volRatio}x average volume</b></span>
                  <span>Conviction: <b>{signals.volu?.points > 0 ? 'High Institutional Activity' : 'Normal Volume'}</b></span>
                </div>
              </div>

              {/* Signal 3: 52-Week Extremes */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <ActivityIcon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">3. 52-Week High / Low Breach</span>
                    <span className="signal-sub">Proximity to structural rolling 52-week price milestones</span>
                  </div>
                  <span className="signal-points num">+{signals.breach?.points || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Status: <b>{signals.breach?.type || 'Within 52W range'}</b></span>
                  <span>52W Bounds: <b>{formatCurrency(low52w)} – {formatCurrency(high52w)}</b></span>
                </div>
              </div>

              {/* Signal 4: Gap Open */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <ZapIcon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">4. Opening Gap Magnitude</span>
                    <span className="signal-sub">Overnight session gap vs previous trading close</span>
                  </div>
                  <span className="signal-points num">+{signals.gap?.points || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Open Gap: <b>{gapPct >= 0 ? '+' : ''}{gapPct}%</b></span>
                  <span>Impact: <b>{signals.gap?.points > 0 ? 'Significant Overnight Gap' : 'Normal Open'}</b></span>
                </div>
              </div>

              {/* Signal 5: Circuit Limit Proximity */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <AlertTriangleIcon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">5. NSE Circuit Limit Proximity</span>
                    <span className="signal-sub">Distance to ±10% upper or lower trading halt limits</span>
                  </div>
                  <span className="signal-points num">+{signals.circuit?.points || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Upper Circuit: <b>+{distToUpperPct.toFixed(1)}%</b></span>
                  <span>Lower Circuit: <b>-{distToLowerPct.toFixed(1)}%</b></span>
                </div>
              </div>

              {/* Signal 6: News / Catalyst */}
              <div className="signal-row-card">
                <div className="signal-row-head">
                  <NewspaperIcon size={16} className="signal-icon" />
                  <div className="signal-titles">
                    <span className="signal-name">6. News & Corporate Action Catalyst</span>
                    <span className="signal-sub">Deduplicated earnings, dividend, split, or regulatory filings</span>
                  </div>
                  <span className="signal-points num">+{signals.newsPoints || 0} pts</span>
                </div>
                <div className="signal-metric-line">
                  <span>Latest News: <b>{historyData?.news?.[0]?.headline || 'No recent breaking catalyst'}</b></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: News & Corporate Actions */}
        {activeTab === 'news' && (
          <div className="modal-tab-body">
            {loadingHistory ? (
              <p style={{ color: 'var(--ink-soft)' }}>Loading catalyst stream…</p>
            ) : (
              <div className="news-stream-list">
                {historyData?.news?.length === 0 && historyData?.corpActions?.length === 0 ? (
                  <div className="empty-news-state">
                    <p>No major corporate actions or breaking headlines recorded yet for {symbol}.</p>
                  </div>
                ) : (
                  <>
                    {historyData?.news?.map((n, idx) => (
                      <div key={`news-${idx}`} className="news-item-card">
                        <div className="news-item-header">
                          <span className={`news-tag-badge ${n.tag}`}>{n.tag}</span>
                          <span className="news-time-ago num">{formatTimeAgo(n.ts)}</span>
                        </div>
                        <div className="news-item-headline">{n.headline}</div>
                      </div>
                    ))}
                    {historyData?.corpActions?.map((c, idx) => (
                      <div key={`corp-${idx}`} className="news-item-card corp">
                        <div className="news-item-header">
                          <span className="news-tag-badge corp-action">CORP ACTION · {c.type}</span>
                          <span className="news-time-ago num">{formatTimeAgo(c.ts)}</span>
                        </div>
                        <div className="news-item-headline">{c.detail}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          <div className="modal-footer-left">
            <button
              className="pill-btn subtle"
              onClick={() => onShockStock(symbol, 5.0, 4.0)}
              title="Inject a sudden +5% surge to test live scoring"
            >
              <ZapIcon size={13} />
              <span>Test +5% Shock on {symbol}</span>
            </button>
          </div>
          <div className="modal-footer-right">
            <button className="pill-btn primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
