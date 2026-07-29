import { useEffect, useState } from "react";

export interface MoverQuote {
  symbol: string;
  price: number;
  changePct: number;
}

export interface MostActiveQuote {
  symbol: string;
  price: number;
  changePct: number;
  tradedValueCr: number;
}

export interface OiBuildupEntry {
  symbol: string;
  price: number;
  changePct: number;
  oiChangePct: number;
}

export interface OiBuildup {
  longBuildup: OiBuildupEntry[];
  shortBuildup: OiBuildupEntry[];
  shortCovering: OiBuildupEntry[];
  longUnwinding: OiBuildupEntry[];
}

export interface IndexOiEntry {
  symbol: string;
  latestOI: number;
  prevOI: number;
  changeInOI: number;
  oiChangePct: number;
}

export interface Week52Entry {
  symbol: string;
  price: number;
  changePct: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  distFromHighPct?: number;
  distFromLowPct?: number;
}

export interface CorporateAction {
  symbol: string;
  company: string;
  exDate: string;
  subject: string;
}

export interface EarningsEvent {
  symbol: string;
  company: string;
  date: string;
  purpose: string;
}

export interface PostMarketData {
  fetchedAt: number;
  gainers: MoverQuote[];
  losers: MoverQuote[];
  mostActive: MostActiveQuote[];
  oiBuildup: OiBuildup;
  indexOi: IndexOiEntry[];
  near52WeekHigh: Week52Entry[];
  near52WeekLow: Week52Entry[];
  corporateActions: CorporateAction[];
  corporateActionsAll: CorporateAction[];
  earningsCalendar: EarningsEvent[];
  aiSummary: string | null;
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const EMPTY: PostMarketData = {
  fetchedAt: 0,
  gainers: [],
  losers: [],
  mostActive: [],
  oiBuildup: { longBuildup: [], shortBuildup: [], shortCovering: [], longUnwinding: [] },
  indexOi: [],
  near52WeekHigh: [],
  near52WeekLow: [],
  corporateActions: [],
  corporateActionsAll: [],
  earningsCalendar: [],
  aiSummary: null,
};

export function usePostMarket() {
  const [data, setData] = useState<PostMarketData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market-movers");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setData(json);
      } catch {
        // supplementary data — fail silently and retry on the next interval
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading };
}
