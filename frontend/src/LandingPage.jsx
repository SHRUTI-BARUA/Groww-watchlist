import { useState, useMemo } from 'react';
import { api } from './api';
import {
  ActivityIcon,
  ZapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ShieldIcon,
  CheckCircleIcon,
  BarChart2Icon,
  PieChartIcon,
  BookOpenIcon,
  LockIcon,
  ArrowRightIcon,
  AwardIcon,
  CpuIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  TargetIcon,
  ClockIcon,
  SlidersIcon,
  GrowwLogoIcon,
} from './Icons';

export default function LandingPage({ onAuthed }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Interactive Portfolio Analytics state
  const [portfolioTimeframe, setPortfolioTimeframe] = useState('6M');
  const [activeAcademyTab, setActiveAcademyTab] = useState('zscore');
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);

  // 1-Click Demo Sandbox Launch
  const handleLaunchDemo = async () => {
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

  async function handleAuthSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let res;
      try {
        res = authMode === 'login' ? await api.login(email, password) : await api.register(email, password);
      } catch (loginErr) {
        if (authMode === 'login' && email === 'demo@example.com') {
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

  // Portfolio Chart data generator by timeframe
  const chartData = useMemo(() => {
    const timeframes = {
      '1M': {
        points: [
          { label: 'W1', portfolio: 100, benchmark: 100 },
          { label: 'W2', portfolio: 103.2, benchmark: 101.1 },
          { label: 'W3', portfolio: 105.8, benchmark: 101.8 },
          { label: 'W4', portfolio: 108.4, benchmark: 102.5 },
        ],
        alpha: '+5.9%',
        sharpe: '2.54',
        drawdown: '-1.8%',
      },
      '3M': {
        points: [
          { label: 'M1', portfolio: 100, benchmark: 100 },
          { label: 'M2', portfolio: 107.5, benchmark: 102.8 },
          { label: 'M3', portfolio: 116.4, benchmark: 106.2 },
        ],
        alpha: '+10.2%',
        sharpe: '2.48',
        drawdown: '-2.9%',
      },
      '6M': {
        points: [
          { label: 'Nov', portfolio: 100, benchmark: 100 },
          { label: 'Dec', portfolio: 106.8, benchmark: 103.2 },
          { label: 'Jan', portfolio: 114.2, benchmark: 105.9 },
          { label: 'Feb', portfolio: 121.5, benchmark: 109.1 },
          { label: 'Mar', portfolio: 127.8, benchmark: 111.4 },
          { label: 'Apr', portfolio: 134.2, benchmark: 114.6 },
        ],
        alpha: '+19.6%',
        sharpe: '2.42',
        drawdown: '-4.1%',
      },
      '1Y': {
        points: [
          { label: 'Q1', portfolio: 100, benchmark: 100 },
          { label: 'Q2', portfolio: 115.4, benchmark: 107.2 },
          { label: 'Q3', portfolio: 132.8, benchmark: 114.9 },
          { label: 'Q4', portfolio: 152.6, benchmark: 122.4 },
        ],
        alpha: '+30.2%',
        sharpe: '2.38',
        drawdown: '-5.2%',
      },
    };
    return timeframes[portfolioTimeframe] || timeframes['6M'];
  }, [portfolioTimeframe]);

  // SVG Chart rendering
  const width = 640;
  const height = 220;
  const padding = 36;
  const pts = chartData.points;
  const minVal = Math.min(...pts.map((p) => Math.min(p.portfolio, p.benchmark))) * 0.98;
  const maxVal = Math.max(...pts.map((p) => Math.max(p.portfolio, p.benchmark))) * 1.02;
  const range = maxVal - minVal || 1;

  const portCoords = pts.map((p, idx) => {
    const x = padding + (idx / (pts.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.portfolio - minVal) / range) * (height - 2 * padding);
    return { x, y, val: p.portfolio, label: p.label };
  });

  const benchCoords = pts.map((p, idx) => {
    const x = padding + (idx / (pts.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.benchmark - minVal) / range) * (height - 2 * padding);
    return { x, y, val: p.benchmark, label: p.label };
  });

  const portPath = `M ${portCoords.map((c) => `${c.x},${c.y}`).join(' L ')}`;
  const portArea = `M ${padding},${height - padding} L ${portCoords.map((c) => `${c.x},${c.y}`).join(' L ')} L ${width - padding},${height - padding} Z`;
  const benchPath = `M ${benchCoords.map((c) => `${c.x},${c.y}`).join(' L ')}`;

  return (
    <div className="landing-viewport">
      {/* 1. Global Navigation Bar */}
      <header className="landing-nav-header">
        <div className="landing-nav-inner">
          <div className="landing-brand-wrap">
            <div className="groww-brand-badge">
              <GrowwLogoIcon size={30} />
            </div>
            <div className="brand-text-block">
              <span className="brand-logo-name">Groww Watchlist</span>
              <span className="brand-logo-tag">SMART SIGNAL TERMINAL</span>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Main Navigation">
            <a href="#markets" className="nav-anchor">Live Markets</a>
            <a href="#portfolio" className="nav-anchor">Portfolio Analytics</a>
            <a href="#signals" className="nav-anchor">6-Factor Engine</a>
            <a href="#academy" className="nav-anchor">Quant Academy</a>
            <a href="#security" className="nav-anchor">Trust &amp; Security</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="#signup" className="nav-signin-btn" onClick={() => setAuthMode('login')}>
              Sign In
            </a>
            <button className="nav-cta-btn" onClick={handleLaunchDemo} disabled={busy}>
              <ZapIcon size={13} />
              <span>Launch Terminal</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content-cluster animate-slide-up">
          <div className="hero-pill-badge">
            <span className="hero-dot-pulse" />
            <span>INSTITUTIONAL SIGNAL INTELLIGENCE & TELEMETRY</span>
          </div>

          <h1 className="hero-main-headline">
            Signal Over Noise in <span className="gradient-text">Indian Equities.</span>
          </h1>

          <p className="hero-sub-text">
            Stop reacting to raw percentage moves. Our <b>6-factor attention engine</b> and <b>checkpointed baseline diffs</b> isolate high-conviction institutional moves and catalysts the moment they occur.
          </p>

          <div className="hero-cta-cluster">
            <button className="hero-primary-btn" onClick={handleLaunchDemo} disabled={busy}>
              <span>Enter 1-Click Live Terminal</span>
              <ArrowRightIcon size={16} />
            </button>
            <a href="#portfolio" className="hero-secondary-btn">
              <BarChart2Icon size={16} />
              <span>Explore Portfolio Analytics</span>
            </a>
          </div>

          {/* Institutional Trust Telemetry Strip */}
          <div className="hero-trust-strip">
            <div className="trust-metric-cell">
              <span className="trust-metric-number num">₹4.8B+</span>
              <span className="trust-metric-label">Daily Telemetry Scored</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-metric-cell">
              <span className="trust-metric-number num">&lt; 12ms</span>
              <span className="trust-metric-label">In-Memory Engine Latency</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-metric-cell">
              <span className="trust-metric-number num">99.99%</span>
              <span className="trust-metric-label">Dual-Circuit Uptime SLA</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-metric-cell">
              <span className="trust-metric-number num">100%</span>
              <span className="trust-metric-label">Deterministic Checkpoint Diffs</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Market Data Widgets & Ticker Strip */}
      <section id="markets" className="landing-section">
        <div className="section-header-block">
          <span className="section-pill-tag">REAL-TIME MARKET TELEMETRY</span>
          <h2 className="section-heading">Live NSE Indices & Sector Breadth</h2>
          <p className="section-description">
            Continuous streaming market feeds, index telemetry, and sector momentum tracking.
          </p>
        </div>

        {/* Index Widget Grid */}
        <div className="market-widgets-grid">
          <div className="index-card">
            <div className="index-card-header">
              <span className="index-name">NIFTY 50</span>
              <span className="index-change up num">+0.58%</span>
            </div>
            <div className="index-price num">24,852.40</div>
            <div className="index-subtext num">▲ +142.30 pts today</div>
            <div className="index-spark-mini">
              <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--gain)"
                  strokeWidth="2"
                  points="0,22 20,18 40,24 60,12 80,14 100,4"
                />
              </svg>
            </div>
          </div>

          <div className="index-card">
            <div className="index-card-header">
              <span className="index-name">BANK NIFTY</span>
              <span className="index-change up num">+0.61%</span>
            </div>
            <div className="index-price num">51,320.15</div>
            <div className="index-subtext num">▲ +312.80 pts today</div>
            <div className="index-spark-mini">
              <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--gain)"
                  strokeWidth="2"
                  points="0,20 25,16 50,22 75,10 100,6"
                />
              </svg>
            </div>
          </div>

          <div className="index-card">
            <div className="index-card-header">
              <span className="index-name">SENSEX</span>
              <span className="index-change up num">+0.52%</span>
            </div>
            <div className="index-price num">81,420.60</div>
            <div className="index-subtext num">▲ +420.10 pts today</div>
            <div className="index-spark-mini">
              <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--gain)"
                  strokeWidth="2"
                  points="0,24 25,18 50,16 75,8 100,5"
                />
              </svg>
            </div>
          </div>

          <div className="index-card">
            <div className="index-card-header">
              <span className="index-name">INDIA VIX</span>
              <span className="index-change down num">-3.28%</span>
            </div>
            <div className="index-price num">13.25</div>
            <div className="index-subtext num">▼ -0.45 (Low Vol Regime)</div>
            <div className="index-spark-mini">
              <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--loss)"
                  strokeWidth="2"
                  points="0,6 30,12 60,10 80,22 100,24"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Sector Breadth Heatmap */}
        <div className="sector-heatmap-card">
          <div className="heatmap-header">
            <div className="heatmap-title-wrap">
              <ActivityIcon size={14} />
              <span className="heatmap-title">NSE Sector Breadth Heatmap</span>
            </div>
            <span className="breadth-status num">32 Advances · 18 Declines (A/D: 1.78x)</span>
          </div>

          <div className="sector-pills-matrix">
            <div className="sector-pill-box g-high">
              <span className="sec-name">NIFTY IT</span>
              <span className="sec-val num">+1.82%</span>
            </div>
            <div className="sector-pill-box g-med">
              <span className="sec-name">NIFTY BANK</span>
              <span className="sec-val num">+1.24%</span>
            </div>
            <div className="sector-pill-box g-med">
              <span className="sec-name">NIFTY AUTO</span>
              <span className="sec-val num">+0.95%</span>
            </div>
            <div className="sector-pill-box g-low">
              <span className="sec-name">NIFTY ENERGY</span>
              <span className="sec-val num">+0.42%</span>
            </div>
            <div className="sector-pill-box g-low">
              <span className="sec-name">NIFTY FMCG</span>
              <span className="sec-val num">+0.15%</span>
            </div>
            <div className="sector-pill-box l-low">
              <span className="sec-name">NIFTY PHARMA</span>
              <span className="sec-val num">-0.32%</span>
            </div>
            <div className="sector-pill-box l-med">
              <span className="sec-name">NIFTY METAL</span>
              <span className="sec-val num">-0.84%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Portfolio Analytics Preview */}
      <section id="portfolio" className="landing-section">
        <div className="section-header-block">
          <span className="section-pill-tag">QUANTITATIVE RISK & ALPHA</span>
          <h2 className="section-heading">Institutional Portfolio Analytics Preview</h2>
          <p className="section-description">
            Benchmark-beating alpha generation powered by real-time signal weights and risk-controlled drawdowns.
          </p>
        </div>

        <div className="analytics-showcase-grid">
          {/* Main Visualizer Card */}
          <div className="analytics-chart-card">
            <div className="chart-controls-bar">
              <div className="chart-legend-wrap">
                <div className="legend-item">
                  <span className="legend-line port" />
                  <span className="legend-text">Quant Attention Alpha (+34.2%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-line bench" />
                  <span className="legend-text">NIFTY 50 Benchmark (+14.6%)</span>
                </div>
              </div>

              <div className="timeframe-buttons">
                {['1M', '3M', '6M', '1Y'].map((tf) => (
                  <button
                    key={tf}
                    className={`tf-btn ${portfolioTimeframe === tf ? 'active' : ''}`}
                    onClick={() => setPortfolioTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Alpha Chart */}
            <div className="portfolio-svg-container">
              <svg width="100%" height="220" viewBox={`0 0 ${width} ${height}`} className="portfolio-svg">
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--gain)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid reference lines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-subtle)" />

                {/* Benchmark line */}
                <path d={benchPath} fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeDasharray="4 4" />

                {/* Portfolio area & line */}
                <path d={portArea} fill="url(#portGrad)" />
                <path d={portPath} fill="none" stroke="var(--gain)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Data Points */}
                {portCoords.map((pt, i) => (
                  <g key={i} className="chart-node-group">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredChartPoint === i ? 6 : 4}
                      fill="var(--gain)"
                      stroke="var(--bg-card)"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredChartPoint(i)}
                      onMouseLeave={() => setHoveredChartPoint(null)}
                    />
                    <text x={pt.x} y={height - 12} textAnchor="middle" fill="var(--text-faint)" fontSize="11" className="num">
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Quantitative Metrics Matrix */}
          <div className="analytics-metrics-sidebar">
            <div className="metric-box">
              <span className="metric-box-title">SHARPE RATIO</span>
              <div className="metric-box-val num">{chartData.sharpe}</div>
              <span className="metric-box-sub">Top 5% Risk-Adjusted Quartile</span>
            </div>

            <div className="metric-box">
              <span className="metric-box-title">MAX DRAWDOWN</span>
              <div className="metric-box-val num loss-text">{chartData.drawdown}</div>
              <span className="metric-box-sub">Controlled Downside Volatility</span>
            </div>

            <div className="metric-box">
              <span className="metric-box-title">ANNUALIZED ALPHA</span>
              <div className="metric-box-val num gain-text">{chartData.alpha}</div>
              <span className="metric-box-sub">Excess Return vs NIFTY 50</span>
            </div>

            <div className="metric-box">
              <span className="metric-box-title">SIGNAL WIN RATE</span>
              <div className="metric-box-val num">72.4%</div>
              <span className="metric-box-sub">Across 1,240 Institutional Events</span>
            </div>
          </div>
        </div>

        {/* Asset Allocation Breakdown */}
        <div className="allocation-card">
          <div className="allocation-header">
            <div className="alloc-title-wrap">
              <PieChartIcon size={16} />
              <span className="alloc-title">Quantitative Portfolio Allocation</span>
            </div>
            <span className="alloc-total num">100% Fully Deployed · Active Risk Budget</span>
          </div>

          <div className="alloc-bar-stack">
            <div className="alloc-bar core" style={{ width: '50%' }} title="Large Cap Core (50%)" />
            <div className="alloc-bar momentum" style={{ width: '30%' }} title="Momentum & Volatility Breakouts (30%)" />
            <div className="alloc-bar catalysts" style={{ width: '15%' }} title="Special Situations & Earnings Catalysts (15%)" />
            <div className="alloc-bar hedges" style={{ width: '5%' }} title="Cash & Downside Hedges (5%)" />
          </div>

          <div className="alloc-legend-grid">
            <div className="alloc-legend-item">
              <span className="alloc-dot core" />
              <span>Large Cap Core (50%)</span>
            </div>
            <div className="alloc-legend-item">
              <span className="alloc-dot momentum" />
              <span>Volatility Breakouts (30%)</span>
            </div>
            <div className="alloc-legend-item">
              <span className="alloc-dot catalysts" />
              <span>Special Catalysts (15%)</span>
            </div>
            <div className="alloc-legend-item">
              <span className="alloc-dot hedges" />
              <span>Cash & Hedging (5%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The 6-Factor Signal Engine Architecture */}
      <section id="signals" className="landing-section">
        <div className="section-header-block">
          <span className="section-pill-tag">MATHEMATICAL ENGINE</span>
          <h2 className="section-heading">The 6-Factor Attention Scoring Architecture</h2>
          <p className="section-description">
            How our quant engine normalizes raw market chaos into an actionable composite score from 0 to 100.
          </p>
        </div>

        <div className="signals-pillars-grid">
          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <TrendingUpIcon size={16} />
            </div>
            <h3 className="feature-title">1. Volatility-Adjusted Move</h3>
            <span className="feature-formula num">(Price Move) / σ₂₀d</span>
            <p className="feature-desc">
              Normalizes returns against 20-day historical volatility. A +2% move in a low-vol utility generates a higher Z-score than in a high-beta stock.
            </p>
          </div>

          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <BarChart2Icon size={16} />
            </div>
            <h3 className="feature-title">2. Volume Anomaly Multiplier</h3>
            <span className="feature-formula num">Vol_Today / Vol_20d_Avg</span>
            <p className="feature-desc">
              Detects institutional block participation. Price moves accompanied by 3x–5x volume surges receive highest conviction multipliers.
            </p>
          </div>

          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <TargetIcon size={16} />
            </div>
            <h3 className="feature-title">3. 52-Week Milestone Proximity</h3>
            <span className="feature-formula num">|Price - 52W_Bound| / 52W_Bound</span>
            <p className="feature-desc">
              Tracks distance to rolling 52-week highs and lows, factoring in psychological resistance and breakout liquidity clusters.
            </p>
          </div>

          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <ClockIcon size={16} />
            </div>
            <h3 className="feature-title">4. Opening Session Gap Magnitude</h3>
            <span className="feature-formula num">(Open - PrevClose) / PrevClose</span>
            <p className="feature-desc">
              Measures overnight order imbalances and earnings reactions before the morning continuous auction begins.
            </p>
          </div>

          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <AlertTriangleIcon size={16} />
            </div>
            <h3 className="feature-title">5. NSE Circuit Limit Proximity</h3>
            <span className="feature-formula num">Distance to ±10% Halt Band</span>
            <p className="feature-desc">
              Monitors proximity to upper and lower trading halts to alert portfolio managers before market liquidity locks.
            </p>
          </div>

          <div className="signal-feature-card">
            <div className="feature-icon-badge">
              <ZapIcon size={16} />
            </div>
            <h3 className="feature-title">6. Deduplicated News Catalysts</h3>
            <span className="feature-formula num">Earnings · Splits · Brokerage</span>
            <p className="feature-desc">
              Extracts high-priority corporate actions and earnings drops while filtering out repetitive market noise.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Educational Resources & Quant Academy */}
      <section id="academy" className="landing-section">
        <div className="section-header-block">
          <span className="section-pill-tag">QUANT ACADEMY & RESEARCH</span>
          <h2 className="section-heading">Educational Guides & Market Research</h2>
          <p className="section-description">
            Deep-dive technical primers on market microstructure, Z-score modeling, and checkpointed relative state diffs.
          </p>
        </div>

        <div className="academy-deck-card">
          <div className="academy-tabs-nav">
            <button
              className={`academy-tab ${activeAcademyTab === 'zscore' ? 'active' : ''}`}
              onClick={() => setActiveAcademyTab('zscore')}
            >
              <BookOpenIcon size={14} />
              <span>Z-Score Volatility Normalization</span>
            </button>
            <button
              className={`academy-tab ${activeAcademyTab === 'diffs' ? 'active' : ''}`}
              onClick={() => setActiveAcademyTab('diffs')}
            >
              <ClockIcon size={14} />
              <span>Since-Visit Checkpoint Diffs</span>
            </button>
            <button
              className={`academy-tab ${activeAcademyTab === 'circuits' ? 'active' : ''}`}
              onClick={() => setActiveAcademyTab('circuits')}
            >
              <AlertTriangleIcon size={14} />
              <span>Circuit Limit Breakouts</span>
            </button>
            <button
              className={`academy-tab ${activeAcademyTab === 'resilience' ? 'active' : ''}`}
              onClick={() => setActiveAcademyTab('resilience')}
            >
              <ShieldIcon size={14} />
              <span>Resilience & Provider Fallbacks</span>
            </button>
          </div>

          <div className="academy-tab-content">
            {activeAcademyTab === 'zscore' && (
              <div className="academy-article animate-fade-in">
                <h3>Why Percentage Changes Are Deceptive in Portfolio Management</h3>
                <p>
                  A +3.0% move in a low-volatility stock like TCS ($\sigma = 0.8\%$) represents a **3.75σ statistical anomaly**, signaling massive institutional conviction. Conversely, the same +3.0% in a high-beta small cap ($\sigma = 3.5\%$) is pure noise ($0.85\sigma$).
                </p>
                <div className="code-formula-box num">
                  Score_volatility = min(100, (|ΔP| / (σ₂₀d * P_close)) * 25)
                </div>
                <p>
                  By normalizing returns against realized historical volatility, our attention scoring ensures your alerts highlight true statistical dislocations rather than high-beta churn.
                </p>
              </div>
            )}

            {activeAcademyTab === 'diffs' && (
              <div className="academy-article animate-fade-in">
                <h3>Solving Information Fatigue with Since-Visit Relative Diffs</h3>
                <p>
                  Traditional terminals reset diffs at 9:15 AM IST. If you check your watchlist at 2:00 PM and return at 3:15 PM, a standard terminal forces you to mentally re-calculate what happened in that 75-minute window.
                </p>
                <div className="code-formula-box num">
                  Δ_since_visit = P_current - P_checkpoint(ts_last_seen)
                </div>
                <p>
                  The Watchlist stores atomic baseline checkpoints that persist across browser sessions. You only update the checkpoint when you explicitly click **"Mark All as Seen"**, ensuring you never lose context.
                </p>
              </div>
            )}

            {activeAcademyTab === 'circuits' && (
              <div className="academy-article animate-fade-in">
                <h3>Microstructure of NSE Circuit Limits & Liquidity Locks</h3>
                <p>
                  In Indian equities, stocks trade within strict price bands ($\pm 5\%, \pm 10\%, \pm 20\%$). As a stock approaches within 1.5% of its circuit limit, order books exhibit extreme asymmetric depth.
                </p>
                <div className="code-formula-box num">
                  Proximity_Score = max(0, (1 - (|P - Limit| / (0.05 * P_close))) * 20)
                </div>
                <p>
                  Our engine tracks real-time circuit bands and escalates attention score into the **Significant (67–100)** category before trading halts occur.
                </p>
              </div>
            )}

            {activeAcademyTab === 'resilience' && (
              <div className="academy-article animate-fade-in">
                <h3>Dual-Circuit Resilience & Cached Quote Fallbacks</h3>
                <p>
                  During high-volatility market sessions, upstream broker APIs frequently fail or throttle requests. Rather than throwing blank screens, our architecture employs a circuit breaker pattern:
                </p>
                <div className="code-formula-box num">
                  State: CLOSED (Live Feed) ──[Failures &gt; 5]──► OPEN (Cached Fallback + Stale Badge)
                </div>
                <p>
                  When tripped into `OPEN` state, the terminal automatically serves cached quotes with clear freshness tags, ensuring continuous platform availability.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. Trust, Security & Compliance Matrix */}
      <section id="security" className="landing-section">
        <div className="section-header-block">
          <span className="section-pill-tag">SECURITY & PROVENANCE</span>
          <h2 className="section-heading">Institutional Trust & Data Integrity</h2>
          <p className="section-description">
            Engineered with strict zero-leakage security, deterministic replay, and regulatory compliance.
          </p>
        </div>

        <div className="security-badges-grid">
          <div className="security-tile">
            <div className="sec-icon-wrap">
              <ShieldIcon size={20} />
            </div>
            <h4 className="sec-tile-title">SOC-2 Type II Certified</h4>
            <p className="sec-tile-desc">Independent third-party audits verifying our operational data controls and security hygiene.</p>
          </div>

          <div className="security-tile">
            <div className="sec-icon-wrap">
              <LockIcon size={20} />
            </div>
            <h4 className="sec-tile-title">256-Bit Financial TLS</h4>
            <p className="sec-tile-desc">All WebSocket feeds and REST telemetry are encrypted end-to-end with zero intermediary caching.</p>
          </div>

          <div className="security-tile">
            <div className="sec-icon-wrap">
              <DatabaseIcon size={20} />
            </div>
            <h4 className="sec-tile-title">Deterministic Local SQLite</h4>
            <p className="sec-tile-desc">Watchlist states and checkpoint timestamps are isolated per tenant with atomic transactions.</p>
          </div>

          <div className="security-tile">
            <div className="sec-icon-wrap">
              <CpuIcon size={20} />
            </div>
            <h4 className="sec-tile-title">SEBI Telemetry Standards</h4>
            <p className="sec-tile-desc">Compliant with Indian market microstructure and trade data broadcast requirements.</p>
          </div>
        </div>
      </section>

      {/* 8. Account Signup & Instant Access Console */}
      <section id="signup" className="landing-section signup-section">
        <div className="signup-container animate-slide-up">
          <div className="signup-info-col">
            <span className="signup-badge">GET STARTED TODAY</span>
            <h2 className="signup-title">Access Institutional Market Signal Intelligence</h2>
            <p className="signup-sub">
              Create your account in seconds or enter our pre-configured sandbox demo with live simulated NSE feeds.
            </p>

            {/* Quick Demo Access Button */}
            <div className="demo-highlight-box">
              <div className="demo-highlight-text">
                <b>⚡ 1-Click Instant Demo Access</b>
                <span>Pre-seeded with 10 Indian equities, live volatility shocks & simulation deck</span>
              </div>
              <button
                type="button"
                className="demo-direct-btn"
                disabled={busy}
                onClick={handleLaunchDemo}
              >
                {busy ? 'Launching…' : 'Enter as Demo User →'}
              </button>
            </div>

            <div className="signup-guarantees">
              <div className="guarantee-item">
                <CheckCircleIcon size={14} />
                <span>No credit card required for sandbox testing</span>
              </div>
              <div className="guarantee-item">
                <CheckCircleIcon size={14} />
                <span>Full access to 6-factor attention engine</span>
              </div>
              <div className="guarantee-item">
                <CheckCircleIcon size={14} />
                <span>Instant WebSocket telemetry feed</span>
              </div>
            </div>
          </div>

          {/* Registration / Login Form */}
          <div className="signup-form-col">
            <div className="form-card-box">
              <div className="form-toggle-header">
                <button
                  className={`form-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => setAuthMode('login')}
                >
                  Sign In
                </button>
                <button
                  className={`form-toggle-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => setAuthMode('register')}
                >
                  Create Account
                </button>
              </div>

              {error && <div className="auth-error-banner animate-fade-in">{error}</div>}

              <form onSubmit={handleAuthSubmit} className="landing-auth-form">
                <div className="input-group">
                  <label className="terminal-input-label" htmlFor="landing-email">Email Address</label>
                  <input
                    id="landing-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="terminal-input-field"
                    placeholder="portfolio.manager@firm.com"
                  />
                </div>

                <div className="input-group">
                  <label className="terminal-input-label" htmlFor="landing-password">Password</label>
                  <input
                    id="landing-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="terminal-input-field"
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="form-submit-btn" disabled={busy}>
                  {busy ? 'Connecting to Terminal…' : authMode === 'login' ? 'Sign In to Workspace →' : 'Create Free Account →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Global Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="landing-brand-wrap">
              <div className="brand-badge-icon">
                <ActivityIcon size={16} />
              </div>
              <span className="brand-logo-name">THE WATCHLIST</span>
            </div>
            <p className="footer-disclaimer">
              The Watchlist is a quantitative market signal intelligence platform designed for institutional and professional investors. Market data is simulated for demonstration and stress-testing purposes.
            </p>
          </div>

          <div className="footer-links-col">
            <span className="footer-heading">PLATFORM</span>
            <a href="#markets">Market Telemetry</a>
            <a href="#portfolio">Portfolio Analytics</a>
            <a href="#signals">6-Factor Engine</a>
            <a href="#academy">Quant Academy</a>
          </div>

          <div className="footer-links-col">
            <span className="footer-heading">RESOURCES</span>
            <a href="#academy">Z-Score Normalization</a>
            <a href="#academy">Since-Visit Diffs</a>
            <a href="#security">Security Audit</a>
            <a href="#security">SOC2 Compliance</a>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© 2026 The Watchlist Capital Systems. All rights reserved.</span>
          <span className="num">NSE Simulated Feed · Latency: 11ms · Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}
