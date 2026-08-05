import { useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, Sparkles, Download, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Copy, Check, ClipboardPaste, Plus, Trash2 } from "lucide-react";
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
import { buildOnePagerResearchPrompt, parseOnePagerNarrative } from "./onePagerPrompt";
import {
  emptyOnePagerForm,
  emptyOnePagerSegmentRow,
  formatCommentaryForPrompt,
  formatFinancialsForPrompt,
  formatFinancialStatementsForPrompt,
  formatQuarterlyForPrompt,
  formatSegmentsForPrompt,
  parseStatementRows,
  type FinancialYear,
  type OnePagerCommentary,
  type OnePagerFinancialStatements,
  type OnePagerForm,
  type OnePagerNarrative,
  type OnePagerQuarterly,
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-subtle-foreground">{label}</span>
      {children}
    </label>
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
  // What actually rendered/exported for the current `result` — kept
  // separate from `form.financials` so switching data source, or editing
  // the manual table after a paste-mode generate, can never retroactively
  // change what's shown in an already-generated report.
  const [resultFinancials, setResultFinancials] = useState<FinancialYear[]>([]);
  const [resultQuarterly, setResultQuarterly] = useState<OnePagerQuarterly | null>(null);
  const [resultSegments, setResultSegments] = useState<OnePagerForm["segments"]>([]);
  const [resultCommentary, setResultCommentary] = useState<OnePagerCommentary | null>(null);
  const [resultFinancialStatements, setResultFinancialStatements] = useState<OnePagerFinancialStatements | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Whether each optional detail section renders in the actual report —
  // independent of whether the data exists, so filling something in (or
  // Claude researching it) doesn't force it into the one-pager unasked.
  // Read live at render time, not snapshotted at generate, so toggling
  // after generating updates the preview/export immediately.
  const [showQuarterly, setShowQuarterly] = useState(true);
  const [showSegments, setShowSegments] = useState(true);
  const [showCommentary, setShowCommentary] = useState(true);
  const [showFinancialStatements, setShowFinancialStatements] = useState(true);

  // Manual entry and paste-from-Claude are two fully independent data
  // paths for narrative + shareholding % + 3yr financials — switching
  // never reads or overwrites the other mode's fields.
  const [dataMode, setDataMode] = useState<"manual" | "paste">("manual");
  const [pastedNarrative, setPastedNarrative] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const parsedPaste = useMemo(
    () => (dataMode === "paste" && pastedNarrative.trim() ? parseOnePagerNarrative(pastedNarrative) : null),
    [dataMode, pastedNarrative],
  );

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(buildOnePagerResearchPrompt(form));
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  function updateFinancial(i: number, key: keyof OnePagerForm["financials"][number], value: string) {
    setForm((f) => ({ ...f, financials: f.financials.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)) }));
  }

  function setQuarterly<K extends keyof OnePagerQuarterly>(key: K, value: OnePagerQuarterly[K]) {
    setForm((f) => ({ ...f, quarterly: { ...f.quarterly, [key]: value } }));
  }
  function setCommentary<K extends keyof OnePagerCommentary>(key: K, value: OnePagerCommentary[K]) {
    setForm((f) => ({ ...f, commentary: { ...f.commentary, [key]: value } }));
  }
  function setFinancialStatements<K extends keyof OnePagerFinancialStatements>(key: K, value: OnePagerFinancialStatements[K]) {
    setForm((f) => ({ ...f, financialStatements: { ...f.financialStatements, [key]: value } }));
  }
  function updateSegment(i: number, key: keyof OnePagerForm["segments"][number], value: string) {
    setForm((f) => ({ ...f, segments: f.segments.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)) }));
  }
  function addSegment() {
    setForm((f) => ({ ...f, segments: [...f.segments, emptyOnePagerSegmentRow()] }));
  }
  function removeSegment(i: number) {
    setForm((f) => ({ ...f, segments: f.segments.filter((_, idx) => idx !== i) }));
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
    let narrative: OnePagerNarrative | undefined;
    let aiShareholding: { promoterPct: number; fiiPct: number | null; diiPct: number | null; publicPct: number | null; asOfDate: string | null } | undefined;
    let financialsForResult: FinancialYear[] = [];
    let quarterlyForResult: OnePagerQuarterly | null = null;
    let segmentsForResult: OnePagerForm["segments"] = [];
    let commentaryForResult: OnePagerCommentary | null = null;
    let statementsForResult: OnePagerFinancialStatements | null = null;

    if (dataMode === "paste") {
      const parsed = parseOnePagerNarrative(pastedNarrative);
      if ("error" in parsed) {
        setGenError(parsed.error);
        return;
      }
      narrative = parsed.narrative;
      aiShareholding = parsed.shareholding ?? undefined;
      financialsForResult = parsed.financials ?? [];
      quarterlyForResult = parsed.quarterly;
      segmentsForResult = parsed.segments ?? [];
      commentaryForResult = parsed.commentary;
      statementsForResult = parsed.financialStatements;
    } else {
      financialsForResult = form.financials;
      quarterlyForResult = Object.values(form.quarterly).some((v) => v.trim()) ? form.quarterly : null;
      segmentsForResult = form.segments.filter((s) => s.name.trim());
      commentaryForResult = Object.values(form.commentary).some((v) => v.trim()) ? form.commentary : null;
      statementsForResult = Object.values(form.financialStatements).some((v) => v.trim()) ? form.financialStatements : null;
    }

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
          stopLoss: form.stopLoss,
          valuationMethod: form.valuationMethod,
          timeHorizon: form.timeHorizon,
          recentDevelopments: form.recentDevelopments,
          // Manual mode only — Groq has no web search, so it needs these
          // typed in directly. Paste mode sends none of this: the copied
          // prompt already tells Claude to research all of it itself, and
          // the narrative it drafts already reflects that research, so
          // there's nothing left for the server to do with these fields.
          ...(dataMode === "manual"
            ? {
                threeYearFinancials: formatFinancialsForPrompt(form.financials),
                fiiPct: form.fiiPct,
                diiPct: form.diiPct,
                quarterlyContext: formatQuarterlyForPrompt(form.quarterly),
                segmentContext: formatSegmentsForPrompt(form.segments),
                managementCommentary: formatCommentaryForPrompt(form.commentary),
                financialStatementsContext: formatFinancialStatementsForPrompt(form.financialStatements),
              }
            : { narrative, aiShareholding }),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.detail || json.error || "Generation failed");
      setResult(json as OnePagerResult);
      setResultFinancials(financialsForResult);
      setResultQuarterly(quarterlyForResult);
      setResultSegments(segmentsForResult);
      setResultCommentary(commentaryForResult);
      setResultFinancialStatements(statementsForResult);
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
      // "paginate" (not "fitA4") — with quarterly/segments/commentary/
      // financial statements all optional and variable-length, forcing
      // everything onto one page would shrink text more the more sections
      // are on, sometimes illegibly. Real A4 pages at a fixed, readable
      // size, spilling onto a second page when there's enough content,
      // is what "properly fit A4, add pages if needed" means here — the
      // same pagination the disclaimer/premarket/postmarket reports
      // already use, snapping breaks to card/row edges and rebalancing a
      // too-sparse trailing page instead of leaving it mostly blank.
      await exportReportToPdf([{ node: previewRef.current, mode: "paginate" }], `${slug}-one-pager-${form.symbol}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  // When there's no 3yr financial summary to show, the right column's only
  // real content is the chart, an optional shareholding pie, and the
  // valuation box — far less than the left column's paragraphs. Rather than
  // leave the text squeezed into a ~58%-width column beside mostly empty
  // space, the whole body collapses to one full-width column instead.
  const hasFinancialSummary = resultFinancials.some((f) => f.year.trim());

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 py-6 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card className="border-2 border-accent/40 p-5">
          <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Report data source</h3>
          <p className="mb-3 text-xs text-subtle-foreground">
            Two independent paths for the narrative and every supporting detail — pick one first, they never mix.
            <strong className="text-foreground"> Manual entry</strong>: Groq drafts the narrative (free, no web search,
            tight daily quota) from what you type in the fields below.
            <strong className="text-foreground"> Paste from Claude</strong>: copy a research prompt into Claude (or any
            AI with web search) — it researches everything you haven't already typed in — then paste its JSON reply
            back.
          </p>
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              variant={dataMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setDataMode("manual")}
            >
              Manual entry
            </Button>
            <Button
              type="button"
              variant={dataMode === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setDataMode("paste")}
            >
              <ClipboardPaste size={14} />
              Paste from Claude
            </Button>
          </div>
          {dataMode === "paste" && (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt} className="self-start">
                {promptCopied ? <Check size={14} /> : <Copy size={14} />}
                {promptCopied ? "Copied!" : "Copy research prompt"}
              </Button>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-subtle-foreground">Paste the AI's JSON reply here</span>
                <Textarea
                  rows={6}
                  value={pastedNarrative}
                  onChange={(e) => setPastedNarrative(e.target.value)}
                  placeholder='{"companyOverview": "...", "investmentRationale": "...", "riskFactors": ["...", "..."], "valuationNote": "...", "strategyFit": "...", "shareholding": {...}, "financials": [...]}'
                  className="font-mono text-xs"
                />
              </label>
              {parsedPaste && "error" in parsedPaste && (
                <span className="text-xs font-medium text-bearish">{parsedPaste.error}</span>
              )}
              {parsedPaste && "narrative" in parsedPaste && (
                <div className="rounded-lg border border-bullish/30 bg-bullish/10 p-2 text-xs text-bullish">
                  <div className="flex items-center gap-1 font-medium">
                    <Check size={13} /> Parsed — ready to generate.
                  </div>
                  <ul className="mt-1 list-disc pl-4 text-[11px]">
                    <li>{parsedPaste.narrative.riskFactors.length} risk factors</li>
                    <li>
                      Financials:{" "}
                      {parsedPaste.financials ? `${parsedPaste.financials.length} year(s) supplied` : "none supplied — table stays empty"}
                    </li>
                    <li>
                      Shareholding:{" "}
                      {parsedPaste.shareholding
                        ? `Promoter ${parsedPaste.shareholding.promoterPct}%${parsedPaste.shareholding.fiiPct != null ? `, FII ${parsedPaste.shareholding.fiiPct}%` : ""}${parsedPaste.shareholding.diiPct != null ? `, DII ${parsedPaste.shareholding.diiPct}%` : ""}`
                        : "none supplied — falls back to live NSE data if available"}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

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
                <span className="text-xs font-semibold text-subtle-foreground">Stop loss (₹)</span>
                <Input value={form.stopLoss} onChange={(e) => setForm((f) => ({ ...f, stopLoss: e.target.value }))} />
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

        {dataMode === "manual" ? (
          <>
            <Card className="p-5">
              <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Shareholding pattern</h3>
              <p className="mb-3 text-xs text-subtle-foreground">
                Promoter vs Public auto-fills live from NSE on generate. FII/DII (optional, no free source) further
                split the Public slice.
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

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Quarterly numbers</h3>
              <p className="mb-3 text-xs text-subtle-foreground">Optional — this quarter vs YoY/QoQ/estimate, same fields Report Maker asks for. Feeds the narrative only, not rendered directly.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Revenue — actual">
                  <Input value={form.quarterly.revenueActual} onChange={(e) => setQuarterly("revenueActual", e.target.value)} />
                </Field>
                <Field label="Revenue — estimate">
                  <Input value={form.quarterly.revenueEstimate} onChange={(e) => setQuarterly("revenueEstimate", e.target.value)} />
                </Field>
                <Field label="Revenue YoY% / QoQ%">
                  <Input value={form.quarterly.revenueGrowth} onChange={(e) => setQuarterly("revenueGrowth", e.target.value)} placeholder="+9.2% YoY / +2.1% QoQ" />
                </Field>
                <Field label="Volume / Price / Forex growth split (%)">
                  <Input value={form.quarterly.growthSplit} onChange={(e) => setQuarterly("growthSplit", e.target.value)} />
                </Field>
                <Field label="EBITDA — actual / estimate">
                  <Input value={form.quarterly.ebitda} onChange={(e) => setQuarterly("ebitda", e.target.value)} />
                </Field>
                <Field label="EBITDA margin — actual, bps YoY">
                  <Input value={form.quarterly.ebitdaMargin} onChange={(e) => setQuarterly("ebitdaMargin", e.target.value)} placeholder="21.4%, +80bps YoY" />
                </Field>
                <Field label="PAT adjusted — actual / estimate / YoY%">
                  <Input value={form.quarterly.patAdjusted} onChange={(e) => setQuarterly("patAdjusted", e.target.value)} />
                </Field>
                <Field label="PAT reported (name adjustment items)">
                  <Input value={form.quarterly.patReported} onChange={(e) => setQuarterly("patReported", e.target.value)} />
                </Field>
                <Field label="Net debt — latest / YoY / QoQ">
                  <Input value={form.quarterly.netDebt} onChange={(e) => setQuarterly("netDebt", e.target.value)} />
                </Field>
                <Field label="Working capital days movement">
                  <Input value={form.quarterly.workingCapitalDays} onChange={(e) => setQuarterly("workingCapitalDays", e.target.value)} />
                </Field>
                <Field label="CFO — YoY">
                  <Input value={form.quarterly.cfo} onChange={(e) => setQuarterly("cfo", e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Segment / geography revenue</h3>
              <p className="mb-3 text-xs text-subtle-foreground">Optional — one row per segment, this quarter's revenue and YoY growth.</p>
              <div className="flex flex-col gap-2">
                {form.segments.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <Input placeholder="Segment name" value={row.name} onChange={(e) => updateSegment(i, "name", e.target.value)} />
                    <Input placeholder="Revenue" value={row.revenue} onChange={(e) => updateSegment(i, "revenue", e.target.value)} />
                    <Input placeholder="YoY %" value={row.yoyGrowth} onChange={(e) => updateSegment(i, "yoyGrowth", e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSegment(i)} disabled={form.segments.length === 1}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSegment} className="self-start">
                  <Plus size={14} /> Add segment
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Management commentary</h3>
              <p className="mb-3 text-xs text-subtle-foreground">Optional, all fields — feeds the narrative only, not rendered directly.</p>
              <div className="flex flex-col gap-3">
                <Field label="Outlook & guidance">
                  <Textarea rows={2} value={form.commentary.outlookGuidance} onChange={(e) => setCommentary("outlookGuidance", e.target.value)} />
                </Field>
                <Field label="Regional commentary">
                  <Textarea rows={2} value={form.commentary.regional} onChange={(e) => setCommentary("regional", e.target.value)} />
                </Field>
                <Field label="Business-unit commentary">
                  <Textarea rows={2} value={form.commentary.businessUnit} onChange={(e) => setCommentary("businessUnit", e.target.value)} />
                </Field>
                <Field label="Product-wise commentary">
                  <Textarea rows={2} value={form.commentary.productWise} onChange={(e) => setCommentary("productWise", e.target.value)} />
                </Field>
                <Field label="Debt & balance sheet">
                  <Textarea rows={2} value={form.commentary.debtBalanceSheet} onChange={(e) => setCommentary("debtBalanceSheet", e.target.value)} />
                </Field>
                <Field label="Other (leadership, one-offs, JV/associate investments, geopolitical risk)">
                  <Textarea rows={2} value={form.commentary.other} onChange={(e) => setCommentary("other", e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Full financial statements</h3>
              <p className="mb-3 text-xs text-subtle-foreground">
                Optional — feeds the narrative and renders as a table on the report (toggle it off below if you'd rather
                it didn't). One line per item, exactly <code className="rounded bg-surface-2 px-1">Label: value1 | value2 | value3</code> —
                anything else still shows, just without the per-year columns.
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Income statement">
                  <Textarea
                    rows={4}
                    value={form.financialStatements.incomeStatement}
                    onChange={(e) => setFinancialStatements("incomeStatement", e.target.value)}
                    placeholder={"Revenue: 12000 | 13500 | 15200\nEBITDA: 2400 | 2700 | 3100"}
                  />
                </Field>
                <Field label="Balance sheet">
                  <Textarea
                    rows={4}
                    value={form.financialStatements.balanceSheet}
                    onChange={(e) => setFinancialStatements("balanceSheet", e.target.value)}
                    placeholder={"Total assets: 45000 | 49000 | 53000\nNet worth: 22000 | 24500 | 27000"}
                  />
                </Field>
                <Field label="Ratios">
                  <Textarea
                    rows={4}
                    value={form.financialStatements.ratios}
                    onChange={(e) => setFinancialStatements("ratios", e.target.value)}
                    placeholder={"P/E: 22 | 19 | 17\nROCE: 18% | 20% | 21%"}
                  />
                </Field>
                <Field label="Cash flow statement">
                  <Textarea
                    rows={4}
                    value={form.financialStatements.cashFlow}
                    onChange={(e) => setFinancialStatements("cashFlow", e.target.value)}
                    placeholder={"CFO: 3200 | 3600 | 4100\nCapex: -900 | -1100 | -1250"}
                  />
                </Field>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Shareholding & financials (from paste)</h3>
            <p className="text-xs text-subtle-foreground">
              Sourced entirely from the pasted JSON above — nothing here is typed in manually. Edit the pasted text and
              re-parse to change it. Quarterly numbers, segments, management commentary and full financial statements
              have no input fields in this mode either — the copied prompt tells Claude to research anything you
              haven't already supplied via web search before drafting the narrative.
            </p>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-extrabold tracking-tight text-foreground">Show in report</h3>
          <p className="mb-3 text-xs text-subtle-foreground">
            Filling something in (or Claude researching it) doesn't force it into the one-pager — untick anything you
            don't want rendered. Takes effect immediately, even after generating.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Quarterly Snapshot", showQuarterly, setShowQuarterly],
                ["Segment / Geography Mix", showSegments, setShowSegments],
                ["Management Commentary", showCommentary, setShowCommentary],
                ["Financial Statements", showFinancialStatements, setShowFinancialStatements],
              ] as [string, boolean, (v: boolean) => void][]
            ).map(([label, checked, setChecked]) => (
              <label key={label} className="flex items-center gap-2 text-xs font-medium text-foreground">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Button
          onClick={handleGenerate}
          disabled={generating || !form.symbol.trim() || (dataMode === "paste" && (!parsedPaste || "error" in parsedPaste))}
          size="lg"
          className="w-full"
        >
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
                    {result.stopLoss != null && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        <div className="text-right">
                          <div className="text-[9px] uppercase tracking-wide text-subtle-foreground">Stop Loss</div>
                          <div className="text-sm font-bold text-bearish">{fmtRs(result.stopLoss)}</div>
                        </div>
                      </>
                    )}
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

              {/* Two-column body — collapses to one full-width column when
                  there's no financial summary table (see hasFinancialSummary). */}
              <div className={`grid gap-5 px-6 py-4 ${hasFinancialSummary ? "grid-cols-[1.35fr_1fr]" : "grid-cols-1"}`}>
                {/* grid-cols-1, not flex-col — the PDF export's page-break
                    logic treats every direct child of a .grid as a safe
                    break point unconditionally, vs. a flex-col list only
                    once it has 5+ items. This column is a handful of
                    different sections, not a repeating list, so a break
                    should be allowed before any of them regardless of
                    count — otherwise a short paste (few optional sections)
                    could still get a page break mid-paragraph instead of
                    landing cleanly before the next section. */}
                {/* content-start items-start: CSS Grid's default align-content
                    ("normal") computes to "stretch", so without this the
                    outer 2-column grid stretching this column to match the
                    other column's height would then get distributed across
                    THIS grid's own rows too — visibly inflating whichever
                    box happens to be last (e.g. the Valuation box) with
                    blank space, unlike flex-col which never did this. */}
                <div className="grid grid-cols-1 content-start items-start gap-4">
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

                  {resultQuarterly && showQuarterly && (
                    <div>
                      <SectionLabel>Quarterly Snapshot</SectionLabel>
                      <div className="grid grid-cols-2 gap-x-4">
                        <div>
                          {resultQuarterly.revenueActual && <FactRow label="Revenue" value={resultQuarterly.revenueActual} />}
                          {resultQuarterly.revenueGrowth && <FactRow label="Revenue growth" value={resultQuarterly.revenueGrowth} />}
                          {resultQuarterly.ebitda && <FactRow label="EBITDA" value={resultQuarterly.ebitda} />}
                          {resultQuarterly.ebitdaMargin && <FactRow label="EBITDA margin" value={resultQuarterly.ebitdaMargin} />}
                        </div>
                        <div>
                          {resultQuarterly.patAdjusted && <FactRow label="PAT (adj.)" value={resultQuarterly.patAdjusted} />}
                          {resultQuarterly.netDebt && <FactRow label="Net debt" value={resultQuarterly.netDebt} />}
                          {resultQuarterly.cfo && <FactRow label="CFO" value={resultQuarterly.cfo} />}
                          {resultQuarterly.workingCapitalDays && <FactRow label="Working capital" value={resultQuarterly.workingCapitalDays} />}
                        </div>
                      </div>
                    </div>
                  )}

                  {resultSegments.length > 0 && showSegments && (() => {
                    // Only shown if at least one segment actually has a
                    // YoY% — otherwise the whole column would just be dashes.
                    const hasYoyData = resultSegments.some((s) => s.yoyGrowth.trim());
                    return (
                      <div>
                        <SectionLabel>Segment / Geography Mix</SectionLabel>
                        <table className="w-full border-collapse text-[9.5px]">
                          <thead>
                            <tr className="bg-surface-2">
                              <th className="border border-border px-1 py-1 text-left">Segment</th>
                              <th className="border border-border px-1 py-1 text-left">Revenue</th>
                              {hasYoyData && <th className="border border-border px-1 py-1 text-left">YoY%</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {resultSegments.map((s) => (
                              <tr key={s.name}>
                                <td className="border border-border px-1 py-1 font-semibold">{s.name}</td>
                                <td className="border border-border px-1 py-1">{s.revenue || "—"}</td>
                                {hasYoyData && <td className="border border-border px-1 py-1">{s.yoyGrowth || "—"}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  <div>
                    <SectionLabel>Company Overview</SectionLabel>
                    <p className="text-justify text-[12px] leading-relaxed text-muted-foreground">{result.narrative.companyOverview}</p>
                  </div>

                  <div>
                    <SectionLabel>Investment Rationale</SectionLabel>
                    <p className="text-justify text-[12px] leading-relaxed text-muted-foreground">{result.narrative.investmentRationale}</p>
                  </div>

                  {resultCommentary && showCommentary && (
                    <div>
                      <SectionLabel>Management Commentary</SectionLabel>
                      <ul className="flex flex-col gap-0.5 text-center">
                        {([
                          ["Outlook & guidance", resultCommentary.outlookGuidance],
                          ["Regional", resultCommentary.regional],
                          ["Business-unit", resultCommentary.businessUnit],
                          ["Product-wise", resultCommentary.productWise],
                          ["Debt & balance sheet", resultCommentary.debtBalanceSheet],
                          ["Other", resultCommentary.other],
                        ] as [string, string][])
                          .filter(([, v]) => v.trim())
                          .map(([label, v]) => (
                            <li key={label} className="text-[11px] leading-snug text-muted-foreground">
                              <span className="font-semibold text-foreground">{label}: </span>
                              {v}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Risk Factors</SectionLabel>
                    {/* Plain centered text with an inline bullet, not the
                        flex+dot layout used elsewhere — a flex row only
                        centers as a block, it doesn't center-wrap multi-line
                        text the way plain text-align:center does. */}
                    <ul className="flex flex-col gap-0.5 text-center">
                      {result.narrative.riskFactors.map((r, i) => (
                        <li key={i} className="text-[12px] leading-snug text-muted-foreground">
                          <span className="text-bearish">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* content-start items-start: CSS Grid's default align-content
                    ("normal") computes to "stretch", so without this the
                    outer 2-column grid stretching this column to match the
                    other column's height would then get distributed across
                    THIS grid's own rows too — visibly inflating whichever
                    box happens to be last (e.g. the Valuation box) with
                    blank space, unlike flex-col which never did this. */}
                <div className="grid grid-cols-1 content-start items-start gap-4">
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

                  {hasFinancialSummary && (
                    <div>
                      <SectionLabel>Financial Summary (Consolidated)</SectionLabel>
                      <table className="w-full border-collapse text-[8.5px]">
                        <thead>
                          <tr className="bg-surface-2">
                            <th className="border border-border px-1 py-1 text-left">FY</th>
                            <th className="border border-border px-1 py-1 text-left">Rev.</th>
                            <th className="border border-border px-1 py-1 text-left">EBITDA%</th>
                            <th className="border border-border px-1 py-1 text-left">PAT</th>
                            <th className="border border-border px-1 py-1 text-left">RoE%</th>
                            <th className="border border-border px-1 py-1 text-left">RoA%</th>
                            <th className="border border-border px-1 py-1 text-left">D/E%</th>
                            <th className="border border-border px-1 py-1 text-left">Div%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultFinancials
                            .filter((f) => f.year.trim())
                            .map((f) => (
                              <tr key={f.year}>
                                <td className="border border-border px-1 py-1 font-semibold">{f.year}</td>
                                <td className="border border-border px-1 py-1">{f.revenue || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.ebitdaMargin || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.pat || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.roe || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.roa || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.debtEquity || "—"}</td>
                                <td className="border border-border px-1 py-1">{f.divYield || "—"}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="rounded-lg border border-accent/30 bg-accent-bg p-3">
                    <SectionLabel>Valuation</SectionLabel>
                    <p className="text-justify text-[11px] leading-relaxed text-muted-foreground">{result.narrative.valuationNote}</p>
                    <p className="mt-1.5 text-[10px] text-subtle-foreground">
                      <span className="font-semibold text-foreground">Time Horizon:</span> {result.timeHorizon}
                      <br />
                      {result.stopLoss != null && (
                        <>
                          <span className="font-semibold text-foreground">Stop Loss:</span> {fmtRs(result.stopLoss)}
                          <br />
                        </>
                      )}
                      <span className="font-semibold text-foreground">Strategy Fit:</span> {result.narrative.strategyFit}
                    </p>
                  </div>
                </div>
              </div>

              {resultFinancialStatements && showFinancialStatements && (
                <div className="border-t border-border px-6 py-3">
                  <SectionLabel>Financial Statements — Key Line Items (₹cr, last 3 FY)</SectionLabel>
                  {/* One statement per row, full width — a 4-across grid squeezed each
                      table too narrow to keep its own columns aligned. grid-cols-1
                      (not flex-col) so a page break can land between statement
                      tables even though there are only up to 4 of them — see the
                      note on the two-column body above for why. */}
                  <div className="grid grid-cols-1 content-start items-start gap-3">
                    {([
                      ["Income Statement", resultFinancialStatements.incomeStatement],
                      ["Balance Sheet", resultFinancialStatements.balanceSheet],
                      ["Cash Flow Statement", resultFinancialStatements.cashFlow],
                      ["Ratios", resultFinancialStatements.ratios],
                    ] as [string, string][])
                      .filter(([, v]) => v.trim())
                      .map(([label, v]) => {
                        const rows = parseStatementRows(v);
                        const colCount = Math.max(0, ...rows.map((r) => r.values.length));
                        const years = resultFinancials.filter((f) => f.year.trim()).map((f) => f.year);
                        const headers =
                          colCount > 0
                            ? Array.from({ length: colCount }, (_, i) => years[years.length - colCount + i] ?? `Yr ${i + 1}`)
                            : [];
                        return (
                          <div key={label}>
                            <div className="mb-0.5 text-[9px] font-bold text-foreground">{label}</div>
                            <table className="w-full table-fixed border-collapse text-[8.5px]">
                              <colgroup>
                                <col style={{ width: "22%" }} />
                                {Array.from({ length: Math.max(colCount, 1) }).map((_, i) => (
                                  <col key={i} style={{ width: `${78 / Math.max(colCount, 1)}%` }} />
                                ))}
                              </colgroup>
                              {headers.length > 0 && (
                                <thead>
                                  <tr className="bg-surface-2">
                                    <th className="border border-border px-1.5 py-0.5 text-left">Item</th>
                                    {headers.map((h, i) => (
                                      <th key={i} className="border border-border px-1.5 py-0.5 text-right">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                              )}
                              <tbody>
                                {rows.map((r, i) => (
                                  <tr key={i}>
                                    <td className="break-words border border-border px-1.5 py-0.5 font-semibold text-foreground">{r.label}</td>
                                    {/* Pad every row to the same column count — a row with
                                        fewer values than the widest row would otherwise
                                        shift its cells left of where the header says. Wraps
                                        rather than truncating — table-fixed + colgroup keeps
                                        the table itself from stretching, so long values wrap
                                        to a second line instead of being cut off or widening
                                        the column. */}
                                    {Array.from({ length: Math.max(colCount, 1) }).map((_, vi) => (
                                      <td key={vi} className="break-words border border-border px-1.5 py-0.5 text-right text-muted-foreground">
                                        {r.values[vi] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Footer: rating definitions + disclosures */}
              <div className="border-t border-border px-6 py-3">
                <SectionLabel>Rating Definitions</SectionLabel>
                <RatingDefinitionRow horizon={result.timeHorizon} />
              </div>

              <div className="border-t border-border bg-surface-2 px-6 py-3">
                <div className="mb-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{ANALYST.name}</span> · {ANALYST.regLine} · {ANALYST.title}
                </div>
                <div className="columns-2 gap-4 text-[9px] leading-[1.4] text-subtle-foreground [column-fill:balance]">
                  {DISCLAIMER_PARAGRAPHS.map((p, i) => (
                    <p key={i} className="mb-1 break-inside-avoid-column">
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-1.5 text-[9px] italic text-subtle-foreground">{CLOSING_NOTE}</p>
                <p className="mt-1 text-[9px] text-subtle-foreground">
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
