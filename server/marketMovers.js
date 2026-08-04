import { ALL_STOCKS } from "./sectors.js";
import { getCachedPrice, getPrices } from "./prices.js";
import { fetchNseJson } from "./nse.js";
import { generateReportSummary } from "./groq.js";

// Market-internals data (gainers/losers, OI positioning) doesn't move as
// fast as raw prices and NSE's own analysis endpoints are heavier to hit —
// a coarser refresh than the 15-min price poll is plenty.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const STOCK_SYMBOLS = new Set(ALL_STOCKS.map((s) => s.symbol));

async function fetchGainersLosers() {
  const referer = "https://www.nseindia.com/market-data/top-gainers-losers";
  const [gainersRes, losersRes] = await Promise.all([
    fetchNseJson("/api/live-analysis-variations?index=gainers", referer),
    // NSE's own endpoint really does use this misspelling — "losers" (the
    // correct spelling) returns an empty/unusable response; verified live.
    fetchNseJson("/api/live-analysis-variations?index=loosers", referer),
  ]);

  const mapRows = (rows) =>
    (rows || []).map((r) => ({ symbol: r.symbol, price: r.ltp, changePct: r.perChange }));

  // "FOSec" (F&O Securities) — liquid, F&O-eligible names, same universe the
  // OI buildup analysis below uses, rather than "allSec" which includes thin
  // penny-stock movers.
  const gainers = mapRows(gainersRes?.FOSec?.data)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 10);
  const losers = mapRows(losersRes?.FOSec?.data)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 10);

  return { gainers, losers };
}

// Distinct from "most active by value" above — this is NSE's dedicated
// Volume Gainers report (today's volume vs its own 1-week/2-week average),
// matching the reference NseIndiaApi library's liveVolumeGainers().
async function fetchVolumeGainers() {
  const rows = await fetchNseJson(
    "/api/live-analysis-volume-gainers",
    "https://www.nseindia.com/market-data/volume-gainers",
  );
  return (rows?.data || []).slice(0, 10).map((r) => ({
    symbol: r.symbol,
    price: r.ltp,
    changePct: r.pChange,
    volume: r.volume,
    week1AvgVolume: r.week1AvgVolume,
    week1VolChangePct: +r.week1volChange.toFixed(2),
  }));
}

// Market-wide breadth — how many NSE-listed securities advanced vs declined
// today, independent of our own tracked stock universe.
async function fetchAdvanceDecline() {
  const res = await fetchNseJson("/api/live-analysis-advance", "https://www.nseindia.com/");
  const count = res?.advance?.count;
  if (!count) throw new Error("unexpected advance/decline response shape");
  return {
    advances: count.Advances,
    declines: count.Declines,
    unchanged: count.Unchange,
    total: count.Total,
  };
}

async function fetchMostActive() {
  const rows = await fetchNseJson(
    "/api/live-analysis-most-active-securities?index=value",
    "https://www.nseindia.com/market-data/most-active-underlying",
  );
  return (rows?.data || []).slice(0, 15).map((r) => ({
    symbol: r.symbol,
    price: r.lastPrice,
    changePct: r.pChange,
    tradedValueCr: +(r.totalTradedValue / 1e7).toFixed(2), // rupees -> ₹ crore
  }));
}

// Standard F&O positioning read: combine today's price direction with
// today's futures/options OI direction for the same underlying.
//   price up + OI up     -> Long Buildup    (new longs being added)
//   price down + OI up   -> Short Buildup   (new shorts being added)
//   price up + OI down   -> Short Covering  (shorts closing out)
//   price down + OI down -> Long Unwinding  (longs closing out)
function classifyBuildup(changePct, changeInOI) {
  if (changePct > 0 && changeInOI > 0) return "longBuildup";
  if (changePct < 0 && changeInOI > 0) return "shortBuildup";
  if (changePct > 0 && changeInOI < 0) return "shortCovering";
  if (changePct < 0 && changeInOI < 0) return "longUnwinding";
  return null;
}

// Major index futures — reported alongside individual stocks in the same OI
// Spurts feed, so pulling these out is free (no extra request).
const INDEX_FUTURES_SYMBOLS = new Set(["NIFTY", "BANKNIFTY", "FINNIFTY", "NIFTYNXT50"]);

