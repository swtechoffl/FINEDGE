// Shared Yahoo Finance fetch helper — used by both prices.js (tracked stock
// universe) and premarket.js (global indices/commodities/currencies).
//
// Public, unauthenticated endpoint. The bulk quote endpoint (v7/finance/quote)
// now requires a crumb/cookie and returns "Unauthorized" for anonymous
// requests (verified directly) — the per-symbol chart endpoint
// (v8/finance/chart/{symbol}) still works anonymously and exposes
// regularMarketPrice/previousClose in its `meta` block, which is all we need.
export const YAHOO_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchYahooQuote(yahooSymbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
  const res = await fetch(url, { headers: { "User-Agent": YAHOO_BROWSER_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(data?.chart?.error?.description || "no result from Yahoo Finance");
  }
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  if (typeof price !== "number" || typeof prevClose !== "number" || prevClose === 0) {
    throw new Error("missing price fields in Yahoo Finance response");
  }
  const changePct = ((price - prevClose) / prevClose) * 100;
  return {
    price: +price.toFixed(2),
    changePct: +changePct.toFixed(2),
    name: meta.longName || meta.shortName || null,
    fiftyTwoWeekHigh: typeof meta.fiftyTwoWeekHigh === "number" ? meta.fiftyTwoWeekHigh : null,
    fiftyTwoWeekLow: typeof meta.fiftyTwoWeekLow === "number" ? meta.fiftyTwoWeekLow : null,
  };
}

// Daily OHLC bars — needed for pivot-point math, which requires the
// previous *complete* session's high/low/close (not just the running
// intraday meta.regularMarketDayHigh/Low that fetchYahooQuote exposes).
// The most recent bar in the range can still be actively forming (its
// `close` comes back null/undefined until the session ends), so we walk
// back to the last bar that actually has one.
export async function fetchYahooDailyOHLC(yahooSymbol, days = 10) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${days}d&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": YAHOO_BROWSER_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(data?.chart?.error?.description || "no result from Yahoo Finance");

  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const bars = ts.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    high: q.high?.[i] ?? null,
    low: q.low?.[i] ?? null,
    close: q.close?.[i] ?? null,
  }));
  const complete = bars.filter((b) => b.high !== null && b.low !== null && b.close !== null);
  if (complete.length === 0) throw new Error("no complete daily bar available");
  return complete[complete.length - 1];
}

export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      try {
        results[current] = await fn(items[current]);
      } catch (err) {
        results[current] = { error: err.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
