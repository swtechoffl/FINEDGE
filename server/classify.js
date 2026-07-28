import { ALL_STOCKS } from "./sectors.js";
import { getCachedPrice } from "./prices.js";

// Curated market/macro and industry-level terms used to recognize news that
// is genuinely about the Indian market, the economy, or a specific industry
// even when no single company ticker is named (e.g. "IT sector faces wage
// pressure", "RBI holds repo rate steady") — as opposed to news that just
// happens to land in the feed (sports, entertainment, general world news)
// and shouldn't carry any market impact at all.
const MARKET_KEYWORDS = [
  "sensex", "nifty", "bse", "nse", "stock market", "share price", "shares of",
  "stake in", "ipo", "listing", "mutual fund", "fii", "dii", "brokerage",
  "credit rating", "rating agency", "moody's", "fitch", "crisil", "icra",
  "rbi", "sebi", "repo rate", "monetary policy", "inflation", "wpi", "cpi",
  "fiscal deficit", "union budget", "finance ministry", "rupee", "forex reserves",
  "current account deficit", "trade deficit", "gdp growth",
  "index of industrial production", "core sector", "gst",
];

const INDUSTRY_KEYWORDS = [
  "banking sector", "private bank", "public sector bank", "nbfc", "insurance sector",
  "pharma sector", "pharmaceutical", "it sector", "software services", "telecom sector",
  "telecom operator", "auto sector", "automobile sector", "two-wheeler", "ev sector",
  "electric vehicle", "steel sector", "cement sector", "metals sector", "mining sector",
  "oil & gas", "crude oil", "natural gas", "power sector", "renewable energy",
  "solar energy", "fmcg sector", "consumer goods", "textile sector", "apparel sector",
  "chemicals sector", "fertilizer sector", "agrochemical", "realty sector", "real estate sector",
  "construction sector", "infrastructure sector", "aviation sector", "airline", "shipping sector",
  "logistics sector", "port operator", "defence sector", "aerospace", "capital goods",
  "media sector", "entertainment sector", "gaming sector", "e-commerce", "retail sector",
  "hospital sector", "healthcare sector", "diagnostic chain", "edtech",
];

