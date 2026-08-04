import { fetchNseJson } from "./nse.js";

function toDdMmYyyy(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function parseNseDealDate(d) {
  if (!d) return null;
  const parsed = new Date(d.replace(/-/g, " "));
  return isNaN(+parsed) ? null : parsed;
}

const LOOKBACK_DAYS = 10;
const REFERER = "https://www.nseindia.com/report-detail/display-bulk-and-block-deals";

async function fetchDeals(optionType) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  const res = await fetchNseJson(
    `/api/historicalOR/bulk-block-short-deals?optionType=${optionType}&from=${toDdMmYyyy(from)}&to=${toDdMmYyyy(to)}`,
    REFERER,
  );
  const rows = Array.isArray(res?.data) ? res.data : [];
  // NSE doesn't guarantee any particular row order across the lookback
  // window (verified live: rows for a single day weren't even grouped
  // together) — sort newest-first so slicing to the top 20 below actually
  // surfaces the most recent deals instead of an arbitrary mix.
  return rows
    .map((r) => ({ ...r, _date: parseNseDealDate(r.BD_DT_DATE) }))
    .sort((a, b) => (b._date?.getTime() ?? 0) - (a._date?.getTime() ?? 0));
}

export async function fetchBulkDeals() {
  const rows = await fetchDeals("bulk_deals");
  return rows
    .slice(0, 20)
    .map((r) => ({
      date: r.BD_DT_DATE,
      symbol: r.BD_SYMBOL,
      company: r.BD_SCRIP_NAME,
      client: r.BD_CLIENT_NAME,
      buySell: r.BD_BUY_SELL,
      quantity: Number(r.BD_QTY_TRD) || 0,
      price: Number(r.BD_TP_WATP) || 0,
    }));
}

export async function fetchBlockDeals() {
  const rows = await fetchDeals("block_deals");
  return rows
    .slice(0, 20)
    .map((r) => ({
      date: r.BD_DT_DATE,
      symbol: r.BD_SYMBOL,
      company: r.BD_SCRIP_NAME,
      client: r.BD_CLIENT_NAME,
      buySell: r.BD_BUY_SELL,
      quantity: Number(r.BD_QTY_TRD) || 0,
      price: Number(r.BD_TP_WATP) || 0,
    }));
}

export async function fetchShortSelling() {
  const rows = await fetchDeals("short_selling");
  // The short-selling report has no per-row date-descending guarantee from
  // NSE and no per-row price/value — just symbol + quantity for the day —
  // so aggregate by symbol across the lookback window and rank by total.
  const bySymbol = new Map();
  for (const r of rows) {
    const qty = Number(r.SS_QTY) || 0;
    const existing = bySymbol.get(r.SS_SYMBOL);
    if (existing) existing.quantity += qty;
    else bySymbol.set(r.SS_SYMBOL, { symbol: r.SS_SYMBOL, company: r.SS_NAME, quantity: qty });
  }
  return Array.from(bySymbol.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
}
