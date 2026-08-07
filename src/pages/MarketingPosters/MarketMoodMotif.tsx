import { useMemo } from "react";

// Bull/bear built from primitive shapes (ellipses, rounded rects, tapered
// polygons) rendered translucent-fill + glowing stroke rather than solid
// fill — the overlapping primitive edges then read as facet lines, giving
// a "neon wireframe" look close to the reference image without needing a
// hand-placed triangulated mesh. Colored green/red to match the app's own
// positive/negative palette (the source brief's "blue bull" was superseded
// by the reference screenshot, which uses green).
function Bull({ size, opacity, glow }: { size: number; opacity: number; glow: string }) {
  return (
    <svg width={size} height={size * 0.73} viewBox="0 0 220 160" style={{ opacity, filter: glow, transition: "all 0.2s" }}>
      <g stroke="#19D37A" strokeWidth="2" fill="#19D37A" fillOpacity="0.14">
        <path d="M 45,92 Q 20,100 12,120" fill="none" strokeLinecap="round" />
        <ellipse cx="11" cy="124" rx="4" ry="6" transform="rotate(15 11 124)" />
        <rect x="58" y="118" width="13" height="38" rx="6" />
        <rect x="76" y="120" width="13" height="36" rx="6" />
        <ellipse cx="90" cy="100" rx="50" ry="27" />
        <rect x="112" y="110" width="13" height="44" rx="6" transform="rotate(-8 118.5 110)" />
        <rect x="134" y="98" width="13" height="46" rx="6" transform="rotate(22 140.5 98)" />
        <ellipse cx="125" cy="80" rx="27" ry="23" />
        <ellipse cx="150" cy="66" rx="21" ry="19" />
        <ellipse cx="176" cy="62" rx="21" ry="17" />
        <ellipse cx="199" cy="68" rx="13" ry="10" />
        <polygon points="152,46 166,42 145,18 150,40" fillOpacity="0.5" />
        <polygon points="162,44 178,38 206,8 184,34" fillOpacity="0.5" />
      </g>
      <circle cx="207" cy="70" r="1.8" fill="#19D37A" stroke="none" />
      <circle cx="183" cy="56" r="2.4" fill="#19D37A" stroke="none" />
    </svg>
  );
}

function Bear({ size, opacity, glow }: { size: number; opacity: number; glow: string }) {
  return (
    <svg width={size} height={size * 0.73} viewBox="0 0 220 160" style={{ opacity, filter: glow, transition: "all 0.2s" }}>
      <g stroke="#FF4E5B" strokeWidth="2" fill="#FF4E5B" fillOpacity="0.14">
        <ellipse cx="192" cy="95" rx="8" ry="7" />
        <rect x="158" y="118" width="15" height="34" rx="6" />
        <rect x="178" y="118" width="15" height="32" rx="6" />
        <ellipse cx="140" cy="95" rx="50" ry="30" />
        <rect x="100" y="118" width="15" height="34" rx="6" />
        <rect x="68" y="100" width="15" height="36" rx="6" transform="rotate(-38 75.5 100)" />
        <ellipse cx="95" cy="80" rx="24" ry="22" />
        <ellipse cx="62" cy="68" rx="24" ry="21" />
        <ellipse cx="35" cy="78" rx="13" ry="10" />
        <circle cx="50" cy="48" r="9" />
        <circle cx="74" cy="46" r="9" />
      </g>
      <circle cx="25" cy="80" r="1.8" fill="#FF4E5B" stroke="none" />
      <circle cx="54" cy="64" r="2.4" fill="#FF4E5B" stroke="none" />
    </svg>
  );
}

// Decorative candlestick bars behind the creatures — green on the bull
// side, red on the bear side, heights seeded once per mount so they don't
// jump around on re-render.
function CandlestickBackdrop() {
  const heights = useMemo(() => Array.from({ length: 40 }, () => 8 + Math.random() * 55), []);
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-[70px] items-end gap-[3px] px-2.5 opacity-50" aria-hidden>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-sm"
          style={{ height: h, background: i < heights.length / 2 ? "#19D37A" : "#FF4E5B" }}
        />
      ))}
    </div>
  );
}

const FLAT_BAND_PCT = 0.15;

export function MarketMoodMotif({ niftyChangePct }: { niftyChangePct: number | null }) {
  const pct = niftyChangePct ?? 0;
  const mood = pct > FLAT_BAND_PCT ? "bull" : pct < -FLAT_BAND_PCT ? "bear" : "flat";

  const bullDominant = mood === "bull";
  const bearDominant = mood === "bear";
  const flat = mood === "flat";

  const bullSize = bullDominant ? 148 : flat ? 100 : 70;
  const bearSize = bearDominant ? 148 : flat ? 100 : 70;
  const bullOpacity = bullDominant ? 1 : flat ? 0.65 : 0.35;
  const bearOpacity = bearDominant ? 1 : flat ? 0.65 : 0.35;
  const bullGlow = bullDominant ? "drop-shadow(0 0 22px rgba(25,211,122,0.85))" : "drop-shadow(0 0 8px rgba(25,211,122,0.3))";
  const bearGlow = bearDominant ? "drop-shadow(0 0 22px rgba(255,78,91,0.85))" : "drop-shadow(0 0 8px rgba(255,78,91,0.3))";

  return (
    <div className="relative flex h-44 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <CandlestickBackdrop />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-end gap-1">
        <Bull size={bullSize} opacity={bullOpacity} glow={bullGlow} />
        {flat && <span className="text-[9px] font-semibold tracking-wide text-white/40">zzz</span>}
      </div>
      <div className="relative z-10 h-24 w-px shrink-0 bg-white/10" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-end gap-1">
        <Bear size={bearSize} opacity={bearOpacity} glow={bearGlow} />
        {flat && <span className="text-[9px] font-semibold tracking-wide text-white/40">zzz</span>}
      </div>
    </div>
  );
}
