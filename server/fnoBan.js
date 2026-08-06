import { YAHOO_BROWSER_UA } from "./yahoo.js";

// NSE publishes the day's F&O ban list (securities barred from fresh
// derivatives positions for breaching the market-wide position limit) as a
// small static CSV on its content CDN — always the current trading day's
// list at a fixed URL, no date suffix and no cookie handshake needed (same
// as the participant OI/volume archives in participantOi.js). Format:
//   Securities in Ban For Trade Date DD-MON-YYYY:
//   1,SYMBOL
//   2,SYMBOL
const FNO_BAN_CSV_URL = "https://nsearchives.nseindia.com/content/fo/fo_secban.csv";

function parseTradeDate(titleLine) {
  const m = titleLine.match(/Trade Date\s+(\d{2}-[A-Za-z]{3}-\d{4})/);
  return m ? m[1] : null;
}

export async function fetchFnoBan() {
  const res = await fetch(FNO_BAN_CSV_URL, { headers: { "User-Agent": YAHOO_BROWSER_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) throw new Error("empty F&O ban CSV");

  const date = parseTradeDate(lines[0]);
  const symbols = lines
    .slice(1)
    .map((line) => line.split(",")[1]?.trim())
    .filter(Boolean);

  return { date, symbols };
}
