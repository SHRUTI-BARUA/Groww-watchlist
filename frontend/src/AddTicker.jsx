import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export default function AddTicker({ existingSymbols, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    api.searchUniverse(query).then((res) => {
      if (active) {
        const filtered = (res.results || []).filter((r) => !existingSymbols.includes(r.symbol));
        setResults(filtered);
        setHighlightIdx(0);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [query, existingSymbols]);

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightIdx]) {
        onAdd(results[highlightIdx].symbol);
        setQuery('');
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="add-form" ref={boxRef}>
      <input
        className="add-input"
        placeholder="Add stock (e.g. RELIANCE, ZOMATO)…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {open && results.length > 0 && (
        <div className="add-suggestions">
          {results.slice(0, 8).map((r, idx) => (
            <div
              key={r.symbol}
              className={`add-suggestion ${idx === highlightIdx ? 'highlighted' : ''}`}
              onClick={() => { onAdd(r.symbol); setQuery(''); setOpen(false); }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              <div className="sugg-left">
                <span className="sym">{r.symbol}</span>
                <span className="name">{r.name}</span>
              </div>
              <div className="sugg-right">
                <span className="sector-pill">{r.sector}</span>
                <span className="price-tag num">₹{r.basePrice}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

