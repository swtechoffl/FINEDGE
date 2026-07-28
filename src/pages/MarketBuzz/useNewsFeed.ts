import { useEffect, useState } from "react";
import type { NewsItem } from "../../types";

export interface FeedStatusEntry {
  source: string;
  label: string;
  url: string;
  status: "confirmed" | "watch";
  ok: boolean;
  count: number;
  error?: string;
}

interface NewsResponse {
  items: NewsItem[];
  fetchedAt: number;
  feedStatus: FeedStatusEntry[];
}

interface FeedState {
  items: NewsItem[];
  feedStatus: FeedStatusEntry[];
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
}

const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

export function useNewsFeed() {
  const [state, setState] = useState<FeedState>({
    items: [],
    feedStatus: [],
    fetchedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const data: NewsResponse = await res.json();
        if (cancelled) return;
        setState({
          items: data.items,
          feedStatus: data.feedStatus,
          fetchedAt: data.fetchedAt,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not reach the news API. Is the server running (npm run server)?",
        }));
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
