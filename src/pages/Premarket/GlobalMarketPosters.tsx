import { useRef } from "react";
import { Gauge, Globe2, Boxes, Target, Landmark, BarChart3, Building2, ShieldBan } from "lucide-react";
import type { GiftNiftyData, PremarketQuote, NiftyPivotData, FiiDiiData, FiiDiiSide } from "./usePremarket";
import type { OptionChainSummary, FnoBanData } from "../MarketInternals/useMarketInternals";
import type { ReportBranding } from "./useReportBranding";
import type { SocialLinks } from "./useSocialLinks";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { Card } from "../../components/ui/Card";
import { PosterFrame, PosterActions, MAX_POSTER_ROWS, rowDensityFor, type RowDensity } from "./posterShared";
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
          <span className="text-white/70">{quote.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          {changeEl}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[10.5px] font-bold leading-tight text-white">{shortLabel(quote.label)}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-[9.5px]">
        <span className="text-white/70">{quote.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
        {changeEl}
      </div>
    </div>
  );
}

function RegionHeader({ label }: { label: string }) {
  return <div className="text-[8px] font-bold uppercase tracking-widest text-white/50">{label}</div>;
}

function GiftNiftyHeadline({ giftNifty }: { giftNifty: GiftNiftyData }) {
  const up = (giftNifty.changePct ?? 0) >= 0;
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2.5">
      <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-white/60">GIFT Nifty</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold text-white">
          {giftNifty.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
        {giftNifty.changePct !== null && (
          <span className={cn("text-sm font-bold", up ? "text-emerald-300" : "text-red-300")}>
            {up ? "+" : ""}
            {giftNifty.changePct}%
          </span>
        )}
      </div>
      {giftNifty.gapPoints !== null && (
        <div className="mt-0.5 text-[9px] font-medium text-white/60">
          Implied Nifty gap: {giftNifty.gapPoints >= 0 ? "+" : ""}
          {giftNifty.gapPoints} pts
        </div>
      )}
    </div>
  );
}

