import { useEffect, useRef } from "react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { useReportBranding } from "../Premarket/useReportBranding";
import { ReportBrandingEditor } from "../Premarket/ReportBrandingEditor";
import { useSocialLinks } from "../Premarket/useSocialLinks";
import { SocialLinksEditor } from "../Premarket/SocialLinksEditor";
import { PosterActions, POSTER_WIDTH } from "../Premarket/posterShared";
import { usePostMarket } from "../PostMarket/usePostMarket";
import { MarketingPosterFrame } from "./MarketingPosterFrame";
import { MarketingPosterEditor } from "./MarketingPosterEditor";
import { useMarketingPosterOverrides } from "./useMarketingPosterOverrides";
import { MARKETING_POSTER_TEMPLATES, type MarketingPosterTemplate } from "./marketingPosterTemplates";
import { PostMarketSummaryPoster } from "./PostMarketSummaryPoster";
import { PostMarketSummaryEditor } from "./PostMarketSummaryEditor";
import { usePostMarketSummaryOverrides } from "./usePostMarketSummaryOverrides";

function MarketingPosterCard({
  template,
  branding,
  links,
  hasOverride,
  onChange,
  onReset,
}: {
  template: MarketingPosterTemplate;
  branding: ReturnType<typeof useReportBranding>["branding"];
  links: ReturnType<typeof useSocialLinks>["links"];
  hasOverride: boolean;
  onChange: (patch: Partial<Omit<MarketingPosterTemplate, "id">>) => void;
  onReset: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dateStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex shrink-0 snap-start flex-col">
      <div className="overflow-hidden rounded-2xl shadow-md">
        <MarketingPosterFrame
          ref={ref}
          posterId={template.id}
          color={template.color}
          kicker={template.kicker}
          heroText={template.heroText}
          heroSize={template.heroSize}
          heroSub={template.heroSub}
          features={template.features}
          cta={template.cta}
          branding={branding}
          links={links}
        />
      </div>
      <div className="mt-2" style={{ width: POSTER_WIDTH }}>
        <MarketingPosterEditor
          template={template}
          hasOverride={hasOverride}
          onChange={onChange}
          onReset={onReset}
          triggerClassName="w-full"
        />
      </div>
      <PosterActions nodeRef={ref} filename={`stoqtrade-${template.id}-${dateStr}.png`} shareTitle={template.kicker} />
    </div>
  );
}

const POST_MARKET_POSTER_WIDTH = 480;
const POST_MARKET_DEFAULTS = {
  titleLine1: "Closing",
  titleLine2: "Bell",
  subtitle: "Market Insights. Smarter Decisions.",
};

