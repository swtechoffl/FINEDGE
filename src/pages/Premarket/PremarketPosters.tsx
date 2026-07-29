import { useRef } from "react";
import { Rocket, CalendarClock, CalendarCheck2, Building2, BarChart2 } from "lucide-react";
import type { Week52Entry, CorporateAction, EarningsEvent, VolumeGainerQuote } from "../PostMarket/usePostMarket";
import type { IpoListings } from "./usePremarket";
import type { ReportBranding } from "./useReportBranding";
import type { SocialLinks } from "./useSocialLinks";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { Card } from "../../components/ui/Card";
import { PosterFrame, PosterActions } from "./posterShared";
import { cn } from "../../lib/utils";

function StockRow({ item }: { item: Week52Entry }) {
  return (
    <div className="flex items-center rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[11px] font-bold text-white">{item.symbol}</span>
    </div>
  );
}

function EarningsPosterRow({ item }: { item: EarningsEvent }) {
  const shortDate = item.date.replace(/-\d{4}$/, "");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[10.5px] font-bold leading-tight text-white">{item.symbol}</span>
      <span className="shrink-0 text-[9.5px] font-semibold text-white/70">{shortDate}</span>
    </div>
  );
}

function ActionChip({ item }: { item: CorporateAction }) {
  const shortDate = item.exDate.replace(/-\d{4}$/, "");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[10.5px] font-bold leading-tight text-white">{item.symbol}</span>
      <span className="shrink-0 text-[9.5px] font-semibold text-white/70">{shortDate}</span>
    </div>
  );
}

function IpoPosterRow({ symbol, company, sub }: { symbol: string; company: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold text-white">{symbol}</span>
        <span className="shrink-0 text-[9px] font-semibold text-white/70">{sub}</span>
      </div>
      <div className="truncate text-[8.5px] text-white/55">{company}</div>
    </div>
  );
}

function VolumeGainerPosterRow({ item }: { item: VolumeGainerQuote }) {
  const up = item.changePct >= 0;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-1.5">
      <span className="text-[10.5px] font-bold leading-tight text-white">{item.symbol}</span>
      <span className={cn("shrink-0 text-[9.5px] font-bold", up ? "text-emerald-300" : "text-red-300")}>
        {up ? "+" : ""}
        {item.changePct}%
      </span>
    </div>
  );
}

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
  const hasStocks = near52WeekHigh.length > 0;
  const hasEarnings = earningsCalendar.length > 0;
  const hasActions = corporateActions.length > 0;
  const ipoItems = [...ipos.current, ...ipos.upcoming].slice(0, 6);
  const hasIpos = ipoItems.length > 0;
  const hasVolumeGainers = volumeGainers.length > 0;

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
                  {near52WeekHigh.slice(0, 6).map((item) => (
                    <StockRow key={item.symbol} item={item} />
                  ))}
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
                  {earningsCalendar.slice(0, 6).map((item) => (
                    <EarningsPosterRow key={`${item.symbol}-${item.date}`} item={item} />
                  ))}
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
                  <div className="flex flex-col gap-1.5">
                    {corporateActions.slice(0, 6).map((item) => (
                      <ActionChip key={`${item.symbol}-${item.exDate}-${item.subject}`} item={item} />
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
                >
                  {ipos.current.slice(0, 4).map((item) => (
                    <IpoPosterRow
                      key={item.symbol}
                      symbol={item.symbol}
                      company={item.company}
                      sub={`Open till ${item.endDate.replace(/-\d{4}$/, "")}`}
                    />
                  ))}
                  {ipos.upcoming.slice(0, 6 - ipos.current.length).map((item) => (
                    <IpoPosterRow
                      key={item.symbol}
                      symbol={item.symbol}
                      company={item.company}
                      sub={item.startDate.replace(/-\d{4}$/, "")}
                    />
                  ))}
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
                  {volumeGainers.slice(0, 6).map((item) => (
                    <VolumeGainerPosterRow key={item.symbol} item={item} />
                  ))}
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
