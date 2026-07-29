export type Signal = "bullish" | "neutral" | "bearish";
export type Impact = "none" | "low" | "moderate" | "high";

export interface TickerRef {
  symbol: string;
  changePct: number;
  commentCount: number;
}

export interface AffectedTicker {
  symbol: string;
  screensCount: number;
  price: number;
  changePct: number;
}

export interface NewsItem {
  id: string;
  timestamp: string; // ISO
  category: string;
  source: string;
  headline: string;
  summary: string;
  signal: Signal;
  impact: Impact;
  tickers: TickerRef[];
  aiAnalysis: string;
  aiAnalysisSource: "ai" | "heuristic";
  affectedTickers: AffectedTicker[];
  articleUrl: string;
  sector: string;
}

export interface SectorStock {
  symbol: string;
  name: string;
}

export interface Sector {
  name: string;
  stocks: SectorStock[];
}
