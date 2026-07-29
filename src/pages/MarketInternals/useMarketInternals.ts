import { useEffect, useState } from "react";

export interface ParticipantRow {
  category: "FII" | "DII" | "Pro" | "Client";
  totalLong: number;
  totalShort: number;
  netOi: number;
  netOiChange: number | null;
}

export interface ParticipantSeries {
  date: string;
  rows: ParticipantRow[];
}

export interface DealRow {
  date: string;
  symbol: string;
  company: string;
  client: string;
  buySell: string;
  quantity: number;
  price: number;
}

export interface ShortSellingRow {
  symbol: string;
  company: string;
  quantity: number;
}

export interface StrikeOi {
  strike: number;
  oi: number;
}

export interface OptionChainSummary {
  symbol: string;
  expiry: string;
  underlyingValue: number | null;
  totalCallOi: number;
  totalPutOi: number;
  pcr: number | null;
  maxPain: number | null;
  topCallOi: StrikeOi[];
  topPutOi: StrikeOi[];
}

export interface MarketInternalsData {
  fetchedAt: number;
  participantOi: ParticipantSeries | null;
  participantVolume: ParticipantSeries | null;
  bulkDeals: DealRow[];
  blockDeals: DealRow[];
  shortSelling: ShortSellingRow[];
  optionChains: OptionChainSummary[];
}

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const EMPTY: MarketInternalsData = {
  fetchedAt: 0,
  participantOi: null,
  participantVolume: null,
  bulkDeals: [],
  blockDeals: [],
  shortSelling: [],
  optionChains: [],
};

export function useMarketInternals() {
  const [data, setData] = useState<MarketInternalsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market-internals");
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
