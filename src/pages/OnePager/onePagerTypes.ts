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

export interface OnePagerForm {
  symbol: string;
  bseCode: string;
  exchange: "NSE" | "BSE";
  bookValue: string;
  rating: "BUY" | "HOLD" | "REDUCE";
  targetPrice: string;
  valuationMethod: string;
  timeHorizon: string;
  recentDevelopments: string;
  financials: FinancialYear[];
}

export function emptyOnePagerForm(): OnePagerForm {
  return {
    symbol: "",
    bseCode: "",
    exchange: "NSE",
    bookValue: "",
    rating: "BUY",
    targetPrice: "",
    valuationMethod: "P/E multiple on forward EPS",
    timeHorizon: "12 months",
    recentDevelopments: "",
    financials: [emptyFinancialYear(), emptyFinancialYear(), emptyFinancialYear()],
  };
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
  upsidePct: number | null;
  valuationMethod: string;
  timeHorizon: string;
  chart: { stock: ChartPoint[]; nifty: ChartPoint[] };
  narrative: OnePagerNarrative;
}
