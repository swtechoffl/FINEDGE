import { useEffect, useState } from "react";
import { isValidSymbol } from "./researchTrackerValidation";

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface CallQuote {
  price: number | null;
  changePct: number | null;
  history: HistoryPoint[];
  loading: boolean;
  error: boolean;
}

const EMPTY: CallQuote = { price: null, changePct: null, history: [], loading: true, error: false };

// One shared fetch per unique symbol across every card on the page — several
// calls can reference the same stock, and each card doesn't need its own
// independent round trip to /api/stock/:symbol (itself already server-cached
// for 5min, but no reason to hit it N times per paint either). Reuses the
// same endpoint StockDetail does, which is the app's only source of a live
// price + historical daily-close series for an arbitrary NSE symbol.
export function useResearchQuotes(symbols: string[]) {
  const key = [...new Set(symbols.filter(Boolean))].sort().join(",");
  const [quotes, setQuotes] = useState<Record<string, CallQuote>>({});

  useEffect(() => {
    const uniqueSymbols = key ? key.split(",") : [];
    if (uniqueSymbols.length === 0) return;
    let cancelled = false;

    setQuotes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const symbol of uniqueSymbols) {
        if (!next[symbol]) {
          next[symbol] = { ...EMPTY };
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    for (const symbol of uniqueSymbols) {
      // The server 400s anything outside this shape (server/index.js's
      // /api/stock/:symbol route) — skip the request entirely for a
      // malformed symbol rather than logging a guaranteed-failing network
      // call every time this hook re-fetches.
      if (!isValidSymbol(symbol)) {
        setQuotes((prev) => ({ ...prev, [symbol]: { ...EMPTY, loading: false, error: true } }));
        continue;
      }
      fetch(`/api/stock/${encodeURIComponent(symbol)}`)
        .then((res) => {
          if (!res.ok) throw new Error(`API responded ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (cancelled) return;
          setQuotes((prev) => ({
            ...prev,
            [symbol]: {
              price: json.price ?? null,
              changePct: json.changePct ?? null,
              history: Array.isArray(json.history) ? json.history : [],
              loading: false,
              error: false,
            },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setQuotes((prev) => ({ ...prev, [symbol]: { ...EMPTY, loading: false, error: true } }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [key]);

  return quotes;
}
