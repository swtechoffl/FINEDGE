import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, TrendingUp, TrendingDown, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { cn } from "../../lib/utils";
import { relativeTime } from "../../data/mock";
import { exportReportToPdf } from "../../lib/exportPdf";
import { DisclaimerReportPage } from "../Premarket/DisclaimerReportPage";
import { useDisclaimerSettings } from "../Disclosure/useDisclaimerSettings";
import { DisclaimerSettingsEditor } from "../Disclosure/DisclaimerSettingsEditor";
import { usePostMarket } from "./usePostMarket";
import type {
  MoverQuote,
  OiBuildupEntry,
  IndexOiEntry,
  IndexCloseEntry,
  Week52Entry,
  MostActiveQuote,
  CorporateAction,
  VolumeGainerQuote,
  AdvanceDeclineData,
} from "./usePostMarket";

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

function SymbolLink({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <Link
      to={`/stock/${symbol}`}
      className={cn(
        "focus-ring min-w-0 truncate text-sm font-semibold text-foreground hover:text-accent hover:underline",
        className,
      )}
    >
      {symbol}
    </Link>
  );
}

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

function IndexCloseCard({ item }: { item: IndexCloseEntry }) {
  const up = item.changePct >= 0;
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <div className="text-xs font-semibold text-subtle-foreground">{item.label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-extrabold text-foreground">{item.price.toLocaleString("en-IN")}</span>
        <span className={cn("flex items-center gap-0.5 text-xs font-bold", up ? "text-bullish" : "text-bearish")}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : ""}
          {item.changePct}%
        </span>
      </div>
    </div>
  );
}

function MoverRow({ item }: { item: MoverQuote }) {
  const up = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <SymbolLink symbol={item.symbol} />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{item.price.toLocaleString("en-IN")}</span>
        <span
          className={cn(
            "flex min-w-[64px] items-center justify-end gap-0.5 text-sm font-bold",
            up ? "text-bullish" : "text-bearish",
          )}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : ""}
          {item.changePct}%
        </span>
      </div>
    </div>
  );
}

function MostActiveRow({ item }: { item: MostActiveQuote }) {
  const up = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <SymbolLink symbol={item.symbol} />
      <div className="flex items-center gap-3">
        <span className="text-xs text-subtle-foreground">₹{item.tradedValueCr.toLocaleString("en-IN")} Cr</span>
        <span className={cn("text-sm font-bold", up ? "text-bullish" : "text-bearish")}>
          {up ? "+" : ""}
          {item.changePct}%
        </span>
      </div>
    </div>
  );
}

function VolumeGainerRow({ item }: { item: VolumeGainerQuote }) {
  const up = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <SymbolLink symbol={item.symbol} />
      <div className="flex items-center gap-3 text-xs">
        <span className="text-subtle-foreground">
          Vol {(item.volume / 1e5).toFixed(1)}L ({item.week1VolChangePct >= 0 ? "+" : ""}
          {item.week1VolChangePct}% vs 1wk avg)
        </span>
        <span className={cn("font-semibold", up ? "text-bullish" : "text-bearish")}>
          {up ? "+" : ""}
          {item.changePct}%
        </span>
      </div>
    </div>
  );
}

function AdvanceDeclineBar({ data }: { data: AdvanceDeclineData }) {
  const advPct = data.total > 0 ? (data.advances / data.total) * 100 : 50;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-bullish">{data.advances} Advances</span>
        <span className="font-bold text-bearish">{data.declines} Declines</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-chip">
        <div className="h-full bg-bullish" style={{ width: `${advPct}%` }} />
        <div className="h-full bg-bearish" style={{ width: `${100 - advPct}%` }} />
      </div>
      <div className="text-xs text-subtle-foreground">
        {data.unchanged} unchanged · {data.total} total securities traded
      </div>
    </div>
  );
}

function BuildupRow({ item }: { item: OiBuildupEntry }) {
  const priceUp = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <SymbolLink symbol={item.symbol} className="text-xs" />
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs">
        <span className={cn("font-semibold", priceUp ? "text-bullish" : "text-bearish")}>
          {priceUp ? "+" : ""}
          {item.changePct}%
        </span>
        <span className="text-subtle-foreground">
          OI {item.oiChangePct >= 0 ? "+" : ""}
          {item.oiChangePct}%
        </span>
      </div>
    </div>
  );
}

