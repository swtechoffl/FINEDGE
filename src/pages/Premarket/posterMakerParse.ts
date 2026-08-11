import { MAX_POSTER_ROWS } from "./posterShared";
import type { PosterMakerColumn } from "./posterMakerTemplates";

export interface ParseError {
  line: number; // 1-based
  message: string;
}

export interface ParseResult {
  rows: Record<string, string>[];
  errors: ParseError[];
}

// One data row per line — tab, comma, or pipe delimited (auto-detected per
// line so a symbol-only template with no delimiter at all still works).
// Column order follows the template's own `columns` definition.
function splitLine(line: string): string[] {
  const delimiter = line.includes("\t") ? "\t" : line.includes("|") ? "|" : line.includes(",") ? "," : null;
  if (!delimiter) return [line.trim()];
  return line.split(delimiter).map((part) => part.trim());
}

export function parsePosterMakerText(text: string, columns: PosterMakerColumn[]): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: Record<string, string>[] = [];
  const errors: ParseError[] = [];
  const requiredLabels = columns.filter((c) => c.required).map((c) => c.label);

  lines.forEach((line, i) => {
    const parts = splitLine(line);
    const row: Record<string, string> = {};
    const missing: string[] = [];

    columns.forEach((col, idx) => {
      const raw = (parts[idx] ?? "").trim();
      if (!raw) {
        if (col.required) missing.push(col.label);
        return;
      }
      if (col.type === "number" && !Number.isFinite(Number(raw))) {
        errors.push({ line: i + 1, message: `"${col.label}" must be a number (got "${raw}")` });
        return;
      }
      row[col.key] = col.key === "symbol" ? raw.toUpperCase() : raw;
    });

    if (missing.length > 0) {
      errors.push({ line: i + 1, message: `Missing ${missing.join(", ")} — expected: ${requiredLabels.join(", ")}` });
      return;
    }
    // A number-column failure above still leaves `row` short a key; skip
    // rather than silently rendering a blank/NaN field.
    if (columns.some((c) => c.required && !row[c.key])) return;
    rows.push(row);
  });

  return { rows, errors };
}

// Splits parsed rows into MAX_POSTER_ROWS-sized pages — one poster per page,
// last page keeping whatever's left over (rendered at a more generous
// density tier than a full page, same as any other under-10-item poster).
export function paginateRows<T>(rows: T[], pageSize: number = MAX_POSTER_ROWS): T[][] {
  if (rows.length === 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += pageSize) {
    pages.push(rows.slice(i, i + pageSize));
  }
  return pages;
}
