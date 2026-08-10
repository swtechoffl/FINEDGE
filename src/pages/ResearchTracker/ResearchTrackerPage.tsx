import { useMemo, useState } from "react";
import { Plus, Upload, ClipboardList, ListChecks, X, Trash2 } from "lucide-react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Checkbox";
import { cn } from "../../lib/utils";
import { useResearchTracker } from "./useResearchTracker";
import { useResearchQuotes } from "./useResearchQuotes";
import { ResearchCallCard, callCardAnchorId } from "./ResearchCallCard";
import { ResearchOpenCallsHeatmap } from "./ResearchOpenCallsHeatmap";
import { ResearchCallForm } from "./ResearchCallForm";
import { ResearchCallExitForm } from "./ResearchCallExitForm";
import { ResearchExitPosterModal } from "./ResearchExitPosterModal";
import { ResearchDashboard } from "./ResearchDashboard";
import { ResearchReportsPanel } from "./ResearchReportsPanel";
import { ResearchAuditPanel } from "./ResearchAuditPanel";
import { ResearchBulkImportModal } from "./ResearchBulkImportModal";
import { ResearchConfirmDialog } from "./ResearchConfirmDialog";
import { computeAttentionItems, computeResearchStats } from "./researchTrackerStats";
import type { ResearchCall, ResearchCallInput } from "./researchTrackerTypes";

type FilterKey = "all" | "open" | "exited";
const FILTERS: FilterKey[] = ["all", "open", "exited"];

type ViewKey = "calls" | "reports" | "audit";
const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "calls", label: "Calls" },
  { key: "reports", label: "Reports" },
  { key: "audit", label: "Audit" },
];

type DeleteRequest = { kind: "single"; call: ResearchCall } | { kind: "bulk"; ids: string[] };

