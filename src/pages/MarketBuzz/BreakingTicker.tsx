import type { NewsItem } from "../../types";
import { Badge } from "../../components/ui/Badge";

export function BreakingTicker({ items: breakingItems }: { items: NewsItem[] }) {
  const items = breakingItems.length > 0 ? [...breakingItems, ...breakingItems] : [];

  return (
    <div className="flex items-center border-b border-border bg-surface">
      <div className="z-10 flex shrink-0 items-center gap-2 bg-bearish-bg px-4 py-2.5 text-xs font-bold tracking-wide text-bearish">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse-dot h-2 w-2 rounded-full bg-bearish" />
        </span>
        BREAKING
      </div>
      <div className="relative flex-1 overflow-hidden py-2.5">
        {items.length === 0 ? (
          <div className="px-1 text-sm text-subtle-foreground">No high-impact stories in the current window.</div>
        ) : (
          <div className="animate-marquee flex w-max items-center gap-3 whitespace-nowrap">
            {items.map((item, i) => (
              <span key={`${item.id}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="text-foreground">{item.headline}</span>
                {item.tickers.slice(0, 1).map((t) => (
                  <Badge key={t.symbol} variant={t.changePct >= 0 ? "bullish" : "bearish"} size="md">
                    {t.symbol} {t.changePct >= 0 ? "+" : ""}
                    {t.changePct}%
                  </Badge>
                ))}
                <span className="text-subtle-foreground">|</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
