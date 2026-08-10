import { useId } from "react";
import type { HistoryPoint } from "./useResearchQuotes";

const WIDTH = 600;
const HEIGHT = 130;
const PAD = { top: 12, right: 8, bottom: 18, left: 8 };

// "app" reads the live page's theme via CSS vars (light/dark aware); a
// poster is rasterized standalone and can't read those vars off the live
// page, so it asks for the "posterDark" variant instead — same hardcoded
// hex values PostMarketSummaryPoster uses, so the exit poster matches this
// app's actual dark UI rather than a bespoke palette. `surface` is the
// background the end-dot's ring needs to match — the card's surface for
// "app", the poster's own background for "posterDark" (the chart sits
// directly on it there, not on a nested surface box).
const THEMES = {
  app: {
    up: "var(--bullish)",
    down: "var(--bearish)",
    grid: "var(--border-strong)",
    target: "var(--accent)",
    axis: "var(--subtle-foreground)",
    surface: "var(--bg-surface)",
    emptyBorder: "var(--border)",
    emptyText: "var(--subtle-foreground)",
  },
  posterDark: {
    up: "#22c55e",
    down: "#f87171",
    grid: "#3f3f46",
    target: "#10b981",
    axis: "#71717a",
    surface: "#0a0a0b",
    emptyBorder: "#27272a",
    emptyText: "#71717a",
  },
} as const;

// Catmull-Rom → cubic-Bezier smoothing (tension 1/6) — the standard way to
// turn a polyline into the smooth curve a "stock preview" chart (Google
// Finance, Robinhood, etc.) is recognized by, without pulling in a chart
// library for one spline.
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// Smooth line + gradient area wash under it, an end-of-line dot marking the
// latest price, and dashed entry/target threshold lines — the same
// "preview chart" language stock apps use (Google Finance, Robinhood),
// hand-rolled in plain SVG like this app's other charts rather than pulling
// in a chart library.
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
  const gradientId = useId();
  const colors = THEMES[variant];

  // Always anchored to the call date — never falls back to the full trailing
  // history, since that would silently plot pre-call price action as if it
  // were the call's own track record.
  const points = history.filter((h) => h.date >= callDate && (!exitDate || h.date <= exitDate));

  if (points.length < 2) {
    return (
      <div
        className="flex h-[100px] items-center justify-center rounded-lg border border-dashed text-[11px]"
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
  const baseline = PAD.top + innerH;

  const xScale = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - min) / range) * innerH;
  const coords = points.map((p, i) => ({ x: xScale(i), y: yScale(p.close) }));

  const last = closes[closes.length - 1];
  const inProfit = isBuyCall ? last >= entryPrice : last <= entryPrice;
  const lineColor = inProfit ? colors.up : colors.down;

  const linePath = smoothPath(coords);
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${baseline.toFixed(1)} L${coords[0].x.toFixed(1)},${baseline.toFixed(1)} Z`;
  const lastPoint = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[100px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={yScale(entryPrice)}
        y2={yScale(entryPrice)}
        stroke={colors.grid}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={yScale(targetPrice)}
        y2={yScale(targetPrice)}
        stroke={colors.target}
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.7}
      />
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={colors.surface} />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill={lineColor} />
      <text x={PAD.left} y={HEIGHT - 4} fontSize={9} fill={colors.axis}>
        {points[0].date}
      </text>
      <text x={WIDTH - PAD.right} y={HEIGHT - 4} fontSize={9} fill={colors.axis} textAnchor="end">
        {points[points.length - 1].date}
      </text>
    </svg>
  );
}
