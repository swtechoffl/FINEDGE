import { fetchParticipantOi, fetchParticipantVolume } from "./participantOi.js";
import { fetchBulkDeals, fetchBlockDeals, fetchShortSelling } from "./deals.js";
import { fetchIndexOptionChains } from "./optionChain.js";
import { fetchFnoBan } from "./fnoBan.js";

// These are all daily-granularity datasets (participant OI/volume and deals
// only publish once per trading day; option chain OI moves faster but not
// fast enough to need minute-level refresh here) — a coarse poll is plenty.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

let cache = {
  fetchedAt: 0,
  participantOi: null,
  participantVolume: null,
  bulkDeals: [],
  blockDeals: [],
  shortSelling: [],
  optionChains: [],
  fnoBan: null,
};
let inFlight = null;

async function refreshInternals() {
  const [poiResult, pvolResult, bulkResult, blockResult, shortResult, ocResult, fnoBanResult] = await Promise.all([
    fetchParticipantOi().catch((err) => ({ error: err.message })),
    fetchParticipantVolume().catch((err) => ({ error: err.message })),
    fetchBulkDeals().catch(() => []),
    fetchBlockDeals().catch(() => []),
    fetchShortSelling().catch(() => []),
    fetchIndexOptionChains().catch(() => []),
    fetchFnoBan().catch((err) => ({ error: err.message })),
  ]);

  cache = {
    fetchedAt: Date.now(),
    participantOi: poiResult && !poiResult.error ? poiResult : null,
    participantVolume: pvolResult && !pvolResult.error ? pvolResult : null,
    bulkDeals: Array.isArray(bulkResult) ? bulkResult : [],
    blockDeals: Array.isArray(blockResult) ? blockResult : [],
    shortSelling: Array.isArray(shortResult) ? shortResult : [],
    optionChains: Array.isArray(ocResult) ? ocResult : [],
    fnoBan: fnoBanResult && !fnoBanResult.error ? fnoBanResult : null,
  };
  return cache;
}

export async function getMarketInternals({ force = false } = {}) {
  const isStale = Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;
  if (!isStale && !force) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshInternals().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function summarize(c) {
  return (
    `participantOi=${!!c.participantOi}, participantVolume=${!!c.participantVolume}, ` +
    `bulk=${c.bulkDeals.length}, block=${c.blockDeals.length}, short=${c.shortSelling.length}, ` +
    `optionChains=${c.optionChains.length}, fnoBan=${c.fnoBan?.symbols.length ?? "n/a"}`
  );
}

export function startMarketInternalsPolling() {
  refreshInternals()
    .then((c) => console.log(`[market-internals] warm cache loaded (${summarize(c)})`))
    .catch((err) => console.error("[market-internals] initial fetch failed:", err.message));
  setInterval(() => {
    refreshInternals()
      .then((c) => console.log(`[market-internals] refreshed (${summarize(c)})`))
      .catch((err) => console.error("[market-internals] refresh failed:", err.message));
  }, REFRESH_INTERVAL_MS);
}
