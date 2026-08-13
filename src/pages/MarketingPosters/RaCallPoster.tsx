import { forwardRef } from "react";
import { Calendar, ArrowUp, ArrowDown, Shield } from "lucide-react";
import { useFitHeight } from "./useFitHeight";
import {
  RA_BG_APP,
  RA_BG_SURFACE,
  RA_BG_SURFACE_2,
  RA_BORDER,
  RA_TEXT_PRIMARY,
  RA_TEXT_SECONDARY,
  RA_TEXT_MUTED,
  RA_BULLISH,
  RA_BULLISH_BG,
  RA_BEARISH,
  RA_BEARISH_BG,
  fmtRaPrice,
  fmtRaDate,
} from "./raPosterTheme";

export const RA_CALL_POSTER_WIDTH = 420;

export interface RaCallInput {
  symbol: string;
  companyName: string;
  callDate: string;
  entryPrice: number;
  profitPct: number;
  disclaimer: string;
}

// Manual-entry counterpart to ResearchTracker's ResearchExitPoster — same
// visual language (dark card, big P/L badge, disclaimer footer) but driven
// entirely by form input rather than a live ResearchCall + price history, so
// it can announce a call the moment it's given instead of only once it's
// tracked and closed.
export const RaCallPoster = forwardRef<HTMLDivElement, { call: RaCallInput }>(function RaCallPoster({ call }, ref) {
  const { measureRef, height } = useFitHeight(RA_CALL_POSTER_WIDTH, 4, 5);
  const up = call.profitPct >= 0;
  const color = up ? RA_BULLISH : RA_BEARISH;
  const bg = up ? RA_BULLISH_BG : RA_BEARISH_BG;
  const Icon = up ? ArrowUp : ArrowDown;

  return (
    <div
      ref={ref}
      data-poster="ra-call"
      className="relative flex flex-col justify-center overflow-hidden"
      style={{ width: RA_CALL_POSTER_WIDTH, height, background: RA_BG_APP }}
    >
      <div ref={measureRef} className="flex flex-col gap-3 p-4">
        <img src="/logo.png" alt="Finedge" className="h-7 w-auto self-start" />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: RA_TEXT_MUTED }}>
              Research Call
            </div>
            <div
              className="truncate text-[30px] font-bold uppercase leading-tight tracking-tight"
              style={{ color: RA_TEXT_PRIMARY }}
            >
              {call.symbol || "SYMBOL"}
            </div>
            {call.companyName && (
              <div className="truncate text-[11px] font-medium" style={{ color: RA_TEXT_SECONDARY }}>
                {call.companyName}
              </div>
            )}
          </div>
          <div
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: RA_BG_SURFACE_2, border: `1px solid ${RA_BORDER}` }}
          >
            <Calendar size={13} style={{ color: RA_TEXT_SECONDARY }} />
            <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: RA_TEXT_PRIMARY }}>
              {fmtRaDate(call.callDate) || "Call Date"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 rounded-2xl py-5" style={{ background: bg }}>
          <div className="flex items-center gap-1.5">
            <Icon size={22} color={color} strokeWidth={3} />
            <span className="text-[44px] font-extrabold leading-none" style={{ color }}>
              {up ? "+" : ""}
              {call.profitPct.toFixed(2)}%
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
            {up ? "In Profit" : "In Loss"}
          </span>
        </div>

        <div
          className="flex items-center justify-center rounded-xl py-3"
          style={{ background: RA_BG_SURFACE, border: `1px solid ${RA_BORDER}` }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: RA_TEXT_MUTED }}>
              Entry Price
            </div>
            <div className="text-[19px] font-bold" style={{ color: RA_TEXT_PRIMARY }}>
              {fmtRaPrice(call.entryPrice)}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-center gap-1.5 px-2">
          <Shield size={12} className="mt-0.5 shrink-0" style={{ color: RA_TEXT_MUTED }} />
          <p className="text-center text-[9.5px] leading-snug" style={{ color: RA_TEXT_MUTED }}>
            {call.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
});
