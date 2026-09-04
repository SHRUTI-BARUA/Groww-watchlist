import { useEffect, useRef, useState, useMemo } from 'react';
import { AlertTriangleIcon, ZapIcon, TrendingUpIcon, TrendingDownIcon, ChevronRightIcon, TrashIcon } from './Icons';

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

function formatVolume(num) {
  if (!num) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toString();
}

function getSymbolAvatar(symbol = '') {
  const map = {
    RELIANCE: { bg: 'linear-gradient(135deg, #0d6efd, #0a58ca)', text: '#ffffff', label: 'RE' },
    TCS: { bg: 'linear-gradient(135deg, #2b3a4a, #1a2530)', text: '#00d09c', label: 'TC' },
    HDFCBANK: { bg: 'linear-gradient(135deg, #004c8f, #002b49)', text: '#ffffff', label: 'HD' },
    INFY: { bg: 'linear-gradient(135deg, #007cc3, #004e7c)', text: '#ffffff', label: 'IN' },
    ICICIBANK: { bg: 'linear-gradient(135deg, #c0392b, #962d22)', text: '#ffffff', label: 'IC' },
    KOTAKBANK: { bg: 'linear-gradient(135deg, #d32f2f, #8e0000)', text: '#ffffff', label: 'KB' },
    AXISBANK: { bg: 'linear-gradient(135deg, #97144d, #6b0e37)', text: '#ffffff', label: 'AX' },
    TATAMOTORS: { bg: 'linear-gradient(135deg, #1976d2, #0d47a1)', text: '#ffffff', label: 'TM' },
    ZOMATO: { bg: 'linear-gradient(135deg, #e23744, #b71c1c)', text: '#ffffff', label: 'ZO' },
    SUZLON: { bg: 'linear-gradient(135deg, #00d09c, #008765)', text: '#0f1217', label: 'SU' },
    ADANIPOWER: { bg: 'linear-gradient(135deg, #455a64, #263238)', text: '#ffffff', label: 'AP' },
    YESBANK: { bg: 'linear-gradient(135deg, #c2185b, #880e4f)', text: '#ffffff', label: 'YB' },
    BSE: { bg: 'linear-gradient(135deg, #00897b, #004d40)', text: '#ffffff', label: 'BS' },
    IRFC: { bg: 'linear-gradient(135deg, #673ab7, #311b92)', text: '#ffffff', label: 'IR' },
  };
  if (map[symbol]) return map[symbol];
  return {
    bg: 'linear-gradient(135deg, #242b3d, #191f2c)',
    text: '#00D09C',
    label: (symbol || 'ST').slice(0, 2).toUpperCase(),
  };
}