function PivotIndexBlock({ label, data }: { label: string; data: NiftyPivotData }) {
  const { levels } = data;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between rounded-lg bg-white/15 px-2.5 py-1">
        <span className="text-[8.5px] font-bold uppercase tracking-wide text-white/70">{label}</span>
        <span className="text-[13px] font-extrabold text-white">{levels.pivot.toLocaleString("en-IN")}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[levels.r1, levels.r2, levels.r3].map((v, i) => (
          <div key={i} className="rounded-md bg-white/10 px-1 py-0.5 text-center">
            <div className="text-[6.5px] font-semibold uppercase text-white/50">R{i + 1}</div>
            <div className="text-[9.5px] font-bold text-emerald-300">{v.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[levels.s1, levels.s2, levels.s3].map((v, i) => (
          <div key={i} className="rounded-md bg-white/10 px-1 py-0.5 text-center">
            <div className="text-[6.5px] font-semibold uppercase text-white/50">S{i + 1}</div>
            <div className="text-[9.5px] font-bold text-red-300">{v.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PivotLevelsBlock({ nifty, bankNifty }: { nifty: NiftyPivotData | null; bankNifty: NiftyPivotData | null }) {
  return (
    <div className="flex flex-col gap-1">
      {nifty && <PivotIndexBlock label="Nifty" data={nifty} />}
      {bankNifty && <PivotIndexBlock label="Bank Nifty" data={bankNifty} />}
    </div>
  );
}

function FiiDiiRow({ label, side }: { label: string; side?: FiiDiiSide }) {
  if (!side) return null;
  const net = side.netValue ?? 0;
  const positive = net >= 0;
  return (
    <div className="rounded-lg bg-white/10 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-white">{label}</span>
        <span className={cn("text-[10.5px] font-bold", positive ? "text-emerald-300" : "text-red-300")}>
          Net {positive ? "+" : ""}₹{net.toLocaleString("en-IN")} Cr
        </span>
      </div>
      <div className="flex items-center gap-3 text-[9px] text-white/70">
        <span>Buy ₹{side.buyValue?.toLocaleString("en-IN")} Cr</span>
        <span>Sell ₹{side.sellValue?.toLocaleString("en-IN")} Cr</span>
      </div>
    </div>
  );
}

function OptionChainBlock({ chain }: { chain: OptionChainSummary }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold text-white">{chain.symbol}</span>
        <span className="text-[8px] text-white/50">Exp {chain.expiry}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div>
          <div className="text-[8px] font-semibold uppercase text-white/50">Spot</div>
          <div className="text-[11px] font-bold text-white">
            {chain.underlyingValue?.toLocaleString("en-IN") ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[8px] font-semibold uppercase text-white/50">PCR</div>
          <div className="text-[11px] font-bold text-white">{chain.pcr ?? "—"}</div>
        </div>
        <div className="rounded bg-white/10 py-0.5">
          <div className="text-[8px] font-semibold uppercase text-white/50">Max Pain</div>
          <div className="text-[11px] font-bold text-emerald-300">{chain.maxPain ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}

function FnoBanChip({ symbol, density }: { symbol: string; density: RowDensity }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-white/10", density.padding)}>
      <span className={cn("font-bold text-white", density.primaryText)}>{symbol}</span>
    </div>
  );
}

export function GlobalMarketPosters({
  giftNifty,
  groups,
  niftyPivots,
  bankNiftyPivots,
  fiiDii,
  optionChains,
  fnoBan,
  branding,
  links,
  setField,
  clear,
}: {
  giftNifty: GiftNiftyData | null;
  groups: Record<string, PremarketQuote[]>;
  niftyPivots: NiftyPivotData | null;
  bankNiftyPivots: NiftyPivotData | null;
  fiiDii: FiiDiiData | null;
  optionChains: OptionChainSummary[];
  fnoBan: FnoBanData | null;
  branding: ReportBranding;
  links: SocialLinks;
  setField: (field: keyof SocialLinks, value: string) => void;
  clear: () => void;
}) {
  const giftRef = useRef<HTMLDivElement>(null);
  const indicesRef = useRef<HTMLDivElement>(null);
  const commoditiesRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<HTMLDivElement>(null);
  const fiiDiiRef = useRef<HTMLDivElement>(null);
  const optionChainRef = useRef<HTMLDivElement>(null);
  const adrRef = useRef<HTMLDivElement>(null);
  const fnoBanRef = useRef<HTMLDivElement>(null);

  const dateStr = new Date().toISOString().slice(0, 10);
  const vix = groups.domestic || [];
  const currency = groups.currency || [];
  const commodities = groups.commodities || [];
  const us = groups.us || [];
  const europe = groups.europe || [];
  const asia = groups.asia || [];
  const adrs = groups.adr || [];

  const hasGift = Boolean(giftNifty) || vix.length > 0 || currency.length > 0;
  const hasIndices = us.length > 0 || europe.length > 0 || asia.length > 0;
  const hasCommodities = commodities.length > 0;
  const hasPivots = Boolean(niftyPivots) || Boolean(bankNiftyPivots);
  const hasFiiDii = Boolean(fiiDii && (fiiDii.fii || fiiDii.dii));
  const hasOptionChains = optionChains.length > 0;
  const hasAdrs = adrs.length > 0;
  const hasFnoBan = Boolean(fnoBan);
  const fnoBanItems = (fnoBan?.symbols ?? []).slice(0, MAX_POSTER_ROWS);
  const fnoBanDensity = rowDensityFor(fnoBanItems.length);

  if (
    !hasGift &&
    !hasIndices &&
    !hasCommodities &&
    !hasPivots &&
    !hasFiiDii &&
    !hasOptionChains &&
    !hasAdrs &&
    !hasFnoBan
  )
    return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Global Market Posters<span className="text-accent">.</span>
            </h2>
            <p className="text-xs text-subtle-foreground">Story-ready graphics for global market cues</p>
          </div>
          <SocialLinksEditor links={links} setField={setField} clear={clear} />
        </div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
          {hasGift && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={giftRef}
                  posterId="gift-nifty-vix-currency"
                  gradient="linear-gradient(160deg, #4c1d95 0%, #0b0713 70%)"
                  icon={<Gauge size={26} />}
                  title="GIFT Nifty, VIX & Currency"
                  subtitle="Overnight Cues"
                  branding={branding}
                  links={links}
                >
                  {giftNifty && <GiftNiftyHeadline giftNifty={giftNifty} />}
                  {vix.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                  {currency.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={giftRef}
                filename={`stoqtrade-gift-nifty-vix-currency-${dateStr}.png`}
                shareTitle="GIFT Nifty, VIX & Currency"
              />
            </div>
          )}

          {hasIndices && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={indicesRef}
                  posterId="global-indices"
                  width={300}
                  gradient="linear-gradient(160deg, #0c4a6e 0%, #070c14 70%)"
                  icon={<Globe2 size={26} />}
                  title="Global Indices"
                  subtitle="US · Europe · Asia"
                  branding={branding}
                  links={links}
                >
                  {us.length > 0 && (
                    <div>
                      <RegionHeader label="US Markets" />
                      <div className="mt-1 grid grid-cols-2 gap-1.5">
                        {us.map((q) => (
                          <QuoteRow key={q.symbol} quote={q} compact />
                        ))}
                      </div>
                    </div>
                  )}
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
                    <div>
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
                nodeRef={indicesRef}
                width={300}
                filename={`stoqtrade-global-indices-${dateStr}.png`}
                shareTitle="Global Indices — US, Europe & Asia"
              />
            </div>
          )}

          {hasAdrs && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={adrRef}
                  posterId="indian-adrs"
                  gradient="linear-gradient(160deg, #831843 0%, #0c0508 70%)"
                  icon={<Building2 size={26} />}
                  title="Indian ADRs"
                  subtitle="NYSE / Nasdaq · Overnight Cues"
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
                  posterId="commodities"
                  gradient="linear-gradient(160deg, #78350f 0%, #0d0906 70%)"
                  icon={<Boxes size={26} />}
                  title="Commodities"
                  subtitle="Gold · Silver · Crude"
                  branding={branding}
                  links={links}
                >
                  {commodities.map((q) => (
                    <QuoteRow key={q.symbol} quote={q} />
                  ))}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={commoditiesRef}
                filename={`stoqtrade-commodities-${dateStr}.png`}
                shareTitle="Commodities Snapshot"
              />
            </div>
          )}

          {hasPivots && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={pivotRef}
                  posterId="nifty-banknifty-pivot-levels"
                  gradient="linear-gradient(160deg, #3730a3 0%, #0a0a14 70%)"
                  icon={<Target size={26} />}
                  title="Nifty & BankNifty Pivot Levels"
                  subtitle="Support & Resistance"
                  branding={branding}
                  links={links}
                >
                  <PivotLevelsBlock nifty={niftyPivots} bankNifty={bankNiftyPivots} />
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={pivotRef}
                filename={`stoqtrade-nifty-banknifty-pivot-levels-${dateStr}.png`}
                shareTitle="Nifty & BankNifty Pivot Levels"
              />
            </div>
          )}

          {hasFiiDii && fiiDii && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={fiiDiiRef}
                  posterId="fii-dii-activity"
                  gradient="linear-gradient(160deg, #164e63 0%, #08111a 70%)"
                  icon={<Landmark size={26} />}
                  title="FII / DII Activity"
                  subtitle={fiiDii.date ?? "Latest Session"}
                  branding={branding}
                  links={links}
                >
                  <FiiDiiRow label="FII / FPI" side={fiiDii.fii} />
                  <FiiDiiRow label="DII" side={fiiDii.dii} />
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={fiiDiiRef}
                filename={`stoqtrade-fii-dii-activity-${dateStr}.png`}
                shareTitle="FII / DII Activity"
              />
            </div>
          )}

          {hasOptionChains && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={optionChainRef}
                  posterId="index-option-chain"
                  gradient="linear-gradient(160deg, #4a044e 0%, #0c0a14 70%)"
                  icon={<BarChart3 size={26} />}
                  title="Index Option Chain"
                  subtitle="PCR & Max Pain"
                  branding={branding}
                  links={links}
                >
                  {optionChains.map((chain) => (
                    <OptionChainBlock key={chain.symbol} chain={chain} />
                  ))}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={optionChainRef}
                filename={`stoqtrade-option-chain-pcr-maxpain-${dateStr}.png`}
                shareTitle="Index Option Chain — PCR & Max Pain"
              />
            </div>
          )}

          {hasFnoBan && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={fnoBanRef}
                  posterId="fno-ban-list"
                  gradient="linear-gradient(160deg, #7f1d1d 0%, #0c0505 70%)"
                  icon={<ShieldBan size={26} />}
                  title="F&O Ban List"
                  subtitle={fnoBan?.date ? `Trade Date ${fnoBan.date}` : "Securities Under Ban"}
                  branding={branding}
                  links={links}
                >
                  {fnoBanItems.length > 0 ? (
                    <div className={cn("grid grid-cols-2", fnoBanDensity.gap)}>
                      {fnoBanItems.map((symbol) => (
                        <FnoBanChip key={symbol} symbol={symbol} density={fnoBanDensity} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center text-[11px] font-semibold text-white/70">
                      No stocks in the F&O ban today
                    </div>
                  )}
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={fnoBanRef}
                filename={`stoqtrade-fno-ban-list-${dateStr}.png`}
                shareTitle="F&O Ban List"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
