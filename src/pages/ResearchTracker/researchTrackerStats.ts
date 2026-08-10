import { isStopHit, isTargetHit, pctMoved } from "./researchTrackerMath";
import type { ResearchCall } from "./researchTrackerTypes";
import type { CallQuote } from "./useResearchQuotes";

export interface CallReturn {
  call: ResearchCall;
  pnl: number;
}

export interface ResearchStats {
  totalCalls: number;
  activeCalls: number;
  closedCalls: number;
  winningCalls: number;
  losingCalls: number;
  winRate: number | null; // % of closed calls that closed in profit
  avgReturnPct: number | null; // mean P&L% across closed calls
  medianReturnPct: number | null; // median P&L% across closed calls
  bestCall: CallReturn | null;
  worstCall: CallReturn | null;
  avgHoldingDays: number | null; // mean days between call date and exit date
  targetHitRate: number | null; // % of closed calls whose exit price reached target
  stopHitRate: number | null; // % of closed calls whose exit price breached the stop
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function holdingDays(call: ResearchCall): number {
  return Math.max(0, (+new Date(call.exitDate!) - +new Date(call.callDate)) / 86_400_000);
}

// Every figure here is realized-performance-only (closed calls) — an open
// call's P&L is still moving and mixing it in would make win rate/avg
// return jump around with the market rather than reflect actual track
// record, the whole point of a "how has this analyst done" dashboard.
export function computeResearchStats(calls: ResearchCall[]): ResearchStats {
  const closed = calls.filter((c) => c.status === "exited" && c.exitPrice != null && c.exitDate != null);
  const returns: CallReturn[] = closed.map((call) => ({ call, pnl: pctMoved(call, call.exitPrice!) }));

  const winning = returns.filter((r) => r.pnl > 0);
  const losing = returns.filter((r) => r.pnl < 0);
  const targetHits = closed.filter((c) => isTargetHit(c, c.exitPrice!));
  const stopHits = closed.filter((c) => isStopHit(c, c.exitPrice!));

  const best = returns.reduce<CallReturn | null>((acc, r) => (!acc || r.pnl > acc.pnl ? r : acc), null);
  const worst = returns.reduce<CallReturn | null>((acc, r) => (!acc || r.pnl < acc.pnl ? r : acc), null);

  return {
    totalCalls: calls.length,
    activeCalls: calls.filter((c) => c.status === "open").length,
    closedCalls: closed.length,
    winningCalls: winning.length,
    losingCalls: losing.length,
    winRate: closed.length > 0 ? (winning.length / closed.length) * 100 : null,
    avgReturnPct: returns.length > 0 ? returns.reduce((sum, r) => sum + r.pnl, 0) / returns.length : null,
    medianReturnPct: median(returns.map((r) => r.pnl)),
    bestCall: best,
    worstCall: worst,
    avgHoldingDays: closed.length > 0 ? closed.reduce((sum, c) => sum + holdingDays(c), 0) / closed.length : null,
    targetHitRate: closed.length > 0 ? (targetHits.length / closed.length) * 100 : null,
    stopHitRate: closed.length > 0 ? (stopHits.length / closed.length) * 100 : null,
  };
}

export type AttentionReason = "stop" | "target" | "drawdown";

export interface AttentionItem {
  call: ResearchCall;
  reason: AttentionReason;
  label: string;
  pnl: number;
}

// An open call that's underwater by this much with no stop-loss set is
// flagged even though nothing "triggered" — there's no stop to trigger, so
// silence would just mean nobody's watching it.
const DRAWDOWN_ATTENTION_THRESHOLD = -10;

// Open calls whose price has moved somewhere actionable — hit the target
// (book profit), breached the stop (cut the loss), or drifted deep
// underwater with no stop set at all (needs a decision, not just a graph).
// Closed calls are excluded — there's nothing left to act on.
export function computeAttentionItems(calls: ResearchCall[], quotes: Record<string, CallQuote>): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const call of calls) {
    if (call.status !== "open") continue;
    const price = quotes[call.symbol]?.price;
    if (price == null) continue;
    const pnl = pctMoved(call, price);
    if (isStopHit(call, price)) {
      items.push({ call, reason: "stop", label: "Stop-loss breached", pnl });
    } else if (isTargetHit(call, price)) {
      items.push({ call, reason: "target", label: "Target reached", pnl });
    } else if (call.stopLoss == null && pnl <= DRAWDOWN_ATTENTION_THRESHOLD) {
      items.push({ call, reason: "drawdown", label: "Down sharply, no stop set", pnl });
    }
  }
  // Most urgent first — a breached stop is bleeding money right now, a hit
  // target is time-sensitive upside, a slow drawdown is the least urgent of
  // the three. Within a group, the worst-moved call surfaces first.
  const urgency: Record<AttentionReason, number> = { stop: 0, target: 1, drawdown: 2 };
  return items.sort((a, b) => urgency[a.reason] - urgency[b.reason] || a.pnl - b.pnl);
}
