import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Real generated art (not hand-drawn SVG) — swapped by market condition.
// "flat" is kept registered but unused by resolveMood below (not deleted
// in case the move-magnitude bands get reintroduced later) — bull/bear
// only kick in on a decisive move; anything smaller, or no data yet,
// shows the neutral (squared-up, neither dominant) asset.
const MOOD_IMAGES = {
  bull: "/market-mood/bullmarket.png",
  bear: "/market-mood/bearmarket.png",
  flat: "/market-mood/flat_market.png",
  neutral: "/market-mood/neutralmarket.png",
} as const;

const MOVE_THRESHOLD_PCT = 0.7;

function resolveMood(niftyChangePct: number | null): keyof typeof MOOD_IMAGES {
  if (niftyChangePct !== null && niftyChangePct > MOVE_THRESHOLD_PCT) return "bull";
  if (niftyChangePct !== null && niftyChangePct < -MOVE_THRESHOLD_PCT) return "bear";
  return "neutral";
}

export function MarketMoodMotif({ niftyChangePct }: { niftyChangePct: number | null }) {
  const mood = resolveMood(niftyChangePct);
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
        onLoad={() => setLoaded(true)}
        className="block w-full transition-opacity duration-300"
        style={{ aspectRatio: "1774 / 887", opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
