import { useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Sparkles, Download, Plus, Trash2, RefreshCw } from "lucide-react";
import { Header } from "../../components/Header";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { ANALYST, CONTACT, CLOSING_NOTE } from "../Disclosure/disclaimerContent";
import { PinGate } from "./PinGate";
import { emptyResearchReportForm, type ResearchReportForm } from "./reportMakerTypes";

const DEFAULT_FIRM_FACTS = [
  `Analyst: ${ANALYST.name}`,
  ANALYST.registration,
  ANALYST.title,
  `Email: ${CONTACT.email} · Phone: ${CONTACT.phone}`,
  `Registered office: ${CONTACT.address}`,
  CLOSING_NOTE,
  "The RA and its associates do not hold any material interest in the securities or sectors mentioned in this report.",
  "The RA or its associates have not managed or co-managed a public offering of securities for the subject company in the past twelve months.",
  "The RA has not received any compensation from the subject company or any third party in connection with this research report in the past twelve months.",
  "The RA has not been mandated by the subject company for any assignment in the past twelve months.",
  "The RA has not received any compensation for non-investment banking services from the subject company in the past twelve months.",
  "The RA has not served as an officer, director, or employee of the subject company.",
  "The RA has not engaged in market-making activities for the subject company.",
].join("\n");

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-subtle-foreground">{label}</span>
      {children}
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="text-sm font-extrabold tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-subtle-foreground">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </Card>
  );
}

const RATINGS = ["BUY", "SELL", "NEUTRAL", "UNDER REVIEW"];
const CHANGE_OPTIONS = ["up", "down", "unchanged"];

