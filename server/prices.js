import { ALL_STOCKS } from "./sectors.js";
import { fetchYahooQuote, fetchReliableChangePct, mapWithConcurrency } from "./yahoo.js";

export const INDICES = [
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEBANK", label: "NIFTY BANK" },
];

const CONCURRENCY = 8;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

let cache = { fetchedAt: 0, stocks: {}, indices: {}, failedCount: 0 };
let inFlight = null;

async function refreshPrices() {
  const stockSymbols = ALL_STOCKS.map((s) => s.symbol);

  const [stockResults, indexResults] = await Promise.all([
    mapWithConcurrency(stockSymbols, CONCURRENCY, async (symbol) => {
      const quote = await fetchYahooQuote(`${symbol}.NS`);
      return { symbol, ...quote };
    }),
    mapWithConcurrency(INDICES, CONCURRENCY, async (idx) => {
      const quote = await fetchYahooQuote(idx.symbol);
      // meta.previousClose (used above for changePct) has been observed to go
      // stale/wrong for specific symbols — regularMarketPrice stays live and
      // accurate, but a bad previousClose silently corrupts the % (and even
      // its sign) even though the level shown alongside it is correct. Same
      // fix as premarket.js: recompute from the daily close series instead.
      try {
        quote.changePct = await fetchReliableChangePct(idx.symbol, quote.price);
      } catch {
        // fall back to fetchYahooQuote's own changePct if this fails
      }
      return { symbol: idx.symbol, label: idx.label, ...quote };
    }),
  ]);

  const stocks = {};
  let failedCount = 0;
  stockResults.forEach((r, i) => {
    if (r && !r.error) {
      stocks[stockSymbols[i]] = {
        price: r.price,
        changePct: r.changePct,
        fiftyTwoWeekHigh: r.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: r.fiftyTwoWeekLow,
      };
    } else failedCount += 1;
  });

  const indices = {};
  for (const r of indexResults) {
    if (r && !r.error && r.symbol) indices[r.symbol] = { label: r.label, price: r.price, changePct: r.changePct };
  }

  cache = { fetchedAt: Date.now(), stocks, indices, failedCount };
  return cache;
}

export async function getPrices({ force = false } = {}) {
  const isStale = Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;
  if (!isStale && !force) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshPrices().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Synchronous lookup for the current cache — used while building news items,
// where we don't want to block on a network round trip per article.
export function getCachedPrice(symbol) {
  return cache.stocks[symbol] || null;
}

// Returns the initial warm-up promise so callers that depend on the price
// cache being populated (e.g. market movers' OI-buildup/52-week classification,
// which reads getCachedPrice() synchronously) can wait for it before running
// their own first pass, rather than racing it on cold start.
export function startPricePolling() {
  const initial = refreshPrices()
    .then((c) => {
      console.log(`[prices] warm cache loaded: ${Object.keys(c.stocks).length} stocks, ${Object.keys(c.indices).length} indices (${c.failedCount} failed)`);
      return c;
    })
    .catch((err) => console.error("[prices] initial fetch failed:", err.message));
  setInterval(() => {
    refreshPrices()
      .then((c) => console.log(`[prices] refreshed: ${Object.keys(c.stocks).length} stocks, ${c.failedCount} failed`))
      .catch((err) => console.error("[prices] refresh failed:", err.message));
  }, REFRESH_INTERVAL_MS);
  return initial;
}
