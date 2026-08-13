import { forwardRef } from "react";
import { TrendingUp, Shield, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type { RowDensity } from "../Premarket/posterShared";
import {
  RA_BG_APP,
  RA_BG_SURFACE_2,
  RA_TEXT_PRIMARY,
  RA_TEXT_SECONDARY,
  RA_TEXT_MUTED,
  RA_BULLISH,
  RA_BEARISH,
  fmtRaPrice,
} from "./raPosterTheme";

export const RA_LIST_POSTER_WIDTH = 234;

export interface RaListRow {
  symbol: string;
  callDate: string;
  entryPrice: string;
  exitPrice: string;
  profitPct: string;
  quote?: string;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function RaCallRow({ row, density }: { row: RaListRow; density: RowDensity }) {
  const pct = Number(row.profitPct);
  const up = Number.isFinite(pct) && pct >= 0;
  const color = up ? RA_BULLISH : RA_BEARISH;
  return (
    <div className={cn("rounded-lg bg-white/10", density.padding)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className={cn("truncate font-bold leading-tight text-white", density.primaryText)}>{row.symbol}</span>
          <span className={cn("text-white/55", density.secondaryText)}>
            {row.callDate} &middot; {fmtRaPrice(Number(row.entryPrice) || 0)} &rarr;{" "}
            {fmtRaPrice(Number(row.exitPrice) || 0)}
          </span>
        </div>
        <span className={cn("shrink-0 font-bold", density.secondaryText)} style={{ color }}>
          {up ? "+" : ""}
          {Number.isFinite(pct) ? pct.toFixed(2) : row.profitPct}%
        </span>
      </div>
      {row.quote?.trim() && (
        <div className={cn("mt-1 truncate italic text-white/70", density.secondaryText)}>&ldquo;{row.quote}&rdquo;</div>
      )}
    </div>
  );
}

// List-format sibling of RaCallPoster — same track-record data (stock, call
// date, entry, %profit) but many calls on one poster instead of one call per
// image, for "here's our week's calls" style posts. Uses its own frame
// (rather than Premarket's PosterFrame) because that footer is brand/social
// info; an RA disclosure poster's footer must be the compliance disclaimer.
export const RaListPosterFrame = forwardRef<
  HTMLDivElement,
  {
    posterId: string;
    title: string;
    subtitle: string;
    disclaimer: string;
    ctaText: string;
    raName: string;
    sebiRegNo: string;
    raAddress: string;
    pageLabel?: string;
    children: React.ReactNode;
  }
>(function RaListPosterFrame(
  { posterId, title, subtitle, disclaimer, ctaText, raName, sebiRegNo, raAddress, pageLabel, children },
  ref,
) {
  return (
    <div
      ref={ref}
      data-poster={posterId}
      className="relative flex aspect-[9/16] flex-col overflow-hidden p-4"
      style={{ width: RA_LIST_POSTER_WIDTH, background: RA_BG_APP }}
    >
      <div className="flex items-center justify-end gap-2">
        <div className="shrink-0 text-[8px]" style={{ color: RA_TEXT_MUTED }}>
          {todayLabel()}
        </div>
      </div>

      <div className="mt-4 mb-3">
        <div className="mb-1" style={{ color: RA_TEXT_SECONDARY }}>
          <TrendingUp size={20} />
        </div>
        <div
          className="text-[17px] font-extrabold uppercase leading-[1.15] tracking-tight"
          style={{ color: RA_TEXT_PRIMARY }}
        >
          {title}
        </div>
        <div className="text-[9.5px] font-medium" style={{ color: RA_TEXT_SECONDARY }}>
          {subtitle}
        </div>
        {pageLabel && (
          <div
            className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: RA_BG_SURFACE_2, color: RA_TEXT_SECONDARY }}
          >
            {pageLabel}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">{children}</div>

      {ctaText.trim() && (
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2" style={{ background: RA_BULLISH }}>
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-black">{ctaText}</span>
          <ArrowRight size={12} className="shrink-0 text-black" />
        </div>
      )}

      {(raName.trim() || sebiRegNo.trim() || raAddress.trim()) && (
        <div className="mt-2 text-center">
          <div className="text-[7.5px] font-semibold" style={{ color: RA_TEXT_SECONDARY }}>
            {[raName.trim(), sebiRegNo.trim() && `SEBI Reg. No: ${sebiRegNo.trim()}`].filter(Boolean).join(" · ")}
          </div>
          {raAddress.trim() && (
            <div className="mt-0.5 text-[7px] leading-snug" style={{ color: RA_TEXT_MUTED }}>
              {raAddress.trim()}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex items-start gap-1.5 border-t border-white/10 pt-2.5">
        <Shield size={11} className="mt-0.5 shrink-0" style={{ color: RA_TEXT_MUTED }} />
        <p className="text-[7.5px] leading-snug" style={{ color: RA_TEXT_MUTED }}>
          {disclaimer}
        </p>
      </div>
    </div>
  );
});