const OI_BUILDUP_META: Record<string, { label: string; color: string; hint: string }> = {
  longBuildup: { label: "Long Buildup", color: "var(--bullish)", hint: "Price up, OI up" },
  shortBuildup: { label: "Short Buildup", color: "var(--bearish)", hint: "Price down, OI up" },
  shortCovering: { label: "Short Covering", color: "var(--bullish)", hint: "Price up, OI down" },
  longUnwinding: { label: "Long Unwinding", color: "var(--bearish)", hint: "Price down, OI down" },
};

function IndexOiBar({ item, maxChange }: { item: IndexOiEntry; maxChange: number }) {
  const up = item.changeInOI >= 0;
  const pct = maxChange > 0 ? (Math.abs(item.changeInOI) / maxChange) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">{item.symbol}</span>
        <span className={cn("font-semibold", up ? "text-bullish" : "text-bearish")}>
          {up ? "+" : ""}
          {item.oiChangePct}% OI
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-chip">
        <div
          className={cn("h-full rounded-full", up ? "bg-bullish" : "bg-bearish")}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

function Week52Row({ item, kind }: { item: Week52Entry; kind: "high" | "low" }) {
  const dist = kind === "high" ? item.distFromHighPct : item.distFromLowPct;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <SymbolLink symbol={item.symbol} />
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{item.price.toLocaleString("en-IN")}</span>
        <span className="font-semibold text-subtle-foreground">{dist}% away</span>
      </div>
    </div>
  );
}

type SendState = "idle" | "sending" | "sent" | "error";

