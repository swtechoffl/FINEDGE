import { cn } from "../../lib/utils";
import type { RowDensity } from "./posterShared";

// One row component per list-poster template — deliberately flat props
// (just the fields actually rendered) rather than the full domain types
// (Week52Entry, EarningsEvent, ...) so the same components render both the
// live-data posters (PremarketPosters.tsx) and the Poster Maker's
// pasted-data posters without either side needing to fake unused fields.

export function StockRow({ symbol, density }: { symbol: string; density: RowDensity }) {
  return (
    <div className={cn("flex items-center rounded-lg bg-white/10", density.padding)}>
      <span className={cn("font-bold text-white", density.primaryText)}>{symbol}</span>
    </div>
  );
}

export function EarningsPosterRow({ symbol, date, density }: { symbol: string; date: string; density: RowDensity }) {
  const shortDate = date.replace(/-\d{4}$/, "");
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-white/10", density.padding)}>
      <span className={cn("font-bold leading-tight text-white", density.primaryText)}>{symbol}</span>
      <span className={cn("shrink-0 font-semibold text-white/70", density.secondaryText)}>{shortDate}</span>
    </div>
  );
}

export function ActionChip({ symbol, exDate, density }: { symbol: string; exDate: string; density: RowDensity }) {
  const shortDate = exDate.replace(/-\d{4}$/, "");
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-white/10", density.padding)}>
      <span className={cn("font-bold leading-tight text-white", density.primaryText)}>{symbol}</span>
      <span className={cn("shrink-0 font-semibold text-white/70", density.secondaryText)}>{shortDate}</span>
    </div>
  );
}

export function IpoPosterRow({
  symbol,
  company,
  sub,
  isSme,
  density,
}: {
  symbol: string;
  company: string;
  sub: string;
  isSme: boolean;
  density: RowDensity;
}) {
  return (
    <div className={cn("rounded-lg bg-white/10", density.padding)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-bold text-white", density.primaryText)}>{symbol}</span>
          <span
            className={cn(
              "shrink-0 rounded px-1 py-px text-[7px] font-bold uppercase tracking-wide",
              isSme ? "bg-amber-400/25 text-amber-200" : "bg-sky-400/25 text-sky-200",
            )}
          >
            {isSme ? "SME" : "Main"}
          </span>
        </div>
        {sub && <span className={cn("shrink-0 font-semibold text-white/70", density.secondaryText)}>{sub}</span>}
      </div>
      {company && <div className={cn("truncate text-white/55", density.secondaryText)}>{company}</div>}
    </div>
  );
}

export function VolumeGainerPosterRow({
  symbol,
  changePct,
  density,
}: {
  symbol: string;
  changePct: number;
  density: RowDensity;
}) {
  const up = changePct >= 0;
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-white/10", density.padding)}>
      <span className={cn("font-bold leading-tight text-white", density.primaryText)}>{symbol}</span>
      <span className={cn("shrink-0 font-bold", density.secondaryText, up ? "text-emerald-300" : "text-red-300")}>
        {up ? "+" : ""}
        {changePct}%
      </span>
    </div>
  );
}
