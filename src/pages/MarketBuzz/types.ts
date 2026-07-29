import type { Signal } from "../../types";

export type TimelineWindow = "1H" | "6H" | "12H" | "24H" | "7D";

export interface FilterState {
  stocks: string[];
  categories: string[];
  sources: string[];
  signal: Signal | "all";
  minImpactIndex: number; // 0 = none (show all), 1 = low+, 2 = moderate+, 3 = high only
  timeline: TimelineWindow;
}

export const TIMELINE_HOURS: Record<TimelineWindow, number> = {
  "1H": 1,
  "6H": 6,
  "12H": 12,
  "24H": 24,
  "7D": 24 * 7,
};

export const IMPACT_LEVELS = ["none", "low", "moderate", "high"] as const;

export const DEFAULT_FILTERS: FilterState = {
  stocks: [],
  categories: [],
  sources: [],
  signal: "all",
  minImpactIndex: 1, // hides "none" (not tied to any stock/industry) by default
  timeline: "24H",
};