function PostMarketSummaryCard() {
  const ref = useRef<HTMLDivElement>(null);
  const dateStr = new Date().toISOString().slice(0, 10);
  const { data: postMarketData, refresh } = usePostMarket();
  const { override, setOverride, reset } = usePostMarketSummaryOverrides();

  // This poster's whole point is the day's closing levels, so it can't
  // settle for whatever the passive polling cache last happened to hold
  // (up to 10 min stale, on top of the server's own cache window) — force
  // a fresh fetch as soon as this card mounts.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const findIndex = (symbol: string, indexOverride?: { price?: number; changePct?: number }) => {
    const entry = postMarketData.indexClose.find((e) => e.symbol === symbol);
    if (!entry && !indexOverride) return null;
    return {
      price: indexOverride?.price ?? entry?.price ?? 0,
      changePct: indexOverride?.changePct ?? entry?.changePct ?? 0,
    };
  };
  const findOi = (symbol: string) => postMarketData.indexOi.find((e) => e.symbol === symbol)?.oiChangePct ?? null;

  const hasData = postMarketData.indexClose.length > 0;
  if (!hasData) return null;

  const titleLine1 = override.titleLine1 ?? POST_MARKET_DEFAULTS.titleLine1;
  const titleLine2 = override.titleLine2 ?? POST_MARKET_DEFAULTS.titleLine2;
  const subtitle = override.subtitle ?? POST_MARKET_DEFAULTS.subtitle;
  const moodOverride = override.moodOverride ?? null;

  return (
    <div className="flex flex-col items-start">
      <div className="overflow-hidden rounded-2xl shadow-md">
        <PostMarketSummaryPoster
          ref={ref}
          posterId="post-market-summary"
          width={POST_MARKET_POSTER_WIDTH}
          titleLine1={titleLine1}
          titleLine2={titleLine2}
          subtitle={subtitle}
          moodOverride={moodOverride}
          nifty={findIndex("^NSEI", override.nifty)}
          sensex={findIndex("^BSESN", override.sensex)}
          bankNifty={findIndex("^NSEBANK", override.bankNifty)}
          gainers={postMarketData.gainers.slice(0, 5)}
          losers={postMarketData.losers.slice(0, 5)}
          oi={{
            finnifty: findOi("FINNIFTY"),
            nifty: findOi("NIFTY"),
            niftyNxt50: findOi("NIFTYNXT50"),
            bankNifty: findOi("BANKNIFTY"),
          }}
        />
      </div>
      <div className="mt-2" style={{ width: POST_MARKET_POSTER_WIDTH }}>
        <PostMarketSummaryEditor
          titleLine1={titleLine1}
          titleLine2={titleLine2}
          subtitle={subtitle}
          moodOverride={moodOverride}
          nifty={findIndex("^NSEI")}
          sensex={findIndex("^BSESN")}
          bankNifty={findIndex("^NSEBANK")}
          niftyOverride={override.nifty}
          sensexOverride={override.sensex}
          bankNiftyOverride={override.bankNifty}
          hasOverride={Object.keys(override).length > 0}
          onChange={setOverride}
          onReset={reset}
        />
      </div>
      <PosterActions
        nodeRef={ref}
        filename={`stoqtrade-post-market-summary-${dateStr}.png`}
        shareTitle="Market Recap"
        width={POST_MARKET_POSTER_WIDTH}
        pixelRatio={2.25}
      />
    </div>
  );
}

export function MarketingPostersPage() {
  const { branding, setName, setLogoDataUrl, clear } = useReportBranding();
  const { links: socialLinks, setField: setSocialField, clear: clearSocialLinks } = useSocialLinks();
  const { overrides, setOverride, resetOverride, applyOverride } = useMarketingPosterOverrides();

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="marketing posters"
        meta="Story-ready graphics to promote your products"
        extra={<ReportBrandingEditor branding={branding} setName={setName} setLogoDataUrl={setLogoDataUrl} clear={clear} />}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-foreground">
                    Product Posters<span className="text-accent">.</span>
                  </h2>
                  <p className="text-xs text-subtle-foreground">
                    Demat & Trading, Mutual Funds, Insurance and more — tap Edit on any poster to make it your own
                  </p>
                </div>
                <SocialLinksEditor links={socialLinks} setField={setSocialField} clear={clearSocialLinks} />
              </div>

              <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
                {MARKETING_POSTER_TEMPLATES.map((template) => (
                  <MarketingPosterCard
                    key={template.id}
                    template={applyOverride(template)}
                    branding={branding}
                    links={socialLinks}
                    hasOverride={Boolean(overrides[template.id])}
                    onChange={(patch) => setOverride(template.id, patch)}
                    onReset={() => resetOverride(template.id)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="bg-surface p-5">
              <div className="mb-4">
                <h2 className="text-base font-extrabold tracking-tight text-foreground">
                  Post Market Summary<span className="text-accent">.</span>
                </h2>
                <p className="text-xs text-subtle-foreground">
                  A live end-of-day recap poster — Nifty, Sensex, Bank Nifty, gold, top movers & index futures OI
                </p>
              </div>

              <PostMarketSummaryCard />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
