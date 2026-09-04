import { useEffect, useRef, useState } from 'react';
import { WS_URL } from './api';

// Subscribes to live push updates for a set of symbols (see backend
// ws/hub.js). Clients never poll the backend for prices directly — the
// backend's poller pushes updates as they happen. This hook just applies
// incoming updates onto whatever base data the caller already has (from the
// REST /view call), so a live tick updates the price without needing a full
// re-fetch (and re-sort) of the whole watchlist.
export function useLiveQuotes(symbols) {
  const [liveUpdates, setLiveUpdates] = useState({}); // symbol -> latest push payload
  const wsRef = useRef(null);
  const symbolsKey = symbols.slice().sort().join(',');

  useEffect(() => {
    if (symbols.length === 0) return undefined;

    let closedByUs = false;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbols }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'quote') {
          setLiveUpdates((prev) => ({ ...prev, [msg.symbol]: msg }));
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      // Connection issues degrade gracefully: the UI still has whatever it
      // last fetched via REST, it just won't get pushed updates until the
      // next full view refresh. No user-facing crash on a dropped socket.
    };

    return () => {
      closedByUs = true;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return liveUpdates;
}
