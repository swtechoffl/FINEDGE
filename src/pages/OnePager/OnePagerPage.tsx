import { useRef, useState } from "react";
import { Loader2, Sparkles, Download, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { PinGate } from "../../components/PinGate";
import { ANALYST, CONTACT, CLOSING_NOTE, DISCLAIMER_PARAGRAPHS } from "../Disclosure/disclaimerContent";
import { OnePagerChart } from "./OnePagerChart";
import { OnePagerPieChart } from "./OnePagerPieChart";
import {
  emptyOnePagerForm,
  formatFinancialsForPrompt,
  type OnePagerForm,
  type OnePagerResult,
} from "./onePagerTypes";

const RATINGS = ["BUY", "HOLD", "REDUCE"] as const;
const VALUATION_METHODS = [
  "P/E multiple on forward EPS",
  "EV/EBITDA multiple",
  "DCF (Discounted Cash Flow)",
  "SOTP (Sum-of-the-Parts)",
];

const RATING_BADGE_VARIANT: Record<string, "bullish" | "neutral" | "bearish"> = {
  BUY: "bullish",
  HOLD: "neutral",
  REDUCE: "bearish",
};

function fmtCr(v: number | null) {
  return v == null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`;
}
function fmtRs(v: number | null) {
  return v == null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-accent" />
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent">{children}</span>
    </div>
  );
}

function RatingDefinitionRow({ horizon }: { horizon: string }) {
  const h = horizon || "the stated horizon";
  const rows: [string, string][] = [
    ["Buy/Positive", `>+15% over ${h}`],
    ["Hold/Neutral", `-5% to +15% over ${h}`],
    ["Reduce/Book out", `-15% to -5% over ${h}`],
    ["Book Profits", "Near/at target price"],
    ["Under Review", "Pending new information"],
    ["Subscribe", "Apply for IPO/NFO"],
  ];
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[9px] sm:grid-cols-6">
      {rows.map(([label, def]) => (
        <div key={label} className="rounded-md bg-surface-2 px-1.5 py-1">
          <div className="font-bold text-foreground">{label}</div>
          <div className="text-subtle-foreground">{def}</div>
        </div>
      ))}
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1 last:border-0">
      <span className="text-[10px] font-medium text-subtle-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

function OnePagerForm_() {
  const [form, setForm] = useState<OnePagerForm>(emptyOnePagerForm);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ companyName?: string; sector?: string; bseCode?: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<OnePagerResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  function updateFinancial(i: number, key: keyof OnePagerForm["financials"][number], value: string) {
    setForm((f) => ({ ...f, financials: f.financials.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)) }));
  }

  async function handleFetchLiveData() {
    const symbol = form.symbol.trim().toUpperCase();
    if (!symbol) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.detail || data.error || "Lookup failed");
      setPreview({ companyName: data.name, sector: data.sector, bseCode: data.bseCode });
      // Auto-fill BSE Code only if the analyst hasn't already typed one —
      // never clobber a manual correction.
      if (data.bseCode) setForm((f) => (f.bseCode.trim() ? f : { ...f, bseCode: data.bseCode }));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setResult(null);
    try {
      const res = await fetch("/api/one-pager/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.symbol.trim().toUpperCase(),
          bseCode: form.bseCode,
          exchange: form.exchange,
          bookValue: form.bookValue,
          rating: form.rating,
          targetPrice: form.targetPrice,
          valuationMethod: form.valuationMethod,
          timeHorizon: form.timeHorizon,
          recentDevelopments: form.recentDevelopments,
          threeYearFinancials: formatFinancialsForPrompt(form.financials),
          fiiPct: form.fiiPct,
          diiPct: form.diiPct,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.detail || json.error || "Generation failed");
      setResult(json as OnePagerResult);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!previewRef.current || !result) return;
    setExporting(true);
    try {
      const { exportReportToPdf } = await import("../../lib/exportPdf");
      const slug = (result.facts.companyName || result.facts.symbol).toLowerCase().replace(/\s+/g, "-");
      await exportReportToPdf([{ node: previewRef.current, mode: "fitA4" }], `${slug}-one-pager-${form.symbol}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 py-6 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-extrabold tracking-tight text-foreground">Company & rating</h3>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle-foreground">Ticker (NSE symbol)</span>
              <div className="flex gap-2">
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="RELIANCE"
                />
                <Button type="button" variant="outline" size="icon" title="Preview company name/sector/BSE code" onClick={handleFetchLiveData} disabled={fetching || !form.symbol.trim()}>
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </Button>
              </div>
              {preview && (
                <span className="text-xs text-muted-foreground">
                  {preview.companyName} · {preview.sector}
                  {preview.bseCode && ` · BSE ${preview.bseCode}`}
                </span>
              )}
              {fetchError && <span className="text-xs font-medium text-bearish">{fetchError}</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">BSE Code (auto-looked-up, editable)</span>
                <Input value={form.bseCode} onChange={(e) => setForm((f) => ({ ...f, bseCode: e.target.value }))} placeholder="Fetch live data to auto-fill" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Exchange</span>
                <select
                  className="focus-ring h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                  value={form.exchange}
                  onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value as OnePagerForm["exchange"] }))}
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Book value (₹, not free-sourced)</span>
                <Input value={form.bookValue} onChange={(e) => setForm((f) => ({ ...f, bookValue: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Rating</span>
                <select
                  className="focus-ring h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value as OnePagerForm["rating"] }))}
                >
                  {RATINGS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Target price (₹)</span>
                <Input value={form.targetPrice} onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Time horizon</span>
                <Input value={form.timeHorizon} onChange={(e) => setForm((f) => ({ ...f, timeHorizon: e.target.value }))} placeholder="12 months" />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle-foreground">Valuation method</span>
              <select
                className="focus-ring h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                value={form.valuationMethod}
                onChange={(e) => setForm((f) => ({ ...f, valuationMethod: e.target.value }))}
              >
                {VALUATION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle-foreground">Recent developments (optional — helps the overview avoid stale claims)</span>
              <Textarea rows={3} value={form.recentDevelopments} onChange={(e) => setForm((f) => ({ ...f, recentDevelopments: e.target.value }))} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Shareholding pattern</h3>
          <p className="mb-3 text-xs text-subtle-foreground">
            Promoter vs Public auto-fills live from NSE on generate. FII/DII (optional, no free source) further split the Public slice.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle-foreground">FII holding (%, optional)</span>
              <Input value={form.fiiPct} onChange={(e) => setForm((f) => ({ ...f, fiiPct: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-subtle-foreground">DII holding (%, optional)</span>
              <Input value={form.diiPct} onChange={(e) => setForm((f) => ({ ...f, diiPct: e.target.value }))} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">3-year financial summary</h3>
          <p className="mb-3 text-xs text-subtle-foreground">Not available from any free feed — enter the 3 most recent consecutive fiscal years.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-left">FY</th>
                  <th className="p-1 text-left">Revenue (₹cr)</th>
                  <th className="p-1 text-left">EBITDA %</th>
                  <th className="p-1 text-left">PAT (₹cr)</th>
                  <th className="p-1 text-left">RoE %</th>
                  <th className="p-1 text-left">RoA %</th>
                  <th className="p-1 text-left">D/E %</th>
                  <th className="p-1 text-left">Div yield %</th>
                </tr>
              </thead>
              <tbody>
                {form.financials.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1">
                      <Input className="h-8 w-20" value={row.year} onChange={(e) => updateFinancial(i, "year", e.target.value)} placeholder="FY26" />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.revenue} onChange={(e) => updateFinancial(i, "revenue", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.ebitdaMargin} onChange={(e) => updateFinancial(i, "ebitdaMargin", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.pat} onChange={(e) => updateFinancial(i, "pat", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.roe} onChange={(e) => updateFinancial(i, "roe", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.roa} onChange={(e) => updateFinancial(i, "roa", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.debtEquity} onChange={(e) => updateFinancial(i, "debtEquity", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input className="h-8" value={row.divYield} onChange={(e) => updateFinancial(i, "divYield", e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Button onClick={handleGenerate} disabled={generating || !form.symbol.trim()} size="lg" className="w-full">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Generating…" : "Generate One Pager"}
        </Button>
        {genError && <p className="text-center text-xs font-medium text-bearish">{genError}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold tracking-tight text-foreground">Preview</h3>
          {result && (
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? "Exporting…" : "Export PDF (A4)"}
            </Button>
          )}
        </div>
        <Card className="max-h-[85vh] overflow-auto p-6">
          {!result ? (
            <p className="py-16 text-center text-sm text-subtle-foreground">
              Fill in the ticker and rating, then click "Generate One Pager".
            </p>
          ) : (
            <div ref={previewRef} className="mx-auto w-[865px] overflow-hidden bg-surface text-[13px] shadow-sm">
              {/* Masthead */}
              <div className="flex items-center justify-between bg-accent px-6 py-2.5 text-accent-foreground">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                  Initial Research Report · {result.reportDateLabel}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Sharewealth Securities</span>
              </div>

              {/* Title band */}
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 pb-4 pt-4">
                <div>
                  <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
                    {result.facts.companyName}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold">{result.facts.symbol}</span>
                    <span className="text-subtle-foreground">·</span>
                    <span>{result.facts.sector}</span>
                    <span className="text-subtle-foreground">·</span>
                    <span>{result.facts.exchange}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={RATING_BADGE_VARIANT[result.rating] ?? "default"} size="md" className="text-[13px] px-3 py-1">
                    {result.rating}
                  </Badge>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-1.5">
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wide text-subtle-foreground">CMP</div>
                      <div className="text-sm font-bold text-foreground">{fmtRs(result.facts.cmp)}</div>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wide text-subtle-foreground">Target</div>
                      <div className="text-sm font-bold text-accent">{result.targetPrice != null ? fmtRs(result.targetPrice) : "—"}</div>
                    </div>
                    {result.upsidePct != null && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        <div
                          className={`flex items-center gap-0.5 text-sm font-bold ${result.upsidePct >= 0 ? "text-bullish" : "text-bearish"}`}
                        >
                          {result.upsidePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {result.upsidePct >= 0 ? "+" : ""}
                          {result.upsidePct}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {result.facts.equityCheck && !result.facts.equityCheck.reconciles && (
                <div className="mx-6 mt-3 flex items-start gap-2 rounded-lg border border-bearish/30 bg-bearish/10 p-2 text-xs text-bearish">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Market cap doesn't reconcile: reported ₹{result.facts.equityCheck.reportedMarketCapCr?.toLocaleString("en-IN")} cr vs
                    CMP × shares = ₹{result.facts.equityCheck.impliedMarketCapCr.toLocaleString("en-IN")} cr. Verify before publishing.
                  </span>
                </div>
              )}

              {/* Two-column body */}
              <div className="grid grid-cols-[1.35fr_1fr] gap-5 px-6 py-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <SectionLabel>Security Details</SectionLabel>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div>
                        <FactRow label="ISIN" value={result.facts.isin || "—"} />
                        <FactRow label="BSE Code" value={result.facts.bseCode || "—"} />
                        <FactRow label="Face Value" value={fmtRs(result.facts.faceValue)} />
                        <FactRow label="Book Value" value={fmtRs(result.facts.bookValue)} />
                      </div>
                      <div>
                        <FactRow label="Market Cap" value={fmtCr(result.facts.marketCapCr)} />
                        <FactRow label="Equity (paid-up)" value={fmtCr(result.facts.equityCr)} />
                        <FactRow label="P/E (TTM)" value={result.facts.peTtm ?? "—"} />
                        <FactRow label="EPS (TTM)" value={fmtRs(result.facts.epsTtm)} />
                      </div>
                    </div>
                    <FactRow
                      label="52-Week High / Low"
                      value={`${fmtRs(result.facts.fiftyTwoWeekHigh)} / ${fmtRs(result.facts.fiftyTwoWeekLow)}`}
                    />
                  </div>

                  <div>
                    <SectionLabel>Company Overview</SectionLabel>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{result.narrative.companyOverview}</p>
                  </div>

                  <div>
                    <SectionLabel>Investment Rationale</SectionLabel>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{result.narrative.investmentRationale}</p>
                  </div>

                  <div>
                    <SectionLabel>Risk Factors</SectionLabel>
                    <ul className="flex flex-col gap-0.5">
                      {result.narrative.riskFactors.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-bearish" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <SectionLabel>1-Year Price Performance</SectionLabel>
                    <OnePagerChart stock={result.chart.stock} nifty={result.chart.nifty} symbol={result.facts.symbol} />
                  </div>

                  {result.facts.shareholding && (
                    <div>
                      <SectionLabel>Shareholding Pattern</SectionLabel>
                      <OnePagerPieChart slices={result.facts.shareholding.slices} asOfDate={result.facts.shareholding.asOfDate} />
                    </div>
                  )}

                  <div>
                    <SectionLabel>Financial Summary (Consolidated)</SectionLabel>
                    <table className="w-full border-collapse text-[9.5px]">
                      <thead>
                        <tr className="bg-surface-2">
                          <th className="border border-border px-1 py-1 text-left">FY</th>
                          <th className="border border-border px-1 py-1 text-left">Rev.</th>
                          <th className="border border-border px-1 py-1 text-left">EBITDA%</th>
                          <th className="border border-border px-1 py-1 text-left">PAT</th>
                          <th className="border border-border px-1 py-1 text-left">RoE%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.financials
                          .filter((f) => f.year.trim())
                          .map((f) => (
                            <tr key={f.year}>
                              <td className="border border-border px-1 py-1 font-semibold">{f.year}</td>
                              <td className="border border-border px-1 py-1">{f.revenue || "—"}</td>
                              <td className="border border-border px-1 py-1">{f.ebitdaMargin || "—"}</td>
                              <td className="border border-border px-1 py-1">{f.pat || "—"}</td>
                              <td className="border border-border px-1 py-1">{f.roe || "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-accent/30 bg-accent-bg p-3">
                    <SectionLabel>Valuation</SectionLabel>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{result.narrative.valuationNote}</p>
                    <p className="mt-1.5 text-[10px] text-subtle-foreground">
                      <span className="font-semibold text-foreground">Time Horizon:</span> {result.timeHorizon}
                      <br />
                      <span className="font-semibold text-foreground">Strategy Fit:</span> {result.narrative.strategyFit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: rating definitions + disclosures */}
              <div className="border-t border-border px-6 py-3">
                <SectionLabel>Rating Definitions</SectionLabel>
                <RatingDefinitionRow horizon={result.timeHorizon} />
              </div>

              <div className="border-t border-border bg-surface-2 px-6 py-3">
                <div className="mb-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{ANALYST.name}</span> · {ANALYST.regLine} · {ANALYST.title}
                </div>
                <div className="columns-2 gap-4 text-[7.5px] leading-[1.35] text-subtle-foreground [column-fill:balance]">
                  {DISCLAIMER_PARAGRAPHS.map((p, i) => (
                    <p key={i} className="mb-1 break-inside-avoid-column">
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-1.5 text-[7.5px] italic text-subtle-foreground">{CLOSING_NOTE}</p>
                <p className="mt-1 text-[7.5px] text-subtle-foreground">
                  {CONTACT.email} · {CONTACT.phone} · {CONTACT.address}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function OnePagerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="one pager" meta="Single-page Initial Research Report" />
      <PinGate title="One Pager" sessionKey="stoqtrade-one-pager-unlocked">
        <OnePagerForm_ />
      </PinGate>
    </div>
  );
}
