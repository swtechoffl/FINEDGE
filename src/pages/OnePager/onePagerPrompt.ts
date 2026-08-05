import type { FinancialYear, OnePagerForm, OnePagerNarrative } from "./onePagerTypes";
import {
  formatCommentaryForPrompt,
  formatFinancialsForPrompt,
  formatFinancialStatementsForPrompt,
  formatQuarterlyForPrompt,
  formatSegmentsForPrompt,
} from "./onePagerTypes";

export interface ClaudeShareholding {
  promoterPct: number;
  fiiPct: number | null;
  diiPct: number | null;
  publicPct: number | null;
  asOfDate: string | null;
}

export interface OnePagerClaudeResponse {
  narrative: OnePagerNarrative;
  shareholding: ClaudeShareholding | null;
  financials: FinancialYear[] | null;
}

// Mirrors ONE_PAGER_SYSTEM_PROMPT in server/groq.js field-for-field for the
// narrative, and extends it to also ask for shareholding % and 3-year
// financials — the two things this app has no free live source for and
// previously required typing in by hand. The only reason this "paste" path
// exists is that Groq's free plain model has no live web search to look any
// of this up itself.
export function buildOnePagerResearchPrompt(form: OnePagerForm): string {
  const symbol = form.symbol.trim().toUpperCase() || "<TICKER>";
  const financials = formatFinancialsForPrompt(form.financials);
  const quarterly = formatQuarterlyForPrompt(form.quarterly);
  const segments = formatSegmentsForPrompt(form.segments);
  const commentary = formatCommentaryForPrompt(form.commentary);
  const statements = formatFinancialStatementsForPrompt(form.financialStatements);

  const lines: string[] = [
    `You are drafting an "Initial Research Report" one-pager for ${symbol}, an NSE-listed Indian company.`,
    "",
    "Research the company using web search — cover all of: business description, key operations/geographies, ownership status (PSU/private); latest quarterly results (revenue/EBITDA/PAT vs YoY and QoQ, beat/miss vs consensus if available); segment/geography revenue mix; recent management commentary and outlook/guidance; the last 3 fiscal years of income statement, balance sheet, ratios and cash flow trends; growth drivers, competitive positioning, sector-specific risks; and the latest shareholding pattern. Only research what isn't already given to you below — where the analyst has already supplied a figure, use it exactly rather than searching for your own. Ground everything else in real, current, sourced information — never invent a fact, statistic, or event. Where you can't verify a specific figure, use the literal string \"NA\" rather than guessing.",
    "",
    "Analyst inputs (given — do not contradict, cite exactly, do not alter or round the numbers):",
    `- Rating: ${form.rating}`,
    `- Target price: ₹${form.targetPrice || "<not set>"}`,
    `- Valuation method: ${form.valuationMethod}`,
    `- Time horizon: ${form.timeHorizon}`,
  ];
  if (financials) lines.push(`- 3-year financial summary already on hand (fill any gaps, don't contradict): ${financials}`);
  if (quarterly) lines.push(`- Quarterly numbers already on hand: ${quarterly.replace(/\n/g, " | ")}`);
  if (segments) lines.push(`- Segment / geography revenue already on hand: ${segments.replace(/\n/g, " | ")}`);
  if (commentary) lines.push(`- Management commentary already on hand: ${commentary.replace(/\n/g, " | ")}`);
  if (statements) lines.push(`- Financial statements already on hand:\n${statements}`);
  lines.push(`- Recent developments (analyst-supplied, safe to cite): ${form.recentDevelopments.trim() || "none supplied"}`);
  lines.push(
    "",
    "Respond with ONLY a single JSON object — no markdown, no code fences, no explanation before or after — with exactly these keys:",
    "{",
    '  "companyOverview": "1 short paragraph — business description, key operations/geographies, ownership status, cite strategic developments only if grounded in your research or the analyst inputs above",',
    '  "investmentRationale": "1 paragraph — growth drivers, competitive positioning, and expansion plans, grounded in your research or the analyst inputs above",',
    '  "riskFactors": ["3 to 5 short, one-sentence, company- and sector-specific risks — e.g. commodity/input cyclicality, demand concentration, regulatory or government-ownership overhang, execution risk, competitive intensity, forex/export exposure — pick what actually fits this company"],',
    '  "valuationNote": "1-2 sentences stating the valuation method, target price, and implied upside/downside using the exact numbers given above",',
    '  "strategyFit": "1 line — who this fits (e.g. long-term growth investor, value investor) given the rating and sector",',
    '  "shareholding": {',
    '    "promoterPct": <number, latest reported promoter holding %>,',
    '    "fiiPct": <number, FII/FPI holding % — use null if you can\'t verify>,',
    '    "diiPct": <number, DII holding % — use null if you can\'t verify>,',
    '    "publicPct": <number, public/others holding % — use null if you can\'t verify>,',
    '    "asOfDate": "<e.g. \'30 Jun 2026\' — the quarter-end this shareholding data is as of>"',
    "  },",
    '  "financials": [',
    '    {"year": "FY24", "revenue": "<₹cr>", "ebitdaMargin": "<%>", "pat": "<₹cr>", "roe": "<%>", "roa": "<%>", "debtEquity": "<%>", "divYield": "<%>"},',
    '    {"year": "FY25", "revenue": "...", "ebitdaMargin": "...", "pat": "...", "roe": "...", "roa": "...", "debtEquity": "...", "divYield": "..."},',
    '    {"year": "FY26", "revenue": "...", "ebitdaMargin": "...", "pat": "...", "roe": "...", "roa": "...", "debtEquity": "...", "divYield": "..."}',
    "  ]",
    "}",
    "",
    "For \"financials\", use the 3 most recent consecutive fiscal years actually reported (consolidated figures where available).",
  );
  return lines.join("\n");
}

