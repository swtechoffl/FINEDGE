import { useRef, useState } from "react";
import { X, Upload, FileDown, TriangleAlert, CircleCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { downloadCsv } from "./researchTrackerExport";
import { IMPORT_TEMPLATE_CSV, parseImportRows, type ImportError, type ImportedCallRow } from "./researchTrackerImport";

type Stage = "picker" | "preview";

// CSV bulk-add — parses client-side (no server round trip needed for a
// local-only file), previews valid vs. invalid rows before committing
// anything, and lets a partially-bad file still import its good rows
// rather than an all-or-nothing failure.
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
        className="animate-scale-in flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-surface shadow-lg"
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
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase text-subtle-foreground">
                      <tr>
                        <th className="px-2.5 py-1.5 font-medium">Symbol</th>
                        <th className="px-2.5 py-1.5 font-medium">Type</th>
                        <th className="px-2.5 py-1.5 font-medium">Call date</th>
                        <th className="px-2.5 py-1.5 font-medium">Rec.</th>
                        <th className="px-2.5 py-1.5 font-medium">Target</th>
                        <th className="px-2.5 py-1.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2.5 py-1.5 font-semibold text-foreground">{r.symbol}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{r.callType.toUpperCase()}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{r.callDate}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">₹{r.recommendedPrice}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">₹{r.targetPrice}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground capitalize">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
