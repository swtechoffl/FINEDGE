import { TrendingUp, TrendingDown } from "lucide-react";
import { useIndices } from "./useIndices";
import { cn } from "../../lib/utils";

export function IndicesBar() {
  const { indices } = useIndices();
  const entries = Object.values(indices);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border bg-surface-2 px-6 py-2">
      {entries.map((idx) => {
        const up = idx.changePct >= 0;
        return (
          <div key={idx.label} className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-foreground">{idx.label}</span>
            <span className="text-muted-foreground">{idx.price.toLocaleString("en-IN")}</span>
            <span className={cn("flex items-center gap-0.5 font-semibold", up ? "text-bullish" : "text-bearish")}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {up ? "+" : ""}
              {idx.changePct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
