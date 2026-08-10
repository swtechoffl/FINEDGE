import { useMemo, useRef, useState } from "react";
import { X, Upload, FileDown, TriangleAlert, CircleCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { downloadCsv } from "./researchTrackerExport";
import { IMPORT_TEMPLATE_CSV, parseImportRows, type ImportError, type ImportedCallRow } from "./researchTrackerImport";
import { useResearchQuotes, type HistoryPoint } from "./useResearchQuotes";
import { ResearchCallChart } from "./ResearchCallChart";
import { pctMoved, referencePriceFor } from "./researchTrackerMath";

type Stage = "picker" | "preview";

function fmtPrice(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// One previewed row, priced live (or against its own imported exit price)
// and charted exactly like a real call card — so what an analyst approves
// here is what they'll actually see on the board after import, not a bare
// table of the numbers they typed.
function BulkImportRowPreview({
  row,
  price,
  history,
  loading,
}: {
  row: ImportedCallRow;
  price: number | null;
  history: HistoryPoint[];
  loading: boolean;
}) {
  const isOpen = row.status === "open";
  const referencePrice = referencePriceFor(row, price);
  const pnl = referencePrice != null ? pctMoved(row, referencePrice) : null;
  const up = (pnl ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-bold text-foreground">{row.symbol}</span>
        <Badge size="sm" variant={row.callType === "buy" ? "bullish" : "bearish"}>
          {row.callType.toUpperCase()}
        </Badge>
        <Badge size="sm" variant={isOpen ? "accent" : "default"}>{isOpen ? "Open" : "Exited"}</Badge>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-2 rounded-lg bg-surface-2 p-2 text-center">
        <div>
          <div className="text-[9px] font-medium uppercase text-subtle-foreground">Recommended</div>
          <div className="text-xs font-bold text-foreground">{fmtPrice(row.recommendedPrice)}</div>
        </div>
        <div>
          <div className="text-[9px] font-medium uppercase text-subtle-foreground">Target</div>
          <div className="text-xs font-bold text-foreground">{fmtPrice(row.targetPrice)}</div>
        </div>
        <div>
          <div className="text-[9px] font-medium uppercase text-subtle-foreground">{isOpen ? "Current" : "Exit"}</div>
          <div className="text-xs font-bold text-foreground">
            {referencePrice != null ? fmtPrice(referencePrice) : loading ? "…" : "—"}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-medium uppercase text-subtle-foreground">Moved</div>
          <div className={`text-xs font-bold ${pnl == null ? "text-subtle-foreground" : up ? "text-bullish" : "text-bearish"}`}>
            {pnl != null ? `${up ? "+" : ""}${pnl.toFixed(2)}%` : loading ? "…" : "—"}
          </div>
        </div>
      </div>

      <ResearchCallChart
        history={history}
        callDate={row.callDate}
        exitDate={row.exitDate}
        entryPrice={row.recommendedPrice}
        targetPrice={row.targetPrice}
        up={row.callType === "buy"}
      />
    </div>
  );
}

// CSV bulk-add — parses client-side (no server round trip needed for a
// local-only file), previews valid vs. invalid rows before committing
// anything (each valid row priced live and charted, same as the real call
// list), and lets a partially-bad file still import its good rows rather
// than an all-or-nothing failure.
export function ResearchBulkImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportedCallRow[]) => void;
}) {
  const [stage, setStage] = useState<Stage>("picker");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportedCallRow[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewSymbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const quotes = useResearchQuotes(previewSymbols);

  if (!open) return null;

  function reset() {
    setStage("picker");
    setFileName("");
    setRows([]);
    setErrors([]);
    setReadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setReadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result = parseImportRows(text);
      setRows(result.rows);
      setErrors(result.errors);
      setStage("preview");
    };
    reader.onerror = () => setReadError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function handleImport() {
    if (rows.length === 0) return;
    onImport(rows);
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        className="animate-scale-in flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-sm font-bold text-foreground">Bulk Upload Calls</span>
          <button
            onClick={handleClose}
            className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stage === "picker" ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV of research calls to add them all at once. Columns: Symbol, Company, Type
                (buy/sell), Call Date (YYYY-MM-DD), Recommended, Target, Stop Loss, Status (open/exited), Exit
                Date, Exit Price, Notes. Only Symbol, Call Date, Recommended, and Target are required.
              </p>

              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-center">
                <Upload size={22} className="text-subtle-foreground" />
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose CSV file
                </Button>
                {readError && <p className="text-xs text-bearish">{readError}</p>}
              </div>

              <button
                onClick={() => downloadCsv("stoqtrade-research-calls-template.csv", IMPORT_TEMPLATE_CSV)}
                className="focus-ring flex items-center justify-center gap-1.5 self-center text-xs font-medium text-accent hover:underline"
              >
                <FileDown size={13} /> Download a template
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-subtle-foreground">{fileName}</p>
                <button onClick={reset} className="focus-ring shrink-0 text-xs font-medium text-accent hover:underline">
                  Choose a different file
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-bullish">
                  <CircleCheck size={15} /> {rows.length} ready to import
                </span>
                {errors.length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-bearish">
                    <TriangleAlert size={15} /> {errors.length} row{errors.length === 1 ? "" : "s"} skipped
                  </span>
                )}
              </div>

              {rows.length > 0 && (
                <div className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto pr-0.5">
                  {rows.map((r, i) => {
                    const quote = quotes[r.symbol];
                    return (
                      <BulkImportRowPreview
                        key={i}
                        row={r}
                        price={quote?.price ?? null}
                        history={quote?.history ?? []}
                        loading={quote?.loading ?? true}
                      />
                    );
                  })}
                </div>
              )}

              {errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg bg-bearish-bg px-3 py-2">
                  <ul className="flex flex-col gap-1">
                    {errors.map((err, i) => (
                      <li key={i} className="text-[11px] text-bearish">
                        Row {err.line}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          {stage === "preview" && (
            <Button size="sm" onClick={handleImport} disabled={rows.length === 0}>
              Import {rows.length} call{rows.length === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
