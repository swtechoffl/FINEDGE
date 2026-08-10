import type { ResearchCall } from "./researchTrackerTypes";

// % moved since the call, direction-aware: a sell/short call profits when
// price falls, so its sign is the mirror image of a buy call at the same
// reference price.
export function pctMoved(call: ResearchCall, referencePrice: number): number {
  if (!(call.recommendedPrice > 0)) return 0;
  const diff =
    call.callType === "buy" ? referencePrice - call.recommendedPrice : call.recommendedPrice - referencePrice;
  return (diff / call.recommendedPrice) * 100;
}

export function isTargetHit(call: ResearchCall, referencePrice: number): boolean {
  return call.callType === "buy" ? referencePrice >= call.targetPrice : referencePrice <= call.targetPrice;
}

export function isStopHit(call: ResearchCall, referencePrice: number): boolean {
  if (call.stopLoss == null) return false;
  return call.callType === "buy" ? referencePrice <= call.stopLoss : referencePrice >= call.stopLoss;
}
