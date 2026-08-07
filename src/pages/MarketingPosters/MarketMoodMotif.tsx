import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Real generated art (not hand-drawn SVG) — swapped by market condition.
// Resized/re-encoded from the original ~2MB PNGs to ~120KB JPEGs (1100px
// wide — comfortably above the ~1000px this image actually renders at in
// the exported poster, so there's no visible quality loss) purely for
// load speed.
export const MOOD_IMAGES = {
  bull: "/market-mood/bullmarket.jpg",
  bear: "/market-mood/bearmarket.jpg",
  flat: "/market-mood/flat_market.jpg",
  neutral: "/market-mood/neutralmarket.jpg",
} as const;

export type MarketMood = keyof typeof MOOD_IMAGES;

const MOVE_THRESHOLD_PCT = 0.7;

// Warm the browser cache for all 4 moods as soon as this module loads,
// not just the one resolveMood picks — so a manual override (or Nifty
// crossing the threshold later in the session) swaps instantly instead of
// triggering a fresh fetch.
if (typeof window !== "undefined") {
  Object.values(MOOD_IMAGES).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function resolveMood(niftyChangePct: number | null): MarketMood {
  if (niftyChangePct !== null && niftyChangePct > MOVE_THRESHOLD_PCT) return "bull";
  if (niftyChangePct !== null && niftyChangePct < -MOVE_THRESHOLD_PCT) return "bear";
  return "neutral";
}

export function MarketMoodMotif({
  niftyChangePct,
  moodOverride,
}: {
  niftyChangePct: number | null;
  moodOverride?: MarketMood | null;
}) {
  const mood = moodOverride ?? resolveMood(niftyChangePct);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset on mood change (switching src re-triggers a real load), and
  // catch the case where the image is already in the browser cache — the
  // <img> can finish loading before this component's onLoad handler is
  // even attached, so the event alone can't be trusted.
  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete) setLoaded(true);
  }, [mood]);

  return (
    <div className="relative overflow-hidden" style={{ background: "#0a0a0b", aspectRatio: "1774 / 887" }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse" style={{ background: "#1c1c1f" }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "#71717a" }} />
        </div>
      )}
      <img
        ref={imgRef}
        src={MOOD_IMAGES[mood]}
        alt={`${mood} market`}
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className="block w-full transition-opacity duration-300"
        style={{ aspectRatio: "1774 / 887", opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
