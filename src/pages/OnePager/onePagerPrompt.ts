import type { OnePagerForm, OnePagerNarrative } from "./onePagerTypes";
import { formatFinancialsForPrompt } from "./onePagerTypes";

// Mirrors ONE_PAGER_SYSTEM_PROMPT in server/groq.js field-for-field, so a
// response pasted back in parses into exactly the shape generateOnePager
// expects — the only difference is this version asks the external AI to do
// its own live web research (Groq's free plain model has none), which is
// the whole reason this "paste" path exists.
export function buildOnePagerResearchPrompt(form: OnePagerForm): string {
  const symbol = form.symbol.trim().toUpperCase() || "<TICKER>";
  const financials = formatFinancialsForPrompt(form.financials);

  const lines: string[] = [
    `You are drafting the narrative sections of a SEBI-compliant "Initial Research Report" one-pager for ${symbol}, an NSE-listed Indian company.`,
    "",
    "Research the company using web search: business description, key operations/geographies, ownership status (PSU/private), recent developments, financial trends, growth drivers, competitive positioning, and sector-specific risks. Ground every claim in real, current information — never invent a fact, statistic, or event.",
    "",
    "Analyst inputs (given — do not contradict, cite exactly, do not alter or round the numbers):",
    `- Rating: ${form.rating}`,
    `- Target price: ₹${form.targetPrice || "<not set>"}`,
    `- Valuation method: ${form.valuationMethod}`,
    `- Time horizon: ${form.timeHorizon}`,
  ];
  lines.push(`- 3-year financial summary: ${financials || "not supplied — omit specific figures if you can't verify them"}`);
  lines.push(`- Recent developments (analyst-supplied, safe to cite): ${form.recentDevelopments.trim() || "none supplied"}`);
  lines.push(
    "",
    "Respond with ONLY a single JSON object — no markdown, no code fences, no explanation before or after — with exactly these keys:",
    "{",
    '  "companyOverview": "1 short paragraph — business description, key operations/geographies, ownership status, cite strategic developments only if grounded in your research or the analyst inputs above",',
    '  "investmentRationale": "1 paragraph — growth drivers, competitive positioning, and expansion plans, grounded in your research or the analyst inputs above",',
    '  "riskFactors": ["3 to 5 short, one-sentence, company- and sector-specific risks — e.g. commodity/input cyclicality, demand concentration, regulatory or government-ownership overhang, execution risk, competitive intensity, forex/export exposure — pick what actually fits this company"],',
    '  "valuationNote": "1-2 sentences stating the valuation method, target price, and implied upside/downside using the exact numbers given above",',
    '  "strategyFit": "1 line — who this fits (e.g. long-term growth investor, value investor) given the rating and sector"',
    "}",
  );
  return lines.join("\n");
}

// Accepts whatever an AI chat surface hands back — usually the bare JSON
// object, sometimes wrapped in a ```json fence, sometimes with a sentence of
// preamble/postamble despite the prompt's instructions not to. Pulls out the
// first balanced {...} span rather than requiring an exact match.
export function parseOnePagerNarrative(raw: string): { narrative: OnePagerNarrative } | { error: string } {
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

  return { narrative: { companyOverview, investmentRationale, riskFactors, valuationNote, strategyFit } };
}
