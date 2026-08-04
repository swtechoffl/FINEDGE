import { useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { usePremarket } from "../Premarket/usePremarket";
import { useReportBranding } from "../Premarket/useReportBranding";
import { ReportBrandingEditor } from "../Premarket/ReportBrandingEditor";
import { DisclaimerReportPage } from "../Premarket/DisclaimerReportPage";
import { useDisclaimerSettings } from "../Disclosure/useDisclaimerSettings";
import { DisclaimerSettingsEditor } from "../Disclosure/DisclaimerSettingsEditor";
import { usePostMarket } from "../PostMarket/usePostMarket";
import { relativeTime } from "../../data/mock";
import { exportNodesToPdf } from "../../lib/exportPdf";
import { RamkiPremarketReportContent } from "./RamkiPremarketReportContent";
import { useManualNews } from "./useManualNews";

export function RamkiPremarketPage() {
  const { data, loading, refreshing, refresh } = usePremarket();
  const { data: moversData, refreshing: moversRefreshing, refresh: refreshMovers } = usePostMarket();
  const { branding, setName, setLogoDataUrl, clear } = useReportBranding();
  const disclaimerSettings = useDisclaimerSettings();
  const { items: manualNews, addNews, removeNews } = useManualNews();
  const reportRef = useRef<HTMLDivElement>(null);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  const hasAnyData = data.giftNifty || Object.values(data.groups).some((g) => g.length > 0) || data.fiiDii;

  const meta = data.fetchedAt > 0 ? `Updated ${relativeTime(new Date(data.fetchedAt).toISOString())}` : undefined;
  const isRefreshing = refreshing || moversRefreshing;

  function handleRefresh() {
    refresh();
    refreshMovers();
  }

  async function handleExport() {
    if (!reportRef.current || !disclaimerRef.current) return;
    setExporting(true);
    setExportMode(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportNodesToPdf(
        [reportRef.current, disclaimerRef.current],
        `stoqtrade-ramki-premarket-report-${dateStr}.pdf`,
      );
    } catch {
      // best-effort — the button re-enables either way, user can retry
    } finally {
      setExportMode(false);
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title="ramki premarket report"
        meta={meta}
        extra={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh for latest data"
              className="hidden lg:inline-flex"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : undefined} />
            </Button>
            <ReportBrandingEditor
              branding={branding}
              setName={setName}
              setLogoDataUrl={setLogoDataUrl}
              clear={clear}
            />
            <DisclaimerSettingsEditor {...disclaimerSettings} />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !hasAnyData}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export PDF"}</span>
            </Button>
          </>
        }
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        {loading && !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-muted-foreground">Fetching global market cues…</p>
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Couldn't load premarket data. Make sure the API server is running.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Live "data updated" indicator — deliberately a sibling of the
                exported node below, not a child of it, so it's never
                captured by the PDF export. */}
            {data.fetchedAt > 0 && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh for latest data"
                className="focus-ring flex items-center justify-end gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bullish opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bullish" />
                </span>
                Data updated {relativeTime(new Date(data.fetchedAt).toISOString())}
                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : undefined} />
              </button>
            )}

            <Card className="overflow-hidden">
              <RamkiPremarketReportContent
                ref={reportRef}
                data={data}
                branding={branding}
                manualNews={manualNews}
                exportMode={exportMode}
                onAddNews={addNews}
                onRemoveNews={removeNews}
                near52WeekHigh={moversData.near52WeekHigh}
                near52WeekLow={moversData.near52WeekLow}
                corporateActions={moversData.corporateActionsAll}
                earningsCalendar={moversData.earningsCalendar}
              />
            </Card>

            <Card className="overflow-hidden">
              <DisclaimerReportPage ref={disclaimerRef} settings={disclaimerSettings.settings} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
