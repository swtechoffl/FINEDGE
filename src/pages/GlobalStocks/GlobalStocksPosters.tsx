import { useRef } from "react";
import { Eye, TrendingUp, TrendingDown, Globe2, Boxes, Building2, Coins } from "lucide-react";
import type { PremarketQuote } from "../Premarket/usePremarket";
import type { ReportBranding } from "../Premarket/useReportBranding";
import type { SocialLinks } from "../Premarket/useSocialLinks";
import { SocialLinksEditor } from "../Premarket/SocialLinksEditor";
import { Card } from "../../components/ui/Card";
import { PosterFrame, PosterActions, MAX_POSTER_ROWS, rowDensityFor, type RowDensity } from "../Premarket/posterShared";
import { cn } from "../../lib/utils";

// Poster rows have limited width — a trailing "(WTI)"-style qualifier is the
// one thing in our label set long enough to force truncation, so drop it.
function shortLabel(label: string) {
  return label.replace(/\s*\([^)]*\)\s*$/, "");
}

function QuoteRow({ quote, compact }: { quote: PremarketQuote; compact?: boolean }) {
  const up = quote.changePct >= 0;
  const changeEl = (
    <span className={cn("font-bold", up ? "text-emerald-300" : "text-red-300")}>
      {up ? "+" : ""}
      {quote.changePct}%
    </span>
  );

  if (compact) {
    // Stacked layout: each cell in a 2-column grid is only ~half width, so
    // label and price/change get their own line instead of squeezing side by
    // side (which is what forced truncation before).
    return (
      <div className="rounded-lg bg-white/10 px-2 py-1.5">
        <div className="text-[9.5px] font-bold leading-tight text-white">{shortLabel(quote.label)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-[9px]">
          <span className="text-white/70">{quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
          {changeEl}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[10.5px] font-bold leading-tight text-white">{shortLabel(quote.label)}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-[9.5px]">
        <span className="text-white/70">{quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
        {changeEl}
      </div>
    </div>
  );
}

function RegionHeader({ label }: { label: string }) {
  return <div className="text-[8px] font-bold uppercase tracking-widest text-white/50">{label}</div>;
}

// Single vertical row for the ranked list posters (Stocks to Watch / Top
// Gainers / Top Losers) — steps down through density tiers as the list
// grows, same as the Indian poster rows.
function StockListRow({ quote, density }: { quote: PremarketQuote; density: RowDensity }) {
  const up = quote.changePct >= 0;
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-white/10", density.padding)}>
      <span className={cn("min-w-0 flex-1 truncate font-bold leading-tight text-white", density.primaryText)}>
        {shortLabel(quote.label)}
      </span>
      <div className={cn("flex shrink-0 items-center gap-1.5", density.secondaryText)}>
        <span className="text-white/70">{quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
        <span className={cn("font-bold", up ? "text-emerald-300" : "text-red-300")}>
          {up ? "+" : ""}
          {quote.changePct}%
        </span>
      </div>
    </div>
  );
}

function RankedListPoster({
  posterRef,
  posterId,
  gradient,
  icon,
  title,
  subtitle,
  items,
  branding,
  links,
  filename,
  shareTitle,
}: {
  posterRef: React.RefObject<HTMLDivElement | null>;
  posterId: string;
  gradient: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: PremarketQuote[];
  branding: ReportBranding;
  links: SocialLinks;
  filename: string;
  shareTitle: string;
}) {
  const rows = items.slice(0, MAX_POSTER_ROWS);
  const density = rowDensityFor(rows.length);
  return (
    <div className="flex shrink-0 snap-start flex-col">
      <div className="overflow-hidden rounded-2xl shadow-md">
        <PosterFrame
          ref={posterRef}
          posterId={posterId}
          gradient={gradient}
          icon={icon}
          title={title}
          subtitle={subtitle}
          branding={branding}
          links={links}
        >
          <div className={cn("flex flex-col", density.gap)}>
            {rows.map((q) => (
              <StockListRow key={q.symbol} quote={q} density={density} />
            ))}
          </div>
        </PosterFrame>
      </div>
      <PosterActions nodeRef={posterRef} filename={filename} shareTitle={shareTitle} />
    </div>
  );
}

export function GlobalStocksPosters({
  groups,
  branding,
  links,
  setField,
  clear,
}: {
  groups: Record<string, PremarketQuote[]>;
  branding: ReportBranding;
  links: SocialLinks;
  setField: (field: keyof SocialLinks, value: string) => void;
  clear: () => void;
}) {
  const watchRef = useRef<HTMLDivElement>(null);
  const gainersRef = useRef<HTMLDivElement>(null);
  const losersRef = useRef<HTMLDivElement>(null);
  const usIndicesRef = useRef<HTMLDivElement>(null);
  const globalIndicesRef = useRef<HTMLDivElement>(null);
  const commoditiesRef = useRef<HTMLDivElement>(null);
  const adrRef = useRef<HTMLDivElement>(null);

  const dateStr = new Date().toISOString().slice(0, 10);
  const usWatch = groups.usWatch || [];
  const usGainers = groups.usGainers || [];
  const usLosers = groups.usLosers || [];
  const us = groups.us || [];
  const europe = groups.europe || [];
  const asia = groups.asia || [];
  const commodities = groups.commodities || [];
  const currency = groups.currency || [];
  const adrs = groups.adr || [];

  const hasWatch = usWatch.length > 0;
  const hasGainers = usGainers.length > 0;
  const hasLosers = usLosers.length > 0;
  const hasUsIndices = us.length > 0;
  const hasGlobalIndices = europe.length > 0 || asia.length > 0;
  const hasCommodities = commodities.length > 0 || currency.length > 0;
  const hasAdrs = adrs.length > 0;

  if (
    !hasWatch &&
    !hasGainers &&
    !hasLosers &&
    !hasUsIndices &&
    !hasGlobalIndices &&
    !hasCommodities &&
    !hasAdrs
  )
    return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Global Stocks Posters<span className="text-accent">.</span>
            </h2>
            <p className="text-xs text-subtle-foreground">Story-ready graphics for US &amp; global equity updates</p>
          </div>
          <SocialLinksEditor links={links} setField={setField} clear={clear} />
        </div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
          {hasWatch && (
            <RankedListPoster
              posterRef={watchRef}
              posterId="us-stocks-to-watch"
              gradient="linear-gradient(160deg, #14532d 0%, #060d09 70%)"
              icon={<Eye size={26} />}
              title="Stocks to Watch"
              subtitle="US Mega-Caps · Overnight Move"
              items={usWatch}
              branding={branding}
              links={links}
              filename={`stoqtrade-us-stocks-to-watch-${dateStr}.png`}
              shareTitle="US Stocks to Watch"
            />
          )}

          {hasGainers && (
            <RankedListPoster
              posterRef={gainersRef}
              posterId="us-top-gainers"
              gradient="linear-gradient(160deg, #065f46 0%, #06110c 70%)"
              icon={<TrendingUp size={26} />}
              title="Top Gainers"
              subtitle="US Large-Caps · Overnight Session"
              items={usGainers}
              branding={branding}
              links={links}
              filename={`stoqtrade-us-top-gainers-${dateStr}.png`}
              shareTitle="US Top Gainers — Overnight Session"
            />
          )}

          {hasLosers && (
            <RankedListPoster
              posterRef={losersRef}
              posterId="us-top-losers"
              gradient="linear-gradient(160deg, #7f1d1d 0%, #0c0505 70%)"
              icon={<TrendingDown size={26} />}
              title="Top Losers"
              subtitle="US Large-Caps · Overnight Session"
              items={usLosers}
              branding={branding}
              links={links}
              filename={`stoqtrade-us-top-losers-${dateStr}.png`}
              shareTitle="US Top Losers — Overnight Session"
            />
          )}

          {hasUsIndices && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={usIndicesRef}
                  posterId="us-indices"
                  gradient="linear-gradient(160deg, #0c4a6e 0%, #070c14 70%)"
                  icon={<Globe2 size={26} />}
                  title="US Indices"
                  subtitle="Dow · S&P 500 · Nasdaq · Russell"
                  branding={branding}
                  links={links}
                >
                  {us.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={usIndicesRef}
                filename={`stoqtrade-us-indices-${dateStr}.png`}
                shareTitle="US Indices"
              />
            </div>
          )}

          {hasGlobalIndices && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={globalIndicesRef}
                  posterId="global-indices-eu-asia"
                  width={300}
                  gradient="linear-gradient(160deg, #3730a3 0%, #0a0a14 70%)"
                  icon={<Globe2 size={26} />}
                  title="Europe &amp; Asia Indices"
                  subtitle="Global Equity Cues"
                  branding={branding}
                  links={links}
                >
                  {europe.length > 0 && (
                    <div>
                      <RegionHeader label="Europe" />
                      <div className="mt-1 grid grid-cols-2 gap-1.5">
                        {europe.map((q) => (
                          <QuoteRow key={q.symbol} quote={q} compact />
                        ))}
                      </div>
                    </div>
                  )}
                  {asia.length > 0 && (
                    <div className={europe.length > 0 ? "mt-2" : undefined}>
                      <RegionHeader label="Asia" />
                      <div className="mt-1 grid grid-cols-2 gap-1.5">
                        {asia.map((q) => (
                          <QuoteRow key={q.symbol} quote={q} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={globalIndicesRef}
                width={300}
                filename={`stoqtrade-europe-asia-indices-${dateStr}.png`}
                shareTitle="Europe & Asia Indices"
              />
            </div>
          )}

          {hasAdrs && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={adrRef}
                  posterId="indian-adrs-global"
                  gradient="linear-gradient(160deg, #831843 0%, #0c0508 70%)"
                  icon={<Building2 size={26} />}
                  title="Indian ADRs"
                  subtitle="NYSE / Nasdaq · Overnight"
                  branding={branding}
                  links={links}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {adrs.map((q) => (
                      <QuoteRow key={q.symbol} quote={q} compact />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={adrRef}
                filename={`stoqtrade-indian-adrs-${dateStr}.png`}
                shareTitle="Indian ADRs — NYSE/Nasdaq"
              />
            </div>
          )}

          {hasCommodities && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={commoditiesRef}
                  posterId="commodities-currency-global"
                  gradient="linear-gradient(160deg, #78350f 0%, #0d0906 70%)"
                  icon={commodities.length > 0 ? <Boxes size={26} /> : <Coins size={26} />}
                  title="Commodities &amp; Currency"
                  subtitle="Gold · Silver · Crude · FX"
                  branding={branding}
                  links={links}
                >
                  {commodities.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                  {currency.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={commoditiesRef}
                filename={`stoqtrade-commodities-currency-${dateStr}.png`}
                shareTitle="Commodities & Currency Snapshot"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
