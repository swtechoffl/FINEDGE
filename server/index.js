import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { PUBLISHER_GROUPS } from "./feeds.js";
import { classify, resolveTicker, heuristicAnalysis } from "./classify.js";
import { generateNewsAnalysis } from "./groq.js";
import { getPrices, startPricePolling } from "./prices.js";
import { getPremarket, startPremarketPolling } from "./premarket.js";
import { getMarketMovers, startMarketMoversPolling } from "./marketMovers.js";
import { getMarketInternals, startMarketInternalsPolling } from "./marketInternals.js";
import { getStockDetail } from "./stockDetail.js";

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

  const tickers = matchedTickers.map((t) => {
    const p = resolveTicker(t.symbol);
    return { symbol: t.symbol, changePct: p.changePct, commentCount: 0 };
  });

  const affectedTickers = matchedTickers.map((t) => {
    const p = resolveTicker(t.symbol);
    return { symbol: t.symbol, screensCount: p.screensCount, price: p.price, changePct: p.changePct };
  });

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
    const data = await getPremarket();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load premarket data", detail: String(err) });
  }
});

app.get("/api/market-movers", async (req, res) => {
  try {
    const data = await getMarketMovers();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load market movers", detail: String(err) });
  }
});

app.get("/api/market-internals", async (req, res) => {
  try {
    const data = await getMarketInternals();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load market internals", detail: String(err) });
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
    refreshCache()
      .then((c) => console.log(`[stoqtrade.ai] warm cache loaded: ${c.items.length} items`))
      .catch((err) => console.error("[stoqtrade.ai] initial cache warm failed:", err.message));
    startPremarketPolling();
    // Market movers' OI-buildup/52-week classification reads the price cache
    // synchronously — wait for its first warm-up so the initial pass isn't
    // silently empty.
    await startPricePolling();
    startMarketMoversPolling();
    startMarketInternalsPolling();
  });
}

export default app;
