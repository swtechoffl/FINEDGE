import type { ChartPoint } from "./onePagerTypes";

// Colors verified with the dataviz skill's validator (validate_palette.js)
// against both the light (#ffffff) and dark (#141416) app surfaces — pass on
// lightness band, chroma floor, CVD separation, and contrast in both modes,
// so one fixed pair works without a light/dark swap.
const STOCK_COLOR = "#059669";
const NIFTY_COLOR = "#3b82f6";

const WIDTH = 640;
const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

function pathFor(points: ChartPoint[], xScale: (i: number) => number, yScale: (v: number) => number) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(" ");
}

// Normalized (base 100) 1-year stock-vs-Nifty line chart — single shared
// axis (both series already indexed to the same base, so no dual-axis
// temptation), fixed categorical colors, and a legend since there are two
// series. Built plain-SVG to match this app's existing hand-rolled charts
// (see StockDetailPage's sparkline) rather than pulling in a chart library.
export function OnePagerChart({ stock, nifty, symbol }: { stock: ChartPoint[]; nifty: ChartPoint[]; symbol: string }) {
  if (stock.length < 2 || nifty.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-border bg-surface-2 text-xs text-subtle-foreground">
        Not enough price history to plot a chart.
      </div>
    );
  }

  const allValues = [...stock, ...nifty].map((p) => p.value);
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const n = Math.max(stock.length, nifty.length);
  const xScale = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  const gridLines = [minV, (minV + maxV) / 2, maxV];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: STOCK_COLOR }} />
          {symbol}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3" style={{ backgroundColor: NIFTY_COLOR }} />
          NIFTY 50
        </span>
        <span className="text-subtle-foreground">(rebased to 100 at start)</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        {gridLines.map((v, i) => (
          <line
            key={i}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        <path d={pathFor(nifty, xScale, yScale)} fill="none" stroke={NIFTY_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathFor(stock, xScale, yScale)} fill="none" stroke={STOCK_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <text x={PAD.left} y={HEIGHT - 6} fontSize={10} fill="var(--subtle-foreground)">
          {stock[0]?.date}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} fontSize={10} fill="var(--subtle-foreground)" textAnchor="end">
          {stock[stock.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}
