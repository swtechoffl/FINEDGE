import { useEffect, useState } from "react";
import type { MarketMood } from "./MarketMoodMotif";

export interface IndexOverride {
  price?: number;
  change?: number;
  changePct?: number;
}

export interface PostMarketSummaryOverride {
  titleLine1?: string;
  titleLine2?: string;
  subtitle?: string;
  // null/undefined = automatic (driven by Nifty's change%)
  moodOverride?: MarketMood | null;
  // Manual correction for the index level/% shown on the poster — used when
  // the live feed's change% comes back wrong (e.g. a stale previous-close
  // from the data source) but the poster still needs to go out on time.
  nifty?: IndexOverride;
  sensex?: IndexOverride;
  bankNifty?: IndexOverride;
}

const STORAGE_KEY = "stoqtrade-post-market-summary-override";

function readInitial(): PostMarketSummaryOverride {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function usePostMarketSummaryOverrides() {
  const [override, setOverrideState] = useState<PostMarketSummaryOverride>(readInitial);

  useEffect(() => {
    try {
      if (Object.keys(override).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(override));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private browsing etc.) — edits just won't persist
    }
  }, [override]);

  function setOverride(patch: PostMarketSummaryOverride) {
    setOverrideState((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setOverrideState({});
  }

  return { override, setOverride, reset };
}