export function ResearchTrackerPage() {
  const { calls, log, addCall, updateCall, deleteCall, deleteCalls, exitCall, reopenCall, importCalls } =
    useResearchTracker();
  const [view, setView] = useState<ViewKey>("calls");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [formCallId, setFormCallId] = useState<string | null | undefined>(undefined); // undefined = closed, null = add mode, id = edit mode
  const [exitTarget, setExitTarget] = useState<ResearchCall | null>(null);
  const [posterCall, setPosterCall] = useState<ResearchCall | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [highlightedCallId, setHighlightedCallId] = useState<string | null>(null);

  const symbols = useMemo(() => calls.map((c) => c.symbol), [calls]);
  const quotes = useResearchQuotes(symbols);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!query) return true;
      return [c.symbol, c.companyName, c.notes].join(" ").toLowerCase().includes(query);
    });
  }, [calls, filter, search]);

  const openCount = calls.filter((c) => c.status === "open").length;
  const editingCall = formCallId ? calls.find((c) => c.id === formCallId) ?? null : null;
  const stats = useMemo(() => computeResearchStats(calls), [calls]);
  const attention = useMemo(() => computeAttentionItems(calls, quotes), [calls, quotes]);

  function handleSubmit(input: ResearchCallInput) {
    if (formCallId) updateCall(formCallId, input);
    else addCall(input);
    setFormCallId(undefined);
  }

  function handleExitConfirm(exitPrice: number, exitDate: string) {
    if (!exitTarget) return;
    exitCall(exitTarget.id, exitPrice, exitDate);
    // Hand straight off to the exit poster with the just-closed values —
    // the tracker's own state update above is async, so this builds the
    // poster's call object directly rather than waiting on a re-render.
    setPosterCall({ ...exitTarget, status: "exited", exitPrice, exitDate });
    setExitTarget(null);
  }

  function toggleSelectionMode() {
    setSelectionMode((on) => !on);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  function handleConfirmDelete() {
    if (!deleteRequest) return;
    if (deleteRequest.kind === "single") {
      deleteCall(deleteRequest.call.id);
    } else {
      deleteCalls(deleteRequest.ids);
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
    setDeleteRequest(null);
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const openFiltered = useMemo(() => filtered.filter((c) => c.status === "open"), [filtered]);

  // The heatmap is a navigator, not its own view — jump to the matching
  // full card (chart, edit/exit/delete) and give it a brief highlight ring
  // so it's obvious which one the click landed on.
  function handleHeatmapTileClick(id: string) {
    const el = document.getElementById(callCardAnchorId(id));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedCallId(id);
    window.setTimeout(() => setHighlightedCallId((current) => (current === id ? null : current)), 1800);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="research tracker"
        meta={`${openCount} open · ${calls.length} total`}
        searchValue={view === "calls" ? search : undefined}
        onSearchChange={view === "calls" ? setSearch : undefined}
        searchPlaceholder="Search symbol, company, notes…"
        extra={
          <div className="flex items-center gap-2">
            {view === "calls" && (
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                {selectionMode ? <X size={14} /> : <ListChecks size={14} />}
                <span className="hidden sm:inline">{selectionMode ? "Cancel" : "Select"}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> <span className="hidden sm:inline">Bulk Upload</span>
            </Button>
            <Button size="sm" onClick={() => setFormCallId(null)}>
              <Plus size={14} /> Add Call
            </Button>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 border-b border-border">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "focus-ring -mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                view === key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "reports" && <ResearchReportsPanel calls={calls} />}
        {view === "audit" && <ResearchAuditPanel log={log} />}

        {view === "calls" && (
          <>
            <ResearchDashboard stats={stats} attention={attention} onResolveAttention={(call) => setExitTarget(call)} />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {FILTERS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                      filter === key ? "bg-accent-bg text-accent" : "text-muted-foreground hover:bg-hover",
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {selectionMode && (
                <div className="flex items-center gap-3">
                  <div
                    role="button"
                    tabIndex={-1}
                    onClick={() => (allVisibleSelected ? setSelectedIds(new Set()) : selectAllVisible())}
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {/* Click handled by the wrapping div (bubbles from here too) — a nested
                        onCheckedChange would double-fire on every click. */}
                    <Checkbox checked={allVisibleSelected} onCheckedChange={() => {}} />
                    {allVisibleSelected ? "Clear all" : `Select all (${filtered.length})`}
                  </div>
                  <Button
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setDeleteRequest({ kind: "bulk", ids: Array.from(selectedIds) })}
                    className="bg-bearish text-white hover:bg-bearish/90 disabled:opacity-40"
                  >
                    <Trash2 size={13} /> Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                  </Button>
                </div>
              )}
            </div>

            {!selectionMode && (
              <ResearchOpenCallsHeatmap calls={openFiltered} quotes={quotes} onTileClick={handleHeatmapTileClick} />
            )}

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
                <ClipboardList size={28} className="text-subtle-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  {calls.length === 0 ? "No research calls yet — add your first one." : "No calls match your filters."}
                </p>
                {calls.length === 0 && (
                  <Button size="sm" onClick={() => setFormCallId(null)}>
                    <Plus size={14} /> Add Call
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.map((call) => (
                  <ResearchCallCard
                    key={call.id}
                    call={call}
                    quote={quotes[call.symbol]}
                    onEdit={() => setFormCallId(call.id)}
                    onDelete={() => setDeleteRequest({ kind: "single", call })}
                    onExit={() => setExitTarget(call)}
                    onReopen={() => reopenCall(call.id)}
                    onViewPoster={() => setPosterCall(call)}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(call.id)}
                    onToggleSelect={() => toggleSelected(call.id)}
                    highlighted={highlightedCallId === call.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ResearchCallForm
        open={formCallId !== undefined}
        initial={editingCall}
        onClose={() => setFormCallId(undefined)}
        onSubmit={handleSubmit}
      />

      <ResearchCallExitForm
        call={exitTarget}
        livePrice={exitTarget ? quotes[exitTarget.symbol]?.price ?? null : null}
        onClose={() => setExitTarget(null)}
        onConfirm={handleExitConfirm}
      />

      {posterCall && (
        <ResearchExitPosterModal
          call={posterCall}
          history={quotes[posterCall.symbol]?.history ?? []}
          onClose={() => setPosterCall(null)}
        />
      )}

      <ResearchBulkImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={importCalls} />

      <ResearchConfirmDialog
        open={deleteRequest !== null}
        title={deleteRequest?.kind === "bulk" ? "Delete selected calls" : "Delete call"}
        message={
          deleteRequest?.kind === "bulk"
            ? `Delete ${deleteRequest.ids.length} selected call${deleteRequest.ids.length === 1 ? "" : "s"}? This can't be undone.`
            : deleteRequest?.kind === "single"
              ? `Delete the ${deleteRequest.call.symbol} call? This can't be undone.`
              : ""
        }
        onCancel={() => setDeleteRequest(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
