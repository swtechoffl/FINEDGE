import { fetchYahooQuote, fetchYahooDailyOHLC, mapWithConcurrency, YAHOO_BROWSER_UA } from "./yahoo.js";

const CONCURRENCY = 6;
// Global cues move continuously through the day (unlike the tracked-stock
// universe, which only needs a coarse 15-min refresh) — poll more often.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const SYMBOL_GROUPS = {
  domestic: [{ symbol: "^INDIAVIX", label: "India VIX" }],
  commodities: [
    { symbol: "GC=F", label: "Gold" },
    { symbol: "SI=F", label: "Silver" },
    { symbol: "CL=F", label: "Crude Oil (WTI)" },
  ],
  currency: [
    { symbol: "USDINR=X", label: "USD/INR" },
    { symbol: "GBPINR=X", label: "GBP/INR" },
  ],
  us: [
    { symbol: "^DJI", label: "Dow Jones" },
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^IXIC", label: "Nasdaq" },
    { symbol: "^RUT", label: "Russell 2000" },
  ],
  europe: [
    { symbol: "^FTSE", label: "FTSE 100" },
    { symbol: "^FCHI", label: "CAC 40" },
    { symbol: "^GDAXI", label: "DAX" },
  ],
  asia: [
    { symbol: "^N225", label: "Nikkei 225" },
    { symbol: "^HSI", label: "Hang Seng" },
    { symbol: "000001.SS", label: "Shanghai Composite" },
    { symbol: "^KS11", label: "KOSPI" },
  ],
};

