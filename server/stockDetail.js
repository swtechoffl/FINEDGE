import { fetchYahooQuote, fetchYahooHistoricalSeries } from "./yahoo.js";
import { fetchNseJson } from "./nse.js";
import { ALL_STOCKS } from "./sectors.js";
import { getCachedPrice } from "./prices.js";

const REFERER = "https://www.nseindia.com/option-chain";

// NSE's older `/api/quote-equity` is blocked by their Akamai edge protection
// (confirmed "Access Denied" even with the same cookie handshake that works
// everywhere else). This "NextApi" endpoint — the one their current website
// actually calls — works fine and returns much richer data: real
// sector/industry classification, P/E, market cap, delivery %, day range.
async function fetchNseQuote(symbol) {
  const res = await fetchNseJson(
    `/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=${encodeURIComponent(symbol)}`,
    `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
  );
  const q = res?.equityResponse?.[0];
  if (!q) return null;

  return {
    companyName: q.metaData?.companyName ?? null,
    isin: q.metaData?.isinCode ?? null,
    open: q.metaData?.open ?? null,
    dayHigh: q.metaData?.dayHigh ?? null,
    dayLow: q.metaData?.dayLow ?? null,
    previousClose: q.metaData?.previousClose ?? null,
    sector: q.secInfo?.sector ?? null,
    industry: q.secInfo?.industryInfo ?? null,
    peRatio: q.secInfo?.pdSymbolPe ? Number(q.secInfo.pdSymbolPe) : null,
    listingDate: q.secInfo?.listingDate ?? null,
    volume: q.tradeInfo?.totalTradedVolume ?? null,
    deliveryPct: q.tradeInfo?.deliveryToTradedQuantity ?? null,
    marketCapCr: q.tradeInfo?.totalMarketCap ? +(q.tradeInfo.totalMarketCap / 1e7).toFixed(2) : null,
  };
}

function computeMaxPain(strikes) {
  let bestStrike = null;
  let minPain = Infinity;
  for (const candidate of strikes) {
    let totalPain = 0;
    for (const s of strikes) {
      if (candidate.strike > s.strike) totalPain += (candidate.strike - s.strike) * s.callOi;
      if (candidate.strike < s.strike) totalPain += (s.strike - candidate.strike) * s.putOi;
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      bestStrike = candidate.strike;
    }
  }
  return bestStrike;
}

// Not every stock has listed F&O contracts — this returns null (not a
// thrown error) for ones that don't, so the stock detail page can just omit
// the section rather than treat it as a fetch failure.
async function fetchStockOptionChain(symbol) {
  const contractInfo = await fetchNseJson(
    `/api/option-chain-contract-info?symbol=${encodeURIComponent(symbol)}`,
    REFERER,
  ).catch(() => null);
  const expiry = contractInfo?.expiryDates?.[0];
  if (!expiry) return null;

  const res = await fetchNseJson(
    `/api/option-chain-v3?type=Equity&symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`,
    REFERER,
  ).catch(() => null);
  const rows = res?.records?.data || [];
  if (rows.length === 0) return null;

  const strikes = rows
    .filter((r) => r.CE || r.PE)
    .map((r) => ({
      strike: r.strikePrice,
      callOi: r.CE?.openInterest || 0,
      putOi: r.PE?.openInterest || 0,
    }));
  const totalCallOi = strikes.reduce((sum, s) => sum + s.callOi, 0);
  const totalPutOi = strikes.reduce((sum, s) => sum + s.putOi, 0);

  return {
    expiry,
    pcr: totalCallOi > 0 ? +(totalPutOi / totalCallOi).toFixed(2) : null,
    maxPain: strikes.length > 0 ? computeMaxPain(strikes) : null,
    topCallOi: [...strikes].sort((a, b) => b.callOi - a.callOi).slice(0, 5).map((s) => ({ strike: s.strike, oi: s.callOi })),
    topPutOi: [...strikes].sort((a, b) => b.putOi - a.putOi).slice(0, 5).map((s) => ({ strike: s.strike, oi: s.putOi })),
  };
}

// Per-symbol cache with a short TTL — this endpoint fans out to a Yahoo
// history fetch plus two NSE option-chain calls per request, which is too
// slow/heavy to redo on every page view of the same stock.
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const detailCache = new Map();

export async function getStockDetail(rawSymbol) {
  const symbol = rawSymbol.toUpperCase();
  const cached = detailCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < DETAIL_CACHE_TTL_MS) return cached.data;

  const data = await fetchStockDetailFresh(symbol);
  detailCache.set(symbol, { fetchedAt: Date.now(), data });
  return data;
}

async function fetchStockDetailFresh(symbol) {
  const known = ALL_STOCKS.find((s) => s.symbol === symbol);

  // Prefer the already-polled price cache (covers our curated ~109-stock
  // universe); fall back to a fresh single Yahoo fetch for anything outside
  // it — e.g. a stock that shows up in "most active" or gainers/losers but
  // isn't one we track continuously.
  const cachedPrice = getCachedPrice(symbol);
  const liveQuote = cachedPrice ? null : await fetchYahooQuote(`${symbol}.NS`).catch(() => null);

  const [history, optionChain, nseQuote] = await Promise.all([
    fetchYahooHistoricalSeries(`${symbol}.NS`, "6mo").catch(() => []),
    fetchStockOptionChain(symbol).catch(() => null),
    fetchNseQuote(symbol).catch(() => null),
  ]);

  return {
    symbol,
    name: nseQuote?.companyName || known?.name || liveQuote?.name || symbol,
    // NSE's own sector/industry classification is more precise than our
    // curated 33-category list when it's available.
    sector: nseQuote?.sector || known?.sector || null,
    industry: nseQuote?.industry ?? null,
    price: cachedPrice?.price ?? liveQuote?.price ?? null,
    changePct: cachedPrice?.changePct ?? liveQuote?.changePct ?? null,
    fiftyTwoWeekHigh: cachedPrice?.fiftyTwoWeekHigh ?? liveQuote?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: cachedPrice?.fiftyTwoWeekLow ?? liveQuote?.fiftyTwoWeekLow ?? null,
    open: nseQuote?.open ?? null,
    dayHigh: nseQuote?.dayHigh ?? null,
    dayLow: nseQuote?.dayLow ?? null,
    previousClose: nseQuote?.previousClose ?? null,
    volume: nseQuote?.volume ?? null,
    deliveryPct: nseQuote?.deliveryPct ?? null,
    marketCapCr: nseQuote?.marketCapCr ?? null,
    peRatio: nseQuote?.peRatio ?? null,
    isin: nseQuote?.isin ?? null,
    listingDate: nseQuote?.listingDate ?? null,
    history,
    optionChain,
  };
}
