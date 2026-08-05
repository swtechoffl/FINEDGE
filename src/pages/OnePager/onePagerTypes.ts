export interface FinancialYear {
  year: string;
  revenue: string;
  ebitdaMargin: string;
  pat: string;
  roe: string;
  roa: string;
  debtEquity: string;
  divYield: string;
}

export function emptyFinancialYear(year = ""): FinancialYear {
  return { year, revenue: "", ebitdaMargin: "", pat: "", roe: "", roa: "", debtEquity: "", divYield: "" };
}

export interface OnePagerSegmentRow {
  name: string;
  revenue: string;
  yoyGrowth: string;
}

export function emptyOnePagerSegmentRow(): OnePagerSegmentRow {
  return { name: "", revenue: "", yoyGrowth: "" };
}

export interface OnePagerQuarterly {
  revenueActual: string;
  revenueEstimate: string;
  revenueGrowth: string;
  growthSplit: string;
  ebitda: string;
  ebitdaMargin: string;
  patAdjusted: string;
  patReported: string;
  netDebt: string;
  workingCapitalDays: string;
  cfo: string;
}

function emptyOnePagerQuarterly(): OnePagerQuarterly {
  return {
    revenueActual: "",
    revenueEstimate: "",
    revenueGrowth: "",
    growthSplit: "",
    ebitda: "",
    ebitdaMargin: "",
    patAdjusted: "",
    patReported: "",
    netDebt: "",
    workingCapitalDays: "",
    cfo: "",
  };
}

export interface OnePagerCommentary {
  outlookGuidance: string;
  regional: string;
  businessUnit: string;
  productWise: string;
  debtBalanceSheet: string;
  other: string;
}

function emptyOnePagerCommentary(): OnePagerCommentary {
  return { outlookGuidance: "", regional: "", businessUnit: "", productWise: "", debtBalanceSheet: "", other: "" };
}

export interface OnePagerFinancialStatements {
  incomeStatement: string;
  balanceSheet: string;
  ratios: string;
  cashFlow: string;
}

function emptyOnePagerFinancialStatements(): OnePagerFinancialStatements {
  return { incomeStatement: "", balanceSheet: "", ratios: "", cashFlow: "" };
}

export interface OnePagerForm {
  symbol: string;
  bseCode: string;
  exchange: "NSE" | "BSE";
  bookValue: string;
  rating: "BUY" | "HOLD" | "REDUCE";
  targetPrice: string;
  stopLoss: string;
  valuationMethod: string;
  timeHorizon: string;
  recentDevelopments: string;
  financials: FinancialYear[];
  // Optional — NSE's free feed only gives Promoter vs Public; these further
  // split the Public slice when the analyst has that detail. Manual-entry
  // mode only — paste mode sources shareholding entirely from the pasted
  // JSON instead (see OnePagerPage's independent paste/manual toggle).
  fiiPct: string;
  diiPct: string;
  // Optional extra grounding — the same detailed categories Report Maker
  // asks for, reused as-is here. The one-pager itself has no section for
  // most of these; they only enrich the narrative prompt (Groq or the
  // copied Claude research prompt), never render directly. equityShares/
  // avgDailyValue/relativePerformance are the only Report Maker "Company
  // Snapshot" fields not already covered by this page's live NSE facts.
  equityShares: string;
  avgDailyValue: string;
  relativePerformance: string;
  quarterly: OnePagerQuarterly;
  segments: OnePagerSegmentRow[];
  commentary: OnePagerCommentary;
  financialStatements: OnePagerFinancialStatements;
}

export function emptyOnePagerForm(): OnePagerForm {
  return {
    symbol: "",
    bseCode: "",
    exchange: "NSE",
    bookValue: "",
    rating: "BUY",
    targetPrice: "",
    stopLoss: "",
    valuationMethod: "P/E multiple on forward EPS",
    timeHorizon: "12 months",
    recentDevelopments: "",
    financials: [emptyFinancialYear(), emptyFinancialYear(), emptyFinancialYear()],
    fiiPct: "",
    diiPct: "",
    equityShares: "",
    avgDailyValue: "",
    relativePerformance: "",
    quarterly: emptyOnePagerQuarterly(),
    segments: [emptyOnePagerSegmentRow()],
    commentary: emptyOnePagerCommentary(),
    financialStatements: emptyOnePagerFinancialStatements(),
  };
}

