import { useState } from "react";
import type { Signal } from "../../types";

// Deliberately independent of the live news feed (useNewsFeed) — the RAMKI
// premarket report never auto-fetches headlines, it only shows what's been
// manually added here.
export interface ManualNewsItem {
  id: string;
  headline: string;
  category: string;
  source: string;
  signal: Signal;
}

export function useManualNews() {
  const [items, setItems] = useState<ManualNewsItem[]>([]);

  function addNews(item: { headline: string; category: string; source: string; signal: Signal }) {
    setItems((prev) => [{ id: crypto.randomUUID(), ...item }, ...prev]);
  }

  function removeNews(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return { items, addNews, removeNews };
}
