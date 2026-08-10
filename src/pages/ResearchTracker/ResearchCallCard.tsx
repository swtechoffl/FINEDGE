import { Pencil, Trash2, LogOut, Image as ImageIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ResearchCallChart } from "./ResearchCallChart";
import { pctMoved, isTargetHit, isStopHit, referencePriceFor } from "./researchTrackerMath";
import type { ResearchCall } from "./researchTrackerTypes";
import type { CallQuote } from "./useResearchQuotes";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function ResearchCallCard({
  call,
  quote,
  onEdit,
  onDelete,
  onExit,
  onReopen,
  onViewPoster,
}: {
  call: ResearchCall;
  quote: CallQuote | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onExit: () => void;
  onReopen: () => void;
  onViewPoster: () => void;
}) {
  const isOpen = call.status === "open";
  const referencePrice = referencePriceFor(call, quote?.price ?? null);
  const pnl = referencePrice != null ? pctMoved(call, referencePrice) : null;
  const up = (pnl ?? 0) >= 0;
  const targetHit = isOpen && referencePrice != null && isTargetHit(call, referencePrice);
  const stopHit = isOpen && referencePrice != null && isStopHit(call, referencePrice);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-base font-extrabold tracking-tight text-foreground">{call.symbol}</span>
          <Badge variant={call.callType === "buy" ? "bullish" : "bearish"}>{call.callType.toUpperCase()}</Badge>
          <Badge variant={isOpen ? "accent" : "default"}>{isOpen ? "Open" : "Exited"}</Badge>
          {targetHit && <Badge variant="bullish">Target hit</Badge>}
          {stopHit && <Badge variant="bearish">Stop hit</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="iconSm" title="Edit" onClick={onEdit}>
            <Pencil size={13} />
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            title="Delete"
            onClick={onDelete}
            className="hover:border-bearish hover:text-bearish"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {call.companyName && <p className="-mt-2 truncate text-xs text-subtle-foreground">{call.companyName}</p>}

      <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-surface-2 p-2 text-center">
        <div>
          <div className="text-[10px] font-medium uppercase text-subtle-foreground">Recommended</div>
          <div className="text-sm font-bold text-foreground">{fmtPrice(call.recommendedPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-subtle-foreground">Target</div>
          <div className="text-sm font-bold text-foreground">{fmtPrice(call.targetPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-subtle-foreground">{isOpen ? "Current" : "Exit"}</div>
          <div className="text-sm font-bold text-foreground">{referencePrice != null ? fmtPrice(referencePrice) : "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase text-subtle-foreground">Moved</div>
          <div
            className={`flex items-center justify-center gap-0.5 text-sm font-bold ${
              pnl == null ? "text-subtle-foreground" : up ? "text-bullish" : "text-bearish"
            }`}
          >
            {pnl != null && (up ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
            {pnl != null ? `${up ? "+" : ""}${pnl.toFixed(2)}%` : quote?.loading ? "…" : "—"}
          </div>
        </div>
      </div>

      <ResearchCallChart
        history={quote?.history ?? []}
        callDate={call.callDate}
        exitDate={call.exitDate}
        entryPrice={call.recommendedPrice}
        targetPrice={call.targetPrice}
        up={call.callType === "buy"}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-subtle-foreground">
        <span>
          Called {fmtDate(call.callDate)}
          {call.exitDate && ` → Exited ${fmtDate(call.exitDate)}`}
        </span>
        {isOpen ? (
          <Button size="sm" variant="outline" onClick={onExit}>
            <LogOut size={13} /> Mark exited
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onViewPoster}>
              <ImageIcon size={13} /> View poster
            </Button>
            <Button size="sm" variant="ghost" onClick={onReopen} className="text-subtle-foreground">
              Reopen
            </Button>
          </div>
        )}
      </div>

      {call.notes && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{call.notes}</p>
      )}
    </Card>
  );
}
