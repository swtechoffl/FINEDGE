import { useParams, Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import { useStockDetail } from "./useStockDetail";
import type { HistoryPoint, StrikeOi } from "./useStockDetail";

function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

function PriceLineChart({ history, up }: { history: HistoryPoint[]; up: boolean }) {
  if (history.length < 2) return null;
  const width = 600;
  const height = 160;
  const padding = 6;
  const closes = history.map((h) => h.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = history
    .map((h, i) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((h.close - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const color = up ? "var(--bullish)" : "var(--bearish)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StrikeBar({ item, max, color }: { item: StrikeOi; max: number; color: string }) {
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

export function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const { data, loading, error } = useStockDetail(symbol);

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={symbol?.toLowerCase() || "stock"} />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <Link
          to="/postmarket"
          className="focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching {symbol}…</p>
          </div>
        ) : error || !data ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">Couldn't load data for {symbol}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight text-foreground">{data.symbol}</h2>
                    {data.sector && <Badge size="sm">{data.sector}</Badge>}
                    {data.industry && <Badge size="sm">{data.industry}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{data.name}</p>
                </div>
                {data.price !== null && (
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-foreground">₹{fmt(data.price)}</div>
                    {data.changePct !== null && (
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 text-sm font-semibold",
                          data.changePct >= 0 ? "text-bullish" : "text-bearish",
                        )}
                      >
                        {data.changePct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {data.changePct >= 0 ? "+" : ""}
                        {data.changePct}%
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(data.fiftyTwoWeekHigh || data.fiftyTwoWeekLow) && (
                <div className="mt-3 flex gap-4 text-xs text-subtle-foreground">
                  {data.fiftyTwoWeekHigh && <span>52W High: {fmt(data.fiftyTwoWeekHigh)}</span>}
                  {data.fiftyTwoWeekLow && <span>52W Low: {fmt(data.fiftyTwoWeekLow)}</span>}
                </div>
              )}
            </Card>

            {(data.open !== null || data.marketCapCr !== null) && (
              <Card className="p-6">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                  Trade Info
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {data.open !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Open</div>
                      <div className="text-sm font-bold text-foreground">₹{fmt(data.open)}</div>
                    </div>
                  )}
                  {data.dayHigh !== null && data.dayLow !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Day Range</div>
                      <div className="text-sm font-bold text-foreground">
                        {fmt(data.dayLow)} - {fmt(data.dayHigh)}
                      </div>
                    </div>
                  )}
                  {data.previousClose !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Prev Close</div>
                      <div className="text-sm font-bold text-foreground">₹{fmt(data.previousClose)}</div>
                    </div>
                  )}
                  {data.volume !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Volume</div>
                      <div className="text-sm font-bold text-foreground">{fmt(data.volume)}</div>
                    </div>
                  )}
                  {data.deliveryPct !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Delivery %</div>
                      <div className="text-sm font-bold text-foreground">{data.deliveryPct}%</div>
                    </div>
                  )}
                  {data.marketCapCr !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">Market Cap</div>
                      <div className="text-sm font-bold text-foreground">₹{fmt(data.marketCapCr)} Cr</div>
                    </div>
                  )}
                  {data.peRatio !== null && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">P/E</div>
                      <div className="text-sm font-bold text-foreground">{data.peRatio}</div>
                    </div>
                  )}
                  {data.isin && (
                    <div>
                      <div className="text-[10px] uppercase text-subtle-foreground">ISIN</div>
                      <div className="text-sm font-bold text-foreground">{data.isin}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {data.history.length > 1 && (
              <Card className="p-6">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                  6-Month Price History
                </div>
                <PriceLineChart history={data.history} up={data.changePct !== null ? data.changePct >= 0 : true} />
              </Card>
            )}

            {data.optionChain && (
              <Card className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
                    Option Chain Snapshot
                  </span>
                  <span className="text-xs text-subtle-foreground">Expiry {data.optionChain.expiry}</span>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-app px-2 py-1.5">
                    <div className="text-[10px] uppercase text-subtle-foreground">PCR</div>
                    <div className="text-sm font-bold text-foreground">{data.optionChain.pcr ?? "—"}</div>
                  </div>
                  <div className="rounded-lg bg-accent-bg px-2 py-1.5">
                    <div className="text-[10px] uppercase text-subtle-foreground">Max Pain</div>
                    <div className="text-sm font-bold text-accent">{data.optionChain.maxPain ?? "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase text-bearish">Call OI (Resistance)</div>
                    <div className="flex flex-col gap-1.5">
                      {data.optionChain.topCallOi.map((s) => (
                        <StrikeBar key={s.strike} item={s} max={Math.max(...data.optionChain!.topCallOi.map((x) => x.oi), 1)} color="var(--bearish)" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase text-bullish">Put OI (Support)</div>
                    <div className="flex flex-col gap-1.5">
                      {data.optionChain.topPutOi.map((s) => (
                        <StrikeBar key={s.strike} item={s} max={Math.max(...data.optionChain!.topPutOi.map((x) => x.oi), 1)} color="var(--bullish)" />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
