const express = require('express');
const cors = require('cors');
const http = require('http');

const authRoutes = require('./routes/auth.routes');
const watchlistRoutes = require('./routes/watchlist.routes');
const marketRoutes = require('./routes/market.routes');
const wsHub = require('./ws/hub');
const poller = require('./worker/poller');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/watchlists', watchlistRoutes);
app.use('/api/market', marketRoutes);

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'internal server error' });
});

const server = http.createServer(app);
const hub = wsHub.attach(server);
poller.setBroadcaster(hub.broadcast);
poller.start();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Smart Watchlist backend listening on :${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
