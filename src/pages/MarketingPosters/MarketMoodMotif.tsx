import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Real generated art (not hand-drawn SVG) — swapped by market condition.
// "Flat" (near-zero move) and "neutral" (no data yet, e.g. before the
// post-market feed has loaded) are visually distinct assets: flat shows
// both creatures asleep ("quiet session"), neutral shows them squared up
// with neither dominant ("no read yet").
const MOOD_IMAGES = {
  bull: "/market-mood/bullmarket.png",
  bear: "/market-mood/bearmarket.png",
  flat: "/market-mood/flat_market.png",
  neutral: "/market-mood/neutralmarket.png",
} as const;

const FLAT_BAND_PCT = 0.15;

function resolveMood(niftyChangePct: number | null): keyof typeof MOOD_IMAGES {
  if (niftyChangePct === null) return "neutral";
  if (niftyChangePct > FLAT_BAND_PCT) return "bull";
  if (niftyChangePct < -FLAT_BAND_PCT) return "bear";
  return "flat";
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
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ border: "1px solid #27272a", background: "#0a0a0b", aspectRatio: "1774 / 887" }}
    >
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
