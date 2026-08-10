import { useCallback, useEffect, useState } from "react";
import { diffCallInput, makeLogEntry, type LogEntry } from "./researchTrackerLog";
import type { ImportedCallRow } from "./researchTrackerImport";
import type { ResearchCall, ResearchCallInput } from "./researchTrackerTypes";

const STORAGE_KEY = "stoqtrade-research-tracker-calls";
const LOG_KEY = "stoqtrade-research-tracker-log";
// Caps localStorage growth — plenty for a real usage history (the audit
// view is a recent-activity feed, not a permanent ledger).
const LOG_MAX_ENTRIES = 500;

function makeId() {
  return `call-${Date.now()}-${Math.round(Math.random() * 1e5)}`;
}

function readInitial(): ResearchCall[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Calls live in localStorage only — this app has no user database or
// per-analyst auth beyond the PIN gate, and every other bit of
// analyst-authored state (poster overrides, disclaimer settings, flowchart
// boards) follows the same local-only pattern, so a research call list does
// too rather than introducing the app's first server-side data store. The
// activity log rides alongside it under its own key, one entry per mutation
// (add/edit/exit/reopen/delete) — the audit trail this app has instead of a
// real multi-user system to audit.
export function useResearchTracker() {
  const [calls, setCalls] = useState<ResearchCall[]>(readInitial);
  const [log, setLog] = useState<LogEntry[]>(readLog);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
    } catch {
      // localStorage unavailable (private browsing etc.) — edits just won't persist
    }
  }, [calls]);

  useEffect(() => {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch {
      // localStorage unavailable — same as above, log just won't persist
    }
  }, [log]);

  // A plain (non-updater-callback) setState call, always issued directly
  // from an event handler rather than nested inside setCalls's own updater
  // — keeps the two state updates independent so React's dev-mode
  // double-invoke of updater functions can't double-log an entry.
  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, LOG_MAX_ENTRIES));
  }, []);

  const addCall = useCallback(
    (input: ResearchCallInput) => {
      const now = Date.now();
      const call: ResearchCall = {
        ...input,
        id: makeId(),
        status: "open",
        exitPrice: null,
        exitDate: null,
        createdAt: now,
        updatedAt: now,
      };
      setCalls((prev) => [call, ...prev]);
      appendLog(
        makeLogEntry(
          call.id,
          call.symbol,
          "created",
          `${call.callType.toUpperCase()} call added at ₹${call.recommendedPrice}, target ₹${call.targetPrice}`,
        ),
      );
      return call.id;
    },
    [appendLog],
  );

  const updateCall = useCallback(
    (id: string, patch: ResearchCallInput) => {
      const existing = calls.find((c) => c.id === id);
      if (existing) {
        const changes = diffCallInput(existing, patch);
        if (changes.length > 0) {
          appendLog(
            makeLogEntry(
              id,
              patch.symbol,
              "updated",
              `${changes.length} field${changes.length === 1 ? "" : "s"} changed`,
              changes,
            ),
          );
        }
      }
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)));
    },
    [calls, appendLog],
  );

  const deleteCall = useCallback(
    (id: string) => {
      const existing = calls.find((c) => c.id === id);
      setCalls((prev) => prev.filter((c) => c.id !== id));
      if (existing) appendLog(makeLogEntry(id, existing.symbol, "deleted", `Call deleted (was ${existing.status})`));
    },
    [calls, appendLog],
  );

  const exitCall = useCallback(
    (id: string, exitPrice: number, exitDate: string) => {
      const existing = calls.find((c) => c.id === id);
      setCalls((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "exited", exitPrice, exitDate, updatedAt: Date.now() } : c)),
      );
      if (existing) appendLog(makeLogEntry(id, existing.symbol, "exited", `Exited at ₹${exitPrice} on ${exitDate}`));
    },
    [calls, appendLog],
  );

  // Bulk-import path (CSV upload) — each row can already carry its own
  // status/exit fields (a historical call imported as already-closed), so
  // this bypasses addCall's always-open construction. Still one "created"
  // log entry per row for a complete audit trail, just phrased to say it
  // came from an import rather than the Add Call form.
  const importCalls = useCallback(
    (rows: ImportedCallRow[]) => {
      const now = Date.now();
      const newCalls: ResearchCall[] = rows.map((row) => ({
        ...row,
        id: makeId(),
        createdAt: now,
        updatedAt: now,
      }));
      setCalls((prev) => [...newCalls, ...prev]);
      newCalls.forEach((call) => {
        const summary =
          call.status === "exited"
            ? `Imported (already exited) — ${call.callType.toUpperCase()} at ₹${call.recommendedPrice}, exited ₹${call.exitPrice} on ${call.exitDate}`
            : `Imported — ${call.callType.toUpperCase()} call at ₹${call.recommendedPrice}, target ₹${call.targetPrice}`;
        appendLog(makeLogEntry(call.id, call.symbol, "created", summary));
      });
      return newCalls.length;
    },
    [appendLog],
  );

  // Undo for an accidental/incorrect exit — puts the call back on the open
  // board without losing the rest of its history.
  const reopenCall = useCallback(
    (id: string) => {
      const existing = calls.find((c) => c.id === id);
      setCalls((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: "open", exitPrice: null, exitDate: null, updatedAt: Date.now() } : c,
        ),
      );
      if (existing) appendLog(makeLogEntry(id, existing.symbol, "reopened", "Call reopened"));
    },
    [calls, appendLog],
  );

  return { calls, log, addCall, updateCall, deleteCall, exitCall, reopenCall, importCalls };
}
