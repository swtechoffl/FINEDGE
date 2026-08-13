import https from "node:https";
import zlib from "node:zlib";

// BSE's own site-search endpoint — same one bseindia.com's search box calls.
// Returns an HTML fragment (not JSON, despite the name), one <li> per match,
// each holding "SYMBOL&nbsp;&nbsp;&nbsp;ISIN&nbsp;&nbsp;&nbsp;SCRIP_CODE" —
// see BSE_ENTRY_RE below. No auth/cookie handshake needed (unlike NSE).
const BSE_SEARCH_URL = "https://api.bseindia.com/Msource/1D/getQouteSearch.aspx";

// Matches one search result's "SYMBOL   ISIN   CODE" span content, tolerant
// of the <strong> tags BSE wraps around whichever substring matched the
// search text (can land in the middle of the symbol, as in a "TCS" search
// matching "WSTCSTPAPR").
const BSE_ENTRY_RE = /<span>((?:(?!<\/span>).)*)<\/span>/g;

// Text search ranks by substring match, not relevance — searching "TCS"
// can return "WSTCSTPAPR" before the actual TCS — so this fetches all
// candidates for the symbol and picks the one whose ISIN matches exactly,
// since ISIN is the same across NSE and BSE for a given company and we
// already have it from NSE's own quote (see stockDetail.js). Returns null
// (not a thrown error) on any failure — BSE code is a nice-to-have
// enrichment, not something worth failing the whole stock lookup over.
export async function fetchBseCode(symbol, isin) {
  if (!isin) return null;
  try {
    const res = await fetch(`${BSE_SEARCH_URL}?Type=EQ&text=${encodeURIComponent(symbol)}&flag=site`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.bseindia.com/",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    for (const match of html.matchAll(BSE_ENTRY_RE)) {
      const cleaned = match[1].replace(/<\/?strong>/g, "");
      const [entrySymbol, entryIsin, entryCode] = cleaned.split(/(?:&nbsp;)+/).map((s) => s.trim());
      if (entryIsin === isin && entryCode) return entryCode;
    }
    return null;
  } catch {
    return null;
  }
}

// BSE sends a header on this endpoint with stray whitespace that Node's
// built-in (undici) fetch() rejects outright as an HTTP/1.1 protocol
// violation — verified live (HTTPParserError: "Unexpected whitespace after
// header value"), even though the response itself is well-formed, gzip'd
// JSON that curl/browsers parse fine. Talking to https directly with
// insecureHTTPParser sidesteps undici's stricter parser.
function fetchBseRawJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        insecureHTTPParser: true,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.bseindia.com/",
          "Accept-Encoding": "gzip",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const buf = Buffer.concat(chunks);
            const raw = res.headers["content-encoding"] === "gzip" ? zlib.gunzipSync(buf) : buf;
            resolve(JSON.parse(raw.toString()));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// BSE addresses indices by the same "scripcode" param as equities on this
// endpoint — SENSEX is scripcode 1. Returns the exchange's own live
// LTP/change/%change for the Sensex, not a value derived from some other
// feed's previous-close.
export async function fetchBseSensex() {
  const data = await fetchBseRawJson(
    "https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=1&seriesid=",
  );
  const rate = data?.CurrRate;
  const price = rate ? parseFloat(rate.LTP) : NaN;
  const change = rate ? parseFloat(rate.Chg) : NaN;
  const changePct = rate ? parseFloat(rate.PcChg) : NaN;
  if (Number.isNaN(price) || Number.isNaN(change) || Number.isNaN(changePct)) {
    throw new Error("missing Sensex quote fields");
  }
  return { price, change, changePct };
}
