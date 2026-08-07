import { forwardRef, type ReactNode } from "react";
import { Bell, Calendar, ArrowUp, ArrowDown, Coins, TrendingUp, BarChart3, Activity, Landmark, Shield } from "lucide-react";
import { useFitHeight } from "./useFitHeight";
import { MarketMoodMotif } from "./MarketMoodMotif";

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

const POSITIVE = "#19D37A";
const NEGATIVE = "#FF4E5B";
const GOLD = "#F7B733";
const ACCENT = "#2D8CFF";

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
}

// changePct is the only figure the underlying data actually carries for
// indices — the absolute point change shown alongside it (per the brief's
// "▲ +11.35 (+0.05%)" format) is derived by inverting it back to a prior
// close, not a second live field.
function pointChange(price: number, changePct: number) {
  return price - price / (1 + changePct / 100);
}

function GoldSection({ ratePerGram }: { ratePerGram: number | null }) {
  return (
    <div className="flex flex-1 items-center gap-2 px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: GOLD }}>
        <Coins size={14} style={{ color: GOLD }} />
      </div>
      <div className="min-w-0">
        <div className="text-[6.5px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>
          Gold Rate
        </div>
        <div className="whitespace-nowrap text-[12px] font-extrabold leading-tight text-white">
          {ratePerGram !== null ? `₹${ratePerGram.toLocaleString("en-IN")}` : "—"}
          <span className="text-[7px] font-semibold text-white/50"> /g</span>
        </div>
        <div className="text-[6px] font-semibold leading-tight text-white/40">99.9% Purity (Intl.)</div>
      </div>
    </div>
  );
}

function MetricSection({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up = changePct >= 0;
  const color = up ? POSITIVE : NEGATIVE;
  const change = pointChange(price, changePct);
  return (
    <div className="flex flex-1 flex-col justify-center gap-0.5 border-l border-white/10 px-2.5 py-3">
      <div className="text-[6.5px] font-bold uppercase tracking-wide text-white/50">{label}</div>
      <div className="text-[11px] font-extrabold leading-tight text-white">
        {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </div>
      <div className="flex items-center gap-0.5 whitespace-nowrap text-[6.5px] font-bold leading-tight" style={{ color }}>
        <span>{up ? "▲" : "▼"}</span>
        <span>
          {up ? "+" : ""}
          {change.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
        <span className="text-white/40">
          ({up ? "+" : ""}
          {changePct.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

function MoverBadge({ tone }: { tone: "up" | "down" }) {
  const color = tone === "up" ? POSITIVE : NEGATIVE;
  const Icon = tone === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: color }}>
      <Icon size={11} color="#07111D" strokeWidth={3} />
    </div>
  );
}

function MoverCard({ title, tone, items }: { title: string; tone: "up" | "down"; items: MoverEntry[] }) {
  const color = tone === "up" ? POSITIVE : NEGATIVE;
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5">
        <MoverBadge tone={tone} />
        <span className="text-[8.5px] font-bold uppercase tracking-wide" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="flex items-center justify-between text-[6px] font-bold uppercase tracking-wide text-white/35">
        <span>Stock</span>
        <span>Change</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.symbol} className="flex items-center justify-between gap-2">
            <span className="truncate text-[9px] font-semibold text-white/90">{it.symbol}</span>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-white"
              style={{ background: color }}
            >
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
  const color = up ? POSITIVE : NEGATIVE;
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border bg-white/[0.02] px-1.5 py-2.5 text-center"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ borderColor: color, color }}>
        {icon}
      </div>
      <div className="text-[6px] font-bold uppercase leading-tight tracking-wide text-white/55">{label}</div>
      <div className="text-[9.5px] font-extrabold leading-tight" style={{ color }}>
        {value !== null ? `${up ? "+" : ""}${value.toFixed(2)}%` : "—"}
      </div>
      <div className="text-[5.5px] font-semibold uppercase tracking-wide text-white/35">OI</div>
    </div>
  );
}

export const PostMarketSummaryPoster = forwardRef<
  HTMLDivElement,
  {
    posterId: string;
    width: number;
    goldRateInrPerGram: number | null;
    nifty: IndexQuote | null;
    sensex: IndexQuote | null;
    bankNifty: IndexQuote | null;
    gainers: MoverEntry[];
    losers: MoverEntry[];
    oi: IndexOiChange;
  }
>(function PostMarketSummaryPoster(
  { posterId, width, goldRateInrPerGram, nifty, sensex, bankNifty, gainers, losers, oi },
  ref,
) {
  const { measureRef, height } = useFitHeight(width, 9, 16);

  return (
    <div
      ref={ref}
      data-poster={posterId}
      className="relative flex flex-col justify-center overflow-hidden"
      style={{
        width,
        height,
        background:
          "linear-gradient(165deg, #123049 0%, #0C1727 38%, #07111D 78%, #050B12 100%)," +
          "radial-gradient(90% 45% at 15% 0%, rgba(45,140,255,0.16), transparent 60%)," +
          "radial-gradient(70% 40% at 100% 100%, rgba(45,140,255,0.10), transparent 65%)",
      }}
    >
      <div ref={measureRef} className="flex flex-col gap-3 p-4">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[26px] font-black uppercase leading-[0.95] tracking-tight text-white">Market</div>
            <div
              className="text-[26px] font-black uppercase leading-[0.95] tracking-tight"
              style={{
                background: `linear-gradient(90deg, ${POSITIVE}, ${ACCENT})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Recap
            </div>
            <div className="mt-1.5 text-[7.5px] font-semibold uppercase tracking-wide text-white/45">
              Market Insights. Smarter Decisions.
            </div>
          </div>
          <div className="rounded-xl border px-2.5 py-1.5" style={{ borderColor: "rgba(45,140,255,0.4)" }}>
            <div className="flex items-center justify-end gap-1 text-[6px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>
              <Bell size={7} /> Closing Bell
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Calendar size={10} style={{ color: ACCENT }} />
              <span className="whitespace-nowrap text-[8.5px] font-bold text-white">{todayLabel()}</span>
            </div>
          </div>
        </div>

        {/* INFO BAR — one continuous panel */}
        <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <GoldSection ratePerGram={goldRateInrPerGram} />
          {nifty && <MetricSection label="Nifty 50" price={nifty.price} changePct={nifty.changePct} />}
          {sensex && <MetricSection label="Sensex" price={sensex.price} changePct={sensex.changePct} />}
          {bankNifty && <MetricSection label="Bank Nifty" price={bankNifty.price} changePct={bankNifty.changePct} />}
        </div>

        {/* CENTER MOTIF */}
        <MarketMoodMotif niftyChangePct={nifty?.changePct ?? null} />

        {/* GAINERS / LOSERS */}
        <div className="flex gap-2.5">
          <MoverCard title="Top Gainers" tone="up" items={gainers} />
          <MoverCard title="Top Losers" tone="down" items={losers} />
        </div>

        {/* OI PANEL */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 text-center text-[8px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
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
          <Shield size={9} className="mt-0.5 shrink-0 text-white/30" />
          <p className="text-center text-[6.5px] leading-snug text-white/35">
            Investments in securities market are subject to market risks. Read all related documents carefully
            before investing.
          </p>
        </div>
      </div>
    </div>
  );
});