async function fetchOiSpurts() {
  // NSE's "OI Spurts" report — the underlyings (stocks + index futures) with
  // the largest change in open interest today. It reports OI change but not
  // price change, so stock rows are cross-referenced against our own Yahoo
  // Finance price cache (already polled every 15 min) rather than making
  // another round of per-symbol network calls.
  const res = await fetchNseJson(
    "/api/live-analysis-oi-spurts-underlyings",
    "https://www.nseindia.com/market-data/oi-spurts",
  );
  const rows = res?.data || [];

  const buckets = { longBuildup: [], shortBuildup: [], shortCovering: [], longUnwinding: [] };
  const indexOi = [];

  for (const row of rows) {
    if (INDEX_FUTURES_SYMBOLS.has(row.symbol)) {
      indexOi.push({
        symbol: row.symbol,
        latestOI: row.latestOI,
        prevOI: row.prevOI,
        changeInOI: row.changeInOI,
        oiChangePct: row.avgInOI,
      });
      continue;
    }
    // Everything else that isn't in our tracked stock universe is a
    // derivative/underlying we don't have a matching price cache entry for.
    if (!STOCK_SYMBOLS.has(row.symbol)) continue;
    const live = getCachedPrice(row.symbol);
    if (!live) continue;
    const bucket = classifyBuildup(live.changePct, row.changeInOI);
    if (!bucket) continue;
    buckets[bucket].push({
      symbol: row.symbol,
      price: live.price,
      changePct: live.changePct,
      oiChangePct: row.avgInOI,
    });
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => Math.abs(b.oiChangePct) - Math.abs(a.oiChangePct));
    buckets[key] = buckets[key].slice(0, 8);
  }

  return { oiBuildup: buckets, indexOi };
}

// Which of our tracked stocks are trading close to their 52-week high/low —
// derived entirely from Yahoo's own fiftyTwoWeekHigh/Low fields on the price
// cache we already poll, no separate NSE call needed.
const NEAR_52WEEK_BAND_PCT = 3;

function compute52WeekMovers() {
  const near52WeekHigh = [];
  const near52WeekLow = [];

  for (const stock of ALL_STOCKS) {
    const live = getCachedPrice(stock.symbol);
    if (!live || !live.fiftyTwoWeekHigh || !live.fiftyTwoWeekLow) continue;
    const distFromHighPct = ((live.fiftyTwoWeekHigh - live.price) / live.fiftyTwoWeekHigh) * 100;
    const distFromLowPct = ((live.price - live.fiftyTwoWeekLow) / live.fiftyTwoWeekLow) * 100;
    if (distFromHighPct <= NEAR_52WEEK_BAND_PCT) {
      near52WeekHigh.push({
        symbol: stock.symbol,
        price: live.price,
        changePct: live.changePct,
        fiftyTwoWeekHigh: live.fiftyTwoWeekHigh,
        distFromHighPct: +distFromHighPct.toFixed(2),
      });
    }
    if (distFromLowPct <= NEAR_52WEEK_BAND_PCT) {
      near52WeekLow.push({
        symbol: stock.symbol,
        price: live.price,
        changePct: live.changePct,
        fiftyTwoWeekLow: live.fiftyTwoWeekLow,
        distFromLowPct: +distFromLowPct.toFixed(2),
      });
    }
  }

  near52WeekHigh.sort((a, b) => a.distFromHighPct - b.distFromHighPct);
  near52WeekLow.sort((a, b) => a.distFromLowPct - b.distFromLowPct);
  return { near52WeekHigh: near52WeekHigh.slice(0, 10), near52WeekLow: near52WeekLow.slice(0, 10) };
}

function parseNseDate(d) {
  // NSE date format: "29-Jul-2026"
  const parsed = new Date(d.replace(/-/g, " "));
  return isNaN(+parsed) ? null : parsed;
}

function toDdMmYyyy(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
}

const CORPORATE_ACTIONS_LOOKAHEAD_DAYS = 30;

