import { forwardRef, type ReactNode } from "react";
import { TrendingUp, TrendingDown, X, Sparkles } from "lucide-react";
import type { PremarketData, FiiDiiSide, PremarketQuote, BarometerData, NiftyPivotData } from "./usePremarket";
import type { ReportBranding } from "./useReportBranding";
import type { Week52Entry, CorporateAction, EarningsEvent } from "../PostMarket/usePostMarket";
import type { NewsItem } from "../../types";
import { signalColor } from "../../components/SignalGauge";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";

// Each group becomes one bento cell, sized by how much it holds — spans are
// expressed against a 4-column grid so every row sums to a clean 4 and
// nothing trails off ragged. innerCols controls the mini-grid of quotes
// inside that cell, chosen to suit the cell's own rendered width.
const GROUP_CONFIG: Record<string, { label: string; cardSpan: string; innerCols: string }> = {
  domestic: { label: "Domestic", cardSpan: "col-span-4 sm:col-span-2 lg:col-span-1", innerCols: "grid-cols-1" },
  currency: { label: "Currency", cardSpan: "col-span-4 sm:col-span-2 lg:col-span-1", innerCols: "grid-cols-2" },
  commodities: { label: "Commodities", cardSpan: "col-span-4 lg:col-span-2", innerCols: "grid-cols-2 sm:grid-cols-3" },
  us: { label: "US Markets", cardSpan: "col-span-4 sm:col-span-2 lg:col-span-2", innerCols: "grid-cols-2 sm:grid-cols-4" },
  europe: { label: "Europe", cardSpan: "col-span-4 sm:col-span-2 lg:col-span-2", innerCols: "grid-cols-3" },
  asia: { label: "Asia", cardSpan: "col-span-4", innerCols: "grid-cols-2 sm:grid-cols-4" },
};
const GROUP_ORDER = ["domestic", "currency", "commodities", "us", "europe", "asia"];

// Small visual affordance so the bento grid reads faster at a glance —
// purely decorative, keyed by the exact label strings the server emits.
// Deliberately no flag emojis: Windows has no bundled glyphs for regional-
// indicator flag sequences and renders them as bare two-letter codes ("US",
// "GB", "JP"...) instead, so those are left as plain text labels.
const LABEL_EMOJI: Record<string, string> = {
  "India VIX": "🌡️",
  Gold: "🥇",
  Silver: "🥈",
  "Crude Oil (WTI)": "🛢️",
  "USD/INR": "💵",
  "GBP/INR": "💷",
};

function BentoCard({
  title,
  meta,
  className,
  accent,
  children,
}: {
  title?: string;
  meta?: ReactNode;
  className?: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-4",
        accent ? "border-accent/20 bg-accent-bg" : "border-border bg-app",
        className,
      )}
    >
      {(title || meta) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          {title && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider",
                accent ? "text-accent" : "text-subtle-foreground",
              )}
            >
              {title}
            </span>
          )}
          {meta && <div className="min-w-0 text-[10px] text-subtle-foreground">{meta}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function MiniQuote({ label, price, changePct }: Omit<PremarketQuote, "symbol">) {
  const up = changePct >= 0;
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] text-muted-foreground">
        {LABEL_EMOJI[label] ? `${LABEL_EMOJI[label]} ` : ""}
        {label}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="shrink-0 whitespace-nowrap text-sm font-bold text-foreground">
          {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold",
            up ? "text-bullish" : "text-bearish",
          )}
        >
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {up ? "+" : ""}
          {changePct}%
        </span>
      </div>
    </div>
  );
}

function FiiDiiLine({ label, side }: { label: string; side?: FiiDiiSide }) {
  if (!side) return null;
  const net = side.netValue ?? 0;
  const positive = net >= 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          Buy <span className="font-semibold text-foreground">₹{side.buyValue?.toLocaleString("en-IN")} Cr</span>
        </span>
        <span>
          Sell <span className="font-semibold text-foreground">₹{side.sellValue?.toLocaleString("en-IN")} Cr</span>
        </span>
        <span className={cn("font-bold", positive ? "text-bullish" : "text-bearish")}>
          Net {positive ? "+" : ""}₹{net.toLocaleString("en-IN")} Cr
        </span>
      </div>
    </div>
  );
}

const BAROMETER_DISPLAY_RANGE = 3; // clamp for gauge positioning — generous vs typical pre-market swings

function CueLine({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-subtle-foreground">{label}</span>
      <span className={cn("font-semibold", up ? "text-bullish" : "text-bearish")}>
        {up ? "+" : ""}
        {value}%
      </span>
    </div>
  );
}

