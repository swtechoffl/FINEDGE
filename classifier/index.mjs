import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env loading (hand-rolled — no dotenv dependency, see CLAUDE.md philosophy)
// ---------------------------------------------------------------------------
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(path.join(__dirname, ".env"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

export const MATCH_THRESHOLD = 0.6; // tuned default — see README for the tradeoff
const NSE_SYMBOLS_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const CACHE_PATH = path.join(__dirname, ".cache", "nse-symbols.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_PACING_MS = 1000; // sequential 1 req/sec — free-tier friendly, deliberate (see CLAUDE.md)

const CATEGORIES = [
  "Business Expansion",
  "Corporate Action",
  "Earnings",
  "General News",
  "Macro Sector",
  "Regulatory",
  "Management Change",
  "Merger & Acquisition",
];

// A browser UA — NSE's archives host blocks generic bot User-Agents outright.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Shared prompt — exactly one prompt, used by every provider (see CLAUDE.md)
// ---------------------------------------------------------------------------
export function buildPrompt({ title, summary }) {
  return `You are a financial news classification assistant for the Indian stock market.

Read the article below and respond with ONLY a single JSON object — no markdown code fences, no commentary before or after.

Article title: ${title}
Article summary: ${summary}

Return exactly this JSON shape:
{
  "sentiment": "bullish" | "neutral" | "bearish",
  "category": one of ${JSON.stringify(CATEGORIES)},
  "industry": "<short industry/sector label>",
  "llm_summary": "<1-2 sentence plain-English summary of the article>",
  "relevance_score": <integer 1-10, how relevant/market-moving this is>,
  "company_names": ["<company name exactly as it would appear in a stock exchange listing, NOT a ticker symbol>", ...]
}

Rules:
- company_names must be plain company names (e.g. "Tata Consultancy Services"), never ticker symbols like "TCS".
- If you are not sure whether a company is publicly listed, include it anyway by name — a separate verified lookup handles that, not you.
- Do not invent a ticker/symbol anywhere in your response.
- If no company is clearly mentioned, return an empty array for company_names.
- Output must be valid JSON and nothing else.`;
}

// ---------------------------------------------------------------------------
// Shared JSON extraction — handles markdown fences from either provider
// ---------------------------------------------------------------------------
export function extractJson(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in model output");
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Provider error classification — every thrown error carries a `.code` so
// callers (classifyArticle, --check, main's summary) can tell "the key is
// wrong" apart from "the network is down" apart from "the model returned
// garbage" instead of a single generic failure.
// ---------------------------------------------------------------------------
export class ProviderError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ProviderError";
    this.code = code; // see CODES below
  }
}

export const ERROR_CODES = {
  NO_KEY: "no API key configured for this provider",
  NETWORK: "could not reach the provider (DNS/timeout/connection failure)",
  AUTH: "API key rejected — invalid or unauthorized",
  RATE_LIMIT: "rate limited by the provider (HTTP 429)",
  BAD_REQUEST: "provider rejected the request as malformed (HTTP 400, not a key problem)",
  SERVER: "provider-side server error (HTTP 5xx)",
  HTTP_OTHER: "unexpected HTTP status from provider",
  SAFETY_BLOCKED: "provider blocked the response under its safety filters",
  EMPTY_RESPONSE: "provider returned an empty/no-text response",
  PARSE_ERROR: "model's response could not be parsed as the expected JSON shape",
};

// Gemini's Generative Language API returns invalid-key errors as HTTP 400
// with reason "API_KEY_INVALID" (tested directly) rather than 401/403 like
// most REST APIs — a plain status-code check alone mislabels it as a
// generic bad request. OpenRouter (and most APIs) do use 401/403 for auth
// failures, so both are checked here.
function classifyHttpStatus(status, body) {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "RATE_LIMIT";
  if (status === 400) {
    if (/api_key_invalid|invalid.*api.?key|unauthorized/i.test(body || "")) return "AUTH";
    return "BAD_REQUEST";
  }
  if (status >= 500) return "SERVER";
  return "HTTP_OTHER";
}

function normalizeResult(raw) {
  const sentiment = ["bullish", "neutral", "bearish"].includes(raw.sentiment) ? raw.sentiment : "neutral";
  const category = CATEGORIES.includes(raw.category) ? raw.category : "General News";
  const relevance_score = Number.isFinite(raw.relevance_score)
    ? Math.max(1, Math.min(10, Math.round(raw.relevance_score)))
    : 5;
  const company_names = Array.isArray(raw.company_names)
    ? raw.company_names.filter((c) => typeof c === "string" && c.trim())
    : [];
  return {
    sentiment,
    category,
    industry: typeof raw.industry === "string" && raw.industry.trim() ? raw.industry.trim() : "Unknown",
    llm_summary: typeof raw.llm_summary === "string" ? raw.llm_summary.trim() : "",
    relevance_score,
    company_names,
  };
}

// ---------------------------------------------------------------------------
// Provider: Gemini 2.5 Flash (primary)
// ---------------------------------------------------------------------------
export async function callGemini(article) {
  if (!GEMINI_API_KEY) throw new ProviderError("GEMINI_API_KEY not set", "NO_KEY");
  const prompt = buildPrompt(article);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });
  } catch (err) {
    throw new ProviderError(`Gemini network error: ${err.message}`, "NETWORK");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const code = classifyHttpStatus(res.status, body);
    throw new ProviderError(`Gemini API error ${res.status} [${code}]: ${body.slice(0, 300)}`, code);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new ProviderError("Gemini blocked the response under its safety filters", "SAFETY_BLOCKED");
  }
  const text = (candidate?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new ProviderError("Gemini returned no text in the response", "EMPTY_RESPONSE");

  try {
    return normalizeResult(extractJson(text));
  } catch (err) {
    throw new ProviderError(`Gemini output was not valid JSON: ${err.message}`, "PARSE_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Provider: OpenRouter (fallback — only tried if Gemini throws)
// ---------------------------------------------------------------------------
export async function callOpenRouter(article) {
  if (!OPENROUTER_API_KEY) throw new ProviderError("OPENROUTER_API_KEY not set", "NO_KEY");
  const prompt = buildPrompt(article);

  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });
  } catch (err) {
    throw new ProviderError(`OpenRouter network error: ${err.message}`, "NETWORK");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const code = classifyHttpStatus(res.status, body);
    throw new ProviderError(`OpenRouter API error ${res.status} [${code}]: ${body.slice(0, 300)}`, code);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new ProviderError("OpenRouter returned no text in the response", "EMPTY_RESPONSE");

  try {
    return normalizeResult(extractJson(text));
  } catch (err) {
    throw new ProviderError(`OpenRouter output was not valid JSON: ${err.message}`, "PARSE_ERROR");
  }
}

// ---------------------------------------------------------------------------
// classifyArticle — provider fallback orchestration (Gemini first, by design)
// ---------------------------------------------------------------------------
export async function classifyArticle(article) {
  const providers = [
    { name: "gemini", fn: callGemini, enabled: Boolean(GEMINI_API_KEY) },
    { name: "openrouter", fn: callOpenRouter, enabled: Boolean(OPENROUTER_API_KEY) },
  ];

  let lastError = null;
  for (const provider of providers) {
    if (!provider.enabled) continue; // silently skip if key not set — no hard requirement on either key
    try {
      const result = await provider.fn(article);
      return { ...result, classified_by: provider.name };
    } catch (err) {
      lastError = err;
      const code = err.code || "UNKNOWN";
      console.error(`[classifier] ${provider.name} failed [${code}]: ${err.message}`);
    }
  }
  if (!lastError) {
    throw new ProviderError(
      "No provider API key set. Set GEMINI_API_KEY and/or OPENROUTER_API_KEY in .env",
      "NO_KEY",
    );
  }
  throw new ProviderError(
    `All providers failed. Last error [${lastError.code || "UNKNOWN"}]: ${lastError.message}`,
    lastError.code || "UNKNOWN",
  );
}

// ---------------------------------------------------------------------------
// Connectivity check — `node index.mjs --check` — verifies each configured
// provider actually works (real API call, real key) without touching any
// input file. Distinct from classifyArticle: this calls each provider
// directly so a working fallback provider can't mask a broken primary one.
// ---------------------------------------------------------------------------
const CHECK_ARTICLE = {
  title: "Reliance Industries reports quarterly results",
  summary: "This is a connectivity test article used to verify the classifier can reach the LLM provider and parse its response.",
};

export async function checkProviders() {
  const providers = [
    { name: "gemini", fn: callGemini, enabled: Boolean(GEMINI_API_KEY) },
    { name: "openrouter", fn: callOpenRouter, enabled: Boolean(OPENROUTER_API_KEY) },
  ];

  const report = [];
  for (const provider of providers) {
    if (!provider.enabled) {
      report.push({ provider: provider.name, status: "SKIPPED", detail: ERROR_CODES.NO_KEY });
      continue;
    }
    const start = Date.now();
    try {
      const result = await provider.fn(CHECK_ARTICLE);
      report.push({
        provider: provider.name,
        status: "OK",
        detail: `responded in ${Date.now() - start}ms, sentiment=${result.sentiment}`,
      });
    } catch (err) {
      report.push({
        provider: provider.name,
        status: "FAILED",
        code: err.code || "UNKNOWN",
        detail: err.message,
      });
    }
  }
  return report;
}

function printProviderReport(report) {
  console.log("Provider check:");
  for (const r of report) {
    if (r.status === "OK") {
      console.log(`  ✓ ${r.provider}: OK (${r.detail})`);
    } else if (r.status === "SKIPPED") {
      console.log(`  – ${r.provider}: SKIPPED (${r.detail})`);
    } else {
      console.log(`  ✗ ${r.provider}: FAILED [${r.code}] ${ERROR_CODES[r.code] ? `— ${ERROR_CODES[r.code]}` : ""}`);
      console.log(`      ${r.detail}`);
    }
  }
  const anyOk = report.some((r) => r.status === "OK");
  const anyConfigured = report.some((r) => r.status !== "SKIPPED");
  if (!anyConfigured) {
    console.log("\nNo API key configured at all. Copy .env.example to .env and set at least one key.");
  } else if (!anyOk) {
    console.log("\nAll configured providers failed — see codes above. classifyArticle() would currently fail for every article.");
  } else {
    console.log("\nAt least one provider is working — classifyArticle() will succeed.");
  }
}

// ---------------------------------------------------------------------------
// NSE symbol master — fetch, cache, hand-rolled CSV parse
// ---------------------------------------------------------------------------
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(",").map((h) => h.trim());
  const symbolIdx = header.indexOf("SYMBOL");
  const nameIdx = header.indexOf("NAME OF COMPANY");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length <= Math.max(symbolIdx, nameIdx)) continue;
    const symbol = cols[symbolIdx]?.trim();
    const name = cols[nameIdx]?.trim();
    if (symbol && name) rows.push({ symbol, name });
  }
  return rows;
}