function ReportMakerForm() {
  const [form, setForm] = useState<ResearchReportForm>(() => emptyResearchReportForm(DEFAULT_FIRM_FACTS));
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  function setHeader<K extends keyof ResearchReportForm["header"]>(key: K, value: ResearchReportForm["header"][K]) {
    setForm((f) => ({ ...f, header: { ...f.header, [key]: value } }));
  }
  function setSnapshot<K extends keyof ResearchReportForm["snapshot"]>(
    key: K,
    value: ResearchReportForm["snapshot"][K],
  ) {
    setForm((f) => ({ ...f, snapshot: { ...f.snapshot, [key]: value } }));
  }
  function setQuarterly<K extends keyof ResearchReportForm["quarterly"]>(
    key: K,
    value: ResearchReportForm["quarterly"][K],
  ) {
    setForm((f) => ({ ...f, quarterly: { ...f.quarterly, [key]: value } }));
  }
  function setCommentary<K extends keyof ResearchReportForm["commentary"]>(
    key: K,
    value: ResearchReportForm["commentary"][K],
  ) {
    setForm((f) => ({ ...f, commentary: { ...f.commentary, [key]: value } }));
  }
  function setFinancials<K extends keyof ResearchReportForm["financials"]>(
    key: K,
    value: ResearchReportForm["financials"][K],
  ) {
    setForm((f) => ({ ...f, financials: { ...f.financials, [key]: value } }));
  }

  async function handleFetchLiveData() {
    const symbol = form.header.ticker.trim().toUpperCase();
    if (!symbol) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.detail || data.error || "Lookup failed");
      setForm((f) => ({
        ...f,
        header: {
          ...f.header,
          companyName: data.name || f.header.companyName,
          sector: data.sector || f.header.sector,
          cmp: data.price != null ? String(data.price) : f.header.cmp,
        },
        snapshot: {
          ...f.snapshot,
          marketCap: data.marketCapCr != null ? `₹${data.marketCapCr} cr` : f.snapshot.marketCap,
          week52Range:
            data.fiftyTwoWeekLow != null && data.fiftyTwoWeekHigh != null
              ? `₹${data.fiftyTwoWeekLow} – ₹${data.fiftyTwoWeekHigh}`
              : f.snapshot.week52Range,
        },
      }));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setReport(null);
    try {
      const res = await fetch("/api/report-maker/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.detail || json.error || "Generation failed");
      setReport(json.report);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!previewRef.current || !report) return;
    setExporting(true);
    try {
      const { exportReportToPdf } = await import("../../lib/exportPdf");
      const nameSlug = (form.header.companyName || form.header.ticker || "report").toLowerCase().replace(/\s+/g, "-");
      await exportReportToPdf([{ node: previewRef.current }], `${nameSlug}-result-update-${form.header.reportDate}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const canGenerate = form.header.companyName.trim() !== "" || form.header.ticker.trim() !== "";

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-6 py-6 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Section title="Header & Rating" subtitle="Page 1 masthead — CMP can auto-fill from the NSE feed below.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ticker (NSE symbol)">
              <div className="flex gap-2">
                <Input
                  value={form.header.ticker}
                  onChange={(e) => setHeader("ticker", e.target.value.toUpperCase())}
                  placeholder="RELIANCE"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Fetch live CMP / sector / market cap / 52-wk range from NSE"
                  onClick={handleFetchLiveData}
                  disabled={fetching || !form.header.ticker.trim()}
                >
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </Button>
              </div>
            </Field>
            <Field label="Company name">
              <Input value={form.header.companyName} onChange={(e) => setHeader("companyName", e.target.value)} />
            </Field>
            <Field label="Report date">
              <Input type="date" value={form.header.reportDate} onChange={(e) => setHeader("reportDate", e.target.value)} />
            </Field>
            <Field label="Sector">
              <Input value={form.header.sector} onChange={(e) => setHeader("sector", e.target.value)} />
            </Field>
            <Field label="CMP">
              <Input value={form.header.cmp} onChange={(e) => setHeader("cmp", e.target.value)} />
            </Field>
            <Field label="Target Price">
              <Input value={form.header.targetPrice} onChange={(e) => setHeader("targetPrice", e.target.value)} />
            </Field>
            <Field label="Implied upside/downside">
              <Input value={form.header.upside} onChange={(e) => setHeader("upside", e.target.value)} placeholder="+18%" />
            </Field>
            <Field label="Rating">
              <select
                className="focus-ring h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                value={form.header.rating}
                onChange={(e) => setHeader("rating", e.target.value)}
              >
                {RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {fetchError && <p className="text-xs font-medium text-bearish">{fetchError}</p>}
          <Field label="Rating rationale (one line)">
            <Input
              value={form.header.ratingRationale}
              onChange={(e) => setHeader("ratingRationale", e.target.value)}
              placeholder="12x FY26E P/E, 45% discount to 5-yr avg"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {(["estimateChange", "tpChange", "ratingChange"] as const).map((key) => (
              <Field key={key} label={key === "estimateChange" ? "Estimate change" : key === "tpChange" ? "TP change" : "Rating change"}>
                <select
                  className="focus-ring h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                  value={form.header[key]}
                  onChange={(e) => setHeader(key, e.target.value)}
                >
                  {CHANGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.header.isRevision}
              onChange={(e) => setHeader("isRevision", e.target.checked)}
            />
            This note revises prior FY estimates
          </label>
        </Section>

        <Section title="Company Snapshot">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Equity shares outstanding (m)">
              <Input value={form.snapshot.equityShares} onChange={(e) => setSnapshot("equityShares", e.target.value)} />
            </Field>
            <Field label="Market cap">
              <Input value={form.snapshot.marketCap} onChange={(e) => setSnapshot("marketCap", e.target.value)} />
            </Field>
            <Field label="52-week range">
              <Input value={form.snapshot.week52Range} onChange={(e) => setSnapshot("week52Range", e.target.value)} />
            </Field>
            <Field label="12M avg daily traded value">
              <Input value={form.snapshot.avgDailyValue} onChange={(e) => setSnapshot("avgDailyValue", e.target.value)} />
            </Field>
          </div>
          <Field label="1/6/12-month relative performance vs index (%)">
            <Input
              value={form.snapshot.relativePerformance}
              onChange={(e) => setSnapshot("relativePerformance", e.target.value)}
              placeholder="1M: +3% · 6M: -5% · 12M: +12%"
            />
          </Field>
        </Section>

        <Section
          title="Shareholding pattern"
          subtitle="Paste as rows, e.g. one quarter per line: Q1FY26: Promoter 55.2, DII 12.1, FII 18.4, Others 14.3"
        >
          <Textarea
            rows={4}
            value={form.shareholding}
            onChange={(e) => setForm((f) => ({ ...f, shareholding: e.target.value }))}
          />
        </Section>

        <Section
          title="3-year financial snapshot"
          subtitle="Sales, EBITDA, PAT, EBITDA margin%, EPS, EPS growth%, BV/share, Net D/E, RoE, RoCE, Payout%, P/E, EV/EBITDA, Div yield%, FCF yield% — one line per metric, FY prior actual / current est. / next est."
        >
          <Textarea
            rows={8}
            value={form.threeYearFinancials}
            onChange={(e) => setForm((f) => ({ ...f, threeYearFinancials: e.target.value }))}
            placeholder={"Sales (₹cr): 12000 | 13500 | 15200\nEBITDA (₹cr): 2100 | 2450 | 2820\nPAT (₹cr): 1150 | 1340 | 1560\n..."}
          />
        </Section>

        <Section title="Quarterly numbers" subtitle="This quarter vs YoY, vs QoQ, vs estimate — flag beat/miss/in-line inline.">
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
        </Section>

        <SegmentsSection form={form} setForm={setForm} />

        <Section title="Management commentary">
          <Field label="Outlook & guidance">
            <Textarea rows={3} value={form.commentary.outlookGuidance} onChange={(e) => setCommentary("outlookGuidance", e.target.value)} />
          </Field>
          <Field label="Regional commentary">
            <Textarea rows={3} value={form.commentary.regional} onChange={(e) => setCommentary("regional", e.target.value)} />
          </Field>
          <Field label="Business-unit commentary">
            <Textarea rows={3} value={form.commentary.businessUnit} onChange={(e) => setCommentary("businessUnit", e.target.value)} />
          </Field>
          <Field label="Product-wise commentary">
            <Textarea rows={3} value={form.commentary.productWise} onChange={(e) => setCommentary("productWise", e.target.value)} />
          </Field>
          <Field label="Debt & balance sheet">
            <Textarea rows={3} value={form.commentary.debtBalanceSheet} onChange={(e) => setCommentary("debtBalanceSheet", e.target.value)} />
          </Field>
          <Field label="Other (leadership, one-offs, JV/associate investments, geopolitical risk)">
            <Textarea rows={3} value={form.commentary.other} onChange={(e) => setCommentary("other", e.target.value)} />
          </Field>
        </Section>

        <Section title="Full financial statements" subtitle="5-year historical + 2-year estimate. Paste as-is (e.g. copied from screener.in) — the AI will parse it into tables.">
          <Field label="Income statement">
            <Textarea rows={5} value={form.financials.incomeStatement} onChange={(e) => setFinancials("incomeStatement", e.target.value)} />
          </Field>
          <Field label="Balance sheet">
            <Textarea rows={5} value={form.financials.balanceSheet} onChange={(e) => setFinancials("balanceSheet", e.target.value)} />
          </Field>
          <Field label="Ratios">
            <Textarea rows={5} value={form.financials.ratios} onChange={(e) => setFinancials("ratios", e.target.value)} />
          </Field>
          <Field label="Cash flow statement">
            <Textarea rows={5} value={form.financials.cashFlow} onChange={(e) => setFinancials("cashFlow", e.target.value)} />
          </Field>
        </Section>

        {form.header.isRevision && <EstimateRevisionSection form={form} setForm={setForm} />}

        <Section title="Firm & compliance facts" subtitle="Fed to the AI verbatim for the mandatory SEBI disclosures section — edit only if these details are wrong.">
          <Textarea
            rows={10}
            value={form.firmFacts}
            onChange={(e) => setForm((f) => ({ ...f, firmFacts: e.target.value }))}
          />
        </Section>

        <Button onClick={handleGenerate} disabled={generating || !canGenerate} size="lg" className="w-full">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Generating…" : "Generate Report"}
        </Button>
        {genError && <p className="text-center text-xs font-medium text-bearish">{genError}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold tracking-tight text-foreground">Preview</h3>
          {report && (
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          )}
        </div>
        <Card className="max-h-[85vh] overflow-y-auto p-6">
          {!report ? (
            <p className="py-16 text-center text-sm text-subtle-foreground">
              Fill in what you have and click "Generate Report" — the note will render here.
            </p>
          ) : (
            <div ref={previewRef} className="bg-surface p-4">
              <ReportMarkdown content={report} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SegmentsSection({
  form,
  setForm,
}: {
  form: ResearchReportForm;
  setForm: React.Dispatch<React.SetStateAction<ResearchReportForm>>;
}) {
  function updateRow(i: number, key: "name" | "revenue" | "yoyGrowth", value: string) {
    setForm((f) => ({ ...f, segments: f.segments.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)) }));
  }
  function addRow() {
    setForm((f) => ({ ...f, segments: [...f.segments, { name: "", revenue: "", yoyGrowth: "" }] }));
  }
  function removeRow(i: number) {
    setForm((f) => ({ ...f, segments: f.segments.filter((_, idx) => idx !== i) }));
  }

  return (
    <Section title="Segment / geography revenue" subtitle="One row per segment, with this quarter's revenue and YoY growth.">
      {form.segments.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <Input placeholder="Segment name" value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} />
          <Input placeholder="Revenue" value={row.revenue} onChange={(e) => updateRow(i, "revenue", e.target.value)} />
          <Input placeholder="YoY %" value={row.yoyGrowth} onChange={(e) => updateRow(i, "yoyGrowth", e.target.value)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={form.segments.length === 1}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
        <Plus size={14} /> Add segment
      </Button>
    </Section>
  );
}

function EstimateRevisionSection({
  form,
  setForm,
}: {
  form: ResearchReportForm;
  setForm: React.Dispatch<React.SetStateAction<ResearchReportForm>>;
}) {
  function updateRow(i: number, key: "metric" | "oldValue" | "newValue", value: string) {
    setForm((f) => ({ ...f, estimateRevision: f.estimateRevision.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)) }));
  }
  function addRow() {
    setForm((f) => ({ ...f, estimateRevision: [...f.estimateRevision, { metric: "", oldValue: "", newValue: "" }] }));
  }
  function removeRow(i: number) {
    setForm((f) => ({ ...f, estimateRevision: f.estimateRevision.filter((_, idx) => idx !== i) }));
  }

  return (
    <Section title="Change in estimates" subtitle="Old vs new FY estimates (e.g. Revenue FY26E, EBITDA FY26E, Adj. PAT FY26E).">
      {form.estimateRevision.map((row, i) => (
        <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-2">
          <Input placeholder="Metric" value={row.metric} onChange={(e) => updateRow(i, "metric", e.target.value)} />
          <Input placeholder="Old" value={row.oldValue} onChange={(e) => updateRow(i, "oldValue", e.target.value)} />
          <Input placeholder="New" value={row.newValue} onChange={(e) => updateRow(i, "newValue", e.target.value)} />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={form.estimateRevision.length === 1}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
        <Plus size={14} /> Add row
      </Button>
    </Section>
  );
}

function ReportMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 text-xl font-extrabold tracking-tight text-foreground">{children}</h1>,
        h2: ({ children }) => (
          <h2 className="mb-2 mt-6 border-b border-border pb-1 text-base font-extrabold tracking-tight text-foreground first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => <h3 className="mb-1 mt-4 text-sm font-bold text-foreground">{children}</h3>,
        p: ({ children }) => <p className="mb-2 text-[13px] leading-relaxed text-muted-foreground">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
        li: ({ children }) => <li className="mb-1 text-[13px] leading-relaxed text-muted-foreground">{children}</li>,
        ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-border px-2 py-1 text-left font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => <td className="border border-border px-2 py-1 text-muted-foreground">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ReportMakerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="report maker" meta="AI-drafted institutional result-update notes" />
      <PinGate>
        <ReportMakerForm />
      </PinGate>
    </div>
  );
}
