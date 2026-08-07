import { useEffect, useState } from "react";
import type { MarketingPosterTemplate } from "./marketingPosterTemplates";

// Per-poster edits (color, copy, CTA) layered on top of the built-in
// templates — same "override the default" shape as useReportBranding /
// useSocialLinks, keyed by template id instead of being a single record.
export type MarketingPosterOverride = Partial<Omit<MarketingPosterTemplate, "id">>;

const STORAGE_KEY = "stoqtrade-marketing-poster-overrides";

function readInitial(): Record<string, MarketingPosterOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useMarketingPosterOverrides() {
  const [overrides, setOverrides] = useState<Record<string, MarketingPosterOverride>>(readInitial);

  useEffect(() => {
    try {
      if (Object.keys(overrides).length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private browsing etc.) — edits just won't persist
    }
  }, [overrides]);

  function setOverride(id: string, patch: MarketingPosterOverride) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function resetOverride(id: string) {
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function applyOverride(template: MarketingPosterTemplate): MarketingPosterTemplate {
    return { ...template, ...overrides[template.id] };
  }

  return { overrides, setOverride, resetOverride, applyOverride };
}
