import { useMemo, useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";
import { useResearchTracker } from "./useResearchTracker";
import { useResearchQuotes } from "./useResearchQuotes";
import { ResearchCallCard } from "./ResearchCallCard";
import { ResearchCallForm } from "./ResearchCallForm";
import { ResearchCallExitForm } from "./ResearchCallExitForm";
import { ResearchExitPosterModal } from "./ResearchExitPosterModal";
import { ResearchDashboard } from "./ResearchDashboard";
import { computeAttentionItems, computeResearchStats } from "./researchTrackerStats";
import type { ResearchCall, ResearchCallInput } from "./researchTrackerTypes";

type FilterKey = "all" | "open" | "exited";
const FILTERS: FilterKey[] = ["all", "open", "exited"];

export function ResearchTrackerPage() {
  const { calls, addCall, updateCall, deleteCall, exitCall, reopenCall } = useResearchTracker();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [formCallId, setFormCallId] = useState<string | null | undefined>(undefined); // undefined = closed, null = add mode, id = edit mode
  const [exitTarget, setExitTarget] = useState<ResearchCall | null>(null);
  const [posterCall, setPosterCall] = useState<ResearchCall | null>(null);

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

  function handleDelete(call: ResearchCall) {
    if (window.confirm(`Delete the ${call.symbol} call? This can't be undone.`)) deleteCall(call.id);
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="research tracker"
        meta={`${openCount} open · ${calls.length} total`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search symbol, company, notes…"
        extra={
          <Button size="sm" onClick={() => setFormCallId(null)}>
            <Plus size={14} /> Add Call
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <ResearchDashboard stats={stats} attention={attention} onResolveAttention={(call) => setExitTarget(call)} />

        <div className="mb-4 flex items-center gap-1.5">
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
                onDelete={() => handleDelete(call)}
                onExit={() => setExitTarget(call)}
                onReopen={() => reopenCall(call.id)}
                onViewPoster={() => setPosterCall(call)}
              />
            ))}
          </div>
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
    </div>
  );
}
