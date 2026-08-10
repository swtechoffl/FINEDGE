import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";
import { computeResearchStats } from "./researchTrackerStats";
import { pctMoved } from "./researchTrackerMath";
import { callsToCsv, downloadCsv } from "./researchTrackerExport";
import type { ResearchCall } from "./researchTrackerTypes";

type ReportKind = "daily" | "monthly" | "custom";
const KINDS: ReportKind[] = ["daily", "monthly", "custom"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function currentMonthISO() {
  return todayISO().slice(0, 7);
}

function monthRange(monthValue: string) {
  const [y, m] = monthValue.split("-").map(Number);
  const start = `${monthValue}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this one
  const end = `${monthValue}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function toneClass(v: number | null) {
  if (v == null) return "text-foreground";
  return v >= 0 ? "text-bullish" : "text-bearish";
}
function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function StatTile({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">{label}</span>
      <span className={`text-lg font-semibold leading-tight ${className}`}>{value}</span>
    </div>
  );
}

// A period-scoped slice of the dashboard: calls given vs. calls closed
// within a day/month/custom range, and the CSV a research desk actually
// hands off (Excel, not this app, is where a "report" ultimately lives).
export function ResearchReportsPanel({ calls }: { calls: ResearchCall[] }) {
  const [kind, setKind] = useState<ReportKind>("daily");
  const [day, setDay] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthISO());
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(todayISO());

  const { start, end, title } = useMemo(() => {
    if (kind === "daily") {
      return { start: day, end: day, title: new Date(day).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) };
    }
    if (kind === "monthly") {
      const r = monthRange(month);
      return { ...r, title: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
    }
    return { start: customFrom, end: customTo, title: `${customFrom} → ${customTo}` };
  }, [kind, day, month, customFrom, customTo]);

  const callsGiven = useMemo(() => calls.filter((c) => c.callDate >= start && c.callDate <= end), [calls, start, end]);
  const callsClosed = useMemo(
    () => calls.filter((c) => c.status === "exited" && c.exitDate && c.exitDate >= start && c.exitDate <= end),
    [calls, start, end],
  );
  const stats = useMemo(() => computeResearchStats(callsClosed), [callsClosed]);

  function handleExport() {
    const union = new Map<string, ResearchCall>();
    [...callsGiven, ...callsClosed].forEach((c) => union.set(c.id, c));
    const csv = callsToCsv(Array.from(union.values()));
    downloadCsv(`stoqtrade-research-report-${kind}-${start}_to_${end}.csv`, csv);
  }

  const hasData = callsGiven.length > 0 || callsClosed.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                kind === k ? "bg-accent-bg text-accent" : "text-muted-foreground hover:bg-hover",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={!hasData}>
          <Download size={13} /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {kind === "daily" && (
          <Input type="date" value={day} max={todayISO()} onChange={(e) => setDay(e.target.value)} className="w-auto" />
        )}
        {kind === "monthly" && (
          <input
            type="month"
            value={month}
            max={currentMonthISO()}
            onChange={(e) => setMonth(e.target.value)}
            className="focus-ring h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground hover:border-border-strong"
          />
        )}
        {kind === "custom" && (
          <>
            <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="w-auto" />
            <span className="text-xs text-subtle-foreground">to</span>
            <Input type="date" value={customTo} min={customFrom} max={todayISO()} onChange={(e) => setCustomTo(e.target.value)} className="w-auto" />
          </>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 text-sm font-bold text-foreground">{title}</div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <StatTile label="Calls given" value={String(callsGiven.length)} />
          <StatTile label="Calls closed" value={String(callsClosed.length)} />
          <StatTile
            label="Win rate"
            value={stats.winRate == null ? "—" : `${stats.winRate.toFixed(0)}%`}
            className={toneClass(stats.winRate == null ? null : stats.winRate - 50)}
          />
          <StatTile label="Average return" value={fmtPct(stats.avgReturnPct)} className={toneClass(stats.avgReturnPct)} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle-foreground">
            Calls given ({callsGiven.length})
          </div>
          {callsGiven.length === 0 ? (
            <p className="text-xs text-subtle-foreground">No calls given in this period.</p>
          ) : (
            <Card className="divide-y divide-border overflow-hidden p-0">
              {callsGiven.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">{c.symbol}</span>
                  <span className="text-xs text-subtle-foreground">
                    {c.callType.toUpperCase()} @ ₹{c.recommendedPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle-foreground">
            Calls closed ({callsClosed.length})
          </div>
          {callsClosed.length === 0 ? (
            <p className="text-xs text-subtle-foreground">No calls closed in this period.</p>
          ) : (
            <Card className="divide-y divide-border overflow-hidden p-0">
              {callsClosed.map((c) => {
                const pnl = pctMoved(c, c.exitPrice!);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-semibold text-foreground">{c.symbol}</span>
                    <span className={`text-xs font-semibold ${pnl >= 0 ? "text-bullish" : "text-bearish"}`}>
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
