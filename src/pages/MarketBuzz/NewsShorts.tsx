import { useEffect, useRef, useState } from "react";
import { X, ExternalLink, MessageCircle, Share2, ChevronUp } from "lucide-react";
import type { NewsItem } from "../../types";
import { SignalGauge, signalColor } from "../../components/SignalGauge";
import { Badge } from "../../components/ui/Badge";
import { relativeTime } from "../../data/mock";

const IMPACT_TEXT: Record<NewsItem["impact"], string> = {
  none: "No Impact",
  low: "Low Impact",
  moderate: "Medium Impact",
  high: "High Impact",
};

const CLOSE_TRANSITION_MS = 280;
const DISMISS_THRESHOLD_PX = 90;

// Reels/shorts-style full-screen feed: one article per viewport-height
// section, native scroll-snap does the swipe gesture for us (more robust
// on touch devices than hand-rolled drag handlers). Presented like a
// native full-screen sheet — slides up on open, slides down on close —
// rather than an abrupt modal "pop", and can be pulled down to dismiss
// from the first card the way Reels/Shorts viewers work.
export function NewsShorts({
  items,
  startIndex,
  onClose,
  onShare,
}: {
  items: NewsItem[];
  startIndex: number;
  onClose: () => void;
  onShare: (item: NewsItem) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_TRANSITION_MS);
  }

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    setIndex((prev) => (prev !== i ? i : prev));
  }

  function handleTouchStart(e: React.TouchEvent) {
    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      draggingRef.current = true;
      touchStartYRef.current = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingRef.current) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0) {
      setDragY(Math.min(delta * 0.55, 200));
    } else {
      draggingRef.current = false;
      setDragY(0);
    }
  }

  function handleTouchEnd() {
    if (draggingRef.current && dragY > DISMISS_THRESHOLD_PX) {
      handleClose();
    } else {
      setDragY(0);
    }
    draggingRef.current = false;
  }

  const showSegments = items.length <= 40;
  const isDragging = draggingRef.current || dragY > 0;
  const sheetTransform = isDragging
    ? `translateY(${dragY}px)`
    : mounted && !closing
      ? "translateY(0)"
      : "translateY(100%)";

  return (
    <div
      className="fixed inset-0 z-[200] bg-app"
      style={{
        transform: sheetTransform,
        opacity: isDragging ? Math.max(1 - dragY / 260, 0.5) : 1,
        transition: isDragging ? "none" : `transform ${CLOSE_TRANSITION_MS}ms var(--ease-out-expo), opacity ${CLOSE_TRANSITION_MS}ms var(--ease-out-expo)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll overscroll-none scroll-smooth"
      >
        {items.map((item, i) => (
          <ShortCard key={item.id} item={item} active={i === index} onShare={onShare} />
        ))}
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-10 flex flex-col gap-2.5 px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        {showSegments && (
          <div className="flex items-center gap-1">
            {items.map((_, i) => (
              <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-accent transition-[width] duration-200"
                  style={{ width: i <= index ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-auto flex items-center justify-between">
          <span className="rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-md">
            {index + 1} / {items.length}
          </span>
          <button
            onClick={handleClose}
            className="focus-ring rounded-full border border-border bg-surface/90 p-2 text-foreground shadow-xs backdrop-blur-md transition-colors hover:bg-hover"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortCard({
  item,
  active,
  onShare,
}: {
  item: NewsItem;
  active: boolean;
  onShare: (item: NewsItem) => void;
}) {
  const color = signalColor(item.signal);

  return (
    <div className="relative flex h-dvh w-full snap-start snap-always flex-col items-center justify-center bg-app px-3">
      <div
        className="flex aspect-[9/16] w-full max-w-[440px] flex-col justify-center overflow-hidden rounded-[2rem] border border-border bg-surface p-7 text-center shadow-lg"
        style={{ borderTop: `5px solid ${color}` }}
      >
        <div className="flex flex-col items-center">
          <SignalGauge signal={item.signal} size={104} />
          <div className="mb-1 mt-3 text-lg font-extrabold tracking-wide" style={{ color }}>
            {item.signal.toUpperCase()}
          </div>
          <div className="mb-6 text-sm text-subtle-foreground">{IMPACT_TEXT[item.impact]}</div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Badge size="md" className="uppercase">
            {item.category}
          </Badge>
          <span className="text-sm text-subtle-foreground">{item.source}</span>
          <span className="text-sm text-subtle-foreground">· {relativeTime(item.timestamp)}</span>
        </div>

        <h2 className="mb-4 line-clamp-5 text-[28px] font-extrabold leading-[1.25] tracking-tight text-foreground">
          {item.headline}
        </h2>
        <p className="mb-6 line-clamp-6 text-base leading-relaxed text-muted-foreground">{item.summary}</p>

        {item.tickers.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
            {item.tickers.map((t) => (
              <span
                key={t.symbol}
                className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-sm font-semibold"
              >
                <span className="text-foreground">{t.symbol}</span>
                <span className={t.changePct >= 0 ? "text-bullish" : "text-bearish"}>
                  {t.changePct >= 0 ? "+" : ""}
                  {t.changePct}%
                </span>
                <span className="flex items-center gap-0.5 text-subtle-foreground">
                  <MessageCircle size={13} />
                  {t.commentCount}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <a
            href={item.articleUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover hover:shadow-sm active:scale-[0.98]"
          >
            <ExternalLink size={17} />
            Read Article
          </a>
          <button
            onClick={() => onShare(item)}
            className="focus-ring rounded-full border border-border-strong bg-surface p-3 text-muted-foreground shadow-xs transition-colors hover:bg-hover hover:text-foreground"
          >
            <Share2 size={19} />
          </button>
        </div>
      </div>

      {active && (
        <div className="animate-pulse-dot absolute bottom-5 flex flex-col items-center gap-0.5 text-subtle-foreground">
          <ChevronUp size={16} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Swipe for next</span>
        </div>
      )}
    </div>
  );
}
