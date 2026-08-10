import { useCallback, useEffect, useState } from "react";
import type { ResearchCall, ResearchCallInput } from "./researchTrackerTypes";

const STORAGE_KEY = "stoqtrade-research-tracker-calls";

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

// Calls live in localStorage only — this app has no user database or
// per-analyst auth beyond the PIN gate, and every other bit of
// analyst-authored state (poster overrides, disclaimer settings, flowchart
// boards) follows the same local-only pattern, so a research call list does
// too rather than introducing the app's first server-side data store.
export function useResearchTracker() {
  const [calls, setCalls] = useState<ResearchCall[]>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calls));
    } catch {
      // localStorage unavailable (private browsing etc.) — edits just won't persist
    }
  }, [calls]);

  const addCall = useCallback((input: ResearchCallInput) => {
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
    return call.id;
  }, []);

  const updateCall = useCallback((id: string, patch: ResearchCallInput) => {
    setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)));
  }, []);

  const deleteCall = useCallback((id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const exitCall = useCallback((id: string, exitPrice: number, exitDate: string) => {
    setCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "exited", exitPrice, exitDate, updatedAt: Date.now() } : c)),
    );
  }, []);

  // Undo for an accidental/incorrect exit — puts the call back on the open
  // board without losing the rest of its history.
  const reopenCall = useCallback((id: string) => {
    setCalls((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "open", exitPrice: null, exitDate: null, updatedAt: Date.now() } : c,
      ),
    );
  }, []);

  return { calls, addCall, updateCall, deleteCall, exitCall, reopenCall };
}
