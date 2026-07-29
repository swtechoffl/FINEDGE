import { useState } from "react";
import { X, ChevronDown, Sparkles, ExternalLink, Share2 } from "lucide-react";
import type { NewsItem } from "../../types";
import { SignalGauge, signalColor } from "../../components/SignalGauge";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";

const IMPACT_TEXT: Record<NewsItem["impact"], string> = {
  none: "No Impact",
  low: "Low Impact",
  moderate: "Medium Impact",
  high: "High Impact",
};

function formatAbsolute(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewsDrawer({
  item,
  onClose,
  onShare,
}: {
  item: NewsItem;
  onClose: () => void;
  onShare: (item: NewsItem) => void;
}) {
  const [aiOpen, setAiOpen] = useState(true);
  const color = signalColor(item.signal);

  return (
    <>
      <div
        className="animate-fade-in fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="animate-slide-in fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/90 px-5 py-4 backdrop-blur-md">
          <span className="text-sm font-bold text-foreground">News Detail</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onShare(item)}
              className="focus-ring rounded-full p-1.5 text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <Share2 size={17} />
            </button>
            <button
              onClick={onClose}
              className="focus-ring rounded-full p-1.5 text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="flex items-center gap-3">
            <SignalGauge signal={item.signal} size={56} />
            <div>
              <div className="text-sm font-extrabold" style={{ color }}>
                {item.signal.toUpperCase()}
              </div>
              <div className="text-xs text-subtle-foreground">{IMPACT_TEXT[item.impact]}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge size="md" className="uppercase">
              {item.category}
            </Badge>
            <Badge size="md">{item.source}</Badge>
          </div>

          <div className="text-xs text-subtle-foreground">{formatAbsolute(item.timestamp)}</div>

          <h2 className="text-lg font-bold leading-snug tracking-tight text-foreground">{item.headline}</h2>

          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
              Summary
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          </div>

          <div>
            <button
              onClick={() => setAiOpen((o) => !o)}
              className="focus-ring mb-1.5 flex w-full items-center justify-between rounded-md"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                <Sparkles size={13} className="text-accent" />
                AI Analysis
                {item.aiAnalysisSource === "ai" && (
                  <span className="rounded-full bg-accent-bg px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-accent">
                    Live AI
                  </span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={cn(
                  "text-subtle-foreground transition-transform duration-200 ease-[var(--ease-out-expo)]",
                  aiOpen && "rotate-180",
                )}
              />
            </button>
            {aiOpen && (
              <div className="animate-fade-in rounded-xl border border-accent/15 bg-accent-bg p-3 text-sm leading-relaxed text-foreground">
                {item.aiAnalysis}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
              Affected Tickers
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-subtle-foreground">
                      Ticker
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-subtle-foreground">
                      Featured In
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-subtle-foreground">
                      Price
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-subtle-foreground">
                      1D %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {item.affectedTickers.map((t) => (
                    <tr key={t.symbol} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold text-foreground">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <Badge variant={t.screensCount > 0 ? "accent" : "default"}>{t.screensCount} screens</Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{t.price.toLocaleString("en-IN")}</td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-semibold",
                          t.changePct >= 0 ? "text-bullish" : "text-bearish",
                        )}
                      >
                        {t.changePct >= 0 ? "+" : ""}
                        {t.changePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <a
            href={item.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-2 flex items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover hover:shadow-sm active:scale-[0.98]"
          >
            <ExternalLink size={15} />
            Read Full Article
          </a>
        </div>
      </div>
    </>
  );
}
