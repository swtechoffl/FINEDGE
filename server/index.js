import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { PUBLISHER_GROUPS } from "./feeds.js";
import { classify, resolveTicker, heuristicAnalysis } from "./classify.js";
import { getPrices, startPricePolling } from "./prices.js";
import { getPremarket, startPremarketPolling } from "./premarket.js";
import { getMarketMovers, startMarketMoversPolling } from "./marketMovers.js";
import { getMarketInternals, startMarketInternalsPolling } from "./marketInternals.js";

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

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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
  const headline = (item.title || "").trim();
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

  cache = {
    fetchedAt: Date.now(),
    items: items.slice(0, 200),
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
