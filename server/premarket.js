import {
  fetchYahooQuote,
  fetchYahooDailyOHLC,
  fetchReliableChangePct,
  mapWithConcurrency,
  YAHOO_BROWSER_UA,
} from "./yahoo.js";
import { fetchNseJson } from "./nse.js";
import { generateReportSummary } from "./groq.js";

const CONCURRENCY = 6;
// Global cues move continuously through the day (unlike the tracked-stock
// universe, which only needs a coarse 15-min refresh) — poll more often.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Symbols where Yahoo's own meta.previousClose has been observed to go
// stale (verified live: both skipped an entire prior session, referencing
// a close from two trading days back instead of one) — their changePct
// gets recomputed from the daily close series instead (see
// fetchReliableChangePct in yahoo.js). Scoped to single-daily-session
// indices specifically — commodities/forex trade near-continuously and
// don't have an unambiguous single "close" the same way, so a batch check
// across those wasn't conclusive enough to add here.
const UNRELIABLE_PREV_CLOSE_SYMBOLS = new Set(["000001.SS", "^INDIAVIX"]);

const SYMBOL_GROUPS = {
  domestic: [{ symbol: "^INDIAVIX", label: "India VIX" }],
  commodities: [
    { symbol: "GC=F", label: "Gold" },
    { symbol: "SI=F", label: "Silver" },
    { symbol: "BZ=F", label: "Brent Oil" },
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
  // NYSE/Nasdaq-listed ADRs of Indian companies — trade through the US
  // session (India's overnight), so their move is a same-day pre-market
  // read the same way GIFT Nifty and US indices are. Tata Motors' ADR
  // (TTM) and Azure Power (AZRE) were excluded — both delisted (TTM in the
  // 2024 DVR merger, AZRE when it went private in 2023).
  adr: [
    { symbol: "INFY", label: "Infosys" },
    { symbol: "WIT", label: "Wipro" },
    { symbol: "IBN", label: "ICICI Bank" },
    { symbol: "HDB", label: "HDFC Bank" },
    { symbol: "RDY", label: "Dr Reddy's" },
    { symbol: "SIFY", label: "Sify" },
    { symbol: "YTRA", label: "Yatra Online" },
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

// NSE's own official FII/FPI & DII trading-activity API.
async function fetchFiiDii() {
  const data = await fetchNseJson("/api/fiidiiTradeReact", "https://www.nseindia.com/reports/fii-dii");
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

async function fetchBankNiftyPivots() {
  const bar = await fetchYahooDailyOHLC("^NSEBANK");
  return {
    basis: { date: bar.date, high: bar.high, low: bar.low, close: bar.close },
    levels: computeFloorPivots(bar),
  };
}

function parseNseIpoDate(d) {
  // NSE's IPO endpoints mix casing across feeds — "29-Jul-2026" (current/
  // upcoming) vs "27-JUL-2026" (past) — both parse fine once hyphens become
  // spaces, but a bare "-" (not yet listed) has to be treated as "no date".
  if (!d || d === "-") return null;
  const parsed = new Date(d.replace(/-/g, " "));
  return isNaN(+parsed) ? null : parsed;
}

const IPO_LOOKAHEAD_DAYS = 45;
const IPO_PAST_LIMIT = 15;

// Three separate NSE endpoints, matching the reference NseIndiaApi library's
// listCurrentIPO/listUpcomingIPO/listPastIPO — current-issue only has one row
// per symbol (category="Total"), unlike some other NSE analysis feeds that
// break out multiple rows per name.
async function fetchIpoListings() {
  const [currentRows, upcomingRows, pastRows] = await Promise.all([
    fetchNseJson("/api/ipo-current-issue", "https://www.nseindia.com/market-data/all-forthcoming-issues"),
    fetchNseJson("/api/all-upcoming-issues?category=ipo", "https://www.nseindia.com/market-data/all-upcoming-issues-ipo"),
    fetchNseJson("/api/public-past-issues?index=ipo", "https://www.nseindia.com/market-data/all-past-issues-ipo"),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // NSE's "current-issue" endpoint can lag rolling a name over to the past-
  // issues feed once its subscription window closes, so without an explicit
  // end-date check a just-closed IPO keeps showing as "Currently Open".
  const current = (Array.isArray(currentRows) ? currentRows : [])
    .map((r) => ({ ...r, _end: parseNseIpoDate(r.issueEndDate) }))
    .filter((r) => !r._end || r._end >= today)
    .map((r) => ({
      symbol: r.symbol,
      company: r.companyName,
      priceRange: r.issuePrice,
      startDate: r.issueStartDate,
      endDate: r.issueEndDate,
      subscriptionTimes: r.noOfTime ? +parseFloat(r.noOfTime).toFixed(2) : null,
      isSme: r.series === "SME",
    }));

  const lookaheadCutoff = new Date(today);
  lookaheadCutoff.setDate(lookaheadCutoff.getDate() + IPO_LOOKAHEAD_DAYS);
  const currentSymbols = new Set(current.map((c) => c.symbol));

  const upcoming = (Array.isArray(upcomingRows) ? upcomingRows : [])
    .filter((r) => !currentSymbols.has(r.symbol))
    .map((r) => ({ ...r, _start: parseNseIpoDate(r.issueStartDate), _end: parseNseIpoDate(r.issueEndDate) }))
    // NSE's "upcoming" feed can lag removing an issue whose window has
    // already opened and closed entirely (verified live: rows with both
    // start and end dates in the past lingering here) — the end-date check
    // catches what the start-date lookahead alone doesn't.
    .filter((r) => r._start && r._start <= lookaheadCutoff && (!r._end || r._end >= today))
    .sort((a, b) => +a._start - +b._start)
    .map((r) => ({
      symbol: r.symbol,
      company: r.companyName,
      priceRange: r.issuePrice,
      startDate: r.issueStartDate,
      endDate: r.issueEndDate,
      isSme: r.series === "SME",
    }));

  const past = (Array.isArray(pastRows) ? pastRows : [])
    .map((r) => ({ ...r, _end: parseNseIpoDate(r.ipoEndDate) }))
    .filter((r) => r._end)
    .sort((a, b) => +b._end - +a._end)
    .slice(0, IPO_PAST_LIMIT)
    .map((r) => ({
      symbol: r.symbol,
      company: r.company,
      priceRange: r.priceRange,
      endDate: r.ipoEndDate,
      listingDate: r.listingDate && r.listingDate !== "-" ? r.listingDate : null,
      isSme: r.securityType === "SME",
    }));

  return { current, upcoming, past };
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

// Same "generate once per refresh, keep the last good one on failure"
// pattern as the AI news analysis — a fresh call every 5-min refresh cycle
// is well within Groq's free-tier limits, and a transient failure shouldn't
// blank out a summary that was fine a moment ago.
function describePremarketForAi({ giftNifty, fiiDii, barometer, groups }) {
  const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n}%`;
  const fmtQuotes = (list) => (list || []).map((q) => `${q.label} ${fmtPct(q.changePct)}`).join(", ");
  const lines = [];
  if (giftNifty) {
    lines.push(
      `GIFT Nifty: ${giftNifty.price} (${giftNifty.changePct !== null ? fmtPct(giftNifty.changePct) : "n/a"}), ` +
        `implied Nifty gap ${giftNifty.gapPoints ?? "n/a"} pts`,
    );
  }
  if (barometer) lines.push(`Composite premarket barometer: score ${barometer.score}, reads "${barometer.label}"`);
  if (fiiDii?.fii) lines.push(`FII net: Rs ${fiiDii.fii.netValue} Cr`);
  if (fiiDii?.dii) lines.push(`DII net: Rs ${fiiDii.dii.netValue} Cr`);
  const us = fmtQuotes(groups.us);
  if (us) lines.push(`US markets overnight: ${us}`);
  const europe = fmtQuotes(groups.europe);
  if (europe) lines.push(`Europe: ${europe}`);
  const asia = fmtQuotes(groups.asia);
  if (asia) lines.push(`Asia: ${asia}`);
  const commodities = fmtQuotes(groups.commodities);
  if (commodities) lines.push(`Commodities: ${commodities}`);
  const currency = fmtQuotes(groups.currency);
  if (currency) lines.push(`Currency: ${currency}`);
  const domestic = fmtQuotes(groups.domestic);
  if (domestic) lines.push(`Domestic: ${domestic}`);
  return lines.join("\n");
}

// International spot gold (GC=F, USD/troy-oz) converted to INR/gram via the
// live USD/INR rate already fetched into `groups` above — no extra network
// call. This is an indicative international-equivalent rate, not an Indian
// bullion-market retail quote (which bakes in import duty, GST, and dealer
// premiums on top) — labeled as such wherever it's shown.
const GRAMS_PER_TROY_OUNCE = 31.1034768;

function computeGoldRateInrPerGram(groups) {
  const gold = groups.commodities?.find((q) => q.symbol === "GC=F");
  const usdinr = groups.currency?.find((q) => q.symbol === "USDINR=X");
  if (!gold || !usdinr) return null;
  return Math.round((gold.price * usdinr.price) / GRAMS_PER_TROY_OUNCE);
}

let cache = {
  fetchedAt: 0,
  giftNifty: null,
  groups: {},
  fiiDii: null,
  niftyPivots: null,
  bankNiftyPivots: null,
  goldRateInrPerGram: null,
  barometer: null,
  ipos: { current: [], upcoming: [], past: [] },
  aiSummary: null,
  failedCount: 0,
};
let inFlight = null;

async function refreshPremarket() {
  const allSymbols = Object.entries(SYMBOL_GROUPS).flatMap(([groupKey, list]) =>
    list.map((item) => ({ groupKey, ...item })),
  );

  const [symbolResults, giftResult, fiiDiiResult, pivotsResult, bankPivotsResult, iposResult] = await Promise.all([
    mapWithConcurrency(allSymbols, CONCURRENCY, async (item) => {
      const quote = await fetchYahooQuote(item.symbol);
      if (UNRELIABLE_PREV_CLOSE_SYMBOLS.has(item.symbol)) {
        try {
          quote.changePct = await fetchReliableChangePct(item.symbol, quote.price);
        } catch {
          // fall back to fetchYahooQuote's own changePct if this fails
        }
      }
      return { ...item, ...quote };
    }),
    fetchGiftNifty().catch((err) => ({ error: err.message })),
    fetchFiiDii().catch((err) => ({ error: err.message })),
    fetchNiftyPivots().catch((err) => ({ error: err.message })),
    fetchBankNiftyPivots().catch((err) => ({ error: err.message })),
    fetchIpoListings().catch((err) => ({ error: err.message })),
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
  const fiiDii = fiiDiiResult && !fiiDiiResult.error ? fiiDiiResult : null;
  const barometer = computeBarometer({ giftNifty, groups });

  let aiSummary = cache.aiSummary; // keep the last good one if this cycle's call fails
  if (process.env.GROQ_API_KEY) {
    try {
      aiSummary = await generateReportSummary(describePremarketForAi({ giftNifty, fiiDii, barometer, groups }));
    } catch (err) {
      console.error("[premarket] AI summary failed:", err.message);
    }
  }

  cache = {
    fetchedAt: Date.now(),
    giftNifty,
    groups,
    fiiDii,
    niftyPivots: pivotsResult && !pivotsResult.error ? pivotsResult : null,
    bankNiftyPivots: bankPivotsResult && !bankPivotsResult.error ? bankPivotsResult : null,
    goldRateInrPerGram: computeGoldRateInrPerGram(groups),
    barometer,
    ipos: iposResult && !iposResult.error ? iposResult : cache.ipos,
    aiSummary,
    failedCount,
  };
  return cache;
}

export async function getPremarket({ force = false } = {}) {
  const isStale = Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;
  if (!isStale && !force) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshPremarket().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function summarize(c) {
  return (
    `gift=${!!c.giftNifty}, fiiDii=${!!c.fiiDii}, pivots=${!!c.niftyPivots}, bankPivots=${!!c.bankNiftyPivots}, barometer=${c.barometer?.label ?? "n/a"}, ` +
    `ipos=${c.ipos.current.length}/${c.ipos.upcoming.length}/${c.ipos.past.length}, ${c.failedCount} symbols failed`
  );
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
