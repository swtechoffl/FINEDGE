export interface SegmentRow {
  name: string;
  revenue: string;
  yoyGrowth: string;
}

export interface EstimateRevisionRow {
  metric: string;
  oldValue: string;
  newValue: string;
}

export interface ResearchReportForm {
  header: {
    companyName: string;
    ticker: string;
    reportDate: string;
    sector: string;
    cmp: string;
    targetPrice: string;
    upside: string;
    rating: string;
    ratingRationale: string;
    estimateChange: string;
    tpChange: string;
    ratingChange: string;
    isRevision: boolean;
  };
  snapshot: {
    equityShares: string;
    marketCap: string;
    week52Range: string;
    relativePerformance: string;
    avgDailyValue: string;
  };
  shareholding: string;
  threeYearFinancials: string;
  quarterly: {
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
  };
  segments: SegmentRow[];
  commentary: {
    outlookGuidance: string;
    regional: string;
    businessUnit: string;
    productWise: string;
    debtBalanceSheet: string;
    other: string;
  };
  financials: {
    incomeStatement: string;
    balanceSheet: string;
    ratios: string;
    cashFlow: string;
  };
  estimateRevision: EstimateRevisionRow[];
  firmFacts: string;
}

export function emptyResearchReportForm(defaultFirmFacts: string): ResearchReportForm {
  return {
    header: {
      companyName: "",
      ticker: "",
      reportDate: new Date().toISOString().slice(0, 10),
      sector: "",
      cmp: "",
      targetPrice: "",
      upside: "",
      rating: "BUY",
      ratingRationale: "",
      estimateChange: "unchanged",
      tpChange: "unchanged",
      ratingChange: "unchanged",
      isRevision: false,
    },
    snapshot: {
      equityShares: "",
      marketCap: "",
      week52Range: "",
      relativePerformance: "",
      avgDailyValue: "",
    },
    shareholding: "",
    threeYearFinancials: "",
    quarterly: {
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
    },
    segments: [{ name: "", revenue: "", yoyGrowth: "" }],
    commentary: {
      outlookGuidance: "",
      regional: "",
      businessUnit: "",
      productWise: "",
      debtBalanceSheet: "",
      other: "",
    },
    financials: {
      incomeStatement: "",
      balanceSheet: "",
      ratios: "",
      cashFlow: "",
    },
    estimateRevision: [{ metric: "", oldValue: "", newValue: "" }],
    firmFacts: defaultFirmFacts,
  };
}
