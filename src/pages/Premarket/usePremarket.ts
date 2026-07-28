import { useEffect, useState } from "react";

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

export interface PremarketData {
  fetchedAt: number;
  giftNifty: GiftNiftyData | null;
  groups: Record<string, PremarketQuote[]>;
  fiiDii: FiiDiiData | null;
  niftyPivots: NiftyPivotData | null;
  barometer: BarometerData | null;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const EMPTY: PremarketData = {
  fetchedAt: 0,
  giftNifty: null,
  groups: {},
  fiiDii: null,
  niftyPivots: null,
  barometer: null,
};

export function usePremarket() {
  const [data, setData] = useState<PremarketData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/premarket");
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