export default function TickerRow({ item, live, onRemove, onSelect }) {
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(null);

  const avatar = getSymbolAvatar(item.symbol);
  const price = live?.price ?? item.quote?.price ?? 0;
  const freshness = live?.freshness ?? item.quote?.freshness;
  const marketOpen = live?.marketOpen ?? item.quote?.marketOpen;
  const score = live?.attentionScore ?? item.attention?.score ?? 0;
  const bucket = live?.attentionBucket ?? item.attention?.bucket ?? 'quiet';
  const reason = live?.attentionReason ?? item.attention?.reason;

  // Flash animation on price updates
  useEffect(() => {
    if (prevPriceRef.current !== null && price !== prevPriceRef.current) {
      const cls = price > prevPriceRef.current ? 'flash-up' : 'flash-down';
      setFlashClass(cls);
      const timer = setTimeout(() => setFlashClass(''), 800);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  const prevClose = item.quote?.prevClose || price;
  const dayChange = price - prevClose;
  const dayChangePct = prevClose > 0 ? ((dayChange) / prevClose) * 100 : 0;
  const isUp = dayChangePct >= 0;

  const diff = item.diff;
  const hasMeaningfulBaseline = diff?.hasBaseline && !diff.isFirstView;

  // 52W range mini position
  const high52w = item.quote?.high52w || (prevClose * 1.25);
  const low52w = item.quote?.low52w || (prevClose * 0.75);
  const rangeSpan = high52w - low52w;
  const posPct = rangeSpan > 0 ? Math.max(0, Math.min(100, ((price - low52w) / rangeSpan) * 100)) : 50;

  // Generate mini sparkline path
  const sparklineData = useMemo(() => {
    const pOpen = item.quote?.open || prevClose;
    const pHigh = item.quote?.high || Math.max(price, prevClose * 1.02);
    const pLow = item.quote?.low || Math.min(price, prevClose * 0.98);
    const pts = [
      prevClose,
      pOpen,
      (pOpen + pLow) / 2,
      pLow,
      (pLow + pHigh) / 2,
      pHigh,
      (pHigh + price) / 2,
      price,
    ];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 72;
    const h = 28;
    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return coords.join(' ');
  }, [price, prevClose, item.quote]);

  if (item.error) {
    return (
      <div className="ticker-card error-card">
        <div className="card-error-body">
          <span className="ticker-symbol">{item.symbol}</span>
          <span className="error-text">Quote feed unavailable: {item.error}</span>
          <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(item.symbol); }}>
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ticker-card interactive ${bucket} ${flashClass}`}
      onClick={() => onSelect && onSelect(item)}
      role="button"
      tabIndex={0}
      title="Click to view plain-English insights, actionable decision guide, and chart"
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect && onSelect(item); }}
    >
      {/* Attention Accent Pillar Bar */}
      <div className={`card-accent-bar ${bucket}`} />

      <div className="card-content-grid">
        {/* Col 1: Symbol Avatar, Company, Sector, Attention Badge */}
        <div className="col-identity">
          <div className="stock-avatar-groww" style={{ background: avatar.bg, color: avatar.text }}>
            {avatar.label}
          </div>
          <div className="identity-text-cluster">
            <div className="identity-header">
              <span className="ticker-symbol">{item.symbol}</span>
              <span className="ticker-sector">{item.meta?.sector || 'EQUITY'}</span>
              {bucket !== 'quiet' && (
                <span className={`attn-pill-badge ${bucket} ${bucket === 'significant' ? 'glow-sig' : ''}`}>
                  {bucket === 'significant' ? <AlertTriangleIcon size={10} /> : <ZapIcon size={10} />}
                  <span>{bucket === 'significant' ? 'Significant' : 'Notable'} · {score}</span>
                </span>
              )}
            </div>
            <div className="ticker-name">{item.meta?.name}</div>

            {/* Attention Reason Line */}
            <div className="ticker-reason-text" title={reason}>
              {reason}
            </div>
          </div>
        </div>

        {/* Col 2: Since-Visit Delta & News Catalysts */}
        <div className="col-since-visit">
          {hasMeaningfulBaseline ? (
            <div className="since-visit-box">
              <span className="since-visit-label">SINCE LAST CHECK ({formatTimeAgo(diff.baselineTs)}):</span>
              <div className="since-visit-val-row">
                <span className={`since-delta-tag num ${diff.priceDelta >= 0 ? 'gain' : 'loss'}`}>
                  {diff.priceDelta >= 0 ? '+' : ''}{diff.priceDelta.toFixed(2)} ({diff.priceDeltaPct >= 0 ? '+' : ''}{diff.priceDeltaPct.toFixed(2)}%)
                </span>
                {diff.scoreDelta !== 0 && (
                  <span className="score-delta-badge num">
                    Attention {diff.scoreDelta > 0 ? '▲ +' : '▼ '}{diff.scoreDelta}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="since-visit-box first-time">
              <span className="first-time-badge">NEW ON LIST</span>
              <span className="first-time-hint">Checkpoint will save on "Mark Seen"</span>
            </div>
          )}

          {diff?.news?.length > 0 && (
            <div className="mini-news-chip" title={diff.news[0].headline}>
              <span className={`news-tag-pill ${diff.news[0].tag}`}>{diff.news[0].tag}</span>
              <span className="news-text-truncate">{diff.news[0].headline}</span>
            </div>
          )}
        </div>

        {/* Col 3: Mini Sparkline & 52W Range */}
        <div className="col-telemetry">
          <div className="mini-sparkline-wrap" title="Intraday trajectory">
            <svg width="72" height="28" viewBox="0 0 72 28" className="sparkline-svg">
              <polyline
                fill="none"
                stroke={isUp ? 'var(--gain)' : 'var(--loss)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklineData}
              />
            </svg>
          </div>

          <div className="mini-range-slider" title={`52W Range: ₹${low52w.toFixed(0)} - ₹${high52w.toFixed(0)}`}>
            <div className="range-track-bg">
              <div className="range-track-fill" style={{ width: `${posPct}%` }} />
              <div className="range-track-dot" style={{ left: `${posPct}%` }} />
            </div>
            <div className="range-bounds-text num">
              <span>L ₹{low52w.toFixed(0)}</span>
              <span>H ₹{high52w.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Col 4: Price, Day Change %, Freshness & Actions */}
        <div className="col-pricing">
          <div className={`ticker-price num ${flashClass ? 'flash-text' : ''}`}>
            ₹{price.toFixed(2)}
          </div>
          <div className={`ticker-day-change num ${isUp ? 'up' : 'down'}`}>
            {isUp ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
            <span>{isUp ? '+' : ''}{dayChangePct.toFixed(2)}%</span>
          </div>

          <div className="ticker-meta-sub num">
            <span>Vol: {formatVolume(live?.volume ?? item.quote.volume)}</span>
            <span className="meta-bullet">·</span>
            <span className={freshness === 'delayed' ? 'delayed-text' : 'live-text'}>
              {freshness === 'delayed' ? 'Delayed' : marketOpen ? 'Live' : 'Closed'}
            </span>
          </div>
        </div>

        {/* Col 5: Quick Inspect / Remove */}
        <div className="col-actions">
          <button
            className="inspect-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(item);
            }}
            title="Inspect stock details & attention signals"
            aria-label={`Inspect ${item.symbol}`}
          >
            <ChevronRightIcon size={16} />
          </button>
          <button
            className="card-remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.symbol);
            }}
            title="Remove from watchlist"
            aria-label={`Remove ${item.symbol}`}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
