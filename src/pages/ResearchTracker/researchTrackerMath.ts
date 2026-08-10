import type { ResearchCall } from "./researchTrackerTypes";

// Each helper below takes only the fields it actually reads (via Pick<>)
// rather than a full ResearchCall — that lets the bulk-import preview reuse
// the exact same math on ImportedCallRow (a call that doesn't have an id/
// createdAt yet) instead of a parallel copy.

// % moved since the call, direction-aware: a sell/short call profits when
// price falls, so its sign is the mirror image of a buy call at the same
// reference price.
export function pctMoved(call: Pick<ResearchCall, "callType" | "recommendedPrice">, referencePrice: number): number {
  if (!(call.recommendedPrice > 0)) return 0;
  const diff =
    call.callType === "buy" ? referencePrice - call.recommendedPrice : call.recommendedPrice - referencePrice;
  return (diff / call.recommendedPrice) * 100;
}

export function isTargetHit(call: Pick<ResearchCall, "callType" | "targetPrice">, referencePrice: number): boolean {
  return call.callType === "buy" ? referencePrice >= call.targetPrice : referencePrice <= call.targetPrice;
}

export function isStopHit(call: Pick<ResearchCall, "callType" | "stopLoss">, referencePrice: number): boolean {
  if (call.stopLoss == null) return false;
  return call.callType === "buy" ? referencePrice <= call.stopLoss : referencePrice >= call.stopLoss;
}

// A call's current "mark" — the live price while it's open, the locked-in
// exit price once it's closed. Shared by the card (single call), the
// dashboard (aggregated across all calls), and the bulk-import preview so
// all three price a call the same way.
export function referencePriceFor(call: Pick<ResearchCall, "status" | "exitPrice">, livePrice: number | null): number | null {
  return call.status === "open" ? livePrice : call.exitPrice;
}
