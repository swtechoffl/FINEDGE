import { YAHOO_BROWSER_UA } from "./yahoo.js";

// NSE publishes these as plain daily CSV archives (no cookie handshake
// needed — unlike the dynamic /api endpoints, these are static files on a
// content CDN). Format: "DDMMYYYY". We don't know in advance which of the
// last few calendar days were actual trading days, so we walk backward
// until a file is found.
function ddmmyyyy(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

async function fetchCsvForRecentTradingDay(urlPrefix, startFrom = new Date(), maxDaysBack = 7) {
  for (let i = 0; i < maxDaysBack; i++) {
    const d = new Date(startFrom);
    d.setDate(d.getDate() - i);
    const url = `${urlPrefix}${ddmmyyyy(d)}.csv`;
    const res = await fetch(url, { headers: { "User-Agent": YAHOO_BROWSER_UA } });
    if (res.ok) {
      const text = await res.text();
      if (text && !text.trim().startsWith("<")) return { text, date: d };
    }
  }
  throw new Error(`no recent trading-day file found under ${urlPrefix}`);
}

// Parses the NSE participant OI/volume CSV shape:
//   line 0: title row (ignored)
//   line 1: header (has stray whitespace in some column names)
//   lines 2+: "Client Type, ...columns..., Total Long Contracts, Total Short Contracts"
// Only the 4 participant categories (Client, DII, FII, Pro) are kept — the
// TOTAL row is a redundant sum, not a category.
function parseParticipantCsv(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 3) throw new Error("unexpected participant CSV shape");
  const header = lines[1].split(",").map((h) => h.trim());
  const longIdx = header.findIndex((h) => h.startsWith("Total Long"));
  const shortIdx = header.findIndex((h) => h.startsWith("Total Short"));
  if (longIdx === -1 || shortIdx === -1) throw new Error("could not locate total columns in participant CSV");

  const rows = {};
  for (const line of lines.slice(2)) {
    const cols = line.split(",").map((c) => c.trim());
    const category = cols[0];
    if (!["Client", "DII", "FII", "Pro"].includes(category)) continue;
    rows[category] = {
      totalLong: Number(cols[longIdx]) || 0,
      totalShort: Number(cols[shortIdx]) || 0,
    };
  }
  return rows;
}

async function fetchParticipantSeries(urlPrefix) {
  const latest = await fetchCsvForRecentTradingDay(urlPrefix);
  const latestRows = parseParticipantCsv(latest.text);

  // A second, earlier file for day-over-day change — search starting the
  // day before whatever the latest file's actual date turned out to be.
  let priorRows = null;
  try {
    const dayBeforeLatest = new Date(latest.date);
    dayBeforeLatest.setDate(dayBeforeLatest.getDate() - 1);
    const prior = await fetchCsvForRecentTradingDay(urlPrefix, dayBeforeLatest);
    priorRows = parseParticipantCsv(prior.text);
  } catch {
    priorRows = null; // change figures just come back null — still show today's snapshot
  }

  const categories = ["FII", "DII", "Pro", "Client"];
  const result = categories.map((category) => {
    const today = latestRows[category] || { totalLong: 0, totalShort: 0 };
    const netOi = today.totalLong - today.totalShort;
    const prior = priorRows?.[category];
    const priorNetOi = prior ? prior.totalLong - prior.totalShort : null;
    return {
      category,
      totalLong: today.totalLong,
      totalShort: today.totalShort,
      netOi,
      netOiChange: priorNetOi !== null ? netOi - priorNetOi : null,
    };
  });

  return { date: latest.date.toISOString().slice(0, 10), rows: result };
}

export async function fetchParticipantOi() {
  return fetchParticipantSeries("https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_");
}

export async function fetchParticipantVolume() {
  return fetchParticipantSeries("https://nsearchives.nseindia.com/content/nsccl/fao_participant_vol_");
}