export function formatQuarterlyForPrompt(q: OnePagerQuarterly): string {
  const lines: string[] = [];
  const add = (label: string, v: string) => {
    if (v.trim()) lines.push(`${label}: ${v.trim()}`);
  };
  add("Revenue — actual", q.revenueActual);
  add("Revenue — estimate", q.revenueEstimate);
  add("Revenue YoY%/QoQ%", q.revenueGrowth);
  add("Volume/Price/Forex growth split", q.growthSplit);
  add("EBITDA — actual/estimate", q.ebitda);
  add("EBITDA margin", q.ebitdaMargin);
  add("PAT adjusted — actual/estimate/YoY%", q.patAdjusted);
  add("PAT reported", q.patReported);
  add("Net debt", q.netDebt);
  add("Working capital days movement", q.workingCapitalDays);
  add("CFO — YoY", q.cfo);
  return lines.join("\n");
}

export function formatSegmentsForPrompt(segments: OnePagerSegmentRow[]): string {
  const rows = segments.filter((s) => s.name.trim());
  if (rows.length === 0) return "";
  return rows.map((s) => `${s.name}: revenue ${s.revenue || "NA"}, YoY ${s.yoyGrowth || "NA"}`).join("\n");
}

export function formatCommentaryForPrompt(c: OnePagerCommentary): string {
  const lines: string[] = [];
  const add = (label: string, v: string) => {
    if (v.trim()) lines.push(`${label}: ${v.trim()}`);
  };
  add("Outlook & guidance", c.outlookGuidance);
  add("Regional", c.regional);
  add("Business-unit", c.businessUnit);
  add("Product-wise", c.productWise);
  add("Debt & balance sheet", c.debtBalanceSheet);
  add("Other", c.other);
  return lines.join("\n");
}

export function formatFinancialStatementsForPrompt(fs: OnePagerFinancialStatements): string {
  const lines: string[] = [];
  const add = (label: string, v: string) => {
    if (v.trim()) lines.push(`${label}:\n${v.trim()}`);
  };
  add("Income Statement", fs.incomeStatement);
  add("Balance Sheet", fs.balanceSheet);
  add("Ratios", fs.ratios);
  add("Cash Flow Statement", fs.cashFlow);
  return lines.join("\n\n");
}

export interface StatementRow {
  label: string;
  values: string[];
}

// Renders a financial statement block as a table rather than a raw text
// dump. Expects (and the research prompt asks for) one line item per line
// in "Label: v1 | v2 | v3" form — same convention as a screener.in paste,
// which is also what free-typed manual entry tends to look like already.
// A line with no ":" still renders, as a single-column note row, rather
// than being dropped — raw pastes aren't guaranteed to be this tidy.
export function parseStatementRows(raw: string): StatementRow[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return { label: line, values: [] };
      const label = line.slice(0, colonIdx).trim();
      const values = line
        .slice(colonIdx + 1)
        .split("|")
        .map((v) => v.trim())
        .filter((v) => v !== "");
      return { label: label || line, values };
    });
}

export function formatFinancialsForPrompt(financials: FinancialYear[]): string {
  const rows = financials.filter((f) => f.year.trim());
  if (rows.length === 0) return "";
  const line = (label: string, key: keyof FinancialYear) => `${label}: ` + rows.map((f) => `${f.year}=${f[key] || "NA"}`).join(", ");
  return [
    line("Revenue (₹cr)", "revenue"),
    line("EBITDA margin (%)", "ebitdaMargin"),
    line("PAT (₹cr)", "pat"),
    line("ROE (%)", "roe"),
    line("ROA (%)", "roa"),
    line("Debt/Equity (%)", "debtEquity"),
    line("Dividend yield (%)", "divYield"),
  ].join("\n");
}

export interface EquityCheck {
  impliedMarketCapCr: number;
  reportedMarketCapCr: number | null;
  reconciles: boolean;
}

export interface ShareholdingSlice {
  label: string;
  pct: number;
}

export interface Shareholding {
  asOfDate: string | null;
  slices: ShareholdingSlice[];
}

export interface OnePagerFacts {
  companyName: string | null;
  symbol: string;
  isin: string | null;
  bseCode: string | null;
  sector: string | null;
  exchange: string;
  marketCapCr: number | null;
  cmp: number | null;
  faceValue: number | null;
  equityCr: number | null;
  bookValue: number | null;
  epsTtm: number | null;
  peTtm: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  equityCheck: EquityCheck | null;
  shareholding: Shareholding | null;
}

export interface OnePagerNarrative {
  companyOverview: string;
  investmentRationale: string;
  riskFactors: string[];
  valuationNote: string;
  strategyFit: string;
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface OnePagerResult {
  reportDateLabel: string;
  facts: OnePagerFacts;
  rating: string;
  targetPrice: number | null;
  stopLoss: number | null;
  upsidePct: number | null;
  valuationMethod: string;
  timeHorizon: string;
  chart: { stock: ChartPoint[]; nifty: ChartPoint[] };
  narrative: OnePagerNarrative;
}