function toPct(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function toFieldString(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s.toUpperCase() === "NA" ? "" : s;
}

function parseShareholding(raw: unknown): ClaudeShareholding | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const promoterPct = toPct(s.promoterPct);
  if (promoterPct === null) return null;
  return {
    promoterPct,
    fiiPct: toPct(s.fiiPct),
    diiPct: toPct(s.diiPct),
    publicPct: toPct(s.publicPct),
    asOfDate: typeof s.asOfDate === "string" && s.asOfDate.trim() ? s.asOfDate.trim() : null,
  };
}

function parseFinancials(raw: unknown): FinancialYear[] | null {
  if (!Array.isArray(raw)) return null;
  const rows = raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({
      year: toFieldString(r.year),
      revenue: toFieldString(r.revenue),
      ebitdaMargin: toFieldString(r.ebitdaMargin),
      pat: toFieldString(r.pat),
      roe: toFieldString(r.roe),
      roa: toFieldString(r.roa),
      debtEquity: toFieldString(r.debtEquity),
      divYield: toFieldString(r.divYield),
    }))
    .filter((r) => r.year !== "");
  return rows.length > 0 ? rows : null;
}

// Accepts whatever an AI chat surface hands back — usually the bare JSON
// object, sometimes wrapped in a ```json fence, sometimes with a sentence of
// preamble/postamble despite the prompt's instructions not to. Pulls out the
// first balanced {...} span rather than requiring an exact match. Only the
// narrative fields are mandatory — shareholding/financials are bonus data
// the caller auto-fills into the form when present, so their absence isn't
// a parse failure.
export function parseOnePagerNarrative(raw: string): OnePagerClaudeResponse | { error: string } {
  const text = raw.trim();
  if (!text) return { error: "Paste the AI's response first." };

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return { error: "Couldn't find a JSON object in the pasted text." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return { error: "That JSON didn't parse — check for a truncated paste or stray text inside the braces." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { error: "Parsed content isn't a JSON object." };
  }
  const p = parsed as Record<string, unknown>;
  const companyOverview = typeof p.companyOverview === "string" ? p.companyOverview.trim() : "";
  const investmentRationale = typeof p.investmentRationale === "string" ? p.investmentRationale.trim() : "";
  const valuationNote = typeof p.valuationNote === "string" ? p.valuationNote.trim() : "";
  const strategyFit = typeof p.strategyFit === "string" ? p.strategyFit.trim() : "";
  const riskFactors = Array.isArray(p.riskFactors)
    ? p.riskFactors.filter((r): r is string => typeof r === "string" && r.trim() !== "").map((r) => r.trim())
    : [];

  const missing: string[] = [];
  if (!companyOverview) missing.push("companyOverview");
  if (!investmentRationale) missing.push("investmentRationale");
  if (riskFactors.length === 0) missing.push("riskFactors");
  if (!valuationNote) missing.push("valuationNote");
  if (!strategyFit) missing.push("strategyFit");
  if (missing.length > 0) return { error: `JSON is missing or has empty fields: ${missing.join(", ")}` };

  return {
    narrative: { companyOverview, investmentRationale, riskFactors, valuationNote, strategyFit },
    shareholding: parseShareholding(p.shareholding),
    financials: parseFinancials(p.financials),
  };
}
