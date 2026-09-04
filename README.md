# GROWW Watchlist — Smart Market Watchlist

**CODE 2026 Submission**

A watchlist built around one question most watchlists never ask:  
> *"I haven't looked since yesterday — what happened, and does any of it actually matter?"*

Not a faster snapshot tool. A **diff-and-signal intelligence platform**.

---

## 1. System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            React Frontend               │
                    │   (OLED Obsidian UI, REST + WebSocket)  │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │             Express API                 │
                    │       auth / CRUD / view / stream       │
                    └────────────────────┬────────────────────┘
                                         │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                               │
  ┌───────▼────────┐             ┌────────▼────────┐             ┌────────▼────────┐
  │ SQLite Engine  │             │ In-Memory Cache │             │   Background    │
  │ (node:sqlite)  │             │ (Redis-shaped   │             │     Poller      │
  │ users/lists/   │◄────────────┤  get/set/stale) │◄────────────┤ (union of all   │
  │ checkpoints    │             └─────────────────┘             │ watched symbols)│
  └────────────────┘                                             └────────┬────────┘
                                                                          │
                                                         ┌────────────────▼────────────────┐
                                                         │     Groww Live Market Feed      │
                                                         │       (Real NSE Quotes API)     │
                                                         │  + Circuit Breaker & Fallback   │
                                                         └─────────────────────────────────┘
```

### Core Engine Components

1. **Attention Scoring Engine** (`backend/src/engine/attentionScore.js`)  
   Transforms raw market ticks into an intuitive **0–100 Attention Score** accompanied by an actionable plain-English reason. It computes five independent signals:
   - **Volatility-adjusted move ($z$-score)**: Measured against each symbol's historic standard deviation baseline ($\sigma$), not an arbitrary percentage threshold.
   - **Relative Volume Anomaly**: Flags unusual volume spikes relative to 30-day average volume ($>1.5\times$, $>3.0\times$).
   - **52-Week Milestone Breaches**: Immediate alerts when trading within 1.5% of annual highs or lows.
   - **Gap-Open Magnitude**: Isolates overnight sentiment shifts at market open.
   - **Circuit Limit Proximity**: Proactive freeze risk detection when approaching upper/lower NSE circuit bands ($<2\%$).
   - **Correlated News Multiplier**: Context bonus when matched with verified corporate catalysts.

2. **Quiet Confirmation Engine ("Nothing to See Here")** (`backend/src/engine/summary.js`)  
   Computes a list-level summary state (`all-clear`, `notable-present`, `significant-present`). When all watched symbols are behaving within expected volatility, it renders a reassuring confirmation banner and relaxes UI contrast, eliminating scan fatigue.

3. **Correlated-Move Clustering** (`backend/src/engine/clustering.js`)  
   Identifies sector-wide co-movements (e.g., Banking rally, IT sell-off). It validates directional agreement and z-score magnitude coherence ($|z| \le 2\times\text{median }|z|$), collapsing redundant rows into a unified sector insight card with synthesized news attribution.

4. **Beginner-Friendly Plain-English Insights** (`frontend/src/PlainEnglishInsights.jsx`)  
   Clicking any stock card opens a 4-tab modal defaulting to a beginner-friendly analysis:
   - **Verdict Banner**: 🟢 *Normal Day / No Action Needed*, 🟡 *Mild Activity / Worth a Glance*, or 🔴 *Major Shift / Needs Attention*.
   - **6 Crisp Bullets**:
     1. *Price Movement & Volatility*: Contextualized against normal daily swings.
     2. *Volume & Conviction*: Real volume vs. 30-day baseline.
     3. *Change Since Last Visit*: Net delta since the user's last saved checkpoint.
     4. *52-Week Range Context*: Position relative to 52-week extremes.
     5. *Safety & Circuit Limits*: Distance to freeze bounds.
     6. *Breaking News & Catalyst*: Plain-language explanation of market drivers.
   - **3-Step Decision Guide**: Easy, actionable next steps for newcomers.

5. **Shared-Polling Worker & Live Groww Feed** (`backend/src/marketData/growwProvider.js` & `backend/src/worker/poller.js`)  
   Directly fetches live NSE market data from Groww's endpoints. The background worker polls the **union** of watched symbols across all users once per cycle ($O(\text{symbols})$ rather than $O(\text{users} \times \text{symbols})$), caching updates and broadcasting changes over WebSockets.

---

## 2. Design Invariants & Standards

- **Permanent OLED Obsidian Dark Theme**: Pure dark aesthetics (`#06080d` background, `#0b0f17` cards, `#111827` borders, glassmorphic blurs, and emerald/amber/crimson telemetry).
- **Strict Vector SVGs (Zero Emojis in Structural UI)**: All UI components, badges, icons, and status markers use clean, crisp SVG vectors.
- **Checkpoint Delta Persistence**: `last_viewed_at` is preserved per `(user, watchlist)` in SQLite and updates **only** upon an explicit `Mark all as seen` action, preserving historical diffs across page reloads.

---

## 3. Resilience & Edge Cases

| Scenario | System Handling |
|---|---|
| **Groww Feed Outage / Timeout** | 3-strike circuit breaker trips to `open`, serving cached quotes with `freshness: "delayed"` badge and zero data fabrication. |
| **Weekend / After-Hours** | Market-hours awareness recognizes non-trading windows (NSE IST 09:15–15:30) as expected, keeping data marked as verified close. |
| **Page Refresh Mid-Session** | Checkpoint timestamps are untouched on GET requests, preventing accidental loss of the "since last visit" diff. |
| **First-Ever Symbol View** | The diff engine explicitly displays "Baseline established on add" instead of inventing zeroed deltas. |
| **WebSocket Disconnects** | Auto-reconnection with exponential backoff and transparent state resynchronization. |

---

## 4. Technology Stack

- **Backend**: Node.js 22 (`node:sqlite` for native, zero-dependency embedded persistence), Express, `ws` (WebSocket server), `jsonwebtoken`, `bcryptjs`.
- **Frontend**: React 18, Vite, Vanilla CSS Design System (OLED Obsidian, Glassmorphism, CSS Grid/Flexbox).
- **Testing**: Node Native Test Runner (`node --test test/engine.test.js`).

---

## 5. Quick Start & Setup

### Prerequisites
- **Node.js**: v18+ (v20+ or v22 recommended)
- **npm**: v9+

### Installation & Launch

1. **Clone and Setup Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env     # Configures PORT=4000, DATA_PROVIDER=groww
   npm start
   ```
   *Backend will run on `http://localhost:4000` with WebSocket on `ws://localhost:4000/ws`.*

2. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Frontend will run on `http://localhost:5173`.*

3. **Run Automated Test Suite**:
   ```bash
   cd backend
   npm test
   ```

---

## 6. How to Use & Verify

1. Open `http://localhost:5173` in your browser.
2. Observe the top telemetry bar: IST Market Status, Groww Live Feed badge, and Pulse metrics.
3. Click the **💡 Beginner Guide** button in the masthead to open the interactive trading masterclass.
4. Click any stock card (e.g., `RELIANCE`, `TCS`, `SUZLON`, `BSE`) to inspect the **Plain English Insights** with its 6-point bullet breakdown and 3-step decision roadmap.
5. Click **Mark all as seen** to advance your personal checkpoint baseline and watch the delta indicators update in real-time.