// Returns two views of the same feed:
//   - `curated`: only our tracked 109-stock universe — what the Premarket
//     Report embed shows (a compact briefing scoped to stocks we actually
//     cover elsewhere in the app).
//   - `all`: the full market-wide list, same breadth as NSE's own
//     corporate-filings-actions page — what the dedicated Corporate Actions
//     page shows. Filtering this down to `curated` everywhere was the bug:
//     NSE's page lists hundreds of companies, ours only ever showed the tiny
//     handful that happened to also be in our curated stock list.
async function fetchCorporateActions() {
  // Without an explicit from/to range, NSE's own default window for this
  // endpoint is tiny (~20 items market-wide, spanning only 1-2 days) — verified
  // live. Passing an explicit range (as the reference NseIndiaApi library
  // does) returns the full month ahead instead (150+ items).
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + CORPORATE_ACTIONS_LOOKAHEAD_DAYS);
  const rows = await fetchNseJson(
    `/api/corporates-corporateActions?index=equities&from_date=${toDdMmYyyy(from)}&to_date=${toDdMmYyyy(to)}`,
    "https://www.nseindia.com/companies-listing/corporate-filings-actions",
  );
  if (!Array.isArray(rows)) return { all: [], curated: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = rows
    .map((r) => ({ ...r, _exDate: parseNseDate(r.exDate) }))
    .filter((r) => r._exDate && r._exDate >= today)
    .sort((a, b) => +a._exDate - +b._exDate)
    .map((r) => ({ symbol: r.symbol, company: r.comp, exDate: r.exDate, subject: r.subject }));

  return {
    all: upcoming.slice(0, 150),
    curated: upcoming.filter((r) => STOCK_SYMBOLS.has(r.symbol)).slice(0, 50),
  };
}

// NSE's board-meeting event calendar — "purpose" covers several kinds of
// business (dividend, buyback, fund raising, ...); we only want the ones
// that are actually about upcoming quarterly results.
async function fetchEarningsCalendar() {
  const rows = await fetchNseJson(
    "/api/event-calendar",
    "https://www.nseindia.com/companies-listing/corporate-filings-event-calendar",
  );
  if (!Array.isArray(rows)) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows
    .filter((r) => STOCK_SYMBOLS.has(r.symbol) && /financial results/i.test(r.purpose || ""))
    .map((r) => ({ ...r, _date: parseNseDate(r.date) }))
    .filter((r) => r._date && r._date >= today)
    .sort((a, b) => +a._date - +b._date)
    .slice(0, 15)
    .map((r) => ({ symbol: r.symbol, company: r.company, date: r.date, purpose: r.purpose }));
}

const EMPTY_OI_BUILDUP = { longBuildup: [], shortBuildup: [], shortCovering: [], longUnwinding: [] };

function describeMoversForAi({ gainers, losers, mostActive, oiBuildup, indexOi }) {
  const fmtMover = (m) => `${m.symbol} ${m.changePct >= 0 ? "+" : ""}${m.changePct}%`;
  const lines = [];
  if (gainers.length > 0) lines.push(`Top gainers: ${gainers.slice(0, 5).map(fmtMover).join(", ")}`);
  if (losers.length > 0) lines.push(`Top losers: ${losers.slice(0, 5).map(fmtMover).join(", ")}`);
  if (mostActive.length > 0) lines.push(`Most active by value: ${mostActive.slice(0, 5).map((m) => m.symbol).join(", ")}`);
  if (indexOi.length > 0) {
    lines.push(
      `Index futures OI change: ${indexOi.map((i) => `${i.symbol} ${i.oiChangePct >= 0 ? "+" : ""}${i.oiChangePct}%`).join(", ")}`,
    );
  }
  const buildupCounts = Object.entries(oiBuildup)
    .map(([key, list]) => `${key}=${list.length}`)
    .join(", ");
  lines.push(`F&O positioning counts: ${buildupCounts}`);
  return lines.join("\n");
}

// The index quotes prices.js already polls (Nifty/Sensex/Bank Nifty) —
// surfaced on the Post Market report as the day's index closing levels.
const CLOSING_INDEX_SYMBOLS = ["^NSEI", "^NSEBANK", "^BSESN"];

let cache = {
  fetchedAt: 0,
  gainers: [],
  losers: [],
  mostActive: [],
  volumeGainers: [],
  advanceDecline: null,
  oiBuildup: EMPTY_OI_BUILDUP,
  indexOi: [],
  indexClose: [],
  near52WeekHigh: [],
  near52WeekLow: [],
  corporateActions: [],
  corporateActionsAll: [],
  earningsCalendar: [],
  aiSummary: null,
};
let inFlight = null;

