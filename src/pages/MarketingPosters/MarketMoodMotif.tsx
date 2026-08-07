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
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <img src={MOOD_IMAGES[mood]} alt={`${mood} market`} className="block w-full" style={{ aspectRatio: "1774 / 887" }} />
    </div>
  );
}
