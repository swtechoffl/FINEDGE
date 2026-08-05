import type {
  FinancialYear,
  OnePagerCommentary,
  OnePagerFinancialStatements,
  OnePagerForm,
  OnePagerNarrative,
  OnePagerQuarterly,
  OnePagerSegmentRow,
} from "./onePagerTypes";
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
  quarterly: OnePagerQuarterly | null;
  segments: OnePagerSegmentRow[] | null;
  commentary: OnePagerCommentary | null;
  financialStatements: OnePagerFinancialStatements | null;
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
    "Research the company using web search. Cover every item below — only research what isn't already given to you in \"Analyst inputs\"; where the analyst has already supplied a figure, use it exactly rather than searching for your own:",
    "- Business description, key operations/geographies, ownership status (PSU/private)",
    "- Latest quarterly results: revenue/EBITDA/PAT vs YoY and QoQ, beat/miss vs consensus if available",
    "- Segment / geography revenue mix",
    "- Recent management commentary and outlook/guidance",
    "- Income Statement — last 3 fiscal years",
    "- Balance Sheet — last 3 fiscal years",
    "- Cash Flow Statement — last 3 fiscal years",
    "- Key financial ratios — last 3 fiscal years",
    "- Growth drivers, competitive positioning, sector-specific risks",
    "- Latest shareholding pattern (Promoter/FII/DII/Public %)",
    "",
    "Ground everything in real, current, sourced information — never invent a fact, statistic, or event. Where you can't verify a specific figure, use the literal string \"NA\" rather than guessing.",
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
    "  ],",
    '  "quarterly": {',
    '    "revenueActual": "<₹cr, latest reported quarter>", "revenueEstimate": "<₹cr, consensus if you found one, else \\"NA\\">",',
    '    "revenueGrowth": "<e.g. \'+9.2% YoY / +2.1% QoQ\'>", "growthSplit": "<volume/price/forex split if disclosed, else \\"NA\\">",',
    '    "ebitda": "<₹cr actual / estimate>", "ebitdaMargin": "<e.g. \'21.4%, +80bps YoY\'>",',
    '    "patAdjusted": "<₹cr actual / estimate / YoY%>", "patReported": "<₹cr, name any one-off adjustment items>",',
    '    "netDebt": "<₹cr, latest / YoY / QoQ>", "workingCapitalDays": "<movement if disclosed, else \\"NA\\">", "cfo": "<₹cr, YoY>"',
    "  },",
    '  "segments": [{"name": "<segment/geography>", "revenue": "<₹cr, this quarter>", "yoyGrowth": "<%>"}],',
    '  "commentary": {',
    '    "outlookGuidance": "<1 sentence>", "regional": "<1 sentence or \\"NA\\">", "businessUnit": "<1 sentence or \\"NA\\">",',
    '    "productWise": "<1 sentence or \\"NA\\">", "debtBalanceSheet": "<1 sentence or \\"NA\\">", "other": "<1 sentence or \\"NA\\">"',
    "  },",
    '  "financialStatements": {',
    '    "incomeStatement": "<3-5 key line items, last 3 FY, one per line: e.g. \'Revenue: 12000 | 13500 | 15200\'>",',
    '    "balanceSheet": "<3-5 key line items, last 3 FY>",',
    '    "ratios": "<3-5 key ratios, last 3 FY>",',
    '    "cashFlow": "<3-5 key line items, last 3 FY>"',
    "  }",
    "}",
    "",
    "For \"financials\", use the 3 most recent consecutive fiscal years actually reported (consolidated figures where available). \"quarterly\", \"segments\", \"commentary\" and \"financialStatements\" are all optional — include only what you actually found; use \"NA\" for individual fields you can't verify, and omit a whole key only if you found nothing for it at all. Keep \"financialStatements\" to a few key line items each, not the full raw statement — this is for a one-page report, not a research note.",
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

function parseQuarterly(raw: unknown): OnePagerQuarterly | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const q: OnePagerQuarterly = {
    revenueActual: toFieldString(s.revenueActual),
    revenueEstimate: toFieldString(s.revenueEstimate),
    revenueGrowth: toFieldString(s.revenueGrowth),
    growthSplit: toFieldString(s.growthSplit),
    ebitda: toFieldString(s.ebitda),
    ebitdaMargin: toFieldString(s.ebitdaMargin),
    patAdjusted: toFieldString(s.patAdjusted),
    patReported: toFieldString(s.patReported),
    netDebt: toFieldString(s.netDebt),
    workingCapitalDays: toFieldString(s.workingCapitalDays),
    cfo: toFieldString(s.cfo),
  };
  return Object.values(q).some((v) => v !== "") ? q : null;
}

function parseSegments(raw: unknown): OnePagerSegmentRow[] | null {
  if (!Array.isArray(raw)) return null;
  const rows = raw
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({ name: toFieldString(r.name), revenue: toFieldString(r.revenue), yoyGrowth: toFieldString(r.yoyGrowth) }))
    .filter((r) => r.name !== "");
  return rows.length > 0 ? rows : null;
}

function parseCommentary(raw: unknown): OnePagerCommentary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const c: OnePagerCommentary = {
    outlookGuidance: toFieldString(s.outlookGuidance),
    regional: toFieldString(s.regional),
    businessUnit: toFieldString(s.businessUnit),
    productWise: toFieldString(s.productWise),
    debtBalanceSheet: toFieldString(s.debtBalanceSheet),
    other: toFieldString(s.other),
  };
  return Object.values(c).some((v) => v !== "") ? c : null;
}

function parseFinancialStatements(raw: unknown): OnePagerFinancialStatements | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const fs: OnePagerFinancialStatements = {
    incomeStatement: toFieldString(s.incomeStatement),
    balanceSheet: toFieldString(s.balanceSheet),
    ratios: toFieldString(s.ratios),
    cashFlow: toFieldString(s.cashFlow),
  };
  return Object.values(fs).some((v) => v !== "") ? fs : null;
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
    quarterly: parseQuarterly(p.quarterly),
    segments: parseSegments(p.segments),
    commentary: parseCommentary(p.commentary),
    financialStatements: parseFinancialStatements(p.financialStatements),
  };
}
