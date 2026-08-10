import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ResearchCall } from "./researchTrackerTypes";
import { pctMoved } from "./researchTrackerMath";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Captures the exit price/date that closes out an open call — confirming
// here is what flips the call to "exited" and hands off to the exit poster.
export function ResearchCallExitForm({
  call,
  livePrice,
  onClose,
  onConfirm,
}: {
  call: ResearchCall | null; // null = closed
  livePrice: number | null;
  onClose: () => void;
  onConfirm: (exitPrice: number, exitDate: string) => void;
}) {
  const [exitPrice, setExitPrice] = useState(0);
  const [exitDate, setExitDate] = useState(todayISO());

  useEffect(() => {
    if (!call) return;
    setExitPrice(livePrice ?? call.recommendedPrice);
    setExitDate(todayISO());
    // Only re-seed when a *different* call is opened for exit — livePrice
    // ticks as the price cache refreshes and shouldn't stomp on a value the
    // analyst is actively editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.id]);

  if (!call) return null;

  const previewPnl = exitPrice > 0 ? pctMoved(call, exitPrice) : 0;
  const up = previewPnl >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="animate-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-sm font-bold text-foreground">Exit {call.symbol}</span>
          <button
            onClick={onClose}
            className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Exit price</label>
              <Input
                type="number"
                step="0.05"
                min="0"
                value={exitPrice || ""}
                onChange={(e) => setExitPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Exit date</label>
              <Input
                type="date"
                value={exitDate}
                min={call.callDate}
                max={todayISO()}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${
              up ? "bg-bullish-bg text-bullish" : "bg-bearish-bg text-bearish"
            }`}
          >
            {up ? "+" : ""}
            {previewPnl.toFixed(2)}% {up ? "profit" : "loss"} on exit
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(exitPrice, exitDate)} disabled={exitPrice <= 0}>
            Confirm exit
          </Button>
        </div>
      </div>
    </div>
  );
}
