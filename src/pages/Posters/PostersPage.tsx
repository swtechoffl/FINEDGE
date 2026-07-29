import { Loader2 } from "lucide-react";
import { Header } from "../../components/Header";
import { usePremarket } from "../Premarket/usePremarket";
import { usePostMarket } from "../PostMarket/usePostMarket";
import { useMarketInternals } from "../MarketInternals/useMarketInternals";
import { useReportBranding } from "../Premarket/useReportBranding";
import { ReportBrandingEditor } from "../Premarket/ReportBrandingEditor";
import { useSocialLinks } from "../Premarket/useSocialLinks";
import { PremarketPosters } from "../Premarket/PremarketPosters";
import { GlobalMarketPosters } from "../Premarket/GlobalMarketPosters";

export function PostersPage() {
  const { data: premarketData, loading: premarketLoading } = usePremarket();
  const { data: moversData, loading: moversLoading } = usePostMarket();
  const { data: internalsData, loading: internalsLoading } = useMarketInternals();
  const { branding, setName, setLogoDataUrl, clear } = useReportBranding();
  const { links: socialLinks, setField: setSocialField, clear: clearSocialLinks } = useSocialLinks();

  const loading = premarketLoading && moversLoading && internalsLoading;
  const hasAnyData =
    moversData.near52WeekHigh.length > 0 ||
    moversData.earningsCalendar.length > 0 ||
    moversData.corporateActionsAll.length > 0 ||
    Boolean(premarketData.giftNifty) ||
    Boolean(premarketData.niftyPivots) ||
    Boolean(premarketData.fiiDii) ||
    internalsData.optionChains.length > 0 ||
    Object.values(premarketData.groups).some((g) => g.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="posters"
        meta="Story-ready graphics for social sharing"
        extra={
          <ReportBrandingEditor branding={branding} setName={setName} setLogoDataUrl={setLogoDataUrl} clear={clear} />
        }
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        {loading && !hasAnyData ? (
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
              branding={branding}
              links={socialLinks}
              setField={setSocialField}
              clear={clearSocialLinks}
            />

            <GlobalMarketPosters
              giftNifty={premarketData.giftNifty}
              groups={premarketData.groups}
              niftyPivots={premarketData.niftyPivots}
              fiiDii={premarketData.fiiDii}
              optionChains={internalsData.optionChains}
              branding={branding}
              links={socialLinks}
              setField={setSocialField}
              clear={clearSocialLinks}
            />
          </div>
        )}
      </div>
    </div>
  );
}
