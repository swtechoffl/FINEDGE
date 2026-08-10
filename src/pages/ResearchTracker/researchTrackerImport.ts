import { isValidSymbol } from "./researchTrackerValidation";
import type { CallStatus, CallType, ResearchCall } from "./researchTrackerTypes";

// Everything a new call needs except its bookkeeping fields — same shape
// addCall's input has, but also allows pre-set status/exit fields so a
// historical (already-closed) call can be imported as such in one row
// instead of importing it open and then exiting it by hand.
export type ImportedCallRow = Omit<ResearchCall, "id" | "createdAt" | "updatedAt">;

export interface ImportError {
  line: number; // 1-based, matches what a spreadsheet's row number would show
  message: string;
}

export interface ParseResult {
  rows: ImportedCallRow[];
  errors: ImportError[];
}

// Minimal RFC-4180 CSV parser — handles quoted fields, embedded commas/
// newlines, and doubled-quote escaping (the same rules researchTrackerExport's
// csvEscape produces), without pulling in a CSV library for one import form.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
    } else if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (char === "\r") {
      i += 1;
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
    } else {
      field += char;
      i += 1;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-blank trailing rows (a lone newline at EOF parses as one).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

type FieldKey =
  | "symbol"
  | "companyName"
  | "callType"
  | "callDate"
  | "recommendedPrice"
  | "targetPrice"
  | "stopLoss"
  | "status"
  | "exitDate"
  | "exitPrice"
  | "notes";

// Accepts the exact headers researchTrackerExport.ts writes, plus a few
// natural variants, so a round-tripped export or a hand-built sheet both work.
const HEADER_ALIASES: Record<string, FieldKey> = {
  symbol: "symbol",
  company: "companyName",
  "company name": "companyName",
  type: "callType",
  "call type": "callType",
  "call date": "callDate",
  date: "callDate",
  recommended: "recommendedPrice",
  "recommended price": "recommendedPrice",
  target: "targetPrice",
  "target price": "targetPrice",
  "stop loss": "stopLoss",
  stoploss: "stopLoss",
  status: "status",
  "exit date": "exitDate",
  "exit price": "exitPrice",
  notes: "notes",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePrice(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

export function parseImportRows(csvText: string): ParseResult {
  const table = parseCsv(csvText);
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: "The file is empty." }] };

  const headerRow = table[0].map((h) => h.trim().toLowerCase());
  const columnOf: Partial<Record<FieldKey, number>> = {};
  headerRow.forEach((h, i) => {
    const key = HEADER_ALIASES[h];
    if (key) columnOf[key] = i;
  });

  if (columnOf.symbol == null) {
    return { rows: [], errors: [{ line: 1, message: 'Missing required "Symbol" column.' }] };
  }
  const missingRequired = (["callDate", "recommendedPrice", "targetPrice"] as FieldKey[]).filter(
    (k) => columnOf[k] == null,
  );
  if (missingRequired.length > 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Missing required column(s): ${missingRequired.join(", ")}.` }],
    };
  }

  const cell = (row: string[], key: FieldKey) => {
    const idx = columnOf[key];
    return idx == null ? "" : (row[idx] ?? "").trim();
  };

  const rows: ImportedCallRow[] = [];
  const errors: ImportError[] = [];

  for (let r = 1; r < table.length; r++) {
    const raw = table[r];
    const line = r + 1; // +1 for the header row, table is 0-indexed
    const rowErrors: string[] = [];

    const symbol = cell(raw, "symbol").toUpperCase();
    if (!symbol) {
      rowErrors.push("Symbol is required");
    } else if (!isValidSymbol(symbol)) {
      rowErrors.push(`Symbol "${symbol}" isn't a valid ticker (letters, numbers, & or - only, up to 20 characters)`);
    }

    const callTypeRaw = cell(raw, "callType").toLowerCase();
    let callType: CallType = "buy";
    if (callTypeRaw && callTypeRaw !== "buy" && callTypeRaw !== "sell") {
      rowErrors.push(`Type must be "buy" or "sell" (got "${cell(raw, "callType")}")`);
    } else if (callTypeRaw === "sell") {
      callType = "sell";
    }

    const callDate = cell(raw, "callDate");
    if (!DATE_RE.test(callDate)) rowErrors.push(`Call date must be YYYY-MM-DD (got "${callDate}")`);

    const recommendedPrice = parsePrice(cell(raw, "recommendedPrice"));
    if (recommendedPrice == null || Number.isNaN(recommendedPrice)) {
      rowErrors.push(`Recommended price must be a positive number (got "${cell(raw, "recommendedPrice")}")`);
    }

    const targetPrice = parsePrice(cell(raw, "targetPrice"));
    if (targetPrice == null || Number.isNaN(targetPrice)) {
      rowErrors.push(`Target price must be a positive number (got "${cell(raw, "targetPrice")}")`);
    }

    const stopLossRaw = cell(raw, "stopLoss");
    const stopLossParsed = stopLossRaw ? parsePrice(stopLossRaw) : null;
    if (stopLossRaw && (stopLossParsed == null || Number.isNaN(stopLossParsed))) {
      rowErrors.push(`Stop loss must be a positive number (got "${stopLossRaw}")`);
    }

    const statusRaw = cell(raw, "status").toLowerCase();
    let status: CallStatus = "open";
    if (statusRaw && statusRaw !== "open" && statusRaw !== "exited") {
      rowErrors.push(`Status must be "open" or "exited" (got "${cell(raw, "status")}")`);
    } else if (statusRaw === "exited") {
      status = "exited";
    }

    let exitDate: string | null = null;
    let exitPrice: number | null = null;
    if (status === "exited") {
      const exitDateRaw = cell(raw, "exitDate");
      if (!DATE_RE.test(exitDateRaw)) rowErrors.push(`Exit date must be YYYY-MM-DD for an exited row (got "${exitDateRaw}")`);
      else exitDate = exitDateRaw;

      const exitPriceRaw = cell(raw, "exitPrice");
      const parsed = parsePrice(exitPriceRaw);
      if (parsed == null || Number.isNaN(parsed)) {
        rowErrors.push(`Exit price is required and must be a positive number for an exited row (got "${exitPriceRaw}")`);
      } else {
        exitPrice = parsed;
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ line, message: rowErrors.join("; ") });
      continue;
    }

    rows.push({
      symbol,
      companyName: cell(raw, "companyName"),
      callType,
      callDate,
      recommendedPrice: recommendedPrice as number,
      targetPrice: targetPrice as number,
      stopLoss: stopLossParsed ?? null,
      notes: cell(raw, "notes"),
      status,
      exitDate,
      exitPrice,
    });
  }

  return { rows, errors };
}

export const IMPORT_TEMPLATE_CSV = [
  "Symbol,Company,Type,Call Date,Recommended,Target,Stop Loss,Status,Exit Date,Exit Price,Notes",
  "TCS,Tata Consultancy Services Limited,BUY,2026-01-15,3800,4100,3650,open,,,Breakout above 200-DMA",
  "INFY,Infosys Limited,BUY,2025-11-02,1450,1600,,exited,2026-01-05,1580,Booked ahead of Q3 results",
].join("\r\n");
