import { useMemo, useState } from "react";
import { Plus, Pencil, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge, type BadgeProps } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";
import type { LogAction, LogEntry } from "./researchTrackerLog";

const ACTION_FILTERS: (LogAction | "all")[] = ["all", "created", "updated", "exited", "reopened", "deleted"];

const ACTION_META: Record<LogAction, { label: string; icon: typeof Plus; badge: BadgeProps["variant"] }> = {
  created: { label: "Added", icon: Plus, badge: "accent" },
  updated: { label: "Edited", icon: Pencil, badge: "default" },
  exited: { label: "Exited", icon: LogOut, badge: "neutral" },
  reopened: { label: "Reopened", icon: RotateCcw, badge: "default" },
  deleted: { label: "Deleted", icon: Trash2, badge: "bearish" },
};

function fmtWhen(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A combined activity feed of every add/edit/exit/reopen/delete across all
// calls — this app's "Call History" (filter by symbol), "Change Log"
// (field-level diffs on edits), and "System Events" all collapse into one
// feed since there's no separate multi-user system generating events
// distinct from an analyst's own actions on a call.
export function ResearchAuditPanel({ log }: { log: LogEntry[] }) {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<LogAction | "all">("all");

  const filtered = useMemo(() => {
    const query = symbolFilter.trim().toUpperCase();
    return log.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (query && !entry.symbol.includes(query)) return false;
      return true;
    });
  }, [log, symbolFilter, actionFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          placeholder="Filter by symbol…"
          className="w-40"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {ACTION_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setActionFilter(key)}
              className={cn(
                "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                actionFilter === key ? "bg-accent-bg text-accent" : "text-muted-foreground hover:bg-hover",
              )}
            >
              {key === "all" ? "All" : ACTION_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {log.length === 0 ? "No activity yet — actions on calls will show up here." : "No activity matches your filters."}
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {filtered.map((entry) => {
            const meta = ACTION_META[entry.action];
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chip">
                  <Icon size={13} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">{entry.symbol}</span>
                    <Badge size="sm" variant={meta.badge}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.summary}</p>
                  {entry.changes && entry.changes.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="text-[11px] text-subtle-foreground">
                          <span className="font-medium text-muted-foreground">{c.field}:</span> {c.from} → {c.to}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10px] text-subtle-foreground">{fmtWhen(entry.timestamp)}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
