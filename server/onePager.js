import { fetchYahooHistoricalSeries } from "./yahoo.js";
import { getStockDetail } from "./stockDetail.js";
import { generateOnePagerNarrative } from "./groq.js";

// One-year daily closes for the stock and Nifty 50, normalized to a common
// base (100 at the first shared trading day) so they plot on the same axis
// regardless of absolute price level — this is what the one-pager's
// "stock vs Nifty 50" chart is built from. getStockDetail's own `history`
// is only 6mo, so this fetches its own 1y series rather than reusing it.
async function getChartSeries(symbol) {
  const [stock, nifty] = await Promise.all([
    fetchYahooHistoricalSeries(`${symbol}.NS`, "1y").catch(() => []),
    fetchYahooHistoricalSeries("^NSEI", "1y").catch(() => []),
  ]);
  if (stock.length === 0 || nifty.length === 0) return { stock: [], nifty: [] };

  const niftyByDate = new Map(nifty.map((b) => [b.date, b.close]));
  const firstSharedDate = stock.find((b) => niftyByDate.has(b.date))?.date;
  if (!firstSharedDate) return { stock: [], nifty: [] };

  const stockBase = stock.find((b) => b.date === firstSharedDate).close;
  const niftyBase = niftyByDate.get(firstSharedDate);

  const stockNorm = stock
    .filter((b) => b.date >= firstSharedDate)
    .map((b) => ({ date: b.date, value: +((b.close / stockBase) * 100).toFixed(2) }));
  const niftyNorm = nifty
    .filter((b) => b.date >= firstSharedDate && niftyByDate.has(b.date))
    .map((b) => ({ date: b.date, value: +((niftyByDate.get(b.date) / niftyBase) * 100).toFixed(2) }));

  return { stock: stockNorm, nifty: niftyNorm };
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatReportDate(date) {
  const day = ordinal(date.getDate());
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${day} ${month} ${date.getFullYear()}`;
}

// Ties together the live NSE/Yahoo facts (free), the analyst's own manual
// inputs (rating, target price, 3yr financials — nothing free covers these),
// and an AI-drafted narrative (Groq, no search — see groq.js) into the full
// one-pager payload the client renders and exports.
export async function generateOnePager(symbol, manual) {
  const detail = await getStockDetail(symbol);
  const chart = await getChartSeries(symbol);

  const cmp = detail.price;
  const targetPrice = manual.targetPrice ? Number(manual.targetPrice) : null;
  const upsidePct = cmp && targetPrice ? +(((targetPrice - cmp) / cmp) * 100).toFixed(1) : null;

  // Cross-check called out explicitly in the template: market cap should
  // equal CMP × (equity ÷ face value) — i.e. CMP × share count. Both sides
  // come from the same NSE payload, so this mostly catches a stale cache
  // read between the two fields rather than a real data error, but it's
  // cheap to verify and the template asks for it to be flagged if it's off.
  let equityCheck = null;
  if (cmp && detail.equityCr && detail.faceValue) {
    // equityCr is paid-up capital in ₹cr; equityCr×1e7/faceValue recovers
    // the share count, and CMP × shares should reproduce reported market cap.
    const shares = (detail.equityCr * 1e7) / detail.faceValue;
    const impliedMarketCapCr = +((cmp * shares) / 1e7).toFixed(2);
    const diffPct = detail.marketCapCr
      ? Math.abs((impliedMarketCapCr - detail.marketCapCr) / detail.marketCapCr) * 100
      : null;
    equityCheck = {
      impliedMarketCapCr,
      reportedMarketCapCr: detail.marketCapCr,
      reconciles: diffPct !== null && diffPct < 1,
    };
  }

  // NSE's shareholding feed only carries Promoter vs Public — real and free,
  // but not the FII/DII split real one-pagers usually show. If the analyst
  // supplied FII/DII (optional, no free source for that split), carve those
  // out of the Public slice; otherwise the pie just shows Promoter/Public.
  let shareholding = null;
  if (detail.shareholding) {
    const { promoterPct, publicPct, asOfDate } = detail.shareholding;
    const fiiPct = manual.fiiPct ? Number(manual.fiiPct) : null;
    const diiPct = manual.diiPct ? Number(manual.diiPct) : null;
    const slices = [{ label: "Promoter", pct: promoterPct }];
    if (fiiPct != null && diiPct != null && fiiPct + diiPct <= publicPct) {
      slices.push({ label: "FII", pct: fiiPct }, { label: "DII", pct: diiPct });
      const otherPublic = +(publicPct - fiiPct - diiPct).toFixed(2);
      if (otherPublic > 0.05) slices.push({ label: "Public / Others", pct: otherPublic });
    } else {
      slices.push({ label: "Public / Others", pct: publicPct });
    }
    shareholding = { asOfDate, slices };
  } else if (manual.aiShareholding && typeof manual.aiShareholding.promoterPct === "number") {
    // NSE has nothing for this stock at all (common for smaller/newer
    // listings) — fall back to the AI-researched breakdown from the "Paste
    // from Claude" flow. Clearly labeled as such since it isn't verified
    // against a live exchange feed the way the branch above is.
    const { promoterPct, fiiPct, diiPct, publicPct, asOfDate } = manual.aiShareholding;
    const slices = [{ label: "Promoter", pct: promoterPct }];
    if (typeof fiiPct === "number") slices.push({ label: "FII", pct: fiiPct });
    if (typeof diiPct === "number") slices.push({ label: "DII", pct: diiPct });
    const named = slices.reduce((sum, s) => sum + s.pct, 0);
    const rest = typeof publicPct === "number" ? publicPct : Math.max(0, +(100 - named).toFixed(2));
    if (rest > 0.05) slices.push({ label: "Public / Others", pct: rest });
    shareholding = { asOfDate: `${asOfDate || "Unverified"} · AI-sourced, not NSE-verified`, slices };
  }

  const facts = {
    companyName: detail.name,
    symbol: detail.symbol,
    isin: detail.isin,
    // Manual entry wins if the analyst typed one in (e.g. to correct a bad
    // match); otherwise fall back to the free live lookup (see bse.js).
    bseCode: manual.bseCode || detail.bseCode || null,
    sector: detail.sector,
    exchange: manual.exchange || "NSE",
    marketCapCr: detail.marketCapCr,
    cmp,
    faceValue: detail.faceValue,
    equityCr: detail.equityCr,
    bookValue: manual.bookValue ? Number(manual.bookValue) : null,
    epsTtm: detail.epsTtm,
    peTtm: detail.peRatio,
    fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: detail.fiftyTwoWeekLow,
    equityCheck,
    shareholding,
  };

  // If the client already parsed a narrative out of a pasted external AI
  // response (see OnePagerPage's "Paste from Claude" toggle), use it as-is
  // and skip the Groq call — this is the whole point of that path, since
  // Groq's free-tier quota is what pushed the paste flow to exist.
  const narrative = manual.narrative
    ? manual.narrative
    : await generateOnePagerNarrative({
        facts,
        rating: manual.rating,
        targetPrice,
        upsidePct,
        valuationMethod: manual.valuationMethod,
        timeHorizon: manual.timeHorizon,
        threeYearFinancials: manual.threeYearFinancials,
        recentDevelopments: manual.recentDevelopments,
      });

  return {
    reportDateLabel: formatReportDate(new Date()),
    facts,
    rating: manual.rating,
    targetPrice,
    upsidePct,
    valuationMethod: manual.valuationMethod,
    timeHorizon: manual.timeHorizon,
    threeYearFinancials: manual.threeYearFinancials,
    chart,
    narrative,
  };
}
