import { pctMoved } from "./researchTrackerMath";
import type { ResearchCall } from "./researchTrackerTypes";

const HEADERS = [
  "Symbol",
  "Company",
  "Type",
  "Call Date",
  "Recommended",
  "Target",
  "Stop Loss",
  "Status",
  "Exit Date",
  "Exit Price",
  "Return %",
  "Notes",
];

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function callsToCsv(calls: ResearchCall[]): string {
  const rows = calls.map((c) => [
    c.symbol,
    c.companyName,
    c.callType.toUpperCase(),
    c.callDate,
    c.recommendedPrice,
    c.targetPrice,
    c.stopLoss ?? "",
    c.status,
    c.exitDate ?? "",
    c.exitPrice ?? "",
    c.exitPrice != null ? pctMoved(c, c.exitPrice).toFixed(2) : "",
    c.notes.replace(/\r?\n/g, " "),
  ]);
  return [HEADERS, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel (still the primary consumer of a "download report"
  // button) detects UTF-8 instead of misreading the ₹ symbol via its
  // locale-default codepage.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
