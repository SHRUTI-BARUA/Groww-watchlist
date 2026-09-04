// hub.js
// Pushes live ticker updates to connected clients over WebSocket, so clients
// never poll the backend for prices directly (design doc §2.5). A client
// subscribes to the set of symbols in its watchlist; the hub fans out each
// poller update only to sockets subscribed to that symbol.

const { WebSocketServer } = require('ws');

function attach(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const subscriptions = new Map(); // ws -> Set<symbol>

  wss.on('connection', (ws) => {
    subscriptions.set(ws, new Set());

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
          subscriptions.set(ws, new Set(msg.symbols));
        }
      } catch {
        // ignore malformed client messages rather than crash the connection
      }
    });

    ws.on('close', () => subscriptions.delete(ws));
  });

  function broadcast(symbol, payload) {
    const message = JSON.stringify({ type: 'quote', ...payload });
    for (const [ws, symbols] of subscriptions.entries()) {
      if (ws.readyState === ws.OPEN && symbols.has(symbol)) {
        ws.send(message);
      }
    }
  }

  return { broadcast };
}

module.exports = { attach };
