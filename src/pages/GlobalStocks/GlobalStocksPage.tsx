import { Loader2 } from "lucide-react";
import { Header } from "../../components/Header";
import { usePremarket } from "../Premarket/usePremarket";
import { useReportBranding } from "../Premarket/useReportBranding";
import { ReportBrandingEditor } from "../Premarket/ReportBrandingEditor";
import { useSocialLinks } from "../Premarket/useSocialLinks";
import { GlobalStocksPosters } from "./GlobalStocksPosters";

// A trimmed clone of the Posters section, scoped to global/US equity
// updates only. There's a single "Live Posters" view here — the Poster
// Maker and Carousel Maker tabs stay on /posters.
export function GlobalStocksPage() {
  const { data: premarketData, loading } = usePremarket();
  const { branding, setName, setLogoDataUrl, clear } = useReportBranding();
  const { links: socialLinks, setField: setSocialField, clear: clearSocialLinks } = useSocialLinks();

  const groups = premarketData.groups;
  const hasAnyData = Object.values(groups).some((g) => g.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="global stocks"
        meta="US & global equity updates, story-ready"
        extra={
          <ReportBrandingEditor
            branding={branding}
            setName={setName}
            setLogoDataUrl={setLogoDataUrl}
            clear={clear}
          />
        }
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        {loading && !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching global market data…</p>
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Couldn't load poster data. Make sure the API server is running.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <GlobalStocksPosters
              groups={groups}
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
