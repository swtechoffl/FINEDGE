import { fetchNseJson } from "./nse.js";

const REFERER = "https://www.nseindia.com/option-chain";

async function fetchNearestExpiry(symbol) {
  const res = await fetchNseJson(`/api/option-chain-contract-info?symbol=${symbol}`, REFERER);
  const expiry = res?.expiryDates?.[0];
  if (!expiry) throw new Error(`no expiry dates returned for ${symbol}`);
  return expiry;
}

// Standard "max pain" heuristic: for each candidate settlement strike, sum
// what option WRITERS would have to pay out across every other strike if
// the underlying settled there, then pick the strike that minimizes that —
// the settlement price at which option writers collectively lose the least.
// A widely-watched (though not rigorously predictive) F&O positioning read.
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

async function fetchOptionChainSummary(symbol) {
  const expiry = await fetchNearestExpiry(symbol);
  const res = await fetchNseJson(
    `/api/option-chain-v3?type=Indices&symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`,
    REFERER,
  );
  const rows = res?.records?.data || [];
  const strikes = rows
    .filter((r) => r.CE || r.PE)
    .map((r) => ({
      strike: r.strikePrice,
      callOi: r.CE?.openInterest || 0,
      putOi: r.PE?.openInterest || 0,
      callOiChange: r.CE?.changeinOpenInterest || 0,
      putOiChange: r.PE?.changeinOpenInterest || 0,
    }));

  const totalCallOi = strikes.reduce((sum, s) => sum + s.callOi, 0);
  const totalPutOi = strikes.reduce((sum, s) => sum + s.putOi, 0);
  const pcr = totalCallOi > 0 ? +(totalPutOi / totalCallOi).toFixed(2) : null;
  const maxPain = strikes.length > 0 ? computeMaxPain(strikes) : null;

  const byCallOi = [...strikes].sort((a, b) => b.callOi - a.callOi);
  const byPutOi = [...strikes].sort((a, b) => b.putOi - a.putOi);

  return {
    symbol,
    expiry,
    underlyingValue: res?.records?.underlyingValue ?? null,
    totalCallOi,
    totalPutOi,
    pcr,
    maxPain,
    // Highest Call OI strikes read as resistance, highest Put OI as support
    // — the concentration of option writers betting the underlying stays
    // on one side of that strike.
    topCallOi: byCallOi.slice(0, 5).map((s) => ({ strike: s.strike, oi: s.callOi })),
    topPutOi: byPutOi.slice(0, 5).map((s) => ({ strike: s.strike, oi: s.putOi })),
  };
}

export async function fetchIndexOptionChains() {
  const results = await Promise.all(
    ["NIFTY", "BANKNIFTY"].map((symbol) =>
      fetchOptionChainSummary(symbol).catch((err) => ({ symbol, error: err.message })),
    ),
  );
  return results.filter((r) => !r.error);
}
