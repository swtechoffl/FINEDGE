import { useRef, useState } from "react";
import { Loader2, Sparkles, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { PinGate } from "../../components/PinGate";
import { ANALYST, CONTACT, CLOSING_NOTE, DISCLAIMER_PARAGRAPHS } from "../Disclosure/disclaimerContent";
import { OnePagerChart } from "./OnePagerChart";
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

function fmtCr(v: number | null) {
  return v == null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`;
}
function fmtRs(v: number | null) {
  return v == null ? "—" : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function RatingDefinitionTable({ horizon }: { horizon: string }) {
  const h = horizon || "the stated horizon";
  const rows: [string, string][] = [
    ["Buy / Positive", `Expected to deliver more than +15% return over ${h}`],
    ["Hold / Neutral", `Expected to deliver -5% to +15% return over ${h}`],
    ["Reduce / Book out", `Expected to deliver -15% to -5% return over ${h}`],
    ["Book Profits", "Stock has met or is close to its target price; recommend booking profits"],
    ["Under Review", "Rating under review pending new information or events"],
    ["Subscribe", "Recommendation to apply for an IPO/NFO offering"],
  ];
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr className="bg-surface-2">
          <th className="border border-border px-2 py-1 text-left font-semibold text-foreground">Rating</th>
          <th className="border border-border px-2 py-1 text-left font-semibold text-foreground">Definition</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, def]) => (
          <tr key={label}>
            <td className="border border-border px-2 py-1 font-semibold text-foreground">{label}</td>
            <td className="border border-border px-2 py-1 text-muted-foreground">{def}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OnePagerForm_() {
  const [form, setForm] = useState<OnePagerForm>(emptyOnePagerForm);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ companyName?: string; sector?: string } | null>(null);
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
      setPreview({ companyName: data.name, sector: data.sector });
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
      await exportReportToPdf([{ node: previewRef.current, mode: "fit" }], `${slug}-one-pager-${form.symbol}.pdf`);
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
                <Button type="button" variant="outline" size="icon" title="Preview company name/sector" onClick={handleFetchLiveData} disabled={fetching || !form.symbol.trim()}>
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </Button>
              </div>
              {preview && (
                <span className="text-xs text-muted-foreground">
                  {preview.companyName} · {preview.sector}
                </span>
              )}
              {fetchError && <span className="text-xs font-medium text-bearish">{fetchError}</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">BSE Code (optional)</span>
                <Input value={form.bseCode} onChange={(e) => setForm((f) => ({ ...f, bseCode: e.target.value }))} placeholder="500325" />
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
              {exporting ? "Exporting…" : "Export PDF (one page)"}
            </Button>
          )}
        </div>
        <Card className="max-h-[85vh] overflow-y-auto p-6">
          {!result ? (
            <p className="py-16 text-center text-sm text-subtle-foreground">
              Fill in the ticker and rating, then click "Generate One Pager".
            </p>
          ) : (
            <div ref={previewRef} className="flex flex-col gap-3 bg-surface p-4 text-[13px]">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                    Initial Research Report — {result.reportDateLabel}
                  </div>
                  <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                    {result.facts.companyName} ({result.facts.symbol}) - {result.rating}
                  </h2>
                </div>
              </div>

              {result.facts.equityCheck && !result.facts.equityCheck.reconciles && (
                <div className="flex items-start gap-2 rounded-lg border border-bearish/30 bg-bearish/10 p-2 text-xs text-bearish">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Market cap doesn't reconcile: reported ₹{result.facts.equityCheck.reportedMarketCapCr?.toLocaleString("en-IN")} cr vs
                    CMP × shares = ₹{result.facts.equityCheck.impliedMarketCapCr.toLocaleString("en-IN")} cr. Verify before publishing.
                  </span>
                </div>
              )}

              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">ISIN</td>
                    <td className="border border-border px-2 py-1">{result.facts.isin || "—"}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">BSE Code</td>
                    <td className="border border-border px-2 py-1">{result.facts.bseCode || "—"}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Sector</td>
                    <td className="border border-border px-2 py-1">{result.facts.sector || "—"}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Type / Exchange</td>
                    <td className="border border-border px-2 py-1">Equity / {result.facts.exchange}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Market Cap</td>
                    <td className="border border-border px-2 py-1">{fmtCr(result.facts.marketCapCr)}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">CMP</td>
                    <td className="border border-border px-2 py-1">{fmtRs(result.facts.cmp)}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Face Value</td>
                    <td className="border border-border px-2 py-1">{fmtRs(result.facts.faceValue)}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Equity (paid-up)</td>
                    <td className="border border-border px-2 py-1">{fmtCr(result.facts.equityCr)}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">Book Value</td>
                    <td className="border border-border px-2 py-1">{fmtRs(result.facts.bookValue)}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">EPS (TTM)</td>
                    <td className="border border-border px-2 py-1">{fmtRs(result.facts.epsTtm)}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">P/E (TTM)</td>
                    <td className="border border-border px-2 py-1">{result.facts.peTtm ?? "—"}</td>
                    <td className="border border-border px-2 py-1 font-semibold text-foreground">52W High/Low</td>
                    <td className="border border-border px-2 py-1">
                      {fmtRs(result.facts.fiftyTwoWeekHigh)} / {fmtRs(result.facts.fiftyTwoWeekLow)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <OnePagerChart stock={result.chart.stock} nifty={result.chart.nifty} symbol={result.facts.symbol} />

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Company Overview</div>
                <p className="text-muted-foreground">{result.narrative.companyOverview}</p>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Financial Summary (Consolidated)</div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="border border-border px-1.5 py-1 text-left">FY</th>
                      <th className="border border-border px-1.5 py-1 text-left">Revenue</th>
                      <th className="border border-border px-1.5 py-1 text-left">EBITDA %</th>
                      <th className="border border-border px-1.5 py-1 text-left">PAT</th>
                      <th className="border border-border px-1.5 py-1 text-left">RoE %</th>
                      <th className="border border-border px-1.5 py-1 text-left">RoA %</th>
                      <th className="border border-border px-1.5 py-1 text-left">D/E %</th>
                      <th className="border border-border px-1.5 py-1 text-left">Div yield %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.financials
                      .filter((f) => f.year.trim())
                      .map((f) => (
                        <tr key={f.year}>
                          <td className="border border-border px-1.5 py-1 font-semibold">{f.year}</td>
                          <td className="border border-border px-1.5 py-1">{f.revenue || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.ebitdaMargin || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.pat || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.roe || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.roa || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.debtEquity || "—"}</td>
                          <td className="border border-border px-1.5 py-1">{f.divYield || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Investment Rationale</div>
                <p className="text-muted-foreground">{result.narrative.investmentRationale}</p>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Risk Factors</div>
                <ul className="list-disc pl-4 text-muted-foreground">
                  {result.narrative.riskFactors.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Valuation</div>
                <p className="text-muted-foreground">
                  {result.narrative.valuationNote}{" "}
                  {result.targetPrice != null && (
                    <>
                      Target Price: <strong className="text-foreground">₹{result.targetPrice}</strong>
                      {result.upsidePct != null && (
                        <> ({result.upsidePct >= 0 ? "+" : ""}{result.upsidePct}% {result.upsidePct >= 0 ? "upside" : "downside"} from CMP)</>
                      )}.
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-subtle-foreground">
                  Time Horizon: {result.timeHorizon} · Strategy Fit: {result.narrative.strategyFit}
                </p>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Rating Definitions</div>
                <RatingDefinitionTable horizon={result.timeHorizon} />
              </div>

              <div className="mt-2 border-t border-border pt-2">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-subtle-foreground">Disclosure &amp; Disclaimer</div>
                <div className="mb-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{ANALYST.name}</span> · {ANALYST.regLine} · {ANALYST.title}
                </div>
                <div className="flex flex-col gap-1 text-[9px] leading-snug text-subtle-foreground">
                  {DISCLAIMER_PARAGRAPHS.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <p className="mt-1.5 text-[9px] italic text-subtle-foreground">{CLOSING_NOTE}</p>
                <p className="mt-1.5 text-[9px] text-subtle-foreground">
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
