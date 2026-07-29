import { useRef } from "react";
import { Rocket, CalendarClock, CalendarCheck2 } from "lucide-react";
import type { Week52Entry, CorporateAction, EarningsEvent } from "../PostMarket/usePostMarket";
import type { ReportBranding } from "./useReportBranding";
import type { SocialLinks } from "./useSocialLinks";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { Card } from "../../components/ui/Card";
import { PosterFrame, PosterActions } from "./posterShared";

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

export function PremarketPosters({
  near52WeekHigh,
  earningsCalendar,
  corporateActions,
  branding,
  links,
  setField,
  clear,
}: {
  near52WeekHigh: Week52Entry[];
  earningsCalendar: EarningsEvent[];
  corporateActions: CorporateAction[];
  branding: ReportBranding;
  links: SocialLinks;
  setField: (field: keyof SocialLinks, value: string) => void;
  clear: () => void;
}) {
  const stocksRef = useRef<HTMLDivElement>(null);
  const earningsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const dateStr = new Date().toISOString().slice(0, 10);
  const hasStocks = near52WeekHigh.length > 0;
  const hasEarnings = earningsCalendar.length > 0;
  const hasActions = corporateActions.length > 0;

  if (!hasStocks && !hasEarnings && !hasActions) return null;

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
        </div>
      </div>
    </Card>
  );
}
