import { useState } from "react";
import { Radio, ChevronDown, AlertTriangle } from "lucide-react";
import type { FeedStatusEntry } from "./useNewsFeed";
import { cn } from "../../lib/utils";

export function FeedHealth({ feedStatus }: { feedStatus: FeedStatusEntry[] }) {
  const [open, setOpen] = useState(false);
  if (feedStatus.length === 0) return null;

  const okCount = feedStatus.filter((f) => f.ok).length;
  const allOk = okCount === feedStatus.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "focus-ring flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-hover sm:px-3",
          allOk ? "text-bullish" : "text-neutral",
        )}
      >
        <Radio size={13} />
        <span className="hidden sm:inline">
          {okCount}/{feedStatus.length} feeds live
        </span>
        <ChevronDown
          size={12}
          className={cn("hidden transition-transform duration-200 ease-[var(--ease-out-expo)] sm:block", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="animate-scale-in fixed inset-x-3 top-16 z-20 mx-auto max-h-[70vh] w-auto max-w-80 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-none">
          {feedStatus.map((f) => (
            <div key={f.url} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs">
              <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", f.ok ? "bg-bullish" : "bg-bearish")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {f.source} · {f.label}
                  </span>
                  <span className="text-subtle-foreground">{f.ok ? `${f.count} items` : "failed"}</span>
                </div>
                {!f.ok && (
                  <div className="mt-0.5 flex items-start gap-1 text-bearish">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                    <span className="truncate">{f.error}</span>
                  </div>
                )}
                {f.status === "watch" && (
                  <div className="mt-0.5 text-[11px] text-neutral">
                    🔭 flagged for watch — see Data Sources for why
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
