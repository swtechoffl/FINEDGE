import type { ShareholdingSlice } from "./onePagerTypes";

// Same validation pass as the line chart (validate_palette.js), extended to
// 4 slots for the richer Promoter/FII/DII/Public breakdown — passes both
// light (#ffffff) and dark (#141416) app surfaces.
const SLICE_COLORS = ["#059669", "#3b82f6", "#d97706", "#7c3aed"];

const SIZE = 120;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function OnePagerPieChart({ slices, asOfDate }: { slices: ShareholdingSlice[]; asOfDate: string | null }) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-subtle-foreground">
        Shareholding data unavailable.
      </div>
    );
  }

  let cumulative = 0;
  const arcs = slices.map((s, i) => {
    const dash = (s.pct / 100) * CIRCUMFERENCE;
    const offset = (cumulative / 100) * CIRCUMFERENCE;
    cumulative += s.pct;
    return { ...s, color: SLICE_COLORS[i % SLICE_COLORS.length], dash, offset };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0 -rotate-90">
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth={STROKE}
            strokeDasharray={`${a.dash} ${CIRCUMFERENCE - a.dash}`}
            strokeDashoffset={-a.offset}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        {arcs.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: a.color }} />
            <span className="font-medium text-foreground">{a.label}</span>
            <span className="text-muted-foreground">{a.pct.toFixed(1)}%</span>
          </div>
        ))}
        {asOfDate && <span className="mt-0.5 text-[9px] text-subtle-foreground">As of {asOfDate}</span>}
      </div>
    </div>
  );
}
