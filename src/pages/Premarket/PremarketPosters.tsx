import { forwardRef, useRef, useState, type ReactNode } from "react";
import { AtSign, Download, Rocket, Send, Share2, Globe, CalendarClock, CalendarCheck2 } from "lucide-react";
import type { Week52Entry, CorporateAction, EarningsEvent } from "../PostMarket/usePostMarket";
import type { ReportBranding } from "./useReportBranding";
import { useSocialLinks, socialDisplay, type SocialLinks } from "./useSocialLinks";
import { SocialLinksEditor } from "./SocialLinksEditor";
import { BrandMark } from "../../components/BrandMark";
import { Card } from "../../components/ui/Card";
import { nodeToImageFile, downloadFile, shareImageFile } from "../../lib/shareImage";

const SOCIAL_META: Record<keyof SocialLinks, { icon: typeof AtSign; tag: string }> = {
  instagram: { icon: AtSign, tag: "IG" },
  twitter: { icon: AtSign, tag: "X" },
  telegram: { icon: Send, tag: "TG" },
  website: { icon: Globe, tag: "" },
};

const POSTER_WIDTH = 210;

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function FollowUsFooter({ links, brandName }: { links: SocialLinks; brandName: string }) {
  const entries = (Object.keys(links) as (keyof SocialLinks)[]).filter((k) => links[k].trim());
  return (
    <div className="border-t border-white/25 pt-2.5">
      {entries.length > 0 ? (
        <>
          <div className="mb-1 text-[8px] font-bold uppercase tracking-widest text-white/60">Follow Us</div>
          <div className="flex flex-col gap-0.5">
            {entries.map((k) => {
              const { icon: Icon, tag } = SOCIAL_META[k];
              return (
                <div key={k} className="flex items-center gap-1.5 text-[9.5px] font-semibold text-white">
                  <Icon size={10} className="shrink-0 text-white/80" />
                  {tag && <span className="text-white/60">{tag}</span>}
                  <span className="truncate">{socialDisplay(k, links[k])}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-[9.5px] font-semibold text-white/70">{brandName || "stoqtrade.ai"}</div>
      )}
    </div>
  );
}

const PosterFrame = forwardRef<
  HTMLDivElement,
  {
    gradient: string;
    icon: ReactNode;
    title: string;
    subtitle: string;
    branding: ReportBranding;
    links: SocialLinks;
    children: ReactNode;
  }
>(function PosterFrame({ gradient, icon, title, subtitle, branding, links, children }, ref) {
  return (
    <div
      ref={ref}
      className="relative flex aspect-[9/16] flex-col overflow-hidden p-4"
      style={{ width: POSTER_WIDTH, background: gradient }}
    >
      <div className="flex items-center gap-1.5">
        {branding.logoDataUrl ? (
          <img src={branding.logoDataUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white">
            <BrandMark className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-[10px] font-extrabold text-white">{branding.name || "stoqtrade.ai"}</div>
          <div className="text-[8px] text-white/60">{todayLabel()}</div>
        </div>
      </div>

      <div className="mt-4 mb-3">
        <div className="mb-1 text-white/90">{icon}</div>
        <div className="text-[17px] font-extrabold uppercase leading-[1.15] tracking-tight text-white">{title}</div>
        <div className="text-[9.5px] font-medium text-white/70">{subtitle}</div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">{children}</div>

      <div className="mt-3">
        <FollowUsFooter links={links} brandName={branding.name} />
      </div>
    </div>
  );
});

function StockRow({ item }: { item: Week52Entry }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2 py-1.5">
      <span className="truncate text-[11px] font-bold text-white">{item.symbol}</span>
      <div className="flex shrink-0 items-center gap-1.5 text-[9.5px]">
        <span className="text-white/70">{item.price.toLocaleString("en-IN")}</span>
        <span className="font-bold text-emerald-300">{item.distFromHighPct}% away</span>
      </div>
    </div>
  );
}

function EarningsPosterRow({ item }: { item: EarningsEvent }) {
  const shortDate = item.date.replace(/-\d{4}$/, "");
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-2 py-1.5">
      <span className="truncate text-[10.5px] font-bold text-white">{item.symbol}</span>
      <span className="shrink-0 text-[9.5px] font-semibold text-white/70">{shortDate}</span>
    </div>
  );
}

function ActionChip({ item }: { item: CorporateAction }) {
  const shortDate = item.exDate.replace(/-\d{4}$/, "");
  return (
    <div className="flex items-center justify-between gap-1.5 rounded-lg bg-white/10 px-2 py-1.5">
      <span className="truncate text-[10px] font-bold text-white">{item.symbol}</span>
      <span className="shrink-0 text-[9px] font-semibold text-white/70">{shortDate}</span>
    </div>
  );
}

function PosterActions({
  nodeRef,
  filename,
  shareTitle,
}: {
  nodeRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareTitle: string;
}) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleDownload() {
    if (!nodeRef.current) return;
    setBusy("download");
    setNotice(null);
    const file = await nodeToImageFile(nodeRef.current, filename, 4);
    setBusy(null);
    if (file) downloadFile(file);
    else setNotice("Couldn't generate the poster image.");
  }

  async function handleShare() {
    if (!nodeRef.current) return;
    setBusy("share");
    setNotice(null);
    const file = await nodeToImageFile(nodeRef.current, filename, 4);
    if (!file) {
      setNotice("Couldn't generate the poster image.");
      setBusy(null);
      return;
    }
    const result = await shareImageFile(file, { title: shareTitle, text: `${shareTitle}\nvia stoqtrade.ai` });
    setBusy(null);
    if (result === "downloaded") setNotice("Saved — share it to your story from your gallery.");
  }

  return (
    <div style={{ width: POSTER_WIDTH }}>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleShare}
          disabled={busy !== null}
          className="focus-ring flex items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-xs font-semibold text-accent-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Share2 size={13} /> {busy === "share" ? "…" : "Share"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="focus-ring flex items-center justify-center gap-1.5 rounded-lg border border-border-strong py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover disabled:opacity-60"
        >
          <Download size={13} /> {busy === "download" ? "…" : "Save"}
        </button>
      </div>
      {notice && <p className="mt-1.5 text-[10px] leading-snug text-subtle-foreground">{notice}</p>}
    </div>
  );
}

export function PremarketPosters({
  near52WeekHigh,
  earningsCalendar,
  corporateActions,
  branding,
}: {
  near52WeekHigh: Week52Entry[];
  earningsCalendar: EarningsEvent[];
  corporateActions: CorporateAction[];
  branding: ReportBranding;
}) {
  const { links, setField, clear } = useSocialLinks();
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
                  <div className="grid grid-cols-2 gap-1.5">
                    {corporateActions.slice(0, 10).map((item) => (
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
