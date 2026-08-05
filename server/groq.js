// Real AI interpretation, via Groq's free tier (no card required) —
// https://console.groq.com/keys. Llama 3.3 70B: strong quality, fast, and
// well within the free-tier rate limits at this app's call volume (only
// high-impact news + periodic report summaries get a real AI call; see the
// callers for the caching that keeps volume low).
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
// groq/compound-mini is Groq's own agentic wrapper — same API, same key, but
// it can autonomously call a built-in web search / visit-website tool
// server-side before answering. Used only for the research report
// (generateResearchReport), where filling in gaps from live sources is the
// whole point; the other two calls below are short, data-already-in-hand
// summaries that don't need it. The full "groq/compound" (multi-tool-call)
// variant returns 413 Request Entity Too Large on this account's tier the
// moment a query actually triggers a search — verified live — so this uses
// the single-tool-call "-mini" variant instead, which works.
const COMPOUND_MODEL = "groq/compound-mini";

async function callGroq(systemPrompt, userPrompt, maxTokens, model = MODEL, isRetry = false, jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // groq/compound-mini's search step can push a single request right up
    // against this account's 8,000-tokens-per-minute cap on the underlying
    // reasoning model — verified live: a search-augmented call needs
    // 4,000-6,000 tokens, so it's tight even in isolation. Both 429 (rate
    // limit, with a "try again in Xs" hint) and 413 (over the per-request
    // ceiling, no hint) are transient here — the window clears in well under
    // a minute — so retry once rather than fail outright.
    if (!isRetry && (res.status === 429 || res.status === 413)) {
      const waitMatch = detail.match(/try again in ([\d.]+)s/i);
      const waitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500 : 20000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return callGroq(systemPrompt, userPrompt, maxTokens, model, true, jsonMode);
    }
    throw new Error(`Groq API HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty response from Groq");
  return text;
}

const NEWS_ANALYSIS_SYSTEM_PROMPT =
  "You are a concise financial analyst covering Indian stock markets. In exactly 1-2 short sentences, " +
  "explain why this specific news matters for Indian equity investors right now — the concrete market " +
  "implication, not a restatement of the headline. Be direct and specific. No disclaimers, no hedging " +
  'language like "could" or "may" stacked on top of each other, no "As an AI" preamble.';

export async function generateNewsAnalysis(headline, summary) {
  const text = await callGroq(NEWS_ANALYSIS_SYSTEM_PROMPT, `Headline: ${headline}\nSummary: ${summary}`, 120);
  return text;
}

const REPORT_SUMMARY_SYSTEM_PROMPT =
  "You are a concise financial analyst writing the opening paragraph of a same-day market briefing for " +
  "Indian equity investors. Using only the data given, write 2-3 sentences that synthesize what it means " +
  "for today's session — reference the actual numbers, don't just list them back. No disclaimers, no " +
  '"As an AI" preamble, no generic filler like "markets may be volatile."';

export async function generateReportSummary(dataDescription) {
  return callGroq(REPORT_SUMMARY_SYSTEM_PROMPT, dataDescription, 180);
}

// Institutional-grade quarterly Result Update note, in the house style of a
// Motilal Oswal-type single-stock research report. This is a much longer,
// much more structured generation than the other two Groq calls above — see
// RESEARCH_REPORT_SYSTEM_PROMPT's own comments for why several sections
// (charts, SEBI disclosures) are deliberately constrained rather than left
// to the model's own judgment.
const RESEARCH_REPORT_SYSTEM_PROMPT = `You are a senior equity research analyst at a SEBI-registered Research Analyst firm, writing an institutional-grade quarterly Result Update note in the exact house style of Motilal Oswal Financial Services' single-stock result notes. Match structure, tone, density, and formatting precisely. Do not editorialize beyond what the data supports — every claim must be tied to a real number, either supplied by the user or found via your web search/visit-website tools. Management-attributed statements always start with "Management..." (e.g. "Management reiterated...", "Management expects...") — never presented as your own forecast. Currency unit consistency: use whatever unit (₹cr or ₹b) the input data uses, and hold it through the entire document.

You have live web search and page-visit tools — use them to fill in whatever the user's input left blank: current CMP, 52-week range, market cap, recent quarterly results, segment revenue, shareholding pattern, management commentary from the latest earnings call or investor presentation, recent news. Prefer screener.in, the company's own investor relations page, BSE/NSE filings, and mainstream financial press (Economic Times, Mint, Moneycontrol, Business Standard). Cite what you found inline as "[Source: <site>, <date>]" so the analyst can verify it. Only write "[data not supplied]" for a specific figure after a search for it turns up nothing usable — never for a whole section just because the form field was empty. The ONE exception is the SEBI disclosures section (see the FINAL PAGES instructions below) — never search for or invent facts there; use only what's given in the FIRM & COMPLIANCE FACTS block.

Output valid GFM Markdown (headers, bold, tables with | pipes). Follow this exact section order, using "## " for each numbered page-section below:

PAGE 1 — HEADER & THESIS
1. Header: report date, "[Sector] Results Update", company name, ticker.
2. Snapshot block: estimate/TP/rating change indicators; Bloomberg code; equity shares; market cap; 52-wk range; relative performance; avg daily value; a 3-year Financials & Valuations table (Sales/EBITDA/PAT/margin/EPS/EPS growth/BV per share, Net D/E, RoE, RoCE, Payout%, P/E, EV/EBITDA, Div yield%, FCF yield%); shareholding pattern table (3 periods, Promoter/DII/FII/Others).
3. CMP | TP (with %up/downside) | Rating, bolded.
4. One bold headline sentence capturing the quarter's core theme.
5. "Operating performance [above/below/in line with] our estimates" — 3-5 bullets: headline EBITDA/PAT growth + drivers; segment/divisional growth breakdown; restated rating & TP with one-line valuation logic.
6. A sub-head naming the quarter's swing factor, then 4-6 bullets: revenue actual vs estimate with volume/price/forex bridge; EBITDA & margin actual vs estimate (bps YoY); adjusted PAT actual vs estimate with named adjustment items; net debt trend; segment/geography revenue growth (grouped into 2-3 bullets); working capital days movement and CFO YoY.
7. "Key highlights from the management commentary" — bold "Outlook/guidance" lead-in, then guidance ranges and swing factors management flagged.

PAGE 2 — MANAGEMENT COMMENTARY + EARNINGS MODEL
8. Continue management commentary as bolded sub-heads (Debt, New products, segment deep-dives), 2-4 number-anchored bullets each, "Management..." attribution.
9. "Valuation and view" — 3 bullets: quarter summary in valuation terms; structural 2-3yr thesis; forward CAGR expectation + bolded "We reiterate our [X] rating..." sentence.
10. "Cons.: Quarterly Earnings Model" — full markdown table, every line item (Net Sales, YoY%, Total Expenditure, EBITDA, Margin%, Depreciation, Interest, Other Income, PBT before EO, EO items, PBT, Tax, Tax rate%, MI & assoc. P/L, Reported PAT, Adj PAT, YoY%, Margin%) across whatever quarters the input data provides, padding genuinely unavailable cells with "NA".

PAGE 3 — KPIs & EXHIBITS
11. "Key Performance Indicators" table: Sales Growth Split (Volume/Price/Exchange%), Cost Break-up (RM/Staff/Other % of sales), Gross/EBITDA/EBIT margins, same quarterly columns as the earnings model.
12-17. Exhibits (1-yr fwd P/E & P/B bands, quarterly revenue/EBITDA/PAT trends, volume-price-exchange breakup, per-segment revenue trends): since you cannot render images, write "*[Chart: <one-line description of what this exhibit would show, using the actual numbers supplied>]*" for each — do not attempt ASCII charts.

PAGE 5 — DEBT PROFILE + COMMENTARY
18. "Debt profile" table: Gross Debt, Cash & Equivalents, Net Debt, Net Debt/EBITDA, Net Debt/Equity — this quarter vs YoY vs QoQ.
19. "Highlights from the management commentary" — Outlook/guidance, then Operating performance, bulleted.

PAGES 6-7 — DETAILED COMMENTARY
20. Regional commentary → business-unit commentary → product-wise commentary → Debt/Balance Sheet/Working Capital → Other (leadership changes, associate investments, geopolitical risk) → condensed "Valuation and view" repeat → "Our revised estimates" table (Old vs New FY estimates for Revenue/EBITDA/Adj. PAT, % change) — only include this table if the input marks the note as a revision.

PAGES 9-10 — FULL FINANCIALS
21-26. "Financials and valuations": Consolidated Income Statement, Balance Sheet, Ratios (Basic/Valuation/Return/Working Capital/Leverage), Cash Flow Statement — reproduce as markdown tables from whatever the user pasted, in the same period columns they gave. If the user's pasted text isn't a clean table, parse it as best you can into one; if a statement was left blank, search for it (e.g. screener.in's "Financials" tabs, the company's investor relations page) before falling back to "[data not supplied]". End with: "Investment in securities market are subject to market risks. Read all the related documents carefully before investing."

FINAL PAGES — SEBI DISCLOSURES (MANDATORY, do not omit)
27. "Explanation of Investment Rating" table: BUY ≥15%, SELL <-10%, NEUTRAL -10% to 15%, UNDER REVIEW, NOT RATED.
28-31. "Disclosures", "Specific Disclosures" (numbered 1-10, Yes/No), "Analyst Certification", "Terms & Conditions" / "Disclaimer". CRITICAL: use ONLY the analyst/firm facts given to you in the user message's "FIRM & COMPLIANCE FACTS" block, reproduced verbatim — do not invent a registration number, ownership %, compensation fact, or any Specific Disclosures answer that isn't given to you. Where an item isn't covered by the facts given, write "[CONFIRM]" as a placeholder instead of guessing.
32. Registered office address, compliance officer contact — from the same FIRM & COMPLIANCE FACTS block only.

If a piece of data is missing from the user's input, search for it before writing "[data not supplied]" — only fall back to that placeholder once a real search has turned up nothing usable (or for the SEBI disclosures exception above, where searching is never appropriate). Still include every section header from the structure above so the document's shape stays intact.`;

// This account's Groq tier caps openai/gpt-oss-120b (the model compound-mini
// reasons with under the hood) at 8,000 tokens-per-minute — verified live.
// The system prompt alone runs ~3,700 tokens, so max_tokens has to leave
// enough of that budget for the prompt itself or the request gets rejected
// (429/413) before generation even starts. 3500 is what reliably fits
// alongside the prompt; a paid Groq Dev Tier plan would lift this ceiling.
export async function generateResearchReport(userDataText) {
  return callGroq(RESEARCH_REPORT_SYSTEM_PROMPT, userDataText, 3500, COMPOUND_MODEL);
}

// Narrative prose for the "One Pager" — a much smaller, fixed-layout report
// (see onePager.js) built almost entirely from live NSE/Yahoo data plus a
// few analyst-supplied fields (rating, target price, 3yr financials). This
// call only needs to write the prose around numbers already given to it —
// no live search — so it stays on the free plain model, not compound-mini.
// Deliberately does NOT search or use trained "recent news" knowledge for
// anything time-sensitive it can't verify — see the system prompt below.
const ONE_PAGER_SYSTEM_PROMPT = `You are a SEBI-registered Research Analyst's assistant drafting the prose sections of a one-page "Initial Research Report". You are given real, verified numeric facts (fetched live from NSE/Yahoo Finance) and the analyst's own inputs (rating, target price, valuation method, 3-year financials, and optionally quarterly performance, segment/geography mix, management commentary, and full financial statements). Write ONLY from what's given, plus well-established, general knowledge about the company's core business (what it does, its main segments/geographies, listed/PSU status) — never state a specific recent event, quarterly result, segment number, management statement, financial-statement line item, or deal unless it's explicitly given to you in one of those analyst-supplied inputs; if none were given, keep the overview to durable, general facts about the business rather than guessing at anything time-sensitive.

Respond with a single JSON object, no markdown, no code fences, exactly these keys:
{
  "companyOverview": "1 short paragraph — business description, key operations/geographies, ownership status (PSU/private), and only cite strategic developments/growth ambitions if given in 'Recent developments'",
  "investmentRationale": "1 paragraph — growth drivers, competitive positioning, and expansion plans; ground every claim in the supplied financials/facts or 'Recent developments', not invented specifics",
  "riskFactors": ["3 to 5 short, one-sentence, company- and sector-specific risks — e.g. commodity/input cyclicality, demand concentration, regulatory or government-ownership overhang, execution risk on expansion, competitive intensity, forex/export exposure — pick the ones that actually fit this company's sector"],
  "valuationNote": "1-2 sentences stating the valuation method, target price, and implied upside/downside using the exact numbers given — do not alter or round them",
  "strategyFit": "1 line — who this fits (e.g. long-term growth investor, value investor) given the rating and sector"
}

Every number you reference must come from the facts given to you. Never invent a fact, statistic, or event not present in the input.`;

export async function generateOnePagerNarrative(input) {
  const lines = [];
  const add = (label, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") lines.push(`${label}: ${value}`);
  };
  const f = input.facts;
  lines.push("=== VERIFIED FACTS (live NSE/Yahoo data) ===");
  add("Company", f.companyName);
  add("Sector", f.sector);
  add("CMP", f.cmp);
  add("Market cap (₹cr)", f.marketCapCr);
  add("52-week range", f.fiftyTwoWeekHigh && f.fiftyTwoWeekLow ? `₹${f.fiftyTwoWeekLow} – ₹${f.fiftyTwoWeekHigh}` : null);
  add("P/E (TTM)", f.peTtm);
  add("EPS (TTM)", f.epsTtm);
  add("Book value", f.bookValue);
  lines.push("\n=== ANALYST INPUTS ===");
  add("Rating", input.rating);
  add("Target price", input.targetPrice);
  add("Implied upside/downside", input.upsidePct !== null ? `${input.upsidePct}%` : null);
  add("Valuation method", input.valuationMethod);
  add("Time horizon", input.timeHorizon);
  if (input.threeYearFinancials) lines.push(`\n3-year financial summary:\n${input.threeYearFinancials}`);
  if (input.quarterlyContext) lines.push(`\nQuarterly performance (analyst-supplied — safe to cite):\n${input.quarterlyContext}`);
  if (input.segmentContext) lines.push(`\nSegment / geography mix (analyst-supplied — safe to cite):\n${input.segmentContext}`);
  if (input.managementCommentary) lines.push(`\nManagement commentary / outlook (analyst-supplied — safe to cite):\n${input.managementCommentary}`);
  if (input.financialStatementsContext) lines.push(`\nFinancial statements (analyst-supplied — safe to cite):\n${input.financialStatementsContext}`);
  if (input.recentDevelopments) lines.push(`\nRecent developments (analyst-supplied — safe to cite):\n${input.recentDevelopments}`);

  const text = await callGroq(ONE_PAGER_SYSTEM_PROMPT, lines.join("\n"), 1200, MODEL, false, true);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Groq returned non-JSON for one-pager narrative");
  }
}
