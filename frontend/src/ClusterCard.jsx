import { LayersIcon, TrendingUpIcon, TrendingDownIcon, ChevronRightIcon, ZapIcon, AlertTriangleIcon } from './Icons';

export default function ClusterCard({ cluster, items = [], liveUpdates = {}, onSelectTicker }) {
  if (!cluster || !cluster.symbols || cluster.symbols.length === 0) return null;

  const clusterItems = cluster.symbols
    .map((sym) => items.find((i) => i.symbol === sym))
    .filter(Boolean);

  const isUp = cluster.direction === 'up';

  return (
    <div className="cluster-card animate-fade-in" role="region" aria-label={`${cluster.sector} Sector Cluster`}>
      <div className={`cluster-accent-bar ${isUp ? 'up' : 'down'}`} />

      <div className="cluster-inner">
        {/* Cluster Header */}
        <div className="cluster-header">
          <div className="cluster-title-group">
            <div className="cluster-icon-box">
              <LayersIcon size={16} />
            </div>
            <div>
              <div className="cluster-badge-row">
                <span className="cluster-sector-pill">{cluster.sector.toUpperCase()} SECTOR CO-MOVEMENT</span>
                <span className={`cluster-dir-pill num ${isUp ? 'up' : 'down'}`}>
                  {isUp ? <TrendingUpIcon size={12} /> : <TrendingDownIcon size={12} />}
                  <span>{isUp ? 'ALL ADVANCING' : 'ALL DECLINING'}</span>
                </span>
                <span className="cluster-count-pill num">{cluster.symbols.length} WATCHED TICKERS</span>
              </div>
              <h3 className="cluster-reason-headline">{cluster.reason}</h3>
            </div>
          </div>

          <div className="cluster-score-box">
            <span className="cluster-score-label">CLUSTER ATTENTION</span>
            <div className="cluster-score-val num">
              <ZapIcon size={12} />
              <span>{cluster.avgScore}</span>
            </div>
          </div>
        </div>

        {/* Compact Member Tickers Grid */}
        <div className="cluster-members-grid">
          {clusterItems.map((item) => {
            const live = liveUpdates[item.symbol];
            const price = live?.price ?? item.quote?.price ?? 0;
            const prevClose = item.quote?.prevClose || price;
            const changePct = prevClose > 0 ? (((price - prevClose) / prevClose) * 100).toFixed(2) : '0.00';
            const itemIsUp = Number(changePct) >= 0;

            return (
              <div
                key={item.symbol}
                className="cluster-member-tile"
                onClick={() => onSelectTicker && onSelectTicker(item)}
                role="button"
                tabIndex={0}
                title={`Inspect ${item.symbol}`}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectTicker && onSelectTicker(item); }}
              >
                <div className="member-id-col">
                  <span className="member-symbol">{item.symbol}</span>
                  <span className="member-name">{item.meta?.name}</span>
                </div>

                <div className="member-price-col">
                  <span className="member-price num">₹{price.toFixed(2)}</span>
                  <span className={`member-change num ${itemIsUp ? 'up' : 'down'}`}>
                    {itemIsUp ? '+' : ''}{changePct}%
                  </span>
                </div>

                <div className="member-diff-col">
                  {item.diff?.hasBaseline && !item.diff?.isFirstView ? (
                    <span className={`member-diff-tag num ${item.diff.priceDelta >= 0 ? 'gain' : 'loss'}`}>
                      {item.diff.priceDelta >= 0 ? '+' : ''}{item.diff.priceDeltaPct}% since visit
                    </span>
                  ) : (
                    <span className="member-diff-tag new">New</span>
                  )}
                </div>

                <div className="member-action-col">
                  <ChevronRightIcon size={14} className="member-arrow-icon" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
