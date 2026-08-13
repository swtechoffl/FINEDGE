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

// This RA's own compliance details, pre-filled so every poster carries them
// without the analyst having to retype them each time — still editable per
// poster for a different signatory.
export const RA_DEFAULT_NAME = "Ramakrishnan T.B";
export const RA_DEFAULT_SEBI_REG_NO = "INH000010496";
export const RA_DEFAULT_SEBI_REG_DATE = "31 October 2022";
export const RA_DEFAULT_BSE_ENLISTMENT_NO = "5657";
export const RA_DEFAULT_ADDRESS =
  "3213 Topaz Sobha City, Puzhakkal Post, Thrissur District, Kerala State, Pin-680553";

export function fmtRaPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtRaDate(d: string) {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(+parsed)) return d;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Whole days between a call date and its exit date — floored at 1 so a
// same-day exit still reads as "1 day" rather than "0 days".
export function raDaysHeld(callDate: string, exitDate: string): number | null {
  const start = +new Date(callDate);
  const end = +new Date(exitDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}
