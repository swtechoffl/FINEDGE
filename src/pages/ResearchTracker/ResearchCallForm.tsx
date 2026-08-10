import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { cn } from "../../lib/utils";
import { SECTORS } from "../../data/mock";
import { isValidSymbol } from "./researchTrackerValidation";
import type { CallType, ResearchCallInput } from "./researchTrackerTypes";

// Same curated symbol universe the rest of the app (Sector Heat Map, ticker
// matching) uses — offered as a datalist so entry is fast without limiting
// the field to only these names (any NSE symbol still works, same as the
// Stock Detail page).
const ALL_SYMBOLS = Array.from(new Map(SECTORS.flatMap((s) => s.stocks).map((s) => [s.symbol, s])).values()).sort(
  (a, b) => a.symbol.localeCompare(b.symbol),
);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): ResearchCallInput {
  return {
    symbol: "",
    companyName: "",
    callType: "buy",
    callDate: todayISO(),
    recommendedPrice: 0,
    targetPrice: 0,
    stopLoss: null,
    notes: "",
  };
}

export function ResearchCallForm({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: ResearchCallInput | null; // null = "add" mode, otherwise editing this call
  onClose: () => void;
  onSubmit: (input: ResearchCallInput) => void;
}) {
  const [draft, setDraft] = useState<ResearchCallInput>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(
      initial
        ? {
            symbol: initial.symbol,
            companyName: initial.companyName,
            callType: initial.callType,
            callDate: initial.callDate,
            recommendedPrice: initial.recommendedPrice,
            targetPrice: initial.targetPrice,
            stopLoss: initial.stopLoss,
            notes: initial.notes,
          }
        : emptyDraft(),
    );
  }, [open, initial]);

  if (!open) return null;

  const isEdit = initial !== null;
  const trimmedSymbol = draft.symbol.trim();
  const symbolInvalid = trimmedSymbol !== "" && !isValidSymbol(trimmedSymbol);
  const canSave = trimmedSymbol !== "" && !symbolInvalid && draft.recommendedPrice > 0 && draft.targetPrice > 0;

  function set<K extends keyof ResearchCallInput>(key: K, value: ResearchCallInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSymbolBlur() {
    const symbol = draft.symbol.trim().toUpperCase();
    const known = ALL_SYMBOLS.find((s) => s.symbol === symbol);
    setDraft((d) => ({ ...d, symbol, companyName: d.companyName || known?.name || d.companyName }));
  }

  function handleSave() {
    if (!canSave) return;
    onSubmit({ ...draft, symbol: draft.symbol.trim().toUpperCase(), companyName: draft.companyName.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="animate-scale-in flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-sm font-bold text-foreground">{isEdit ? "Edit Research Call" : "Add Research Call"}</span>
          <button
            onClick={onClose}
            className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Symbol</label>
                <Input
                  value={draft.symbol}
                  onChange={(e) => set("symbol", e.target.value.toUpperCase())}
                  onBlur={handleSymbolBlur}
                  placeholder="e.g. TCS"
                  list="research-tracker-symbols"
                  aria-invalid={symbolInvalid}
                  className={symbolInvalid ? "border-bearish" : undefined}
                />
                <datalist id="research-tracker-symbols">
                  {ALL_SYMBOLS.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.name}
                    </option>
                  ))}
                </datalist>
                {symbolInvalid && (
                  <p className="mt-1 text-[11px] text-bearish">Letters, numbers, & or - only, up to 20 characters.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Company name</label>
                <Input
                  value={draft.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Call type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["buy", "sell"] as CallType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("callType", t)}
                    className={cn(
                      "focus-ring rounded-lg border py-2 text-sm font-semibold uppercase transition-colors",
                      draft.callType === t
                        ? t === "buy"
                          ? "border-bullish bg-bullish-bg text-bullish"
                          : "border-bearish bg-bearish-bg text-bearish"
                        : "border-border text-muted-foreground hover:bg-hover",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Call date</label>
                <Input
                  type="date"
                  value={draft.callDate}
                  max={todayISO()}
                  onChange={(e) => set("callDate", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Recommended price</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={draft.recommendedPrice || ""}
                  onChange={(e) => set("recommendedPrice", Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Target price</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={draft.targetPrice || ""}
                  onChange={(e) => set("targetPrice", Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Stop loss (optional)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={draft.stopLoss ?? ""}
                  onChange={(e) => set("stopLoss", e.target.value ? Number(e.target.value) : null)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Rationale, triggers, anything worth remembering later…"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {isEdit ? "Save changes" : "Add call"}
          </Button>
        </div>
      </div>
    </div>
  );
}
