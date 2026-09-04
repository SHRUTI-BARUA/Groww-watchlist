import {
  ZapIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  LightbulbIcon,
  CompassIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart2Icon,
  ActivityIcon,
  NewspaperIcon,
  InfoIcon,
} from './Icons';

function formatCurrency(val) {
  if (val === null || val === undefined) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' k';
  return num.toString();
}

export default function PlainEnglishInsights({
  item,
  live,
  score,
  bucket,
  reason,
  signals = {},
  diff,
  quote,
  news = [],
}) {
  const price = live?.price ?? item.quote?.price ?? 0;
  const prevClose = item.quote?.prevClose || price;
  const dayChange = price - prevClose;
  const dayChangePct = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;
  const isUp = dayChangePct >= 0;

  const high52w = quote?.high52w || prevClose * 1.25;
  const low52w = quote?.low52w || prevClose * 0.75;
  const upperCircuit = quote?.upperCircuit || prevClose * 1.1;
  const lowerCircuit = quote?.lowerCircuit || prevClose * 0.9;

  const rangeSpan = high52w - low52w;
  const pos52wPct = rangeSpan > 0 ? Math.max(0, Math.min(100, ((price - low52w) / rangeSpan) * 100)) : 50;

  const distToUpperPct = Math.max(0, ((upperCircuit - price) / price) * 100);
  const distToLowerPct = Math.max(0, ((price - lowerCircuit) / price) * 100);

  const volZ = signals.vol?.z ? Math.abs(signals.vol.z).toFixed(1) : (Math.abs(dayChangePct) / (quote?.volatility20dPct || 2)).toFixed(1);
  const volRatio = signals.volu?.ratio ? signals.volu.ratio.toFixed(1) : (quote?.avgVolume20d ? (quote.volume / quote.avgVolume20d).toFixed(1) : '1.0');

  // Derive plain English action recommendations
  const actionGuide = {
    quiet: {
      badge: 'NORMAL DAY · NO ACTION NEEDED',
      badgeClass: 'quiet',
      icon: <CheckCircleIcon size={16} />,
      headline: `${item.symbol} is trading calmly within regular bounds.`,
      meaning: 'There are no unusual price shocks, abnormal volume surges, or surprise corporate events happening right now.',
      recommendation: 'Sit back and relax. You do not need to constantly monitor this stock today. Stick to your long-term plan without overtrading.',
      riskLevel: 'Low Risk / Steady Session',
    },
    notable: {
      badge: 'NOTABLE ACTIVITY · KEEP ON RADAR',
      badgeClass: 'notable',
      icon: <ZapIcon size={16} />,
      headline: `${item.symbol} is experiencing above-average trading momentum.`,
      meaning: 'The price or volume is moving noticeably faster than a normal day, indicating increased market attention.',
      recommendation: 'Check recent news catalysts or sector moves. If you have active buy/sell orders, verify if your price targets are in range, but avoid impulsive trades.',
      riskLevel: 'Moderate Attention / Active Momentum',
    },
    significant: {
      badge: 'HIGH ATTENTION · IMPORTANT EVENT',
      badgeClass: 'significant',
      icon: <AlertTriangleIcon size={16} />,
      headline: `${item.symbol} has triggered a significant statistical dislocation!`,
      meaning: 'The stock has moved beyond 2.5x its normal daily range or is experiencing heavy institutional volume surges or circuit proximity.',
      recommendation: 'Inspect the catalyst headlines below immediately. Double-check your position size and risk stop-loss limits before deciding whether to buy, sell, or hold.',
      riskLevel: 'High Attention / Potential Volatility',
    },
  }[bucket] || {
    badge: 'MONITORING TELEMETRY',
    badgeClass: 'quiet',
    icon: <InfoIcon size={16} />,
    headline: 'Telemetry active.',
    meaning: 'Monitoring live quotes.',
    recommendation: 'Review baseline diffs and key levels.',
    riskLevel: 'Standard',
  };

  return (
    <div className="plain-english-container animate-fade-in">
      {/* Top Beginner-Friendly Verdict Card */}
      <div className={`verdict-banner-card ${actionGuide.badgeClass}`}>
        <div className="verdict-banner-head">
          <div className="verdict-icon-box">
            {actionGuide.icon}
          </div>
          <div className="verdict-title-group">
            <span className={`verdict-pill ${actionGuide.badgeClass}`}>{actionGuide.badge}</span>
            <h3 className="verdict-headline">{actionGuide.headline}</h3>
          </div>
          <div className="verdict-score-tag">
            <span className="verdict-score-lbl">ATTENTION SCORE</span>
            <span className="verdict-score-num num">{score}/100</span>
          </div>
        </div>

        <p className="verdict-plain-summary">
          <b>In Simple Terms:</b> {item.meta?.name} ({item.symbol}) is currently priced at{' '}
          <b>{formatCurrency(price)}</b> ({isUp ? '+' : ''}{dayChangePct.toFixed(2)}% today).{' '}
          {reason || 'All core telemetry signals are operating within historical ranges.'}
        </p>
      </div>

      {/* Crisp Key Drivers Breakdown (Bulleted) */}
      <div className="insights-section-block">
        <div className="section-title-strip">
          <LightbulbIcon size={15} className="section-title-icon" />
          <h4 className="section-title-text">Complete Written Breakdown (Crisp Bullets)</h4>
          <span className="section-title-tag">Everything you need to know</span>
        </div>

        <div className="plain-bullets-grid">
          {/* Bullet 1: Price Movement */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col price">
              {isUp ? <TrendingUpIcon size={15} /> : <TrendingDownIcon size={15} />}
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">1. Price Move & Volatility</span>
              <p className="bullet-desc">
                The stock is {isUp ? 'up' : 'down'} <b>{isUp ? '+' : ''}{dayChange.toFixed(2)} ({isUp ? '+' : ''}{dayChangePct.toFixed(2)}%)</b> today.{' '}
                {Number(volZ) >= 2.5 ? (
                  <span>
                    ⚡ <b>Unusually Large Move:</b> This swing is <b>{volZ}x bigger</b> than this stock's normal daily wiggle (typically ±{quote?.volatility20dPct || 2}%).
                  </span>
                ) : Number(volZ) >= 1.5 ? (
                  <span>
                    📈 <b>Elevated Movement:</b> Moving <b>{volZ}x faster</b> than its standard daily baseline.
                  </span>
                ) : (
                  <span>
                    🟢 <b>Normal Daily Fluctuation:</b> Today's move is completely standard and expected for {item.symbol}.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Bullet 2: Trading Volume (Institutional vs Retail) */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col volume">
              <BarChart2Icon size={15} />
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">2. Trading Volume & Market Conviction</span>
              <p className="bullet-desc">
                {Number(volRatio) >= 2.5 ? (
                  <span>
                    🔥 <b>Heavy Institutional Buying/Selling:</b> Trading volume is <b>{volRatio}x higher than average</b> ({formatVolume(quote?.volume)} shares traded). Large institutional funds are actively participating today.
                  </span>
                ) : Number(volRatio) >= 1.5 ? (
                  <span>
                    📊 <b>Above-Average Activity:</b> Trading is <b>{volRatio}x busier</b> than a typical session.
                  </span>
                ) : (
                  <span>
                    🟢 <b>Regular Trading Pace:</b> Volume is at <b>{volRatio}x 20-day average</b> ({formatVolume(quote?.volume)} shares), reflecting standard retail flow.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Bullet 3: Checkpoint Diff */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col diff">
              <ActivityIcon size={15} />
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">3. Change Since You Last Checked</span>
              <p className="bullet-desc">
                {diff?.hasBaseline && !diff?.isFirstView ? (
                  <span>
                    ⏱️ Since your last check (<b>{formatTimeAgo(diff.baselineTs)}</b> at {formatCurrency(diff.baselinePrice)}), the stock has moved{' '}
                    <b className={diff.priceDelta >= 0 ? 'color-gain' : 'color-loss'}>
                      {diff.priceDelta >= 0 ? '+' : ''}{diff.priceDelta.toFixed(2)} ({diff.priceDeltaPct >= 0 ? '+' : ''}{diff.priceDeltaPct.toFixed(2)}%)
                    </b>.
                  </span>
                ) : (
                  <span>
                    ⏱️ <b>New On Your List:</b> You haven't marked a baseline checkpoint yet. Clicking <b>"Mark All as Seen"</b> will record {formatCurrency(price)} as your starting reference.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Bullet 4: 52-Week Range */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col range">
              <CompassIcon size={15} />
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">4. Yearly Price Position (52-Week Range)</span>
              <p className="bullet-desc">
                Positioned at <b>{pos52wPct.toFixed(0)}% of its 1-year span</b> (Low: {formatCurrency(low52w)} · High: {formatCurrency(high52w)}).{' '}
                {pos52wPct >= 85
                  ? '🏔️ Trading near its 52-week peak. Strong annual strength.'
                  : pos52wPct <= 15
                  ? '🌊 Trading near its 52-week lows. Potential value zone or downtrend.'
                  : '⚖️ Trading comfortably in the middle of its yearly channel.'}
              </p>
            </div>
          </div>

          {/* Bullet 5: Exchange Circuit Limits */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col circuit">
              <AlertTriangleIcon size={15} />
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">5. NSE Safety Circuit Freeze Limits (±10%)</span>
              <p className="bullet-desc">
                Exchange safety limits prevent the stock from moving more than ±10% in a single day.{' '}
                {distToUpperPct <= 2 ? (
                  <span>⚠️ <b>Warning:</b> Price is only <b>+{distToUpperPct.toFixed(1)}% away from Upper Circuit ({formatCurrency(upperCircuit)})</b> where buying halts!</span>
                ) : distToLowerPct <= 2 ? (
                  <span>⚠️ <b>Warning:</b> Price is only <b>-{distToLowerPct.toFixed(1)}% away from Lower Circuit ({formatCurrency(lowerCircuit)})</b> where selling halts!</span>
                ) : (
                  <span>
                    🛡️ <b>Safe Trading Room:</b> Price is {distToUpperPct.toFixed(1)}% below upper limit ({formatCurrency(upperCircuit)}) and {distToLowerPct.toFixed(1)}% above lower limit ({formatCurrency(lowerCircuit)}).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Bullet 6: News & Catalyst */}
          <div className="plain-bullet-item">
            <div className="bullet-icon-col news">
              <NewspaperIcon size={15} />
            </div>
            <div className="bullet-content-col">
              <span className="bullet-title">6. Breaking News & Catalyst Context</span>
              <p className="bullet-desc">
                {news && news.length > 0 ? (
                  <span>
                    📰 <b>Recent Headline:</b> <i>"{news[0].headline}"</i> ({formatTimeAgo(news[0].ts)}). This is providing direct fundamental fuel for today's price action.
                  </span>
                ) : (
                  <span>
                    📰 <b>No Company News:</b> No breaking filings or corporate disclosures recorded. Price action is driven by broader market sentiment or sector flows.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decision & Action Framework for Beginners */}
      <div className="beginner-guide-box">
        <div className="guide-box-header">
          <CompassIcon size={16} className="guide-icon" />
          <span className="guide-title">Beginner's Action Guide: What should you do right now?</span>
        </div>

        <div className="guide-steps-list">
          <div className="guide-step-row">
            <span className="guide-step-num">Step 1</span>
            <div className="guide-step-body">
              <b>Understand Today's Status:</b> {actionGuide.meaning}
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-num">Step 2</span>
            <div className="guide-step-body">
              <b>Recommended Next Move:</b> {actionGuide.recommendation}
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-num">Step 3</span>
            <div className="guide-step-body">
              <b>Update Your Watchlist Baseline:</b> After reviewing, use <b>"Mark All as Seen"</b> in the dashboard so future alerts compare against this current price.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
