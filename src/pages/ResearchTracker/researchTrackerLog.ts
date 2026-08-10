import type { ResearchCallInput } from "./researchTrackerTypes";

export type LogAction = "created" | "updated" | "exited" | "reopened" | "deleted";

export interface FieldChange {
  field: string;
  from: string;
  to: string;
}

export interface LogEntry {
  id: string;
  callId: string;
  // Denormalized — a "deleted" entry must still show which symbol it was
  // after the call itself is gone from the calls list.
  symbol: string;
  action: LogAction;
  timestamp: number;
  summary: string;
  changes?: FieldChange[];
}

const FIELD_LABELS: Record<keyof ResearchCallInput, string> = {
  symbol: "Symbol",
  companyName: "Company name",
  callType: "Call type",
  callDate: "Call date",
  recommendedPrice: "Recommended price",
  targetPrice: "Target price",
  stopLoss: "Stop loss",
  notes: "Notes",
};

function fmtFieldValue(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

// Field-level diff between a call's prior and new input — what an "updated"
// log entry's expandable detail is built from.
export function diffCallInput(before: ResearchCallInput, after: ResearchCallInput): FieldChange[] {
  const changes: FieldChange[] = [];
  (Object.keys(FIELD_LABELS) as (keyof ResearchCallInput)[]).forEach((key) => {
    if (before[key] !== after[key]) {
      changes.push({ field: FIELD_LABELS[key], from: fmtFieldValue(before[key]), to: fmtFieldValue(after[key]) });
    }
  });
  return changes;
}

// Same collision concern as useResearchTracker's makeId — a bulk import logs
// every row in the same synchronous loop.
function makeLogId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `log-${crypto.randomUUID()}`;
  return `log-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.round(Math.random() * 1e6)}`;
}

export function makeLogEntry(
  callId: string,
  symbol: string,
  action: LogAction,
  summary: string,
  changes?: FieldChange[],
): LogEntry {
  return { id: makeLogId(), callId, symbol, action, timestamp: Date.now(), summary, changes };
}
