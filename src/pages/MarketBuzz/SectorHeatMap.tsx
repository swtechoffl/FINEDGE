import { useMemo } from "react";
import type { NewsItem } from "../../types";
import { SECTORS } from "../../data/mock";
import { cn } from "../../lib/utils";

function sectorSentimentScore(items: NewsItem[]) {
  if (items.length === 0) return 0;
  const score = items.reduce((acc, n) => {
    if (n.signal === "bullish") return acc + 1;
    if (n.signal === "bearish") return acc - 1;
    return acc;
  }, 0);
  return score / items.length;
}

export function SectorHeatMap({ allNews }: { allNews: NewsItem[] }) {
  const tiles = useMemo(() => {
    return SECTORS.map((sector) => {
      const items = allNews.filter((n) => n.sector === sector.name);
      const score = sectorSentimentScore(items);
      return { name: sector.name, count: items.length, score };
    });
  }, [allNews]);

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
        Sector Heat Map
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const tone =
            tile.count === 0 ? "neutral0" : tile.score > 0.15 ? "bullish" : tile.score < -0.15 ? "bearish" : "neutral";
          return (
            <div
              key={tile.name}
              className={cn(
                "cursor-default rounded-lg px-2.5 py-2 transition-all duration-150 ease-[var(--ease-out-expo)] hover:scale-[1.04] hover:shadow-sm",
                tone === "neutral0" && "bg-surface-2 text-subtle-foreground",
                tone === "bullish" && "bg-bullish-bg text-bullish",
                tone === "bearish" && "bg-bearish-bg text-bearish",
                tone === "neutral" && "bg-neutral-bg text-neutral",
              )}
              title={tile.name}
            >
              <div className="truncate text-xs font-semibold">{tile.name}</div>
              <div className="text-[11px] opacity-85">{tile.count} news</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bearish" />
          Bearish
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bullish" />
          Bullish
        </span>
      </div>
    </div>
  );
}
