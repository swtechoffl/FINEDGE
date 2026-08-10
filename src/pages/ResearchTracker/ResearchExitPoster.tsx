import { forwardRef } from "react";
import { Calendar, ArrowUp, ArrowDown, Shield } from "lucide-react";
import { useFitHeight } from "../MarketingPosters/useFitHeight";
import { ResearchCallChart } from "./ResearchCallChart";
import { pctMoved } from "./researchTrackerMath";
import type { ResearchCall } from "./researchTrackerTypes";
import type { HistoryPoint } from "./useResearchQuotes";

export const POSTER_WIDTH = 420;

// This app's own dark-theme design tokens (src/index.css `[data-theme="dark"]`)
// — a poster is rendered/exported standalone, so it can't read CSS variables
// off the live page's theme; these are the same values PostMarketSummaryPoster
// hardcodes, so this poster matches the app's actual dark UI too.
const BG_APP = "#0a0a0b";
const BG_SURFACE = "#141416";
const BG_SURFACE_2 = "#1c1c1f";
const BORDER = "#27272a";
const TEXT_PRIMARY = "#fafafa";
const TEXT_SECONDARY = "#a1a1aa";
const TEXT_MUTED = "#71717a";
const BULLISH = "#22c55e";
const BULLISH_BG = "rgba(34,197,94,0.14)";
const BEARISH = "#f87171";
const BEARISH_BG = "rgba(248,113,113,0.14)";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysHeld(callDate: string, exitDate: string) {
  return Math.max(1, Math.round((+new Date(exitDate) - +new Date(callDate)) / 86_400_000));
}

function fmtPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function PriceTile({ label, price, bordered = true }: { label: string; price: number; bordered?: boolean }) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 px-2 py-3"
      style={{ borderLeft: bordered ? `1px solid ${BORDER}` : "none" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
        {label}
      </div>
      <div className="text-[17px] font-bold" style={{ color: TEXT_PRIMARY }}>
        {fmtPrice(price)}
      </div>
    </div>
  );
}

// Shareable "trade closed" card generated when a call is marked exited —
// same visual language and export flow (PosterActions + html-to-image) as
// this app's other posters, so it drops into the same download/share habit.
export const ResearchExitPoster = forwardRef<HTMLDivElement, { call: ResearchCall; history: HistoryPoint[] }>(
  function ResearchExitPoster({ call, history }, ref) {
    const { measureRef, height } = useFitHeight(POSTER_WIDTH, 4, 5);
    const exitPrice = call.exitPrice ?? call.recommendedPrice;
    const exitDate = call.exitDate ?? new Date().toISOString().slice(0, 10);
    const pnl = pctMoved(call, exitPrice);
    const up = pnl >= 0;
    const color = up ? BULLISH : BEARISH;
    const bg = up ? BULLISH_BG : BEARISH_BG;
    const Icon = up ? ArrowUp : ArrowDown;

    return (
      <div
        ref={ref}
        data-poster="research-exit"
        className="relative flex flex-col justify-center overflow-hidden"
        style={{ width: POSTER_WIDTH, height, background: BG_APP }}
      >
        <div ref={measureRef} className="flex flex-col gap-3 p-4">
          {/* LOGO */}
          <img src="/logo.png" alt="Finedge" className="h-7 w-auto self-start" />

          {/* HEADER */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
                Trade Closed &middot; {call.callType.toUpperCase()} CALL
              </div>
              <div
                className="truncate text-[30px] font-bold uppercase leading-tight tracking-tight"
                style={{ color: TEXT_PRIMARY }}
              >
                {call.symbol}
              </div>
              {call.companyName && (
                <div className="truncate text-[11px] font-medium" style={{ color: TEXT_SECONDARY }}>
                  {call.companyName}
                </div>
              )}
            </div>
            <div
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5"
              style={{ background: BG_SURFACE_2, border: `1px solid ${BORDER}` }}
            >
              <Calendar size={13} style={{ color: TEXT_SECONDARY }} />
              <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                {fmtDate(exitDate)}
              </span>
            </div>
          </div>

          {/* BIG P/L */}
          <div className="flex flex-col items-center gap-1 rounded-2xl py-5" style={{ background: bg }}>
            <div className="flex items-center gap-1.5">
              <Icon size={22} color={color} strokeWidth={3} />
              <span className="text-[44px] font-extrabold leading-none" style={{ color }}>
                {up ? "+" : ""}
                {pnl.toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
              {up ? "Profit Booked" : "Loss Booked"}
            </span>
          </div>

          {/* PRICE STRIP */}
          <div
            className="flex items-stretch overflow-hidden rounded-xl"
            style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}
          >
            <PriceTile label="Entry" price={call.recommendedPrice} bordered={false} />
            <PriceTile label="Target" price={call.targetPrice} />
            <PriceTile label="Exit" price={exitPrice} />
          </div>

          {/* CHART */}
          <ResearchCallChart
            history={history}
            callDate={call.callDate}
            exitDate={exitDate}
            entryPrice={call.recommendedPrice}
            targetPrice={call.targetPrice}
            up={call.callType === "buy"}
            variant="posterDark"
          />

          <div
            className="flex items-center justify-center gap-2 text-[10.5px] font-medium"
            style={{ color: TEXT_SECONDARY }}
          >
            <span>{fmtDate(call.callDate)}</span>
            <span style={{ color: TEXT_MUTED }}>&rarr;</span>
            <span>{fmtDate(exitDate)}</span>
            <span style={{ color: TEXT_MUTED }}>&middot;</span>
            <span>{daysHeld(call.callDate, exitDate)}d held</span>
          </div>

          {/* FOOTER DISCLAIMER */}
          <div className="flex items-start justify-center gap-1.5 px-2">
            <Shield size={12} className="mt-0.5 shrink-0" style={{ color: TEXT_MUTED }} />
            <p className="text-center text-[9.5px] leading-snug" style={{ color: TEXT_MUTED }}>
              Investments in securities market are subject to market risks. Read all related documents carefully
              before investing.
            </p>
          </div>
        </div>
      </div>
    );
  },
);
