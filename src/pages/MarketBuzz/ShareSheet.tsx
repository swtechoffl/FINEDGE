import { useRef, useState } from "react";
import { X, Copy, Check, Download, Share2, Camera, MessageCircle } from "lucide-react";
import { toBlob } from "html-to-image";
import type { NewsItem } from "../../types";
import { signalColor } from "../../components/SignalGauge";
import { cn } from "../../lib/utils";

function buildShareText(item: NewsItem) {
  return `${item.headline}\n\n${item.summary}\n\nvia stoqtrade.ai\n${item.articleUrl}`;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ShareSheet({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const color = signalColor(item.signal);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  async function generateImageFile(): Promise<File | null> {
    if (!cardRef.current) return null;
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true });
      if (!blob) return null;
      return new File([blob], "stoqtrade-share.png", { type: "image/png" });
    } catch {
      setNotice("Couldn't generate the preview image — try Copy Link instead.");
      return null;
    }
  }

  function handleWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(buildShareText(item))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleInstagram() {
    setGenerating(true);
    setNotice(null);
    const file = await generateImageFile();
    setGenerating(false);
    if (!file) return;

    const shareData = { files: [file], title: item.headline, text: `${item.headline}\nvia stoqtrade.ai` };
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    downloadFile(file);
    setNotice(
      "Instagram sharing needs a mobile share sheet. Downloaded the preview image instead — open Instagram and share it from there.",
    );
  }

  async function handleDownload() {
    setGenerating(true);
    setNotice(null);
    const file = await generateImageFile();
    setGenerating(false);
    if (file) downloadFile(file);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(item.articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice("Couldn't copy the link — your browser may be blocking clipboard access.");
    }
  }

  async function handleMoreShare() {
    try {
      await navigator.share({ title: item.headline, text: item.summary, url: item.articleUrl });
    } catch {
      // user cancelled — no-op
    }
  }

  return (
    <>
      <div className="animate-fade-in fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="animate-scale-in flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-bold text-foreground">Share Article</span>
            <button
              onClick={onClose}
              className="focus-ring rounded-full p-1.5 text-subtle-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Preview card — this exact node is rasterized for Instagram/download */}
            <div className="mx-auto mb-5 w-[280px]">
              <div
                ref={cardRef}
                className="relative flex w-[280px] flex-col overflow-hidden rounded-[28px] border border-border bg-surface p-5"
                style={{ borderTop: `4px solid ${color}` }}
              >
                <div className="flex items-center justify-between">
                  <img src="/logo.png" alt="Finedge" className="h-4 w-auto" />
                  <span className="text-[10px] text-subtle-foreground">{item.source}</span>
                </div>

                <h3 className="mt-3 text-[17px] font-bold leading-snug tracking-tight text-foreground">
                  {item.headline}
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{item.summary}</p>

                {item.tickers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tickers.slice(0, 3).map((t) => (
                      <span
                        key={t.symbol}
                        className="flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[10px] font-semibold"
                      >
                        <span className="text-foreground">{t.symbol}</span>
                        <span className={t.changePct >= 0 ? "text-bullish" : "text-bearish"}>
                          {t.changePct >= 0 ? "+" : ""}
                          {t.changePct}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {notice && <p className="mb-3 rounded-lg bg-neutral-bg px-3 py-2 text-xs text-neutral">{notice}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleWhatsApp}
                className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button
                onClick={handleInstagram}
                disabled={generating}
                className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <Camera size={16} /> {generating ? "Preparing…" : "Instagram"}
              </button>
              <button
                onClick={handleCopyLink}
                className={cn(
                  "focus-ring flex items-center justify-center gap-2 rounded-xl border border-border-strong py-2.5 text-sm font-medium transition-colors hover:bg-hover",
                  copied ? "text-bullish" : "text-foreground",
                )}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy Link"}
              </button>
              <button
                onClick={handleDownload}
                disabled={generating}
                className="focus-ring flex items-center justify-center gap-2 rounded-xl border border-border-strong py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-hover disabled:opacity-60"
              >
                <Download size={15} /> Save Image
              </button>
            </div>

            {canNativeShare && (
              <button
                onClick={handleMoreShare}
                className="focus-ring mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-hover"
              >
                <Share2 size={15} /> More options…
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