export function PostMarketPage() {
  const { data, loading, refreshing, refresh } = usePostMarket();
  const disclaimerSettings = useDisclaimerSettings();
  const reportRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");

  // ?export=1 drives an automated headless-browser capture for Telegram
  // delivery (see server/reportScreenshots.js) — forces a live refresh on
  // its own, without needing an interactive click. data-export-ready only
  // appears once that refresh has actually landed, so the capture doesn't
  // screenshot a pre-refresh, possibly-stale first paint.
  const isExportCapture = useMemo(() => new URLSearchParams(window.location.search).get("export") === "1", []);
  const [captureReady, setCaptureReady] = useState(false);
  useEffect(() => {
    if (!isExportCapture) return;
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setCaptureReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isExportCapture, refresh]);

  const hasAnyData =
    data.gainers.length > 0 ||
    data.losers.length > 0 ||
    data.indexOi.length > 0 ||
    data.corporateActions.length > 0;

  const meta = data.fetchedAt > 0 ? `Updated ${relativeTime(new Date(data.fetchedAt).toISOString())}` : undefined;
  const maxIndexOiChange = Math.max(...data.indexOi.map((i) => Math.abs(i.changeInOI)), 1);
  const buildupKeys = ["longBuildup", "shortBuildup", "shortCovering", "longUnwinding"] as const;

  async function handleSendTelegram() {
    setSendState("sending");
    try {
      const res = await fetch("/api/telegram/send-report-now?report=postmarket", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.detail || json.error || "Send failed");
      setSendState("sent");
    } catch {
      setSendState("error");
    } finally {
      setTimeout(() => setSendState("idle"), 4000);
    }
  }

  async function handleExport() {
    if (!reportRef.current || !disclaimerRef.current) return;
    setExporting(true);
    // Force a real-time refetch (bypassing the server's own cache TTL)
    // right before rasterizing, so the exported PDF reflects live data at
    // export time rather than whatever the background poller last fetched.
    await refresh();
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportReportToPdf(
        [
          { node: reportRef.current },
          { node: disclaimerRef.current, mode: "fit" },
        ],
        `stoqtrade-postmarket-report-${dateStr}.pdf`,
      );
    } catch {
      // best-effort — the button re-enables either way, user can retry
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="post market report"
        meta={meta}
        extra={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={refreshing}
              title="Refresh for latest data"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
            </Button>
            <DisclaimerSettingsEditor {...disclaimerSettings} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTelegram}
              disabled={sendState === "sending" || !hasAnyData}
              title="Send today's report to Telegram now"
            >
              {sendState === "sending" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} className={sendState === "sent" ? "text-bullish" : undefined} />
              )}
              <span className="hidden sm:inline">
                {sendState === "sending" ? "Sending…" : sendState === "sent" ? "Sent!" : sendState === "error" ? "Failed" : "Send Now"}
              </span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !hasAnyData}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export PDF"}</span>
            </Button>
          </>
        }
      />

      <div
        className="mx-auto w-full max-w-5xl px-6 py-6"
        {...(isExportCapture ? { "data-export-ready": captureReady ? "1" : "0" } : {})}
      >
        {loading && !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching market internals from NSE…</p>
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Couldn't load market movers data. Make sure the API server is running.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div ref={reportRef} data-export-node="report" className="bg-surface p-6">
              <div className="mb-5 border-b border-border pb-4">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                  Post Market Report<span className="text-accent">.</span>
                </h2>
                <span className="text-xs text-subtle-foreground">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>

              {data.aiSummary && (
                <div className="mb-5 flex gap-2.5 rounded-xl border border-accent/15 bg-accent-bg p-4">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
                  <p className="text-sm leading-relaxed text-foreground">{data.aiSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                {data.indexClose.length > 0 && (
                  <BentoCard title="Index Closing Levels" className="col-span-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {data.indexClose.map((item) => (
                        <IndexCloseCard key={item.symbol} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.indexOi.length > 0 && (
                  <BentoCard title="Index Futures — OI Change" className="col-span-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                      {data.indexOi.map((idx) => (
                        <IndexOiBar key={idx.symbol} item={idx} maxChange={maxIndexOiChange} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.gainers.length > 0 && (
                  <BentoCard title="Top Gainers" className="col-span-4 lg:col-span-2">
                    <div className="flex flex-col">
                      {data.gainers.slice(0, 8).map((item) => (
                        <MoverRow key={item.symbol} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.losers.length > 0 && (
                  <BentoCard title="Top Losers" className="col-span-4 lg:col-span-2">
                    <div className="flex flex-col">
                      {data.losers.slice(0, 8).map((item) => (
                        <MoverRow key={item.symbol} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.mostActive.length > 0 && (
                  <BentoCard title="Most Active Equities (by value)" className="col-span-4">
                    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                      {data.mostActive.map((item) => (
                        <MostActiveRow key={item.symbol} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {data.advanceDecline && (
                  <BentoCard title="Market Breadth (Advance / Decline)" className="col-span-4 self-start lg:col-span-2">
                    <AdvanceDeclineBar data={data.advanceDecline} />
                  </BentoCard>
                )}

                {data.volumeGainers.length > 0 && (
                  <BentoCard title="Volume Gainers" className="col-span-4 lg:col-span-2">
                    <div className="flex flex-col">
                      {data.volumeGainers.slice(0, 8).map((item) => (
                        <VolumeGainerRow key={item.symbol} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                )}

                {buildupKeys.some((k) => data.oiBuildup[k].length > 0) && (
                  <BentoCard title="OI Buildup (F&O)" className="col-span-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {buildupKeys.map((key) => {
                        const meta = OI_BUILDUP_META[key];
                        const items = data.oiBuildup[key];
                        if (items.length === 0) return null;
                        return (
                          <div key={key}>
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                              <span className="text-xs font-bold text-foreground">{meta.label}</span>
                            </div>
                            <div className="mb-2 text-[10px] text-subtle-foreground">{meta.hint}</div>
                            <div className="flex flex-col">
                              {items.slice(0, 5).map((item) => (
                                <BuildupRow key={item.symbol} item={item} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </BentoCard>
                )}

                {(data.near52WeekHigh.length > 0 || data.near52WeekLow.length > 0) && (
                  <BentoCard title="52-Week High / Low Watch" className="col-span-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {data.near52WeekHigh.length > 0 && (
                        <div>
                          <div className="mb-1.5 text-xs font-bold text-bullish">Near 52-Week High</div>
                          <div className="flex flex-col">
                            {data.near52WeekHigh.map((item) => (
                              <Week52Row key={item.symbol} item={item} kind="high" />
                            ))}
                          </div>
                        </div>
                      )}
                      {data.near52WeekLow.length > 0 && (
                        <div>
                          <div className="mb-1.5 text-xs font-bold text-bearish">Near 52-Week Low</div>
                          <div className="flex flex-col">
                            {data.near52WeekLow.map((item) => (
                              <Week52Row key={item.symbol} item={item} kind="low" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </BentoCard>
                )}

                {data.corporateActionsAll.length > 0 && (
                  <BentoCard title="Upcoming Corporate Actions" className="col-span-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {data.corporateActionsAll.slice(0, 20).map((ca) => (
                        <CorporateActionChip key={`${ca.symbol}-${ca.exDate}-${ca.subject}`} item={ca} />
                      ))}
                    </div>
                  </BentoCard>
                )}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <DisclaimerReportPage ref={disclaimerRef} settings={disclaimerSettings.settings} />
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
