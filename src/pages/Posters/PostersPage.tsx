import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";
import { usePremarket } from "../Premarket/usePremarket";
import { usePostMarket } from "../PostMarket/usePostMarket";
import { useMarketInternals } from "../MarketInternals/useMarketInternals";
import { useReportBranding } from "../Premarket/useReportBranding";
import { ReportBrandingEditor } from "../Premarket/ReportBrandingEditor";
import { useSocialLinks } from "../Premarket/useSocialLinks";
import { PremarketPosters } from "../Premarket/PremarketPosters";
import { GlobalMarketPosters } from "../Premarket/GlobalMarketPosters";
import { PosterMakerPanel } from "../Premarket/PosterMakerPanel";
import { CarouselMakerPanel } from "./CarouselMaker/CarouselMakerPanel";

type SendState = "idle" | "sending" | "sent" | "error";
type ViewKey = "live" | "maker" | "carousel";
const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "live", label: "Live Posters" },
  { key: "maker", label: "Poster Maker" },
  { key: "carousel", label: "Carousel Maker" },
];

export function PostersPage() {
  const { data: premarketData, loading: premarketLoading } = usePremarket();
  const { data: moversData, loading: moversLoading } = usePostMarket();
  const { data: internalsData, loading: internalsLoading } = useMarketInternals();
  const { branding, setName, setLogoDataUrl, clear } = useReportBranding();
  const { links: socialLinks, setField: setSocialField, clear: clearSocialLinks } = useSocialLinks();
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("live");

  async function handleSendNow() {
    setSendState("sending");
    setSendError(null);
    try {
      const res = await fetch("/api/telegram/send-now", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.detail || json.error || "Send failed");
      if (json.sent === false) throw new Error(json.reason || "No poster data available yet");
      setSendState("sent");
    } catch (err) {
      setSendState("error");
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setTimeout(() => setSendState("idle"), 4000);
    }
  }

  const loading = premarketLoading && moversLoading && internalsLoading;
  const hasAnyData =
    moversData.near52WeekHigh.length > 0 ||
    moversData.earningsCalendar.length > 0 ||
    moversData.corporateActionsAll.length > 0 ||
    Boolean(premarketData.giftNifty) ||
    Boolean(premarketData.niftyPivots) ||
    Boolean(premarketData.bankNiftyPivots) ||
    Boolean(premarketData.fiiDii) ||
    internalsData.optionChains.length > 0 ||
    Boolean(internalsData.fnoBan) ||
    moversData.volumeGainers.length > 0 ||
    premarketData.ipos.current.length > 0 ||
    premarketData.ipos.upcoming.length > 0 ||
    Object.values(premarketData.groups).some((g) => g.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="posters"
        meta="Story-ready graphics for social sharing"
        extra={
          <>
            {view === "live" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendNow}
                disabled={sendState === "sending" || !hasAnyData}
                title="Send today's pre-market posters to Telegram now"
              >
                {sendState === "sending" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} className={sendState === "sent" ? "text-bullish" : undefined} />
                )}
                <span className="hidden sm:inline">
                  {sendState === "sending" ? "Sending…" : sendState === "sent" ? "Sent!" : "Send Now"}
                </span>
              </Button>
            )}
            <ReportBrandingEditor branding={branding} setName={setName} setLogoDataUrl={setLogoDataUrl} clear={clear} />
          </>
        }
      />
      {view === "live" && sendState === "error" && sendError && (
        <div className="mx-auto w-full max-w-5xl px-6 pt-4">
          <p className="rounded-lg border border-bearish/25 bg-bearish/10 px-3 py-2 text-xs font-medium text-bearish">
            Telegram send failed: {sendError}
          </p>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 border-b border-border">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "focus-ring -mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                view === key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "maker" && <PosterMakerPanel branding={branding} links={socialLinks} />}

        {view === "carousel" && <CarouselMakerPanel branding={branding} />}

        {view === "live" &&
          (loading && !hasAnyData ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-sm font-medium text-muted-foreground">Fetching market data…</p>
            </div>
          ) : !hasAnyData ? (
            <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Couldn't load poster data. Make sure the API server is running.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <PremarketPosters
                near52WeekHigh={moversData.near52WeekHigh}
                earningsCalendar={moversData.earningsCalendar}
                corporateActions={moversData.corporateActionsAll}
                ipos={premarketData.ipos}
                volumeGainers={moversData.volumeGainers}
                branding={branding}
                links={socialLinks}
                setField={setSocialField}
                clear={clearSocialLinks}
              />

              <GlobalMarketPosters
                giftNifty={premarketData.giftNifty}
                groups={premarketData.groups}
                niftyPivots={premarketData.niftyPivots}
                bankNiftyPivots={premarketData.bankNiftyPivots}
                fiiDii={premarketData.fiiDii}
                optionChains={internalsData.optionChains}
                fnoBan={internalsData.fnoBan}
                branding={branding}
                links={socialLinks}
                setField={setSocialField}
                clear={clearSocialLinks}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