function matchesKeywordList(lowerText, list) {
  return list.some((k) => lowerText.includes(k));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BULLISH_WORDS = [
  "profit",
  "surge",
  "surges",
  "jump",
  "jumps",
  "rally",
  "rallies",
  "gain",
  "gains",
  "growth",
  "record high",
  "beats estimates",
  "beat estimates",
  "upgrade",
  "upgraded",
  "bullish",
  "strong demand",
  "wins order",
  "order win",
  "expansion",
  "expands",
  "raises guidance",
  "outperform",
  "buyback",
  "bonus share",
  "dividend",
  "stake sale",
  "record profit",
];

const BEARISH_WORDS = [
  "loss",
  "losses",
  "falls",
  "fall",
  "decline",
  "declines",
  "drop",
  "drops",
  "plunge",
  "plunges",
  "probe",
  "fraud",
  "downgrade",
  "downgraded",
  "resigns",
  "resignation",
  "weak demand",
  "miss estimates",
  "missed estimates",
  "warning",
  "crash",
  "penalty",
  "fine",
  "fined",
  "lawsuit",
  "scam",
  "layoff",
  "layoffs",
  "slump",
  "default",
  "downturn",
  "job cuts",
];

const REGULATORY_WORDS = ["sebi", "rbi", "regulator", "compliance", "notice", "penalty", "fine"];
const MERGER_WORDS = ["acquire", "acquisition", "merger", "stake", "buyout", "takeover"];
const MANAGEMENT_WORDS = ["cfo", "ceo", "md &", "managing director", "appoints", "resigns", "steps down"];
const CORPORATE_ACTION_WORDS = ["bonus", "dividend", "buyback", "stock split", "rights issue"];
const EXPANSION_WORDS = ["expansion", "new plant", "new facility", "capacity", "greenfield", "invest"];
const EARNINGS_WORDS = ["q1", "q2", "q3", "q4", "quarterly", "net profit", "net loss", "results", "earnings"];

// Word-boundary matching, not plain substring — bare `text.includes(w)` on
// short words like "gain"/"gains" false-positives inside completely
// unrelated words ("against", "bargain", "regain" all contain "gain"),
// which was inflating bullish/bearish scores on text with no financial
// content at all (confirmed live: a sports headline scored 2 bullish hits
// purely from "against" containing both "gain" and "gains").
function countHits(text, words) {
  let count = 0;
  for (const w of words) {
    const pattern = new RegExp(`\\b${escapeRegex(w)}\\b`, "i");
    if (pattern.test(text)) count += 1;
  }
  return count;
}

// "BSE" is both a listed company's ticker (BSE Limited, the exchange
// operator) and the near-universal shorthand Indian financial press uses for
// "Bombay Stock Exchange" when reporting where a completely unrelated
// stock's price closed — e.g. "...ended at ₹387.65 ... on the BSE." That
// generic usage shows up in nearly every single stock-price mention in
// Indian financial news, so matching the bare word "bse" as a symbol was
// producing a constant stream of false positives (confirmed: a Happiest
// Minds earnings article got tagged with BSE Limited's ticker purely
// because it named the exchange its price closed on).
//
// Fix: strip out the known generic-exchange-reference phrasings before
// checking whether "bse" is actually being used as the company symbol.
// Genuine mentions ("BSE Ltd reported...", "shares of BSE fell...") don't
// match these patterns and are unaffected. This is scoped to the "bse"
// symbol only — other tickers don't share this ambiguity.
const BSE_EXCHANGE_REFERENCE_PATTERNS = [
  /\bon\s+(the\s+)?bse\b/gi,
  /\bat\s+(the\s+)?bse\b/gi,
  /\bbse\s+and\s+nse\b/gi,
  /\bnse\s+and\s+bse\b/gi,
  /\bbse\s*,\s*nse\b/gi,
  /\bnse\s*,\s*bse\b/gi,
  /\bs&p\s+bse\b/gi,
  /\bbse\s+sensex\b/gi,
  /\bbse\s+index(es)?\b/gi,
  // Index/classification names and institutional references — also
  // observed live: "BSE 150 MidCap", "BSE benchmark Sensex", "As per BSE
  // results calendar", "30-share BSE" (describing the Sensex), "BSE-listed
  // companies" as a generic class rather than the company itself.
  /\bbse\s+results?\s+calendar\b/gi,
  /\bbse\s+benchmark\b/gi,
  /\b\d+[\s-]*share\s+bse\b/gi,
  /\bbse\s+\d+\b/gi,
  /\bbse\s+(mid|small|large)[\s-]*cap\b/gi,
  /\bbse[\s-]*listed\b/gi,
];

function stripBseExchangeReferences(text) {
  let cleaned = text;
  for (const pattern of BSE_EXCHANGE_REFERENCE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned;
}

export function classify(text) {
  const lower = text.toLowerCase();
  const bullHits = countHits(lower, BULLISH_WORDS);
  const bearHits = countHits(lower, BEARISH_WORDS);
  const score = bullHits - bearHits;

  const signal = score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";

  let category = "General News";
  if (countHits(lower, REGULATORY_WORDS) > 0) category = "Regulatory";
  else if (countHits(lower, MERGER_WORDS) > 0) category = "Merger & Acquisition";
  else if (countHits(lower, MANAGEMENT_WORDS) > 0) category = "Management Change";
  else if (countHits(lower, CORPORATE_ACTION_WORDS) > 0) category = "Corporate Action";
  else if (countHits(lower, EARNINGS_WORDS) > 0) category = "Earnings";
  else if (countHits(lower, EXPANSION_WORDS) > 0) category = "Business Expansion";

  const bseSafeText = stripBseExchangeReferences(text);

  const matchedTickers = ALL_STOCKS.filter((s) => {
    const sym = s.symbol.toLowerCase();
    const name = s.name.toLowerCase();
    if (lower.includes(name)) return true;
    const textForSymbolCheck = sym === "bse" ? bseSafeText : text;
    return new RegExp(`\\b${sym.replace(/[&]/g, "\\&")}\\b`, "i").test(textForSymbolCheck);
  });

  // Relevant = ties to a specific listed company, OR reads as genuine
  // market/macro/industry news even without naming one. Anything else (the
  // FIFA/entertainment/general-world-news items that inevitably show up in
  // broad-topic RSS feeds) gets no market impact at all, regardless of how
  // its bullish/bearish word score happens to land.
  const hasIndustryRelevance = matchesKeywordList(lower, MARKET_KEYWORDS) || matchesKeywordList(lower, INDUSTRY_KEYWORDS);
  const isRelevant = matchedTickers.length > 0 || hasIndustryRelevance;

  if (category === "General News" && matchedTickers.length === 0) {
    category = hasIndustryRelevance ? "Macro Sector" : "General News";
  }

  let impact;
  if (!isRelevant) {
    impact = "none";
  } else {
    const strongSignal = Math.abs(score) >= 2;
    const highImpactCategory = category === "Regulatory" || category === "Merger & Acquisition";
    impact = "low";
    if (strongSignal || highImpactCategory || matchedTickers.length >= 2) impact = "high";
    else if (Math.abs(score) === 1 || matchedTickers.length === 1) impact = "moderate";
  }

  return {
    signal,
    impact,
    category,
    matchedTickers,
    bullHits,
    bearHits,
  };
}

// Deterministic hash used only for the "screens" count (no real concept of
// screens exists — this is decorative UI data) and as a last-resort price
// fallback for a symbol Yahoo Finance hasn't returned data for yet.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

const screensCountCache = new Map();
function placeholderScreensCount(symbol) {
  if (screensCountCache.has(symbol)) return screensCountCache.get(symbol);
  const count = hashSeed(symbol) % 6;
  screensCountCache.set(symbol, count);
  return count;
}

function fallbackPrice(symbol) {
  const seed = hashSeed(symbol);
  return {
    price: +(200 + (seed % 3000)).toFixed(2),
    changePct: +((((seed >> 3) % 800) / 100 - 4).toFixed(2)),
  };
}

// Real price/change from the Yahoo Finance poller (server/prices.js, 15-min
// refresh) when available; falls back to a deterministic placeholder only
// for symbols Yahoo hasn't returned data for (e.g. cache still warming up,
// or that symbol's fetch failed this cycle).
export function resolveTicker(symbol) {
  const live = getCachedPrice(symbol);
  const { price, changePct } = live || fallbackPrice(symbol);
  return {
    price,
    changePct,
    screensCount: placeholderScreensCount(symbol),
    isLivePrice: Boolean(live),
  };
}

export function heuristicAnalysis({ signal, impact, bullHits, bearHits }) {
  if (impact === "none") {
    return (
      `Heuristic classification (no LLM call): this story doesn't tie to a specific listed ` +
      `stock or a recognizable industry/macro theme, so no market impact is assigned.`
    );
  }
  const direction =
    signal === "bullish" ? "positive" : signal === "bearish" ? "negative" : "mixed/neutral";
  return (
    `Heuristic classification (no LLM call) based on keyword-signal analysis: ` +
    `${bullHits} bullish-leaning term(s) vs ${bearHits} bearish-leaning term(s) detected, ` +
    `giving a ${direction} lean at ${impact} estimated impact. Treat this as a rough directional ` +
    `signal, not verified financial analysis.`
  );
}
