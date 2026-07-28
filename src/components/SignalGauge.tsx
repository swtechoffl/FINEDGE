import type { Signal } from "../types";

const SIGNAL_COLORS: Record<Signal, string> = {
  bullish: "var(--bullish)",
  neutral: "var(--neutral)",
  bearish: "var(--bearish)",
};

const SIGNAL_ANGLE: Record<Signal, number> = {
  bearish: -60,
  neutral: 0,
  bullish: 60,
};

export function SignalGauge({ signal, size = 40 }: { signal: Signal; size?: number }) {
  const color = SIGNAL_COLORS[signal];
  const angle = SIGNAL_ANGLE[signal];
  const cx = 24;
  const cy = 26;
  const r = 16;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke="var(--border)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${Math.PI * r}`}
        strokeDashoffset={
          signal === "bearish" ? Math.PI * r * 0.66 : signal === "neutral" ? Math.PI * r * 0.33 : 0
        }
        opacity={0.9}
      />
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 3} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
    </svg>
  );
}

export function SignalLabel({ signal }: { signal: Signal }) {
  const color = SIGNAL_COLORS[signal];
  const label = signal.toUpperCase();
  return (
    <span className="text-xs font-bold tracking-wide" style={{ color }}>
      {label}
    </span>
  );
}

export function signalColor(signal: Signal) {
  return SIGNAL_COLORS[signal];
}