// Analog dial geometry — a semicircle traced from 180° (left) through 90°
// (top) to 0° (right) in standard math convention, drawn directly as screen
// coordinates (y grows downward, so "up" is cy - r*sin(deg)).
const DIAL_CX = 120;
const DIAL_CY = 118;
const DIAL_R = 96;
const DIAL_STROKE = 16;
const NEEDLE_LEN = 84;
const DIAL_BANDS: { from: number; to: number; color: string }[] = [
  { from: 180, to: 120, color: "var(--bearish)" },
  { from: 120, to: 60, color: "var(--neutral)" },
  { from: 60, to: 0, color: "var(--bullish)" },
];

function polarPoint(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: DIAL_CX + r * Math.cos(rad), y: DIAL_CY - r * Math.sin(rad) };
}

function dialArcPath(fromDeg: number, toDeg: number) {
  const start = polarPoint(fromDeg, DIAL_R);
  const end = polarPoint(toDeg, DIAL_R);
  return `M ${start.x} ${start.y} A ${DIAL_R} ${DIAL_R} 0 0 1 ${end.x} ${end.y}`;
}

function MarketBarometer({ barometer }: { barometer: BarometerData }) {
  const clamped = Math.max(-BAROMETER_DISPLAY_RANGE, Math.min(BAROMETER_DISPLAY_RANGE, barometer.score));
  const needleDeg = 90 - (clamped / BAROMETER_DISPLAY_RANGE) * 90;
  const needleTip = polarPoint(needleDeg, NEEDLE_LEN);

  const labelText =
    barometer.label === "positive"
      ? "Positive Opening Expected"
      : barometer.label === "negative"
        ? "Negative Opening Expected"
        : "Flat Opening Expected";
  const labelColor =
    barometer.label === "positive" ? "text-bullish" : barometer.label === "negative" ? "text-bearish" : "text-neutral";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={cn("text-base font-extrabold tracking-tight", labelColor)}>{labelText}</span>
        <span className="text-xs text-muted-foreground">
          composite score {barometer.score >= 0 ? "+" : ""}
          {barometer.score}
        </span>
      </div>

      <div className="mx-auto w-full max-w-[280px]">
        <svg viewBox="0 0 240 132" className="w-full">
          {DIAL_BANDS.map((band) => (
            <path
              key={band.color}
              d={dialArcPath(band.from, band.to)}
              stroke={band.color}
              strokeWidth={DIAL_STROKE}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
          <line
            x1={DIAL_CX}
            y1={DIAL_CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--text-primary)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={DIAL_CX} cy={DIAL_CY} r={7} fill="var(--text-primary)" stroke="var(--bg-surface)" strokeWidth={2} />
        </svg>
      </div>
      <div className="mx-auto flex w-full max-w-[280px] justify-between text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
        <span>Negative</span>
        <span>Flat</span>
        <span>Positive</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-2.5 text-xs sm:grid-cols-4">
        <CueLine label="GIFT Nifty" value={barometer.cues.giftNifty} />
        <CueLine label="US Markets" value={barometer.cues.us} />
        <CueLine label="Europe / Asia" value={barometer.cues.global} />
        <CueLine label="Commodities" value={barometer.cues.commodities} />
      </div>
    </div>
  );
}

function NiftyPivotCard({ data }: { data: NiftyPivotData }) {
  const { levels, basis } = data;
  const rows: { label: string; value: number }[] = [
    { label: "R3", value: levels.r3 },
    { label: "R2", value: levels.r2 },
    { label: "R1", value: levels.r1 },
    { label: "Pivot", value: levels.pivot },
    { label: "S1", value: levels.s1 },
    { label: "S2", value: levels.s2 },
    { label: "S3", value: levels.s3 },
  ];
  const basisDate = new Date(`${basis.date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className={cn("rounded-lg px-1 py-1.5 text-center", label === "Pivot" ? "bg-accent-bg" : "bg-app")}
          >
            <div className="text-[10px] font-semibold uppercase text-subtle-foreground">{label}</div>
            <div
              className={cn(
                "text-xs font-bold",
                label.startsWith("R") ? "text-bullish" : label.startsWith("S") ? "text-bearish" : "text-foreground",
              )}
            >
              {value.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-subtle-foreground">
        Basis: NSE session {basisDate} — H {basis.high.toLocaleString("en-IN", { maximumFractionDigits: 2 })} · L{" "}
        {basis.low.toLocaleString("en-IN", { maximumFractionDigits: 2 })} · C{" "}
        {basis.close.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function Week52Row({ item, kind }: { item: Week52Entry; kind: "high" | "low" }) {
  const dist = kind === "high" ? item.distFromHighPct : item.distFromLowPct;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <span className="text-sm font-semibold text-foreground">{item.symbol}</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{item.price.toLocaleString("en-IN")}</span>
        <span className="font-semibold text-subtle-foreground">{dist}% away</span>
      </div>
    </div>
  );
}

function CorporateActionChip({ item }: { item: CorporateAction }) {
  const shortDate = item.exDate.replace(/-\d{4}$/, "");
  return (
    <span
      title={`${item.company} — ${item.subject}`}
      className="flex items-center justify-between gap-2 rounded-lg bg-app px-2.5 py-1.5 text-xs"
    >
      <span className="truncate font-bold text-foreground">{item.symbol}</span>
      <span className="shrink-0 text-subtle-foreground">{shortDate}</span>
    </span>
  );
}

function EarningsRow({ item }: { item: EarningsEvent }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{item.company}</div>
        <div className="text-xs text-subtle-foreground">{item.symbol}</div>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{item.date}</span>
    </div>
  );
}

function NewsRow({
  item,
  hideSource,
  onRemove,
}: {
  item: NewsItem;
  hideSource?: boolean;
  onRemove?: (id: string) => void;
}) {
  const color = signalColor(item.signal);
  return (
    <div className="flex items-start gap-3 border-b border-border py-2.5 last:border-b-0">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold leading-snug text-foreground">{item.headline}</span>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge size="sm">{item.category}</Badge>
          {!hideSource && <span className="text-xs text-subtle-foreground">{item.source}</span>}
        </div>
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(item.id)}
          title="Remove from report"
          className="focus-ring shrink-0 rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-bearish"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export const PremarketReportContent = forwardRef<
  HTMLDivElement,
  {
    data: PremarketData;
    branding: ReportBranding;
    highImpactNews: NewsItem[];
    exportMode?: boolean;
    candidateNews?: NewsItem[];
    isCustomized?: boolean;
    onAddNews?: (id: string) => void;
    onRemoveNews?: (id: string) => void;
    onResetNews?: () => void;
    near52WeekHigh?: Week52Entry[];
    near52WeekLow?: Week52Entry[];
    corporateActions?: CorporateAction[];
    earningsCalendar?: EarningsEvent[];
  }
>(
  (
    {
      data,
      branding,
      highImpactNews,
      exportMode,
      candidateNews,
      isCustomized,
      onAddNews,
      onRemoveNews,
      onResetNews,
      near52WeekHigh = [],
      near52WeekLow = [],
      corporateActions = [],
      earningsCalendar = [],
    },
    ref,
  ) => {
  const hasFiiDii = data.fiiDii && (data.fiiDii.fii || data.fiiDii.dii);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div ref={ref} className="bg-surface p-6">
      {/* Letterhead — shown on screen and captured in the exported PDF */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Premarket Report<span className="text-accent">.</span>
          </h2>
          <span className="text-xs text-subtle-foreground">{today}</span>
        </div>
        {(branding.name || branding.logoDataUrl) && (
          <div className="flex flex-col items-end gap-1.5">
            {branding.logoDataUrl && (
              <img
                src={branding.logoDataUrl}
                alt="Logo"
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            )}
            {branding.name && <span className="text-sm font-semibold text-foreground">{branding.name}</span>}
          </div>
        )}
      </div>

      {data.aiSummary && (
        <div className="mb-5 flex gap-2.5 rounded-xl border border-accent/15 bg-accent-bg p-4">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-foreground">{data.aiSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {data.giftNifty && (
          <BentoCard
            title="GIFT Nifty"
            meta={exportMode ? undefined : data.giftNifty.source}
            accent
            className="col-span-4 lg:col-span-2 justify-center"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">
                {data.giftNifty.price.toLocaleString("en-IN")}
              </span>
              {data.giftNifty.changePct !== null && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-sm font-semibold",
                    data.giftNifty.changePct >= 0 ? "text-bullish" : "text-bearish",
                  )}
                >
                  {data.giftNifty.changePct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {data.giftNifty.changePct >= 0 ? "+" : ""}
                  {data.giftNifty.changePct}%
                </span>
              )}
            </div>
            {data.giftNifty.gapPoints !== null && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                Implied Nifty gap:{" "}
                <span
                  className={cn("font-semibold", data.giftNifty.gapPoints >= 0 ? "text-bullish" : "text-bearish")}
                >
                  {data.giftNifty.gapPoints >= 0 ? "+" : ""}
                  {data.giftNifty.gapPoints} pts
                  {data.giftNifty.gapPercent !== null &&
                    ` (${data.giftNifty.gapPercent >= 0 ? "+" : ""}${data.giftNifty.gapPercent}%)`}
                </span>
              </div>
            )}
          </BentoCard>
        )}

        {hasFiiDii && (
          <BentoCard title="FII / DII Activity" meta={data.fiiDii!.date} className="col-span-4 lg:col-span-2 justify-center">
            <div className="flex flex-col divide-y divide-border">
              <FiiDiiLine label="FII / FPI" side={data.fiiDii!.fii} />
              <FiiDiiLine label="DII" side={data.fiiDii!.dii} />
            </div>
          </BentoCard>
        )}

        {data.barometer && (
          <BentoCard title="Market Barometer" className="col-span-4">
            <MarketBarometer barometer={data.barometer} />
          </BentoCard>
        )}

        {data.niftyPivots && (
          <BentoCard title="NIFTY Pivot Levels" className="col-span-4">
            <NiftyPivotCard data={data.niftyPivots} />
          </BentoCard>
        )}

        {GROUP_ORDER.map((key) => {
          const items = data.groups[key];
          const config = GROUP_CONFIG[key];
          if (!items || items.length === 0) return null;
          return (
            <BentoCard key={key} title={config.label} className={config.cardSpan}>
              <div className={cn("grid gap-x-3 gap-y-3", config.innerCols)}>
                {items.map((q) => (
                  <MiniQuote key={q.symbol} label={q.label} price={q.price} changePct={q.changePct} />
                ))}
              </div>
            </BentoCard>
          );
        })}

        {(near52WeekHigh.length > 0 || near52WeekLow.length > 0) && (
          <BentoCard title="52-Week High / Low Watch" className="col-span-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {near52WeekHigh.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-bold text-bullish">Near 52-Week High</div>
                  <div className="flex flex-col">
                    {near52WeekHigh.map((item) => (
                      <Week52Row key={item.symbol} item={item} kind="high" />
                    ))}
                  </div>
                </div>
              )}
              {near52WeekLow.length > 0 && (
                <div>
                  <div className="mb-1.5 text-xs font-bold text-bearish">Near 52-Week Low</div>
                  <div className="flex flex-col">
                    {near52WeekLow.map((item) => (
                      <Week52Row key={item.symbol} item={item} kind="low" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </BentoCard>
        )}

        {earningsCalendar.length > 0 && (
          <BentoCard title="Upcoming Earnings / Results" className="col-span-4 lg:col-span-2">
            <div className="flex flex-col">
              {earningsCalendar.slice(0, 6).map((item) => (
                <EarningsRow key={`${item.symbol}-${item.date}`} item={item} />
              ))}
            </div>
          </BentoCard>
        )}

        {corporateActions.length > 0 && (
          <BentoCard title="Upcoming Corporate Actions" className="col-span-4 self-start lg:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {corporateActions.slice(0, 12).map((item) => (
                <CorporateActionChip key={`${item.symbol}-${item.exDate}-${item.subject}`} item={item} />
              ))}
            </div>
          </BentoCard>
        )}

        {(highImpactNews.length > 0 || (onAddNews && !exportMode)) && (
          <BentoCard
            title="High Impact News"
            className="col-span-4"
            meta={
              !exportMode && onAddNews ? (
                <div className="flex items-center gap-2">
                  {isCustomized && onResetNews && (
                    <button
                      onClick={onResetNews}
                      className="focus-ring text-[10px] font-semibold text-accent hover:underline"
                    >
                      Reset
                    </button>
                  )}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAddNews(e.target.value);
                      e.target.value = "";
                    }}
                    className="focus-ring max-w-[200px] rounded-md border border-border bg-surface px-1.5 py-1 text-[10px] text-foreground"
                  >
                    <option value="" disabled>
                      + Add news…
                    </option>
                    {(candidateNews || []).map((n) => (
                      <option key={n.id} value={n.id}>
                        [{n.impact.toUpperCase()}] {n.headline.slice(0, 70)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : undefined
            }
          >
            <div className="flex flex-col">
              {highImpactNews.length === 0 ? (
                <p className="py-2 text-xs text-subtle-foreground">
                  No news added yet — use the dropdown above to add stories to this report.
                </p>
              ) : (
                highImpactNews.map((item) => (
                  <NewsRow
                    key={item.id}
                    item={item}
                    hideSource={exportMode}
                    onRemove={exportMode ? undefined : onRemoveNews}
                  />
                ))
              )}
            </div>
          </BentoCard>
        )}
      </div>
    </div>
  );
});
PremarketReportContent.displayName = "PremarketReportContent";
