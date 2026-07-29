// Manual short/common-name aliases for companies whose everyday press name
// diverges from the full legal name by more than a simple corporate-suffix
// strip — e.g. "Sun Pharmaceutical Industries Limited" is universally "Sun
// Pharma" in Indian financial headlines, not just the legal name with
// "Limited" removed. Keyed by ticker symbol.
export const COMMON_NAME_ALIASES = {
  SUNPHARMA: ["Sun Pharma"],
  DRREDDY: ["Dr Reddy's", "Dr. Reddy's"],
  LT: ["L&T"],
  CHOLAFIN: ["Cholamandalam Finance", "Chola Finance"],
  ICICIGI: ["ICICI Lombard"],
  NIACL: ["New India Assurance"],
  STARHEALTH: ["Star Health"],
  SBICARD: ["SBI Cards"],
  KPRMILL: ["KPR Mill"],
};

// Ticker symbols that are also ordinary English words — matching them as a
// bare word produces false positives on completely unrelated news, live
// examples caught during testing: "...reduce reliance on human couriers"
// (RELIANCE), "a trident-shaped trophy" (TRIDENT). These are only ever
// recognized via a longer, distinctive name/alias (e.g. "Reliance
// Industries"), never the bare ticker symbol — so both the bare-symbol regex
// fallback in classify.js AND (for symbols where the auto-derived name
// reduces to the same bare word, like TRIDENT) the derived-name variant are
// skipped for these.
export const AMBIGUOUS_SYMBOLS = new Set(["RELIANCE", "TRIDENT", "LUPIN"]);

// Strips the legal-entity suffix ("Limited", "Ltd", "Company", a leading
// "The", parenthetical qualifiers like "(India)") to derive the name Indian
// financial press actually uses in running text — e.g. "Tata Power Company
// Limited" -> "Tata Power", "Infosys Limited" -> "Infosys".
export function deriveCommonName(fullName) {
  let n = fullName.trim();
  n = n.replace(/^the\s+/i, "");
  n = n.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  n = n.replace(/\s*private\s+limited\.?$/i, "").trim();
  n = n.replace(/\s*limited\.?$/i, "").trim();
  n = n.replace(/\s*ltd\.?$/i, "").trim();
  n = n.replace(/\s+(company|co\.?)$/i, "").trim();
  return n;
}