async function fetchNseSymbols() {
  const res = await fetch(NSE_SYMBOLS_URL, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) throw new Error(`Failed to fetch NSE symbol master: HTTP ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

export async function loadNseSymbols() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stat = fs.statSync(CACHE_PATH);
      if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
        const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
        if (Array.isArray(cached) && cached.length > 0) return cached;
      }
    }
  } catch {
    // corrupt/unreadable cache — fall through and refetch
  }

  const symbols = await fetchNseSymbols();
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(symbols));
  return symbols;
}

// ---------------------------------------------------------------------------
// Hand-rolled Levenshtein distance + fuzzy ticker matching
// ---------------------------------------------------------------------------
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prevRow = new Array(n + 1);
  for (let j = 0; j <= n; j++) prevRow[j] = j;
  for (let i = 1; i <= m; i++) {
    const currRow = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(currRow[j - 1] + 1, prevRow[j] + 1, prevRow[j - 1] + cost);
    }
    prevRow = currRow;
  }
  return prevRow[n];
}

const COMPANY_SUFFIXES = /\b(ltd|limited|pvt|private|inc|incorporated|corp|corporation|co|company|plc)\b\.?/gi;

export function normalizeCompanyName(name) {
  return name
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenJaccard(na, nb) {
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Plain edit-distance ratio alone is not safe for Indian company names:
// conglomerates (Tata, Reliance, Aditya Birla, Adani...) list many entities
// sharing a common first word, so "Reliance Jio" vs "Reliance Power" scores
// deceptively high (~0.64) on edit-distance alone even though they're
// unrelated, unlisted-vs-listed entities. Combining with token-level Jaccard
// (min of the two) means a shared corporate-family word alone can no longer
// carry a match — the distinguishing word(s) have to actually overlap too.
function similarity(a, b) {
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const editSim = maxLen === 0 ? 0 : 1 - dist / maxLen;
  const jaccard = tokenJaccard(na, nb);
  return Math.min(editSim, jaccard);
}

// The only function allowed to produce a ticker symbol. Never trust an
// LLM-recalled ticker — see CLAUDE.md for the Tata 1mg / TATACAP incident
// this rule exists to prevent.
//
// Symbol-string comparison is EXACT MATCH ONLY, never fuzzy. Ticker symbols
// are short, dense, near-arbitrary strings (e.g. "TATACOMM") — running
// Levenshtein similarity on them produces spurious high scores from pure
// coincidental character overlap (an earlier version of this function
// matched "Tata 1mg" to TATACOMM at 0.625 similarity — a different wrong
// ticker than the documented TATACAP case, but the same class of bug: a
// short accidental match clearing MATCH_THRESHOLD). Company *names* are
// long and specific enough for fuzzy matching to be meaningful; symbols
// are not, so they only ever contribute via an exact, normalized match.
export function matchTicker(companyName, symbolMaster) {
  const normalizedQuery = normalizeCompanyName(companyName);
  let best = { symbol: null, matchedName: null, score: 0 };
  for (const row of symbolMaster) {
    const nameScore = similarity(companyName, row.name);
    const exactSymbolScore = normalizedQuery === row.symbol.toLowerCase() ? 1 : 0;
    const score = Math.max(nameScore, exactSymbolScore);
    if (score > best.score) {
      best = { symbol: row.symbol, matchedName: row.name, score };
    }
  }
  if (best.score < MATCH_THRESHOLD) {
    return { symbol: null, matchedName: null, score: +best.score.toFixed(3) };
  }
  return { symbol: best.symbol, matchedName: best.matchedName, score: +best.score.toFixed(3) };
}

// ---------------------------------------------------------------------------
// main — sequential, 1 req/sec pacing (deliberate, see CLAUDE.md)
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const inputPath = process.argv[2];

  if (inputPath === "--check" || inputPath === "--check-keys") {
    const report = await checkProviders();
    printProviderReport(report);
    // process.exitCode (not process.exit()) — exiting immediately right after
    // an in-flight fetch's socket is still being torn down by undici crashes
    // Node on Windows with a libuv assertion. Setting exitCode lets the event
    // loop drain naturally and still reports the right code once it does.
    process.exitCode = report.some((r) => r.status === "OK") ? 0 : 1;
    return;
  }

  if (!inputPath) {
    console.error("Usage: node index.mjs <path/to/articles.json>");
    console.error("  e.g. node index.mjs sample-articles.json");
    console.error("       node index.mjs --check   (verify provider API keys work, no input file needed)");
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Input file not found: ${resolvedPath}`);
    process.exit(1);
  }

  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    console.error("No API key set. Copy .env.example to .env and set GEMINI_API_KEY and/or OPENROUTER_API_KEY.");
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  if (!Array.isArray(articles)) {
    console.error("Input file must be a JSON array of {title, summary} objects.");
    process.exit(1);
  }

  console.error("Loading NSE symbol master...");
  const symbolMaster = await loadNseSymbols();
  console.error(`Loaded ${symbolMaster.length} NSE symbols.\n`);

  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.error(`[${i + 1}/${articles.length}] Classifying: ${String(article.title).slice(0, 70)}`);
    try {
      const classified = await classifyArticle(article);
      const companies = classified.company_names.map((name) => ({
        name,
        ...matchTicker(name, symbolMaster),
      }));
      results.push({
        title: article.title,
        sentiment: classified.sentiment,
        category: classified.category,
        industry: classified.industry,
        llm_summary: classified.llm_summary,
        relevance_score: classified.relevance_score,
        companies,
        classified_by: classified.classified_by,
      });
    } catch (err) {
      const code = err.code || "UNKNOWN";
      console.error(`  Failed [${code}]: ${err.message}`);
      results.push({ title: article.title, error: err.message, error_code: code });
    }

    if (i < articles.length - 1) await sleep(REQUEST_PACING_MS);
  }

  const byProvider = { gemini: 0, openrouter: 0 };
  let failed = 0;
  for (const r of results) {
    if (r.error) failed += 1;
    else if (r.classified_by) byProvider[r.classified_by] = (byProvider[r.classified_by] || 0) + 1;
  }
  console.error(
    `\nSummary: ${results.length} article(s) — ${byProvider.gemini} via gemini, ` +
      `${byProvider.openrouter} via openrouter, ${failed} failed.`,
  );
  if (failed > 0) {
    console.error("Run with --check to verify provider connectivity separately from article classification.");
  }

  console.log(JSON.stringify(results, null, 2));
}

// Only auto-run when executed directly (`node index.mjs ...`), not when
// imported — lets tests/tools import the functions above without triggering
// the CLI pipeline.
const isMainModule = path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "");
if (isMainModule) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exitCode = 1; // see the --check block above for why not process.exit()
  });
}
