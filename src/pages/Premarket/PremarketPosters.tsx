import { useRef } from "react";
import { Rocket, CalendarClock, CalendarCheck2, Building2, BarChart2 } from "lucide-react";
import type { Week52Entry, CorporateAction, EarningsEvent, VolumeGainerQuote } from "../PostMarket/usePostMarket";
import type { IpoListings } from "./usePremarket";
import type { ReportBranding } from "./useReportBranding";
import type { SocialLinks } from "./useSocialLinks";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { Card } from "../../components/ui/Card";
import { PosterFrame, PosterActions, MAX_POSTER_ROWS, rowDensityFor, useAutoGrowHeight } from "./posterShared";
import { StockRow, EarningsPosterRow, ActionChip, IpoPosterRow, VolumeGainerPosterRow } from "./posterRows";
import { cn } from "../../lib/utils";

export function PremarketPosters({
  near52WeekHigh,
  earningsCalendar,
  corporateActions,
  ipos,
  volumeGainers,
  branding,
  links,
  setField,
  clear,
}: {
  near52WeekHigh: Week52Entry[];
  earningsCalendar: EarningsEvent[];
  corporateActions: CorporateAction[];
  ipos: IpoListings;
  volumeGainers: VolumeGainerQuote[];
  branding: ReportBranding;
  links: SocialLinks;
  setField: (field: keyof SocialLinks, value: string) => void;
  clear: () => void;
}) {
  const stocksRef = useRef<HTMLDivElement>(null);
  const earningsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const ipoRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const dateStr = new Date().toISOString().slice(0, 10);
  const stockItems = near52WeekHigh.slice(0, MAX_POSTER_ROWS);
  const stockDensity = rowDensityFor(stockItems.length);
  const hasStocks = stockItems.length > 0;

  const earningsItems = earningsCalendar.slice(0, MAX_POSTER_ROWS);
  const earningsDensity = rowDensityFor(earningsItems.length);
  const hasEarnings = earningsItems.length > 0;

  const actionItems = corporateActions.slice(0, MAX_POSTER_ROWS);
  const actionsDensity = rowDensityFor(actionItems.length);
  const hasActions = actionItems.length > 0;

  // Unlike the other list sections, IPO Watch never truncates — omitting a
  // live or upcoming issue is worse than a taller poster image. The frame
  // grows to fit via useAutoGrowHeight below instead of slicing to
  // MAX_POSTER_ROWS.
  const ipoCurrentItems = ipos.current;
  const ipoUpcomingItems = ipos.upcoming;
  const ipoDensity = rowDensityFor(ipoCurrentItems.length + ipoUpcomingItems.length);
  const hasIpos = ipoCurrentItems.length + ipoUpcomingItems.length > 0;
  const { contentRef: ipoContentRef, height: ipoFrameHeight } = useAutoGrowHeight();

  const volumeItems = volumeGainers.slice(0, MAX_POSTER_ROWS);
  const volumeDensity = rowDensityFor(volumeItems.length);
  const hasVolumeGainers = volumeItems.length > 0;

  if (!hasStocks && !hasEarnings && !hasActions && !hasIpos && !hasVolumeGainers) return null;

  return (
    <Card className="overflow-hidden">
      <div className="bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground">
              Share as Posters<span className="text-accent">.</span>
            </h2>
            <p className="text-xs text-subtle-foreground">Story-ready graphics for Instagram / WhatsApp status</p>
          </div>
          <SocialLinksEditor links={links} setField={setField} clear={clear} />
        </div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1">
          {hasStocks && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={stocksRef}
                  posterId="stocks-to-watch"
                  gradient="linear-gradient(160deg, #0f5132 0%, #06110c 70%)"
                  icon={<Rocket size={26} />}
                  title="Stocks to Watch"
                  subtitle="Near 52-Week High"
                  branding={branding}
                  links={links}
                >
                  <div className={cn("flex flex-col", stockDensity.gap)}>
                    {stockItems.map((item) => (
                      <StockRow key={item.symbol} symbol={item.symbol} density={stockDensity} />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={stocksRef}
                filename={`stoqtrade-stocks-to-watch-${dateStr}.png`}
                shareTitle="Stocks to Watch — Near 52-Week High"
              />
            </div>
          )}

          {hasEarnings && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={earningsRef}
                  posterId="upcoming-earnings"
                  gradient="linear-gradient(160deg, #1e3a8a 0%, #070a14 70%)"
                  icon={<CalendarClock size={26} />}
                  title="Upcoming Earnings"
                  subtitle="Results Calendar"
                  branding={branding}
                  links={links}
                >
                  <div className={cn("flex flex-col", earningsDensity.gap)}>
                    {earningsItems.map((item) => (
                      <EarningsPosterRow
                        key={`${item.symbol}-${item.date}`}
                        symbol={item.symbol}
                        date={item.date}
                        density={earningsDensity}
                      />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={earningsRef}
                filename={`stoqtrade-upcoming-earnings-${dateStr}.png`}
                shareTitle="Upcoming Earnings / Results"
              />
            </div>
          )}

          {hasActions && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={actionsRef}
                  posterId="corporate-actions"
                  gradient="linear-gradient(160deg, #92400e 0%, #0e0a06 70%)"
                  icon={<CalendarCheck2 size={26} />}
                  title="Corporate Actions"
                  subtitle="Dividends, Splits & More"
                  branding={branding}
                  links={links}
                >
                  <div className={cn("flex flex-col", actionsDensity.gap)}>
                    {actionItems.map((item) => (
                      <ActionChip
                        key={`${item.symbol}-${item.exDate}-${item.subject}`}
                        symbol={item.symbol}
                        exDate={item.exDate}
                        density={actionsDensity}
                      />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={actionsRef}
                filename={`stoqtrade-corporate-actions-${dateStr}.png`}
                shareTitle="Upcoming Corporate Actions"
              />
            </div>
          )}

          {hasIpos && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={ipoRef}
                  posterId="ipo-watch"
                  gradient="linear-gradient(160deg, #9d174d 0%, #0e0509 70%)"
                  icon={<Building2 size={26} />}
                  title="IPO Watch"
                  subtitle="Current & Upcoming"
                  branding={branding}
                  links={links}
                  height={ipoFrameHeight}
                >
                  <div ref={ipoContentRef} className={cn("flex flex-col", ipoDensity.gap)}>
                    {ipoCurrentItems.map((item) => (
                      <IpoPosterRow
                        key={item.symbol}
                        symbol={item.symbol}
                        company={item.company}
                        sub={`Open till ${item.endDate.replace(/-\d{4}$/, "")}`}
                        isSme={item.isSme}
                        density={ipoDensity}
                      />
                    ))}
                    {ipoUpcomingItems.map((item) => (
                      <IpoPosterRow
                        key={item.symbol}
                        symbol={item.symbol}
                        company={item.company}
                        sub={item.startDate.replace(/-\d{4}$/, "")}
                        isSme={item.isSme}
                        density={ipoDensity}
                      />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={ipoRef}
                filename={`stoqtrade-ipo-watch-${dateStr}.png`}
                shareTitle="IPO Watch — Current & Upcoming"
              />
            </div>
          )}

          {hasVolumeGainers && (
            <div className="flex shrink-0 snap-start flex-col">
              <div className="overflow-hidden rounded-2xl shadow-md">
                <PosterFrame
                  ref={volumeRef}
                  posterId="volume-gainers"
                  gradient="linear-gradient(160deg, #065f46 0%, #06110c 70%)"
                  icon={<BarChart2 size={26} />}
                  title="Volume Gainers"
                  subtitle="Unusual Activity Today"
                  branding={branding}
                  links={links}
                >
                  <div className={cn("flex flex-col", volumeDensity.gap)}>
                    {volumeItems.map((item) => (
                      <VolumeGainerPosterRow
                        key={item.symbol}
                        symbol={item.symbol}
                        changePct={item.changePct}
                        density={volumeDensity}
                      />
                    ))}
                  </div>
                </PosterFrame>
              </div>
              <PosterActions
                nodeRef={volumeRef}
                filename={`stoqtrade-volume-gainers-${dateStr}.png`}
                shareTitle="Volume Gainers"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
