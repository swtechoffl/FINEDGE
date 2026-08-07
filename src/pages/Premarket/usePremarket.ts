import { useCallback, useEffect, useRef, useState } from "react";

export interface PremarketQuote {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
}

export interface GiftNiftyData {
  label: string;
  price: number;
  changePct: number | null;
  change: number | null;
  impliedOpen: number | null;
  gapPoints: number | null;
  gapPercent: number | null;
  source: string;
}

export interface FiiDiiSide {
  buyValue: number | null;
  sellValue: number | null;
  netValue: number | null;
}

export interface FiiDiiData {
  date: string | null;
  fii?: FiiDiiSide;
  dii?: FiiDiiSide;
}

export interface NiftyPivotLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface NiftyPivotData {
  basis: { date: string; high: number; low: number; close: number };
  levels: NiftyPivotLevels;
}

export type BarometerLabel = "positive" | "flat" | "negative";

export interface BarometerData {
  score: number;
  label: BarometerLabel;
  cues: { giftNifty: number | null; us: number | null; global: number | null; commodities: number | null };
}

export interface CurrentIpo {
  symbol: string;
  company: string;
  priceRange: string;
  startDate: string;
  endDate: string;
  subscriptionTimes: number | null;
  isSme: boolean;
}

export interface UpcomingIpo {
  symbol: string;
  company: string;
  priceRange: string;
  startDate: string;
  endDate: string;
  isSme: boolean;
}

export interface PastIpo {
  symbol: string;
  company: string;
  priceRange: string;
  endDate: string;
  listingDate: string | null;
  isSme: boolean;
}

export interface IpoListings {
  current: CurrentIpo[];
  upcoming: UpcomingIpo[];
  past: PastIpo[];
}

export interface PremarketData {
  fetchedAt: number;
  giftNifty: GiftNiftyData | null;
  groups: Record<string, PremarketQuote[]>;
  fiiDii: FiiDiiData | null;
  niftyPivots: NiftyPivotData | null;
  bankNiftyPivots: NiftyPivotData | null;
  goldRateInrPerGram: number | null;
  barometer: BarometerData | null;
  ipos: IpoListings;
  aiSummary: string | null;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const EMPTY: PremarketData = {
  fetchedAt: 0,
  giftNifty: null,
  groups: {},
  fiiDii: null,
  niftyPivots: null,
  bankNiftyPivots: null,
  goldRateInrPerGram: null,
  barometer: null,
  ipos: { current: [], upcoming: [], past: [] },
  aiSummary: null,
};

export function usePremarket() {
  const [data, setData] = useState<PremarketData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    try {
      // A manual refresh forces the server past its own cache TTL so it
      // hits Yahoo/NSE live right now, instead of settling for whatever the
      // background poller last happened to fetch (which can be several
      // minutes stale). The passive interval poll below stays unforced.
      const res = await fetch(manual ? "/api/premarket?force=1" : "/api/premarket");
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
