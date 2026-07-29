import { useCallback, useEffect, useRef, useState } from "react";

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

export interface VolumeGainerQuote {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  week1AvgVolume: number;
  week1VolChangePct: number;
}

export interface AdvanceDeclineData {
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
}

export interface PostMarketData {
  fetchedAt: number;
  gainers: MoverQuote[];
  losers: MoverQuote[];
  mostActive: MostActiveQuote[];
  volumeGainers: VolumeGainerQuote[];
  advanceDecline: AdvanceDeclineData | null;
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
  volumeGainers: [],
  advanceDecline: null,
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
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    try {
      // A manual refresh should show the latest the server already has —
      // the server keeps its own cache warm on a background interval
      // regardless of frontend requests, so this can be ahead of the
      // frontend's own polling cadence without needing a force-refetch.
      const res = await fetch("/api/market-movers");
      if (!res.ok) return;
      const json = await res.json();
      if (cancelledRef.current) return;
      setData(json);
    } catch {
      // supplementary data — fail silently and retry on the next interval
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
        if (manual) setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  const refresh = useCallback(() => load({ manual: true }), [load]);

  return { data, loading, refreshing, refresh };
}
