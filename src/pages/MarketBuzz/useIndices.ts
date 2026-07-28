import { useEffect, useState } from "react";

export interface IndexQuote {
  label: string;
  price: number;
  changePct: number;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // poll more often than the 15-min server cache so a refresh is never missed by much

export function useIndices() {
  const [indices, setIndices] = useState<Record<string, IndexQuote>>({});
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setIndices(data.indices || {});
        setFetchedAt(data.fetchedAt || null);
      } catch {
        // silently retry on the next interval — indices are supplementary, not critical
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { indices, fetchedAt };
}
