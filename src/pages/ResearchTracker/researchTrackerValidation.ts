// Must exactly match the server's own check (server/index.js's
// `/api/stock/:symbol` route) — a symbol that fails this can never be
// priced, so both the Add Call form and the CSV importer reject it before
// it ever becomes a call, rather than silently creating one that 400s on
// every price fetch afterward.
export const SYMBOL_PATTERN = /^[A-Za-z0-9&-]{1,20}$/;

export function isValidSymbol(symbol: string): boolean {
  return SYMBOL_PATTERN.test(symbol.trim());
}
