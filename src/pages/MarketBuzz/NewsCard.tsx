import { MessageCircle, Share2 } from "lucide-react";
import type { NewsItem } from "../../types";
import { relativeTime } from "../../data/mock";
import { SignalGauge, signalColor } from "../../components/SignalGauge";
import { Badge } from "../../components/ui/Badge";

const IMPACT_TEXT: Record<NewsItem["impact"], string> = {
  none: "No Impact",
  low: "Low Impact",
  moderate: "Medium Impact",
  high: "High Impact",
};

export function NewsCard({
  item,
  onClick,
  onShare,
}: {
  item: NewsItem;
  onClick: () => void;
  onShare: (item: NewsItem) => void;
}) {
  const color = signalColor(item.signal);

  return (
    <div
      onClick={onClick}
      className="group focus-ring flex cursor-pointer gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs transition-all duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex w-20 shrink-0 flex-col items-center gap-1 pt-1 text-center">
        <SignalGauge signal={item.signal} size={44} />
        <span className="text-[11px] font-bold" style={{ color }}>
          {item.signal.toUpperCase()}
        </span>
        <span className="text-[10px] text-subtle-foreground">{IMPACT_TEXT[item.impact]}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase">{item.category}</Badge>
            <span className="text-xs text-subtle-foreground">{item.source}</span>
          </div>
          <span className="shrink-0 text-xs text-subtle-foreground">{relativeTime(item.timestamp)}</span>
        </div>

        <h3 className="mb-1 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-foreground">
          {item.headline}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.tickers.map((t) => (
              <span
                key={t.symbol}
                className="flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-1 text-xs font-semibold"
              >
                <span className="text-foreground">{t.symbol}</span>
                <span className={t.changePct >= 0 ? "text-bullish" : "text-bearish"}>
                  {t.changePct >= 0 ? "+" : ""}
                  {t.changePct}%
                </span>
                <span className="flex items-center gap-0.5 text-subtle-foreground">
                  <MessageCircle size={11} />
                  {t.commentCount}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(item);
            }}
            className="focus-ring shrink-0 rounded-full p-1.5 text-subtle-foreground opacity-0 transition-opacity duration-150 hover:bg-hover hover:text-foreground group-hover:opacity-100"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
