import { forwardRef, type ReactNode } from "react";
import { Calendar, ArrowUp, ArrowDown, TrendingUp, BarChart3, Activity, Landmark, Shield } from "lucide-react";
import { useFitHeight } from "./useFitHeight";
import { MarketMoodMotif, type MarketMood } from "./MarketMoodMotif";

export interface IndexQuote {
  price: number;
  changePct: number;
}

export interface MoverEntry {
  symbol: string;
  changePct: number;
}

export interface IndexOiChange {
  finnifty: number | null;
  nifty: number | null;
  niftyNxt50: number | null;
  bankNifty: number | null;
}

// This app's own dark-theme design tokens (src/index.css `[data-theme="dark"]`)
// — a poster is rendered/exported standalone, so it can't read CSS variables
// off the live page's theme; these are the same values hardcoded so the
// poster matches the app's actual shadcn-style dark UI instead of a bespoke
// palette.
const BG_APP = "#0a0a0b";
const BG_SURFACE = "#141416";
const BG_SURFACE_2 = "#1c1c1f";
const BORDER = "#27272a";
const TEXT_PRIMARY = "#fafafa";
const TEXT_SECONDARY = "#a1a1aa";
const TEXT_MUTED = "#71717a";
const ACCENT = "#10b981";
const BULLISH = "#22c55e";
const BULLISH_BG = "rgba(34,197,94,0.14)";
const BEARISH = "#f87171";
const BEARISH_BG = "rgba(248,113,113,0.14)";

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
}

// changePct is the only figure the underlying data actually carries for
// indices — the absolute point change shown alongside it is derived by
// inverting it back to a prior close, not a second live field.
function pointChange(price: number, changePct: number) {
  return price - price / (1 + changePct / 100);
}

function GoldSection({ ratePerGram }: { ratePerGram: number | null }) {
  return (
    <div className="flex flex-1 items-center px-3 py-3">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
          Gold Rate
        </div>
        <div className="whitespace-nowrap text-[19px] font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
          {ratePerGram !== null ? `₹${ratePerGram.toLocaleString("en-IN")}` : "—"}
          <span className="text-[10.5px] font-medium" style={{ color: TEXT_SECONDARY }}>
            {" "}
            /g
          </span>
        </div>
        <div className="text-[9.5px] font-medium leading-tight" style={{ color: TEXT_MUTED }}>
          99.9% Purity (Intl.)
        </div>
      </div>
    </div>
  );
}

