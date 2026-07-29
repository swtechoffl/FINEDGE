import { useEffect, useState } from "react";

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface StrikeOi {
  strike: number;
  oi: number;
}

export interface StockOptionChain {
  expiry: string;
  pcr: number | null;
  maxPain: number | null;
  topCallOi: StrikeOi[];
  topPutOi: StrikeOi[];
}

export interface StockDetailData {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  price: number | null;
  changePct: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  deliveryPct: number | null;
  marketCapCr: number | null;
  peRatio: number | null;
  isin: string | null;
  listingDate: string | null;
  history: HistoryPoint[];
  optionChain: StockOptionChain | null;
}

export function useStockDetail(symbol: string | undefined) {
  const [data, setData] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/stock/${encodeURIComponent(symbol)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load stock data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}