async function refreshMovers(force = false) {
  // fetchOiSpurts (below) and compute52WeekMovers (after) both read prices.js's
  // cache synchronously via getCachedPrice — warm/force it first so a forced
  // refresh here actually yields fresh 52-week/OI-buildup price fields too,
  // not just whatever prices.js's own independent poller last happened to hold.
  const priceCache = await getPrices({ force });
  const indexClose = CLOSING_INDEX_SYMBOLS.map((symbol) => {
    const idx = priceCache.indices[symbol];
    return idx ? { symbol, label: idx.label, price: idx.price, changePct: idx.changePct } : null;
  }).filter((entry) => entry !== null);

  const [glResult, oiResult, caResult, ecResult, maResult, vgResult, adResult] = await Promise.all([
    fetchGainersLosers().catch((err) => ({ error: err.message })),
    fetchOiSpurts().catch((err) => ({ error: err.message })),
    fetchCorporateActions().catch(() => ({ all: [], curated: [] })),
    fetchEarningsCalendar().catch(() => []),
    fetchMostActive().catch(() => []),
    fetchVolumeGainers().catch(() => []),
    fetchAdvanceDecline().catch((err) => ({ error: err.message })),
  ]);
  const week52 = compute52WeekMovers();

  const gainers = glResult && !glResult.error ? glResult.gainers : [];
  const losers = glResult && !glResult.error ? glResult.losers : [];
  const mostActive = Array.isArray(maResult) ? maResult : [];
  const volumeGainers = Array.isArray(vgResult) ? vgResult : [];
  const advanceDecline = adResult && !adResult.error ? adResult : null;
  const oiBuildup = oiResult && !oiResult.error ? oiResult.oiBuildup : EMPTY_OI_BUILDUP;
  const indexOi = oiResult && !oiResult.error ? oiResult.indexOi : [];

  let aiSummary = cache.aiSummary;
  if (process.env.GROQ_API_KEY) {
    try {
      aiSummary = await generateReportSummary(describeMoversForAi({ gainers, losers, mostActive, oiBuildup, indexOi }));
    } catch (err) {
      console.error("[market-movers] AI summary failed:", err.message);
    }
  }

  cache = {
    fetchedAt: Date.now(),
    gainers,
    losers,
    mostActive,
    volumeGainers,
    advanceDecline,
    oiBuildup,
    indexOi,
    indexClose,
    near52WeekHigh: week52.near52WeekHigh,
    near52WeekLow: week52.near52WeekLow,
    corporateActions: Array.isArray(caResult?.curated) ? caResult.curated : [],
    corporateActionsAll: Array.isArray(caResult?.all) ? caResult.all : [],
    earningsCalendar: Array.isArray(ecResult) ? ecResult : [],
    aiSummary,
  };
  return cache;
}

export async function getMarketMovers({ force = false } = {}) {
  const isStale = Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;
  if (!isStale && !force) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshMovers(force).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function summarize(c) {
  const oi = Object.entries(c.oiBuildup)
    .map(([k, v]) => `${k}=${v.length}`)
    .join(", ");
  return (
    `${c.gainers.length} gainers, ${c.losers.length} losers, mostActive=${c.mostActive.length}, ` +
    `volumeGainers=${c.volumeGainers.length}, advanceDecline=${c.advanceDecline ? `${c.advanceDecline.advances}/${c.advanceDecline.declines}` : "n/a"}, ` +
    `oi buildup: ${oi}, indexOi=${c.indexOi.length}, 52wHigh=${c.near52WeekHigh.length}, 52wLow=${c.near52WeekLow.length}, ` +
    `corpActions=${c.corporateActions.length}/${c.corporateActionsAll.length}, earnings=${c.earningsCalendar.length}`
  );
}

export function startMarketMoversPolling() {
  refreshMovers()
    .then((c) => console.log(`[market-movers] warm cache loaded (${summarize(c)})`))
    .catch((err) => console.error("[market-movers] initial fetch failed:", err.message));
  setInterval(() => {
    refreshMovers()
      .then((c) => console.log(`[market-movers] refreshed (${summarize(c)})`))
      .catch((err) => console.error("[market-movers] refresh failed:", err.message));
  }, REFRESH_INTERVAL_MS);
}
