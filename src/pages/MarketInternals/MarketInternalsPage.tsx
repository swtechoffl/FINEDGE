import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { cn } from "../../lib/utils";
import { relativeTime } from "../../data/mock";
import { useMarketInternals } from "./useMarketInternals";
import type { ParticipantSeries, DealRow, ShortSellingRow, OptionChainSummary } from "./useMarketInternals";

function BentoCard({
  title,
  meta,
  className,
  children,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col rounded-2xl border border-border bg-app p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{title}</span>
        {meta && <span className="text-[10px] text-subtle-foreground">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function ParticipantTable({ series }: { series: ParticipantSeries }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase text-subtle-foreground">
            <th className="pb-1.5 font-semibold">Category</th>
            <th className="pb-1.5 text-right font-semibold">Long OI</th>
            <th className="pb-1.5 text-right font-semibold">Short OI</th>
            <th className="pb-1.5 text-right font-semibold">Net OI</th>
            <th className="pb-1.5 text-right font-semibold">Day Change</th>
          </tr>
        </thead>
        <tbody>
          {series.rows.map((r) => (
            <tr key={r.category} className="border-b border-border last:border-b-0">
              <td className="py-1.5 font-semibold text-foreground">{r.category}</td>
              <td className="py-1.5 text-right text-muted-foreground">{fmt(r.totalLong)}</td>
              <td className="py-1.5 text-right text-muted-foreground">{fmt(r.totalShort)}</td>
              <td className={cn("py-1.5 text-right font-semibold", r.netOi >= 0 ? "text-bullish" : "text-bearish")}>
                {r.netOi >= 0 ? "+" : ""}
                {fmt(r.netOi)}
              </td>
              <td
                className={cn(
                  "py-1.5 text-right font-semibold",
                  r.netOiChange === null ? "text-subtle-foreground" : r.netOiChange >= 0 ? "text-bullish" : "text-bearish",
                )}
              >
                {r.netOiChange === null ? "—" : `${r.netOiChange >= 0 ? "+" : ""}${fmt(r.netOiChange)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StrikeBar({ item, max, color }: { item: { strike: number; oi: number }; max: number; color: string }) {
  const pct = max > 0 ? (item.oi / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-semibold text-foreground">{item.strike}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: color }} />
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{fmt(item.oi)}</span>
    </div>
  );
}

function OptionChainCard({ chain }: { chain: OptionChainSummary }) {
  const maxOi = Math.max(...chain.topCallOi.map((s) => s.oi), ...chain.topPutOi.map((s) => s.oi), 1);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{chain.symbol}</span>
        <span className="text-xs text-subtle-foreground">Expiry {chain.expiry}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-app px-2 py-1.5">
          <div className="text-[10px] uppercase text-subtle-foreground">Spot</div>
          <div className="text-sm font-bold text-foreground">{chain.underlyingValue?.toLocaleString("en-IN") ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-app px-2 py-1.5">
          <div className="text-[10px] uppercase text-subtle-foreground">PCR</div>
          <div className="text-sm font-bold text-foreground">{chain.pcr ?? "—"}</div>
        </div>
        <div className="rounded-lg bg-accent-bg px-2 py-1.5">
          <div className="text-[10px] uppercase text-subtle-foreground">Max Pain</div>
          <div className="text-sm font-bold text-accent">{chain.maxPain ?? "—"}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase text-bearish">Call OI (Resistance)</div>
          <div className="flex flex-col gap-1.5">
            {chain.topCallOi.map((s) => (
              <StrikeBar key={s.strike} item={s} max={maxOi} color="var(--bearish)" />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase text-bullish">Put OI (Support)</div>
          <div className="flex flex-col gap-1.5">
            {chain.topPutOi.map((s) => (
              <StrikeBar key={s.strike} item={s} max={maxOi} color="var(--bullish)" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsTable({ rows }: { rows: DealRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase text-subtle-foreground">
            <th className="pb-1.5 font-semibold">Date</th>
            <th className="pb-1.5 font-semibold">Company</th>
            <th className="pb-1.5 font-semibold">Client</th>
            <th className="pb-1.5 text-center font-semibold">Side</th>
            <th className="pb-1.5 text-right font-semibold">Qty</th>
            <th className="pb-1.5 text-right font-semibold">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.symbol}-${r.client}-${i}`} className="border-b border-border last:border-b-0">
              <td className="whitespace-nowrap py-1.5 pr-3 text-xs text-subtle-foreground">{r.date}</td>
              <td className="max-w-[160px] truncate py-1.5 font-semibold text-foreground">{r.company}</td>
              <td className="max-w-[180px] truncate py-1.5 text-xs text-muted-foreground">{r.client}</td>
              <td className="py-1.5 text-center">
                <span className={cn("text-xs font-bold", r.buySell === "BUY" ? "text-bullish" : "text-bearish")}>
                  {r.buySell}
                </span>
              </td>
              <td className="py-1.5 text-right text-muted-foreground">{fmt(r.quantity)}</td>
              <td className="py-1.5 text-right text-muted-foreground">₹{r.price.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShortSellingList({ rows }: { rows: ShortSellingRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <div key={r.symbol} className="flex items-center justify-between gap-2 border-b border-border py-1.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{r.symbol}</div>
            <div className="truncate text-xs text-subtle-foreground">{r.company}</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-bearish">{fmt(r.quantity)}</span>
        </div>
      ))}
    </div>
  );
}

export function MarketInternalsPage() {
  const { data, loading } = useMarketInternals();
  const hasAnyData =
    data.participantOi !== null ||
    data.optionChains.length > 0 ||
    data.bulkDeals.length > 0 ||
    data.blockDeals.length > 0 ||
    data.shortSelling.length > 0;

  const meta = data.fetchedAt > 0 ? `Updated ${relativeTime(new Date(data.fetchedAt).toISOString())}` : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="market internals" meta={meta} />

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        {loading && !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching F&amp;O positioning data from NSE…</p>
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Couldn't load market internals. Make sure the API server is running.
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="bg-surface p-6">
              <div className="mb-5 border-b border-border pb-4">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                  Market Internals<span className="text-accent">.</span>
                </h2>
                <span className="text-xs text-subtle-foreground">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {data.optionChains.length > 0 && (
                  <BentoCard title="Index Option Chain — PCR &amp; Max Pain" className="col-span-4">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {data.optionChains.map((chain) => (
                        <OptionChainCard key={chain.symbol} chain={chain} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.participantOi && (
                  <BentoCard
                    title="Participant-wise Open Interest"
                    meta={data.participantOi.date}
                    className="col-span-4 lg:col-span-2"
                  >
                    <ParticipantTable series={data.participantOi} />
                  </BentoCard>
                )}

                {data.participantVolume && (
                  <BentoCard
                    title="Participant-wise Trading Volume"
                    meta={data.participantVolume.date}
                    className="col-span-4 lg:col-span-2"
                  >
                    <ParticipantTable series={data.participantVolume} />
                  </BentoCard>
                )}

                {data.bulkDeals.length > 0 && (
                  <BentoCard title="Bulk Deals" className="col-span-4">
                    <DealsTable rows={data.bulkDeals} />
                  </BentoCard>
                )}

                {data.blockDeals.length > 0 && (
                  <BentoCard title="Block Deals" className="col-span-4">
                    <DealsTable rows={data.blockDeals} />
                  </BentoCard>
                )}

                {data.shortSelling.length > 0 && (
                  <BentoCard title="Top Short Selling (by quantity)" className="col-span-4">
                    <ShortSellingList rows={data.shortSelling} />
                  </BentoCard>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
