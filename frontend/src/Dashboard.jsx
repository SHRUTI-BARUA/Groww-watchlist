import { useCallback, useEffect, useState, useMemo } from 'react';
import { api } from './api';
import { useLiveQuotes } from './useLiveQuotes';
import TickerRow from './TickerRow';
import SummaryBanner from './SummaryBanner';
import ClusterCard from './ClusterCard';
import AddTicker from './AddTicker';
import MarketOverviewBar from './MarketOverviewBar';
import SimulationToolbar from './SimulationToolbar';
import TickerDetailModal from './TickerDetailModal';
import BeginnerGuideModal from './BeginnerGuideModal';
import {
  SearchIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
  AlertTriangleIcon,
  ZapIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  SlidersIcon,
  ActivityIcon,
  LightbulbIcon,
  GrowwLogoIcon,
} from './Icons';

const REFRESH_MS = 12000;

function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export default function Dashboard({ user, onSignOut }) {
  const [watchlists, setWatchlists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justMarkedSeen, setJustMarkedSeen] = useState(false);

  // Advanced filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'significant' | 'notable' | 'gainers' | 'losers' | 'unseen'
  const [sortBy, setSortBy] = useState('attention');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSimStudio, setShowSimStudio] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(() => localStorage.getItem('watchlist_audio') === 'true');

  // Enforce permanent OLED dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const toggleAudio = () => {
    setAudioAlerts((prev) => {
      const next = !prev;
      localStorage.setItem('watchlist_audio', String(next));
      if (next) playAlertChime();
      return next;
    });
  };

  const loadWatchlists = useCallback(async () => {
    try {
      const res = await api.listWatchlists();
      setWatchlists(res.watchlists);
      if (!activeId && res.watchlists.length > 0) setActiveId(res.watchlists[0].id);
      return res.watchlists;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [activeId]);

  const loadView = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await api.viewWatchlist(id);
      setView(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWatchlists(); }, [loadWatchlists]);

  useEffect(() => {
    if (!activeId) return undefined;
    setLoading(true);
    loadView(activeId);
    const interval = setInterval(() => loadView(activeId), REFRESH_MS);
    return () => clearInterval(interval);
  }, [activeId, loadView]);

  const symbols = useMemo(() => {
    return view?.items?.filter((i) => !i.error).map((i) => i.symbol) || [];
  }, [view]);

  const liveUpdates = useLiveQuotes(symbols);

  // Trigger audio alert when a ticker becomes Significant
  useEffect(() => {
    if (!audioAlerts) return;
    const hasSignificant = Object.values(liveUpdates).some(
      (u) => u?.attentionBucket === 'significant'
    );
    if (hasSignificant) playAlertChime();
  }, [liveUpdates, audioAlerts]);

  async function handleAdd(symbol) {
    await api.addItem(activeId, symbol);
    loadView(activeId);
  }

  async function handleRemove(symbol) {
    await api.removeItem(activeId, symbol);
    if (selectedItem?.symbol === symbol) setSelectedItem(null);
    loadView(activeId);
  }

  async function handleCreateWatchlist() {
    const name = window.prompt('Name this watchlist:');
    if (!name || !name.trim()) return;
    const res = await api.createWatchlist(name.trim());
    await loadWatchlists();
    setActiveId(res.id);
  }

  async function handleRenameWatchlist() {
    const currentWl = watchlists.find((w) => w.id === activeId);
    if (!currentWl) return;
    const newName = window.prompt('Rename watchlist:', currentWl.name);
    if (!newName || !newName.trim() || newName.trim() === currentWl.name) return;
    await api.renameWatchlist(activeId, newName.trim());
    await loadWatchlists();
    loadView(activeId);
  }

  async function handleDeleteWatchlist() {
    const currentWl = watchlists.find((w) => w.id === activeId);
    if (!currentWl) return;
    if (watchlists.length <= 1) {
      alert('You must keep at least one watchlist.');
      return;
    }
    const ok = window.confirm(`Delete watchlist "${currentWl.name}"?`);
    if (!ok) return;
    await api.deleteWatchlist(activeId);
    const updated = await loadWatchlists();
    if (updated.length > 0) setActiveId(updated[0].id);
  }

  async function handleMarkSeen() {
    await api.markSeen(activeId);
    setJustMarkedSeen(true);
    setTimeout(() => setJustMarkedSeen(false), 4500);
    loadView(activeId);
  }

  const handleSimulatedEvent = () => {
    loadView(activeId);
  };

  const handleShockStock = async (sym, pct = 5.0, vol = 4.0) => {
    await api.simulateShock(sym, pct, vol);
    loadView(activeId);
  };

  // Filter & Sort Pipeline
  const filteredAndSortedItems = useMemo(() => {
    if (!view?.items) return [];

    let list = view.items.filter((item) => {
      if (item.error) return true;
      const q = searchQuery.toUpperCase().trim();
      if (q) {
        const matchesSymbol = item.symbol.includes(q);
        const matchesName = (item.meta?.name || '').toUpperCase().includes(q);
        const matchesSector = (item.meta?.sector || '').toUpperCase().includes(q);
        if (!matchesSymbol && !matchesName && !matchesSector) return false;
      }

      const live = liveUpdates[item.symbol];
      const bucket = live?.attentionBucket ?? item.attention?.bucket;
      const price = live?.price ?? item.quote.price;
      const dayChangePct = ((price - item.quote.prevClose) / item.quote.prevClose) * 100;

      if (filterType === 'significant') return bucket === 'significant';
      if (filterType === 'notable') return bucket === 'notable' || bucket === 'significant';
      if (filterType === 'gainers') return dayChangePct > 0.05;
      if (filterType === 'losers') return dayChangePct < -0.05;
      if (filterType === 'unseen') {
        return item.diff?.hasBaseline && !item.diff?.isFirstView && Math.abs(item.diff?.priceDeltaPct || 0) > 0.01;
      }
      return true;
    });

    list.sort((a, b) => {
      if (a.error || b.error) return 0;
      const liveA = liveUpdates[a.symbol];
      const liveB = liveUpdates[b.symbol];
      const scoreA = liveA?.attentionScore ?? a.attention?.score ?? 0;
      const scoreB = liveB?.attentionScore ?? b.attention?.score ?? 0;
      const priceA = liveA?.price ?? a.quote.price;
      const priceB = liveB?.price ?? b.quote.price;
      const changeA = ((priceA - a.quote.prevClose) / a.quote.prevClose) * 100;
      const changeB = ((priceB - b.quote.prevClose) / b.quote.prevClose) * 100;
      const deltaA = a.diff?.priceDeltaPct || 0;
      const deltaB = b.diff?.priceDeltaPct || 0;
      const volA = liveA?.volume ?? a.quote.volume ?? 0;
      const volB = liveB?.volume ?? b.quote.volume ?? 0;

      if (sortBy === 'attention') return scoreB - scoreA;
      if (sortBy === 'diff') return Math.abs(deltaB) - Math.abs(deltaA);
      if (sortBy === 'gainers') return changeB - changeA;
      if (sortBy === 'losers') return changeA - changeB;
      if (sortBy === 'volume') return volB - volA;
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      return 0;
    });

    return list;
  }, [view, searchQuery, filterType, sortBy, liveUpdates]);

  const hasUnseenChanges = view?.lastViewedAt && view.items?.some(
    (i) => !i.error && i.diff?.hasBaseline && !i.diff.isFirstView && Math.abs(i.diff.priceDeltaPct) > 0.01
  );

  // High-level Watchlist KPI calculations
  const kpiStats = useMemo(() => {
    if (!view?.items || view.items.length === 0) {
      return { total: 0, sigCount: 0, notCount: 0, topMover: null, avgScore: 0, unseenCount: 0 };
    }
    const valid = view.items.filter((i) => !i.error);
    const sigCount = valid.filter((i) => (liveUpdates[i.symbol]?.attentionBucket ?? i.attention?.bucket) === 'significant').length;
    const notCount = valid.filter((i) => (liveUpdates[i.symbol]?.attentionBucket ?? i.attention?.bucket) === 'notable').length;
    const unseenCount = valid.filter((i) => i.diff?.hasBaseline && !i.diff?.isFirstView && Math.abs(i.diff?.priceDeltaPct || 0) > 0.01).length;
    const avgScore = valid.length > 0 ? Math.round(valid.reduce((acc, i) => acc + (liveUpdates[i.symbol]?.attentionScore ?? i.attention?.score ?? 0), 0) / valid.length) : 0;

    let maxChange = 0;
    let topMover = null;
    for (const item of valid) {
      const live = liveUpdates[item.symbol];
      const price = live?.price ?? item.quote.price;
      const pct = Math.abs(((price - item.quote.prevClose) / item.quote.prevClose) * 100);
      if (pct > maxChange) {
        maxChange = pct;
        topMover = { symbol: item.symbol, pct: (((price - item.quote.prevClose) / item.quote.prevClose) * 100), price };
      }
    }
    return { total: valid.length, sigCount, notCount, topMover, avgScore, unseenCount };
  }, [view, liveUpdates]);

  const exportCSV = () => {
    if (!view?.items) return;
    const rows = [
      ['Symbol', 'Name', 'Sector', 'Current Price', 'Day Change %', 'Attention Score', 'Reason', 'Baseline Price', 'Delta Since Visit %', 'Timestamp']
    ];
    for (const item of view.items) {
      if (item.error) continue;
      const live = liveUpdates[item.symbol];
      const price = live?.price ?? item.quote.price;
      const changePct = (((price - item.quote.prevClose) / item.quote.prevClose) * 100).toFixed(2);
      const score = live?.attentionScore ?? item.attention.score;
      const reason = (live?.attentionReason ?? item.attention.reason).replace(/,/g, ';');
      const baseline = item.diff?.baselinePrice || '';
      const deltaPct = item.diff?.priceDeltaPct || '';
      rows.push([
        item.symbol,
        item.meta?.name || '',
        item.meta?.sector || '',
        price.toFixed(2),
        changePct + '%',
        score,
        `"${reason}"`,
        baseline,
        deltaPct ? deltaPct + '%' : '',
        new Date().toISOString(),
      ]);
    }
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_watchlist_${view?.watchlist?.name || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="terminal-viewport">
      {/* Top Application Header */}
      <header className="terminal-masthead">
        <div className="masthead-inner">
          <div className="brand-group">
            <div className="groww-brand-badge">
              <GrowwLogoIcon size={30} />
            </div>
            <div>
              <div className="brand-title-row">
                <h1 className="brand-title">Groww Watchlist</h1>
                <span className="brand-live-chip">NSE LIVE</span>
              </div>
              <span className="brand-subtitle">Smart Signal Intelligence · Groww Real-Time Feed</span>
            </div>
          </div>

          <div className="masthead-user-actions">
            <button
              className="masthead-guide-btn"
              onClick={() => setShowGuide(true)}
              title="Learn how Attention Scores, Diffs, and Checkpoints work in 2 minutes"
            >
              <LightbulbIcon size={14} />
              <span>Beginner Guide</span>
            </button>
            <div className="user-profile-badge">
              <span className="user-dot-online" />
              <span className="user-email-text">{user.email}</span>
            </div>
            <button className="signout-link" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Global Market Overview & Breadth Strip */}
      <MarketOverviewBar
        watchlistItems={view?.items || []}
        audioAlerts={audioAlerts}
        onToggleAudio={toggleAudio}
        showSimStudio={showSimStudio}
        onToggleSimStudio={() => setShowSimStudio((prev) => !prev)}
      />

      {/* Interactive Simulation / Testing Deck */}
      {showSimStudio && (
        <SimulationToolbar
          onSimulatedEvent={handleSimulatedEvent}
          onClose={() => setShowSimStudio(false)}
        />
      )}

      {/* Main Terminal Workspace */}
      <main className="terminal-workspace">
        {/* Top KPI Ribbon */}
        {view?.items && view.items.length > 0 && (
          <div className="kpi-ribbon">
            <div className="kpi-card">
              <span className="kpi-title">ACTIVE WATCHLIST</span>
              <div className="kpi-metric-row">
                <span className="kpi-number num">{kpiStats.total}</span>
                <span className="kpi-unit">Tickers Tracked</span>
              </div>
              <span className="kpi-subtext">
                {view?.watchlist?.name || 'Default Watchlist'}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">ATTENTION RADAR</span>
              <div className="kpi-metric-row">
                <span className={`kpi-number num ${kpiStats.sigCount > 0 ? 'sig-glow' : ''}`}>
                  {kpiStats.sigCount}
                </span>
                <span className="kpi-unit">Significant Alerts</span>
              </div>
              <span className="kpi-subtext">
                {kpiStats.notCount} Notable · Avg Score: {kpiStats.avgScore}/100
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">TOP MOVER IN LIST</span>
              <div className="kpi-metric-row">
                <span className="kpi-number mover-sym">{kpiStats.topMover?.symbol || '—'}</span>
                {kpiStats.topMover && (
                  <span className={`kpi-mover-tag num ${kpiStats.topMover.pct >= 0 ? 'gain' : 'loss'}`}>
                    {kpiStats.topMover.pct >= 0 ? '+' : ''}{kpiStats.topMover.pct.toFixed(2)}%
                  </span>
                )}
              </div>
              <span className="kpi-subtext">
                {kpiStats.topMover ? `₹${kpiStats.topMover.price.toFixed(2)}` : 'Awaiting ticks'}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-title">CHECKPOINT DIFF</span>
              <div className="kpi-metric-row">
                <span className={`kpi-number num ${kpiStats.unseenCount > 0 ? 'unseen-glow' : ''}`}>
                  {kpiStats.unseenCount}
                </span>
                <span className="kpi-unit">Unseen Diffs</span>
              </div>
              <div className="kpi-action-row">
                <button
                  className="kpi-mark-btn"
                  onClick={handleMarkSeen}
                  title="Checkpoint current prices"
                >
                  <CheckCircleIcon size={12} />
                  <span>Mark All Seen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Watchlist Management Strip & Action Header */}
        <div className="workspace-control-strip">
          <div className="strip-left">
            <div className="watchlist-tab-group">
              {watchlists.map((w) => (
                <button
                  key={w.id}
                  className={`watchlist-tab ${activeId === w.id ? 'active' : ''}`}
                  onClick={() => setActiveId(w.id)}
                >
                  <span>{w.name}</span>
                </button>
              ))}
              <button
                className="watchlist-new-btn"
                onClick={handleCreateWatchlist}
                title="Create a new watchlist"
              >
                <PlusIcon size={13} />
                <span>New List</span>
              </button>
            </div>

            {watchlists.length > 0 && (
              <div className="watchlist-mgmt-actions">
                <button
                  className="mgmt-action-btn"
                  onClick={handleRenameWatchlist}
                  title="Rename this watchlist"
                >
                  <EditIcon size={13} />
                  <span>Rename</span>
                </button>
                {watchlists.length > 1 && (
                  <button
                    className="mgmt-action-btn delete"
                    onClick={handleDeleteWatchlist}
                    title="Delete this watchlist"
                  >
                    <TrashIcon size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="strip-right">
            {activeId && <AddTicker existingSymbols={symbols} onAdd={handleAdd} />}
          </div>
        </div>

        {/* Quiet Confirmation / Watchlist Summary Banner */}
        {view?.items && view.items.length > 0 && view?.summary && (
          <SummaryBanner
            summary={view.summary}
            onJumpToSignificant={() => setFilterType('significant')}
          />
        )}

        {/* Search, Smart Filters & Sort Deck */}
        {view?.items && view.items.length > 0 && (
          <div className="terminal-filter-deck">
            <div className="filter-deck-top">
              {/* Search Bar */}
              <div className="search-box-wrap">
                <SearchIcon className="search-icon-svg" size={14} />
                <input
                  type="text"
                  placeholder="Search symbol, company name, or sector… (e.g. RELIANCE, Banking)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="terminal-search-input"
                  aria-label="Filter watchlist"
                />
                {searchQuery && (
                  <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
                )}
              </div>

              {/* Sort & CSV Export */}
              <div className="filter-actions-cluster">
                <div className="terminal-sort-cluster">
                  <SlidersIcon size={13} className="sort-icon-svg" />
                  <span className="sort-label-text">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="terminal-sort-select"
                    aria-label="Sort order"
                  >
                    <option value="attention">Attention Score (Highest First)</option>
                    <option value="diff">Delta Since Visit %</option>
                    <option value="gainers">Today's Gainers %</option>
                    <option value="losers">Today's Losers %</option>
                    <option value="volume">Trading Volume</option>
                    <option value="symbol">Symbol (A to Z)</option>
                  </select>
                </div>

                <button
                  className="terminal-export-btn"
                  onClick={exportCSV}
                  title="Export watchlist snapshot and baseline diffs to CSV"
                >
                  <DownloadIcon size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Smart Filter Pills */}
            <div className="filter-chips-row" role="tablist" aria-label="Filter stocks">
              <button
                className={`filter-tab-pill ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({view.items.length})
              </button>
              <button
                className={`filter-tab-pill sig ${filterType === 'significant' ? 'active' : ''}`}
                onClick={() => setFilterType('significant')}
              >
                <AlertTriangleIcon size={11} />
                <span>Significant ({view.items.filter((i) => (liveUpdates[i.symbol]?.attentionBucket ?? i.attention?.bucket) === 'significant').length})</span>
              </button>
              <button
                className={`filter-tab-pill not ${filterType === 'notable' ? 'active' : ''}`}
                onClick={() => setFilterType('notable')}
              >
                <ZapIcon size={11} />
                <span>Notable</span>
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'gainers' ? 'active' : ''}`}
                onClick={() => setFilterType('gainers')}
              >
                <TrendingUpIcon size={11} />
                <span>Gainers</span>
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'losers' ? 'active' : ''}`}
                onClick={() => setFilterType('losers')}
              >
                <TrendingDownIcon size={11} />
                <span>Losers</span>
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'unseen' ? 'active' : ''}`}
                onClick={() => setFilterType('unseen')}
              >
                <CheckCircleIcon size={11} />
                <span>Unseen Diffs</span>
              </button>
            </div>
          </div>
        )}

        {/* Resilience Warning Banner */}
        {view?.breakerState === 'open' && (
          <div className="breaker-warning-card animate-fade-in" role="alert">
            <AlertTriangleIcon size={16} />
            <div>
              <b>Resilience Mode Active:</b> Market data provider is temporarily experiencing upstream latency. Serving cached fallback quotes with delayed timestamps until provider health recovers.
            </div>
          </div>
        )}

        {/* Seen / Checkpoint Toast Banner */}
        {justMarkedSeen && (
          <div className="checkpoint-toast animate-fade-in" role="status">
            <CheckCircleIcon size={15} />
            <span>Baseline checkpoint updated. Future diffs will be computed against this exact point.</span>
          </div>
        )}

        {loading && (
          <div className="terminal-loading-box">
            <ActivityIcon size={24} className="loading-spinner" />
            <span>Connecting to live telemetry & computing attention vectors…</span>
          </div>
        )}

        {error && <div className="terminal-error-card" role="alert">{error}</div>}

        {/* Empty State */}
        {!loading && view && view.items.length === 0 && (
          <div className="terminal-empty-card">
            <div className="empty-icon-wrap">
              <ActivityIcon size={32} />
            </div>
            <h3>No Tickers on this Watchlist</h3>
            <p>Add individual Indian equities to start monitoring 6-factor attention scoring and since-visit diffs.</p>
            <div className="quick-add-cluster">
              {['RELIANCE', 'TCS', 'ZOMATO', 'SUZLON', 'HDFCBANK', 'INFY'].map((sym) => (
                <button key={sym} className="quick-add-pill" onClick={() => handleAdd(sym)}>
                  + {sym}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ticker Cards Table */}
        {!loading && view && view.items.length > 0 && (
          <div className={`ticker-cards-deck ${view?.summary?.state === 'all-clear' ? 'all-clear-muted' : ''}`}>
            {/* Clustered Sector Co-Movements (Rendered at top when viewing all items) */}
            {filterType === 'all' && !searchQuery && view.clusters && view.clusters.length > 0 && (
              <div className="clusters-deck">
                {view.clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    items={view.items}
                    liveUpdates={liveUpdates}
                    onSelectTicker={(selected) => setSelectedItem(selected)}
                  />
                ))}
              </div>
            )}

            {filteredAndSortedItems.length === 0 ? (
              <div className="no-filter-match-card">
                <p>No tickers match your search filter criteria.</p>
                <button className="reset-filter-btn" onClick={() => { setSearchQuery(''); setFilterType('all'); }}>
                  Reset Filters
                </button>
              </div>
            ) : (
              (filterType === 'all' && !searchQuery && view.clusters && view.clusters.length > 0
                ? filteredAndSortedItems.filter((item) => !item.clusterId)
                : filteredAndSortedItems
              ).map((item) => (
                <TickerRow
                  key={item.symbol}
                  item={item}
                  live={liveUpdates[item.symbol]}
                  onRemove={handleRemove}
                  onSelect={(selected) => setSelectedItem(selected)}
                />
              ))
            )}
          </div>
        )}

        {/* Footer Info Strip */}
        {!loading && view && view.items.length > 0 && (
          <footer className="terminal-footer-strip">
            <div className="footer-checkpoint-info">
              {view?.lastViewedAt ? (
                <>Baseline checkpoint saved at <span className="num font-bold">{new Date(view.lastViewedAt).toLocaleTimeString()}</span> ({view.items.length} stocks tracked)</>
              ) : (
                <>No baseline checkpoint set yet</>
              )}
            </div>

            <button
              className={`checkpoint-mark-btn ${hasUnseenChanges ? 'has-unseen-glow' : ''}`}
              onClick={handleMarkSeen}
              title="Reset baseline checkpoint to current market prices"
            >
              <CheckCircleIcon size={14} />
              <span>Mark All as Seen</span>
            </button>
          </footer>
        )}
      </main>

      {/* Stock Deep-Dive Modal with Plain English Insights */}
      {selectedItem && (
        <TickerDetailModal
          item={selectedItem}
          live={liveUpdates[selectedItem.symbol]}
          onClose={() => setSelectedItem(null)}
          onShockStock={handleShockStock}
        />
      )}

      {/* Beginner Educational Guide Modal */}
      {showGuide && (
        <BeginnerGuideModal onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}
