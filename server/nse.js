import { YAHOO_BROWSER_UA } from "./yahoo.js";

// NSE's own API needs a session cookie from a normal page visit first — same
// as a browser would get just by loading nseindia.com before the report
// page's script calls its own API. Cold-calling the API (no cookie) returns
// a generic "Resource not found". Shared by every NSE-backed feature
// (FII/DII, top gainers/losers, OI spurts) since they all need this handshake.
export async function fetchNseJson(path, referer) {
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

  const res = await fetch(`https://www.nseindia.com${path}`, {
    headers: {
      "User-Agent": YAHOO_BROWSER_UA,
      Accept: "application/json",
      Referer: referer,
      Cookie: cookieHeader,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// NSE's own official index feed — "last"/"variation"/"percentChange" come
// straight from the exchange, not derived from a previous-close figure we
// have to trust separately (see fetchReliableChangePct in yahoo.js for why
// that trust was misplaced for some symbols).
export async function fetchNseAllIndices() {
  const data = await fetchNseJson("/api/allIndices", "https://www.nseindia.com/market-data/live-market-indices");
  return Array.isArray(data?.data) ? data.data : [];
}
