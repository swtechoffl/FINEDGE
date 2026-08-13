// Shared dark-theme tokens for the RA (Research Analyst call) posters —
// same palette ResearchExitPoster uses, so a call's "open" poster (made here)
// and its eventual "closed" poster (ResearchExitPoster, once the call exits
// in the tracker) read as the same visual family.
export const RA_BG_APP = "#0a0a0b";
export const RA_BG_SURFACE = "#141416";
export const RA_BG_SURFACE_2 = "#1c1c1f";
export const RA_BORDER = "#27272a";
export const RA_TEXT_PRIMARY = "#fafafa";
export const RA_TEXT_SECONDARY = "#a1a1aa";
export const RA_TEXT_MUTED = "#71717a";
export const RA_BULLISH = "#22c55e";
export const RA_BULLISH_BG = "rgba(34,197,94,0.14)";
export const RA_BEARISH = "#f87171";
export const RA_BEARISH_BG = "rgba(248,113,113,0.14)";

export const RA_DEFAULT_DISCLAIMER =
  "Investments in securities market are subject to market risks. Read all related documents carefully before investing. Past performance is not indicative of future returns.";

export function fmtRaPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtRaDate(d: string) {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(+parsed)) return d;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
