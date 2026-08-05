import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { PUBLISHER_GROUPS } from "./feeds.js";
import { classify, resolveTicker, heuristicAnalysis } from "./classify.js";
import { generateNewsAnalysis, generateResearchReport } from "./groq.js";
import { getPrices, startPricePolling } from "./prices.js";
import { getPremarket, startPremarketPolling } from "./premarket.js";
import { getMarketMovers, startMarketMoversPolling } from "./marketMovers.js";
import { getMarketInternals, startMarketInternalsPolling } from "./marketInternals.js";
import { getStockDetail } from "./stockDetail.js";
import { generateOnePager } from "./onePager.js";
import { captureAllPosters } from "./posterScreenshots.js";
import { captureReportPdf, REPORT_CAPTURE_CONFIG } from "./reportScreenshots.js";
import { sendTelegramPosterAlbum, sendTelegramDocument } from "./telegram.js";

// Local dev / a plain Node host reads GROQ_API_KEY from .env; on Vercel (or
// any platform that injects env vars directly) there's no .env file to
// load, which is fine — process.env is already populated by the platform.
try {
  process.loadEnvFile();
} catch {
  // no .env file present — expected in production
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5175;
const CACHE_TTL_MS = 3 * 60 * 1000; // matches the ~2-5min poller cadence documented for the pipeline

const parser = new Parser({
  timeout: 10_000,
  headers: {
    // Some publishers' WAFs (Akamai etc.) block obvious bot UAs — a normal
    // browser UA gets through without misrepresenting request volume/intent.
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml,application/xml,text/xml,*/*",
  },
});

let cache = { fetchedAt: 0, items: [], feedStatus: [] };
let inFlight = null;

// Real AI analysis (Groq) is generated once per article and cached forever
// keyed by article id — the feed re-fetches the same 200-ish items on every
// 3-min refresh, and an article's own content never changes, so there's no
// reason to ever regenerate. Only high/moderate-impact articles get a real
// call at all; low/none-impact ones keep the instant heuristic blurb (not
// worth spending free-tier quota interpreting stories that barely matter).
//
// This runs as a paced background task, deliberately NOT awaited by
// refreshCache() — Groq's free tier caps at 30 requests/min, and a cold
// cache can have 40-50 high-impact articles needing a first analysis at
// once. Awaiting that inline would make a user's request wait over a
// minute; instead we return the heuristic text immediately and patch each
// article's `aiAnalysis` in place as its real analysis finishes, one call
// every ~2.2s (comfortably under the RPM cap) — same object references as
// what's sitting in `cache.items`, so the change is visible immediately
// without waiting for the next full refresh cycle.
const aiAnalysisCache = new Map();
const AI_ANALYSIS_MAX_PER_CYCLE = 25;
const AI_ANALYSIS_PACE_MS = 2200;
let aiEnrichmentRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enrichWithAiAnalysisInBackground(items) {
  if (!process.env.GROQ_API_KEY || aiEnrichmentRunning) return;
  const candidates = items
    .filter((item) => (item.impact === "high" || item.impact === "moderate") && !aiAnalysisCache.has(item.id))
    // High-impact articles get priority so they're never stuck behind a
    // backlog of moderate ones on a cold cache.
    .sort((a, b) => (a.impact === b.impact ? 0 : a.impact === "high" ? -1 : 1))
    .slice(0, AI_ANALYSIS_MAX_PER_CYCLE);
  if (candidates.length === 0) return;

  aiEnrichmentRunning = true;
  (async () => {
    for (const item of candidates) {
      try {
        const text = await generateNewsAnalysis(item.headline, item.summary);
        aiAnalysisCache.set(item.id, text);
        item.aiAnalysis = text;
        item.aiAnalysisSource = "ai";
      } catch (err) {
        // Rate limit or transient error — this article keeps its heuristic
        // blurb for now; it's still uncached, so a later cycle retries it.
        console.error(`[ai-analysis] failed for ${item.id}:`, err.message);
      }
      await sleep(AI_ANALYSIS_PACE_MS);
    }
  })().finally(() => {
    aiEnrichmentRunning = false;
  });
}

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

// Some source feeds double-escape ampersands (e.g. "&amp;amp;"), which
// XML parsing only unwraps once — leaving a literal "&amp;" in the title.
// Re-run entity decoding on the parsed text to clean up any leftovers.
function decodeEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+\d*);/g, (m, name) => HTML_ENTITIES[name] ?? m);
}

function stripHtml(html) {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
}

function truncate(text, max = 320) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

function makeId(source, item) {
  const base = item.guid || item.link || `${source}-${item.title}-${item.pubDate}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `news-${h}`;
}

function normalizeItem(source, item, sectionLabel) {
  const headline = decodeEntities((item.title || "").trim());
  const rawSummary = item.contentSnippet || item.summary || item.content || "";
  const summary = truncate(stripHtml(rawSummary));
  const text = `${headline} ${summary}`;

  const { signal, impact, category, matchedTickers, bullHits, bearHits } = classify(text, { sectionLabel });

  // Only show a ticker chip when we actually have a real live price for it —
  // no fabricated placeholder price/% presented as if it were real data.
  const pricedTickers = matchedTickers
    .map((t) => ({ symbol: t.symbol, p: resolveTicker(t.symbol) }))
    .filter(({ p }) => p.isLivePrice);

  const tickers = pricedTickers.map(({ symbol, p }) => ({ symbol, changePct: p.changePct, commentCount: 0 }));

  const affectedTickers = pricedTickers.map(({ symbol, p }) => ({
    symbol,
    screensCount: p.screensCount,
    price: p.price,
    changePct: p.changePct,
  }));

  let timestamp;
  const parsed = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null;
  timestamp = parsed && !isNaN(+parsed) ? parsed.toISOString() : new Date().toISOString();

  return {
    id: makeId(source, item),
    timestamp,
    category,
    source,
    headline: headline || "(untitled)",
    summary: summary || "No summary provided by the source feed.",
    signal,
    impact,
    tickers,
    aiAnalysis: heuristicAnalysis({ signal, impact, bullHits, bearHits }),
    aiAnalysisSource: "heuristic",
    affectedTickers,
    articleUrl: item.link || "",
    sector: matchedTickers[0]?.sector || "Uncategorized",
  };
}

async function fetchFeed(group, feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).map((item) => normalizeItem(group.name, item, feed.label));
    return { source: group.name, label: feed.label, url: feed.url, status: feed.status, ok: true, count: items.length, items };
  } catch (err) {
    return {
      source: group.name,
      label: feed.label,
      url: feed.url,
      status: feed.status,
      ok: false,
      count: 0,
      items: [],
      error: err && err.message ? err.message : String(err),
    };
  }
}

async function refreshCache() {
  const feedList = PUBLISHER_GROUPS.flatMap((group) => group.feeds.map((feed) => ({ group, feed })));
  const results = await Promise.all(feedList.map(({ group, feed }) => fetchFeed(group, feed)));

  const seen = new Set();
  const items = [];
  for (const result of results) {
    for (const item of result.items) {
      if (seen.has(item.articleUrl || item.id)) continue;
      seen.add(item.articleUrl || item.id);
      items.push(item);
    }
  }
  items.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  const topItems = items.slice(0, 200);

  // Apply whatever's already been generated in a previous cycle's background
  // pass immediately (instant, no API call); kick off the paced background
  // pass for anything still new — deliberately not awaited, see above.
  for (const item of topItems) {
    const aiText = aiAnalysisCache.get(item.id);
    if (aiText) {
      item.aiAnalysis = aiText;
      item.aiAnalysisSource = "ai";
    }
  }
  enrichWithAiAnalysisInBackground(topItems);

  cache = {
    fetchedAt: Date.now(),
    items: topItems,
    feedStatus: results.map(({ items: _items, ...rest }) => rest),
  };
  return cache;
}

async function getCache() {
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (!isStale) return cache;
  if (inFlight) return inFlight;
  inFlight = refreshCache().finally(() => {
    inFlight = null;
  });
  // First-ever request: wait for it. Subsequent stale hits could serve the
  // old cache while refreshing, but keeping this simple/synchronous avoids
  // ever serving an empty feed on cold start.
  return inFlight;
}

const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
// Only the Report Maker route reads a JSON body — everything else uses
// query params or nothing at all. Raised past Express's 100kb default
// since a pasted 5-year financial statement can run long.
app.use(express.json({ limit: "2mb" }));

app.get("/api/news", async (req, res) => {
  try {
    const data = await getCache();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load news", detail: String(err) });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, cachedItems: cache.items.length, fetchedAt: cache.fetchedAt });
});

app.get("/api/prices", async (req, res) => {
  try {
    const data = await getPrices();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load prices", detail: String(err) });
  }
});

app.get("/api/premarket", async (req, res) => {
  try {
    // ?force=1 bypasses the cache's own TTL and hits Yahoo/NSE live — used by
    // a manual "Refresh" click and by "Export PDF" so either one is
    // guaranteed real-time data instead of whatever the background poller
    // last happened to fetch.
    const force = req.query.force === "1" || req.query.force === "true";
    const data = await getPremarket({ force });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load premarket data", detail: String(err) });
  }
});

app.get("/api/market-movers", async (req, res) => {
  try {
    const force = req.query.force === "1" || req.query.force === "true";
    const data = await getMarketMovers({ force });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load market movers", detail: String(err) });
  }
});

app.get("/api/market-internals", async (req, res) => {
  try {
    const force = req.query.force === "1" || req.query.force === "true";
    const data = await getMarketInternals({ force });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load market internals", detail: String(err) });
  }
});

// Serializes the Report Maker form payload into one labeled text block for
// the Groq prompt — kept server-side so the prompt format has one source of
// truth regardless of how the client form evolves.
function formatResearchReportInput(body) {
  const h = body.header || {};
  const s = body.snapshot || {};
  const lines = [];
  const add = (label, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") lines.push(`${label}: ${value}`);
  };

  lines.push("=== HEADER & RATING ===");
  add("Company name & ticker", `${h.companyName || ""} (${h.ticker || ""})`);
  add("Report date", h.reportDate);
  add("Sector", h.sector);
  add("CMP", h.cmp);
  add("Target Price", h.targetPrice);
  add("Implied upside/downside", h.upside);
  add("Rating", h.rating);
  add("Rating rationale", h.ratingRationale);
  add("Estimate change", h.estimateChange);
  add("TP change", h.tpChange);
  add("Rating change", h.ratingChange);
  add("Is this a revision to prior estimates", h.isRevision ? "Yes" : "No");

  lines.push("\n=== COMPANY SNAPSHOT ===");
  add("Equity shares outstanding (m)", s.equityShares);
  add("Market cap", s.marketCap);
  add("52-week range", s.week52Range);
  add("1/6/12-month relative performance vs index (%)", s.relativePerformance);
  add("12M average daily traded value", s.avgDailyValue);

  if (body.shareholding) {
    lines.push("\n=== SHAREHOLDING PATTERN (%) ===");
    lines.push(body.shareholding);
  }
  if (body.threeYearFinancials) {
    lines.push("\n=== 3-YEAR FINANCIAL SNAPSHOT (prior actual / current est. / next est.) ===");
    lines.push(body.threeYearFinancials);
  }

  const q = body.quarterly || {};
  lines.push("\n=== QUARTERLY NUMBERS (this quarter vs YoY, vs QoQ, vs estimate) ===");
  add("Revenue — actual", q.revenueActual);
  add("Revenue — estimate", q.revenueEstimate);
  add("Revenue — YoY% / QoQ%", q.revenueGrowth);
  add("Volume / Price / Forex growth split (%)", q.growthSplit);
  add("EBITDA — actual / estimate", q.ebitda);
  add("EBITDA margin — actual, bps YoY change", q.ebitdaMargin);
  add("PAT adjusted — actual / estimate / YoY%", q.patAdjusted);
  add("PAT reported (and adjustment items named)", q.patReported);
  add("Net debt — latest / YoY / QoQ", q.netDebt);
  add("Working capital days movement", q.workingCapitalDays);
  add("CFO — YoY", q.cfo);

  if (body.segments) {
    lines.push("\n=== SEGMENT / GEOGRAPHY REVENUE (with YoY growth) ===");
    lines.push(body.segments);
  }

  const c = body.commentary || {};
  lines.push("\n=== MANAGEMENT COMMENTARY ===");
  add("Outlook & guidance", c.outlookGuidance);
  add("Regional commentary", c.regional);
  add("Business-unit commentary", c.businessUnit);
  add("Product-wise commentary", c.productWise);
  add("Debt & balance sheet commentary", c.debtBalanceSheet);
  add("Other (leadership changes, one-offs, JV/associate investments, geopolitical risk)", c.other);

  const f = body.financials || {};
  lines.push("\n=== FULL FINANCIAL STATEMENTS (5yr historical + 2yr estimate, as pasted) ===");
  if (f.incomeStatement) lines.push(`--- Income Statement ---\n${f.incomeStatement}`);
  if (f.balanceSheet) lines.push(`--- Balance Sheet ---\n${f.balanceSheet}`);
  if (f.ratios) lines.push(`--- Ratios ---\n${f.ratios}`);
  if (f.cashFlow) lines.push(`--- Cash Flow Statement ---\n${f.cashFlow}`);

  if (h.isRevision && body.estimateRevision) {
    lines.push("\n=== CHANGE IN ESTIMATES (old vs new FY estimates) ===");
    lines.push(body.estimateRevision);
  }

  lines.push("\n=== FIRM & COMPLIANCE FACTS (use verbatim for the SEBI disclosures section — do not invent anything beyond this) ===");
  lines.push(body.firmFacts || "[none provided — use [CONFIRM] placeholders throughout the disclosures section]");

  return lines.join("\n");
}

app.post("/api/report-maker/generate", async (req, res) => {
  try {
    const inputText = formatResearchReportInput(req.body || {});
    const report = await generateResearchReport(inputText);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate report", detail: String(err.message || err) });
  }
});

app.get("/api/stock/:symbol", async (req, res) => {
  const { symbol } = req.params;
  if (!/^[A-Za-z0-9&-]{1,20}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol" });
  }
  try {
    const data = await getStockDetail(symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load stock detail", detail: String(err) });
  }
});

app.post("/api/one-pager/generate", async (req, res) => {
  const { symbol, ...manual } = req.body || {};
  if (!symbol || !/^[A-Za-z0-9&-]{1,20}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol" });
  }
  if (manual.narrative) {
    const n = manual.narrative;
    const valid =
      typeof n === "object" &&
      typeof n.companyOverview === "string" &&
      typeof n.investmentRationale === "string" &&
      Array.isArray(n.riskFactors) &&
      typeof n.valuationNote === "string" &&
      typeof n.strategyFit === "string";
    if (!valid) return res.status(400).json({ error: "Invalid pasted narrative" });
  }
  try {
    const onePager = await generateOnePager(symbol, manual);
    res.json(onePager);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate one pager", detail: String(err.message || err) });
  }
});

// Sends each poster set (global market context, stock movers) as its own
// Telegram album with its own caption rather than merging them into one —
// they read as two distinct briefings, and either can be empty on a given
// day (e.g. no IPOs/earnings) independent of the other.
async function deliverTelegramPosters(origin, captionSuffix) {
  const { global, movers } = await captureAllPosters(origin);
  if (global.length === 0 && movers.length === 0) {
    return { sent: false, reason: "no pre-market poster data available yet" };
  }
  const dateLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const sentPosterIds = [];
  if (global.length > 0) {
    await sendTelegramPosterAlbum(global, `Pre-Market Briefing — ${dateLabel}${captionSuffix ?? ""}`);
    sentPosterIds.push(...global.map((p) => p.posterId));
  }
  if (movers.length > 0) {
    await sendTelegramPosterAlbum(movers, `Stocks to Watch — ${dateLabel}${captionSuffix ?? ""}`);
    sentPosterIds.push(...movers.map((p) => p.posterId));
  }
  return { sent: true, posters: sentPosterIds };
}

// Triggered by the Vercel Cron in vercel.json at 03:00 UTC (08:30 IST).
// Vercel signs cron requests with a bearer token matching CRON_SECRET — that
// check is skipped when the var isn't set (local/manual testing) but is
// mandatory in any deployment that configures it, since this endpoint sends
// a real message to a real Telegram chat.
app.get("/api/cron/telegram-posters", async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const origin = `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;
    res.json(await deliverTelegramPosters(origin));
  } catch (err) {
    console.error("[stoqtrade.ai] telegram poster delivery failed:", err);
    res.status(500).json({ error: "Failed to deliver posters", detail: String(err.message || err) });
  }
});

// Manual "Send Now" trigger from the Posters page — same delivery as the
// cron, just operator-initiated instead of scheduled. No CRON_SECRET check:
// this is reachable by anyone who can load the (already-public, unauthed)
// Posters page, same exposure as every other /api route in this app.
app.post("/api/telegram/send-now", async (req, res) => {
  try {
    const origin = `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;
    res.json(await deliverTelegramPosters(origin, " (sent manually)"));
  } catch (err) {
    console.error("[stoqtrade.ai] manual telegram poster send failed:", err);
    res.status(500).json({ error: "Failed to deliver posters", detail: String(err.message || err) });
  }
});

// Renders the full Premarket or Post Market report (2-page PDF: report +
// disclaimer, same as the interactive "Export PDF" button) in a headless
// browser and sends it to Telegram as a document. Shared by the scheduled
// route (n8n) and the manual "Send Now" route below.
async function deliverReportToTelegram(origin, reportKey, captionSuffix) {
  const config = REPORT_CAPTURE_CONFIG[reportKey];
  if (!config) throw new Error(`Unknown report "${reportKey}" — use "premarket" or "postmarket"`);
  const { buffer, filenamePrefix, title } = await captureReportPdf(origin, reportKey);
  const dateStr = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  await sendTelegramDocument(buffer, `${filenamePrefix}-${dateStr}.pdf`, `${title} — ${dateLabel}${captionSuffix ?? ""}`);
  return { sent: true, report: reportKey };
}

// Meant to be called by an external scheduler (e.g. an n8n workflow's HTTP
// Request node) rather than Vercel's own Cron, so it requires the same
// CRON_SECRET bearer token as /api/cron/telegram-posters — this one sends a
// real document to a real Telegram chat and shouldn't be triggerable by
// just knowing the URL.
// Usage: POST /api/telegram/send-report?report=premarket|postmarket
app.post("/api/telegram/send-report", async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!REPORT_CAPTURE_CONFIG[req.query.report]) {
    return res.status(400).json({ error: `Unknown report "${req.query.report}" — use "premarket" or "postmarket"` });
  }
  try {
    const origin = `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;
    res.json(await deliverReportToTelegram(origin, req.query.report));
  } catch (err) {
    console.error(`[stoqtrade.ai] report telegram delivery failed (${req.query.report}):`, err);
    res.status(500).json({ error: "Failed to deliver report", detail: String(err.message || err) });
  }
});

// Manual "Send Now" trigger from the report pages — same delivery as the
// scheduled route above, just operator-initiated instead of scheduled. No
// CRON_SECRET check: this is reachable by anyone who can load the
// (already-public, unauthed) report page, same exposure as
// /api/telegram/send-now for posters.
// Usage: POST /api/telegram/send-report-now?report=premarket|postmarket
app.post("/api/telegram/send-report-now", async (req, res) => {
  if (!REPORT_CAPTURE_CONFIG[req.query.report]) {
    return res.status(400).json({ error: `Unknown report "${req.query.report}" — use "premarket" or "postmarket"` });
  }
  try {
    const origin = `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;
    res.json(await deliverReportToTelegram(origin, req.query.report, " (sent manually)"));
  } catch (err) {
    console.error(`[stoqtrade.ai] manual report telegram send failed (${req.query.report}):`, err);
    res.status(500).json({ error: "Failed to deliver report", detail: String(err.message || err) });
  }
});

const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).end();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// `app.listen()` + setInterval-based background polling only make sense for
// a long-running process (local dev, or a plain Node host like Render/
// Railway). On Vercel each request is a fresh/short-lived serverless
// invocation — there's no persistent process for setInterval to run in, and
// Vercel never calls .listen() itself, it just invokes the exported handler
// directly. The three cache-getter functions (getCache/getPrices/
// getPremarket) already fetch-on-demand when their cache is stale, so the
// app works correctly without the background pollers; they're just a
// same-process latency optimization that's unavailable in that model.
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`[stoqtrade.ai] news API listening on http://localhost:${PORT}`);
    startPremarketPolling();
    // Both the news cache (ticker chips, via resolveTicker) and market
    // movers (OI-buildup/52-week classification) read the price cache
    // synchronously — wait for its first warm-up before either runs so
    // neither's initial pass is silently empty of price data.
    await startPricePolling();
    refreshCache()
      .then((c) => console.log(`[stoqtrade.ai] warm cache loaded: ${c.items.length} items`))
      .catch((err) => console.error("[stoqtrade.ai] initial cache warm failed:", err.message));
    startMarketMoversPolling();
    startMarketInternalsPolling();
  });
}

export default app;