// GIFT Nifty (NSE IX / India International Exchange, GIFT City — the
// successor to SGX Nifty) has no free official real-time API. This page
// publishes it as schema.org structured data (application/ld+json
// PropertyValue entries) specifically for machine consumption, which is a
// far more stable target than scraping rendered markup — but it's still a
// third-party aggregator, not an exchange feed, and is labeled as such in
// the response.
async function fetchGiftNifty() {
  const res = await fetch("https://giftcitynifty.com/gift-nifty-dashboard/", {
    headers: { "User-Agent": YAHOO_BROWSER_UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const extract = (fieldName) => {
    // Some PropertyValue entries have an extra "unitText" field between
    // "name" and "value" (e.g. Percent Change) — allow anything but a
    // closing brace in between so we don't cross into the next entry.
    const re = new RegExp(`"name"\\s*:\\s*"${fieldName}"[^}]*?"value"\\s*:\\s*(-?[0-9.]+)`);
    const m = html.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const price = extract("Last Price");
  if (price === null) throw new Error("could not find GIFT Nifty price in page");

  return {
    label: "GIFT Nifty",
    price,
    changePct: extract("Percent Change"),
    change: extract("Change"),
    impliedOpen: extract("Implied Open"),
    gapPoints: extract("Gap Points"),
    gapPercent: extract("Gap Percent"),
    source: "giftcitynifty.com (third-party aggregator, not an exchange feed)",
  };
}

// NSE's own official FII/FPI & DII trading-activity API. Calling it cold
// (no session) returns a generic "Resource not found" — verified directly —
// it needs a cookie from a normal page visit first, same as a browser would
// get just by loading nseindia.com before the report page's script calls
// its own API.
async function fetchFiiDii() {
  const homeRes = await fetch("https://www.nseindia.com/", {
    headers: { "User-Agent": YAHOO_BROWSER_UA, Accept: "text/html" },
  });
  const cookies =
    typeof homeRes.headers.getSetCookie === "function"
      ? homeRes.headers.getSetCookie()
      : homeRes.headers.get("set-cookie")
        ? [homeRes.headers.get("set-cookie")]
        : [];
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
  if (!cookieHeader) throw new Error("no session cookie from nseindia.com");

  const res = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", {
    headers: {
      "User-Agent": YAHOO_BROWSER_UA,
      Accept: "application/json",
      Referer: "https://www.nseindia.com/reports/fii-dii",
      Cookie: cookieHeader,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("unexpected FII/DII response shape");

  const toNum = (v) => (v === undefined || v === null ? null : parseFloat(v));
  const result = { date: data[0]?.date || null };
  for (const row of data) {
    const key = row.category === "DII" ? "dii" : row.category && row.category.toUpperCase().includes("FII") ? "fii" : null;
    if (!key) continue;
    result[key] = { buyValue: toNum(row.buyValue), sellValue: toNum(row.sellValue), netValue: toNum(row.netValue) };
  }
  return result;
}

// Standard floor-trader pivot formula — the same one every NSE terminal and
// broker research note uses, computed directly from the previous session's
// exchange-reported high/low/close (Yahoo's ^NSEI daily bar mirrors NSE's
// own OHLC for the index), not a third-party estimate.
function computeFloorPivots({ high, low, close }) {
  const round = (n) => +n.toFixed(2);
  const pivot = (high + low + close) / 3;
  return {
    pivot: round(pivot),
    r1: round(2 * pivot - low),
    r2: round(pivot + (high - low)),
    r3: round(high + 2 * (pivot - low)),
    s1: round(2 * pivot - high),
    s2: round(pivot - (high - low)),
    s3: round(low - 2 * (high - pivot)),
  };
}

async function fetchNiftyPivots() {
  const bar = await fetchYahooDailyOHLC("^NSEI");
  return {
    basis: { date: bar.date, high: bar.high, low: bar.low, close: bar.close },
    levels: computeFloorPivots(bar),
  };
}

// Simple, transparent weighted-cue heuristic (no ML/LLM) for "what kind of
// opening should today's session expect" — not a prediction, a same-day
// pre-market read. GIFT Nifty carries the most weight since it *is* the
// futures-implied Nifty open; US markets get the next-largest weight since
// they trade the full US session overnight relative to Indian market hours;
// Europe/Asia and metals (a secondary risk-sentiment cue) get smaller
// weights. Thresholds are in percentage points.
const BAROMETER_WEIGHTS = { giftNifty: 0.45, us: 0.3, global: 0.15, commodities: 0.1 };
const BAROMETER_FLAT_BAND = 0.2;

function average(nums) {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function computeBarometer({ giftNifty, groups }) {
  const giftPct = giftNifty?.changePct ?? null;
  const usPct = average((groups.us || []).map((q) => q.changePct));
  const globalPct = average([...(groups.europe || []), ...(groups.asia || [])].map((q) => q.changePct));
  const commoditiesPct = average((groups.commodities || []).map((q) => q.changePct));

  const cues = { giftNifty: giftPct, us: usPct, global: globalPct, commodities: commoditiesPct };
  const parts = Object.entries(BAROMETER_WEIGHTS).filter(([key]) => cues[key] !== null);
  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((sum, [, w]) => sum + w, 0);
  const score = parts.reduce((sum, [key, w]) => sum + cues[key] * w, 0) / totalWeight;

  const label = score > BAROMETER_FLAT_BAND ? "positive" : score < -BAROMETER_FLAT_BAND ? "negative" : "flat";

  const round2 = (n) => (n === null ? null : +n.toFixed(2));
  const roundedCues = {
    giftNifty: round2(cues.giftNifty),
    us: round2(cues.us),
    global: round2(cues.global),
    commodities: round2(cues.commodities),
  };

  return { score: +score.toFixed(2), label, cues: roundedCues };
}

let cache = { fetchedAt: 0, giftNifty: null, groups: {}, fiiDii: null, niftyPivots: null, barometer: null, failedCount: 0 };
let inFlight = null;

async function refreshPremarket() {
  const allSymbols = Object.entries(SYMBOL_GROUPS).flatMap(([groupKey, list]) =>
    list.map((item) => ({ groupKey, ...item })),
  );

  const [symbolResults, giftResult, fiiDiiResult, pivotsResult] = await Promise.all([
    mapWithConcurrency(allSymbols, CONCURRENCY, async (item) => {
      const quote = await fetchYahooQuote(item.symbol);
      return { ...item, ...quote };
    }),
    fetchGiftNifty().catch((err) => ({ error: err.message })),
    fetchFiiDii().catch((err) => ({ error: err.message })),
    fetchNiftyPivots().catch((err) => ({ error: err.message })),
  ]);

  const groups = {};
  for (const key of Object.keys(SYMBOL_GROUPS)) groups[key] = [];
  let failedCount = 0;
  for (const r of symbolResults) {
    if (r.error) {
      failedCount += 1;
      continue;
    }
    groups[r.groupKey].push({ symbol: r.symbol, label: r.label, price: r.price, changePct: r.changePct });
  }

  const giftNifty = giftResult && !giftResult.error ? giftResult : null;

  cache = {
    fetchedAt: Date.now(),
    giftNifty,
    groups,
    fiiDii: fiiDiiResult && !fiiDiiResult.error ? fiiDiiResult : null,
    niftyPivots: pivotsResult && !pivotsResult.error ? pivotsResult : null,
    barometer: computeBarometer({ giftNifty, groups }),
    failedCount,
  };
  return cache;
}

export async function getPremarket() {
  const isStale = Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;
  if (!isStale) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshPremarket().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function summarize(c) {
  return `gift=${!!c.giftNifty}, fiiDii=${!!c.fiiDii}, pivots=${!!c.niftyPivots}, barometer=${c.barometer?.label ?? "n/a"}, ${c.failedCount} symbols failed`;
}

export function startPremarketPolling() {
  refreshPremarket()
    .then((c) => console.log(`[premarket] warm cache loaded (${summarize(c)})`))
    .catch((err) => console.error("[premarket] initial fetch failed:", err.message));
  setInterval(() => {
    refreshPremarket()
      .then((c) => console.log(`[premarket] refreshed (${summarize(c)})`))
      .catch((err) => console.error("[premarket] refresh failed:", err.message));
  }, REFRESH_INTERVAL_MS);
}
