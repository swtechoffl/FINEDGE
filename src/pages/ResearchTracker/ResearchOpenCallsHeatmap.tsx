import { useMemo } from "react";
import { pctMoved } from "./researchTrackerMath";
import type { ResearchCall } from "./researchTrackerTypes";
import type { CallQuote } from "./useResearchQuotes";

// A move this size or bigger reaches full color intensity — bigger moves
// still render, they just don't get an even-more-saturated tile past this
// point (a clamped scale reads better than one blown out by one outlier).
const INTENSITY_CAP_PCT = 15;
const MIN_ALPHA = 0.12;
const MAX_ALPHA = 0.92;
// Past this blended alpha the tile reads as a solid, saturated fill —
// symbol/% text switches to white to stay legible on it.
const WHITE_TEXT_ALPHA_THRESHOLD = 0.5;

// Both sections share this exact column count — a single grid (not two
// independent ones) so every tile, profit or loss, lands on the same
// column tracks and the whole thing reads as one aligned matrix.
const GRID_COLS = "grid-cols-4 sm:grid-cols-5 md:grid-cols-6";

interface HeatmapEntry {
  call: ResearchCall;
  pnl: number;
}

function HeatmapTile({ entry, hue, onClick }: { entry: HeatmapEntry; hue: "bullish" | "bearish"; onClick: () => void }) {
  const alpha = MIN_ALPHA + (Math.min(Math.abs(entry.pnl), INTENSITY_CAP_PCT) / INTENSITY_CAP_PCT) * (MAX_ALPHA - MIN_ALPHA);
  const white = alpha >= WHITE_TEXT_ALPHA_THRESHOLD;

  return (
    <button
      onClick={onClick}
      title={`${entry.call.symbol} · ${entry.pnl >= 0 ? "+" : ""}${entry.pnl.toFixed(2)}% — click to view`}
      className="focus-ring flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center transition-transform duration-150 ease-[var(--ease-out-expo)] hover:scale-[1.04] hover:shadow-sm"
      style={{
        background: `color-mix(in srgb, var(--${hue}) ${Math.round(alpha * 100)}%, var(--bg-surface))`,
        color: white ? "#ffffff" : `var(--${hue})`,
      }}
    >
      <span className="w-full truncate text-xs font-bold">{entry.call.symbol}</span>
      <span className="text-[11px] font-semibold opacity-90">
        {entry.pnl >= 0 ? "+" : ""}
        {entry.pnl.toFixed(1)}%
      </span>
    </button>
  );
}

function SectionLabel({ title, hue, count }: { title: string; hue: "bullish" | "bearish"; count: number }) {
  return (
    <div
      className={`col-span-full mt-2 text-[11px] font-bold uppercase tracking-wide first:mt-0 ${
        hue === "bullish" ? "text-bullish" : "text-bearish"
      }`}
    >
      {title} · {count}
    </div>
  );
}

// A compact market-heatmap-style overview of open calls only — deeper shade
// = bigger move, split into an "In Profit" and "In Loss" group within one
// continuous, square-tiled grid (not two separately-sized grids), so tiles
// line up column-for-column across both. Purely a navigator: it carries no
// actions of its own, clicking a tile scrolls to and briefly highlights
// that call's full card (with its chart and edit/exit/delete controls)
// further down the page.
export function ResearchOpenCallsHeatmap({
  calls,
  quotes,
  onTileClick,
}: {
  calls: ResearchCall[];
  quotes: Record<string, CallQuote>;
  onTileClick: (id: string) => void;
}) {
  const { profit, loss, pendingCount } = useMemo(() => {
    const profit: HeatmapEntry[] = [];
    const loss: HeatmapEntry[] = [];
    let pendingCount = 0;
    for (const call of calls) {
      const price = quotes[call.symbol]?.price;
      if (price == null) {
        pendingCount += 1;
        continue;
      }
      const pnl = pctMoved(call, price);
      (pnl >= 0 ? profit : loss).push({ call, pnl });
    }
    // Biggest movers first within each section — the ones most worth a
    // glance shouldn't be buried at the end of the grid.
    profit.sort((a, b) => b.pnl - a.pnl);
    loss.sort((a, b) => a.pnl - b.pnl);
    return { profit, loss, pendingCount };
  }, [calls, quotes]);

  if (calls.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
      <div className={`grid ${GRID_COLS} gap-1.5`}>
        {profit.length > 0 && (
          <>
            <SectionLabel title="In Profit" hue="bullish" count={profit.length} />
            {profit.map((entry) => (
              <HeatmapTile key={entry.call.id} entry={entry} hue="bullish" onClick={() => onTileClick(entry.call.id)} />
            ))}
          </>
        )}
        {loss.length > 0 && (
          <>
            <SectionLabel title="In Loss" hue="bearish" count={loss.length} />
            {loss.map((entry) => (
              <HeatmapTile key={entry.call.id} entry={entry} hue="bearish" onClick={() => onTileClick(entry.call.id)} />
            ))}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-subtle-foreground">
        <span>Deeper shade = larger % move (capped at ±{INTENSITY_CAP_PCT}%)</span>
        {pendingCount > 0 && <span>{pendingCount} pending live price…</span>}
      </div>
    </div>
  );
}
