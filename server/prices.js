import { ALL_STOCKS } from "./sectors.js";
import { fetchYahooQuote, fetchReliableChangePct, mapWithConcurrency } from "./yahoo.js";
import { fetchNseAllIndices } from "./nse.js";
import { fetchBseSensex } from "./bse.js";

export const INDICES = [
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEBANK", label: "NIFTY BANK" },
];

const CONCURRENCY = 8;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

let cache = { fetchedAt: 0, stocks: {}, indices: {}, failedCount: 0 };
let inFlight = null;

// Nifty/Sensex/Bank Nifty level+change are pulled straight from the
// exchanges themselves (NSE's own index feed, BSE's own quote endpoint) —
// not derived from some other provider's previous-close, which is exactly
// what produced a wrong (even wrong-signed) %change before while the level
// itself stayed correct. Yahoo is only a fallback if an exchange feed is
// unreachable (e.g. NSE's session-cookie handshake failing).
function hasNumbers(obj, ...keys) {
  return obj != null && keys.every((k) => typeof obj[k] === "number");
}

async function fetchAuthenticIndexQuotes() {
  const result = {};

  const nseIndices = await fetchNseAllIndices().catch(() => []);
  const byName = Object.fromEntries(nseIndices.map((d) => [d.index, d]));
  const nifty = byName["NIFTY 50"];
  const bankNifty = byName["NIFTY BANK"];
  // "variation" is NSE's own absolute point change for the index — not
  // something we compute from price+percentChange.
  if (hasNumbers(nifty, "last", "variation", "percentChange")) {
    result["^NSEI"] = { label: "NIFTY 50", price: nifty.last, change: nifty.variation, changePct: nifty.percentChange };
  }
  if (hasNumbers(bankNifty, "last", "variation", "percentChange")) {
    result["^NSEBANK"] = {
      label: "NIFTY BANK",
      price: bankNifty.last,
      change: bankNifty.variation,
      changePct: bankNifty.percentChange,
    };
  }

  const sensex = await fetchBseSensex().catch(() => null);
  if (sensex) {
    result["^BSESN"] = { label: "SENSEX", price: sensex.price, change: sensex.change, changePct: sensex.changePct };
  }

  return result;
}

async function refreshPrices() {
  const stockSymbols = ALL_STOCKS.map((s) => s.symbol);

  const [stockResults, authenticIndices] = await Promise.all([
    mapWithConcurrency(stockSymbols, CONCURRENCY, async (symbol) => {
      const quote = await fetchYahooQuote(`${symbol}.NS`);
      return { symbol, ...quote };
    }),
    fetchAuthenticIndexQuotes(),
  ]);

  const missingIndices = INDICES.filter((idx) => !authenticIndices[idx.symbol]);
  const yahooFallback = await mapWithConcurrency(missingIndices, CONCURRENCY, async (idx) => {
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
    // Yahoo doesn't expose the exchange's own absolute point change — only
    // reachable here if both NSE and BSE were unavailable, so this inverts
    // the (already best-effort) changePct back to a point figure rather
    // than leaving it out entirely.
    quote.change = quote.price - quote.price / (1 + quote.changePct / 100);
    return { symbol: idx.symbol, label: idx.label, ...quote };
  });

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

  const indices = { ...authenticIndices };
  for (const r of yahooFallback) {
    if (r && !r.error && r.symbol) {
      indices[r.symbol] = { label: r.label, price: r.price, change: r.change, changePct: r.changePct };
    }
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
