import type { HistoryPoint } from "./useResearchQuotes";

const WIDTH = 600;
const HEIGHT = 130;
const PAD = { top: 10, right: 8, bottom: 18, left: 8 };

// "app" reads the live page's theme via CSS vars (light/dark aware); a
// poster is rasterized standalone and can't read those vars off the live
// page, so it asks for the "posterDark" variant instead — same hardcoded
// hex values PostMarketSummaryPoster uses, so the exit poster matches this
// app's actual dark UI rather than a bespoke palette.
const THEMES = {
  app: {
    up: "var(--bullish)",
    down: "var(--bearish)",
    grid: "var(--border-strong)",
    target: "var(--accent)",
    axis: "var(--subtle-foreground)",
    emptyBorder: "var(--border)",
    emptyText: "var(--subtle-foreground)",
  },
  posterDark: {
    up: "#22c55e",
    down: "#f87171",
    grid: "#3f3f46",
    target: "#10b981",
    axis: "#71717a",
    emptyBorder: "#27272a",
    emptyText: "#71717a",
  },
} as const;

// Plain-SVG line chart of a call's price path since it was given — entry
// price and target price are drawn as dashed reference lines so "did it get
// there" reads at a glance, same hand-rolled approach as StockDetailPage's
// sparkline and OnePagerChart rather than pulling in a chart library.
export function ResearchCallChart({
  history,
  callDate,
  exitDate,
  entryPrice,
  targetPrice,
  up: isBuyCall,
  variant = "app",
}: {
  history: HistoryPoint[];
  callDate: string;
  exitDate?: string | null;
  entryPrice: number;
  targetPrice: number;
  up: boolean; // true = buy call (price rising is profit); false = sell call (price falling is profit)
  variant?: "app" | "posterDark";
}) {
  const colors = THEMES[variant];

  // The live history series always covers a fixed trailing window (6mo) —
  // if the call is older than that, there's nothing to slice down to, so
  // fall back to plotting whatever's available rather than showing nothing.
  const sinceCall = history.filter((h) => h.date >= callDate && (!exitDate || h.date <= exitDate));
  const points = sinceCall.length >= 2 ? sinceCall : history;

  if (points.length < 2) {
    return (
      <div
        className="flex h-[90px] items-center justify-center rounded-lg border border-dashed text-[11px]"
        style={{ borderColor: colors.emptyBorder, color: colors.emptyText }}
      >
        Not enough price history since the call yet.
      </div>
    );
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes, entryPrice, targetPrice);
  const max = Math.max(...closes, entryPrice, targetPrice);
  const range = max - min || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - min) / range) * innerH;

  const last = closes[closes.length - 1];
  const inProfit = isBuyCall ? last >= entryPrice : last <= entryPrice;
  const lineColor = inProfit ? colors.up : colors.down;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.close).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[90px] w-full" preserveAspectRatio="none">
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={yScale(entryPrice)}
        y2={yScale(entryPrice)}
        stroke={colors.grid}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={yScale(targetPrice)}
        y2={yScale(targetPrice)}
        stroke={colors.target}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <text x={PAD.left} y={HEIGHT - 4} fontSize={9} fill={colors.axis}>
        {points[0].date}
      </text>
      <text x={WIDTH - PAD.right} y={HEIGHT - 4} fontSize={9} fill={colors.axis} textAnchor="end">
        {points[points.length - 1].date}
      </text>
    </svg>
  );
}