function MetricSection({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up = changePct >= 0;
  const color = up ? BULLISH : BEARISH;
  const change = pointChange(price, changePct);
  return (
    <div className="flex flex-1 flex-col justify-center gap-1 px-2.5 py-3" style={{ borderLeft: `1px solid ${BORDER}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
        {label}
      </div>
      <div className="text-[18px] font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
        {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </div>
      <div
        className="inline-flex w-fit items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
        style={{ background: up ? BULLISH_BG : BEARISH_BG, color }}
      >
        <span>{up ? "▲" : "▼"}</span>
        <span>
          {up ? "+" : ""}
          {change.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ({up ? "+" : ""}
          {changePct.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

function MoverBadge({ tone }: { tone: "up" | "down" }) {
  const color = tone === "up" ? BULLISH : BEARISH;
  const bg = tone === "up" ? BULLISH_BG : BEARISH_BG;
  const Icon = tone === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
      <Icon size={11} color={color} strokeWidth={2.5} />
    </div>
  );
}

function MoverCard({ title, tone, items }: { title: string; tone: "up" | "down"; items: MoverEntry[] }) {
  const color = tone === "up" ? BULLISH : BEARISH;
  const bg = tone === "up" ? BULLISH_BG : BEARISH_BG;
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl p-3" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5">
        <MoverBadge tone={tone} />
        <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: TEXT_PRIMARY }}>
          {title}
        </span>
      </div>
      <div className="flex items-center justify-between text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
        <span>Stock</span>
        <span>Change</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.symbol} className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-medium" style={{ color: TEXT_PRIMARY }}>
              {it.symbol}
            </span>
            <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: bg, color }}>
              {it.changePct >= 0 ? "+" : ""}
              {it.changePct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OiCard({ label, value, icon }: { label: string; value: number | null; icon: ReactNode }) {
  const up = (value ?? 0) >= 0;
  const color = up ? BULLISH : BEARISH;
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg px-1.5 py-2.5 text-center"
      style={{ background: BG_SURFACE_2, border: `1px solid ${BORDER}` }}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BG_SURFACE, color: TEXT_SECONDARY }}>
        {icon}
      </div>
      <div className="text-[9.5px] font-semibold uppercase leading-tight tracking-wide" style={{ color: TEXT_MUTED }}>
        {label}
      </div>
      <div className="text-[16px] font-bold leading-tight" style={{ color }}>
        {value !== null ? `${up ? "+" : ""}${value.toFixed(2)}%` : "—"}
      </div>
      <div className="text-[9px] font-medium uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
        OI
      </div>
    </div>
  );
}

export const PostMarketSummaryPoster = forwardRef<
  HTMLDivElement,
  {
    posterId: string;
    width: number;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    moodOverride?: MarketMood | null;
    goldRateInrPerGram: number | null;
    nifty: IndexQuote | null;
    sensex: IndexQuote | null;
    bankNifty: IndexQuote | null;
    gainers: MoverEntry[];
    losers: MoverEntry[];
    oi: IndexOiChange;
  }
>(function PostMarketSummaryPoster(
  {
    posterId,
    width,
    titleLine1,
    titleLine2,
    subtitle,
    moodOverride,
    goldRateInrPerGram,
    nifty,
    sensex,
    bankNifty,
    gainers,
    losers,
    oi,
  },
  ref,
) {
  const { measureRef, height } = useFitHeight(width, 9, 16);

  return (
    <div
      ref={ref}
      data-poster={posterId}
      className="relative flex flex-col justify-center overflow-hidden"
      style={{ width, height, background: BG_APP }}
    >
      <div ref={measureRef} className="flex flex-col gap-3 p-4">
        {/* LOGO */}
        <img src="/logo.png" alt="Finedge" className="h-7 w-auto self-start" />

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[38px] font-bold uppercase leading-[0.95] tracking-tight" style={{ color: TEXT_PRIMARY }}>
              {titleLine1}
            </div>
            <div className="text-[38px] font-bold uppercase leading-[0.95] tracking-tight" style={{ color: ACCENT }}>
              {titleLine2}
            </div>
            <div className="mt-1.5 text-[12px] font-medium uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
              {subtitle}
            </div>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ background: BG_SURFACE_2, border: `1px solid ${BORDER}` }}
          >
            <Calendar size={13} style={{ color: TEXT_SECONDARY }} />
            <span className="whitespace-nowrap text-[12px] font-semibold" style={{ color: TEXT_PRIMARY }}>
              {todayLabel()}
            </span>
          </div>
        </div>

        {/* INFO BAR — one continuous panel */}
        <div className="flex items-stretch overflow-hidden rounded-xl" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
          <GoldSection ratePerGram={goldRateInrPerGram} />
          {nifty && <MetricSection label="Nifty 50" price={nifty.price} changePct={nifty.changePct} />}
          {sensex && <MetricSection label="Sensex" price={sensex.price} changePct={sensex.changePct} />}
          {bankNifty && <MetricSection label="Bank Nifty" price={bankNifty.price} changePct={bankNifty.changePct} />}
        </div>

        {/* CENTER MOTIF */}
        <MarketMoodMotif niftyChangePct={nifty?.changePct ?? null} moodOverride={moodOverride} />

        {/* GAINERS / LOSERS */}
        <div className="flex gap-2.5">
          <MoverCard title="Top Gainers" tone="up" items={gainers} />
          <MoverCard title="Top Losers" tone="down" items={losers} />
        </div>

        {/* OI PANEL */}
        <div className="rounded-xl p-3" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="mb-2 text-center text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>
            Index Futures — OI Change
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <OiCard label="Finnifty" value={oi.finnifty} icon={<TrendingUp size={13} />} />
            <OiCard label="Nifty" value={oi.nifty} icon={<BarChart3 size={13} />} />
            <OiCard label="Nifty Nxt50" value={oi.niftyNxt50} icon={<Activity size={13} />} />
            <OiCard label="Bank Nifty" value={oi.bankNifty} icon={<Landmark size={13} />} />
          </div>
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
});
