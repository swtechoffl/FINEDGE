import { AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import type { AttentionItem, ResearchStats } from "./researchTrackerStats";
import type { ResearchCall } from "./researchTrackerTypes";

function fmtPct(v: number | null, digits = 1) {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function toneClass(v: number | null, goodWhenPositive = true) {
  if (v == null) return "text-foreground";
  const positive = goodWhenPositive ? v >= 0 : v < 0;
  return positive ? "text-bullish" : "text-bearish";
}

// Stat tile per the dataviz "figure" contract: sentence-case label with no
// trailing colon, semibold proportional-figure value (never tabular-nums —
// that's only for columns that must align), signed color where the sign
// carries meaning.
function StatTile({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">{label}</span>
      <span className={`text-lg font-semibold leading-tight ${className}`}>{value}</span>
    </div>
  );
}

function BestWorstTile({ label, entry }: { label: string; entry: { call: ResearchCall; pnl: number } | null }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">{label}</span>
      {entry ? (
        <span className="flex items-baseline gap-1.5 leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">{entry.call.symbol}</span>
          <span className={`text-lg font-semibold ${toneClass(entry.pnl)}`}>{fmtPct(entry.pnl)}</span>
        </span>
      ) : (
        <span className="text-lg font-semibold text-subtle-foreground">—</span>
      )}
    </div>
  );
}

// Overall track record (closed calls only — see researchTrackerStats.ts)
// plus a "needs attention" panel for open calls whose price has moved
// somewhere actionable. Sits above the call list as this page's dashboard.
export function ResearchDashboard({
  stats,
  attention,
  onResolveAttention,
}: {
  stats: ResearchStats;
  attention: AttentionItem[];
  onResolveAttention: (call: ResearchCall) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-5">
          <StatTile label="Total calls" value={String(stats.totalCalls)} className="text-foreground" />
          <StatTile label="Active calls" value={String(stats.activeCalls)} className="text-foreground" />
          <StatTile label="Closed calls" value={String(stats.closedCalls)} className="text-foreground" />
          <StatTile label="Winning calls" value={String(stats.winningCalls)} className="text-bullish" />
          <StatTile label="Losing calls" value={String(stats.losingCalls)} className="text-bearish" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-5">
          <StatTile
            label="Win rate"
            value={stats.winRate == null ? "—" : `${stats.winRate.toFixed(0)}%`}
            className={toneClass(stats.winRate == null ? null : stats.winRate - 50)}
          />
          <StatTile
            label="Target hit rate"
            value={stats.targetHitRate == null ? "—" : `${stats.targetHitRate.toFixed(0)}%`}
          />
          <StatTile
            label="Stop-loss hit rate"
            value={stats.stopHitRate == null ? "—" : `${stats.stopHitRate.toFixed(0)}%`}
          />
          <StatTile label="Average return" value={fmtPct(stats.avgReturnPct)} className={toneClass(stats.avgReturnPct)} />
          <StatTile
            label="Median return"
            value={fmtPct(stats.medianReturnPct)}
            className={toneClass(stats.medianReturnPct)}
          />
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border sm:grid-cols-3">
          <StatTile
            label="Avg holding period"
            value={stats.avgHoldingDays == null ? "—" : `${stats.avgHoldingDays.toFixed(1)}d`}
            className="text-foreground"
          />
          <BestWorstTile label="Best call" entry={stats.bestCall} />
          <BestWorstTile label="Worst call" entry={stats.worstCall} />
        </div>
      </Card>

      {attention.length > 0 && (
        <Card className="overflow-hidden border-bearish/30">
          <div className="flex items-center gap-2 border-b border-border bg-bearish-bg px-4 py-2.5">
            <AlertTriangle size={14} className="text-bearish" />
            <span className="text-xs font-bold uppercase tracking-wide text-bearish">
              Needs attention · {attention.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {attention.map(({ call, label, pnl }) => (
              <button
                key={call.id}
                onClick={() => onResolveAttention(call)}
                className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm font-bold text-foreground">{call.symbol}</span>
                  <span className="truncate text-xs text-subtle-foreground">{label}</span>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${toneClass(pnl)}`}>{fmtPct(pnl, 2)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
